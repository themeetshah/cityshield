import logging

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from cityshield_backend.throttles import AuthThrottle

from . import roles
from .models import EmergencyContact, Notification, User, VolunteerApplication
from .notifications import notify
from .permissions import CanReviewVolunteers, IsAdminOrSuperAdmin
from .serializers import (
    EmergencyContactSerializer,
    NotificationSerializer,
    StaffCreateSerializer,
    StaffSerializer,
    UserProfileSerializer,
    VolunteerApplicationSerializer,
    VolunteerApplicationStatusSerializer,
)

logger = logging.getLogger(__name__)


def _auth_response(user, http_status=200, **extra):
    refresh = RefreshToken.for_user(user)
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    return Response({
        'token': str(refresh.access_token),
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': roles.user_payload(user),
        **extra,
    }, status=http_status)


def _check_self(request, user_id):
    return request.user.id == int(user_id)


# ==================================================================== auth

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def register_view(request):
    """Public self-registration. Always creates a CITIZEN - role is never taken from input."""
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''
    name = (request.data.get('name') or '').strip()[:100]

    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=400)
    if User.objects.filter(email__iexact=email).exists():
        return Response({'error': 'User with this email already exists'}, status=400)
    try:
        validate_password(password, user=User(email=email, name=name))
    except DjangoValidationError as e:
        return Response({'error': ' '.join(e.messages)}, status=400)

    user = User.objects.create_user(email=email, password=password, name=name, role=roles.CITIZEN)
    return _auth_response(user, status.HTTP_201_CREATED, message='Registration successful')


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def login_view(request):
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=400)

    user = authenticate(request, username=email, password=password)
    if user is None:
        # Same message whether the account exists or not.
        return Response({'error': 'Invalid email or password'}, status=400)
    return _auth_response(user)


def _verify_google_credential(credential):
    """Verify a Google Identity Services ID token. Returns the claims dict or raises ValueError."""
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        raise ValueError('Google sign-in is not configured on the server')
    claims = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
    if claims.get('iss') not in ('accounts.google.com', 'https://accounts.google.com'):
        raise ValueError('Wrong token issuer')
    if not claims.get('email') or not claims.get('email_verified'):
        raise ValueError('Google account email is not verified')
    return claims


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def google_auth_view(request):
    """
    Sign in / sign up with Google. Body: {"credential": "<Google ID token>"}.
    The token is verified server-side; new accounts are always citizens.
    """
    credential = request.data.get('credential')
    if not credential:
        return Response({'error': 'Google credential is required'}, status=400)
    try:
        claims = _verify_google_credential(credential)
    except ValueError as e:
        logger.info('Rejected Google credential: %s', e)
        return Response({'error': 'Google sign-in failed. Please try again.'}, status=400)

    email = claims['email'].lower()
    name = (claims.get('name') or '')[:100]
    user = User.objects.filter(email__iexact=email).first()
    created = False
    if user is None:
        user = User.objects.create_user(email=email, name=name, role=roles.CITIZEN)
        created = True
    elif not user.is_active:
        return Response({'error': 'This account has been deactivated'}, status=403)
    elif not user.name and name:
        user.name = name
        user.save(update_fields=['name'])

    return _auth_response(user, status.HTTP_201_CREATED if created else 200, isNew=created)


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """Blacklist the given refresh token. Always succeeds from the client's point of view."""
    token = request.data.get('refresh')
    if token:
        try:
            RefreshToken(token).blacklist()
        except TokenError:
            pass
    return Response({'message': 'Logged out'})


# ==================================================================== me

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """GET: session user (role info included). PATCH: update own profile fields."""
    user = request.user
    if request.method == 'PATCH':
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    data = UserProfileSerializer(user).data
    data.update(roles.user_payload(user))
    data['date_joined'] = user.date_joined
    data['password_set'] = user.has_usable_password()
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_by_id(request, id):
    """Basic public-safe info. Email only visible to self, responders and superadmins."""
    user = get_object_or_404(User, pk=id)
    viewer = request.user
    data = {
        'id': user.id,
        'name': user.name,
        'role': user.role,
        'role_label': roles.ROLE_LABELS.get(user.role, user.role),
        'date_joined': user.date_joined,
    }
    if viewer.id == user.id or roles.is_superadmin(viewer) or roles.is_responder(viewer):
        data['email'] = user.email
    return Response(data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile_detail(request, user_id):
    if not _check_self(request, user_id):
        return Response({'error': 'Permission denied'}, status=403)
    if request.method == 'PATCH':
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
    data = UserProfileSerializer(request.user).data
    data['password_set'] = request.user.has_usable_password()
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_stats(request, user_id):
    """Real statistics only - every number is computed from stored records."""
    if not _check_self(request, user_id):
        return Response({'error': 'Permission denied'}, status=403)

    from reports.models import Report
    from sos.models import SOSAlert, Volunteer, VolunteerAlert

    user = request.user
    reports = Report.objects.filter(reported_by=user)
    volunteer = Volunteer.objects.filter(user=user).first()

    report_types = {key: reports.filter(report_type=key).count() for key, _ in Report.REPORT_TYPES}
    return Response({
        'reports_submitted': reports.count(),
        'reports_resolved': reports.filter(status='resolved').count(),
        'reports_in_progress': reports.filter(status__in=['pending', 'investigating']).count(),
        'reports_dismissed': reports.filter(status='dismissed').count(),
        'sos_alerts_raised': SOSAlert.objects.filter(user=user).count(),
        'is_volunteer': volunteer is not None,
        'sos_responses': VolunteerAlert.objects.filter(volunteer=volunteer, responded=True).count() if volunteer else 0,
        'join_date': user.date_joined.strftime('%B %Y'),
        'report_types': report_types,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_activities(request, user_id):
    if not _check_self(request, user_id):
        return Response({'error': 'Permission denied'}, status=403)

    from reports.models import Report
    from sos.models import SOSAlert

    user = request.user
    activities = []
    for report in Report.objects.filter(reported_by=user).order_by('-created_at')[:10]:
        activities.append({
            'id': f'report-{report.id}',
            'type': 'report',
            'action': f'Submitted report: {report.title}',
            'status': report.status,
            'created_at': report.created_at.isoformat(),
            'report_type': report.get_report_type_display(),
            'link': f'/reports/{report.id}',
        })
    for alert in SOSAlert.objects.filter(user=user).order_by('-created_at')[:10]:
        activities.append({
            'id': f'sos-{alert.id}',
            'type': 'sos',
            'action': 'Raised an SOS alert',
            'status': 'active' if alert.is_active else 'resolved',
            'created_at': alert.created_at.isoformat(),
        })
    activities.append({
        'id': 'joined',
        'type': 'account',
        'action': 'Joined CityShield',
        'status': 'completed',
        'created_at': user.date_joined.isoformat(),
    })
    activities.sort(key=lambda a: a['created_at'], reverse=True)
    return Response(activities[:20])


# ============================================================ notifications

def _notification_list(request):
    qs = Notification.objects.filter(user=request.user)
    if request.GET.get('unread') == 'true':
        qs = qs.filter(is_read=False)
    return Response({
        'results': NotificationSerializer(qs[:50], many=True).data,
        'unread_count': Notification.objects.filter(user=request.user, is_read=False).count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_notifications(request):
    return _notification_list(request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_notifications(request, user_id):
    """Legacy path - same as /notifications/."""
    if not _check_self(request, user_id):
        return Response({'error': 'Permission denied'}, status=403)
    return _notification_list(request)


@api_view(['PATCH', 'POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id, user_id=None):
    if user_id is not None and not _check_self(request, user_id):
        return Response({'error': 'Permission denied'}, status=403)
    updated = Notification.objects.filter(id=notification_id, user=request.user).update(is_read=True)
    if not updated:
        return Response({'error': 'Notification not found'}, status=404)
    return Response({'message': 'Notification marked as read'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    count = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'All notifications marked as read', 'updated': count})


# ======================================================= emergency contacts

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def emergency_contacts(request, user_id):
    if not _check_self(request, user_id):
        return Response({'error': 'Permission denied'}, status=403)
    if request.method == 'GET':
        contacts = EmergencyContact.objects.filter(user=request.user)
        return Response(EmergencyContactSerializer(contacts, many=True).data)
    if EmergencyContact.objects.filter(user=request.user).count() >= 10:
        return Response({'error': 'You can store at most 10 emergency contacts'}, status=400)
    serializer = EmergencyContactSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    serializer.save(user=request.user)
    return Response(serializer.data, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def emergency_contact_delete(request, user_id, contact_id):
    if not _check_self(request, user_id):
        return Response({'error': 'Permission denied'}, status=403)
    contact = get_object_or_404(EmergencyContact, id=contact_id, user=request.user)
    contact.delete()
    return Response(status=204)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request, user_id):
    """Change password, or set one for Google-only accounts (no current password)."""
    if not _check_self(request, user_id):
        return Response({'error': 'Permission denied'}, status=403)

    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    has_password = user.has_usable_password()

    if not new_password or not confirm_password:
        return Response({'error': 'New password and confirmation are required'}, status=400)
    if has_password:
        if not current_password:
            return Response({'error': 'Current password is required'}, status=400)
        if not user.check_password(current_password):
            return Response({'error': 'Current password is incorrect'}, status=400)
    if new_password != confirm_password:
        return Response({'error': 'New passwords do not match'}, status=400)
    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as e:
        return Response({'error': ' '.join(e.messages)}, status=400)

    user.set_password(new_password)
    user.save()
    return Response({'message': 'Password changed successfully' if has_password
                     else 'Password set. You can now sign in with email and password.'})


# ================================================================ volunteers

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_for_volunteer(request):
    user = request.user
    if user.role != roles.CITIZEN:
        return Response({'error': 'Only citizens can apply to become volunteers'}, status=400)
    existing = VolunteerApplication.objects.filter(user=user).first()
    if existing and existing.status != 'rejected':
        return Response({
            'error': f'You already have a {existing.status} application',
            'status': existing.status,
            'applied_at': existing.applied_at,
        }, status=400)

    serializer = VolunteerApplicationSerializer(existing, data=request.data) if existing \
        else VolunteerApplicationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': 'Invalid data', 'details': serializer.errors}, status=400)
    application = serializer.save(user=user, status='pending', reviewed_at=None, reviewed_by=None, notes='')
    return Response({
        'message': 'Volunteer application submitted successfully',
        'application': VolunteerApplicationSerializer(application).data,
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def volunteer_application_status(request):
    user = request.user
    if user.role == roles.VOLUNTEER:
        return Response({'status': 'approved', 'is_volunteer': True, 'message': 'You are a volunteer'})
    application = VolunteerApplication.objects.filter(user=user).first()
    if not application:
        return Response({'status': None, 'is_volunteer': False, 'message': 'No volunteer application found'})
    return Response({'is_volunteer': False, **VolunteerApplicationStatusSerializer(application).data})


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanReviewVolunteers])
def list_volunteer_applications(request):
    status_filter = request.GET.get('status', 'all')
    applications = VolunteerApplication.objects.select_related('user', 'reviewed_by')
    if status_filter != 'all':
        applications = applications.filter(status=status_filter)
    applications = applications.order_by('-applied_at')
    return Response({
        'applications': VolunteerApplicationSerializer(applications, many=True).data,
        'total_count': applications.count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanReviewVolunteers])
def approve_volunteer_application(request, application_id):
    from sos.models import Volunteer

    action = request.data.get('action')
    notes = (request.data.get('notes') or '')[:2000]
    if action not in ('approve', 'reject'):
        return Response({'error': 'Action must be either "approve" or "reject"'}, status=400)

    with transaction.atomic():
        application = get_object_or_404(
            VolunteerApplication.objects.select_for_update().select_related('user'), id=application_id)
        if application.status != 'pending':
            return Response({'error': f'Application is already {application.status}'}, status=400)

        application.status = 'approved' if action == 'approve' else 'rejected'
        application.reviewed_at = timezone.now()
        application.reviewed_by = request.user
        application.notes = notes
        application.save()

        applicant = application.user
        if action == 'approve':
            volunteer, _ = Volunteer.objects.get_or_create(
                user=applicant, defaults={'phone_number': application.phone_number})
            volunteer.is_verified = True
            volunteer.phone_number = application.phone_number
            volunteer.save()
            if applicant.role == roles.CITIZEN:
                applicant.role = roles.VOLUNTEER
                applicant.save(update_fields=['role', 'is_staff', 'is_superuser'])
            notify(applicant, 'Volunteer application approved',
                   'You can now receive and respond to nearby SOS alerts.', '/community')
            return Response({'message': f'Volunteer application approved for {applicant.email}',
                             'volunteer_id': volunteer.id})

        notify(applicant, 'Volunteer application not approved', notes, '/profile')
        return Response({'message': f'Volunteer application rejected for {applicant.email}'})


# ========================================================= staff management

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def roles_meta(request):
    """Role/department metadata for the UI, plus what the caller may create."""
    return Response({
        'roles': [{'value': r, 'label': label, 'department': roles.department_of_role(r)}
                  for r, label in roles.ROLE_CHOICES],
        'departments': [{'value': k, 'label': v['label'], 'admin_role': v['admin_role'],
                         'staff_role': v['staff_role']} for k, v in roles.DEPARTMENTS.items()],
        'creatable_roles': roles.creatable_roles(request.user),
    })


def _manageable_users(actor):
    qs = User.objects.select_related('police_station', 'created_by').exclude(pk=actor.pk)
    if roles.is_superadmin(actor):
        return qs
    dept = roles.department_of(actor)
    return qs.filter(role=roles.DEPARTMENTS[dept]['staff_role'])


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsAdminOrSuperAdmin])
def staff_list_create(request):
    """
    GET  - users the caller manages (superadmin: everyone; dept admin: own dept staff).
           Filters: ?role=, ?department=, ?is_active=true|false, ?search=
    POST - create a staff/admin account. Rules enforced by roles.creatable_roles():
           superadmin -> any role except citizen/volunteer; dept admin -> own staff role only.
    """
    if request.method == 'POST':
        serializer = StaffCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        logger.info('User %s created %s account %s', request.user.email, user.role, user.email)
        return Response(StaffSerializer(user, context={'request': request}).data, status=201)

    qs = _manageable_users(request.user)
    role = request.GET.get('role')
    department = request.GET.get('department')
    active = request.GET.get('is_active')
    search = (request.GET.get('search') or '').strip()
    if role:
        qs = qs.filter(role=role)
    if department in roles.DEPARTMENTS:
        cfg = roles.DEPARTMENTS[department]
        qs = qs.filter(role__in=[cfg['admin_role'], cfg['staff_role']])
    if active in ('true', 'false'):
        qs = qs.filter(is_active=active == 'true')
    if search:
        qs = qs.filter(Q(email__icontains=search) | Q(name__icontains=search))
    qs = qs.order_by('role', 'email')
    total = qs.count()
    try:
        limit = min(max(int(request.GET.get('limit', 100)), 1), 500)
        offset = max(int(request.GET.get('offset', 0)), 0)
    except ValueError:
        limit, offset = 100, 0
    return Response({
        'results': StaffSerializer(qs[offset:offset + limit], many=True, context={'request': request}).data,
        'total_count': total,
    })


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated, IsAdminOrSuperAdmin])
def staff_detail(request, user_id):
    target = get_object_or_404(User.objects.select_related('police_station'), pk=user_id)
    if not roles.can_manage_user(request.user, target):
        return Response({'error': 'You cannot manage this user'}, status=403)

    if request.method == 'GET':
        return Response(StaffSerializer(target, context={'request': request}).data)

    if request.method == 'DELETE':
        if not roles.is_superadmin(request.user):
            return Response({'error': 'Only a super admin can delete accounts. Deactivate instead.'}, status=403)
        target.delete()
        return Response(status=204)

    data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
    data.pop('email', None)
    password = data.pop('password', None)
    if isinstance(password, list):
        password = password[0] if password else None
    serializer = StaffSerializer(target, data=data, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    if password:
        try:
            validate_password(password, user=user)
        except DjangoValidationError as e:
            return Response({'password': e.messages}, status=400)
        user.set_password(password)
        user.save()
    return Response(StaffSerializer(user, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrSuperAdmin])
def station_lookup(request):
    """Police-station search for assigning police staff. ?search=<name/city>, max 50 results."""
    from safety.models import PoliceStation

    qs = PoliceStation.objects.all()
    if not roles.is_superadmin(request.user) and request.user.police_station_id:
        qs = qs.filter(id=request.user.police_station_id)
    search = (request.GET.get('search') or '').strip()
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(city__icontains=search) | Q(state__icontains=search))
    return Response({'results': list(qs.order_by('name').values('id', 'name', 'city', 'state')[:50])})
