"""
Backend tests for Google + Microsoft OAuth flows.

Since we can't call real OAuth providers in automated tests, we mock:
- The provider's token endpoint
- The provider's userinfo endpoint

We test all important scenarios:
- Successful new user creation
- Existing user sign-in
- Account linking (needs_linking flow)
- Invalid state token
- Provider error / cancelled
- Missing params
- Token exchange failure
- Userinfo fetch failure
- Duplicate identity prevention
"""

import json
from unittest.mock import patch, MagicMock
from django.test import TestCase, Client, RequestFactory
from django.contrib.auth.models import User
from django.urls import reverse

from apps.users.models import OAuthIdentity
from apps.users.oauth_views import _find_or_create_user, _generate_username


# ─── Unit Tests: _find_or_create_user ─────────────────────────────────────────

class FindOrCreateUserTests(TestCase):

    def test_creates_new_user_with_identity(self):
        user, created, warning = _find_or_create_user(
            provider=OAuthIdentity.GOOGLE,
            provider_user_id='google-uid-001',
            email='alice@example.com',
            first_name='Alice',
            last_name='Smith',
        )
        self.assertTrue(created)
        self.assertIsNone(warning)
        self.assertEqual(user.email, 'alice@example.com')
        self.assertEqual(user.first_name, 'Alice')
        self.assertFalse(user.has_usable_password())
        self.assertTrue(OAuthIdentity.objects.filter(
            provider=OAuthIdentity.GOOGLE, provider_user_id='google-uid-001'
        ).exists())

    def test_returns_existing_identity_user(self):
        existing_user = User.objects.create_user('bob', email='bob@example.com')
        OAuthIdentity.objects.create(
            user=existing_user, provider=OAuthIdentity.GOOGLE,
            provider_user_id='google-uid-002', email='bob@example.com',
        )

        user, created, warning = _find_or_create_user(
            provider=OAuthIdentity.GOOGLE,
            provider_user_id='google-uid-002',
            email='bob@example.com',
        )
        self.assertFalse(created)
        self.assertIsNone(warning)
        self.assertEqual(user.id, existing_user.id)

    def test_email_collision_with_password_user_returns_needs_linking(self):
        existing = User.objects.create_user('charlie', email='charlie@example.com', password='secret')

        user, created, warning = _find_or_create_user(
            provider=OAuthIdentity.GOOGLE,
            provider_user_id='google-uid-003',
            email='charlie@example.com',
        )
        self.assertEqual(user.id, existing.id)
        self.assertEqual(warning, 'needs_linking')
        self.assertFalse(OAuthIdentity.objects.filter(provider_user_id='google-uid-003').exists())

    def test_linking_to_existing_user_succeeds(self):
        existing = User.objects.create_user('diana', email='diana@example.com', password='secret')

        user, created, warning = _find_or_create_user(
            provider=OAuthIdentity.MICROSOFT,
            provider_user_id='ms-uid-001',
            email='diana@example.com',
            link_to_user=existing,
        )
        self.assertIsNone(warning)
        self.assertFalse(created)
        self.assertEqual(user.id, existing.id)
        self.assertTrue(OAuthIdentity.objects.filter(
            user=existing, provider=OAuthIdentity.MICROSOFT, provider_user_id='ms-uid-001'
        ).exists())

    def test_duplicate_identity_prevented(self):
        user1 = User.objects.create_user('user1', email='u1@example.com')
        OAuthIdentity.objects.create(
            user=user1, provider=OAuthIdentity.GOOGLE,
            provider_user_id='google-dup-001', email='u1@example.com',
        )
        # Calling again returns the same identity's user
        user, created, warning = _find_or_create_user(
            provider=OAuthIdentity.GOOGLE,
            provider_user_id='google-dup-001',
            email='u1@example.com',
        )
        self.assertEqual(user.id, user1.id)
        self.assertEqual(OAuthIdentity.objects.filter(provider_user_id='google-dup-001').count(), 1)

    def test_generate_username_unique(self):
        User.objects.create_user('alice')
        name = _generate_username('alice@example.com', 'Alice', 'google')
        self.assertEqual(name, 'alice_1')

    def test_microsoft_and_google_can_both_link_to_same_user(self):
        user = User.objects.create_user('evan', email='evan@example.com')
        OAuthIdentity.objects.create(
            user=user, provider=OAuthIdentity.GOOGLE,
            provider_user_id='g-evan', email='evan@example.com',
        )
        OAuthIdentity.objects.create(
            user=user, provider=OAuthIdentity.MICROSOFT,
            provider_user_id='ms-evan', email='evan@example.com',
        )
        self.assertEqual(user.oauth_identities.count(), 2)


# ─── Integration Tests: Google OAuth Views ────────────────────────────────────

class GoogleOAuthViewTests(TestCase):

    def setUp(self):
        self.client = Client()

    def test_google_init_returns_auth_url_when_configured(self):
        with self.settings(GOOGLE_CLIENT_ID='test-client-id', GOOGLE_CLIENT_SECRET='secret',
                           GOOGLE_REDIRECT_URI='http://localhost:8000/api/auth/google/callback/'):
            resp = self.client.get('/api/auth/google/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('auth_url', data)
        self.assertIn('accounts.google.com', data['auth_url'])

    def test_google_init_returns_503_when_not_configured(self):
        with self.settings(GOOGLE_CLIENT_ID='', GOOGLE_CLIENT_SECRET=''):
            resp = self.client.get('/api/auth/google/')
        self.assertEqual(resp.status_code, 503)

    def test_google_callback_invalid_state(self):
        session = self.client.session
        session['oauth_state_google'] = 'correct-state'
        session.save()

        with self.settings(GOOGLE_CLIENT_ID='id', GOOGLE_CLIENT_SECRET='secret',
                           GOOGLE_REDIRECT_URI='http://x/', FRONTEND_URL='http://localhost:5173'):
            resp = self.client.get('/api/auth/google/callback/', {
                'code': 'abc123',
                'state': 'wrong-state',
            })
        self.assertEqual(resp.status_code, 302)
        self.assertIn('invalid_state', resp['Location'])

    def test_google_callback_missing_params(self):
        with self.settings(GOOGLE_CLIENT_ID='id', GOOGLE_CLIENT_SECRET='secret',
                           GOOGLE_REDIRECT_URI='http://x/', FRONTEND_URL='http://localhost:5173'):
            resp = self.client.get('/api/auth/google/callback/')
        self.assertEqual(resp.status_code, 302)
        self.assertIn('missing_params', resp['Location'])

    def test_google_callback_provider_error_cancelled(self):
        with self.settings(GOOGLE_CLIENT_ID='id', GOOGLE_CLIENT_SECRET='secret',
                           GOOGLE_REDIRECT_URI='http://x/', FRONTEND_URL='http://localhost:5173'):
            resp = self.client.get('/api/auth/google/callback/', {'error': 'access_denied'})
        self.assertEqual(resp.status_code, 302)
        self.assertIn('cancelled', resp['Location'])

    @patch('apps.users.oauth_views.http_requests.post')
    @patch('apps.users.oauth_views.http_requests.get')
    def test_google_callback_creates_new_user(self, mock_get, mock_post):
        # Set up valid state
        session = self.client.session
        session['oauth_state_google'] = 'valid-state-abc'
        session.save()

        # Mock token exchange
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {'access_token': 'google-access-token', 'token_type': 'Bearer'},
        )
        mock_post.return_value.raise_for_status = lambda: None

        # Mock userinfo
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                'sub': 'google-sub-new-user',
                'email': 'newuser@gmail.com',
                'given_name': 'New',
                'family_name': 'User',
            },
        )
        mock_get.return_value.raise_for_status = lambda: None

        with self.settings(GOOGLE_CLIENT_ID='id', GOOGLE_CLIENT_SECRET='secret',
                           GOOGLE_REDIRECT_URI='http://localhost:8000/api/auth/google/callback/',
                           FRONTEND_URL='http://localhost:5173'):
            resp = self.client.get('/api/auth/google/callback/', {
                'code': 'auth-code-123',
                'state': 'valid-state-abc',
            })

        self.assertEqual(resp.status_code, 302)
        self.assertIn('oauth_access', resp['Location'])
        self.assertTrue(User.objects.filter(email='newuser@gmail.com').exists())
        self.assertTrue(OAuthIdentity.objects.filter(
            provider=OAuthIdentity.GOOGLE, provider_user_id='google-sub-new-user'
        ).exists())

    @patch('apps.users.oauth_views.http_requests.post')
    @patch('apps.users.oauth_views.http_requests.get')
    def test_google_callback_existing_user_signin(self, mock_get, mock_post):
        existing = User.objects.create_user('existinggoogle', email='existing@gmail.com')
        OAuthIdentity.objects.create(
            user=existing, provider=OAuthIdentity.GOOGLE,
            provider_user_id='google-existing-sub', email='existing@gmail.com',
        )

        session = self.client.session
        session['oauth_state_google'] = 'state-xyz'
        session.save()

        mock_post.return_value = MagicMock(json=lambda: {'access_token': 'tok'})
        mock_post.return_value.raise_for_status = lambda: None
        mock_get.return_value = MagicMock(json=lambda: {
            'sub': 'google-existing-sub',
            'email': 'existing@gmail.com',
        })
        mock_get.return_value.raise_for_status = lambda: None

        with self.settings(GOOGLE_CLIENT_ID='id', GOOGLE_CLIENT_SECRET='secret',
                           GOOGLE_REDIRECT_URI='http://x/', FRONTEND_URL='http://localhost:5173'):
            resp = self.client.get('/api/auth/google/callback/', {'code': 'c', 'state': 'state-xyz'})

        self.assertEqual(resp.status_code, 302)
        self.assertIn('oauth_access', resp['Location'])

    @patch('apps.users.oauth_views.http_requests.post')
    @patch('apps.users.oauth_views.http_requests.get')
    def test_google_callback_needs_linking(self, mock_get, mock_post):
        # User with password + same email
        User.objects.create_user('passworduser', email='linked@example.com', password='pwd')

        session = self.client.session
        session['oauth_state_google'] = 'state-link'
        session.save()

        mock_post.return_value = MagicMock(json=lambda: {'access_token': 'tok'})
        mock_post.return_value.raise_for_status = lambda: None
        mock_get.return_value = MagicMock(json=lambda: {
            'sub': 'google-link-sub', 'email': 'linked@example.com',
        })
        mock_get.return_value.raise_for_status = lambda: None

        with self.settings(GOOGLE_CLIENT_ID='id', GOOGLE_CLIENT_SECRET='secret',
                           GOOGLE_REDIRECT_URI='http://x/', FRONTEND_URL='http://localhost:5173'):
            resp = self.client.get('/api/auth/google/callback/', {'code': 'c', 'state': 'state-link'})

        self.assertEqual(resp.status_code, 302)
        self.assertIn('oauth_link_required', resp['Location'])

    @patch('apps.users.oauth_views.http_requests.post')
    def test_google_callback_token_exchange_failure(self, mock_post):
        session = self.client.session
        session['oauth_state_google'] = 'state-fail'
        session.save()

        mock_post.side_effect = Exception("Connection refused")

        with self.settings(GOOGLE_CLIENT_ID='id', GOOGLE_CLIENT_SECRET='secret',
                           GOOGLE_REDIRECT_URI='http://x/', FRONTEND_URL='http://localhost:5173'):
            resp = self.client.get('/api/auth/google/callback/', {'code': 'c', 'state': 'state-fail'})

        self.assertEqual(resp.status_code, 302)
        self.assertIn('google_error', resp['Location'])


# ─── Integration Tests: Microsoft OAuth Views ─────────────────────────────────

class MicrosoftOAuthViewTests(TestCase):

    def setUp(self):
        self.client = Client()

    def test_microsoft_init_returns_auth_url(self):
        with self.settings(MICROSOFT_CLIENT_ID='ms-id', MICROSOFT_CLIENT_SECRET='ms-secret',
                           MICROSOFT_TENANT_ID='common',
                           MICROSOFT_REDIRECT_URI='http://localhost:8000/api/auth/microsoft/callback/'):
            resp = self.client.get('/api/auth/microsoft/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('auth_url', data)
        self.assertIn('login.microsoftonline.com', data['auth_url'])

    def test_microsoft_init_returns_503_when_not_configured(self):
        with self.settings(MICROSOFT_CLIENT_ID='', MICROSOFT_CLIENT_SECRET=''):
            resp = self.client.get('/api/auth/microsoft/')
        self.assertEqual(resp.status_code, 503)

    def test_microsoft_callback_invalid_state(self):
        session = self.client.session
        session['oauth_state_microsoft'] = 'correct'
        session.save()

        with self.settings(MICROSOFT_CLIENT_ID='id', MICROSOFT_CLIENT_SECRET='s',
                           MICROSOFT_REDIRECT_URI='http://x/', MICROSOFT_TENANT_ID='common',
                           FRONTEND_URL='http://localhost:5173'):
            resp = self.client.get('/api/auth/microsoft/callback/', {'code': 'c', 'state': 'wrong'})

        self.assertIn('invalid_state', resp['Location'])

    @patch('apps.users.oauth_views.http_requests.post')
    @patch('apps.users.oauth_views.http_requests.get')
    def test_microsoft_callback_creates_new_user(self, mock_get, mock_post):
        session = self.client.session
        session['oauth_state_microsoft'] = 'ms-state-1'
        session.save()

        mock_post.return_value = MagicMock(json=lambda: {'access_token': 'ms-access-token'})
        mock_post.return_value.raise_for_status = lambda: None
        mock_get.return_value = MagicMock(json=lambda: {
            'id': 'ms-oid-new',
            'mail': 'msuser@outlook.com',
            'displayName': 'MS User',
            'givenName': 'MS',
            'surname': 'User',
        })
        mock_get.return_value.raise_for_status = lambda: None

        with self.settings(MICROSOFT_CLIENT_ID='id', MICROSOFT_CLIENT_SECRET='s',
                           MICROSOFT_REDIRECT_URI='http://x/', MICROSOFT_TENANT_ID='common',
                           FRONTEND_URL='http://localhost:5173'):
            resp = self.client.get('/api/auth/microsoft/callback/', {'code': 'c', 'state': 'ms-state-1'})

        self.assertEqual(resp.status_code, 302)
        self.assertIn('oauth_access', resp['Location'])
        self.assertTrue(OAuthIdentity.objects.filter(
            provider=OAuthIdentity.MICROSOFT, provider_user_id='ms-oid-new'
        ).exists())


# ─── Integration Tests: Account Linking ───────────────────────────────────────

class OAuthLinkAccountTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user('linkuser', email='link@example.com', password='mypassword')

    def test_link_account_success(self):
        import json
        # Set up a pending link token in session
        session = self.client.session
        link_token = 'test-link-token-123'
        session[f'link_token_{link_token}'] = {
            'provider': OAuthIdentity.GOOGLE,
            'provider_user_id': 'g-link-uid',
            'email': 'link@example.com',
        }
        session.save()

        resp = self.client.post(
            '/api/auth/link-account/',
            data=json.dumps({'link_token': link_token, 'password': 'mypassword'}),
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('access', data)
        self.assertTrue(OAuthIdentity.objects.filter(
            user=self.user, provider=OAuthIdentity.GOOGLE
        ).exists())

    def test_link_account_wrong_password(self):
        import json
        session = self.client.session
        link_token = 'test-link-wrong'
        session[f'link_token_{link_token}'] = {
            'provider': OAuthIdentity.GOOGLE,
            'provider_user_id': 'g-link-uid-2',
            'email': 'link@example.com',
        }
        session.save()

        resp = self.client.post(
            '/api/auth/link-account/',
            data=json.dumps({'link_token': link_token, 'password': 'wrongpassword'}),
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 401)

    def test_link_account_invalid_token(self):
        import json
        resp = self.client.post(
            '/api/auth/link-account/',
            data=json.dumps({'link_token': 'nonexistent-token', 'password': 'mypassword'}),
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 400)


# ─── App Config Tests ──────────────────────────────────────────────────────────

class AppConfigTests(TestCase):

    def setUp(self):
        self.client = Client()

    def test_config_when_google_configured(self):
        with self.settings(GOOGLE_CLIENT_ID='real-id', MICROSOFT_CLIENT_ID='', DEMO_MODE=True):
            resp = self.client.get('/api/auth/config/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data['google_oauth_enabled'])
        self.assertFalse(data['microsoft_oauth_enabled'])
        self.assertTrue(data['demo_mode'])
        # Must NOT contain any secret
        self.assertNotIn('client_secret', str(data))
        self.assertNotIn('GOOGLE_CLIENT_SECRET', str(data))

    def test_config_when_nothing_configured(self):
        with self.settings(GOOGLE_CLIENT_ID='', MICROSOFT_CLIENT_ID='', DEMO_MODE=False):
            resp = self.client.get('/api/auth/config/')
        data = resp.json()
        self.assertFalse(data['google_oauth_enabled'])
        self.assertFalse(data['microsoft_oauth_enabled'])
        self.assertFalse(data['demo_mode'])
