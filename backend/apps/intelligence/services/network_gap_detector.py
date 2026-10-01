from apps.applications.models import Application
from apps.relationships.models import Relationship

def detect_network_gaps(user) -> list:
    """
    Identifies active applications at companies where the user has zero contacts in their network.
    """
    recommendations_data = []

    active_applications = Application.objects.filter(
        user=user,
        current_status__in=['SAVED', 'APPLIED', 'INTERVIEWING']
    ).select_related('job_position', 'job_position__company')

    for app in active_applications:
        company = app.job_position.company
        contact_count = Relationship.objects.filter(user=user, person__company=company).count()

        if contact_count == 0:
            reason_lines = [
                f"- Active application for {app.job_position.title} at {company.name}",
                f"- Application current status is {app.current_status}",
                f"- 0 network connections found at {company.name}"
            ]

            recommendations_data.append({
                'type': 'NETWORK_GAP',
                'priority': 'MEDIUM',
                'title': f"No Network Coverage at {company.name}",
                'description': f"You applied to {company.name} ({app.job_position.title}), but have 0 connections in your network.",
                'reason': "\n".join(reason_lines),
                'entity_type': 'application',
                'entity_id': app.id,
                'deduplication_key': f"network_gap_app_{app.id}",
                'metadata': {
                    'application_id': app.id,
                    'company_id': company.id,
                    'company_name': company.name,
                    'job_title': app.job_position.title,
                }
            })

    return recommendations_data
