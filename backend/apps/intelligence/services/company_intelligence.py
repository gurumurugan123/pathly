from apps.companies.models import Company
from apps.relationships.models import Relationship
from apps.applications.models import Application

def get_company_intelligence(company: Company, user) -> dict:
    """
    Calculates useful derived network coverage and relationship metrics for a specific company.
    """
    relationships = Relationship.objects.filter(user=user, person__company=company).select_related('person')
    contact_count = relationships.count()

    responsive_count = relationships.filter(
        current_status__in=['REPLIED', 'WILL_REFER', 'RESUME_ACCEPTED', 'RESUME_SENT', 'REFERRAL_GIVEN']
    ).count()

    referral_contacts_count = relationships.filter(
        current_status__in=['WILL_REFER', 'REFERRAL_GIVEN']
    ).count()

    applications = Application.objects.filter(
        user=user,
        job_position__company=company
    ).prefetch_related('application_contacts')

    active_applications_count = applications.filter(
        current_status__in=['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER_RECEIVED']
    ).count()

    apps_without_referrals = 0
    for app in applications.filter(current_status__in=['SAVED', 'APPLIED', 'INTERVIEWING']):
        if not app.application_contacts.filter(relationship_role='REFERRAL').exists():
            apps_without_referrals += 1

    # Determine coverage level
    if contact_count == 0:
        coverage_level = 'NONE'
    elif responsive_count >= 2 or referral_contacts_count >= 1:
        coverage_level = 'STRONG'
    elif contact_count >= 2:
        coverage_level = 'MODERATE'
    else:
        coverage_level = 'WEAK'

    return {
        'company_id': company.id,
        'company_name': company.name,
        'industry': company.industry,
        'contact_count': contact_count,
        'responsive_count': responsive_count,
        'referral_contacts_count': referral_contacts_count,
        'active_applications_count': active_applications_count,
        'applications_without_referrals_count': apps_without_referrals,
        'coverage_level': coverage_level,
    }

def get_all_company_insights(user) -> list:
    """
    Calculates company intelligence for all companies in the user's workspace.
    """
    companies = Company.objects.filter(user=user)
    return [get_company_intelligence(comp, user) for comp in companies]
