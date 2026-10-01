from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.people.models import Person
from apps.people.serializers import PersonSerializer
from apps.relationships.models import Relationship

class PersonViewSet(viewsets.ModelViewSet):
    serializer_class = PersonSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'designation', 'email', 'location', 'linkedin_url', 'company__name']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        qs = Person.objects.filter(user=self.request.user).select_related('company')
        
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'ALL':
            qs = qs.filter(relationships__user=self.request.user, relationships__current_status=status_param).distinct()

        company_id = self.request.query_params.get('company_id')
        if company_id and company_id != 'ALL':
            qs = qs.filter(company_id=company_id)

        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user = request.user
        total_people = Person.objects.filter(user=user).count()
        replied = Relationship.objects.filter(user=user, current_status='REPLIED').count()
        will_refer = Relationship.objects.filter(user=user, current_status='WILLING_TO_REFER').count()
        referral_given = Relationship.objects.filter(user=user, current_status='REFERRAL_GIVEN').count()

        return Response({
            "total_people": total_people,
            "replied": replied,
            "will_refer": will_refer,
            "referral_given": referral_given,
        })

    def destroy(self, request, *args, **kwargs):
        person = self.get_object()
        force = request.query_params.get('force') == 'true'
        apps_count = person.application_contacts.count()

        if apps_count > 0 and not force:
            return Response({
                "error": f"Person '{person.name}' is attached to {apps_count} application(s).",
                "requires_confirmation": True,
                "applications_count": apps_count,
            }, status=status.HTTP_400_BAD_REQUEST)

        return super().destroy(request, *args, **kwargs)
