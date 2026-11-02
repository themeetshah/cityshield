from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import EmergencyContact, Notification, User, VolunteerApplication


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    """Django admin is reachable only by superadmins (is_staff is tied to role)."""
    ordering = ['email']
    list_display = ['email', 'name', 'role', 'police_station', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active']
    search_fields = ['email', 'name', 'phone']
    readonly_fields = ['last_login', 'date_joined', 'is_staff', 'is_superuser', 'created_by']
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Profile', {'fields': ('name', 'phone', 'location', 'date_of_birth', 'gender', 'blood_group')}),
        ('Access', {'fields': ('role', 'police_station', 'is_active', 'is_staff', 'is_superuser', 'created_by')}),
        ('Dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',),
                'fields': ('email', 'username', 'name', 'role', 'police_station', 'password1', 'password2')}),
    )


@admin.register(VolunteerApplication)
class VolunteerApplicationAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'applied_at', 'reviewed_by']
    list_filter = ['status']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'is_read', 'created_at']
    list_filter = ['is_read']


admin.site.register(EmergencyContact)
