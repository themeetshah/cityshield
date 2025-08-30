from django.urls import path
from . import views

urlpatterns = [
    # Authentication URLs
    path('register/', views.register_view, name='register'),
    path('register-police/', views.register_police, name='register'),
    path('login/', views.login_view, name='login'),
    path('google-signup/', views.google_signup_view, name='google_signup'),
    path('google-login/', views.google_login_view, name='google_login'),
    
    # General profile (current user)
    path('profile/', views.profile_view, name='profile'),
    
    # Profile Management URLs - name first, then id
    path('profile/<int:user_id>/', views.user_profile_detail, name='user-profile-detail'),
    path('stats/<int:user_id>/', views.user_stats, name='user-stats'),
    path('activities/<int:user_id>/', views.user_activities, name='user-activities'),
    path('notifications/<int:user_id>/', views.user_notifications, name='user-notifications'),
    path('notifications/<int:user_id>/<int:notification_id>/mark-read/', views.mark_notification_read, name='mark-notification-read'),
    path('emergency-contacts/<int:user_id>/', views.emergency_contacts, name='emergency-contacts'),
    path('emergency-contacts/<int:user_id>/<int:contact_id>/', views.emergency_contact_delete, name='emergency-contact-delete'),
    path('change-password/<int:user_id>/', views.change_password, name='change-password'),
    
    # Get user by ID (keep this at the end to avoid conflicts)
    path('<int:id>/', views.get_user_by_id, name='get-user-by-id'),

    # Volunteer application management
    path('volunteer/apply/', views.apply_for_volunteer, name='apply_for_volunteer'),
    path('volunteer/application-status/', views.volunteer_application_status, name='volunteer_application_status'),
    path('volunteer/applications/', views.list_volunteer_applications, name='list_volunteer_applications'),
    path('volunteer/applications/<int:application_id>/review/', views.approve_volunteer_application, name='approve_volunteer_application'),
]
