"""Who may see what about a report.

Privileged viewers of a report: its reporter, staff/admins of the report's
department, and superadmins. They get exact coordinates and the full address.
Everyone else gets coordinates rounded to 3 decimals (~110 m) and only the
coarse tail of the address.

Reporter identity: superadmin always sees it; otherwise anonymous reports show
"Anonymous", and non-anonymous ones show the name to privileged viewers and
"Community member" to everyone else.
"""
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
    """Drop house/street level parts of a comma separated address."""
    if not location:
        return location
    parts = [p.strip() for p in location.split(',') if p.strip()]
    return ', '.join(parts[-PUBLIC_ADDRESS_PARTS:])


def viewer_coordinates(user, report):
    """(lat, lng) as the given viewer is allowed to see them."""
    if is_privileged_viewer(user, report):
        return report.latitude, report.longitude
    return public_coordinate(report.latitude), public_coordinate(report.longitude)
