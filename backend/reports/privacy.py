"""Who may see what about a report.

Privileged viewers of a report: its reporter, staff/admins of the report's
department, and superadmins. They get exact coordinates and the full address.
Everyone else gets coordinates rounded to 3 decimals (~110 m) and only an
area-level address (locality + city, no house/street).

Reporter identity: superadmin always sees it; otherwise anonymous reports show
"Anonymous", and non-anonymous ones show the name to privileged viewers and
"Community member" to everyone else.
"""
import re

from users import roles

PUBLIC_COORD_DECIMALS = 3
PUBLIC_ADDRESS_PARTS = 4
ANONYMOUS_LABEL = 'Anonymous'
COMMUNITY_LABEL = 'Community member'


def is_reporter(user, report):
    return bool(
        user is not None and getattr(user, 'is_authenticated', False)
        and report.reported_by_id is not None and report.reported_by_id == user.id
    )


def is_privileged_viewer(user, report):
    if roles.is_superadmin(user) or is_reporter(user, report):
        return True
    return roles.is_responder(user) and roles.department_of(user) == report.department


def reporter_label(user, report):
    reporter = report.reported_by
    if reporter is None:
        return ANONYMOUS_LABEL
    if roles.is_superadmin(user):
        return reporter.name or reporter.email
    if report.is_anonymous:
        return ANONYMOUS_LABEL
    if is_privileged_viewer(user, report):
        return reporter.name or reporter.email
    return COMMUNITY_LABEL


def public_coordinate(value):
    return round(value, PUBLIC_COORD_DECIMALS)


def coarse_address(location):
    """
    Area-level address for public viewers: drop house/street parts *and* the
    country / PIN code / state tail, keeping locality + city.

    '12 MG Road, Navrangpura, Ahmedabad, Gujarat, 380009, India' -> 'Navrangpura, Ahmedabad'
    """
    if not location:
        return location
    parts = [re.sub(r'(?<=[a-z])Taluka\b', ' Taluka', p.strip()) for p in location.split(',') if p.strip()]
    is_postcode = lambda part: part.replace(' ', '').isdigit()  # noqa: E731
    if len(parts) > 1 and (parts[-1].lower() == 'india' or (len(parts) > 2 and is_postcode(parts[-2]))):
        parts = parts[:-1]                                   # country
    had_postcode = False
    while parts and is_postcode(parts[-1]):
        parts, had_postcode = parts[:-1], True               # PIN / postcode
    if had_postcode and len(parts) > 1:
        parts = parts[:-1]                                   # state (comes right before the postcode)
    if len(parts) <= 1:
        return ', '.join(parts)
    # Never the first part (house number / building / street); at most locality, sub-district, city.
    return ', '.join(parts[1:][-PUBLIC_ADDRESS_PARTS + 1:])


def viewer_coordinates(user, report):
    """(lat, lng) as the given viewer is allowed to see them."""
    if is_privileged_viewer(user, report):
        return report.latitude, report.longitude
    return public_coordinate(report.latitude), public_coordinate(report.longitude)
