from django.db import models
from django.contrib.auth.models import User

class Company(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='companies')
    name = models.CharField(max_length=255)
    normalized_name = models.CharField(max_length=255, db_index=True)
    website = models.URLField(max_length=500, blank=True, default='')
    industry = models.CharField(max_length=100, blank=True, default='')
    location = models.CharField(max_length=255, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    logo_url = models.URLField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Companies"
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'normalized_name'],
                name='unique_user_company_name'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'normalized_name']),
            models.Index(fields=['user', 'created_at']),
        ]

    def save(self, *args, **kwargs):
        if self.name:
            self.normalized_name = self.name.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.user.username})"

    @property
    def applications(self):
        from apps.applications.models import Application
        return Application.objects.filter(job_position__company=self)

