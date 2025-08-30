from django.urls import path
from . import views

urlpatterns = [
    # SOS Alert Management
    path('emergency/', views.create_emergency_alert, name='create_emergency'),
    path('active/', views.get_active_sos, name='active_sos'),
    path('all/', views.get_all_sos, name='all_sos'),
    path('by-role/', views.get_sos_by_role, name='sos_by_role'),  # MISSING - CRITICAL
    path('respond/', views.respond_to_sos, name='respond_to_sos'),  # MISSING - CRITICAL
    path('resolve/<int:sos_id>/', views.resolve_sos, name='resolve_sos'),
    
    # Location Services
    path('<int:sos_id>/location-updates/', views.get_location_updates, name='location_updates'),
    path('location-update/', views.send_location_update, name='send_location_update'),
    path('nearest-safe-location/', views.find_nearest_safe_location, name='nearest_safe_location'),
    
    # Volunteer Management
    path('register-volunteer/', views.register_volunteer_view, name='register_volunteer'),
    path('volunteer-availability/', views.volunteer_availability_view, name='volunteer_availability'),
    path('volunteer/profile/', views.get_volunteer_profile, name='volunteer_profile'),
    path('volunteer/status/', views.get_volunteer_status, name='volunteer_status'),
    path('sos-responses/', views.all_sos_responses, name='all_sos_responses'),
    
    # Emergency Response
    path('alert-volunteers/', views.alert_volunteers_view, name='alert_volunteers'),
    path('nearby-volunteers/', views.get_nearby_volunteers, name='nearby_volunteers'),
    # Add this to your sos/urls.py
    path('emergency/<int:sos_id>/', views.get_sos_by_id, name='get_sos_by_id'),
    
    # Video/Media
    # path('camera-feed/', views.upload_camera_feed, name='camera_feed'),
    # path('upload-video-chunk/', upload_emergency_video_chunk, name='upload_emergency_video_chunk')
    # path('<int:sos_id>/video-feed/', views.get_video_feed, name='video_feed'),
    path('camera-feed/', views.upload_emergency_video_chunk, name='camera_feed'),
    path('emergency/<str:emergency_id>/video-feeds/', views.get_emergency_video_feeds, name='get_emergency_video_feeds'),
    path('<int:sos_id>/start-video/', views.start_video_feed, name='start_video'),

    # NEW: Police video feed endpoints
    path('police/video-feeds/', views.get_police_video_feeds, name='police_video_feeds'),
    path('police/video/<int:video_feed_id>/viewed/', views.mark_video_viewed, name='mark_video_viewed'),
]
