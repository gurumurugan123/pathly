from django.utils import timezone
from apps.intelligence.services.recommendation_engine import generate_user_recommendations
from apps.intelligence.services.company_intelligence import get_all_company_insights
from apps.relationships.models import FollowUp, Relationship
from apps.applications.models import Application

def get_daily_career_brief(user) -> dict:
    """
    Generates a concise daily career brief summarizing actionable network highlights.
    """
    now = timezone.now()
    due_followups_count = FollowUp.objects.filter(user=user, completed=False, due_date__lte=now + timezone.timedelta(days=1)).count()
    active_apps_count = Application.objects.filter(user=user, current_status__in=['APPLIED', 'INTERVIEWING', 'OFFER_RECEIVED']).count()
    
    # Applications without referral
    apps_without_referral = 0
    for app in Application.objects.filter(user=user, current_status__in=['APPLIED', 'INTERVIEWING']):
        if not app.application_contacts.filter(relationship_role='REFERRAL').exists():
            apps_without_referral += 1

    recent_replies_count = Relationship.objects.filter(
        user=user,
        current_status='REPLIED',
        updated_at__gte=now - timezone.timedelta(days=7)
    ).count()

    recommendations = generate_user_recommendations(user)

    bullets = []
    if due_followups_count > 0:
        bullets.append(f"• {due_followups_count} follow-up(s) due today or overdue")
    if apps_without_referral > 0:
        bullets.append(f"• {apps_without_referral} active application(s) have no linked referral contact")
    if recent_replies_count > 0:
        bullets.append(f"• {recent_replies_count} contact(s) recently replied to your outreach")

    if not bullets:
        bullets.append("• Your career pipeline is up to date! Continue expanding your network.")

    return {
        'date': now.strftime('%B %d, %Y'),
        'due_followups_count': due_followups_count,
        'apps_without_referral_count': apps_without_referral,
        'recent_replies_count': recent_replies_count,
        'active_applications_count': active_apps_count,
        'brief_highlights': bullets,
        'top_recommendation_count': len(recommendations),
    }

def get_needs_attention(user) -> list:
    """
    Returns recommendations flagged with HIGH or MEDIUM priority.
    """
    recs = generate_user_recommendations(user)
    return [r for r in recs if r.priority in ['HIGH', 'MEDIUM']]
