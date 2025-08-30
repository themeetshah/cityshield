# police/models.py
from django.db import models
from django.contrib.auth import get_user_model
from reports.models import Report
from sos.models import SOSAlert
from safety.models import PoliceStation

User = get_user_model()

class PatrolTeam(models.Model):
    team_id = models.CharField(max_length=20, unique=True)  # e.g., "PT-001", "ALPHA-7"
    station = models.ForeignKey(PoliceStation, on_delete=models.CASCADE, related_name='patrol_teams')
    team_leader = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'police'})
    # NEW: Add members field for team management
    members = models.ManyToManyField(
        User, 
        related_name='patrol_teams_member', 
        limit_choices_to={'role': 'police'},
        blank=True
    )
    members_count = models.IntegerField(default=2)
    vehicle_number = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    current_latitude = models.FloatField(null=True, blank=True)
    current_longitude = models.FloatField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.team_id} - {self.station.name}"
    
    def get_member_count(self):
        return self.members.count() + 1  # +1 for team leader

class OfficialAlert(models.Model):
    ALERT_TYPES = [
        ('safety', 'Safety Advisory'),
        ('traffic', 'Traffic Update'),
        ('emergency', 'Emergency Notice'),
        ('community', 'Community Notice')
    ]
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES, default='community')
    issued_by_station = models.ForeignKey(PoliceStation, on_delete=models.CASCADE)
    issued_by_officer = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'police'})
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.title} - {self.issued_by_station.name}"

class SOSResponse(models.Model):
    RESPONSE_STATUS = [
        ('assigned', 'Team Assigned'),
        ('dispatched', 'Team Dispatched'),
        ('arrived', 'Arrived on Scene'),
        ('resolved', 'Resolved')
    ]
    
    sos_alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='police_responses')
    assigned_team = models.ForeignKey(PatrolTeam, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=RESPONSE_STATUS, default='assigned')
    response_time = models.DurationField(null=True, blank=True)  # Time to respond
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"SOS {self.sos_alert.id} - {self.assigned_team.team_id}"
