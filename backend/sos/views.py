"""
SOS emergency API.

Creating an SOS is open to everyone (anonymous people must be able to call for
help). The creator receives a one-time secret `sos_token`; "owner" actions
(location updates, video upload, resolve) require the authenticated creator or
the `X-SOS-Token` header. Reads are limited to responders of the SOS's
department (police and superadmin see all) and to volunteers who were alerted.
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.core import signing
from django.db import IntegrityError, transaction
from django.db.models import Count, F, Max, Q
from django.http import FileResponse, Http404, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_GET
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from cityshield_backend.geo import bbox_filter, bounding_box, clamp_radius, haversine_m, parse_lat_lng
from cityshield_backend.throttles import SOSCreateThrottle, UploadThrottle
from users import roles
from users.permissions import IsResponderOrSuperAdmin

from . import access, serializers, services
from .models import EMERGENCY_TYPES, PoliceVideoView, SOSAlert, SOSLocationUpdate, SOSVideoFeed, VolunteerAlert

logger = logging.getLogger(__name__)

LOCATION_UPDATE_MIN_INTERVAL = timedelta(seconds=3)
VOLUNTEER_MAX_RADIUS_M = 10_000
MAX_DESCRIPTION_LENGTH = 1000
ALLOWED_VIDEO_TYPES = {'video/webm', 'video/mp4', 'video/quicktime'}
VIDEO_EXTENSIONS = {'video/webm': 'webm', 'video/mp4': 'mp4', 'video/quicktime': 'mov'}


def _error(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({'error': message}, status=code)


def _forbidden():
    return _error('You do not have access to this SOS alert.', status.HTTP_403_FORBIDDEN)


def _parse_location(data):
    """(lat, lng, accuracy) or raise ValueError with a readable message."""
    lat, lng = parse_lat_lng(data.get('latitude'), data.get('longitude'))
    accuracy = data.get('accuracy')
    if accuracy in (None, ''):
        return lat, lng, None
    accuracy = float(accuracy)
    if accuracy < 0:
        raise ValueError('accuracy must be positive')
    return lat, lng, accuracy


def _as_bool(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


def _with_responders(qs):
    return qs.select_related('user').annotate(
        responders_count=Count('volunteer_alerts', filter=Q(volunteer_alerts__responded=True)))


# ============================================================ create / read

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([SOSCreateThrottle])
def create_emergency_alert(request):
    try:
        lat, lng, accuracy = _parse_location(request.data)
    except (TypeError, ValueError):
        return _error('A valid location (latitude/longitude) is required to send an SOS.')

    emergency_type = request.data.get('emergency_type') or 'general_emergency'
    if emergency_type not in EMERGENCY_TYPES:
        return _error(f'Unknown emergency type. Use one of: {", ".join(sorted(EMERGENCY_TYPES))}.')
    description = (request.data.get('description') or '').strip()[:MAX_DESCRIPTION_LENGTH]
    user = request.user if request.user.is_authenticated else None

    if user is not None:
        existing = SOSAlert.objects.filter(user=user, is_active=True).order_by('-created_at').first()
        if existing:
            # Never open a second SOS for the same person; the authenticated
            # owner controls the existing one through their session.
            return Response({
                'sos_id': existing.id,
                'sos_token': None,
                'already_active': True,
                'status': 'active',
                'emergency_type': existing.emergency_type,
                'department': existing.department,
                'created_at': serializers.iso(existing.created_at),
                'message': 'You already have an active SOS alert.',
            }, status=status.HTTP_200_OK)

    token = access.new_token()
    with transaction.atomic():
        alert = SOSAlert.objects.create(
            user=user, latitude=lat, longitude=lng, emergency_type=emergency_type,
            description=description or None, token_hash=access.hash_token(token), is_active=True,
        )
        SOSLocationUpdate.objects.create(sos_alert=alert, latitude=lat, longitude=lng, accuracy=accuracy)
        staff_notified = services.notify_departments(alert)
        volunteers_alerted = services.alert_nearby_volunteers(alert)

    logger.info('SOS #%s created (type=%s, department=%s, volunteers alerted=%s)',
                alert.id, alert.emergency_type, alert.department, volunteers_alerted)
    return Response({
        'sos_id': alert.id,
        'sos_token': token,
        'already_active': False,
        'status': 'active',
        'emergency_type': alert.emergency_type,
        'department': alert.department,
        'created_at': serializers.iso(alert.created_at),
        'emergency_services_notified': staff_notified > 0,
        'staff_notified': staff_notified,
        'volunteers_alerted': volunteers_alerted,
        'message': 'SOS alert sent.',
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_sos_by_id(request, sos_id):
    alert = get_object_or_404(SOSAlert.objects.select_related('user', 'resolved_by'), id=sos_id)
    if not access.can_view(request, alert):
        return _forbidden()
    return Response(serializers.alert_detail(
        alert,
        is_owner=access.is_owner(request, alert),
        include_user=access.is_staff_viewer(request.user),
    ))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sos_by_role(request):
    """
    volunteers: active alerts near them (latitude/longitude required, radius <= 10 km)
    responders/superadmin: their department's alerts (police: all); ?status=active to filter
    citizens: 403
    """
    user = request.user
    user_lat = user_lng = None
    if request.GET.get('latitude') not in (None, '') or roles.is_volunteer(user):
        try:
            user_lat, user_lng = parse_lat_lng(request.GET.get('latitude'), request.GET.get('longitude'))
        except (TypeError, ValueError):
            return _error('Valid latitude and longitude are required.')

    if roles.is_volunteer(user):
        radius = clamp_radius(request.GET.get('radius'), default=5000, maximum=VOLUNTEER_MAX_RADIUS_M)
        qs = _with_responders(
            SOSAlert.objects.filter(is_active=True, **bbox_filter(bounding_box(user_lat, user_lng, radius)))
            .exclude(user=user)
        )
        responded = set(VolunteerAlert.objects.filter(volunteer__user=user, responded=True)
                        .values_list('sos_alert_id', flat=True))
        alerts = []
        for alert in qs:
            distance = haversine_m(user_lat, user_lng, alert.latitude, alert.longitude)
            if distance <= radius:
                alerts.append(serializers.alert_summary(
                    alert, distance=distance, has_responded=alert.id in responded, include_user=False))
        alerts.sort(key=lambda a: a['distance'])
    elif access.is_staff_viewer(user):
        qs = access.responder_queryset(user)
        if request.GET.get('status') == 'active':
            qs = qs.filter(is_active=True)
        qs = _with_responders(qs).order_by('-is_active', '-created_at')[:100]
        alerts = [
            serializers.alert_summary(
                alert,
                distance=haversine_m(user_lat, user_lng, alert.latitude, alert.longitude)
                if user_lat is not None else None,
            )
            for alert in qs
        ]
    else:
        return _error('Only volunteers and department staff can view SOS alerts.', status.HTTP_403_FORBIDDEN)

    return Response({
        'alerts': alerts,
        'active_count': sum(1 for a in alerts if a['is_active']),
        'user_role': user.role,
    })


def _responder_list(request, active_only):
    qs = access.responder_queryset(request.user)
    if active_only:
        qs = qs.filter(is_active=True)
    try:
        limit = max(1, min(int(request.GET.get('limit', 50)), 200))
        offset = max(0, int(request.GET.get('offset', 0)))
    except ValueError:
        return _error('limit and offset must be integers.')
    count = qs.count()
    page = _with_responders(qs).order_by('-created_at')[offset:offset + limit]
    return Response({
        'count': count,
        'limit': limit,
        'offset': offset,
        'results': [serializers.alert_summary(alert) for alert in page],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsResponderOrSuperAdmin])
def get_active_sos(request):
    return _responder_list(request, active_only=True)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsResponderOrSuperAdmin])
def get_all_sos(request):
    return _responder_list(request, active_only=False)


# ============================================================ owner actions

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def location_updates(request, sos_id):
    """GET: location trail (responders). POST: live location from the SOS owner."""
    alert = get_object_or_404(SOSAlert, id=sos_id)

    if request.method == 'GET':
        if not access.can_view_media(request, alert):
            return _forbidden()
        updates = alert.location_updates.all()[:500]
        return Response({'results': [serializers.location_update(u) for u in updates]})

    if not access.is_owner(request, alert):
        return _forbidden()
    if not alert.is_active:
        return _error('This SOS alert is no longer active.', status.HTTP_409_CONFLICT)
    try:
        lat, lng, accuracy = _parse_location(request.data)
    except (TypeError, ValueError):
        return _error('Valid latitude and longitude are required.')

    last = alert.location_updates.aggregate(last=Max('timestamp'))['last']
    if last and timezone.now() - last < LOCATION_UPDATE_MIN_INTERVAL:
        return Response({'success': True, 'ignored': True})

    with transaction.atomic():
        update = SOSLocationUpdate.objects.create(sos_alert=alert, latitude=lat, longitude=lng, accuracy=accuracy)
        SOSAlert.objects.filter(pk=alert.pk).update(latitude=lat, longitude=lng)
    return Response({'success': True, 'ignored': False, 'update_id': update.id})


@api_view(['POST'])
@permission_classes([AllowAny])
def resolve_sos(request, sos_id):
    """Owner, responders of the SOS department (police: any), superadmin."""
    alert = get_object_or_404(SOSAlert, id=sos_id)
    if not access.can_resolve(request, alert):
        return _forbidden()
    if not alert.is_active:
        return Response({'success': True, 'message': 'This SOS alert was already resolved.'})

    by_owner = access.is_owner(request, alert)
    with transaction.atomic():
        alert.is_active = False
        alert.is_streaming = False
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user if request.user.is_authenticated else None
        alert.save(update_fields=['is_active', 'is_streaming', 'resolved_at', 'resolved_by'])
        alert.volunteer_alerts.exclude(status='closed').update(status='closed')
        if not by_owner:
            services.notify_owner(alert, 'Your SOS was marked resolved',
                                  f'Resolved by {serializers.display_name(request.user)}.')

    logger.info('SOS #%s resolved (by owner=%s)', alert.id, by_owner)
    return Response({'success': True, 'message': 'SOS alert resolved.'})


def _sniff_video(upload):
    head = upload.read(12)
    upload.seek(0)
    if head[:4] == b'\x1a\x45\xdf\xa3':  # EBML (webm / matroska)
        return True
    return len(head) >= 8 and head[4:8] in (b'ftyp', b'moov', b'mdat', b'wide', b'free', b'skip')


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([UploadThrottle])
@parser_classes([MultiPartParser, FormParser])
def upload_video_chunk(request, sos_id):
    """Owner uploads one self-contained video segment (multipart field `video`)."""
    alert = get_object_or_404(SOSAlert, id=sos_id)
    if not access.is_owner(request, alert):
        return _forbidden()
    if not alert.is_active:
        return _error('This SOS alert is no longer active.', status.HTTP_409_CONFLICT)

    upload = request.FILES.get('video')
    if upload is None or upload.size == 0:
        return _error('A non-empty video file is required.')
    if upload.size > settings.MAX_SOS_CHUNK_BYTES:
        return _error('Video chunk is too large.', status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    content_type = (upload.content_type or '').split(';')[0].strip().lower()
    if content_type not in ALLOWED_VIDEO_TYPES or not _sniff_video(upload):
        return _error('Unsupported video format. Use WebM, MP4 or QuickTime.',
                      status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

    try:
        sequence = int(request.data.get('chunk_number'))
        if sequence < 1:
            raise ValueError
    except (TypeError, ValueError):
        sequence = None
    try:
        duration = float(request.data.get('duration'))
        duration = duration if 0 < duration < 3600 else None
    except (TypeError, ValueError):
        duration = None

    existing = None
    if sequence is not None:
        existing = SOSVideoFeed.objects.filter(sos_alert=alert, chunk_sequence=sequence).first()
    if existing:  # idempotent retry of an upload whose response was lost
        return Response({'success': True, 'duplicate': True, 'feed_id': existing.id,
                         'chunk_sequence': existing.chunk_sequence})

    upload.name = f'chunk.{VIDEO_EXTENSIONS[content_type]}'
    try:
        with transaction.atomic():
            locked = SOSAlert.objects.select_for_update().get(pk=alert.pk)
            if sequence is None:
                sequence = (locked.video_feeds.aggregate(m=Max('chunk_sequence'))['m'] or 0) + 1
            feed = SOSVideoFeed.objects.create(
                sos_alert=locked, video_file=upload, content_type=content_type,
                file_size=upload.size, duration=duration, chunk_sequence=sequence,
            )
            updates = {'video_chunks_count': F('video_chunks_count') + 1, 'is_streaming': True}
            if locked.camera_feed_started is None:
                updates['camera_feed_started'] = timezone.now()
            SOSAlert.objects.filter(pk=locked.pk).update(**updates)
    except IntegrityError:
        feed = SOSVideoFeed.objects.get(sos_alert=alert, chunk_sequence=sequence)
        return Response({'success': True, 'duplicate': True, 'feed_id': feed.id,
                         'chunk_sequence': feed.chunk_sequence})

    return Response({'success': True, 'duplicate': False, 'feed_id': feed.id,
                     'chunk_sequence': feed.chunk_sequence}, status=status.HTTP_201_CREATED)


# ============================================================ video viewing

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsResponderOrSuperAdmin])
def get_emergency_video_feeds(request, sos_id):
    alert = get_object_or_404(SOSAlert.objects.select_related('user', 'resolved_by'), id=sos_id)
    if not access.can_view_media(request, alert):
        return _forbidden()
    feeds = list(alert.video_feeds.all())
    viewed = set(PoliceVideoView.objects.filter(police_officer=request.user, video_feed__in=feeds)
                 .values_list('video_feed_id', flat=True))
    return Response({
        'sos_id': alert.id,
        'emergency_info': serializers.alert_detail(alert, include_user=True),
        'video_feeds': [serializers.video_feed(request, f, viewed) for f in feeds],
        'total_chunks': len(feeds),
        'url_expires_in': serializers.VIDEO_URL_MAX_AGE,
    })


@require_GET
def stream_video(request, feed_id):
    """
    Serve a private video chunk to holders of a valid, unexpired signed URL.
    Plain Django view (no DRF auth/content negotiation) so `<video src>` works.
    """
    invalid = JsonResponse({'error': 'This video link is invalid or has expired.'}, status=403)
    try:
        signed_id = serializers.unsign_video(request.GET.get('sig', ''))
    except signing.BadSignature:  # includes SignatureExpired
        return invalid
    if signed_id != str(feed_id):
        return invalid
    feed = get_object_or_404(SOSVideoFeed, id=feed_id)
    try:
        handle = feed.video_file.open('rb')
    except FileNotFoundError:
        raise Http404('Video file missing')
    response = FileResponse(handle, content_type=feed.content_type)
    response['Cache-Control'] = 'private, max-age=600'
    response['X-Content-Type-Options'] = 'nosniff'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsResponderOrSuperAdmin])
def mark_video_viewed(request, video_feed_id):
    feed = get_object_or_404(SOSVideoFeed.objects.select_related('sos_alert'), id=video_feed_id)
    if not access.can_view_media(request, feed.sos_alert):
        return _forbidden()
    try:
        duration = max(0, int(request.data.get('viewing_duration') or 0))
    except (TypeError, ValueError):
        duration = 0
    view, created = PoliceVideoView.objects.get_or_create(
        video_feed=feed, police_officer=request.user, defaults={'viewing_duration': duration})
    if not created and duration:
        view.viewing_duration = duration
        view.save(update_fields=['viewing_duration'])
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsResponderOrSuperAdmin])
def get_police_video_feeds(request):
    """Active SOS alerts (in the caller's scope) that have video. Read-only."""
    qs = (access.responder_queryset(request.user)
          .filter(is_active=True, video_feeds__isnull=False)
          .select_related('user')
          .annotate(total_chunks=Count('video_feeds', distinct=True),
                    latest_chunk_at=Max('video_feeds__timestamp'))
          .order_by('-latest_chunk_at'))
    return Response({'results': [{
        'sos_id': a.id,
        'emergency_type': a.emergency_type,
        'department': a.department,
        'latitude': a.latitude,
        'longitude': a.longitude,
        'user_name': serializers.display_name(a.user),
        'created_at': serializers.iso(a.created_at),
        'camera_feed_started': serializers.iso(a.camera_feed_started),
        'total_chunks': a.total_chunks,
        'latest_chunk_at': serializers.iso(a.latest_chunk_at),
    } for a in qs]})


# ============================================================ responding

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_sos(request):
    """Verified volunteers (alerted or within 10 km) and department responders."""
    user = request.user
    try:
        sos_id = int(request.data.get('sos_id'))
    except (TypeError, ValueError):
        return _error('sos_id is required.')
    alert = get_object_or_404(SOSAlert, id=sos_id)
    if not alert.is_active:
        return _error('This SOS alert has already been resolved.', status.HTTP_409_CONFLICT)
    message = (request.data.get('message') or '').strip()[:500] or None

    lat = lng = None
    if request.data.get('latitude') not in (None, ''):
        try:
            lat, lng = parse_lat_lng(request.data.get('latitude'), request.data.get('longitude'))
        except (TypeError, ValueError):
            return _error('Invalid latitude/longitude.')

    if access.is_staff_viewer(user):
        if not access.responder_can_access(user, alert):
            return _forbidden()
        services.notify_owner(alert, 'Help is on the way',
                              f'{roles.ROLE_LABELS.get(user.role, "A responder")} is responding to your SOS.')
        return Response({'success': True, 'message': 'Response recorded. The person in need has been notified.'})

    if not roles.is_volunteer(user):
        return _error('Only volunteers and department staff can respond to SOS alerts.', status.HTTP_403_FORBIDDEN)
    volunteer = access.verified_volunteer(user)
    if volunteer is None:
        return _error('Your volunteer profile is not verified yet.', status.HTTP_403_FORBIDDEN)
    if alert.user_id == user.id:
        return _error('You cannot respond to your own SOS.')

    record = VolunteerAlert.objects.filter(sos_alert=alert, volunteer=volunteer).first()
    origin = (lat, lng) if lat is not None else (volunteer.current_latitude, volunteer.current_longitude)
    distance = None
    if origin[0] is not None and origin[1] is not None:
        distance = haversine_m(origin[0], origin[1], alert.latitude, alert.longitude)
    if record is None and (distance is None or distance > VOLUNTEER_MAX_RADIUS_M):
        return _error('You can only respond to SOS alerts near you.', status.HTTP_403_FORBIDDEN)
    if record is not None and record.responded:
        return _error('You have already responded to this SOS alert.')

    now = timezone.now()
    with transaction.atomic():
        if record is None:
            record = VolunteerAlert(sos_alert=alert, volunteer=volunteer)
        record.responded = True
        record.response_time = now
        record.status = 'responding'
        record.message = message
        if distance is not None:
            record.distance = round(distance, 1)
        record.save()
        if lat is not None:
            volunteer.current_latitude, volunteer.current_longitude = lat, lng
            volunteer.last_location_update = now
            volunteer.save(update_fields=['current_latitude', 'current_longitude', 'last_location_update'])
        services.notify_owner(alert, 'A volunteer is coming to help', message or '')
    return Response({'success': True, 'message': 'You are registered as responding to this SOS.'})


# ============================================================ volunteers

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_volunteer_status(request):
    volunteer = access.verified_volunteer(request.user)
    if volunteer is None:
        return Response({'is_volunteer': False, 'is_available': False, 'is_verified': False, 'response_count': 0})
    return Response({
        'is_volunteer': True,
        'is_available': volunteer.is_available,
        'is_verified': volunteer.is_verified,
        'response_count': volunteer.alerts.filter(responded=True).count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def volunteer_availability_view(request):
    volunteer = access.verified_volunteer(request.user)
    if volunteer is None:
        return _error('Only approved volunteers can change availability.', status.HTTP_403_FORBIDDEN)
    is_available = _as_bool(request.data.get('is_available', False))
    if is_available:
        try:
            lat, lng = parse_lat_lng(request.data.get('latitude'), request.data.get('longitude'))
        except (TypeError, ValueError):
            return _error('Your current location is required to become available.')
        volunteer.current_latitude, volunteer.current_longitude = lat, lng
        volunteer.last_location_update = timezone.now()
    else:
        volunteer.current_latitude = volunteer.current_longitude = None
        volunteer.last_location_update = None
    volunteer.is_available = is_available
    volunteer.save(update_fields=['is_available', 'current_latitude', 'current_longitude',
                                  'last_location_update'])
    return Response({'success': True, 'is_available': volunteer.is_available})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_volunteer_responses(request):
    qs = (VolunteerAlert.objects.filter(volunteer__user=request.user)
          .select_related('sos_alert').order_by('-alerted_at')[:100])
    return Response({'results': [serializers.volunteer_response(a) for a in qs]})


# ============================================================ safe locations

@api_view(['POST'])
@permission_classes([AllowAny])
def find_nearest_safe_location(request):
    """Nearest hospitals / police stations (public facility data)."""
    from safety.models import Hospital, PoliceStation

    try:
        lat, lng = parse_lat_lng(request.data.get('latitude'), request.data.get('longitude'))
    except (TypeError, ValueError):
        return _error('Valid latitude and longitude are required.')
    radius = clamp_radius(request.data.get('radius'), default=10_000)
    bbox = bbox_filter(bounding_box(lat, lng, radius))

    locations = []
    for model, kind in ((Hospital, 'hospital'), (PoliceStation, 'police')):
        for place in model.objects.filter(**bbox):
            distance = haversine_m(lat, lng, place.latitude, place.longitude)
            if distance <= radius:
                locations.append({
                    'id': place.id,
                    'name': place.name,
                    'type': kind,
                    'latitude': place.latitude,
                    'longitude': place.longitude,
                    'address': place.address or '',
                    'contact_number': place.contact_number or '',
                    'distance': round(distance),
                })
    locations.sort(key=lambda loc: loc['distance'])
    return Response({
        'nearest_location': locations[0] if locations else None,
        'all_locations': locations[:5],
        'search_radius': radius,
    })
