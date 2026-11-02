"""Who may see / control an SOS alert. All checks are server-side."""
import hashlib
import hmac
import secrets

from users import roles

from .models import SOSAlert, Volunteer, VolunteerAlert

SOS_TOKEN_HEADER = 'X-SOS-Token'


def new_token():
    return secrets.token_urlsafe(32)


def hash_token(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def is_owner(request, alert):
    """Authenticated creator, or a request carrying the SOS's secret token."""
    user = request.user
    if user.is_authenticated and alert.user_id is not None and alert.user_id == user.id:
        return True
    token = request.headers.get(SOS_TOKEN_HEADER)
    if not token or not alert.token_hash:
        return False
    return hmac.compare_digest(alert.token_hash, hash_token(token))


def is_staff_viewer(user):
    return roles.is_superadmin(user) or roles.is_responder(user)


def responder_sees_all(user):
    """Superadmin and the police department see every SOS."""
    return roles.is_superadmin(user) or roles.department_of(user) == roles.POLICE


def responder_queryset(user, qs=None):
    """SOS alerts visible to a responder / superadmin (empty for anyone else)."""
    qs = SOSAlert.objects.all() if qs is None else qs
    if responder_sees_all(user):
        return qs
    dept = roles.department_of(user)
    if dept is None:
        return qs.none()
    return qs.filter(department=dept)


def responder_can_access(user, alert):
    if responder_sees_all(user):
        return True
    dept = roles.department_of(user)
    return dept is not None and dept == alert.department


def verified_volunteer(user):
    """The caller's verified Volunteer record, or None."""
    if not roles.is_volunteer(user):
        return None
    return Volunteer.objects.filter(user=user, is_verified=True, user__is_active=True).first()


def volunteer_is_linked(user, alert):
    """Volunteer was alerted to, or responded to, this SOS."""
    if not roles.is_volunteer(user):
        return False
    return VolunteerAlert.objects.filter(sos_alert=alert, volunteer__user=user).exists()


def can_view(request, alert):
    user = request.user
    if is_owner(request, alert):
        return True
    if is_staff_viewer(user):
        return responder_can_access(user, alert)
    return volunteer_is_linked(user, alert)


def can_view_media(request, alert):
    """Location trail and video: responders of the department and superadmin only."""
    user = request.user
    return is_staff_viewer(user) and responder_can_access(user, alert)


def can_resolve(request, alert):
    user = request.user
    if is_owner(request, alert):
        return True
    return is_staff_viewer(user) and responder_can_access(user, alert)
