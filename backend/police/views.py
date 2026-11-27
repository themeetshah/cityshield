"""
Operations API used by department staff/admins and the superadmin.

Department-aware endpoints (stats, SOS, reports, official alerts) are open to any department member and are
scoped to their department; police-only features (patrol teams, dispatch, volunteers) require the police
department. Every check happens here on the server.
"""
import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Min, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cityshield_backend.geo import parse_lat_lng
from reports.models import Report
from sos.models import SOSAlert, Volunteer
from users import roles
from users.notifications import notify
from users.permissions import IsPoliceDepartment, IsResponderOrSuperAdmin

from .models import POLICE_ROLES, OfficialAlert, PatrolTeam, ReportStatusChange, SOSResponse
from .serializers import (
    OfficialAlertSerializer, OperationsReportSerializer, OperationsSOSSerializer, PatrolTeamSerializer,
    PatrolTeamWriteSerializer, PoliceOfficerSerializer, ReportStatusUpdateSerializer, SOSResponseSerializer,
    VolunteerActivitySerializer,
)
from .utils import (
    apply_location_filter, can_manage_teams, paginate, requested_department, scope_reports, scope_sos,
    station_of, team_in_scope,
)

logger = logging.getLogger(__name__)
User = get_user_model()

OPEN_REPORT_STATUSES = ('pending', 'investigating')
MAX_PERIOD_DAYS = 365


def _forbidden(message):
    return Response({'error': message}, status=status.HTTP_403_FORBIDDEN)


def _bad_request(message):
    return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


def _sos_queryset():
    return SOSAlert.objects.select_related('user').annotate(
        volunteers_responded_count=Count('volunteer_alerts', filter=Q(volunteer_alerts__responded=True)),
    ).prefetch_related(
        Prefetch('police_responses',
                 queryset=SOSResponse.objects.select_related('assigned_team__station').order_by('-created_at')),
    )


def _report_queryset():
    return Report.objects.select_related('reported_by').prefetch_related(
        Prefetch('status_changes', queryset=ReportStatusChange.objects.select_related('changed_by'),
                 to_attr='recent_changes'),
    )


def _team_queryset(user):
    qs = PatrolTeam.objects.select_related('station', 'team_leader').prefetch_related(
        'members',
        Prefetch('sos_responses',
                 queryset=SOSResponse.objects.filter(sos_alert__is_active=True).exclude(status='resolved'),
                 to_attr='active_responses'),
    )
    station = station_of(user)
    return qs.filter(station=station) if station is not None else qs


# ================================================================== statistics

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsResponderOrSuperAdmin])
def police_dashboard_stats(request):
    """Real metrics for the caller's scope. Rates/averages are null when there is no data."""
    department = requested_department(request)
    try:
        period_days = int(request.query_params.get('period_days', 7))
    except ValueError:
        return _bad_request('period_days must be an integer.')
    period_days = max(1, min(period_days, MAX_PERIOD_DAYS))
    since = timezone.now() - timedelta(days=period_days)

    sos_qs = scope_sos(SOSAlert.objects.all(), request, department)
    report_qs = scope_reports(Report.objects.all(), department)
    sos_qs, _, radius = apply_location_filter(sos_qs, request)
    report_qs, _, _ = apply_location_filter(report_qs, request)

    period_sos = sos_qs.filter(created_at__gte=since).annotate(
        first_team=Min('police_responses__created_at'),
        first_volunteer=Min('volunteer_alerts__response_time', filter=Q(volunteer_alerts__responded=True)),
    ).values('created_at', 'first_team', 'first_volunteer')

    sos_in_period = 0
    delays = []
    for row in period_sos:
        sos_in_period += 1
        firsts = [t for t in (row['first_team'], row['first_volunteer']) if t is not None]
        if firsts:
            delays.append(max((min(firsts) - row['created_at']).total_seconds(), 0))

    responded = len(delays)
    stats = {
        'department': department,
        'period_days': period_days,
        'active_sos': sos_qs.filter(is_active=True).count(),
        'sos_in_period': sos_in_period,
        'sos_responded_in_period': responded,
        'response_rate': round(responded * 100 / sos_in_period, 1) if sos_in_period else None,
        'avg_response_minutes': round(sum(delays) / responded / 60, 1) if responded else None,
        'open_reports': report_qs.filter(status__in=OPEN_REPORT_STATUSES).count(),
        'reports_in_period': report_qs.filter(created_at__gte=since).count(),
        'resolved_in_period': report_qs.filter(
            status='resolved', status_changes__new_status='resolved', status_changes__created_at__gte=since,
        ).distinct().count(),
        'active_patrol_teams': None,
        'available_volunteers': None,
        'location_filtered': radius is not None,
        'radius_m': radius,
    }
    if roles.in_department(request.user, roles.POLICE) and department in (None, roles.POLICE):
        stats['active_patrol_teams'] = _team_queryset(request.user).filter(is_active=True).count()
        stats['available_volunteers'] = Volunteer.objects.filter(is_available=True, is_verified=True).count()
    return Response(stats)


# ========================================================================= SOS

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsResponderOrSuperAdmin])
def police_sos_alerts(request):
    """SOS alerts in the caller's scope. ?status=active (default) | resolved | all."""
    department = requested_department(request)
    qs = scope_sos(_sos_queryset(), request, department)
    state = request.query_params.get('status', 'active')
    if state == 'active':
        qs = qs.filter(is_active=True)
    elif state == 'resolved':
        qs = qs.filter(is_active=False)
    elif state != 'all':
        return _bad_request('status must be active, resolved or all.')
    qs, distances, radius = apply_location_filter(qs, request)
    page, meta = paginate(qs.order_by('-created_at'), request)
    data = OperationsSOSSerializer(page, many=True, context={'distances': distances or {}}).data
    return Response({'results': data, **meta, 'location_filtered': radius is not None, 'radius_m': radius})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsPoliceDepartment])
def assign_team_to_sos(request, sos_id):
    """Dispatch a patrol team to an active SOS (one active assignment per team)."""
    team_pk = request.data.get('team_id')
    if team_pk in (None, ''):
        return _bad_request('team_id is required.')
    try:
        team_pk = int(team_pk)
    except (TypeError, ValueError):
        return _bad_request('team_id must be an integer.')
    notes = str(request.data.get('notes') or '')[:2000]

    with transaction.atomic():
        sos = get_object_or_404(SOSAlert.objects.select_for_update(), id=sos_id)
        if not sos.is_active:
            return _bad_request('This SOS alert has already been resolved.')
        team = get_object_or_404(PatrolTeam.objects.select_for_update().select_related('station'), id=team_pk)
        if not team_in_scope(request.user, team):
            return _forbidden('You can only dispatch teams from your own station.')
        if not team.is_active:
            return _bad_request(f'Team {team.team_id} is not on duty.')

        busy = SOSResponse.objects.filter(assigned_team=team, sos_alert__is_active=True) \
            .exclude(status='resolved').exclude(sos_alert=sos).first()
        if busy:
            return _bad_request(
                f'Team {team.team_id} is already handling SOS #{busy.sos_alert_id}. Resolve that first.')

        response = SOSResponse.objects.filter(sos_alert=sos).exclude(status='resolved').first()
        now = timezone.now()
        if response is None:
            first = not SOSResponse.objects.filter(sos_alert=sos).exists()
            response = SOSResponse.objects.create(
                sos_alert=sos, assigned_team=team, assigned_by=request.user, notes=notes,
                response_time=(now - sos.created_at) if first else None,
            )
        elif response.assigned_team_id == team.id:
            return _bad_request(f'Team {team.team_id} is already assigned to this SOS.')
        else:
            response.assigned_team = team
            response.assigned_by = request.user
            response.status = 'assigned'
            response.dispatched_at = response.arrived_at = None
            if notes:
                response.notes = notes
            response.save()

        members = list(team.members.all()) + [team.team_leader]
        transaction.on_commit(lambda: notify(
            {m.pk: m for m in members}.values(),
            f'Team {team.team_id} assigned to SOS #{sos.id}',
            f'{sos.emergency_type.replace("_", " ").title()} at {sos.latitude:.5f}, {sos.longitude:.5f}.',
            '/',
        ))
        if sos.user_id:
            owner = sos.user
            station = team.station.name if team.station_id else 'the police'
            transaction.on_commit(lambda: notify(
                owner,
                'Police team assigned to your SOS',
                f'Team {team.team_id} from {station} has been assigned and is on the way.',
                '/',
            ))

    response = SOSResponse.objects.select_related('assigned_team__station').get(pk=response.pk)
    return Response({'message': f'Team {team.team_id} assigned to SOS #{sos.id}',
                     'response': SOSResponseSerializer(response).data})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsPoliceDepartment])
def update_sos_response_status(request, response_id):
    """Move a dispatch forward: assigned -> dispatched -> arrived -> resolved (timestamps recorded)."""
    new_status = request.data.get('status')
    order = SOSResponse.STATUS_ORDER
    if new_status not in order:
        return _bad_request(f'status must be one of: {", ".join(order)}.')

    with transaction.atomic():
        response = get_object_or_404(
            SOSResponse.objects.select_for_update().select_related('assigned_team__station'), id=response_id)
        if not team_in_scope(request.user, response.assigned_team):
            return _forbidden('This dispatch belongs to another station.')
        if order.index(new_status) <= order.index(response.status):
            return _bad_request(f'Cannot move from "{response.status}" to "{new_status}".')
        now = timezone.now()
        for step in order[order.index(response.status) + 1:order.index(new_status) + 1]:
            field = f'{step}_at'
            if step != 'assigned' and getattr(response, field) is None:
                setattr(response, field, now)
        response.status = new_status
        notes = request.data.get('notes')
        if notes:
            response.notes = str(notes)[:2000]
        response.save()

    return Response({'message': f'Dispatch marked as {response.get_status_display().lower()}',
                     'response': SOSResponseSerializer(response).data})


# ===================================================================== reports

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsResponderOrSuperAdmin])
def police_reports(request):
    """Incident reports routed to the caller's department. ?type=&status=&latitude=&longitude=&radius="""
    department = requested_department(request)
    base = scope_reports(_report_queryset(), department)
    base, distances, radius = apply_location_filter(base, request)

    report_type = request.query_params.get('type', 'all')
    if report_type != 'all':
        base = base.filter(report_type=report_type)
    counts = {key: 0 for key, _ in Report.STATUS_CHOICES}
    for row in base.values('status').annotate(n=Count('id')):
        counts[row['status']] = row['n']

    qs = base
    state = request.query_params.get('status', 'all')
    if state == 'open':
        qs = qs.filter(status__in=OPEN_REPORT_STATUSES)
    elif state != 'all':
        if state not in counts:
            return _bad_request('Unknown status filter.')
        qs = qs.filter(status=state)

    page, meta = paginate(qs.order_by('-created_at'), request)
    return Response({
        'results': OperationsReportSerializer(page, many=True).data,
        **meta,
        'counts_by_status': counts,
        'location_filtered': radius is not None,
        'radius_m': radius,
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsResponderOrSuperAdmin])
def update_report_status(request, report_id):
    """Staff of the report's department (or superadmin) change its status and notify the reporter."""
    report = get_object_or_404(Report.objects.select_related('reported_by'), id=report_id)
    if not roles.in_department(request.user, report.department):
        return _forbidden('This report belongs to another department.')

    serializer = ReportStatusUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': 'Invalid status update.', 'details': serializer.errors}, status=400)
    new_status = serializer.validated_data['status']
    note = serializer.validated_data.get('note', '').strip()
    old_status = report.status
    if new_status == old_status and not note:
        return _bad_request(f'Report is already {report.get_status_display().lower()}.')

    with transaction.atomic():
        report.status = new_status
        report.save(update_fields=['status', 'updated_at'])
        ReportStatusChange.objects.create(report=report, old_status=old_status, new_status=new_status,
                                          note=note, changed_by=request.user)

    reporter = report.reported_by
    if reporter is not None and reporter.pk != request.user.pk:
        title = (f'Your report "{report.title[:80]}" is now {report.get_status_display().lower()}'
                 if new_status != old_status else f'Update on your report "{report.title[:80]}"')
        notify(reporter, title, note, f'/reports/{report.id}')

    report = _report_queryset().get(pk=report.pk)
    return Response({'message': 'Report status updated', 'report': OperationsReportSerializer(report).data})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsResponderOrSuperAdmin])
def all_reports_combined(request):
    """Latest SOS alerts and incident reports of the caller's scope, merged newest first (?limit=, max 100)."""
    department = requested_department(request)
    sos_qs, _, radius = apply_location_filter(scope_sos(_sos_queryset(), request, department), request)
    report_qs, _, _ = apply_location_filter(scope_reports(_report_queryset(), department), request)
    sos_page, meta = paginate(sos_qs.order_by('-created_at'), request, default=50)
    report_page, report_meta = paginate(report_qs.order_by('-created_at'), request, default=50)

    items = [{'type': 'sos', 'created_at': s['created_at'], 'item': s}
             for s in OperationsSOSSerializer(sos_page, many=True).data]
    items += [{'type': 'report', 'created_at': r['created_at'], 'item': r}
              for r in OperationsReportSerializer(report_page, many=True).data]
    items.sort(key=lambda x: x['created_at'], reverse=True)
    return Response({
        'results': items[:meta['limit']],
        'summary': {
            'total_sos': meta['count'],
            'active_sos': sos_qs.filter(is_active=True).count(),
            'total_reports': report_meta['count'],
            'pending_reports': report_qs.filter(status='pending').count(),
        },
        'location_filtered': radius is not None,
        'radius_m': radius,
    })


# ============================================================= official alerts

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def official_alerts(request):
    """
    GET  (any signed-in user): ?active=true&department=&limit=  -> {results: [...]}
    POST (department staff/admin, superadmin with `department`): publish an alert.
    """
    if request.method == 'GET':
        qs = OfficialAlert.objects.select_related('issued_by_station', 'issued_by_officer')
        if request.query_params.get('active') in ('true', '1'):
            qs = qs.filter(is_active=True)
        dept = request.query_params.get('department')
        if dept:
            qs = qs.filter(department=dept)
        page, meta = paginate(qs.order_by('-created_at'), request, default=20)
        return Response({'results': OfficialAlertSerializer(page, many=True).data, **meta})

    user = request.user
    if roles.is_superadmin(user):
        department = request.data.get('department')
        if department not in roles.DEPARTMENTS:
            return _bad_request('department is required (police, municipal, fire or medical).')
    elif roles.is_responder(user):
        department = roles.department_of(user)
    else:
        return _forbidden('Only department staff can publish official alerts.')

    serializer = OfficialAlertSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': 'Invalid alert.', 'details': serializer.errors}, status=400)
    station = user.police_station if department == roles.POLICE and not roles.is_superadmin(user) else None
    alert = serializer.save(department=department, issued_by_officer=user, issued_by_station=station)
    return Response({'message': 'Official alert published', 'alert': OfficialAlertSerializer(alert).data},
                    status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsResponderOrSuperAdmin])
def official_alert_detail(request, alert_id):
    """PATCH {is_active} - the issuing department's admin or a superadmin."""
    alert = get_object_or_404(OfficialAlert.objects.select_related('issued_by_station', 'issued_by_officer'),
                              id=alert_id)
    user = request.user
    if not (roles.is_superadmin(user) or roles.is_department_admin(user, alert.department)):
        return _forbidden("Only the issuing department's admin can change this alert.")
    is_active = request.data.get('is_active')
    if isinstance(is_active, str):
        is_active = {'true': True, 'false': False}.get(is_active.lower())
    if not isinstance(is_active, bool):
        return _bad_request('is_active (true/false) is required.')
    alert.is_active = is_active
    alert.deactivated_at = None if is_active else timezone.now()
    alert.save(update_fields=['is_active', 'deactivated_at'])
    return Response({'message': 'Alert updated', 'alert': OfficialAlertSerializer(alert).data})


# ================================================================ patrol teams

def _team_payload(request, fields):
    return {k: request.data.get(k) for k in fields if k in request.data}


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsPoliceDepartment])
def patrol_teams_list_create(request):
    user = request.user
    if request.method == 'GET':
        qs = _team_queryset(user)
        if request.query_params.get('active') in ('true', '1'):
            qs = qs.filter(is_active=True)
        return Response({
            'results': PatrolTeamSerializer(qs, many=True).data,
            'count': qs.count(),
            'station_filtered': station_of(user) is not None,
            'can_manage': can_manage_teams(user),
        })

    if not can_manage_teams(user):
        return _forbidden('Only police admins can create patrol teams.')
    data = _team_payload(request, ('team_id', 'station', 'team_leader', 'vehicle_number', 'is_active'))
    station = station_of(user)
    if station is not None:
        data['station'] = station.id
    serializer = PatrolTeamWriteSerializer(data=data)
    if not serializer.is_valid():
        return Response({'error': 'Invalid team.', 'details': serializer.errors}, status=400)
    team = serializer.save()
    return Response({'message': f'Patrol team {team.team_id} created', 'team': PatrolTeamSerializer(team).data},
                    status=status.HTTP_201_CREATED)


def _get_team(request, team_id, manage=False):
    """Returns (team, error_response)."""
    team = get_object_or_404(PatrolTeam.objects.select_related('station', 'team_leader'), id=team_id)
    if not team_in_scope(request.user, team):
        return None, _forbidden('This team belongs to another station.')
    if manage and not can_manage_teams(request.user):
        return None, _forbidden('Only police admins can manage patrol teams.')
    return team, None


@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsPoliceDepartment])
def patrol_team_detail(request, team_id):
    team, error = _get_team(request, team_id, manage=request.method != 'GET')
    if error:
        return error
    if request.method == 'GET':
        return Response(PatrolTeamSerializer(team).data)

    if request.method == 'DELETE':
        if SOSResponse.objects.filter(assigned_team=team, sos_alert__is_active=True).exclude(
                status='resolved').exists():
            return _bad_request('This team is on an active dispatch and cannot be deleted.')
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    data = _team_payload(request, ('team_id', 'station', 'team_leader', 'vehicle_number', 'is_active'))
    if station_of(request.user) is not None:
        data.pop('station', None)  # station-scoped admins cannot move teams elsewhere
    serializer = PatrolTeamWriteSerializer(team, data=data, partial=request.method == 'PATCH')
    if not serializer.is_valid():
        return Response({'error': 'Invalid team.', 'details': serializer.errors}, status=400)
    serializer.save()
    team = PatrolTeam.objects.get(pk=team.pk)
    return Response({'message': f'Patrol team {team.team_id} updated', 'team': PatrolTeamSerializer(team).data})


def _member_from_request(request):
    user_id = request.data.get('user_id')
    try:
        return User.objects.get(id=int(user_id)), None
    except (TypeError, ValueError):
        return None, _bad_request('user_id is required.')
    except User.DoesNotExist:
        return None, Response({'error': 'Officer not found.'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsPoliceDepartment])
def assign_team_member(request, team_id):
    team, error = _get_team(request, team_id, manage=True)
    if error:
        return error
    officer, error = _member_from_request(request)
    if error:
        return error
    if officer.role not in POLICE_ROLES or not officer.is_active:
        return _bad_request('Only active police officers can join a patrol team.')
    if officer.police_station_id != team.station_id:
        return _bad_request('Officer must belong to the same police station.')
    if officer.pk == team.team_leader_id:
        return _bad_request('The team leader is already part of the team.')
    if team.members.filter(pk=officer.pk).exists():
        return _bad_request('Officer is already a member of this team.')
    team.members.add(officer)
    notify(officer, f'You were added to patrol team {team.team_id}', '', '/')
    return Response({'message': f'{officer.name or officer.email} added to {team.team_id}',
                     'member_count': team.get_member_count()})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsPoliceDepartment])
def remove_team_member(request, team_id):
    team, error = _get_team(request, team_id, manage=True)
    if error:
        return error
    officer, error = _member_from_request(request)
    if error:
        return error
    if not team.members.filter(pk=officer.pk).exists():
        return _bad_request('Officer is not a member of this team.')
    team.members.remove(officer)
    return Response({'message': f'{officer.name or officer.email} removed from {team.team_id}',
                     'member_count': team.get_member_count()})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsPoliceDepartment])
def toggle_team_status(request, team_id):
    team, error = _get_team(request, team_id, manage=True)
    if error:
        return error
    team.is_active = not team.is_active
    team.save(update_fields=['is_active'])
    return Response({'message': f'Team {team.team_id} {"is on duty" if team.is_active else "is off duty"}',
                     'is_active': team.is_active})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsPoliceDepartment])
def update_team_location(request, team_id):
    """The team's leader/members (or a police admin) report the team's position."""
    team, error = _get_team(request, team_id)
    if error:
        return error
    if not (can_manage_teams(request.user) or team.includes(request.user)):
        return _forbidden('Only members of this team can update its location.')
    try:
        lat, lng = parse_lat_lng(request.data.get('latitude'), request.data.get('longitude'))
    except (TypeError, ValueError) as exc:
        return _bad_request(str(exc))
    team.current_latitude, team.current_longitude = lat, lng
    team.location_updated_at = timezone.now()
    team.save(update_fields=['current_latitude', 'current_longitude', 'location_updated_at'])
    return Response({'message': f'Location updated for team {team.team_id}', 'latitude': lat, 'longitude': lng,
                     'location_updated_at': team.location_updated_at})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsPoliceDepartment])
def available_police_officers(request):
    """Active officers of the caller's station (superadmin/unscoped: all, or ?station=)."""
    qs = User.objects.filter(role__in=POLICE_ROLES, is_active=True).select_related('police_station')
    station = station_of(request.user)
    if station is not None:
        qs = qs.filter(police_station=station)
    elif request.query_params.get('station'):
        try:
            qs = qs.filter(police_station_id=int(request.query_params['station']))
        except ValueError:
            return _bad_request('station must be an integer.')
    qs = qs.order_by('name', 'email')
    return Response({'officers': PoliceOfficerSerializer(qs, many=True).data, 'count': qs.count()})


# ================================================================== volunteers

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsPoliceDepartment])
def police_volunteers(request):
    """Registered volunteers. ?available=true to list only those currently available."""
    qs = Volunteer.objects.select_related('user').annotate(
        response_count=Count('alerts', filter=Q(alerts__responded=True)))
    if request.query_params.get('available') in ('true', '1'):
        qs = qs.filter(is_available=True)
    page, meta = paginate(qs.order_by('-is_available', 'user__name', 'id'), request)
    return Response({'results': VolunteerActivitySerializer(page, many=True).data, **meta})

