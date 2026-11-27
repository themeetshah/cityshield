"""Keep police stations / hospitals in step with OpenStreetMap.

* `sync_bbox()` upserts every facility inside an area by its OSM id, so a
  facility that moved or was renamed in OSM is *updated* (not duplicated), and
  one that disappeared from OSM is deactivated (hidden, never hard-deleted,
  because police users and patrol teams may reference the station).
* `ensure_fresh()` is called by map endpoints: if the ~25 km tile around a point
  has never been synced (or is older than FACILITY_REFRESH_DAYS) it starts a
  background sync. The request itself only ever reads the database, so map
  loads never wait on - or show errors from - OpenStreetMap.
"""
import logging
import math
import threading
from datetime import timedelta

from django.conf import settings
from django.db import close_old_connections, connection, transaction
from django.utils import timezone

from cityshield_backend.geo import bounding_box, haversine_m

from . import overpass
from .models import FacilitySyncArea, Hospital, PoliceStation

logger = logging.getLogger(__name__)

TILE_DEG = 0.25                      # ~27 km tiles for automatic refresh
RETRY_AFTER = timedelta(minutes=30)  # don't hammer Overpass after a failure
LEGACY_MATCH_M = 60                  # adopt an older row without OSM id within this distance
UPDATABLE_FIELDS = ('name', 'latitude', 'longitude', 'address', 'contact_number')
_running = set()
_running_lock = threading.Lock()


def _upsert(model, items, bbox, now):
    """Insert/update `items` for one model. Returns (created, updated, deactivated)."""
    south, west, north, east = bbox
    pad = 0.01
    existing = list(model.objects.filter(
        latitude__gte=south - pad, latitude__lte=north + pad,
        longitude__gte=west - pad, longitude__lte=east + pad,
    ))
    by_osm = {(row.osm_type, row.osm_id): row for row in existing if row.osm_id is not None}
    legacy = [row for row in existing if row.osm_id is None]
    created = updated = 0

    for item in items:
        key = (item['osm_type'], item['osm_id'])
        row = by_osm.get(key)
        if row is None and legacy:
            # Adopt a row saved before OSM ids were tracked (keeps FKs such as user.police_station).
            nearest = min(legacy, key=lambda r: haversine_m(r.latitude, r.longitude, item['latitude'], item['longitude']))
            if haversine_m(nearest.latitude, nearest.longitude, item['latitude'], item['longitude']) <= LEGACY_MATCH_M:
                row = nearest
                legacy.remove(nearest)
        fields = {f: item[f] for f in UPDATABLE_FIELDS}
        if model is Hospital:
            fields['hospital_type'] = item['hospital_type']
        for f in ('city', 'state'):
            if item[f]:
                fields[f] = item[f]

        if row is None:
            row = model.objects.create(
                osm_type=item['osm_type'], osm_id=item['osm_id'], source='openstreetmap',
                is_active=True, last_seen_at=now, **fields)
            by_osm[key] = row
            created += 1
            continue

        changed = [f for f, v in fields.items() if getattr(row, f) != v]
        for f in changed:
            setattr(row, f, fields[f])
        row.osm_type, row.osm_id, row.source = item['osm_type'], item['osm_id'], 'openstreetmap'
        row.is_active = True
        row.last_seen_at = now
        row.save()
        updated += int(bool(changed))

    # OSM rows inside the area that this sync did not see were removed from OSM.
    deactivated = model.objects.filter(
        osm_id__isnull=False, is_active=True,
        latitude__gte=south, latitude__lte=north, longitude__gte=west, longitude__lte=east,
    ).exclude(last_seen_at=now).update(is_active=False)
    return created, updated, deactivated


def sync_bbox(south, west, north, east, *, key, label=''):
    """Fetch and store every facility inside the bbox. Returns a summary dict; raises OverpassError."""
    area, _ = FacilitySyncArea.objects.get_or_create(
        key=key, defaults={'label': label, 'south': south, 'west': west, 'north': north, 'east': east})
    area.last_attempt_at = timezone.now()
    area.save(update_fields=['last_attempt_at'])
    try:
        data = overpass.fetch_bbox(south, west, north, east)
    except overpass.OverpassError as exc:
        area.last_error = str(exc)[:300]
        area.save(update_fields=['last_error'])
        raise

    now = timezone.now()
    bbox = (south, west, north, east)
    with transaction.atomic():
        p_created, p_updated, p_gone = _upsert(PoliceStation, data['police_stations'], bbox, now)
        h_created, h_updated, h_gone = _upsert(Hospital, data['hospitals'], bbox, now)
    area.label = label or area.label
    area.last_success_at = now
    area.last_error = ''
    area.police_count = len(data['police_stations'])
    area.hospital_count = len(data['hospitals'])
    area.save()
    summary = {
        'area': area.label or key,
        'police_stations': {'found': len(data['police_stations']), 'created': p_created,
                            'updated': p_updated, 'deactivated': p_gone},
        'hospitals': {'found': len(data['hospitals']), 'created': h_created,
                      'updated': h_updated, 'deactivated': h_gone},
    }
    logger.info('Facility sync %s: %s', key, summary)
    return summary


def sync_around(lat, lng, radius_m, label=''):
    bbox = bounding_box(lat, lng, radius_m)
    return sync_bbox(bbox['min_lat'], bbox['min_lng'], bbox['max_lat'], bbox['max_lng'],
                     key=f'around:{lat:.3f}:{lng:.3f}:{int(radius_m)}', label=label or 'Area around a point')


def sync_place(name):
    (south, west, north, east), display = overpass.geocode_area(name)
    return sync_bbox(south, west, north, east, key=f'place:{name.strip().lower()}', label=display)


def _tile(lat, lng):
    ty, tx = math.floor(lat / TILE_DEG), math.floor(lng / TILE_DEG)
    south, west = ty * TILE_DEG, tx * TILE_DEG
    return f'tile:{ty}:{tx}', (south, west, south + TILE_DEG, west + TILE_DEG)


def _run_in_background(key, bbox):
    def target():
        close_old_connections()
        try:
            sync_bbox(*bbox, key=key, label=f'Auto-sync tile {key}')
        except Exception:  # logged; next attempt after RETRY_AFTER
            logger.exception('Background facility sync failed for %s', key)
        finally:
            with _running_lock:
                _running.discard(key)
            connection.close()

    threading.Thread(target=target, name=f'facility-sync-{key}', daemon=True).start()


def ensure_fresh(lat, lng):
    """Start a background sync for the tile around (lat, lng) if it is missing or stale.

    Returns True when a sync is running for this tile (so the UI can say so).
    """
    if not settings.FACILITY_AUTO_SYNC:
        return False
    key, bbox = _tile(lat, lng)
    with _running_lock:
        if key in _running:
            return True
    area = FacilitySyncArea.objects.filter(key=key).first()
    now = timezone.now()
    if area and area.last_success_at and now - area.last_success_at < timedelta(days=settings.FACILITY_REFRESH_DAYS):
        return False
    if area and area.last_attempt_at and now - area.last_attempt_at < RETRY_AFTER:
        return False
    with _running_lock:
        if key in _running:
            return True
        _running.add(key)
    _run_in_background(key, bbox)
    return True
