from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.users.views import (
    RegisterView,
    UserProfileView,
    UserSettingsView,
    ChangePasswordView,
    DeleteAccountView,
    ExportUserDataView,
)
from apps.users.oauth_views import (
    AppConfigView,
    GoogleOAuthInitView,
    GoogleOAuthCallbackView,
    MicrosoftOAuthInitView,
    MicrosoftOAuthCallbackView,
    OAuthLinkAccountView,
)

urlpatterns = [
    # ── Standard auth ──────────────────────────────────────────────────────
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('settings/', UserSettingsView.as_view(), name='user_settings'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete_account'),
    path('export-data/', ExportUserDataView.as_view(), name='export_data'),

    # ── App configuration (public — safe values only) ──────────────────────
    path('config/', AppConfigView.as_view(), name='app_config'),

    # ── Google OAuth ───────────────────────────────────────────────────────
    path('google/', GoogleOAuthInitView.as_view(), name='google_oauth_init'),
    path('google/callback/', GoogleOAuthCallbackView.as_view(), name='google_oauth_callback'),

    # ── Microsoft OAuth ────────────────────────────────────────────────────
    path('microsoft/', MicrosoftOAuthInitView.as_view(), name='microsoft_oauth_init'),
    path('microsoft/callback/', MicrosoftOAuthCallbackView.as_view(), name='microsoft_oauth_callback'),

    # ── Account linking ────────────────────────────────────────────────────
    path('link-account/', OAuthLinkAccountView.as_view(), name='oauth_link_account'),
]
