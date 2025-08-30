# facilities/models.py
from django.db import models

class PoliceStation(models.Model):
    name = models.CharField(max_length=200)
    latitude = models.FloatField()
    longitude = models.FloatField()
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    contact_number = models.CharField(max_length=20, blank=True)
    source = models.CharField(max_length=50, default='csv')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('latitude', 'longitude')

    def __str__(self):
        return self.name

class Hospital(models.Model):
    name = models.CharField(max_length=200)
    latitude = models.FloatField()
    longitude = models.FloatField()
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    contact_number = models.CharField(max_length=20, blank=True)
    hospital_type = models.CharField(max_length=100, blank=True)
    source = models.CharField(max_length=50, default='overpass')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('latitude', 'longitude')

    def __str__(self):
        return self.name

class SafetyZone(models.Model):
    ZONE_TYPES = (
        ('safe', 'Safe Zone'),
        ('danger', 'Danger Zone'),
    )
    
    zone_type = models.CharField(max_length=10, choices=ZONE_TYPES)
    center_latitude = models.FloatField()
    center_longitude = models.FloatField()
    radius = models.FloatField()  # in meters
    risk_score = models.FloatField()
    incident_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.zone_type} zone at {self.center_latitude}, {self.center_longitude}"
