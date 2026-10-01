from django.db import models
from django.contrib.auth.models import User


class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    theme = models.CharField(max_length=20, default='system')
    notify_recommendations = models.BooleanField(default=True)
    notify_followups = models.BooleanField(default=True)
    notify_applications = models.BooleanField(default=True)
    notify_interviews = models.BooleanField(default=True)
    notify_goals = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.user.username}"


class OAuthIdentity(models.Model):
    """
    Links a Pathly user account to one or more OAuth providers.
    Supports Google and Microsoft.

    Constraints:
    - (provider, provider_user_id) is unique — one OAuth identity per provider per external account.
    - A single Pathly user can have multiple OAuthIdentity rows (Google + Microsoft + password).
    """

    GOOGLE = 'google'
    MICROSOFT = 'microsoft'

    PROVIDER_CHOICES = [
        (GOOGLE, 'Google'),
        (MICROSOFT, 'Microsoft'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='oauth_identities',
    )
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    provider_user_id = models.CharField(max_length=255)  # Google sub / Microsoft oid
    email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('provider', 'provider_user_id')]
        verbose_name = 'OAuth Identity'
        verbose_name_plural = 'OAuth Identities'

    def __str__(self):
        return f"{self.user.username} via {self.provider}"
