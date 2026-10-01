from rest_framework import serializers
from apps.intelligence.models import Recommendation, RecommendationEvent, Notification

class RecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recommendation
        fields = [
            'id',
            'type',
            'priority',
            'title',
            'description',
            'reason',
            'entity_type',
            'entity_id',
            'deduplication_key',
            'metadata',
            'status',
            'expires_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class RecommendationEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecommendationEvent
        fields = ['id', 'recommendation', 'event_type', 'metadata', 'created_at']
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'is_read',
            'entity_type',
            'entity_id',
            'recommendation',
            'created_at',
        ]
        read_only_fields = fields
