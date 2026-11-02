import logging

import requests
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.serializers import ValidationError

from cityshield_backend.geo import bbox_filter, bounding_box, clamp_radius, haversine_m, parse_lat_lng
from cityshield_backend.throttles import UploadThrottle
from users import roles

from . import privacy
from .media import validate_media_files
from .models import Media, Report
from .permissions import CanFileReport
from .serializers import ReportCreateSerializer, ReportSerializer

logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
NEARBY_DEFAULT_RADIUS_M = 5000
NEARBY_MAX_RESULTS = 200
NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'
GEOCODE_CACHE_SECONDS = 24 * 60 * 60

TRUTHY = {'1', 'true', 'yes', 'on'}


def _int_param(value, default, minimum, maximum):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(number, maximum))


def _base_queryset():
    return Report.objects.select_related('reported_by').prefetch_related('media')


# ---------------------------------------------------------------- create

@api_view(['POST'])
@permission_classes([CanFileReport])
@throttle_classes([UploadThrottle])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def create_report(request):
    """File a new incident report. The reporter is always the authenticated user."""
    serializer = ReportCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    media_files = request.FILES.getlist('media')
    try:
        validate_media_files(media_files)
    except ValidationError as exc:
        return Response({'media': exc.detail}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        report = serializer.save(reported_by=request.user)
        for upload in media_files:
            report.media.add(Media.objects.create(file=upload))

    report = _base_queryset().get(pk=report.pk)
    return Response(ReportSerializer(report, context={'request': request}).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------- read

@api_view(['GET'])
def list_reports(request):
    """Paginated list. Filters: type, status, department, mine=true, limit, offset.

    Responders default to their own department; superadmins see everything
    (or one department with ?department=).
    """
    user = request.user
    params = request.query_params
    reports = _base_queryset()

    if params.get('mine', '').lower() in TRUTHY:
        reports = reports.filter(reported_by=user)

    department = params.get('department')
    if department and department != 'all':
        if department not in roles.DEPARTMENTS:
            return Response({'error': 'Unknown department.'}, status=status.HTTP_400_BAD_REQUEST)
        reports = reports.filter(department=department)
    elif not department and roles.is_responder(user) and 'mine' not in params:
        reports = reports.filter(department=roles.department_of(user))

    report_type = params.get('type')
    if report_type and report_type != 'all':
        reports = reports.filter(report_type=report_type)
    status_filter = params.get('status')
    if status_filter and status_filter != 'all':
        reports = reports.filter(status=status_filter)

    limit = _int_param(params.get('limit'), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE)
    offset = _int_param(params.get('offset'), 0, 0, 10**9)
    count = reports.count()
    page = reports[offset:offset + limit]
    return Response({
        'count': count,
        'reports': ReportSerializer(page, many=True, context={'request': request}).data,
        'limit': limit,
        'offset': offset,
    })


@api_view(['GET'])
def get_report(request, report_id):
    report = get_object_or_404(_base_queryset(), pk=report_id)
    return Response(ReportSerializer(report, context={'request': request}).data)


@api_view(['GET'])
def nearby_reports(request):
    """Reports within `radius` metres of a point, nearest first.

    Distances are computed from the coordinates the caller is allowed to see,
    so the response never leaks more precision than the masked coordinates.
    """
    try:
        lat, lng = parse_lat_lng(request.query_params.get('latitude'), request.query_params.get('longitude'))
    except ValueError:
        return Response({'error': 'Valid latitude and longitude are required.'},
                        status=status.HTTP_400_BAD_REQUEST)
    radius = clamp_radius(request.query_params.get('radius'), default=NEARBY_DEFAULT_RADIUS_M)

    candidates = _base_queryset().filter(**bbox_filter(bounding_box(lat, lng, radius)))
    results = []
    for report in candidates:
        view_lat, view_lng = privacy.viewer_coordinates(request.user, report)
        distance = haversine_m(lat, lng, view_lat, view_lng)
        if distance <= radius:
            results.append((distance, report))
    results.sort(key=lambda item: item[0])
    results = results[:NEARBY_MAX_RESULTS]

    payload = []
    for distance, report in results:
        data = ReportSerializer(report, context={'request': request}).data
        data['distance'] = round(distance)
        payload.append(data)
    return Response({'reports': payload, 'count': len(payload), 'search_radius': round(radius)})


# ---------------------------------------------------------------- geocoding

@api_view(['GET'])
def reverse_geocode(request):
    """Address for a point, via OpenStreetMap Nominatim (cached 24 h per ~11 m cell)."""
    try:
        lat, lng = parse_lat_lng(request.query_params.get('lat'), request.query_params.get('lon'))
    except ValueError:
        return Response({'error': 'Valid lat and lon query parameters are required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    lat, lng = round(lat, 4), round(lng, 4)
    cache_key = f'revgeo:{lat:.4f}:{lng:.4f}'
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    try:
        response = requests.get(
            NOMINATIM_URL,
            params={'format': 'jsonv2', 'lat': lat, 'lon': lng, 'addressdetails': 1, 'accept-language': 'en'},
            headers={'User-Agent': settings.OSM_USER_AGENT},
            timeout=settings.EXTERNAL_HTTP_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning('Reverse geocoding failed: %s', type(exc).__name__)
        return Response({'error': 'Address lookup is unavailable right now.'},
                        status=status.HTTP_502_BAD_GATEWAY)

    result = {'display_name': data.get('display_name', ''), 'address': data.get('address', {})}
    cache.set(cache_key, result, GEOCODE_CACHE_SECONDS)
    return Response(result)
