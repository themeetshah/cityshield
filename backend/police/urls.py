from django.urls import path

from . import views

urlpatterns = [
    # Department-aware (any department staff/admin + superadmin)
    path('dashboard-stats/', views.police_dashboard_stats, name='police_dashboard_stats'),
    path('reports/', views.police_reports, name='police_reports'),
    path('reports/<int:report_id>/status/', views.update_report_status, name='update_report_status'),
    path('sos-alerts/', views.police_sos_alerts, name='police_sos_alerts'),
    path('all-reports/', views.all_reports_combined, name='all_reports_combined'),

    # Official alerts (GET: any signed-in user)
    path('official-alerts/', views.official_alerts, name='official_alerts'),
    path('official-alerts/<int:alert_id>/', views.official_alert_detail, name='official_alert_detail'),

    # Police department only
    path('sos-alerts/<int:sos_id>/assign-team/', views.assign_team_to_sos, name='assign_team_to_sos'),
    path('sos-responses/<int:response_id>/status/', views.update_sos_response_status,
         name='update_sos_response_status'),
    path('volunteers/', views.police_volunteers, name='police_volunteers'),
    path('patrol-teams/', views.patrol_teams_list_create, name='patrol_teams_list_create'),
    path('patrol-teams/<int:team_id>/', views.patrol_team_detail, name='patrol_team_detail'),
    path('patrol-teams/<int:team_id>/assign-member/', views.assign_team_member, name='assign_team_member'),
    path('patrol-teams/<int:team_id>/remove-member/', views.remove_team_member, name='remove_team_member'),
    path('patrol-teams/<int:team_id>/toggle-status/', views.toggle_team_status, name='toggle_team_status'),
    path('patrol-teams/<int:team_id>/update-location/', views.update_team_location, name='update_team_location'),
    path('police-officers/', views.available_police_officers, name='available_police_officers'),
]
