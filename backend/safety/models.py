from django.db import models


class Facility(models.Model):
    """Shared fields for police stations and hospitals.

    Rows synced from OpenStreetMap carry their OSM identity so later syncs can
    update a moved/renamed facility in place and deactivate ones that closed.
    """

    name = models.CharField(max_length=200)
    latitude = models.FloatField()
    longitude = models.FloatField()
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    contact_number = models.CharField(max_length=20, blank=True)
    source = models.CharField(max_length=50, default='manual')
    osm_type = models.CharField(max_length=10, blank=True)
    osm_id = models.BigIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True, help_text='False when no longer present in OpenStreetMap')
    last_seen_at = models.DateTimeField(null=True, blank=True, help_text='Last time a sync saw this facility')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['name']

    def __str__(self):
        return self.name


class PoliceStation(Facility):
    class Meta(Facility.Meta):
        constraints = [
            models.UniqueConstraint(fields=['osm_type', 'osm_id'], condition=models.Q(osm_id__isnull=False),
                                    name='uniq_policestation_osm'),
        ]
        indexes = [models.Index(fields=['latitude', 'longitude'])]


class Hospital(Facility):
    hospital_type = models.CharField(max_length=100, blank=True)

    class Meta(Facility.Meta):
        constraints = [
            models.UniqueConstraint(fields=['osm_type', 'osm_id'], condition=models.Q(osm_id__isnull=False),
                                    name='uniq_hospital_osm'),
        ]
        indexes = [models.Index(fields=['latitude', 'longitude'])]


class FacilitySyncArea(models.Model):
    """Bookkeeping for OpenStreetMap syncs (one row per synced tile / named area)."""

    key = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=200, blank=True)
    south = models.FloatField()
    west = models.FloatField()
    north = models.FloatField()
    east = models.FloatField()
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=300, blank=True)
    police_count = models.IntegerField(default=0)
    hospital_count = models.IntegerField(default=0)

    def __str__(self):
        return self.label or self.key


class SafetyZone(models.Model):
    """Zones defined manually by a superadmin (not computed)."""

    ZONE_TYPES = (
        ('safe', 'Safe Zone'),
        ('danger', 'Danger Zone'),
    )

    zone_type = models.CharField(max_length=10, choices=ZONE_TYPES)
    center_latitude = models.FloatField()
    center_longitude = models.FloatField()
    radius = models.FloatField()  # metres
    risk_score = models.FloatField()
    incident_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.zone_type} zone at {self.center_latitude}, {self.center_longitude}'
