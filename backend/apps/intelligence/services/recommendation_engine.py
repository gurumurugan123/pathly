from django.utils import timezone
from datetime import timedelta
from apps.intelligence.models import Recommendation, RecommendationEvent, Notification
from apps.intelligence.services.followup_intelligence import analyze_followup_needs
from apps.intelligence.services.referral_opportunity_detector import detect_referral_opportunities
from apps.intelligence.services.network_gap_detector import detect_network_gaps
from apps.intelligence.services.application_intelligence import analyze_application_risks

def generate_user_recommendations(user) -> list:
    """
    Main orchestration engine generating prioritized, explainable, deduplicated recommendations for a user.
    """
    now = timezone.now()

    # 1. Clean up expired recommendations
    Recommendation.objects.filter(user=user, expires_at__lt=now).delete()

    # 2. Gather candidates from intelligence detectors
    candidates = []
    candidates.extend(analyze_followup_needs(user))
    candidates.extend(detect_referral_opportunities(user))
    candidates.extend(detect_network_gaps(user))
    candidates.extend(analyze_application_risks(user))

    active_recommendations = []

    for item in candidates:
        dedup_key = item['deduplication_key']

        # Check if user recently dismissed or completed this recommendation key (Cooldown 7 days)
        recently_acted = RecommendationEvent.objects.filter(
            user=user,
            recommendation__deduplication_key=dedup_key,
            event_type__in=['DISMISSED', 'COMPLETED'],
            created_at__gte=now - timedelta(days=7)
        ).exists()

        if recently_acted:
            continue

        # Get or create recommendation
        rec, created = Recommendation.objects.get_or_create(
            user=user,
            deduplication_key=dedup_key,
            defaults={
                'type': item['type'],
                'priority': item['priority'],
                'title': item['title'],
                'description': item['description'],
                'reason': item['reason'],
                'entity_type': item['entity_type'],
                'entity_id': item['entity_id'],
                'metadata': item.get('metadata', {}),
                'status': 'NEW',
                'expires_at': now + timedelta(days=14),
            }
        )

        if not created and rec.status in ['NEW', 'VIEWED']:
            # Update fields in case title/reason evolved
            rec.priority = item['priority']
            rec.title = item['title']
            rec.description = item['description']
            rec.reason = item['reason']
            rec.metadata = item.get('metadata', {})
            rec.save()

        if rec.status in ['NEW', 'VIEWED']:
            active_recommendations.append(rec)

            # Create notification for new high-priority recommendation
            if created and rec.priority == 'HIGH':
                Notification.objects.create(
                    user=user,
                    title=rec.title,
                    message=rec.description,
                    entity_type=rec.entity_type,
                    entity_id=rec.entity_id,
                    recommendation=rec,
                )

    # Sort by priority order (HIGH > MEDIUM > LOW) and creation date
    priority_map = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
    active_recommendations.sort(key=lambda r: (priority_map.get(r.priority, 1), -r.created_at.timestamp()))

    return active_recommendations
