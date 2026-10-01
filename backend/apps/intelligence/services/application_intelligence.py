from django.utils import timezone
from datetime import timedelta
from apps.applications.models import Application

def analyze_application_risks(user) -> list:
    """
    Analyzes application pipeline health, detecting stale applications and upcoming interview milestones.
    """
    now = timezone.now()
    recommendations_data = []

    applications = Application.objects.filter(
        user=user,
        current_status__in=['APPLIED', 'INTERVIEWING', 'OFFER_RECEIVED']
    ).select_related('job_position', 'job_position__company')

    for app in applications:
        days_since_update = (now - app.updated_at).days if app.updated_at else 0
        company_name = app.job_position.company.name

        # Stale Application (stuck > 7 days in APPLIED stage)
        if app.current_status == 'APPLIED' and days_since_update >= 7:
            reason_lines = [
                f"- Application for {app.job_position.title} at {company_name}",
                f"- Applied on {app.applied_at.strftime('%b %d, %Y') if app.applied_at else 'Unknown'}",
                f"- No status update or activity recorded in the last {days_since_update} days"
            ]

            recommendations_data.append({
                'type': 'APPLICATION_STALE',
                'priority': 'HIGH' if days_since_update >= 14 else 'MEDIUM',
                'title': f"Stale Application at {company_name}",
                'description': f"Application for {app.job_position.title} has had no activity for {days_since_update} days.",
                'reason': "\n".join(reason_lines),
                'entity_type': 'application',
                'entity_id': app.id,
                'deduplication_key': f"stale_app_{app.id}_{days_since_update // 7}",
                'metadata': {
                    'application_id': app.id,
                    'company_name': company_name,
                    'days_stale': days_since_update,
                    'current_status': app.current_status,
                }
            })

        # Interview Preparation
        elif app.current_status == 'INTERVIEWING':
            reason_lines = [
                f"- Active interview process for {app.job_position.title} at {company_name}",
                "- Review company insights, notes, and contacts before your round"
            ]

            recommendations_data.append({
                'type': 'INTERVIEW_PREPARATION',
                'priority': 'HIGH',
                'title': f"Interview Prep for {company_name}",
                'description': f"Prepare for your upcoming interview round for {app.job_position.title}.",
                'reason': "\n".join(reason_lines),
                'entity_type': 'application',
                'entity_id': app.id,
                'deduplication_key': f"interview_prep_app_{app.id}",
                'metadata': {
                    'application_id': app.id,
                    'company_name': company_name,
                    'job_title': app.job_position.title,
                }
            })

    return recommendations_data
