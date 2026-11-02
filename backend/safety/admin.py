from django.contrib import admin

from .models import Hospital, PoliceStation, SafetyZone


@admin.register(PoliceStation)
class PoliceStationAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'state', 'source')
    list_filter = ('source', 'state')
    search_fields = ('name', 'city', 'address')


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'state', 'hospital_type', 'source')
    list_filter = ('source', 'state')
    search_fields = ('name', 'city', 'address')


admin.site.register(SafetyZone)
