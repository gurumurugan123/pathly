from apps.applications.models import Application
from apps.relationships.models import Relationship

def detect_referral_opportunities(user) -> list:
    """
    Identifies active applications missing referrals where responsive contacts exist at the same company.
    """
    recommendations_data = []

    active_applications = Application.objects.filter(
        user=user,
        current_status__in=['SAVED', 'APPLIED', 'INTERVIEWING']
    ).select_related('job_position', 'job_position__company').prefetch_related('application_contacts')

    for app in active_applications:
        company = app.job_position.company
        
        # Check if application already has a referral role contact
        has_referral_contact = app.application_contacts.filter(relationship_role='REFERRAL').exists()
        
        if not has_referral_contact:
            # Find contacts at this company with favorable status
            responsive_relationships = Relationship.objects.filter(
                user=user,
                person__company=company,
                current_status__in=['REPLIED', 'WILL_REFER', 'RESUME_ACCEPTED', 'RESUME_SENT', 'CONTACT_FOUND', 'CONTACTED']
            ).select_related('person')

            if responsive_relationships.exists():
                people_names = [rel.person.name for rel in responsive_relationships[:3]]
                top_rel = responsive_relationships.first()

                reason_lines = [
                    f"- Active application for {app.job_position.title} at {company.name}",
                    f"- Application current status is {app.current_status}",
                    f"- You have {responsive_relationships.count()} contact(s) at {company.name} ({', '.join(people_names)})",
                    f"- No referral contact is linked to this application yet"
                ]

                recommendations_data.append({
                    'type': 'REFERRAL_OPPORTUNITY',
                    'priority': 'HIGH',
                    'title': f"Referral Opportunity at {company.name}",
                    'description': f"You have an active application for {app.job_position.title} and {responsive_relationships.count()} contact(s) at {company.name} who may provide a referral.",
                    'reason': "\n".join(reason_lines),
                    'entity_type': 'application',
                    'entity_id': app.id,
                    'deduplication_key': f"referral_opp_app_{app.id}",
                    'metadata': {
                        'application_id': app.id,
                        'company_id': company.id,
                        'company_name': company.name,
                        'job_title': app.job_position.title,
                        'contact_person_ids': [rel.person.id for rel in responsive_relationships],
                        'contact_names': people_names,
                    }
                })

    return recommendations_data
