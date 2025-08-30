from django.contrib import admin
from .models import PoliceStation, Hospital, SafetyZone

# Register your models here.
admin.site.register(PoliceStation)
admin.site.register(Hospital)
admin.site.register(SafetyZone)