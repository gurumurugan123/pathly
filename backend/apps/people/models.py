from django.db import models
from django.contrib.auth.models import User
from apps.companies.models import Company

class Person(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='people')
    name = models.CharField(max_length=255, db_index=True)
    designation = models.CharField(max_length=255, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    location = models.CharField(max_length=255, blank=True, default='')
    linkedin_url = models.URLField(max_length=500, blank=True, default='')
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='people')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "People"
        indexes = [
            models.Index(fields=['user', 'name']),
            models.Index(fields=['user', 'company']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        company_str = self.company.name if self.company else "No Company"
        return f"{self.name} - {self.designation} at {company_str}"
