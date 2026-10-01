import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from apps.companies.models import Company
from apps.people.models import Person
from apps.relationships.models import Relationship
from apps.relationships.services import change_relationship_status
from apps.applications.models import JobPosition, Application, ApplicationContact
from apps.ai.tools import (
    find_people,
    find_companies,
    find_applications,
    update_relationship_status,
    update_application_status,
    create_followup
)

@pytest.mark.django_db
def test_ai_query_read_only_and_graph_selections():
    user = User.objects.create_user(username="aiuser1", password="password")
    client = APIClient()
    client.force_authenticate(user=user)

    company = Company.objects.create(user=user, name="Zoho")
    p1 = Person.objects.create(user=user, name="Suresh", company=company)
    rel1, _ = Relationship.objects.get_or_create(user=user, person=p1)
    change_relationship_status(rel1, "REPLIED", user=user)

    p2 = Person.objects.create(user=user, name="Linga", company=company)
    rel2, _ = Relationship.objects.get_or_create(user=user, person=p2)
    change_relationship_status(rel2, "CONTACT_FOUND", user=user)

    # Query: "Show everyone from Zoho who replied."
    resp = client.post('/api/ai/query/', {"query": "Show everyone from Zoho who replied."}, format='json')
    assert resp.status_code == 200
    data = resp.json()

    assert f"person-{p1.id}" in data["selectedPeople"]
    assert f"person-{p2.id}" not in data["selectedPeople"]
    assert f"company-{company.id}" in data["selectedCompanies"]
    assert data["pendingMutation"] is None


@pytest.mark.django_db
def test_ai_mutation_confirmation_and_execution():
    user = User.objects.create_user(username="aiuser2", password="password")
    client = APIClient()
    client.force_authenticate(user=user)

    company = Company.objects.create(user=user, name="TCS")
    person = Person.objects.create(user=user, name="Balan", company=company)
    rel, _ = Relationship.objects.get_or_create(user=user, person=person)
    change_relationship_status(rel, "REPLIED", user=user)

    # 1. Ask AI to mark status as WILL_REFER -> Returns pending mutation confirmation payload
    resp = client.post('/api/ai/query/', {"query": "Mark Balan as willing to refer."}, format='json')
    assert resp.status_code == 200
    data = resp.json()

    pending = data.get("pendingMutation")
    assert pending is not None
    assert pending["action"] == "update_relationship_status"
    assert pending["params"]["person_id"] == person.id
    assert pending["params"]["new_status"] == "WILL_REFER"

    # Status in DB must NOT change yet before confirmation
    rel.refresh_from_db()
    assert rel.current_status == "REPLIED"

    # 2. User confirms mutation via /api/ai/execute-mutation/
    exec_resp = client.post('/api/ai/execute-mutation/', {
        "action": pending["action"],
        "params": pending["params"]
    }, format='json')

    assert exec_resp.status_code == 200
    exec_data = exec_resp.json()
    assert exec_data["success"] is True

    # Database state updated
    rel.refresh_from_db()
    assert rel.current_status == "WILL_REFER"


@pytest.mark.django_db
def test_ai_user_isolation_and_security():
    user_a = User.objects.create_user(username="user_a", password="password")
    user_b = User.objects.create_user(username="user_b", password="password")

    company_a = Company.objects.create(user=user_a, name="Secret Corp")
    person_a = Person.objects.create(user=user_a, name="Alice", company=company_a)

    client_b = APIClient()
    client_b.force_authenticate(user=user_b)

    # User B queries "Alice" -> should find 0 contacts
    resp = client_b.post('/api/ai/query/', {"query": "Show Alice from Secret Corp"}, format='json')
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["selectedPeople"]) == 0

    # User B attempts to execute mutation on user_a's person -> returns 400 Bad Request
    exec_resp = client_b.post('/api/ai/execute-mutation/', {
        "action": "update_relationship_status",
        "params": {
            "person_id": person_a.id,
            "new_status": "WILL_REFER"
        }
    }, format='json')

    assert exec_resp.status_code == 400
    assert "not found or unauthorized" in exec_resp.json()["error"]


@pytest.mark.django_db
def test_ai_action_tools_create_application_and_followup():
    user = User.objects.create_user(username="actionuser", password="password")
    client = APIClient()
    client.force_authenticate(user=user)

    # Test create_application mutation tool
    resp1 = client.post('/api/ai/execute-mutation/', {
        "action": "create_application",
        "params": {
            "company_name": "Google",
            "job_title": "Staff Engineer",
            "status": "APPLIED"
        }
    }, format='json')

    assert resp1.status_code == 200
    assert resp1.json()["success"] is True
    assert Application.objects.filter(user=user, job_position__company__name="Google").exists()

    app = Application.objects.get(user=user, job_position__company__name="Google")

    # Test create_followup mutation tool
    resp2 = client.post('/api/ai/execute-mutation/', {
        "action": "create_followup",
        "params": {
            "title": "Prepare system design presentation",
            "application_id": app.id
        }
    }, format='json')

    assert resp2.status_code == 200
    assert resp2.json()["success"] is True
    assert app.follow_ups.count() == 1


@pytest.mark.django_db
def test_ai_unauthenticated_access():
    client = APIClient()
    resp = client.post('/api/ai/query/', {"query": "Show my network"})
    assert resp.status_code == 401

    exec_resp = client.post('/api/ai/execute-mutation/', {"action": "update_relationship_status", "params": {}}, format='json')
    assert exec_resp.status_code == 401
