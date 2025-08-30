# police/views.py (Complete)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Avg
from .utils import filter_emergencies_nearby, filter_reports_nearby
from reports.models import Report
from sos.models import SOSAlert, Volunteer, VolunteerAlert
from .models import PatrolTeam, OfficialAlert, SOSResponse
from .serializers import *
import math

def get_bounding_box(lat, lng, radius):
    """Get bounding box for geographical filtering"""
    lat_offset = radius / 111000  # degrees
    lng_offset = radius / (111000 * math.cos(math.radians(lat)))

    return {
        'min_lat': lat - lat_offset,
        'max_lat': lat + lat_offset,
        'min_lng': lng - lng_offset,
        'max_lng': lng + lng_offset
    }

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def patrol_teams_list_create(request):
    """List all patrol teams or create a new one"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    if request.method == 'GET':
        # Filter teams by user's police station
        queryset = PatrolTeam.objects.all()
        if hasattr(request.user, 'police_station') and request.user.police_station:
            queryset = queryset.filter(station=request.user.police_station)
        
        # teams = queryset.order_by('-created_at')
        teams = queryset
        serializer = PatrolTeamSerializer(teams, many=True)
        
        return Response({
            'results': serializer.data,
            'total_count': teams.count(),
            'station_filtered': bool(request.user.police_station)
        })

    elif request.method == 'POST':
        print(request.user.police_station.id)
        request.data['station'] = request.user.police_station.id
        print(request.data)
        serializer = PatrolTeamCreateSerializer(data=request.data)
        if serializer.is_valid():
            team = serializer.save()
            response_serializer = PatrolTeamSerializer(team)
            return Response({
                'message': 'Patrol team created successfully',
                'team': response_serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def patrol_team_detail(request, team_id):
    """Retrieve, update or delete a patrol team"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    team = get_object_or_404(PatrolTeam, id=team_id)
    
    # Check if user has access to this team (same station)
    if (hasattr(request.user, 'police_station') and 
        request.user.police_station and 
        team.station != request.user.police_station):
        return Response({'error': 'Access denied'}, status=403)

    if request.method == 'GET':
        serializer = PatrolTeamSerializer(team)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = PatrolTeamCreateSerializer(team, data=request.data, partial=partial)
        if serializer.is_valid():
            updated_team = serializer.save()
            response_serializer = PatrolTeamSerializer(updated_team)
            return Response({
                'message': 'Patrol team updated successfully',
                'team': response_serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        team_id_str = team.team_id
        team.delete()
        return Response({
            'message': f'Patrol team {team_id_str} deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_team_member(request, team_id):
    """Assign a police officer to a patrol team"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    team = get_object_or_404(PatrolTeam, id=team_id)
    user_id = request.data.get('user_id')
    
    if not user_id:
        return Response({'error': 'User ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(id=user_id, role='police')
    except User.DoesNotExist:
        return Response({'error': 'Police user not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user belongs to same station
    if (hasattr(user, 'police_station') and 
        user.police_station and 
        user.police_station != team.station):
        return Response({
            'error': 'Officer must belong to the same police station'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if team.members.filter(id=user_id).exists():
        return Response({
            'error': 'Officer is already a member of this team'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if user == team.team_leader:
        return Response({
            'error': 'Team leader is already part of the team'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    team.members.add(user)
    return Response({
        'message': f'{user.name or user.email} assigned to {team.team_id}',
        'member_count': team.get_member_count()
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_team_member(request, team_id):
    """Remove a police officer from a patrol team"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    team = get_object_or_404(PatrolTeam, id=team_id)
    user_id = request.data.get('user_id')
    
    if not user_id:
        return Response({'error': 'User ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not team.members.filter(id=user_id).exists():
        return Response({
            'error': 'Officer is not a member of this team'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    team.members.remove(user)
    return Response({
        'message': f'{user.name or user.email} removed from {team.team_id}',
        'member_count': team.get_member_count()
    })

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_team_status(request, team_id):
    """Toggle patrol team active status"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    team = get_object_or_404(PatrolTeam, id=team_id)
    team.is_active = not team.is_active
    team.save()
    
    return Response({
        'message': f'Team {team.team_id} {"activated" if team.is_active else "deactivated"}',
        'is_active': team.is_active
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_police_officers(request):
    """Get list of police officers available for team assignment"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    # Filter officers by user's police station if available
    queryset = User.objects.filter(role='police')
    if hasattr(request.user, 'police_station') and request.user.police_station:
        queryset = queryset.filter(police_station=request.user.police_station)
    
    officers = queryset.order_by('name', 'email')
    serializer = PoliceOfficerSerializer(officers, many=True)
    
    return Response({
        'officers': serializer.data,
        'total_count': officers.count()
    })

# ==================== UPDATE EXISTING VIEWS WITH LOCATION FILTERING ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def police_dashboard_stats(request):
    """Get comprehensive dashboard statistics with location filtering"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    # Get user's location for filtering (from query params or user profile)
    user_lat = request.GET.get('latitude')
    user_lon = request.GET.get('longitude')
    radius = float(request.GET.get('radius', 5))  # Default 5km
    
    today = timezone.now().date()
    week_start = today - timezone.timedelta(days=7)

    # Base queries
    all_sos_query = SOSAlert.objects.filter(is_active=True)
    all_reports_query = Report.objects.filter(status__in=['pending', 'investigating'])

    # Apply location filtering if coordinates provided
    if user_lat and user_lon:
        try:
            lat, lon = float(user_lat), float(user_lon)
            all_sos_query = filter_emergencies_nearby(lat, lon, radius_km=radius)
            all_reports_query = filter_reports_nearby(lat, lon, radius_km=radius).filter(
                status__in=['pending', 'investigating']
            )
        except (ValueError, TypeError):
            pass  # Use unfiltered queries if coordinates invalid

    # Calculate stats
    from sos.models import Volunteer, VolunteerAlert
    all_sos = SOSAlert.objects.all().count()
    responded_sos = VolunteerAlert.objects.filter(responded=True).count()
    
    stats = {
        'total_reports': all_reports_query.count(),
        'active_sos_alerts': all_sos_query.count(),
        'active_volunteers': Volunteer.objects.filter(is_available=True).count(),
        'response_rate': (responded_sos * 100) / all_sos if all_sos > 0 else 0,
        'reports_this_week': all_reports_query.filter(created_at__date__gte=week_start).count(),
        'resolved_this_week': Report.objects.filter(
            status='resolved',
            updated_at__date__gte=week_start
        ).count(),
        'avg_response_time': 2.5,
        'patrol_teams_active': PatrolTeam.objects.filter(is_active=True).count(),
        'location_filtered': bool(user_lat and user_lon),
        'filter_radius_km': radius if user_lat and user_lon else None
    }

    return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def police_sos_alerts(request):
    """Get SOS alerts with optional location filtering"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    # Get location parameters
    user_lat = request.GET.get('latitude')
    user_lon = request.GET.get('longitude')
    radius = float(request.GET.get('radius', 5))  # Default 5km

    # Apply location filtering if coordinates provided
    if user_lat and user_lon:
        try:
            lat, lon = float(user_lat), float(user_lon)
            alerts = filter_emergencies_nearby(lat, lon, radius_km=radius)
        except (ValueError, TypeError):
            alerts = SOSAlert.objects.filter(is_active=True).order_by('-created_at')
    else:
        alerts = SOSAlert.objects.filter(is_active=True).order_by('-created_at')

    serializer = PoliceSOSAlertSerializer(alerts, many=True)
    return Response({
        'results': serializer.data,
        'total_count': alerts.count(),
        'location_filtered': bool(user_lat and user_lon),
        'radius_km': radius if user_lat and user_lon else None
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_reports_combined(request):
    """Get all SOS alerts and incident reports combined with location filtering"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    # Get location parameters
    user_lat = request.GET.get('latitude')
    user_lon = request.GET.get('longitude')
    radius = float(request.GET.get('radius', 5))  # Default 5km

    try:
        # Get all SOS alerts (active and resolved)
        if user_lat and user_lon:
            lat, lon = float(user_lat), float(user_lon)
            sos_alerts = filter_emergencies_nearby(lat, lon, radius_km=radius)
            # Remove the is_active=True filter to get all SOS
            sos_alerts = SOSAlert.objects.filter(
                latitude__gte=get_bounding_box(lat, lon, radius)['min_lat'],
                latitude__lte=get_bounding_box(lat, lon, radius)['max_lat'],
                longitude__gte=get_bounding_box(lat, lon, radius)['min_lng'],
                longitude__lte=get_bounding_box(lat, lon, radius)['max_lng']
            ).order_by('-created_at')
            
            # Get all incident reports
            incident_reports = filter_reports_nearby(lat, lon, radius_km=radius)
            # Remove status filter to get all reports
            incident_reports = Report.objects.filter(
                latitude__gte=get_bounding_box(lat, lon, radius)['min_lat'],
                latitude__lte=get_bounding_box(lat, lon, radius)['max_lat'],
                longitude__gte=get_bounding_box(lat, lon, radius)['min_lng'],
                longitude__lte=get_bounding_box(lat, lon, radius)['max_lng']
            ).exclude(report_type='sos').order_by('-created_at')
        else:
            # Get all without location filtering
            sos_alerts = SOSAlert.objects.all().order_by('-created_at')
            incident_reports = Report.objects.exclude(report_type='sos').order_by('-created_at')

        # Combine and format data
        combined_reports = []

        # Add SOS alerts
        for alert in sos_alerts:
            combined_reports.append({
                'id': f"sos_{alert.id}",
                'original_id': alert.id,
                'type': 'sos',
                'title': f"SOS Emergency - {alert.emergency_type}",
                'description': alert.description or 'Emergency assistance needed',
                'status': 'resolved' if not alert.is_active else 'active',
                'priority': 'high',
                'latitude': alert.latitude,
                'longitude': alert.longitude,
                'reporter_name': alert.user.name if alert.user else 'Anonymous',
                'reporter_email': alert.user.email if alert.user else 'Anonymous',
                'created_at': alert.created_at,
                'resolved_at': alert.resolved_at,
                'emergency_type': alert.emergency_type,
                'is_streaming': alert.is_streaming,
                'assigned_team': get_assigned_team_name(alert)
            })

        # Add incident reports
        for report in incident_reports:
            combined_reports.append({
                'id': f"report_{report.id}",
                'original_id': report.id,
                'type': 'incident',
                'title': report.title,
                'description': report.description,
                'status': report.status,
                'priority': get_priority_from_type(report.report_type),
                'latitude': report.latitude,
                'longitude': report.longitude,
                'reporter_name': report.reported_by.name if report.reported_by else 'Anonymous',
                'reporter_email': report.reported_by.email if report.reported_by else 'Anonymous',
                'created_at': report.created_at,
                'resolved_at': report.updated_at if report.status == 'resolved' else None,
                'report_type': report.report_type,
                'location': report.location
            })

        # Sort by creation date (newest first)
        combined_reports.sort(key=lambda x: x['created_at'], reverse=True)

        return Response({
            'results': combined_reports,
            'total_count': len(combined_reports),
            'location_filtered': bool(user_lat and user_lon),
            'radius_km': radius if user_lat and user_lon else None,
            'summary': {
                'total_sos': len([r for r in combined_reports if r['type'] == 'sos']),
                'active_sos': len([r for r in combined_reports if r['type'] == 'sos' and r['status'] == 'active']),
                'total_incidents': len([r for r in combined_reports if r['type'] == 'incident']),
                'pending_incidents': len([r for r in combined_reports if r['type'] == 'incident' and r['status'] == 'pending'])
            }
        })

    except Exception as e:
        return Response({'error': str(e)}, status=500)

def get_assigned_team_name(sos_alert):
    """Get assigned team name for SOS alert"""
    try:
        response = sos_alert.police_responses.first()
        if response and response.assigned_team:
            return f"{response.assigned_team.team_id} - {response.assigned_team.station.name}"
        return None
    except:
        return None

def get_priority_from_type(report_type):
    """Get priority based on report type"""
    priority_map = {
        'crime': 'high',
        'harassment': 'high', 
        'safety': 'medium',
        'infrastructure': 'low'
    }
    return priority_map.get(report_type, 'medium')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def police_reports(request):
    """Get incident reports with location filtering"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    report_type = request.GET.get('type', 'all')
    user_lat = request.GET.get('latitude')
    user_lon = request.GET.get('longitude')
    radius = float(request.GET.get('radius', 5))

    # Apply location filtering
    if user_lat and user_lon:
        try:
            lat, lon = float(user_lat), float(user_lon)
            queryset = filter_reports_nearby(lat, lon, radius_km=radius)
        except (ValueError, TypeError):
            queryset = Report.objects.select_related('reported_by').exclude(report_type='sos')
    else:
        queryset = Report.objects.select_related('reported_by').exclude(report_type='sos')

    # Apply type filtering
    if report_type != 'all':
        queryset = queryset.filter(report_type=report_type)

    reports = queryset.order_by('-created_at')
    serializer = PoliceReportSerializer(reports, many=True)

    return Response({
        'results': serializer.data,
        'total_count': reports.count(),
        'location_filtered': bool(user_lat and user_lon),
        'radius_km': radius if user_lat and user_lon else None,
        'filters': {
            'total': Report.objects.exclude(report_type='sos').count(),
            'crime': Report.objects.filter(report_type='crime').count(),
            'safety': Report.objects.filter(report_type='safety').count(),
            'harassment': Report.objects.filter(report_type='harassment').count(),
            'infrastructure': Report.objects.filter(report_type='infrastructure').count(),
        }
    })

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_team_location(request, team_id):
    """Update patrol team's current location"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    team = get_object_or_404(PatrolTeam, id=team_id)
    
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    
    if not latitude or not longitude:
        return Response({
            'error': 'Both latitude and longitude are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        team.current_latitude = float(latitude)
        team.current_longitude = float(longitude)
        team.save()
        
        return Response({
            'message': f'Location updated for team {team.team_id}',
            'latitude': team.current_latitude,
            'longitude': team.current_longitude
        })
    except (ValueError, TypeError):
        return Response({
            'error': 'Invalid latitude or longitude values'
        }, status=status.HTTP_400_BAD_REQUEST)

# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def police_dashboard_stats(request):
#     """Get comprehensive dashboard statistics"""
#     if request.user.role != 'police':
#         return Response({'error': 'Police access required'}, status=403)
    
#     today = timezone.now().date()
#     week_start = today - timezone.timedelta(days=7)
#     all_sos = SOSAlert.objects.all().count()
#     responded_sos = VolunteerAlert.objects.filter(responded=True).count()
    
#     stats = {
#         'total_reports': Report.objects.filter(status__in=['pending', 'investigating']).count(),
#         'active_sos_alerts': SOSAlert.objects.filter(is_active=True).count(),
#         'active_volunteers': Volunteer.objects.filter(is_available=True).count(),  # Fixed: is_available not is_active
#         'response_rate': (responded_sos*100)/all_sos,
#         'reports_this_week': Report.objects.filter(created_at__date__gte=week_start).count(),
#         'resolved_this_week': Report.objects.filter(
#             status='resolved', 
#             updated_at__date__gte=week_start
#         ).count(),
#         'avg_response_time': 2.5,
#         'patrol_teams_active': PatrolTeam.objects.filter(is_active=True).count()
#     }
#     return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patrol_teams_list(request):
    """Get all patrol teams"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)
    
    teams = PatrolTeam.objects.select_related('station', 'team_leader').all()
    serializer = PatrolTeamSerializer(teams, many=True)
    
    return Response({
        'results': serializer.data,
        'total_count': teams.count()
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_team_to_sos(request, sos_id):
    """Assign patrol team to SOS alert with availability check"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)

    sos_alert = get_object_or_404(SOSAlert, id=sos_id)
    team_id = request.data.get('team_id')

    if not team_id:
        return Response({'error': 'Team ID required'}, status=400)

    team = get_object_or_404(PatrolTeam, id=team_id)
    
    # **NEW: Check if team is already assigned to another active SOS**
    existing_assignment = SOSResponse.objects.filter(
        assigned_team=team,
        sos_alert__is_active=True  # Only check active SOS alerts
    ).exclude(sos_alert=sos_alert).first()  # Exclude current SOS
    
    if existing_assignment:
        return Response({
            'error': f'Team {team.team_id} is already assigned to active SOS #{existing_assignment.sos_alert.id}. Please resolve that emergency first.'
        }, status=400)

    # Create or update assignment
    sos_response, created = SOSResponse.objects.get_or_create(
        sos_alert=sos_alert,
        defaults={
            'assigned_team': team,
            'status': 'assigned'
        }
    )

    if not created:
        sos_response.assigned_team = team
        sos_response.save()

    return Response({
        'message': f'Team {team.team_id} assigned successfully',
        'team_id': team.team_id,
        'response_id': sos_response.id
    })

# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def police_reports(request):
#     """Enhanced police reports with more details"""
#     if request.user.role != 'police':
#         return Response({'error': 'Police access required'}, status=403)
    
#     report_type = request.GET.get('type', 'all')
    
#     # Filter out 'sos' type reports as they're handled separately
#     queryset = Report.objects.select_related('reported_by').exclude(report_type='sos')
    
#     if report_type != 'all':
#         queryset = queryset.filter(report_type=report_type)
    
#     reports = queryset.order_by('-created_at')
#     serializer = PoliceReportSerializer(reports, many=True)
    
#     return Response({
#         'results': serializer.data,
#         'total_count': reports.count(),
#         'filters': {
#             'total': Report.objects.exclude(report_type='sos').count(),
#             'crime': Report.objects.filter(report_type='crime').count(),
#             'safety': Report.objects.filter(report_type='safety').count(),  # Fixed: 'safety' not 'safety_concern'
#             'harassment': Report.objects.filter(report_type='harassment').count(),
#             'infrastructure': Report.objects.filter(report_type='infrastructure').count(),
#         }
#     })

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_report_status(request, report_id):
    """Update report status (Police only)"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)
    
    report = get_object_or_404(Report, id=report_id)
    new_status = request.data.get('status')
    
    if new_status not in ['pending', 'investigating', 'resolved', 'dismissed']:
        return Response({'error': 'Invalid status'}, status=400)
    
    report.status = new_status
    report.save()
    
    return Response({
        'message': 'Report status updated successfully',
        'status': new_status
    })

# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def police_sos_alerts(request):
#     """Get active SOS alerts for police"""
#     if request.user.role != 'police':
#         return Response({'error': 'Police access required'}, status=403)
    
#     alerts = SOSAlert.objects.filter(is_active=True).order_by('-created_at')
#     serializer = PoliceSOSAlertSerializer(alerts, many=True)
    
#     return Response({
#         'results': serializer.data,
#         'total_count': alerts.count()
#     })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def police_volunteers(request):
    """Get active volunteers"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)
    
    volunteers = Volunteer.objects.all().select_related('user')
    
    serializer = VolunteerActivitySerializer(volunteers, many=True)
    
    return Response({
        'results': serializer.data,
        'total_count': volunteers.count()
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def release_official_alert(request):
    """Enhanced official alert creation"""
    if request.user.role != 'police':
        return Response({'error': 'Police access required'}, status=403)
    
    # Add the station info if not provided
    data = request.data.copy()
    if 'issued_by_station' not in data:
        # Get first available police station - you might want to improve this logic
        from safety.models import PoliceStation
        station = PoliceStation.objects.first()
        if station:
            data['issued_by_station'] = station.id
    
    serializer = OfficialAlertSerializer(data=data, context={'request': request})
    
    if serializer.is_valid():
        alert = serializer.save()
        return Response({
            'message': 'Official alert published successfully',
            'alert_id': alert.id,
            'title': alert.title
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=400)