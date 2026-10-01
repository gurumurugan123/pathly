import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from apps.companies.models import Company
from apps.people.models import Person
from apps.relationships.models import Relationship, Note, FollowUp
from apps.applications.models import JobPosition, Application, ApplicationContact
from apps.intelligence.models import Recommendation, RecommendationEvent, Notification
from apps.intelligence.services.recommendation_engine import generate_user_recommendations
from apps.intelligence.services.relationship_intelligence import calculate_relationship_strength
from apps.intelligence.services.company_intelligence import get_company_intelligence
from apps.intelligence.services.graph_intelligence import get_graph_intelligence_overlay

@pytest.mark.django_db
class TestPhase4Intelligence:

    @pytest.fixture
    def setup_user_and_data(self):
        user = User.objects.create_user(username='intel_user', password='password123')
        other_user = User.objects.create_user(username='other_user', password='password123')

        company = Company.objects.create(user=user, name='Zoho', normalized_name='zoho', industry='Software')
        person = Person.objects.create(user=user, name='Suresh Kumar', designation='Senior Engineer', company=company)
        
        relationship = Relationship.objects.create(
            user=user,
            person=person,
            current_status='REPLIED',
            updated_at=timezone.now() - timedelta(days=5)
        )

        job_pos = JobPosition.objects.create(user=user, company=company, title='Backend Engineer')
        app = Application.objects.create(user=user, job_position=job_pos, current_status='APPLIED', applied_at=timezone.now() - timedelta(days=10))

        return {
            'user': user,
            'other_user': other_user,
            'company': company,
            'person': person,
            'relationship': relationship,
            'application': app,
        }

    def test_recommendation_generation_and_deduplication(self, setup_user_and_data):
        data = setup_user_and_data
        user = data['user']

        recs = generate_user_recommendations(user)
        assert len(recs) > 0

        # Verify recommendation has explainable reason
        first_rec = recs[0]
        assert first_rec.reason is not None
        assert len(first_rec.reason) > 0

        # Re-running generation does not duplicate active recommendations
        initial_count = Recommendation.objects.filter(user=user).count()
        recs2 = generate_user_recommendations(user)
        assert Recommendation.objects.filter(user=user).count() == initial_count

    def test_recommendation_dismissal_cooldown(self, setup_user_and_data):
        data = setup_user_and_data
        user = data['user']
        client = APIClient()
        client.force_authenticate(user=user)

        recs = generate_user_recommendations(user)
        rec = recs[0]

        # Dismiss recommendation via API
        response = client.post(f'/api/intelligence/recommendations/{rec.id}/dismiss/')
        assert response.status_code == 200
        assert response.json()['recommendation']['status'] == 'DISMISSED'

        # Verify event was recorded
        assert RecommendationEvent.objects.filter(user=user, recommendation=rec, event_type='DISMISSED').exists()

        # Generate recommendations again -> dismissed item is excluded
        active_recs = generate_user_recommendations(user)
        assert rec.id not in [r.id for r in active_recs]

    def test_relationship_strength_scoring(self, setup_user_and_data):
        data = setup_user_and_data
        rel = data['relationship']

        # Add notes and completed followups to boost score
        Note.objects.create(relationship=rel, content='Great chat about tech stack')
        FollowUp.objects.create(user=data['user'], relationship=rel, title='Call back', due_date=timezone.now(), completed=True)

        strength_info = calculate_relationship_strength(rel)
        assert strength_info['category'] in ['MEDIUM', 'HIGH', 'VERY_HIGH']
        assert len(strength_info['factors']) > 0

    def test_company_intelligence(self, setup_user_and_data):
        data = setup_user_and_data
        comp_intel = get_company_intelligence(data['company'], data['user'])

        assert comp_intel['company_name'] == 'Zoho'
        assert comp_intel['contact_count'] == 1
        assert comp_intel['active_applications_count'] == 1
        assert comp_intel['applications_without_referrals_count'] == 1

    def test_graph_intelligence_modes(self, setup_user_and_data):
        data = setup_user_and_data
        user = data['user']

        overlay = get_graph_intelligence_overlay(user, mode='REFERRAL_OPPORTUNITIES')
        assert overlay['mode'] == 'REFERRAL_OPPORTUNITIES'
        assert len(overlay['emphasized_node_ids']) > 0

    def test_notifications_api(self, setup_user_and_data):
        data = setup_user_and_data
        user = data['user']
        client = APIClient()
        client.force_authenticate(user=user)

        # Create notification
        Notification.objects.create(user=user, title='Referral alert', message='Check Zoho', is_read=False)

        response = client.get('/api/intelligence/notifications/')
        assert response.status_code == 200
        assert response.json()['unread_count'] == 1

        # Mark read
        read_resp = client.post('/api/intelligence/notifications/read-all/')
        assert read_resp.status_code == 200

        res2 = client.get('/api/intelligence/notifications/')
        assert res2.json()['unread_count'] == 0

    def test_user_data_isolation(self, setup_user_and_data):
        data = setup_user_and_data
        other_user = data['other_user']
        client = APIClient()

        # Attempt to access recommendations as other user
        client.force_authenticate(user=other_user)
        response = client.get('/api/intelligence/recommendations/')
        assert response.status_code == 200
        assert len(response.json()) == 0
