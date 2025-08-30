from django.contrib import admin
from .models import SOSAlert, Volunteer, VolunteerAlert, SOSLocationUpdate, SOSVideoFeed, PoliceVideoView

@admin.register(SOSAlert)
class SOSAlertAdmin(admin.ModelAdmin):
    list_display = ['id', 'emergency_type', 'user', 'is_active', 'created_at', 'resolved_at']
    list_filter = ['is_active', 'emergency_type', 'is_streaming', 'created_at']
    search_fields = ['user__email', 'emergency_type', 'description']
    readonly_fields = ['created_at']
    ordering = ['-created_at']

@admin.register(Volunteer)
class VolunteerAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone_number', 'is_verified', 'is_available']
    list_filter = ['is_verified', 'is_available']
    search_fields = ['user__email', 'phone_number']
    ordering = ['user__email']

@admin.register(VolunteerAlert)
class VolunteerAlertAdmin(admin.ModelAdmin):
    list_display = ['volunteer', 'sos_alert', 'responded', 'alerted_at', 'response_time']
    list_filter = ['responded', 'status', 'alerted_at']
    search_fields = ['volunteer__user__email', 'sos_alert__id']
    ordering = ['-alerted_at']

admin.site.register(SOSLocationUpdate)
admin.site.register(SOSVideoFeed)
admin.site.register(PoliceVideoView)
