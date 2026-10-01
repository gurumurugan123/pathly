from rest_framework import serializers
from apps.relationships.models import Relationship, StatusEvent, Note, FollowUp
from apps.relationships.constants import VALID_STATUS_KEYS

class StatusEventSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = StatusEvent
        fields = ['id', 'from_status', 'to_status', 'note', 'timestamp', 'created_by_username']
        read_only_fields = ['id', 'timestamp', 'created_by_username']


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ['id', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']


class RelationshipSerializer(serializers.ModelSerializer):
    status_events = StatusEventSerializer(many=True, read_only=True)
    notes = NoteSerializer(many=True, read_only=True)
    person_name = serializers.CharField(source='person.name', read_only=True)
    company_name = serializers.CharField(source='person.company.name', read_only=True, default='')

    class Meta:
        model = Relationship
        fields = [
            'id', 'person', 'person_name', 'company_name',
            'current_status', 'connection_type',
            'status_events', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UpdateStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_status(self, value):
        if value not in VALID_STATUS_KEYS:
            raise serializers.ValidationError(f"Invalid status: {value}")
        return value
