"""OpenStreetMap Overpass client for hospitals and police stations.

Results are cached per ~1 km cell and radius bucket for 6 hours so a map load
never waits on Overpass more than once per area. Failures never raise: callers
get empty lists plus a human readable warning.
"""
import logging
import math

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
CACHE_SECONDS = 6 * 60 * 60
FAILURE_CACHE_SECONDS = 2 * 60
MAX_OVERPASS_RADIUS_M = 15_000
RADIUS_BUCKET_M = 1_000
UNAVAILABLE_WARNING = 'OpenStreetMap facility data is temporarily unavailable; showing saved facilities only.'


def _element_coordinates(element):
    if element.get('type') == 'node':
        return element.get('lat'), element.get('lon')
    center = element.get('center') or {}
    return center.get('lat'), center.get('lon')


def _address(tags):
    parts = [
        tags.get('addr:housenumber'), tags.get('addr:street'), tags.get('addr:suburb'),
        tags.get('addr:city'), tags.get('addr:postcode'),
    ]
    return ', '.join(p for p in parts if p)


def parse_elements(data):
    """Overpass JSON -> {'hospitals': [...], 'police_stations': [...]} (plain dicts)."""
    result = {'hospitals': [], 'police_stations': []}
    for element in data.get('elements', []):
        lat, lng = _element_coordinates(element)
        if lat is None or lng is None:
            continue
        tags = element.get('tags', {})
        amenity = tags.get('amenity')
        if amenity not in ('hospital', 'police'):
            continue
        facility_type = 'hospital' if amenity == 'hospital' else 'police'
        result['hospitals' if facility_type == 'hospital' else 'police_stations'].append({
            'id': f"osm-{element.get('type')}-{element.get('id')}",
            'name': tags.get('name') or tags.get('name:en') or (
                'Hospital (unnamed)' if facility_type == 'hospital' else 'Police station (unnamed)'
            ),
            'latitude': float(lat),
            'longitude': float(lng),
            'address': _address(tags),
            'contact_number': (tags.get('phone') or tags.get('contact:phone') or '')[:20],
            'hospital_type': tags.get('healthcare', '') if facility_type == 'hospital' else '',
            'type': facility_type,
            'source': 'openstreetmap',
        })
    return result


def _query(lat, lng, radius):
    around = f'(around:{int(radius)},{lat},{lng})'
    timeout = int(settings.EXTERNAL_HTTP_TIMEOUT)
    return (
        f'[out:json][timeout:{timeout}];('
        f'node["amenity"="hospital"]{around};way["amenity"="hospital"]{around};'
        f'node["amenity"="police"]{around};way["amenity"="police"]{around};'
        ');out center tags;'
    )


def fetch_raw(lat, lng, radius):
    """Uncached Overpass request. Returns (data, warning)."""
    try:
        response = requests.post(
            OVERPASS_URL,
            data={'data': _query(lat, lng, radius)},
            headers={'User-Agent': settings.OSM_USER_AGENT},
            timeout=settings.EXTERNAL_HTTP_TIMEOUT,
        )
        response.raise_for_status()
        return parse_elements(response.json()), None
    except (requests.RequestException, ValueError) as exc:
        logger.warning('Overpass request failed: %s', type(exc).__name__)
        return {'hospitals': [], 'police_stations': []}, UNAVAILABLE_WARNING


def fetch_facilities(lat, lng, radius):
    """Cached facilities covering `radius` metres around (lat, lng). Returns (data, warning).

    The query is made around a rounded centre with a padded radius so that
    nearby users share one cache entry; callers filter by exact distance.
    """
    radius = min(radius, MAX_OVERPASS_RADIUS_M)
    center_lat, center_lng = round(lat, 2), round(lng, 2)
    # Rounding to 0.01 deg moves the centre by at most ~800 m.
    padded = math.ceil((radius + 800) / RADIUS_BUCKET_M) * RADIUS_BUCKET_M
    cache_key = f'overpass:{center_lat:.2f}:{center_lng:.2f}:{padded}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached['data'], cached['warning']

    data, warning = fetch_raw(center_lat, center_lng, padded)
    cache.set(cache_key, {'data': data, 'warning': warning},
              FAILURE_CACHE_SECONDS if warning else CACHE_SECONDS)
    return data, warning
