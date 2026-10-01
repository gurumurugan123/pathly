from rest_framework.routers import DefaultRouter
from apps.relationships.views import RelationshipViewSet

router = DefaultRouter()
router.register(r'', RelationshipViewSet, basename='relationship')

urlpatterns = router.urls
