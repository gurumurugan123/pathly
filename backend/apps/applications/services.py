from django.db import transaction
from django.utils import timezone
from apps.applications.models import Application, ApplicationStatusEvent
from apps.applications.constants import VALID_APP_STATUS_KEYS

def change_application_status(application: Application, new_status: str, note: str = '', user=None) -> tuple[Application, ApplicationStatusEvent]:
    if new_status not in VALID_APP_STATUS_KEYS:
        raise ValueError(f"Invalid application status key: {new_status}")

    with transaction.atomic():
        old_status = application.current_status
        if old_status == new_status:
            event = ApplicationStatusEvent.objects.create(
                application=application,
                from_status=old_status,
                to_status=new_status,
                note=note or "Application status reaffirmed",
                created_by=user or application.user
            )
            return application, event

        application.current_status = new_status
        if new_status == 'APPLIED' and not application.applied_at:
            application.applied_at = timezone.now()

        application.save(update_fields=['current_status', 'applied_at', 'updated_at'])

        event = ApplicationStatusEvent.objects.create(
            application=application,
            from_status=old_status,
            to_status=new_status,
            note=note,
            created_by=user or application.user
        )

        return application, event
