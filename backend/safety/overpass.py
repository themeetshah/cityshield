"""OpenStreetMap clients used by the facility sync (never called during page loads).

* Overpass: police stations + hospitals inside a bounding box, trying several
  public mirrors because any single one is frequently slow or overloaded.
* Nominatim: resolve a city name ("Ahmedabad") to a bounding box.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
]
NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
MAX_OVERPASS_RADIUS_M = 15_000


class OverpassError(Exception):
    """All mirrors failed."""


def _headers():
    return {'User-Agent': settings.OSM_USER_AGENT}


def _element_coordinates(element):
    if element.get('type') == 'node':
        return element.get('lat'), element.get('lon')
    center = element.get('center') or {}
    return center.get('lat'), center.get('lon')


def _address(tags):
    if tags.get('addr:full'):
        return tags['addr:full']
    parts = [
        tags.get('addr:housenumber'), tags.get('addr:street'), tags.get('addr:suburb'),
        tags.get('addr:city'), tags.get('addr:postcode'),
    ]
    return ', '.join(p for p in parts if p)


def _facility_type(tags):
    if tags.get('amenity') == 'police':
        return 'police'
    if tags.get('amenity') == 'hospital' or tags.get('healthcare') == 'hospital':
        return 'hospital'
    return None


def parse_elements(data):
    """Overpass JSON -> {'hospitals': [...], 'police_stations': [...]} with OSM identity."""
    result = {'hospitals': [], 'police_stations': []}
    seen = set()
    for element in data.get('elements', []):
        identity = (element.get('type'), element.get('id'))
        if identity in seen:
            continue
        seen.add(identity)
        lat, lng = _element_coordinates(element)
        tags = element.get('tags', {})
        facility_type = _facility_type(tags)
        if lat is None or lng is None or facility_type is None:
            continue
        name = tags.get('name:en') or tags.get('name') or tags.get('official_name')
        result['hospitals' if facility_type == 'hospital' else 'police_stations'].append({
            'osm_type': element.get('type'),
            'osm_id': int(element.get('id')),
            'name': (name or ('Hospital' if facility_type == 'hospital' else 'Police station'))[:200],
            'latitude': float(lat),
            'longitude': float(lng),
            'address': _address(tags),
            'city': (tags.get('addr:city') or '')[:100],
            'state': (tags.get('addr:state') or '')[:100],
            'contact_number': (tags.get('phone') or tags.get('contact:phone') or '')[:20],
            'hospital_type': (tags.get('healthcare:speciality') or tags.get('operator:type') or '')[:100]
            if facility_type == 'hospital' else '',
            'type': facility_type,
        })
    return result


def bbox_query(south, west, north, east, timeout):
    box = f'({south},{west},{north},{east})'
    return (
        f'[out:json][timeout:{int(timeout)}];('
        f'nwr["amenity"="police"]{box};'
        f'nwr["amenity"="hospital"]{box};'
        f'nwr["healthcare"="hospital"]{box};'
        ');out center tags;'
    )


def fetch_bbox(south, west, north, east, timeout=None):
    """Facilities inside the bbox. Tries each mirror in turn; raises OverpassError if all fail."""
    timeout = int(timeout or settings.OVERPASS_SYNC_TIMEOUT)
    query = bbox_query(south, west, north, east, timeout)
    failures = []
    for url in OVERPASS_MIRRORS:
        try:
            response = requests.post(url, data={'data': query}, headers=_headers(), timeout=timeout + 10)
            response.raise_for_status()
            data = response.json()
            if data.get('remark') and 'runtime error' in data['remark'].lower():
                raise ValueError(data['remark'][:120])
            return parse_elements(data)
        except (requests.RequestException, ValueError) as exc:
            logger.warning('Overpass mirror %s failed: %s', url, exc.__class__.__name__)
            failures.append(f'{url.split("/")[2]}: {exc.__class__.__name__}')
    raise OverpassError('All Overpass mirrors failed (' + '; '.join(failures) + ')')


def geocode_area(name):
    """Bounding box (south, west, north, east) and display name for a place name, via Nominatim."""
    response = requests.get(
        NOMINATIM_SEARCH_URL,
        params={'q': name, 'format': 'json', 'limit': 1},
        headers=_headers(),
        timeout=settings.EXTERNAL_HTTP_TIMEOUT,
    )
    response.raise_for_status()
    results = response.json()
    if not results:
        raise ValueError(f'No place found for "{name}"')
    south, north, west, east = (float(v) for v in results[0]['boundingbox'])
    return (south, west, north, east), results[0].get('display_name', name)
