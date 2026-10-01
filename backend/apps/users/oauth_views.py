"""
Pathly OAuth Views — Google + Microsoft OIDC/OAuth 2.0

Flow for each provider:
  1. GET  /api/auth/<provider>/          → build authorization URL + state → return URL to frontend
  2. GET  /api/auth/<provider>/callback/ → validate code+state, exchange for tokens,
                                           verify ID token, find/create user, issue JWT,
                                           redirect to frontend /dashboard

Security:
  - PKCE-style state parameter stored server-side (Django session)
  - ID token signature NOT verified (would require public keys); instead we use
    the provider's userinfo endpoint which requires a valid access token
  - state is a cryptographically random nonce tied to the session
  - No secrets are exposed to the frontend
"""

import os
import secrets
import logging
import urllib.parse

import requests as http_requests
from django.conf import settings
from django.contrib.auth.models import User
from django.http import HttpResponseRedirect
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import OAuthIdentity
from apps.users.serializers import UserSerializer

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize'
MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token'
MICROSOFT_USERINFO_URL = 'https://graph.microsoft.com/v1.0/me'

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _make_state() -> str:
    """Generate a secure random state token."""
    return secrets.token_urlsafe(32)


def _issue_jwt(user: User) -> dict:
    """Issue Pathly JWT tokens (same as normal login)."""
    refresh = RefreshToken.for_user(user)
    return {
        'user': UserSerializer(user).data,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


def _find_or_create_user(provider: str, provider_user_id: str, email: str,
                          first_name: str = '', last_name: str = '',
                          link_to_user: User | None = None) -> tuple[User, bool, str | None]:
    """
    Find or create a Pathly user from an OAuth identity.

    Returns: (user, created, warning_message)

    Account-linking rules:
    1. If OAuthIdentity already exists → return that user.
    2. If link_to_user provided (user verified their password) → link identity.
    3. If email matches existing account → return (None, False, 'needs_linking')
       so the frontend can prompt for password verification.
    4. Otherwise create a new user + identity.
    """
    # 1. Existing OAuth identity
    try:
        identity = OAuthIdentity.objects.get(provider=provider, provider_user_id=provider_user_id)
        identity.email = email
        identity.save(update_fields=['email', 'updated_at'])
        return identity.user, False, None
    except OAuthIdentity.DoesNotExist:
        pass

    # 2. Explicit linking: user authenticated with password, linking OAuth
    if link_to_user:
        OAuthIdentity.objects.create(
            user=link_to_user,
            provider=provider,
            provider_user_id=provider_user_id,
            email=email,
        )
        return link_to_user, False, None

    # 3. Email collision — need account linking
    if email:
        existing = User.objects.filter(email=email).first()
        if existing:
            # Check if existing user was NOT created via the same/another OAuth provider
            # (If they were, link silently; if they have a password, require verification)
            if existing.has_usable_password():
                return existing, False, 'needs_linking'
            else:
                # Email-only OAuth user — safe to link silently
                OAuthIdentity.objects.create(
                    user=existing,
                    provider=provider,
                    provider_user_id=provider_user_id,
                    email=email,
                )
                return existing, False, None

    # 4. Create new user
    username = _generate_username(email, first_name, provider)
    user = User.objects.create_user(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )
    user.set_unusable_password()  # OAuth-only account until they set a password
    user.save()

    OAuthIdentity.objects.create(
        user=user,
        provider=provider,
        provider_user_id=provider_user_id,
        email=email,
    )
    return user, True, None


def _generate_username(email: str, first_name: str, provider: str) -> str:
    """Generate a unique username from email or first_name."""
    base = email.split('@')[0] if email else first_name or provider
    base = base.lower().replace('.', '_').replace('-', '_')[:20]
    username = base
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}_{counter}"
        counter += 1
    return username


def _redirect_with_error(error_code: str) -> HttpResponseRedirect:
    frontend = settings.FRONTEND_URL.rstrip('/')
    return HttpResponseRedirect(f"{frontend}/?oauth_error={error_code}")


def _redirect_with_tokens(access: str, refresh: str) -> HttpResponseRedirect:
    frontend = settings.FRONTEND_URL.rstrip('/')
    params = urllib.parse.urlencode({'oauth_access': access, 'oauth_refresh': refresh})
    return HttpResponseRedirect(f"{frontend}/oauth-callback?{params}")


def _redirect_needs_linking(provider: str, email: str,
                             provider_user_id: str, token: str) -> HttpResponseRedirect:
    """Redirect frontend with a linking-required signal."""
    frontend = settings.FRONTEND_URL.rstrip('/')
    params = urllib.parse.urlencode({
        'oauth_link_required': '1',
        'provider': provider,
        'email': email,
        'link_token': token,  # signed opaque token stored server-side
    })
    return HttpResponseRedirect(f"{frontend}/?{params}")


# ─── App Config Endpoint ──────────────────────────────────────────────────────

class AppConfigView(APIView):
    """
    Returns safe public configuration for the frontend.
    Never exposes client secrets.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'google_oauth_enabled': bool(settings.GOOGLE_CLIENT_ID),
            'microsoft_oauth_enabled': bool(settings.MICROSOFT_CLIENT_ID),
            'demo_mode': settings.DEMO_MODE,
        })


# ─── Google OAuth ─────────────────────────────────────────────────────────────

class GoogleOAuthInitView(APIView):
    """
    GET /api/auth/google/
    Returns the Google OAuth authorization URL.
    The frontend redirects the user's browser to this URL.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not settings.GOOGLE_CLIENT_ID:
            return Response(
                {'error': 'Google OAuth is not configured on this server.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        state = _make_state()
        request.session['oauth_state_google'] = state
        request.session.save()

        params = {
            'client_id': settings.GOOGLE_CLIENT_ID,
            'redirect_uri': settings.GOOGLE_REDIRECT_URI,
            'response_type': 'code',
            'scope': 'openid email profile',
            'state': state,
            'access_type': 'offline',
            'prompt': 'select_account',
        }
        auth_url = GOOGLE_AUTH_URL + '?' + urllib.parse.urlencode(params)
        return Response({'auth_url': auth_url})


class GoogleOAuthCallbackView(APIView):
    """
    GET /api/auth/google/callback/
    Handles the OAuth callback from Google.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        error = request.GET.get('error')
        if error:
            logger.warning("Google OAuth error: %s", error)
            if error == 'access_denied':
                return _redirect_with_error('cancelled')
            return _redirect_with_error('google_error')

        code = request.GET.get('code')
        state = request.GET.get('state')

        if not code or not state:
            return _redirect_with_error('missing_params')

        # ── State validation ──
        saved_state = request.session.get('oauth_state_google')
        if not saved_state or not secrets.compare_digest(saved_state, state):
            logger.warning("Google OAuth: invalid state token")
            return _redirect_with_error('invalid_state')

        # Clear the state so it cannot be replayed
        del request.session['oauth_state_google']

        # ── Exchange code for tokens ──
        try:
            token_resp = http_requests.post(GOOGLE_TOKEN_URL, data={
                'code': code,
                'client_id': settings.GOOGLE_CLIENT_ID,
                'client_secret': settings.GOOGLE_CLIENT_SECRET,
                'redirect_uri': settings.GOOGLE_REDIRECT_URI,
                'grant_type': 'authorization_code',
            }, timeout=10)
            token_resp.raise_for_status()
            token_data = token_resp.json()
        except Exception as exc:
            logger.error("Google token exchange failed: %s", exc)
            return _redirect_with_error('google_error')

        access_token = token_data.get('access_token')
        if not access_token:
            return _redirect_with_error('google_error')

        # ── Fetch user info (validates access_token with Google) ──
        try:
            userinfo_resp = http_requests.get(
                GOOGLE_USERINFO_URL,
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
            userinfo_resp.raise_for_status()
            userinfo = userinfo_resp.json()
        except Exception as exc:
            logger.error("Google userinfo fetch failed: %s", exc)
            return _redirect_with_error('google_error')

        provider_user_id = userinfo.get('sub')
        email = userinfo.get('email', '')
        first_name = userinfo.get('given_name', '')
        last_name = userinfo.get('family_name', '')

        if not provider_user_id:
            logger.error("Google userinfo missing 'sub'")
            return _redirect_with_error('google_error')

        # ── Find or create Pathly user ──
        user, created, warning = _find_or_create_user(
            provider=OAuthIdentity.GOOGLE,
            provider_user_id=provider_user_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )

        if warning == 'needs_linking':
            # Store a linking token in the session, redirect frontend to link flow
            link_token = _make_state()
            request.session[f'link_token_{link_token}'] = {
                'provider': OAuthIdentity.GOOGLE,
                'provider_user_id': provider_user_id,
                'email': email,
            }
            return _redirect_needs_linking(OAuthIdentity.GOOGLE, email, provider_user_id, link_token)

        # ── Issue Pathly JWT ──
        jwt_data = _issue_jwt(user)
        logger.info("Google OAuth: %s user %s", 'created' if created else 'signed in', user.username)
        return _redirect_with_tokens(jwt_data['access'], jwt_data['refresh'])


# ─── Microsoft OAuth ──────────────────────────────────────────────────────────

class MicrosoftOAuthInitView(APIView):
    """
    GET /api/auth/microsoft/
    Returns the Microsoft OAuth authorization URL.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not settings.MICROSOFT_CLIENT_ID:
            return Response(
                {'error': 'Microsoft OAuth is not configured on this server.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        state = _make_state()
        request.session['oauth_state_microsoft'] = state
        request.session.save()

        tenant = settings.MICROSOFT_TENANT_ID or 'common'
        auth_url_base = MICROSOFT_AUTH_URL.format(tenant=tenant)

        params = {
            'client_id': settings.MICROSOFT_CLIENT_ID,
            'redirect_uri': settings.MICROSOFT_REDIRECT_URI,
            'response_type': 'code',
            'response_mode': 'query',
            'scope': 'openid email profile User.Read',
            'state': state,
            'prompt': 'select_account',
        }
        auth_url = auth_url_base + '?' + urllib.parse.urlencode(params)
        return Response({'auth_url': auth_url})


class MicrosoftOAuthCallbackView(APIView):
    """
    GET /api/auth/microsoft/callback/
    Handles the OAuth callback from Microsoft.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        error = request.GET.get('error')
        if error:
            logger.warning("Microsoft OAuth error: %s — %s", error, request.GET.get('error_description', ''))
            if error == 'access_denied':
                return _redirect_with_error('cancelled')
            return _redirect_with_error('microsoft_error')

        code = request.GET.get('code')
        state = request.GET.get('state')

        if not code or not state:
            return _redirect_with_error('missing_params')

        # ── State validation ──
        saved_state = request.session.get('oauth_state_microsoft')
        if not saved_state or not secrets.compare_digest(saved_state, state):
            logger.warning("Microsoft OAuth: invalid state token")
            return _redirect_with_error('invalid_state')

        del request.session['oauth_state_microsoft']

        # ── Exchange code for tokens ──
        tenant = settings.MICROSOFT_TENANT_ID or 'common'
        token_url = MICROSOFT_TOKEN_URL.format(tenant=tenant)

        try:
            token_resp = http_requests.post(token_url, data={
                'code': code,
                'client_id': settings.MICROSOFT_CLIENT_ID,
                'client_secret': settings.MICROSOFT_CLIENT_SECRET,
                'redirect_uri': settings.MICROSOFT_REDIRECT_URI,
                'grant_type': 'authorization_code',
                'scope': 'openid email profile User.Read',
            }, timeout=10)
            token_resp.raise_for_status()
            token_data = token_resp.json()
        except Exception as exc:
            logger.error("Microsoft token exchange failed: %s", exc)
            return _redirect_with_error('microsoft_error')

        access_token = token_data.get('access_token')
        if not access_token:
            return _redirect_with_error('microsoft_error')

        # ── Fetch user info from Microsoft Graph ──
        try:
            userinfo_resp = http_requests.get(
                MICROSOFT_USERINFO_URL,
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/json',
                },
                timeout=10,
            )
            userinfo_resp.raise_for_status()
            userinfo = userinfo_resp.json()
        except Exception as exc:
            logger.error("Microsoft Graph userinfo failed: %s", exc)
            return _redirect_with_error('microsoft_error')

        # Microsoft uses 'id' as the stable user identifier
        provider_user_id = userinfo.get('id')
        email = userinfo.get('mail') or userinfo.get('userPrincipalName', '')
        # Strip AAD domain if userPrincipalName is an alias
        if '#EXT#' in email:
            email = userinfo.get('mail', '')
        display_name = userinfo.get('displayName', '')
        given_name = userinfo.get('givenName', '')
        surname = userinfo.get('surname', '')
        first_name = given_name or display_name.split()[0] if display_name else ''
        last_name = surname or (display_name.split()[-1] if display_name and ' ' in display_name else '')

        if not provider_user_id:
            logger.error("Microsoft Graph missing 'id'")
            return _redirect_with_error('microsoft_error')

        # ── Find or create Pathly user ──
        user, created, warning = _find_or_create_user(
            provider=OAuthIdentity.MICROSOFT,
            provider_user_id=provider_user_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )

        if warning == 'needs_linking':
            link_token = _make_state()
            request.session[f'link_token_{link_token}'] = {
                'provider': OAuthIdentity.MICROSOFT,
                'provider_user_id': provider_user_id,
                'email': email,
            }
            return _redirect_needs_linking(OAuthIdentity.MICROSOFT, email, provider_user_id, link_token)

        jwt_data = _issue_jwt(user)
        logger.info("Microsoft OAuth: %s user %s", 'created' if created else 'signed in', user.username)
        return _redirect_with_tokens(jwt_data['access'], jwt_data['refresh'])


# ─── Account Linking View ─────────────────────────────────────────────────────

class OAuthLinkAccountView(APIView):
    """
    POST /api/auth/link-account/

    Called when frontend detects oauth_link_required.
    User provides their existing password; we verify it, then link the OAuth identity.

    Body: { link_token, password }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        link_token = request.data.get('link_token')
        password = request.data.get('password')

        if not link_token or not password:
            return Response({'error': 'link_token and password are required.'}, status=400)

        session_key = f'link_token_{link_token}'
        pending = request.session.get(session_key)

        if not pending:
            return Response({'error': 'Invalid or expired link token.'}, status=400)

        email = pending.get('email', '')
        provider = pending.get('provider')
        provider_user_id = pending.get('provider_user_id')

        # Find the existing user
        user = User.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            return Response({'error': 'Incorrect password. Please try again.'}, status=401)

        # Link the OAuth identity
        identity, _ = OAuthIdentity.objects.get_or_create(
            provider=provider,
            provider_user_id=provider_user_id,
            defaults={'user': user, 'email': email},
        )
        if identity.user_id != user.id:
            return Response({'error': 'This OAuth identity is already linked to a different account.'}, status=409)

        # Clean up session
        del request.session[session_key]

        jwt_data = _issue_jwt(user)
        return Response(jwt_data, status=200)
