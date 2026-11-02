"""Nearby hospitals / police stations from the database plus (cached) OpenStreetMap."""
from cityshield_backend.geo import bbox_filter, bounding_box, haversine_m

from . import overpass
from .models import Hospital, PoliceStation

DUPLICATE_DISTANCE_M = 50
MAX_FACILITIES_PER_TYPE = 100


def _db_facility(obj, facility_type):
    return {
        'id': obj.id,
        'name': obj.name,
        'latitude': obj.latitude,
        'longitude': obj.longitude,
        'address': obj.address,
        'contact_number': obj.contact_number,
        'hospital_type': getattr(obj, 'hospital_type', ''),
        'type': facility_type,
        'source': obj.source or 'database',
    }


def _within(items, lat, lng, radius):
    result = []
    for item in items:
        distance = haversine_m(lat, lng, item['latitude'], item['longitude'])
        if distance <= radius:
            result.append({**item, 'distance': round(distance)})
    return result


def _merge(primary, secondary):
    """Database entries win; drop OSM entries within 50 m of one already listed."""
    merged = list(primary)
    for item in secondary:
        if not any(
            haversine_m(item['latitude'], item['longitude'], other['latitude'], other['longitude'])
            < DUPLICATE_DISTANCE_M
            for other in merged
        ):
            merged.append(item)
    merged.sort(key=lambda f: f['distance'])
    return merged[:MAX_FACILITIES_PER_TYPE]


def db_facilities(lat, lng, radius):
    bbox = bbox_filter(bounding_box(lat, lng, radius))
    hospitals = [_db_facility(h, 'hospital') for h in Hospital.objects.filter(**bbox)]
    police = [_db_facility(p, 'police') for p in PoliceStation.objects.filter(**bbox)]
    return _within(hospitals, lat, lng, radius), _within(police, lat, lng, radius)


def nearby_facilities(lat, lng, radius, include_osm=True):
    """{'hospitals', 'police_stations', 'sources', 'warnings'} within `radius` metres."""
    hospitals, police = db_facilities(lat, lng, radius)
    sources = ['database']
    warnings = []
    if include_osm:
        if radius > overpass.MAX_OVERPASS_RADIUS_M:
            warnings.append(
                f'OpenStreetMap data is limited to {overpass.MAX_OVERPASS_RADIUS_M // 1000} km around you.'
            )
        osm, warning = overpass.fetch_facilities(lat, lng, radius)
        if warning:
            warnings.append(warning)
        else:
            sources.append('openstreetmap')
            hospitals = _merge(sorted(hospitals, key=lambda f: f['distance']),
                               _within(osm['hospitals'], lat, lng, radius))
            police = _merge(sorted(police, key=lambda f: f['distance']),
                            _within(osm['police_stations'], lat, lng, radius))
    if 'openstreetmap' not in sources:
        hospitals = sorted(hospitals, key=lambda f: f['distance'])[:MAX_FACILITIES_PER_TYPE]
        police = sorted(police, key=lambda f: f['distance'])[:MAX_FACILITIES_PER_TYPE]
    return {'hospitals': hospitals, 'police_stations': police, 'sources': sources, 'warnings': warnings}
