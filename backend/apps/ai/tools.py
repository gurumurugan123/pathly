from django.db.models import Q, Count
from django.utils import timezone
from apps.people.models import Person
from apps.companies.models import Company
from apps.relationships.models import Relationship, Note, FollowUp
from apps.relationships.services import change_relationship_status
from apps.applications.models import JobPosition, Application, ApplicationContact, ApplicationStatusEvent
from apps.applications.services import change_application_status
from apps.graph.services import build_user_graph

# ==============================================================================
# READ TOOLS
# ==============================================================================

def find_people(user, query=None, status=None, company_name=None):
    """Controlled tool: find people belonging to the user."""
    qs = Person.objects.filter(user=user).select_related('company').prefetch_related('relationships')
    if query:
        q = query.strip()
        qs = qs.filter(
            Q(name__icontains=q) |
            Q(designation__icontains=q) |
            Q(email__icontains=q) |
            Q(company__name__icontains=q)
        )
    if company_name:
        qs = qs.filter(company__name__icontains=company_name.strip())
    if status:
        st_clean = status.strip().upper()
        # map common natural language status names to exact database keys
        status_map = {
            'REPLIED': 'REPLIED',
            'RESUME ACCEPTED': 'RESUME_ACCEPTED',
            'WILL REFER': 'WILL_REFER',
            'REFERRAL GIVEN': 'REFERRAL_GIVEN',
            'CONTACT FOUND': 'CONTACT_FOUND',
            'CONTACTED': 'CONTACTED',
            'RESUME SENT': 'RESUME_SENT',
            'SAVED': 'SAVED',
            'INTERVIEWING': 'INTERVIEW_SCHEDULED',
            'INTERVIEW SCHEDULED': 'INTERVIEW_SCHEDULED',
            'OFFER': 'OFFER_RECEIVED',
            'HIRED': 'HIRED'
        }
        mapped_status = status_map.get(st_clean, st_clean.replace(' ', '_'))
        qs = qs.filter(relationships__user=user, relationships__current_status=mapped_status)

    return qs.distinct()


def find_companies(user, query=None):
    """Controlled tool: find companies belonging to the user."""
    qs = Company.objects.filter(user=user)
    if query:
        qs = qs.filter(name__icontains=query.strip())
    return qs.distinct()


def find_relationships(user, status=None):
    """Controlled tool: find relationships belonging to the user."""
    qs = Relationship.objects.filter(user=user).select_related('person', 'person__company')
    if status:
        st_clean = status.strip().upper().replace(' ', '_')
        qs = qs.filter(current_status=st_clean)
    return qs


def find_applications(user, query=None, status=None, has_referral=None):
    """Controlled tool: find job applications belonging to the user."""
    qs = Application.objects.filter(user=user).select_related('job_position', 'job_position__company').prefetch_related('application_contacts')
    if query:
        q = query.strip()
        qs = qs.filter(
            Q(job_position__title__icontains=q) |
            Q(job_position__company__name__icontains=q) |
            Q(current_status__icontains=q)
        )
    if status:
        st_clean = status.strip().upper().replace(' ', '_')
        qs = qs.filter(current_status=st_clean)
    if has_referral is not None:
        if has_referral is True or has_referral == 'true':
            qs = qs.filter(
                Q(current_status__in=['REFERRAL_REQUESTED', 'REFERRAL_GIVEN']) |
                Q(application_contacts__relationship_role='REFERRAL_CONTACT')
            )
        elif has_referral is False or has_referral == 'false':
            qs = qs.exclude(
                Q(current_status__in=['REFERRAL_REQUESTED', 'REFERRAL_GIVEN']) |
                Q(application_contacts__relationship_role='REFERRAL_CONTACT')
            )
    return qs.distinct()


def find_followups(user, time_filter=None):
    """Controlled tool: find follow-ups belonging to the user."""
    qs = FollowUp.objects.filter(user=user).select_related('relationship', 'relationship__person', 'application', 'application__job_position')
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timezone.timedelta(days=1)

    if time_filter == 'today':
        qs = qs.filter(due_date__gte=today_start, due_date__lt=today_end)
    elif time_filter == 'overdue':
        qs = qs.filter(due_date__lt=today_start, completed=False)
    elif time_filter == 'upcoming':
        qs = qs.filter(due_date__gte=today_end, completed=False)
    elif time_filter == 'pending':
        qs = qs.filter(completed=False)

    return qs.order_by('due_date')


def get_graph(user):
    """Controlled tool: fetch user's full React Flow graph structure."""
    return build_user_graph(user)


def get_person(user, person_id):
    """Controlled tool: retrieve specific person by ID."""
    return Person.objects.filter(user=user, id=person_id).first()


def get_company(user, company_id):
    """Controlled tool: retrieve specific company by ID."""
    return Company.objects.filter(user=user, id=company_id).first()


def get_application(user, application_id):
    """Controlled tool: retrieve specific job application by ID."""
    return Application.objects.filter(user=user, id=application_id).first()


def get_analytics(user):
    """Controlled tool: return calculated hiring and referral conversion analytics."""
    apps = Application.objects.filter(user=user)
    total_apps = apps.count()
    active_statuses = ['APPLIED', 'REFERRAL_REQUESTED', 'REFERRAL_GIVEN', 'SCREENING', 'INTERVIEW', 'TECHNICAL_INTERVIEW', 'HR_INTERVIEW']
    active_apps = apps.filter(current_status__in=active_statuses).count()
    interviews = apps.filter(current_status__in=['INTERVIEW', 'TECHNICAL_INTERVIEW', 'HR_INTERVIEW']).count()
    offers = apps.filter(current_status='OFFER').count()
    hired = apps.filter(current_status='HIRED').count()
    referral_apps = apps.filter(current_status__in=['REFERRAL_REQUESTED', 'REFERRAL_GIVEN']).count()
    status_counts = dict(apps.values_list('current_status').annotate(count=Count('id')))

    people_count = Person.objects.filter(user=user).count()
    contacted_count = Relationship.objects.filter(user=user).exclude(current_status='CONTACT_FOUND').count()
    resume_accepted_count = Relationship.objects.filter(user=user, current_status='RESUME_ACCEPTED').count()

    top_company = (
        apps.values('job_position__company__name')
        .annotate(count=Count('id'))
        .order_by('-count')
        .first()
    )

    return {
        "metrics": {
            "totalApplications": total_apps,
            "activeApplications": active_apps,
            "interviews": interviews,
            "offers": offers,
            "hired": hired,
            "referralApplications": referral_apps,
            "referralConversionRate": round((referral_apps / (total_apps or 1)) * 100, 1),
            "totalPeople": people_count,
            "contactedPeople": contacted_count,
            "resumeAcceptedCount": resume_accepted_count,
            "topCompany": top_company['job_position__company__name'] if top_company else "N/A"
        },
        "statusDistribution": status_counts
    }

# ==============================================================================
# ACTION TOOLS (MUTATIONS)
# ==============================================================================

def update_relationship_status(user, person_id, new_status, note=""):
    """Action tool: update a person's relationship status with audit event."""
    try:
        person = Person.objects.get(id=person_id, user=user)
    except Person.DoesNotExist:
        raise ValueError("Person not found or unauthorized")

    rel, _ = Relationship.objects.get_or_create(user=user, person=person)
    rel, event = change_relationship_status(rel, new_status, note=note or f"Updated via AI Assistant", user=user)
    return rel, event


def update_application_status(user, application_id, new_status, note=""):
    """Action tool: update a job application status with audit event."""
    try:
        app = Application.objects.get(id=application_id, user=user)
    except Application.DoesNotExist:
        raise ValueError("Application not found or unauthorized")

    app, event = change_application_status(app, new_status, note=note or "Updated via AI Assistant", user=user)
    return app, event


def create_note(user, person_id, content):
    """Action tool: create a note attached to a person."""
    try:
        person = Person.objects.get(id=person_id, user=user)
    except Person.DoesNotExist:
        raise ValueError("Person not found or unauthorized")

    rel, _ = Relationship.objects.get_or_create(user=user, person=person)
    note = Note.objects.create(relationship=rel, content=content, created_by=user)
    return note


def create_followup(user, title, due_date=None, person_id=None, application_id=None, description=""):
    """Action tool: create a follow-up task."""
    relationship = None
    application = None

    if person_id:
        try:
            person = Person.objects.get(id=person_id, user=user)
            relationship, _ = Relationship.objects.get_or_create(user=user, person=person)
        except Person.DoesNotExist:
            raise ValueError("Person not found or unauthorized")

    if application_id:
        try:
            application = Application.objects.get(id=application_id, user=user)
        except Application.DoesNotExist:
            raise ValueError("Application not found or unauthorized")

    if not due_date:
        due_date = timezone.now() + timezone.timedelta(days=1)
    elif isinstance(due_date, str):
        # Default parse or set tomorrow
        try:
            due_date = timezone.datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        except Exception:
            due_date = timezone.now() + timezone.timedelta(days=1)

    followup = FollowUp.objects.create(
        user=user,
        relationship=relationship,
        application=application,
        title=title,
        description=description,
        due_date=due_date
    )
    return followup


def create_application(user, company_name, job_title, job_url="", status="APPLIED"):
    """Action tool: create a new job application."""
    normalized = company_name.strip().lower()
    company, _ = Company.objects.get_or_create(
        user=user,
        normalized_name=normalized,
        defaults={'name': company_name.strip()}
    )
    job_position = JobPosition.objects.create(
        user=user,
        company=company,
        title=job_title.strip(),
        url=job_url.strip()
    )
    applied_at = timezone.now() if status != 'SAVED' else None
    app = Application.objects.create(
        user=user,
        job_position=job_position,
        current_status=status,
        applied_at=applied_at
    )
    ApplicationStatusEvent.objects.create(
        application=app,
        from_status='',
        to_status=status,
        note='Created via AI Assistant',
        created_by=user
    )
    return app


# ==============================================================================
# PHASE 4 INTELLIGENCE TOOLS
# ==============================================================================

def get_recommendations_tool(user):
    """Controlled tool: get prioritized user recommendations."""
    from apps.intelligence.services.recommendation_engine import generate_user_recommendations
    return generate_user_recommendations(user)

def get_daily_brief_tool(user):
    """Controlled tool: get daily career brief."""
    from apps.intelligence.services.career_intelligence import get_daily_career_brief
    return get_daily_career_brief(user)

def get_referral_opportunities_tool(user):
    """Controlled tool: get referral opportunities."""
    from apps.intelligence.services.referral_opportunity_detector import detect_referral_opportunities
    return detect_referral_opportunities(user)

def get_network_gaps_tool(user):
    """Controlled tool: get network gap applications."""
    from apps.intelligence.services.network_gap_detector import detect_network_gaps
    return detect_network_gaps(user)

def explain_relationship_tool(user, person_name):
    """Controlled tool: explain relationship strength with data breakdown."""
    from apps.relationships.models import Relationship
    from apps.intelligence.services.relationship_intelligence import calculate_relationship_strength

    rel = Relationship.objects.filter(user=user, person__name__icontains=person_name.strip()).first()
    if not rel:
        return None
    return calculate_relationship_strength(rel)

def get_company_coverage_tool(user, company_name=None):
    """Controlled tool: get network coverage breakdown per company."""
    from apps.companies.models import Company
    from apps.intelligence.services.company_intelligence import get_company_intelligence, get_all_company_insights

    if company_name:
        comp = Company.objects.filter(user=user, name__icontains=company_name.strip()).first()
        if comp:
            return get_company_intelligence(comp, user)
        return None
    return get_all_company_insights(user)

