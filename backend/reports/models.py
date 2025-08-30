# models.py
from django.db import models
from django.conf import settings

class Media(models.Model):
    file = models.FileField(upload_to='report_media/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Media {self.id}"

class Report(models.Model):
    REPORT_TYPES = [
        ('infrastructure', 'Infrastructure Issue'),
        ('harassment', 'Harassment'),
        ('crime', 'Crime'),
        ('safety', 'Safety Concern'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]
    
    # id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Location data
    latitude = models.FloatField()
    longitude = models.FloatField()
    # add a field for location (String) which calls reverse_geocode function from views.py, passing lat,lon and getting the location string directly
    location = models.CharField(max_length=200, blank=True, null=True)

    # Media files
    media = models.ManyToManyField(Media, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.get_report_type_display()}"


# # Add these new models to your existing reports/models.py

# class PoliceStation(models.Model):
#     # id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     name = models.CharField(max_length=200)
#     latitude = models.FloatField()
#     longitude = models.FloatField()
#     address = models.TextField(blank=True)
#     city = models.CharField(max_length=100, blank=True)
#     state = models.CharField(max_length=100, blank=True)
#     contact_number = models.CharField(max_length=20, blank=True)
#     source = models.CharField(max_length=50, default='csv')  # 'csv' or 'overpass'
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     class Meta:
#         unique_together = ('latitude', 'longitude')

#     def __str__(self):
#         return self.name


# class Hospital(models.Model):
#     # id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     name = models.CharField(max_length=200)
#     latitude = models.FloatField()
#     longitude = models.FloatField()
#     address = models.TextField(blank=True)
#     city = models.CharField(max_length=100, blank=True)
#     state = models.CharField(max_length=100, blank=True)
#     contact_number = models.CharField(max_length=20, blank=True)
#     hospital_type = models.CharField(max_length=100, blank=True)
#     source = models.CharField(max_length=50, default='overpass')
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     class Meta:
#         unique_together = ('latitude', 'longitude')

#     def __str__(self):
#         return self.name


# class SafetyZone(models.Model):
#     ZONE_TYPES = (
#         ('safe', 'Safe Zone'),
#         ('danger', 'Danger Zone'),
#     )

#     # id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     zone_type = models.CharField(max_length=10, choices=ZONE_TYPES)
#     center_latitude = models.FloatField()
#     center_longitude = models.FloatField()
#     radius = models.FloatField()  # in meters
#     risk_score = models.FloatField()  # ML-predicted risk score
#     incident_count = models.IntegerField(default=0)
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     def __str__(self):
#         return f"{self.zone_type} zone at {self.center_latitude}, {self.center_longitude}"
