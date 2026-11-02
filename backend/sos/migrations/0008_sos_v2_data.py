"""
Data migration:
- link SOSVideoFeed rows that only had the string `emergency_id` to their SOSAlert
  (rows pointing at no existing alert are deleted - they can't be authorised);
- move existing video files from the public MEDIA_ROOT into PRIVATE_MEDIA_ROOT;
- normalise emergency types and derive SOSAlert.department;
- map legacy VolunteerAlert statuses.
"""
import os
import shutil

from django.conf import settings
from django.db import migrations

LEGACY_TYPES = {
    'medical_emergency': 'medical',
    'fire_emergency': 'fire',
}
ALLOWED_TYPES = {'general_emergency', 'medical', 'fire', 'harassment', 'accident', 'other'}
TYPE_DEPARTMENT = {'medical': 'medical', 'fire': 'fire'}


def forwards(apps, schema_editor):
    SOSAlert = apps.get_model('sos', 'SOSAlert')
    SOSVideoFeed = apps.get_model('sos', 'SOSVideoFeed')
    VolunteerAlert = apps.get_model('sos', 'VolunteerAlert')

    for alert in SOSAlert.objects.all().only('id', 'emergency_type', 'department'):
        etype = LEGACY_TYPES.get(alert.emergency_type, alert.emergency_type)
        if etype not in ALLOWED_TYPES:
            etype = 'other'
        alert.emergency_type = etype
        alert.department = TYPE_DEPARTMENT.get(etype, 'police')
        alert.save(update_fields=['emergency_type', 'department'])

    existing_ids = set(SOSAlert.objects.values_list('id', flat=True))
    for feed in SOSVideoFeed.objects.filter(sos_alert__isnull=True):
        try:
            sos_id = int(str(feed.emergency_id).strip())
        except (TypeError, ValueError):
            sos_id = None
        if sos_id in existing_ids:
            feed.sos_alert_id = sos_id
            feed.save(update_fields=['sos_alert'])
        else:
            feed.delete()

    public_root = str(settings.MEDIA_ROOT)
    private_root = str(settings.PRIVATE_MEDIA_ROOT)
    for feed in SOSVideoFeed.objects.exclude(video_file=''):
        name = feed.video_file.name
        src = os.path.join(public_root, name)
        dst = os.path.join(private_root, name)
        if os.path.isfile(src) and not os.path.exists(dst):
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.move(src, dst)
        if name.lower().endswith('.mp4'):
            feed.content_type = 'video/mp4'
            feed.save(update_fields=['content_type'])

    # chunk_sequence becomes unique per alert: renumber legacy chunks in order.
    for sos_id in SOSVideoFeed.objects.values_list('sos_alert_id', flat=True).distinct():
        feeds = SOSVideoFeed.objects.filter(sos_alert_id=sos_id).order_by('chunk_sequence', 'timestamp', 'id')
        for index, feed in enumerate(feeds, start=1):
            if feed.chunk_sequence != index:
                feed.chunk_sequence = index
                feed.save(update_fields=['chunk_sequence'])

    VolunteerAlert.objects.filter(responded=True).update(status='responding')
    VolunteerAlert.objects.filter(responded=False).exclude(status='closed').update(status='alerted')


class Migration(migrations.Migration):

    dependencies = [
        ('sos', '0007_sos_v2_fields'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
