"""Scoping / permission helpers for the operations (police app) endpoints."""
from rest_framework.exceptions import ValidationError

from cityshield_backend.geo import bbox_filter, bounding_box, clamp_radius, haversine_m, parse_lat_lng
from users import roles

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100


def requested_department(request):
    """
    Department whose data the caller sees, or None for "everything".
    Superadmins see all and may narrow with ?department=; everybody else is pinned to their own.
    """
    user = request.user
    if roles.is_superadmin(user):
        dept = (request.query_params.get('department') or '').strip() or None
        if dept and dept not in roles.DEPARTMENTS:
            raise ValidationError({'department': 'Unknown department.'})
        return dept
    return roles.department_of(user)


def scope_sos(queryset, request, department):
    """Police staff see every SOS; other departments only theirs; superadmin filters exactly."""
    if department is None:
        return queryset
    if department == roles.POLICE and not roles.is_superadmin(request.user):
        return queryset
    return queryset.filter(department=department)


def scope_reports(queryset, department):
    return queryset if department is None else queryset.filter(department=department)


def apply_location_filter(queryset, request):
    """
    Optional ?latitude=&longitude=&radius= (metres) filter.
    Returns (queryset, distances {id: metres} | None, radius_m | None).
    """
    lat, lng = request.query_params.get('latitude'), request.query_params.get('longitude')
    if lat in (None, '') and lng in (None, ''):
        return queryset, None, None
    try:
        lat, lng = parse_lat_lng(lat, lng)
    except (TypeError, ValueError) as exc:
        raise ValidationError({'location': str(exc)}) from exc
    radius = clamp_radius(request.query_params.get('radius'))
    candidates = queryset.filter(**bbox_filter(bounding_box(lat, lng, radius))).values_list(
        'id', 'latitude', 'longitude')
    distances = {}
    for pk, p_lat, p_lng in candidates:
        d = haversine_m(lat, lng, p_lat, p_lng)
        if d <= radius:
            distances[pk] = round(d)
    return queryset.filter(id__in=distances.keys()), distances, radius


def paginate(queryset, request, default=DEFAULT_PAGE_SIZE, maximum=MAX_PAGE_SIZE):
    """limit/offset pagination. Returns (page, meta)."""
    try:
        limit = int(request.query_params.get('limit', default))
        offset = int(request.query_params.get('offset', 0))
    except (TypeError, ValueError):
        raise ValidationError({'pagination': 'limit and offset must be integers.'}) from None
    limit = max(1, min(limit, maximum))
    offset = max(0, offset)
    count = queryset.count()
    return queryset[offset:offset + limit], {'count': count, 'limit': limit, 'offset': offset}


# ---------------------------------------------------------------- patrol teams

def can_manage_teams(user):
    return roles.is_superadmin(user) or roles.is_department_admin(user, roles.POLICE)


def station_of(user):
    """The station a police user is restricted to (None = unrestricted)."""
    if roles.is_superadmin(user):
        return None
    return getattr(user, 'police_station', None)


def team_in_scope(user, team):
    station = station_of(user)
    return station is None or team.station_id == station.id
