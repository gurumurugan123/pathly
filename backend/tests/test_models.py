import pytest
from django.db.utils import IntegrityError
from django.contrib.auth.models import User
from apps.companies.models import Company
from apps.people.models import Person
from apps.relationships.models import Relationship, StatusEvent
from apps.relationships.services import change_relationship_status

@pytest.mark.django_db
def test_unique_company_per_user_normalized():
    user1 = User.objects.create_user(username="user1", password="password")
    user2 = User.objects.create_user(username="user2", password="password")

    Company.objects.create(user=user1, name="Zoho")

    # Creating same company name for user2 should succeed (user isolated)
    Company.objects.create(user=user2, name="Zoho")

    # Creating same normalized company name for user1 should fail
    with pytest.raises(IntegrityError):
        Company.objects.create(user=user1, name="ZOHO")

@pytest.mark.django_db
def test_unique_relationship_per_user_and_person():
    user = User.objects.create_user(username="testuser", password="password")
    company = Company.objects.create(user=user, name="TCS")
    person = Person.objects.create(user=user, name="Balan", company=company)

    Relationship.objects.create(user=user, person=person, current_status="CONTACT_FOUND")

    with pytest.raises(IntegrityError):
        Relationship.objects.create(user=user, person=person, current_status="CONTACTED")

@pytest.mark.django_db
def test_status_change_creates_immutable_statusevent():
    user = User.objects.create_user(username="testuser", password="password")
    company = Company.objects.create(user=user, name="Zoho")
    person = Person.objects.create(user=user, name="Suresh", company=company)
    rel = Relationship.objects.create(user=user, person=person, current_status="RESUME_SENT")

    # Change status via domain service
    rel, event = change_relationship_status(rel, "RESUME_ACCEPTED", note="Resume accepted by manager", user=user)

    assert rel.current_status == "RESUME_ACCEPTED"
    assert event.from_status == "RESUME_SENT"
    assert event.to_status == "RESUME_ACCEPTED"
    assert event.note == "Resume accepted by manager"
    assert event.relationship == rel
    assert rel.status_events.count() == 1
