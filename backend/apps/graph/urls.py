from django.urls import path
from apps.graph.views import GraphView

urlpatterns = [
    path('', GraphView.as_view(), name='user_graph'),
]
