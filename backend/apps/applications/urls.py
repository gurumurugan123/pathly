from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.applications.views import (
    JobPositionViewSet,
    ApplicationViewSet,
    FollowUpViewSet,
    AnalyticsView
)

router = DefaultRouter()
router.register(r'job-positions', JobPositionViewSet, basename='jobposition')
router.register(r'applications', ApplicationViewSet, basename='application')
router.register(r'follow-ups', FollowUpViewSet, basename='followup')

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
]
