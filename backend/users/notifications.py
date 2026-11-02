"""Helpers other apps use to create real, persisted notifications."""
from django.db.models import Q

from . import roles


def notify(users, title, message='', link=''):
    """Create a Notification for one user or an iterable of users. Returns count."""
    from .models import Notification

    if users is None:
        return 0
    if not hasattr(users, '__iter__'):
        users = [users]
    objs = [
        Notification(user=u, title=title[:200], message=message, link=link[:300])
        for u in users if u is not None
    ]
    Notification.objects.bulk_create(objs)
    return len(objs)


def department_members(department, police_station=None):
    """Active staff + admins of a department (optionally a single police station)."""
    from .models import User

    cfg = roles.DEPARTMENTS[department]
    qs = User.objects.filter(is_active=True, role__in=[cfg['admin_role'], cfg['staff_role']])
    if police_station is not None and department == roles.POLICE:
        qs = qs.filter(Q(police_station=police_station) | Q(police_station__isnull=True))
    return qs


def notify_department(department, title, message='', link='', police_station=None):
    return notify(list(department_members(department, police_station)), title, message, link)
