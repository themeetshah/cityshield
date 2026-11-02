from django.urls import path

from . import views

urlpatterns = [
    # Authentication (public self-registration always creates a citizen)
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('google/', views.google_auth_view, name='google_auth'),
    path('google-login/', views.google_auth_view, name='google_login'),
    path('google-signup/', views.google_auth_view, name='google_signup'),

    # Current user
    path('me/', views.me_view, name='me'),
    path('profile/', views.me_view, name='profile'),
    path('notifications/', views.my_notifications, name='my-notifications'),
    path('notifications/read-all/', views.mark_all_notifications_read, name='notifications-read-all'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_read, name='notification-read'),

    # Profile management (must be the caller's own id)
    path('profile/<int:user_id>/', views.user_profile_detail, name='user-profile-detail'),
    path('stats/<int:user_id>/', views.user_stats, name='user-stats'),
    path('activities/<int:user_id>/', views.user_activities, name='user-activities'),
    path('notifications/<int:user_id>/', views.user_notifications, name='user-notifications'),
    path('notifications/<int:user_id>/<int:notification_id>/mark-read/', views.mark_notification_read,
         name='mark-notification-read'),
    path('emergency-contacts/<int:user_id>/', views.emergency_contacts, name='emergency-contacts'),
    path('emergency-contacts/<int:user_id>/<int:contact_id>/', views.emergency_contact_delete,
         name='emergency-contact-delete'),
    path('change-password/<int:user_id>/', views.change_password, name='change-password'),

    # Staff / role management (superadmin + department admins)
    path('roles/', views.roles_meta, name='roles-meta'),
    path('staff/', views.staff_list_create, name='staff-list-create'),
    path('staff/<int:user_id>/', views.staff_detail, name='staff-detail'),
    path('police-stations/', views.station_lookup, name='station-lookup'),

    # Volunteer applications
    path('volunteer/apply/', views.apply_for_volunteer, name='apply_for_volunteer'),
    path('volunteer/application-status/', views.volunteer_application_status, name='volunteer_application_status'),
    path('volunteer/applications/', views.list_volunteer_applications, name='list_volunteer_applications'),
    path('volunteer/applications/<int:application_id>/review/', views.approve_volunteer_application,
         name='approve_volunteer_application'),

    path('<int:id>/', views.get_user_by_id, name='get-user-by-id'),
]
