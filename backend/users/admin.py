from django.contrib import admin
from .models import User, EmergencyContact, VolunteerApplication

# Register your models here.
admin.site.register(User)
admin.site.register(EmergencyContact)
admin.site.register(VolunteerApplication)