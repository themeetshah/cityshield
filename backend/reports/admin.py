from django.contrib import admin

from .models import Media, Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'report_type', 'department', 'status', 'is_anonymous', 'created_at')
    list_filter = ('report_type', 'department', 'status', 'is_anonymous')
    search_fields = ('title', 'description')
    raw_id_fields = ('reported_by',)


admin.site.register(Media)
