from django.conf import settings
from django.db import models
from django.utils import timezone

from reports.models import Report
from safety.models import PoliceStation
from sos.models import SOSAlert
from users import roles

POLICE_ROLES = (roles.DEPARTMENTS[roles.POLICE]['admin_role'], roles.DEPARTMENTS[roles.POLICE]['staff_role'])


class PatrolTeam(models.Model):
    team_id = models.CharField(max_length=20, unique=True)  # e.g. "PT-001", "ALPHA-7"
    station = models.ForeignKey(PoliceStation, on_delete=models.CASCADE, related_name='patrol_teams')
    team_leader = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='led_patrol_teams',
        limit_choices_to={'role__in': POLICE_ROLES},
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name='patrol_teams_member', blank=True,
        limit_choices_to={'role__in': POLICE_ROLES},
    )
    vehicle_number = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    current_latitude = models.FloatField(null=True, blank=True)
    current_longitude = models.FloatField(null=True, blank=True)
    location_updated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['team_id']

    def __str__(self):
        return f'{self.team_id} - {self.station.name}'

    def get_member_count(self):
        return self.members.exclude(pk=self.team_leader_id).count() + 1  # +1 for the leader

    def includes(self, user):
        return user.pk == self.team_leader_id or self.members.filter(pk=user.pk).exists()


class OfficialAlert(models.Model):
    ALERT_TYPES = [
        ('safety', 'Safety Advisory'),
        ('traffic', 'Traffic Update'),
        ('emergency', 'Emergency Notice'),
        ('community', 'Community Notice'),
    ]

    title = models.CharField(max_length=200)
    message = models.TextField()
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES, default='community')
    department = models.CharField(max_length=20, choices=roles.DEPARTMENT_CHOICES, default=roles.POLICE,
                                  db_index=True)
    issued_by_station = models.ForeignKey(PoliceStation, on_delete=models.SET_NULL, null=True, blank=True)
    issued_by_officer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                          blank=True, related_name='official_alerts')
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.get_department_display()})'


class SOSResponse(models.Model):
    """A patrol team dispatched to an SOS alert, with the timeline of the response."""
    STATUS_ORDER = ['assigned', 'dispatched', 'arrived', 'resolved']
    RESPONSE_STATUS = [
        ('assigned', 'Team Assigned'),
        ('dispatched', 'Team Dispatched'),
        ('arrived', 'Arrived on Scene'),
        ('resolved', 'Resolved'),
    ]

    sos_alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='police_responses')
    assigned_team = models.ForeignKey(PatrolTeam, on_delete=models.CASCADE, related_name='sos_responses')
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='+')
    status = models.CharField(max_length=20, choices=RESPONSE_STATUS, default='assigned')
    # Time from the SOS being raised to the first team assignment.
    response_time = models.DurationField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    arrived_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'SOS {self.sos_alert_id} - {self.assigned_team.team_id}'


class ReportStatusChange(models.Model):
    """Audit trail of status changes made by department staff (with optional note)."""
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='status_changes')
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20, db_index=True)
    note = models.TextField(blank=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                   related_name='+')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Report {self.report_id}: {self.old_status} -> {self.new_status}'
