from apps.relationships.models import Relationship, FollowUp
from apps.applications.models import Application
from apps.companies.models import Company
from apps.intelligence.services.relationship_intelligence import calculate_relationship_strength

def get_graph_intelligence_overlay(user, mode: str = 'NORMAL') -> dict:
    """
    Returns highlighted and dimmed node sets for intelligent visual graph modes.
    Modes: NORMAL, RELATIONSHIP_STRENGTH, REFERRAL_OPPORTUNITIES, APPLICATION_FOCUS, FOLLOW_UPS, COMPANY_COVERAGE
    """
    mode = mode.upper()
    emphasized_node_ids = []
    metadata = {}

    if mode == 'RELATIONSHIP_STRENGTH':
        relationships = Relationship.objects.filter(user=user).select_related('person')
        high_rel_people = []
        for rel in relationships:
            info = calculate_relationship_strength(rel)
            if info['category'] in ['HIGH', 'VERY_HIGH']:
                high_rel_people.append(f"person-{rel.person.id}")
                if rel.person.company:
                    high_rel_people.append(f"company-{rel.person.company.id}")
        emphasized_node_ids = list(set(high_rel_people))
        metadata['description'] = "High & Very High relationship strength contacts emphasized"

    elif mode == 'REFERRAL_OPPORTUNITIES':
        active_apps = Application.objects.filter(
            user=user,
            current_status__in=['SAVED', 'APPLIED', 'INTERVIEWING']
        ).select_related('job_position', 'job_position__company')

        referral_nodes = []
        for app in active_apps:
            comp = app.job_position.company
            has_ref = app.application_contacts.filter(relationship_role='REFERRAL').exists()
            if not has_ref:
                referral_nodes.append(f"application-{app.id}")
                referral_nodes.append(f"company-{comp.id}")
                contacts = Relationship.objects.filter(user=user, person__company=comp)
                for c in contacts:
                    referral_nodes.append(f"person-{c.person.id}")
        emphasized_node_ids = list(set(referral_nodes))
        metadata['description'] = "Applications missing referrals and potential company contacts emphasized"

    elif mode == 'FOLLOW_UPS':
        pending_followups = FollowUp.objects.filter(user=user, completed=False).select_related('relationship', 'relationship__person')
        followup_nodes = []
        for fu in pending_followups:
            if fu.relationship:
                followup_nodes.append(f"person-{fu.relationship.person.id}")
                if fu.relationship.person.company:
                    followup_nodes.append(f"company-{fu.relationship.person.company.id}")
            if fu.application:
                followup_nodes.append(f"application-{fu.application.id}")
        emphasized_node_ids = list(set(followup_nodes))
        metadata['description'] = "Contacts and applications with active follow-ups emphasized"

    elif mode == 'COMPANY_COVERAGE':
        companies = Company.objects.filter(user=user)
        coverage_nodes = []
        for comp in companies:
            rel_count = Relationship.objects.filter(user=user, person__company=comp).count()
            if rel_count > 0:
                coverage_nodes.append(f"company-{comp.id}")
                for rel in Relationship.objects.filter(user=user, person__company=comp):
                    coverage_nodes.append(f"person-{rel.person.id}")
        emphasized_node_ids = list(set(coverage_nodes))
        metadata['description'] = "Companies with existing network coverage emphasized"

    elif mode == 'APPLICATION_FOCUS':
        active_apps = Application.objects.filter(user=user, current_status__in=['APPLIED', 'INTERVIEWING', 'OFFER_RECEIVED'])
        app_nodes = [f"application-{a.id}" for a in active_apps]
        for a in active_apps:
            app_nodes.append(f"company-{a.job_position.company.id}")
        emphasized_node_ids = list(set(app_nodes))
        metadata['description'] = "Active applications and target companies emphasized"

    else:
        metadata['description'] = "Default graph view"

    return {
        'mode': mode,
        'emphasized_node_ids': emphasized_node_ids,
        'metadata': metadata,
    }
