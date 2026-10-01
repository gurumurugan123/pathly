import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from apps.companies.models import Company
from apps.people.models import Person
from apps.relationships.models import Relationship

@pytest.mark.django_db
def test_graph_api_returns_user_isolated_nodes_and_edges():
    user = User.objects.create_user(username="graphuser", password="password")
    client = APIClient()
    client.force_authenticate(user=user)

    company = Company.objects.create(user=user, name="Cognizant")
    person = Person.objects.create(user=user, name="Linga", company=company)
    rel = Relationship.objects.create(user=user, person=person, current_status="RESUME_ACCEPTED")

    response = client.get('/api/graph/')
    assert response.status_code == 200
    data = response.json()

    assert "nodes" in data
    assert "edges" in data
    assert "stats" in data

    # User node + Company node + Person node = 3 nodes
    assert len(data["nodes"]) == 3

    person_node = next(n for n in data["nodes"] if n["id"] == f"person-{person.id}")
    assert person_node["data"]["name"] == "Linga"
    assert person_node["data"]["status"] == "RESUME_ACCEPTED"

@pytest.mark.django_db
def test_create_person_api_auto_creates_company_and_relationship():
    user = User.objects.create_user(username="apiuser", password="password")
    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        "name": "Ramesh",
        "designation": "Staff Lead",
        "company_name": "Zoho",
        "initial_status": "WILL_REFER",
        "linkedin_url": "https://linkedin.com/in/ramesh-zoho"
    }

    response = client.post('/api/people/', payload, format='json')
    assert response.status_code == 201
    person_data = response.json()

    assert person_data["name"] == "Ramesh"
    assert person_data["current_status"] == "WILL_REFER"
    assert person_data["company_detail"]["name"] == "Zoho"

    # Verify relationship in DB
    rel = Relationship.objects.get(user=user, person_id=person_data["id"])
    assert rel.current_status == "WILL_REFER"
    assert rel.status_events.count() == 1

@pytest.mark.django_db
def test_companies_api_list_and_stats():
    from apps.applications.models import JobPosition, Application

    user = User.objects.create_user(username="compuser", password="password")
    client = APIClient()
    client.force_authenticate(user=user)

    comp = Company.objects.create(user=user, name="Google", website="https://google.com")
    person = Person.objects.create(user=user, name="Larry", company=comp)
    Relationship.objects.create(user=user, person=person, current_status="WILL_REFER")

    pos = JobPosition.objects.create(user=user, company=comp, title="SWE")
    app = Application.objects.create(user=user, job_position=pos, current_status="APPLIED")

    # Test GET /api/companies/
    resp = client.get('/api/companies/')
    assert resp.status_code == 200
    comp_list = resp.json()
    assert len(comp_list) == 1
    assert comp_list[0]["name"] == "Google"
    assert comp_list[0]["applications_count"] == 1
    assert comp_list[0]["active_applications_count"] == 1
    assert comp_list[0]["referral_contacts_count"] == 1
    assert comp_list[0]["has_referral"] is True
    assert comp_list[0]["has_contacts"] is True

    # Test GET /api/companies/stats/
    stats_resp = client.get('/api/companies/stats/')
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_companies"] == 1
    assert stats["active_applications"] == 1
    assert stats["people_connected"] == 1
    assert stats["referral_opportunities"] == 0

    # Test filter=active_applications
    filter_resp = client.get('/api/companies/?filter=active_applications')
    assert filter_resp.status_code == 200
    assert len(filter_resp.json()) == 1

