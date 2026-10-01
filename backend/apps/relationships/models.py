from django.db import models
from django.contrib.auth.models import User
from apps.people.models import Person
from apps.relationships.constants import STATUS_CHOICES

class Relationship(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='relationships')
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='relationships')
    current_status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='CONTACT_FOUND',
        db_index=True
    )
    connection_type = models.CharField(max_length=50, default='PRIMARY')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'person'],
                name='unique_user_person_relationship'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'current_status']),
            models.Index(fields=['user', 'person']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} -> {self.person.name} ({self.current_status})"


class StatusEvent(models.Model):
    relationship = models.ForeignKey(Relationship, on_delete=models.CASCADE, related_name='status_events')
    from_status = models.CharField(max_length=50, blank=True, default='')
    to_status = models.CharField(max_length=50, db_index=True)
    note = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['relationship', 'timestamp']),
        ]

    def __str__(self):
        return f"Status change for {self.relationship}: {self.from_status} -> {self.to_status} at {self.timestamp}"


class Note(models.Model):
    relationship = models.ForeignKey(Relationship, on_delete=models.CASCADE, related_name='notes')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Note for {self.relationship} on {self.created_at}"


class FollowUp(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follow_ups', null=True, blank=True)
    relationship = models.ForeignKey(Relationship, on_delete=models.CASCADE, related_name='follow_ups', null=True, blank=True)
    application = models.ForeignKey('applications.Application', on_delete=models.CASCADE, related_name='follow_ups', null=True, blank=True)
    title = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    note = models.CharField(max_length=255, blank=True, default='')
    due_date = models.DateTimeField(db_index=True)
    completed = models.BooleanField(default=False, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['due_date']
        indexes = [
            models.Index(fields=['user', 'due_date']),
            models.Index(fields=['user', 'completed']),
        ]

    def __str__(self):
        status = "Done" if self.completed else "Pending"
        display_title = self.title or self.note or "Follow-up"
        return f"{display_title} on {self.due_date} [{status}]"
