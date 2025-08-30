from django.urls import path
from . import views

urlpatterns = [
    # Report Management
    path('', views.create_report, name='create_report'),
    path('list/', views.list_reports, name='list_reports'),
    path('<int:report_id>/', views.get_report, name='get_report'),
    
    # Utility
    path('reverse-geocode/', views.reverse_geocode, name='reverse_geocode'),
    path('safety-map-reports/', views.safety_map_reports, name='safety_map_reports'),
    path('nearby-reports/', views.nearby_reports, name='nearby_reports'),
]