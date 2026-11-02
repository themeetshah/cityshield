import uuid

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import models

from users import roles

EMERGENCY_TYPE_CHOICES = [
    ('general_emergency', 'General emergency'),
    ('medical', 'Medical'),
    ('fire', 'Fire'),
    ('harassment', 'Harassment'),
    ('accident', 'Accident'),
    ('other', 'Other'),
]
EMERGENCY_TYPES = {value for value, _ in EMERGENCY_TYPE_CHOICES}


class PrivateMediaStorage(FileSystemStorage):
    """
    SOS videos live under settings.PRIVATE_MEDIA_ROOT, which is never served
    publicly; files are streamed only through the signed-URL endpoint.
    The location is read lazily so tests can override the setting.
    """

    def __init__(self, **kwargs):
        kwargs.pop('location', None)
        kwargs.pop('base_url', None)
        super().__init__(**kwargs)

    @property
    def base_location(self):
        return str(settings.PRIVATE_MEDIA_ROOT)

    @property
    def location(self):
        import os
        return os.path.abspath(self.base_location)

    @property
    def base_url(self):
        return None

    def url(self, name):
        raise NotImplementedError('Private SOS media has no public URL; use a signed stream URL.')


def private_storage():
    return PrivateMediaStorage()


def sos_video_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'webm'
    if ext not in ('webm', 'mp4', 'mov'):
        ext = 'webm'
    return f'sos_videos/{instance.sos_alert_id}/{uuid.uuid4().hex}.{ext}'


class SOSAlert(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    # sha256 of the secret token handed (once) to the creator; lets anonymous
    # creators keep controlling their own SOS. The raw token is never stored.
    token_hash = models.CharField(max_length=64, blank=True, default='', editable=False)

    latitude = models.FloatField()
    longitude = models.FloatField()

    emergency_type = models.CharField(max_length=50, choices=EMERGENCY_TYPE_CHOICES, default='general_emergency')
    department = models.CharField(max_length=20, choices=roles.DEPARTMENT_CHOICES, default=roles.POLICE,
                                  db_index=True)
    description = models.TextField(null=True, blank=True)

    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='resolved_sos_alerts')

    is_streaming = models.BooleanField(default=False)
    camera_feed_started = models.DateTimeField(null=True, blank=True)
    video_chunks_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.pk:
            self.department = roles.department_for_emergency_type(self.emergency_type)
        super().save(*args, **kwargs)

    def __str__(self):
        status = 'ACTIVE' if self.is_active else 'RESOLVED'
        return f'SOS #{self.id} - {self.emergency_type} ({status})'


class SOSLocationUpdate(models.Model):
    sos_alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='location_updates')
    latitude = models.FloatField()
    longitude = models.FloatField()
    accuracy = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']


class SOSVideoFeed(models.Model):
    sos_alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='video_feeds')
    video_file = models.FileField(upload_to=sos_video_path, storage=private_storage, max_length=255)
    content_type = models.CharField(max_length=50, default='video/webm')
    timestamp = models.DateTimeField(auto_now_add=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    duration = models.FloatField(null=True, blank=True)
    chunk_sequence = models.IntegerField(default=0)

    class Meta:
        ordering = ['chunk_sequence', 'timestamp']
        unique_together = ['sos_alert', 'chunk_sequence']

    def __str__(self):
        return f'Video chunk {self.chunk_sequence} for SOS #{self.sos_alert_id}'


class PoliceVideoView(models.Model):
    """A responder explicitly watched a video chunk."""
    video_feed = models.ForeignKey(SOSVideoFeed, on_delete=models.CASCADE, related_name='police_views')
    police_officer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(auto_now_add=True)
    viewing_duration = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = ['video_feed', 'police_officer']


class Volunteer(models.Model):
    """Created (verified) by the users app when a volunteer application is approved."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=15)
    is_verified = models.BooleanField(default=False)
    is_available = models.BooleanField(default=False)

    current_latitude = models.FloatField(null=True, blank=True)
    current_longitude = models.FloatField(null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'Volunteer: {self.user.email}'


class VolunteerAlert(models.Model):
    STATUS_CHOICES = [
        ('alerted', 'Alerted'),
        ('responding', 'Responding'),
        ('closed', 'Closed'),
    ]

    sos_alert = models.ForeignKey(SOSAlert, on_delete=models.CASCADE, related_name='volunteer_alerts')
    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE, related_name='alerts')
    alerted_at = models.DateTimeField(auto_now_add=True)
    responded = models.BooleanField(default=False)
    response_time = models.DateTimeField(null=True, blank=True)
    distance = models.FloatField(null=True, blank=True)  # metres
    message = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='alerted')

    class Meta:
        unique_together = ['sos_alert', 'volunteer']
