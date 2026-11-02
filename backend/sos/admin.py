from django.contrib import admin

from .models import PoliceVideoView, SOSAlert, SOSLocationUpdate, SOSVideoFeed, Volunteer, VolunteerAlert


@admin.register(SOSAlert)
class SOSAlertAdmin(admin.ModelAdmin):
    list_display = ['id', 'emergency_type', 'department', 'user', 'is_active', 'created_at', 'resolved_at']
    list_filter = ['is_active', 'emergency_type', 'department', 'is_streaming', 'created_at']
    search_fields = ['user__email', 'emergency_type', 'description']
    readonly_fields = ['created_at', 'token_hash']
    ordering = ['-created_at']


@admin.register(Volunteer)
class VolunteerAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone_number', 'is_verified', 'is_available']
    list_filter = ['is_verified', 'is_available']
    search_fields = ['user__email', 'phone_number']
    ordering = ['user__email']


@admin.register(VolunteerAlert)
class VolunteerAlertAdmin(admin.ModelAdmin):
    list_display = ['volunteer', 'sos_alert', 'status', 'responded', 'alerted_at', 'response_time']
    list_filter = ['responded', 'status', 'alerted_at']
    search_fields = ['volunteer__user__email', 'sos_alert__id']
    ordering = ['-alerted_at']


@admin.register(SOSVideoFeed)
class SOSVideoFeedAdmin(admin.ModelAdmin):
    list_display = ['id', 'sos_alert', 'chunk_sequence', 'content_type', 'file_size', 'timestamp']
    list_filter = ['content_type']
    # Private files have no public URL; view them through the dashboard's signed links.
    exclude = ['video_file']
    readonly_fields = ['stored_file']

    @admin.display(description='Stored file')
    def stored_file(self, obj):
        return obj.video_file.name


admin.site.register(SOSLocationUpdate)
admin.site.register(PoliceVideoView)
