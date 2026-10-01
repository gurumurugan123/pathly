from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Count, Q

from apps.applications.models import JobPosition, Application, ApplicationContact, ApplicationStatusEvent
from apps.relationships.models import FollowUp
from apps.people.models import Person

from apps.applications.serializers import (
    JobPositionSerializer,
    ApplicationSerializer,
    ApplicationDetailSerializer,
    ApplicationContactSerializer,
    ApplicationStatusEventSerializer,
    FollowUpSerializer,
    UpdateAppStatusSerializer
)
from apps.applications.services import change_application_status


class JobPositionViewSet(viewsets.ModelViewSet):
    serializer_class = JobPositionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobPosition.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ApplicationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['job_position__title', 'job_position__company__name', 'current_status']
    ordering_fields = ['created_at', 'applied_at', 'updated_at']

    def get_queryset(self):
        return Application.objects.filter(user=self.request.user).select_related(
            'job_position', 'job_position__company'
        ).prefetch_related('application_contacts', 'application_contacts__person', 'status_events', 'follow_ups')

    def get_serializer_class(self):
        if self.action in ['retrieve', 'update', 'partial_update']:
            return ApplicationDetailSerializer
        return ApplicationSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch', 'post'], url_path='status')
    def update_status(self, request, pk=None):
        application = self.get_object()
        serializer = UpdateAppStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        note_text = serializer.validated_data.get('note', '')

        app, event = change_application_status(
            application=application,
            new_status=new_status,
            note=note_text,
            user=request.user
        )

        return Response({
            "application": ApplicationDetailSerializer(app, context={'request': request}).data,
            "event": ApplicationStatusEventSerializer(event).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='history')
    def status_history(self, request, pk=None):
        application = self.get_object()
        events = application.status_events.all()
        return Response(ApplicationStatusEventSerializer(events, many=True).data)

    @action(detail=True, methods=['post'], url_path='contacts')
    def add_contact(self, request, pk=None):
        application = self.get_object()
        person_id = request.data.get('person_id')
        role = request.data.get('relationship_role', 'CONTACT')
        notes = request.data.get('notes', '')

        if not person_id:
            return Response({"error": "person_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            person = Person.objects.get(id=person_id, user=request.user)
        except Person.DoesNotExist:
            return Response({"error": "Person not found"}, status=status.HTTP_404_NOT_FOUND)

        contact, created = ApplicationContact.objects.get_or_create(
            application=application,
            person=person,
            defaults={'relationship_role': role, 'notes': notes}
        )
        if not created:
            contact.relationship_role = role
            if notes:
                contact.notes = notes
            contact.save()

        return Response(ApplicationContactSerializer(contact).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='contacts/(?P<contact_id>[^/.]+)')
    def remove_contact(self, request, pk=None, contact_id=None):
        application = self.get_object()
        try:
            contact = ApplicationContact.objects.get(id=contact_id, application=application)
            contact.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ApplicationContact.DoesNotExist:
            return Response({"error": "Application contact not found"}, status=status.HTTP_404_NOT_FOUND)


class FollowUpViewSet(viewsets.ModelViewSet):
    serializer_class = FollowUpSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = FollowUp.objects.filter(user=self.request.user).select_related(
            'relationship', 'relationship__person', 'application', 'application__job_position', 'application__job_position__company'
        )

        completed = self.request.query_params.get('completed')
        if completed is not None:
            qs = qs.filter(completed=completed.lower() == 'true')

        time_filter = self.request.query_params.get('filter')
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timezone.timedelta(days=1)

        if time_filter == 'today':
            qs = qs.filter(due_date__gte=today_start, due_date__lt=today_end)
        elif time_filter == 'overdue':
            qs = qs.filter(due_date__lt=today_start, completed=False)
        elif time_filter == 'upcoming':
            qs = qs.filter(due_date__gte=today_end, completed=False)

        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        completed = serializer.validated_data.get('completed')
        if completed and not serializer.instance.completed:
            serializer.save(completed_at=timezone.now())
        else:
            serializer.save()


class AnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        apps = Application.objects.filter(user=user)
        total_apps = apps.count()

        active_statuses = ['APPLIED', 'REFERRAL_REQUESTED', 'REFERRAL_GIVEN', 'SCREENING', 'INTERVIEW', 'TECHNICAL_INTERVIEW', 'HR_INTERVIEW']
        active_apps = apps.filter(current_status__in=active_statuses).count()

        interviews = apps.filter(current_status__in=['INTERVIEW', 'TECHNICAL_INTERVIEW', 'HR_INTERVIEW']).count()
        offers = apps.filter(current_status='OFFER').count()
        hired = apps.filter(current_status='HIRED').count()
        referral_apps = apps.filter(current_status__in=['REFERRAL_REQUESTED', 'REFERRAL_GIVEN']).count()

        # Status breakdown
        status_counts = dict(apps.values_list('current_status').annotate(count=Count('id')))

        # Top companies
        top_companies = list(
            apps.values('job_position__company__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        return Response({
            "metrics": {
                "totalApplications": total_apps,
                "activeApplications": active_apps,
                "interviews": interviews,
                "offers": offers,
                "hired": hired,
                "referralApplications": referral_apps,
                "referralConversionRate": round((referral_apps / (total_apps or 1)) * 100, 1)
            },
            "statusDistribution": status_counts,
            "topCompanies": top_companies
        })
