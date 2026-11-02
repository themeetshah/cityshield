from django.contrib import admin

from .models import OfficialAlert, PatrolTeam, ReportStatusChange, SOSResponse


@admin.register(PatrolTeam)
class PatrolTeamAdmin(admin.ModelAdmin):
    list_display = ('team_id', 'station', 'team_leader', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('team_id', 'vehicle_number')
    filter_horizontal = ('members',)


@admin.register(OfficialAlert)
class OfficialAlertAdmin(admin.ModelAdmin):
    list_display = ('title', 'department', 'alert_type', 'is_active', 'created_at')
    list_filter = ('department', 'alert_type', 'is_active')


@admin.register(SOSResponse)
class SOSResponseAdmin(admin.ModelAdmin):
    list_display = ('sos_alert', 'assigned_team', 'status', 'response_time', 'created_at')
    list_filter = ('status',)


@admin.register(ReportStatusChange)
class ReportStatusChangeAdmin(admin.ModelAdmin):
    list_display = ('report', 'old_status', 'new_status', 'changed_by', 'created_at')
