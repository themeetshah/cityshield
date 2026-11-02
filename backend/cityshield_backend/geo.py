"""Shared geographic helpers. Distances are in METRES everywhere."""
import math

EARTH_RADIUS_M = 6_371_000
MAX_RADIUS_M = 50_000  # hard cap on any user-supplied search radius


def haversine_m(lat1, lng1, lat2, lng2):
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return EARTH_RADIUS_M * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bounding_box(lat, lng, radius_m):
    lat_offset = radius_m / 111_000
    lng_offset = radius_m / (111_000 * max(math.cos(math.radians(lat)), 1e-6))
    return {
        'min_lat': lat - lat_offset,
        'max_lat': lat + lat_offset,
        'min_lng': lng - lng_offset,
        'max_lng': lng + lng_offset,
    }


def bbox_filter(bbox, lat_field='latitude', lng_field='longitude'):
    """kwargs for queryset.filter(**bbox_filter(bbox))."""
    return {
        f'{lat_field}__gte': bbox['min_lat'],
        f'{lat_field}__lte': bbox['max_lat'],
        f'{lng_field}__gte': bbox['min_lng'],
        f'{lng_field}__lte': bbox['max_lng'],
    }


def parse_lat_lng(lat, lng):
    """Return (lat, lng) floats or raise ValueError for missing/out-of-range values."""
    if lat in (None, '') or lng in (None, ''):
        raise ValueError('latitude and longitude are required')
    lat, lng = float(lat), float(lng)
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise ValueError('latitude/longitude out of range')
    return lat, lng


def clamp_radius(value, default=5000, maximum=MAX_RADIUS_M):
    try:
        radius = float(value) if value not in (None, '') else default
    except (TypeError, ValueError):
        radius = default
    return max(1.0, min(radius, maximum))
