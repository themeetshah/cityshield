from django.urls import path

from . import views

urlpatterns = [
    # SOS lifecycle
    path('emergency/', views.create_emergency_alert, name='create_emergency'),
    path('emergency/<int:sos_id>/', views.get_sos_by_id, name='get_sos_by_id'),
    path('emergency/<int:sos_id>/location-updates/', views.location_updates, name='sos_location_updates'),
    path('emergency/<int:sos_id>/video/', views.upload_video_chunk, name='sos_upload_video'),
    path('emergency/<int:sos_id>/video-feeds/', views.get_emergency_video_feeds, name='sos_video_feeds'),
    path('resolve/<int:sos_id>/', views.resolve_sos, name='resolve_sos'),

    # Lists
    path('by-role/', views.get_sos_by_role, name='sos_by_role'),
    path('active/', views.get_active_sos, name='active_sos'),
    path('all/', views.get_all_sos, name='all_sos'),
    path('respond/', views.respond_to_sos, name='respond_to_sos'),

    # Video viewing (responders)
    path('videos/<int:feed_id>/stream/', views.stream_video, name='sos_video_stream'),
    path('videos/<int:video_feed_id>/viewed/', views.mark_video_viewed, name='sos_video_viewed'),
    path('police/video-feeds/', views.get_police_video_feeds, name='police_video_feeds'),
    path('police/video/<int:video_feed_id>/viewed/', views.mark_video_viewed, name='mark_video_viewed'),

    # Volunteers (approval happens in the users app)
    path('volunteer/status/', views.get_volunteer_status, name='volunteer_status'),
    path('volunteer-availability/', views.volunteer_availability_view, name='volunteer_availability'),
    path('volunteer/responses/', views.my_volunteer_responses, name='volunteer_responses'),

    # Public facility lookup
    path('nearest-safe-location/', views.find_nearest_safe_location, name='nearest_safe_location'),
]
