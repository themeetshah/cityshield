import os
import uuid

from django.conf import settings
from django.db import models

from users import roles


def report_media_path(instance, filename):
    """Store uploads under a random name; never trust the client's filename."""
    ext = os.path.splitext(filename)[1].lower()[:10]
    return f'report_media/{uuid.uuid4().hex}{ext}'


class Media(models.Model):
    file = models.FileField(upload_to=report_media_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Media {self.id}'


class Report(models.Model):
    REPORT_TYPES = [
        ('crime', 'Crime'),
        ('harassment', 'Harassment'),
        ('safety', 'Safety Concern'),
        ('infrastructure', 'Infrastructure Issue'),
        ('fire_hazard', 'Fire Hazard'),
        ('medical', 'Medical Emergency'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]

    # Always stored (so reporters can see their own reports). Legacy rows may be NULL.
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    # Hides the reporter's identity from everyone except a superadmin.
    is_anonymous = models.BooleanField(default=False)

    title = models.CharField(max_length=200)
    description = models.TextField()
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    department = models.CharField(
        max_length=20, choices=roles.DEPARTMENT_CHOICES, default=roles.POLICE, db_index=True
    )

    latitude = models.FloatField()
    longitude = models.FloatField()
    location = models.CharField(max_length=200, blank=True, null=True)

    media = models.ManyToManyField(Media, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['latitude', 'longitude'], name='report_lat_lng_idx')]

    def save(self, *args, **kwargs):
        self.department = roles.department_for_report_type(self.report_type)
        update_fields = kwargs.get('update_fields')
        if update_fields is not None and 'report_type' in update_fields:
            kwargs['update_fields'] = set(update_fields) | {'department'}
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.title} - {self.get_report_type_display()}'
