from django.utils import timezone
from datetime import timedelta
from apps.relationships.models import Relationship

def calculate_relationship_strength(relationship: Relationship) -> dict:
    """
    Calculates derived interaction relationship strength score and returns explainable data factors.
    Score ranges:
      0-20: VERY_LOW
      21-45: LOW
      46-70: MEDIUM
      71-89: HIGH
      90+: VERY_HIGH
    """
    factors = []
    score = 10 # Base starting connection score

    status = relationship.current_status
    if status == 'WILL_REFER':
        score += 35
        factors.append("Will Refer commitment confirmed (+35)")
    elif status == 'REFERRAL_GIVEN':
        score += 45
        factors.append("Referral officially submitted (+45)")
    elif status == 'RESUME_ACCEPTED':
        score += 30
        factors.append("Resume accepted (+30)")
    elif status == 'RESUME_SENT':
        score += 20
        factors.append("Resume shared (+20)")
    elif status == 'REPLIED':
        score += 25
        factors.append("Replied to message (+25)")
    elif status == 'CONTACTED':
        score += 15
        factors.append("Outreach initiated (+15)")
    elif status == 'CONTACT_FOUND':
        factors.append("Contact discovered (+10)")

    # Recent interaction check
    now = timezone.now()
    if relationship.updated_at and (now - relationship.updated_at).days <= 7:
        score += 15
        factors.append("Recent activity within last 7 days (+15)")
    elif relationship.updated_at and (now - relationship.updated_at).days <= 14:
        score += 10
        factors.append("Activity within last 14 days (+10)")

    # Notes & Follow-ups activity
    notes_count = relationship.notes.count()
    if notes_count > 0:
        boost = min(notes_count * 5, 15)
        score += boost
        factors.append(f"{notes_count} documented notes/interactions (+{boost})")

    completed_followups = relationship.follow_ups.filter(completed=True).count()
    if completed_followups > 0:
        boost = min(completed_followups * 10, 20)
        score += boost
        factors.append(f"{completed_followups} completed follow-ups (+{boost})")

    # Application linkage boost
    linked_apps = relationship.person.application_contacts.count()
    if linked_apps > 0:
        score += 15
        factors.append(f"Linked as contact for {linked_apps} active job applications (+15)")

    # Determine category label
    if score >= 90:
        category = 'VERY_HIGH'
    elif score >= 71:
        category = 'HIGH'
    elif score >= 46:
        category = 'MEDIUM'
    elif score >= 21:
        category = 'LOW'
    else:
        category = 'VERY_LOW'

    return {
        'score': score,
        'category': category,
        'factors': factors,
        'person_id': relationship.person.id,
        'person_name': relationship.person.name,
        'company_name': relationship.person.company.name if relationship.person.company else 'N/A',
        'current_status': relationship.current_status,
    }
