"""Side effects of SOS lifecycle events: alerting volunteers and notifying departments."""
import logging
from datetime import timedelta

from django.utils import timezone

from cityshield_backend.geo import bbox_filter, bounding_box, haversine_m
from users import roles
from users.notifications import notify, notify_department

from .models import Volunteer, VolunteerAlert

logger = logging.getLogger(__name__)

VOLUNTEER_ALERT_RADIUS_M = 2000
VOLUNTEER_LOCATION_MAX_AGE = timedelta(minutes=30)


def emergency_label(alert):
    return alert.get_emergency_type_display()


def nearby_available_volunteers(alert, radius_m=VOLUNTEER_ALERT_RADIUS_M):
    """[(volunteer, distance_m)] - available, verified, with a fresh location, nearest first."""
    fresh_since = timezone.now() - VOLUNTEER_LOCATION_MAX_AGE
    bbox = bounding_box(alert.latitude, alert.longitude, radius_m)
    candidates = (
        Volunteer.objects
        .filter(is_available=True, is_verified=True, user__is_active=True, user__role=roles.VOLUNTEER,
                last_location_update__gte=fresh_since,
                current_latitude__isnull=False, current_longitude__isnull=False)
        .filter(**bbox_filter(bbox, 'current_latitude', 'current_longitude'))
        .select_related('user')
    )
    if alert.user_id:
        candidates = candidates.exclude(user_id=alert.user_id)
    found = []
    for volunteer in candidates:
        distance = haversine_m(alert.latitude, alert.longitude,
                               volunteer.current_latitude, volunteer.current_longitude)
        if distance <= radius_m:
            found.append((volunteer, distance))
    found.sort(key=lambda pair: pair[1])
    return found


def alert_nearby_volunteers(alert):
    """Create VolunteerAlert rows + notifications. Returns the number of volunteers alerted."""
    nearby = nearby_available_volunteers(alert)
    if not nearby:
        return 0
    already = set(VolunteerAlert.objects.filter(sos_alert=alert).values_list('volunteer_id', flat=True))
    new = [(v, d) for v, d in nearby if v.id not in already]
    VolunteerAlert.objects.bulk_create(
        [VolunteerAlert(sos_alert=alert, volunteer=v, distance=round(d, 1), status='alerted') for v, d in new],
        ignore_conflicts=True,
    )
    for volunteer, distance in new:
        notify(volunteer.user, f'SOS nearby: {emergency_label(alert)}',
               f'Someone about {round(distance)} m from you needs help.', '/community')
    return len(new)


def notify_departments(alert):
    """Notify the SOS department (and police, the default first responders). Returns users notified."""
    title = f'SOS #{alert.id}: {emergency_label(alert)}'
    message = alert.description or 'A new SOS alert needs attention.'
    count = notify_department(alert.department, title, message, '/')
    if alert.department != roles.POLICE:
        count += notify_department(roles.POLICE, title, message, '/')
    return count


def notify_owner(alert, title, message=''):
    if alert.user_id:
        notify(alert.user, title, message, '/')
