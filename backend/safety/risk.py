"""Heuristic area risk scores computed from stored incident data.

This is NOT a machine-learning prediction. Each incident contributes
    severity(type) x recency x distance decay
where recency halves every 90 days and the distance decay falls linearly to
zero at 300 m. Inputs: incident reports from the last 365 days (dismissed
reports excluded) and SOS alerts from the last 365 days that are already
resolved (live SOS locations are never exposed through the map).
Absence of data means "no reported incidents", not "safe".
"""
import math
from collections import defaultdict
from datetime import timedelta

from django.utils import timezone

from cityshield_backend.geo import bbox_filter, bounding_box, haversine_m
from reports.models import Report
from sos.models import SOSAlert

METHOD = 'heuristic'
EXPLANATION = (
    'Heuristic score from incidents reported in the last 12 months: each incident is weighted by '
    'type severity, how recent it is (half-life 90 days) and distance (up to 300 m). '
    'It is not a prediction; areas with no data show no score.'
)
LOOKBACK_DAYS = 365
HALF_LIFE_DAYS = 90
INFLUENCE_M = 300
GRID_CELL_M = 250
MAX_GRID_RADIUS_M = 5000
MAX_SCORE = 10.0
CLUSTER_RADIUS_M = 300
MIN_CLUSTER_INCIDENTS = 2
MAX_ZONES = 30

SEVERITY = {
    'sos': 3.0,
    'crime': 3.0,
    'harassment': 3.0,
    'safety': 2.0,
    'fire_hazard': 2.0,
    'medical': 1.0,
    'infrastructure': 1.0,
    'other': 1.0,
}

LEVELS = [(6.0, 'critical'), (3.0, 'high'), (1.0, 'moderate'), (0.0, 'low')]


def level_for(score):
    for threshold, name in LEVELS:
        if score >= threshold:
            return name
    return 'low'


def load_incidents(lat, lng, radius_m, now=None):
    """Incidents (plain dicts) inside the bounding box of radius_m + influence radius. One query per source."""
    now = now or timezone.now()
    since = now - timedelta(days=LOOKBACK_DAYS)
    bbox = bbox_filter(bounding_box(lat, lng, radius_m + INFLUENCE_M))
    incidents = []
    reports = (Report.objects.filter(created_at__gte=since, **bbox)
               .exclude(status='dismissed')
               .values_list('latitude', 'longitude', 'report_type', 'created_at'))
    for r_lat, r_lng, r_type, created in reports:
        incidents.append({'latitude': r_lat, 'longitude': r_lng, 'type': r_type, 'created_at': created})
    alerts = (SOSAlert.objects.filter(created_at__gte=since, is_active=False, **bbox)
              .values_list('latitude', 'longitude', 'created_at'))
    for s_lat, s_lng, created in alerts:
        incidents.append({'latitude': s_lat, 'longitude': s_lng, 'type': 'sos', 'created_at': created})
    for incident in incidents:
        age_days = max((now - incident['created_at']).total_seconds() / 86400, 0)
        incident['weight'] = SEVERITY.get(incident['type'], 1.0) * 0.5 ** (age_days / HALF_LIFE_DAYS)
    return incidents


def risk_grid(lat, lng, radius_m, incidents):
    """Cells of ~250 m with a non-zero score inside radius_m of (lat, lng)."""
    lat_step = GRID_CELL_M / 111_000
    lng_step = GRID_CELL_M / (111_000 * max(math.cos(math.radians(lat)), 1e-6))
    reach = math.ceil(INFLUENCE_M / GRID_CELL_M)
    scores = defaultdict(float)
    counts = defaultdict(int)

    for incident in incidents:
        ci = round((incident['latitude'] - lat) / lat_step)
        cj = round((incident['longitude'] - lng) / lng_step)
        for i in range(ci - reach, ci + reach + 1):
            for j in range(cj - reach, cj + reach + 1):
                c_lat, c_lng = lat + i * lat_step, lng + j * lng_step
                distance = haversine_m(c_lat, c_lng, incident['latitude'], incident['longitude'])
                if distance > INFLUENCE_M:
                    continue
                scores[(i, j)] += incident['weight'] * (1 - distance / INFLUENCE_M)
        counts[(ci, cj)] += 1

    cells = []
    for (i, j), raw in scores.items():
        c_lat, c_lng = lat + i * lat_step, lng + j * lng_step
        if haversine_m(lat, lng, c_lat, c_lng) > radius_m or raw <= 0:
            continue
        score = round(min(raw, MAX_SCORE), 2)
        cells.append({
            'latitude': round(c_lat, 6),
            'longitude': round(c_lng, 6),
            'lat_size': round(lat_step, 7),
            'lng_size': round(lng_step, 7),
            'risk_score': score,
            'level': level_for(score),
            'incident_count': counts[(i, j)],
        })
    return cells


def incident_zones(lat, lng, radius_m, incidents):
    """Greedy clusters (<=300 m) with at least two incidents. Centres rounded to ~110 m."""
    inside = [i for i in incidents if haversine_m(lat, lng, i['latitude'], i['longitude']) <= radius_m]
    clusters = []
    for incident in sorted(inside, key=lambda i: -i['weight']):
        for cluster in clusters:
            if haversine_m(cluster['lat'], cluster['lng'], incident['latitude'], incident['longitude']) <= CLUSTER_RADIUS_M:
                cluster['members'].append(incident)
                break
        else:
            clusters.append({'lat': incident['latitude'], 'lng': incident['longitude'], 'members': [incident]})

    zones = []
    for cluster in clusters:
        members = cluster['members']
        if len(members) < MIN_CLUSTER_INCIDENTS:
            continue
        c_lat = sum(m['latitude'] for m in members) / len(members)
        c_lng = sum(m['longitude'] for m in members) / len(members)
        spread = max(haversine_m(c_lat, c_lng, m['latitude'], m['longitude']) for m in members)
        by_type = defaultdict(int)
        for member in members:
            by_type[member['type']] += 1
        score = round(min(sum(m['weight'] for m in members), MAX_SCORE), 2)
        zones.append({
            'center_latitude': round(c_lat, 3),
            'center_longitude': round(c_lng, 3),
            'radius': int(min(max(spread + 100, 150), 600)),
            'risk_score': score,
            'level': level_for(score),
            'incident_count': len(members),
            'by_type': dict(by_type),
        })
    zones.sort(key=lambda z: -z['risk_score'])
    return zones[:MAX_ZONES]


def area_summary(lat, lng, radius_m, incidents, now=None):
    now = now or timezone.now()
    inside = [i for i in incidents if haversine_m(lat, lng, i['latitude'], i['longitude']) <= radius_m]
    by_type = defaultdict(int)
    for incident in inside:
        by_type[incident['type']] += 1
    area_km2 = math.pi * (radius_m / 1000) ** 2
    density = sum(i['weight'] for i in inside) / area_km2 if area_km2 else 0
    score = round(min(density, MAX_SCORE), 2)
    recent_cutoff = now - timedelta(days=30)
    return {
        'risk_score': score,
        'risk_level': level_for(score) if inside else 'no_data',
        'total_incidents': len(inside),
        'recent_incidents': sum(1 for i in inside if i['created_at'] >= recent_cutoff),
        'by_type': dict(by_type),
        'radius': round(radius_m),
        'lookback_days': LOOKBACK_DAYS,
    }
