from django.db import models
from django.contrib.auth.models import User
from apps.intelligence.constants import RECOMMENDATION_TYPES, PRIORITY_CHOICES, STATUS_CHOICES, EVENT_TYPES

class Recommendation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recommendations')
    type = models.CharField(max_length=50, choices=RECOMMENDATION_TYPES, db_index=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM', db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    reason = models.TextField(help_text="Explainable data-driven reason for recommendation")
    entity_type = models.CharField(max_length=50, blank=True, default='', db_index=True) # e.g. 'person', 'company', 'application'
    entity_id = models.IntegerField(null=True, blank=True, db_index=True)
    deduplication_key = models.CharField(max_length=255, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW', db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'priority']),
            models.Index(fields=['user', 'deduplication_key']),
            models.Index(fields=['user', 'entity_type', 'entity_id']),
        ]

    def __str__(self):
        return f"[{self.priority}] {self.title} ({self.status}) for {self.user.username}"


class RecommendationEvent(models.Model):
    recommendation = models.ForeignKey(Recommendation, on_delete=models.CASCADE, related_name='events')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recommendation_events')
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'event_type']),
            models.Index(fields=['recommendation', 'created_at']),
        ]

    def __str__(self):
        return f"Event {self.event_type} on Recommendation {self.recommendation.id}"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    entity_type = models.CharField(max_length=50, blank=True, default='')
    entity_id = models.IntegerField(null=True, blank=True)
    recommendation = models.ForeignKey(Recommendation, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"Notification for {self.user.username}: {self.title} [{'Read' if self.is_read else 'Unread'}]"
