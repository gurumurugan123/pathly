from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.companies.models import Company
from apps.companies.serializers import CompanySerializer
from apps.people.models import Person
from apps.applications.models import Application

class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'website', 'industry', 'location', 'notes']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        qs = Company.objects.filter(user=self.request.user)
        filter_param = self.request.query_params.get('filter')
        if filter_param == 'active_applications':
            qs = qs.filter(job_positions__applications__user=self.request.user).exclude(job_positions__applications__current_status__in=['REJECTED', 'CLOSED', 'WITHDRAWN']).distinct()
        elif filter_param == 'has_referral':
            qs = qs.filter(people__relationships__user=self.request.user, people__relationships__current_status__in=['WILL_REFER', 'WILLING_TO_REFER', 'REFERRAL_GIVEN']).distinct()
        elif filter_param == 'no_referral':
            qs = qs.exclude(people__relationships__user=self.request.user, people__relationships__current_status__in=['WILL_REFER', 'WILLING_TO_REFER', 'REFERRAL_GIVEN']).distinct()
        elif filter_param == 'has_contacts':
            qs = qs.filter(people__user=self.request.user).distinct()
        elif filter_param == 'no_contacts':
            qs = qs.exclude(people__user=self.request.user).distinct()
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user = request.user
        total_companies = Company.objects.filter(user=user).count()
        active_apps = Application.objects.filter(user=user).exclude(current_status__in=['REJECTED', 'CLOSED', 'WITHDRAWN']).count()
        people_connected = Person.objects.filter(user=user).count()
        
        # Referral opportunities: active apps where company has 0 willing-to-refer contacts
        companies_with_apps = Company.objects.filter(
            user=user,
            job_positions__applications__user=user
        ).exclude(
            job_positions__applications__current_status__in=['REJECTED', 'CLOSED', 'WITHDRAWN']
        ).distinct()
        referral_opps = 0
        for comp in companies_with_apps:
            has_ref = comp.people.filter(
                relationships__user=user,
                relationships__current_status__in=['WILL_REFER', 'WILLING_TO_REFER', 'REFERRAL_GIVEN']
            ).exists()
            if not has_ref:
                referral_opps += 1

        return Response({
            "total_companies": total_companies,
            "active_applications": active_apps,
            "people_connected": people_connected,
            "referral_opportunities": referral_opps,
        })

    def destroy(self, request, *args, **kwargs):
        company = self.get_object()
        force = request.query_params.get('force') == 'true'
        people_count = company.people.count()
        apps_count = company.applications.filter(user=request.user).count()

        if (people_count > 0 or apps_count > 0) and not force:
            return Response({
                "error": f"Company '{company.name}' has {people_count} person(s) and {apps_count} application(s) connected.",
                "requires_confirmation": True,
                "people_count": people_count,
                "applications_count": apps_count,
            }, status=status.HTTP_400_BAD_REQUEST)

        return super().destroy(request, *args, **kwargs)

