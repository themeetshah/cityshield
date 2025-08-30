from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class SOSAlert(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    
    # Location
    latitude = models.FloatField()
    longitude = models.FloatField()
    
    # Emergency details
    emergency_type = models.CharField(max_length=50, default='general_emergency')
    description = models.TextField(null=True, blank=True)  # MISSING FIELD
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Live streaming
    is_streaming = models.BooleanField(default=False)
    stream_url = models.URLField(null=True, blank=True)

    # NEW: Camera feed tracking
    camera_feed_started = models.DateTimeField(null=True, blank=True)
    total_video_duration = models.IntegerField(default=0)  # in seconds
    video_chunks_count = models.IntegerField(default=0)

    def __str__(self):
        status = "ACTIVE" if self.is_active else "RESOLVED"
        return f"SOS #{self.id} - {self.emergency_type} ({status})"

class SOSLocationUpdate(models.Model):
    sos_alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='location_updates')
    latitude = models.FloatField()
    longitude = models.FloatField()
    accuracy = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

# class SOSVideoFeed(models.Model):
#     sos_alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='video_feeds')
#     video_file = models.FileField(upload_to='sos_videos/')
#     timestamp = models.DateTimeField(auto_now_add=True)
#     sent_to_police = models.BooleanField(default=True)

#     # NEW: Enhanced video tracking
#     file_size = models.BigIntegerField(null=True, blank=True)  # in bytes
#     duration = models.FloatField(null=True, blank=True)  # in seconds
#     chunk_sequence = models.IntegerField(default=0)  # sequence number
#     viewed_by_police = models.BooleanField(default=False)
#     viewed_at = models.DateTimeField(null=True, blank=True)

#     class Meta:
#         ordering = ['-timestamp']

# sos/models.py - Updated Model
class SOSVideoFeed(models.Model):
    emergency_id = models.CharField(max_length=50, db_index=True, null=True, blank=True)
    sos_alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='video_feeds', null=True, blank=True)  # Keep for compatibility
    video_file = models.FileField(upload_to='sos_videos/')
    timestamp = models.DateTimeField(auto_now_add=True)
    sent_to_police = models.BooleanField(default=True)

    # Enhanced video tracking
    file_size = models.BigIntegerField(null=True, blank=True)  # in bytes
    duration = models.FloatField(null=True, blank=True)  # in seconds
    chunk_sequence = models.IntegerField(default=0)  # sequence number
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['emergency_id', '-timestamp']),
        ]

    def __str__(self):
        return f"Video Feed {self.chunk_sequence} for Emergency {self.emergency_id}"


# NEW: Track which police officers have viewed the feeds
class PoliceVideoView(models.Model):
    video_feed = models.ForeignKey(SOSVideoFeed, on_delete=models.CASCADE, related_name='police_views')
    police_officer = models.ForeignKey(User, on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(auto_now_add=True)
    viewing_duration = models.IntegerField(null=True, blank=True)  # in seconds
    
    class Meta:
        unique_together = ['video_feed', 'police_officer']

class Volunteer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=15)
    is_verified = models.BooleanField(default=False)
    is_available = models.BooleanField(default=False)
    
    # Current location (when available)
    current_latitude = models.FloatField(null=True, blank=True)
    current_longitude = models.FloatField(null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Volunteer: {self.user.email}"

class VolunteerAlert(models.Model):
    sos_alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='volunteer_alerts')
    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE, related_name='alerts')
    alerted_at = models.DateTimeField(auto_now_add=True)
    responded = models.BooleanField(default=False)
    response_time = models.DateTimeField(null=True, blank=True)
    distance = models.FloatField(null=True, blank=True)  # MISSING FIELD
    message = models.TextField(null=True, blank=True)  # MISSING FIELD
    status = models.CharField(max_length=20, default='pending')  # MISSING FIELD

    class Meta:
        unique_together = ['sos_alert', 'volunteer']
