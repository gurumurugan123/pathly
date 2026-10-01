from django.urls import path
from apps.ai.views import AIQueryView, AIExecuteMutationView

urlpatterns = [
    path('query/', AIQueryView.as_view(), name='ai-query'),
    path('execute-mutation/', AIExecuteMutationView.as_view(), name='ai-execute-mutation'),
]
