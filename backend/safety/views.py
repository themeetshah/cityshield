import logging

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from cityshield_backend.geo import clamp_radius, haversine_m, parse_lat_lng
from cityshield_backend.throttles import UploadThrottle
from users.permissions import IsSuperAdmin

from . import overpass, risk, sync
from .facilities import nearby_facilities as collect_facilities
from .importers import FacilityImportError, import_hospitals, import_police_stations, read_csv_text
from .models import Hospital, PoliceStation, SafetyZone
from .serializers import HospitalSerializer, PoliceStationSerializer, SafetyZoneSerializer

logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200
FACILITY_DEFAULT_RADIUS_M = 5000
RISK_DEFAULT_RADIUS_M = 3000
ANALYSIS_DEFAULT_RADIUS_M = 1000
SYNC_DEFAULT_RADIUS_M = 10_000
MAX_CSV_BYTES = 5 * 1024 * 1024


class BadRequest(Exception):
    pass


def _point(request, default_radius, max_radius):
    """(lat, lng, radius) from query params (GET) or body (POST); radius is clamped."""
    source = request.query_params if request.method == 'GET' else request.data
    try:
        lat, lng = parse_lat_lng(source.get('latitude'), source.get('longitude'))
    except (TypeError, ValueError):
        raise BadRequest
    return lat, lng, clamp_radius(source.get('radius'), default=default_radius, maximum=max_radius)


def _bad_point():
    return Response({'error': 'Valid latitude and longitude are required.'}, status=status.HTTP_400_BAD_REQUEST)


def _paginate(request, queryset, serializer_class, key):
    try:
        limit = max(1, min(int(request.query_params.get('limit', DEFAULT_PAGE_SIZE)), MAX_PAGE_SIZE))
        offset = max(0, int(request.query_params.get('offset', 0)))
    except ValueError:
        return Response({'error': 'limit and offset must be integers.'}, status=status.HTTP_400_BAD_REQUEST)
    count = queryset.count()
    return Response({
        'count': count,
        key: serializer_class(queryset[offset:offset + limit], many=True).data,
        'limit': limit,
        'offset': offset,
    })


def _text_filters(request, queryset):
    params = request.query_params
    if params.get('state'):
        queryset = queryset.filter(state__icontains=params['state'])
    if params.get('city'):
        queryset = queryset.filter(city__icontains=params['city'])
    if params.get('search'):
        queryset = queryset.filter(Q(name__icontains=params['search']) | Q(address__icontains=params['search']))
    return queryset


# ---------------------------------------------------------------- facilities (read: any authenticated user)

@api_view(['GET'])
def list_police_stations(request):
    return _paginate(request, _text_filters(request, PoliceStation.objects.filter(is_active=True)),
                     PoliceStationSerializer, 'police_stations')


@api_view(['GET'])
def get_police_station(request, station_id):
    return Response(PoliceStationSerializer(get_object_or_404(PoliceStation, pk=station_id)).data)


@api_view(['GET'])
def list_hospitals(request):
    hospitals = _text_filters(request, Hospital.objects.filter(is_active=True))
    if request.query_params.get('hospital_type'):
        hospitals = hospitals.filter(hospital_type__icontains=request.query_params['hospital_type'])
    return _paginate(request, hospitals, HospitalSerializer, 'hospitals')


@api_view(['GET'])
def get_hospital(request, hospital_id):
    return Response(HospitalSerializer(get_object_or_404(Hospital, pk=hospital_id)).data)


@api_view(['GET', 'POST'])
def nearby_facilities(request):
    """Hospitals + police stations near a point (database, plus cached OpenStreetMap data)."""
    try:
        lat, lng, radius = _point(request, FACILITY_DEFAULT_RADIUS_M, overpass.MAX_OVERPASS_RADIUS_M)
    except BadRequest:
        return _bad_point()
    data = collect_facilities(lat, lng, radius)
    return Response({
        **data,
        'total_hospitals': len(data['hospitals']),
        'total_police': len(data['police_stations']),
        'search_radius': round(radius),
    })


@api_view(['GET'])
def nearby_police_stations(request):
    try:
        lat, lng, radius = _point(request, FACILITY_DEFAULT_RADIUS_M, overpass.MAX_OVERPASS_RADIUS_M)
    except BadRequest:
        return _bad_point()
    data = collect_facilities(lat, lng, radius)
    return Response({'count': len(data['police_stations']), 'police_stations': data['police_stations'],
                     'sources': data['sources'], 'warnings': data['warnings']})


@api_view(['GET'])
def nearby_hospitals(request):
    try:
        lat, lng, radius = _point(request, FACILITY_DEFAULT_RADIUS_M, overpass.MAX_OVERPASS_RADIUS_M)
    except BadRequest:
        return _bad_point()
    data = collect_facilities(lat, lng, radius)
    return Response({'count': len(data['hospitals']), 'hospitals': data['hospitals'],
                     'sources': data['sources'], 'warnings': data['warnings']})


# ---------------------------------------------------------------- heuristic risk (any authenticated user)

@api_view(['GET'])
def risk_grid(request):
    try:
        lat, lng, radius = _point(request, RISK_DEFAULT_RADIUS_M, risk.MAX_GRID_RADIUS_M)
    except BadRequest:
        return _bad_point()
    cells = risk.risk_grid(lat, lng, radius, risk.load_incidents(lat, lng, radius))
    return Response({
        'cells': cells,
        'total_cells': len(cells),
        'grid_size_m': risk.GRID_CELL_M,
        'search_radius': round(radius),
        'method': risk.METHOD,
        'explanation': risk.EXPLANATION,
    })


@api_view(['GET'])
def risk_zones(request):
    """Clusters of recent incidents, plus zones defined by a superadmin."""
    try:
        lat, lng, radius = _point(request, RISK_DEFAULT_RADIUS_M, risk.MAX_GRID_RADIUS_M)
    except BadRequest:
        return _bad_point()
    zones = risk.incident_zones(lat, lng, radius, risk.load_incidents(lat, lng, radius))
    official = [
        zone for zone in SafetyZoneSerializer(SafetyZone.objects.all(), many=True).data
        if haversine_m(lat, lng, zone['center_latitude'], zone['center_longitude']) <= radius + zone['radius']
    ]
    return Response({
        'zones': zones,
        'official_zones': official,
        'search_radius': round(radius),
        'method': risk.METHOD,
        'explanation': risk.EXPLANATION,
    })


@api_view(['GET', 'POST'])
def analyze_area_risk(request):
    try:
        lat, lng, radius = _point(request, ANALYSIS_DEFAULT_RADIUS_M, risk.MAX_GRID_RADIUS_M)
    except BadRequest:
        return _bad_point()
    summary = risk.area_summary(lat, lng, radius, risk.load_incidents(lat, lng, radius))
    return Response({**summary, 'method': risk.METHOD, 'explanation': risk.EXPLANATION})


# ---------------------------------------------------------------- safety zones

@api_view(['GET'])
def list_safety_zones(request):
    zones = SafetyZone.objects.all().order_by('-created_at')
    if request.query_params.get('zone_type'):
        zones = zones.filter(zone_type=request.query_params['zone_type'])
    return _paginate(request, zones, SafetyZoneSerializer, 'safety_zones')


@api_view(['GET'])
def get_safety_zone(request, zone_id):
    return Response(SafetyZoneSerializer(get_object_or_404(SafetyZone, pk=zone_id)).data)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def create_safety_zone(request):
    serializer = SafetyZoneSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsSuperAdmin])
def update_safety_zone(request, zone_id):
    zone = get_object_or_404(SafetyZone, pk=zone_id)
    serializer = SafetyZoneSerializer(zone, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsSuperAdmin])
def delete_safety_zone(request, zone_id):
    get_object_or_404(SafetyZone, pk=zone_id).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------- data management (superadmin)

def _uploaded_csv(request):
    upload = request.FILES.get('csv_file')
    if upload is None:
        raise FacilityImportError('Upload the CSV as the "csv_file" field.')
    if upload.size > MAX_CSV_BYTES:
        raise FacilityImportError('The CSV file is larger than 5 MB.')
    try:
        return read_csv_text(upload.read().decode('utf-8-sig'))
    except UnicodeDecodeError as exc:
        raise FacilityImportError('The CSV file must be UTF-8 encoded.') from exc


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
@throttle_classes([UploadThrottle])
@parser_classes([MultiPartParser, FormParser])
def import_police_csv(request):
    try:
        counts = import_police_stations(_uploaded_csv(request), source='csv_import')
    except FacilityImportError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'success': True, **counts})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
@throttle_classes([UploadThrottle])
@parser_classes([MultiPartParser, FormParser])
def import_hospitals_csv(request):
    try:
        counts = import_hospitals(_uploaded_csv(request), source='csv_import')
    except FacilityImportError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'success': True, **counts})


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def export_facilities(request):
    include_police = request.query_params.get('include_police', 'true').lower() == 'true'
    include_hospitals = request.query_params.get('include_hospitals', 'true').lower() == 'true'
    data = []
    if include_police:
        data += [{**row, 'type': 'police'} for row in PoliceStationSerializer(PoliceStation.objects.all(), many=True).data]
    if include_hospitals:
        data += [{**row, 'type': 'hospital'} for row in HospitalSerializer(Hospital.objects.all(), many=True).data]
    return Response({'count': len(data), 'data': data})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def sync_facilities_from_overpass(request):
    """Update police stations + hospitals from OpenStreetMap.

    Body: {"place": "Ahmedabad"}  - whole city / district by name, or
          {"latitude", "longitude", "radius"} - area around a point (max 15 km).
    Moved/renamed facilities are updated in place; ones removed from OSM are deactivated.
    """
    place = (request.data.get('place') or '').strip()
    try:
        if place:
            summary = sync.sync_place(place)
        else:
            try:
                lat, lng, radius = _point(request, SYNC_DEFAULT_RADIUS_M, overpass.MAX_OVERPASS_RADIUS_M)
            except BadRequest:
                return _bad_point()
            summary = sync.sync_around(lat, lng, radius)
    except overpass.OverpassError:
        return Response({'error': 'OpenStreetMap servers are busy right now. Please try again in a few minutes.'},
                        status=status.HTTP_502_BAD_GATEWAY)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'success': True, **summary})


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def facility_sync_status(request):
    """When each area was last synced from OpenStreetMap."""
    from .models import FacilitySyncArea
    areas = FacilitySyncArea.objects.order_by('-last_success_at')[:100]
    return Response({'results': [{
        'key': a.key, 'label': a.label, 'last_success_at': a.last_success_at,
        'last_attempt_at': a.last_attempt_at, 'last_error': a.last_error,
        'police_stations': a.police_count, 'hospitals': a.hospital_count,
    } for a in areas]})
