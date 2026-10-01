from rest_framework import serializers
from apps.companies.models import Company

class CompanySerializer(serializers.ModelSerializer):
    people_count = serializers.SerializerMethodField()
    applications_count = serializers.SerializerMethodField()
    active_applications_count = serializers.SerializerMethodField()
    referral_contacts_count = serializers.SerializerMethodField()
    last_activity = serializers.SerializerMethodField()
    has_referral = serializers.SerializerMethodField()
    has_contacts = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            'id', 'name', 'normalized_name', 'website',
            'industry', 'location', 'notes', 'logo_url',
            'people_count', 'applications_count', 'active_applications_count',
            'referral_contacts_count', 'last_activity', 'has_referral',
            'has_contacts', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'normalized_name', 'people_count', 'applications_count',
            'active_applications_count', 'referral_contacts_count',
            'last_activity', 'has_referral', 'has_contacts',
            'created_at', 'updated_at'
        ]

    def get_people_count(self, obj):
        return obj.people.count()

    def get_applications_count(self, obj):
        return obj.applications.filter(user=obj.user).count()

    def get_active_applications_count(self, obj):
        return obj.applications.filter(user=obj.user).exclude(current_status__in=['REJECTED', 'CLOSED', 'WITHDRAWN']).count()

    def get_referral_contacts_count(self, obj):
        return obj.people.filter(
            relationships__user=obj.user,
            relationships__current_status__in=['WILL_REFER', 'WILLING_TO_REFER', 'REFERRAL_GIVEN']
        ).distinct().count()

    def get_last_activity(self, obj):
        latest_app = obj.applications.filter(user=obj.user).order_by('-updated_at').first()
        if latest_app and latest_app.updated_at:
            return latest_app.updated_at.isoformat()
        return obj.updated_at.isoformat() if obj.updated_at else None

    def get_has_referral(self, obj):
        return self.get_referral_contacts_count(obj) > 0

    def get_has_contacts(self, obj):
        return self.get_people_count(obj) > 0

    def create(self, validated_data):
        user = validated_data.pop('user', None) or self.context['request'].user
        name = validated_data['name']
        normalized = name.strip().lower()
        company, created = Company.objects.get_or_create(
            user=user,
            normalized_name=normalized,
            defaults={
                'name': name,
                'website': validated_data.get('website', ''),
                'industry': validated_data.get('industry', ''),
                'location': validated_data.get('location', ''),
                'notes': validated_data.get('notes', ''),
                'logo_url': validated_data.get('logo_url', ''),
            }
        )
        if not created:
            for field in ['website', 'industry', 'location', 'notes', 'logo_url']:
                if field in validated_data and validated_data[field]:
                    setattr(company, field, validated_data[field])
            company.save()
        return company
