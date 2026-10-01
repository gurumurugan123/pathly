from django.utils import timezone
from datetime import timedelta
from apps.relationships.models import Relationship, FollowUp

def analyze_followup_needs(user) -> list:
    """
    Identifies relationships requiring follow-up action based on interaction history.
    """
    now = timezone.now()
    recommendations_data = []

    # 1. Overdue follow-ups
    overdue_followups = FollowUp.objects.filter(
        user=user,
        completed=False,
        due_date__lt=now
    ).select_related('relationship', 'relationship__person', 'application', 'application__job_position')

    for fu in overdue_followups:
        entity_name = fu.relationship.person.name if fu.relationship else (fu.application.job_position.title if fu.application else "Item")
        days_overdue = (now - fu.due_date).days
        recommendations_data.append({
            'type': 'FOLLOW_UP',
            'priority': 'HIGH',
            'title': f"Overdue Follow-up with {entity_name}",
            'description': f"Follow-up titled '{fu.title or fu.note or 'Check in'}' is {days_overdue} day(s) overdue.",
            'reason': f"Scheduled follow-up due on {fu.due_date.strftime('%b %d, %Y')} was not completed.",
            'entity_type': 'person' if fu.relationship else 'application',
            'entity_id': fu.relationship.person.id if fu.relationship else fu.application.id,
            'deduplication_key': f"overdue_followup_{fu.id}",
            'metadata': {
                'followup_id': fu.id,
                'due_date': fu.due_date.isoformat(),
                'person_name': entity_name,
            }
        })

    # 2. Contacts with status REPLIED, RESUME_SENT, or WILL_REFER without active follow-up
    relationships = Relationship.objects.filter(
        user=user,
        current_status__in=['REPLIED', 'RESUME_SENT', 'WILL_REFER', 'CONTACTED']
    ).select_related('person', 'person__company')

    for rel in relationships:
        active_fu = FollowUp.objects.filter(user=user, relationship=rel, completed=False).first()
        if not active_fu:
            days_since_update = (now - rel.updated_at).days if rel.updated_at else 0
            if days_since_update >= 3:
                priority = 'HIGH' if rel.current_status in ['WILL_REFER', 'REPLIED'] else 'MEDIUM'
                company_name = rel.person.company.name if rel.person.company else 'company'
                
                # Formulate explainable reason
                reason_lines = [
                    f"- Contacted {rel.person.name} ({rel.person.designation or 'Contact'}) at {company_name}",
                    f"- Current relationship status is {rel.current_status}",
                    f"- Last activity was {days_since_update} day(s) ago",
                    "- No active follow-up is currently scheduled"
                ]

                recommendations_data.append({
                    'type': 'FOLLOW_UP',
                    'priority': priority,
                    'title': f"Follow up with {rel.person.name}",
                    'description': f"{rel.person.name} at {company_name} is in status {rel.current_status} without a scheduled follow-up.",
                    'reason': "\n".join(reason_lines),
                    'entity_type': 'person',
                    'entity_id': rel.person.id,
                    'deduplication_key': f"no_followup_{rel.id}_{rel.current_status}",
                    'metadata': {
                        'person_id': rel.person.id,
                        'person_name': rel.person.name,
                        'company_name': company_name,
                        'current_status': rel.current_status,
                    }
                })

    return recommendations_data
