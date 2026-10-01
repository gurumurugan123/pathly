from rest_framework import serializers
from apps.applications.models import JobPosition, Application, ApplicationContact, ApplicationStatusEvent
from apps.relationships.models import FollowUp
from apps.companies.models import Company
from apps.people.models import Person
from apps.applications.constants import VALID_APP_STATUS_KEYS, APPLICATION_CONTACT_ROLES

class JobPositionSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = JobPosition
        fields = [
            'id', 'company', 'company_name', 'title',
            'description', 'url', 'location',
            'employment_type', 'source', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ApplicationContactSerializer(serializers.ModelSerializer):
    person_name = serializers.CharField(source='person.name', read_only=True)
    person_designation = serializers.CharField(source='person.designation', read_only=True)
    person_email = serializers.CharField(source='person.email', read_only=True)
    person_linkedin = serializers.CharField(source='person.linkedin_url', read_only=True)

    class Meta:
        model = ApplicationContact
        fields = [
            'id', 'application', 'person', 'person_name',
            'person_designation', 'person_email', 'person_linkedin',
            'relationship_role', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ApplicationStatusEventSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = ApplicationStatusEvent
        fields = ['id', 'from_status', 'to_status', 'note', 'timestamp', 'created_by_username']
        read_only_fields = ['id', 'timestamp', 'created_by_username']


class ApplicationSerializer(serializers.ModelSerializer):
    job_position = serializers.PrimaryKeyRelatedField(
        queryset=JobPosition.objects.all(), required=False, allow_null=True
    )
    job_title = serializers.CharField(source='job_position.title', read_only=True)
    job_url = serializers.CharField(source='job_position.url', read_only=True)
    job_location = serializers.CharField(source='job_position.location', read_only=True)
    employment_type = serializers.CharField(source='job_position.employment_type', read_only=True)
    source = serializers.CharField(source='job_position.source', read_only=True)

    company_id = serializers.IntegerField(source='job_position.company.id', read_only=True)
    company_name = serializers.CharField(source='job_position.company.name', read_only=True)

    contacts = ApplicationContactSerializer(source='application_contacts', many=True, read_only=True)
    primary_contact_name = serializers.SerializerMethodField()
    primary_contact_id = serializers.SerializerMethodField()

    company_input = serializers.CharField(write_only=True, required=False, allow_blank=True)
    job_title_input = serializers.CharField(write_only=True, required=False, allow_blank=True)
    job_url_input = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Application
        fields = [
            'id', 'job_position', 'job_title', 'job_url', 'job_location',
            'employment_type', 'source', 'company_id', 'company_name',
            'current_status', 'applied_at', 'contacts', 'primary_contact_name',
            'primary_contact_id', 'company_input', 'job_title_input', 'job_url_input',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_primary_contact_name(self, obj):
        first_contact = obj.application_contacts.first()
        return first_contact.person.name if first_contact else None

    def get_primary_contact_id(self, obj):
        first_contact = obj.application_contacts.first()
        return first_contact.person.id if first_contact else None

    def create(self, validated_data):
        from django.utils import timezone
        user = self.context['request'].user
        company_input = validated_data.pop('company_input', '').strip()
        job_title_input = validated_data.pop('job_title_input', '').strip()
        job_url_input = validated_data.pop('job_url_input', '').strip()

        job_position = validated_data.get('job_position', None)
        if not job_position and company_input and job_title_input:
            normalized = company_input.lower()
            company, _ = Company.objects.get_or_create(
                user=user,
                normalized_name=normalized,
                defaults={'name': company_input}
            )
            job_position = JobPosition.objects.create(
                user=user,
                company=company,
                title=job_title_input,
                url=job_url_input
            )
            validated_data['job_position'] = job_position

        if not validated_data.get('job_position'):
            raise serializers.ValidationError({"error": "Either job_position or (company_input and job_title_input) is required."})

        if not validated_data.get('applied_at') and validated_data.get('current_status', 'SAVED') != 'SAVED':
            validated_data['applied_at'] = timezone.now()

        if 'user' not in validated_data:
            validated_data['user'] = user

        application = Application.objects.create(**validated_data)
        ApplicationStatusEvent.objects.create(
            application=application,
            from_status='',
            to_status=application.current_status,
            note='Application created',
            created_by=user
        )
        return application


class ApplicationDetailSerializer(ApplicationSerializer):
    status_events = ApplicationStatusEventSerializer(many=True, read_only=True)
    follow_ups = serializers.SerializerMethodField()

    class Meta(ApplicationSerializer.Meta):
        fields = ApplicationSerializer.Meta.fields + ['status_events', 'follow_ups']

    def get_follow_ups(self, obj):
        from apps.applications.serializers import FollowUpSerializer
        return FollowUpSerializer(obj.follow_ups.all(), many=True).data


class FollowUpSerializer(serializers.ModelSerializer):
    person_name = serializers.CharField(source='relationship.person.name', read_only=True, default=None)
    company_name = serializers.SerializerMethodField()
    job_title = serializers.CharField(source='application.job_position.title', read_only=True, default=None)

    class Meta:
        model = FollowUp
        fields = [
            'id', 'user', 'relationship', 'application',
            'person_name', 'company_name', 'job_title',
            'title', 'description', 'note', 'due_date',
            'completed', 'completed_at', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']

    def get_company_name(self, obj):
        if obj.application:
            return obj.application.job_position.company.name
        if obj.relationship:
            return obj.relationship.person.company.name if obj.relationship.person.company else None
        return None


class UpdateAppStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_status(self, value):
        if value not in VALID_APP_STATUS_KEYS:
            raise serializers.ValidationError(f"Invalid application status: {value}")
        return value
