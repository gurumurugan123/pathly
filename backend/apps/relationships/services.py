from django.db import transaction
from apps.relationships.models import Relationship, StatusEvent
from apps.relationships.constants import VALID_STATUS_KEYS

def change_relationship_status(relationship: Relationship, new_status: str, note: str = '', user=None) -> tuple[Relationship, StatusEvent]:
    if new_status not in VALID_STATUS_KEYS:
        raise ValueError(f"Invalid status key: {new_status}")

    with transaction.atomic():
        old_status = relationship.current_status
        if old_status == new_status:
            # Re-affirming status or recording note
            event = StatusEvent.objects.create(
                relationship=relationship,
                from_status=old_status,
                to_status=new_status,
                note=note or "Status reaffirmed",
                created_by=user or relationship.user
            )
            return relationship, event

        relationship.current_status = new_status
        relationship.save(update_fields=['current_status', 'updated_at'])

        event = StatusEvent.objects.create(
            relationship=relationship,
            from_status=old_status,
            to_status=new_status,
            note=note,
            created_by=user or relationship.user
        )

        return relationship, event
