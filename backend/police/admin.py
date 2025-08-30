from django.contrib import admin
from .models import PatrolTeam, OfficialAlert, SOSResponse

# Register your models here.
admin.site.register(PatrolTeam)
admin.site.register(OfficialAlert)
admin.site.register(SOSResponse)