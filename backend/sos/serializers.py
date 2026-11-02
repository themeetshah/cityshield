"""Response payload builders for the SOS API (plain dicts - shapes are part of the frontend contract)."""
from urllib.parse import quote

from django.core import signing
from django.urls import reverse

VIDEO_URL_SALT = 'sos.video.stream'
VIDEO_URL_MAX_AGE = 15 * 60  # seconds


def iso(dt):
    return dt.isoformat() if dt else None


def display_name(user):
    if user is None:
        return None
    return user.name or user.email.split('@')[0]


def alert_summary(alert, *, distance=None, has_responded=False, include_user=True):
    """Item of GET by-role / active / all."""
    return {
        'id': alert.id,
        'latitude': alert.latitude,
        'longitude': alert.longitude,
        'emergency_type': alert.emergency_type,
        'department': alert.department,
        'description': alert.description or '',
        'created_at': iso(alert.created_at),
        'resolved_at': iso(alert.resolved_at),
        'is_active': alert.is_active,
        'is_streaming': alert.is_streaming,
        'distance': round(distance) if distance is not None else None,
        'responders_count': alert.responders_count,  # annotated by the list queryset
        'user_name': display_name(alert.user) if include_user else None,
        'has_responded': has_responded,
    }


def alert_detail(alert, *, is_owner=False, include_user=False):
    return {
        'id': alert.id,
        'is_active': alert.is_active,
        'emergency_type': alert.emergency_type,
        'department': alert.department,
        'latitude': alert.latitude,
        'longitude': alert.longitude,
        'description': alert.description or '',
        'created_at': iso(alert.created_at),
        'resolved_at': iso(alert.resolved_at),
        'resolved_by_name': display_name(alert.resolved_by) if include_user else None,
        'responders_count': alert.volunteer_alerts.filter(responded=True).count(),
        'volunteers_alerted': alert.volunteer_alerts.count(),
        'is_streaming': alert.is_streaming,
        'video_chunks_count': alert.video_chunks_count,
        'user_name': display_name(alert.user) if include_user else None,
        'is_owner': is_owner,
    }


def signed_video_url(request, feed):
    signature = signing.TimestampSigner(salt=VIDEO_URL_SALT).sign(str(feed.id))
    path = reverse('sos_video_stream', args=[feed.id])
    return request.build_absolute_uri(f'{path}?sig={quote(signature)}')


def unsign_video(signature):
    """Return the feed id the signature was issued for; raises signing.BadSignature (incl. expired)."""
    return signing.TimestampSigner(salt=VIDEO_URL_SALT).unsign(signature, max_age=VIDEO_URL_MAX_AGE)


def video_feed(request, feed, viewed_ids=()):
    return {
        'id': feed.id,
        'video_url': signed_video_url(request, feed),
        'content_type': feed.content_type,
        'timestamp': iso(feed.timestamp),
        'chunk_sequence': feed.chunk_sequence,
        'file_size': feed.file_size,
        'duration': feed.duration,
        'viewed': feed.id in viewed_ids,
    }


def location_update(update):
    return {
        'id': update.id,
        'latitude': update.latitude,
        'longitude': update.longitude,
        'accuracy': update.accuracy,
        'timestamp': iso(update.timestamp),
    }


def volunteer_response(alert):
    """Item of GET volunteer/responses/ (a VolunteerAlert)."""
    return {
        'id': alert.id,
        'sos_id': alert.sos_alert_id,
        'emergency_type': alert.sos_alert.emergency_type,
        'status': alert.status,
        'responded': alert.responded,
        'alerted_at': iso(alert.alerted_at),
        'response_time': iso(alert.response_time),
        'sos_is_active': alert.sos_alert.is_active,
        'distance': round(alert.distance) if alert.distance is not None else None,
    }
