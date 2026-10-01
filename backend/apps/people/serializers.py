from rest_framework import serializers
from apps.people.models import Person
from apps.companies.models import Company
from apps.relationships.models import Relationship, StatusEvent
from apps.relationships.constants import VALID_STATUS_KEYS

class PersonSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_detail = serializers.SerializerMethodField()
    current_status = serializers.SerializerMethodField()
    relationship_id = serializers.SerializerMethodField()
    connection_type = serializers.SerializerMethodField()
    applications_count = serializers.SerializerMethodField()
    last_activity = serializers.SerializerMethodField()
    initial_status = serializers.CharField(write_only=True, required=False, default='CONTACT_FOUND')

    class Meta:
        model = Person
        fields = [
            'id', 'name', 'designation', 'email', 'phone',
            'location', 'linkedin_url', 'company', 'company_name',
            'company_detail', 'current_status', 'relationship_id',
            'connection_type', 'applications_count', 'last_activity',
            'initial_status', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'company_detail', 'current_status', 'relationship_id',
            'connection_type', 'applications_count', 'last_activity',
            'created_at', 'updated_at'
        ]

    def get_company_detail(self, obj):
        if not obj.company:
            return None
        return {
            "id": obj.company.id,
            "name": obj.company.name,
            "website": obj.company.website,
            "industry": obj.company.industry,
            "location": obj.company.location
        }

    def get_current_status(self, obj):
        user = self.context['request'].user
        rel = Relationship.objects.filter(user=user, person=obj).first()
        return rel.current_status if rel else "CONTACT_FOUND"

    def get_relationship_id(self, obj):
        user = self.context['request'].user
        rel = Relationship.objects.filter(user=user, person=obj).first()
        return rel.id if rel else None

    def get_connection_type(self, obj):
        user = self.context['request'].user
        rel = Relationship.objects.filter(user=user, person=obj).first()
        return rel.connection_type if rel else "DIRECT"

    def get_applications_count(self, obj):
        user = self.context['request'].user
        return obj.application_contacts.filter(application__user=user).count()

    def get_last_activity(self, obj):
        user = self.context['request'].user
        rel = Relationship.objects.filter(user=user, person=obj).first()
        if rel and rel.status_events.exists():
            last_event = rel.status_events.order_by('-timestamp').first()
            return last_event.timestamp.isoformat()
        return obj.updated_at.isoformat() if obj.updated_at else None

    def create(self, validated_data):
        user = validated_data.pop('user', None) or self.context['request'].user
        company_name = validated_data.pop('company_name', '').strip()
        initial_status = validated_data.pop('initial_status', 'CONTACT_FOUND')

        if initial_status not in VALID_STATUS_KEYS:
            initial_status = 'CONTACT_FOUND'

        company = validated_data.get('company', None)
        if not company and company_name:
            normalized = company_name.lower()
            company, _ = Company.objects.get_or_create(
                user=user,
                normalized_name=normalized,
                defaults={'name': company_name}
            )
            validated_data['company'] = company

        person = Person.objects.create(user=user, **validated_data)

        # Create relationship & initial status event
        rel, _ = Relationship.objects.get_or_create(
            user=user,
            person=person,
            defaults={'current_status': initial_status}
        )
        StatusEvent.objects.create(
            relationship=rel,
            from_status='',
            to_status=initial_status,
            note='Connection created',
            created_by=user
        )

        return person
