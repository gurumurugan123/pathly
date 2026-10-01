from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.intelligence.models import Recommendation, RecommendationEvent, Notification
from apps.intelligence.serializers import RecommendationSerializer, NotificationSerializer
from apps.intelligence.services.recommendation_engine import generate_user_recommendations
from apps.intelligence.services.career_intelligence import get_daily_career_brief, get_needs_attention
from apps.intelligence.services.referral_opportunity_detector import detect_referral_opportunities
from apps.intelligence.services.network_gap_detector import detect_network_gaps
from apps.intelligence.services.application_intelligence import analyze_application_risks
from apps.intelligence.services.company_intelligence import get_all_company_insights
from apps.intelligence.services.graph_intelligence import get_graph_intelligence_overlay

class RecommendationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recommendations = generate_user_recommendations(request.user)
        serializer = RecommendationSerializer(recommendations, many=True)
        return Response(serializer.data)


class RecommendationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            rec = Recommendation.objects.get(id=pk, user=request.user)
            return Response(RecommendationSerializer(rec).data)
        except Recommendation.DoesNotExist:
            return Response({"error": "Recommendation not found"}, status=status.HTTP_404_NOT_FOUND)


class RecommendationActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action_type):
        try:
            rec = Recommendation.objects.get(id=pk, user=request.user)
        except Recommendation.DoesNotExist:
            return Response({"error": "Recommendation not found"}, status=status.HTTP_404_NOT_FOUND)

        action_type = action_type.upper()
        if action_type == 'VIEW':
            rec.status = 'VIEWED'
            event_type = 'VIEWED'
        elif action_type == 'DISMISS':
            rec.status = 'DISMISSED'
            event_type = 'DISMISSED'
        elif action_type == 'COMPLETE':
            rec.status = 'COMPLETED'
            event_type = 'COMPLETED'
        elif action_type == 'SNOOZE':
            rec.status = 'SNOOZED'
            event_type = 'SNOOZED'
        else:
            return Response({"error": "Invalid action type"}, status=status.HTTP_400_BAD_REQUEST)

        rec.save()

        # Log recommendation event
        RecommendationEvent.objects.create(
            recommendation=rec,
            user=request.user,
            event_type=event_type,
            metadata=request.data.get('metadata', {})
        )

        return Response({
            "message": f"Recommendation status updated to {rec.status}",
            "recommendation": RecommendationSerializer(rec).data
        })


class DailyCareerBriefView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        brief = get_daily_career_brief(request.user)
        return Response(brief)


class ReferralOpportunitiesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        opps = detect_referral_opportunities(request.user)
        return Response(opps)


class NetworkGapsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        gaps = detect_network_gaps(request.user)
        return Response(gaps)


class ApplicationRisksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        risks = analyze_application_risks(request.user)
        return Response(risks)


class CompanyInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        insights = get_all_company_insights(request.user)
        return Response(insights)


class GraphOverlayView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mode = request.query_params.get('mode', 'NORMAL')
        overlay = get_graph_intelligence_overlay(request.user, mode)
        return Response(overlay)


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user)[:50]
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        serializer = NotificationSerializer(notifications, many=True)
        return Response({
            "unread_count": unread_count,
            "notifications": serializer.data
        })


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        if pk:
            try:
                notif = Notification.objects.get(id=pk, user=request.user)
                notif.is_read = True
                notif.save()
                return Response({"message": "Notification marked as read"})
            except Notification.DoesNotExist:
                return Response({"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)

        # Mark all as read
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": "All notifications marked as read"})
