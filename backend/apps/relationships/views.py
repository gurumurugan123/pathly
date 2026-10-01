from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.relationships.models import Relationship, StatusEvent, Note
from apps.relationships.serializers import (
    RelationshipSerializer,
    StatusEventSerializer,
    NoteSerializer,
    UpdateStatusSerializer
)
from apps.relationships.services import change_relationship_status

class RelationshipViewSet(viewsets.ModelViewSet):
    serializer_class = RelationshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Relationship.objects.filter(user=self.request.user).select_related('person', 'person__company').prefetch_related('status_events', 'notes')

    @action(detail=True, methods=['patch', 'post'], url_path='status')
    def update_status(self, request, pk=None):
        relationship = self.get_object()
        serializer = UpdateStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        note_text = serializer.validated_data.get('note', '')

        rel, event = change_relationship_status(
            relationship=relationship,
            new_status=new_status,
            note=note_text,
            user=request.user
        )

        return Response({
            "relationship": RelationshipSerializer(rel, context={'request': request}).data,
            "event": StatusEventSerializer(event).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='history')
    def status_history(self, request, pk=None):
        relationship = self.get_object()
        events = relationship.status_events.all()
        serializer = StatusEventSerializer(events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='notes')
    def add_note(self, request, pk=None):
        relationship = self.get_object()
        content = request.data.get('content', '').strip()
        if not content:
            return Response({"error": "Note content is required"}, status=status.HTTP_400_BAD_REQUEST)

        note = Note.objects.create(relationship=relationship, content=content)
        return Response(NoteSerializer(note).data, status=status.HTTP_201_CREATED)
