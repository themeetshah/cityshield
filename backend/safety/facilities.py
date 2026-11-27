"""Nearby hospitals / police stations - read from the database only.

The database is kept current from OpenStreetMap by `safety.sync` (background
tile refresh + `manage.py sync_facilities`), so map requests never call
OpenStreetMap directly and can't fail because of it.
"""
from cityshield_backend.geo import bbox_filter, bounding_box, haversine_m

from . import sync
from .models import FacilitySyncArea, Hospital, PoliceStation

MAX_FACILITIES_PER_TYPE = 100


def _as_dict(obj, facility_type, distance):
    return {
        'id': obj.id,
        'name': obj.name,
        'latitude': obj.latitude,
        'longitude': obj.longitude,
        'address': obj.address,
        'contact_number': obj.contact_number,
        'hospital_type': getattr(obj, 'hospital_type', ''),
        'type': facility_type,
        'source': obj.source,
        'distance': round(distance),
    }


def _nearby(model, facility_type, lat, lng, radius, limit):
    rows = model.objects.filter(is_active=True, **bbox_filter(bounding_box(lat, lng, radius)))
    items = []
    for row in rows:
        distance = haversine_m(lat, lng, row.latitude, row.longitude)
        if distance <= radius:
            items.append(_as_dict(row, facility_type, distance))
    items.sort(key=lambda f: f['distance'])
    return items[:limit]


def nearby_facilities(lat, lng, radius, limit=MAX_FACILITIES_PER_TYPE):
    """{'hospitals', 'police_stations', 'sources', 'warnings', 'syncing', 'last_synced_at'}."""
    syncing = sync.ensure_fresh(lat, lng)
    key, _ = sync._tile(lat, lng)
    area = FacilitySyncArea.objects.filter(key=key).only('last_success_at').first()
    hospitals = _nearby(Hospital, 'hospital', lat, lng, radius, limit)
    police = _nearby(PoliceStation, 'police', lat, lng, radius, limit)
    warnings = []
    if syncing and not hospitals and not police:
        warnings.append('Loading hospitals and police stations for this area - they will appear shortly.')
    return {
        'hospitals': hospitals,
        'police_stations': police,
        'sources': ['openstreetmap'],
        'warnings': warnings,
        'syncing': syncing,
        'last_synced_at': area.last_success_at if area else None,
    }
