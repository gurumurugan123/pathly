from django.db import models
from django.contrib.auth.models import User
from apps.companies.models import Company
from apps.people.models import Person
from apps.applications.constants import APPLICATION_STATUS_CHOICES, APPLICATION_CONTACT_ROLES

class JobPosition(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='job_positions')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='job_positions')
    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True, default='')
    url = models.URLField(max_length=500, blank=True, default='')
    location = models.CharField(max_length=255, blank=True, default='')
    employment_type = models.CharField(max_length=50, blank=True, default='Full-time')
    source = models.CharField(max_length=100, blank=True, default='LinkedIn')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} at {self.company.name}"


class Application(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    job_position = models.ForeignKey(JobPosition, on_delete=models.CASCADE, related_name='applications')
    current_status = models.CharField(
        max_length=50,
        choices=APPLICATION_STATUS_CHOICES,
        default='SAVED',
        db_index=True
    )
    applied_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'job_position'],
                name='unique_user_application'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'current_status']),
            models.Index(fields=['user', 'applied_at']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"Application: {self.job_position.title} ({self.current_status})"


class ApplicationContact(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='application_contacts')
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='application_contacts')
    relationship_role = models.CharField(
        max_length=50,
        choices=APPLICATION_CONTACT_ROLES,
        default='CONTACT'
    )
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['application', 'person'],
                name='unique_application_person_contact'
            )
        ]

    def __str__(self):
        return f"{self.person.name} ({self.relationship_role}) for {self.application}"


class ApplicationStatusEvent(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='status_events')
    from_status = models.CharField(max_length=50, blank=True, default='')
    to_status = models.CharField(max_length=50, db_index=True)
    note = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['application', 'timestamp']),
        ]

    def __str__(self):
        return f"App Status change for {self.application}: {self.from_status} -> {self.to_status}"
