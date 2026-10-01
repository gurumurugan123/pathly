import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from django.utils import timezone
from apps.companies.models import Company
from apps.people.models import Person
from apps.applications.models import JobPosition, Application, ApplicationContact, ApplicationStatusEvent
from apps.relationships.models import FollowUp
from apps.applications.services import change_application_status

@pytest.mark.django_db
def test_application_status_transition_creates_event():
    user = User.objects.create_user(username="appuser", password="password")
    company = Company.objects.create(user=user, name="Zoho")
    jp = JobPosition.objects.create(user=user, company=company, title="Python Developer")
    app = Application.objects.create(user=user, job_position=jp, current_status="SAVED")

    app, event = change_application_status(app, "APPLIED", note="Applied via company portal", user=user)

    assert app.current_status == "APPLIED"
    assert app.applied_at is not None
    assert event.from_status == "SAVED"
    assert event.to_status == "APPLIED"
    assert event.note == "Applied via company portal"
    assert app.status_events.count() == 1

@pytest.mark.django_db
def test_application_contacts_and_user_isolation():
    user1 = User.objects.create_user(username="user1", password="password")
    user2 = User.objects.create_user(username="user2", password="password")

    c1 = Company.objects.create(user=user1, name="TCS")
    jp1 = JobPosition.objects.create(user=user1, company=c1, title="Architect")
    app1 = Application.objects.create(user=user1, job_position=jp1, current_status="APPLIED")

    p1 = Person.objects.create(user=user1, name="Balan", company=c1)

    client = APIClient()
    client.force_authenticate(user=user1)

    # Add contact to application
    resp = client.post(f'/api/applications/{app1.id}/contacts/', {
        "person_id": p1.id,
        "relationship_role": "REFERRAL_CONTACT"
    }, format='json')

    assert resp.status_code == 201
    assert app1.application_contacts.count() == 1

    # Verify user2 cannot view user1's application
    client2 = APIClient()
    client2.force_authenticate(user=user2)
    resp2 = client2.get(f'/api/applications/{app1.id}/')
    assert resp2.status_code == 404

@pytest.mark.django_db
def test_followup_creation_and_analytics_endpoint():
    user = User.objects.create_user(username="testuser", password="password")
    client = APIClient()
    client.force_authenticate(user=user)

    company = Company.objects.create(user=user, name="Cognizant")
    jp = JobPosition.objects.create(user=user, company=company, title="Lead Dev")
    app = Application.objects.create(user=user, job_position=jp, current_status="INTERVIEW")

    now = timezone.now()
    f1 = FollowUp.objects.create(user=user, application=app, title="Prep for tech interview", due_date=now)

    # Test Analytics endpoint
    resp = client.get('/api/analytics/')
    assert resp.status_code == 200
    data = resp.json()

    assert data["metrics"]["totalApplications"] == 1
    assert data["metrics"]["interviews"] == 1

@pytest.mark.django_db
def test_create_application_with_company_input():
    user = User.objects.create_user(username="newappuser", password="password")
    client = APIClient()
    client.force_authenticate(user=user)

    resp = client.post('/api/applications/', {
        "company_input": "Microsoft",
        "job_title_input": "Senior SDE",
        "job_url_input": "https://careers.microsoft.com/job/123",
        "current_status": "APPLIED"
    }, format='json')

    assert resp.status_code == 201
    data = resp.json()
    assert data["company_name"] == "Microsoft"
    assert data["job_title"] == "Senior SDE"
    assert data["current_status"] == "APPLIED"
    assert data["applied_at"] is not None

