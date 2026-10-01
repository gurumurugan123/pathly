from django.urls import path
from apps.intelligence.views import (
    RecommendationListView,
    RecommendationDetailView,
    RecommendationActionView,
    DailyCareerBriefView,
    ReferralOpportunitiesView,
    NetworkGapsView,
    ApplicationRisksView,
    CompanyInsightsView,
    GraphOverlayView,
    NotificationListView,
    NotificationReadView
)

urlpatterns = [
    path('recommendations/', RecommendationListView.as_view(), name='recommendation-list'),
    path('recommendations/<int:pk>/', RecommendationDetailView.as_view(), name='recommendation-detail'),
    path('recommendations/<int:pk>/<str:action_type>/', RecommendationActionView.as_view(), name='recommendation-action'),
    
    path('brief/', DailyCareerBriefView.as_view(), name='daily-brief'),
    path('referral-opportunities/', ReferralOpportunitiesView.as_view(), name='referral-opportunities'),
    path('network-gaps/', NetworkGapsView.as_view(), name='network-gaps'),
    path('application-risks/', ApplicationRisksView.as_view(), name='application-risks'),
    path('company-insights/', CompanyInsightsView.as_view(), name='company-insights'),
    path('graph-overlay/', GraphOverlayView.as_view(), name='graph-overlay'),

    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/read-all/', NotificationReadView.as_view(), name='notification-read-all'),
    path('notifications/<int:pk>/read/', NotificationReadView.as_view(), name='notification-read'),
]
