from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/companies/', include('apps.companies.urls')),
    path('api/people/', include('apps.people.urls')),
    path('api/relationships/', include('apps.relationships.urls')),
    path('api/graph/', include('apps.graph.urls')),
    path('api/ai/', include('apps.ai.urls')),
    path('api/intelligence/', include('apps.intelligence.urls')),
    path('api/', include('apps.applications.urls')),
]
