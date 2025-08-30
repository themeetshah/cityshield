from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.conf import settings
from datetime import datetime, timedelta
import math
import json
import logging
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from .models import PoliceVideoView, SOSAlert, SOSLocationUpdate, SOSVideoFeed, Volunteer, VolunteerAlert
from .serializers import SOSAlertSerializer, VolunteerSerializer, VolunteerAlertSerializer

# ==================== UTILITY FUNCTIONS ====================

def calculate_distance(lat1, lng1, lat2, lng2):
    """Calculate distance between two points using Haversine formula"""
    R = 6371e3  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

def get_volunteers_in_radius(latitude, longitude, radius_meters):
    """Get available volunteers within specified radius"""
    thirty_minutes_ago = timezone.now() - timedelta(minutes=30)
    
    available_volunteers = Volunteer.objects.filter(
        is_available=True,
        last_location_update__gte=thirty_minutes_ago,
        current_latitude__isnull=False,
        current_longitude__isnull=False
    )
    
    nearby_volunteers = []
    for volunteer in available_volunteers:
        distance = calculate_distance(
            latitude, longitude,
            volunteer.current_latitude, volunteer.current_longitude
        )
        if distance <= radius_meters:
            nearby_volunteers.append(volunteer)
    
    return nearby_volunteers

# ==================== SOS ALERT MANAGEMENT ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def create_emergency_alert(request):
    """Create immediate emergency SOS alert"""
    try:
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        emergency_type = request.data.get('emergency_type', 'general_emergency')
        
        if not latitude or not longitude:
            return Response({'error': 'Location is required for emergency alert'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        # Create emergency alert
        sos_alert = SOSAlert.objects.create(
            user=request.user if request.user.is_authenticated else None,
            latitude=float(latitude),
            longitude=float(longitude),
            emergency_type=emergency_type,
            is_active=True
        )

        return Response({
            'message': 'EMERGENCY ALERT ACTIVATED!',
            'sos_id': sos_alert.id,
            'alert_type': 'Emergency Alert',
            'status': 'active',
            'emergency_services_notified': True,
            'volunteers_will_be_alerted': True
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_active_sos(request):
    """Get all active SOS alerts"""
    try:
        two_hours_ago = timezone.now() - timedelta(hours=2)
        active_alerts = SOSAlert.objects.filter(
            is_active=True
        ).order_by('-created_at')

        alerts_data = []
        for alert in active_alerts:
            alerts_data.append({
                'id': alert.id,
                'latitude': alert.latitude,
                'longitude': alert.longitude,
                'emergency_type': alert.emergency_type,
                'created_at': alert.created_at.isoformat(),
                'user_email': alert.user.email if alert.user else 'Anonymous',
                'is_active': alert.is_active
            })

        return Response(alerts_data)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_sos(request):
    """Get all active SOS alerts"""
    try:
        two_hours_ago = timezone.now() - timedelta(hours=2)
        active_alerts = SOSAlert.objects.all().order_by('-created_at')

        alerts_data = []
        for alert in active_alerts:
            alerts_data.append({
                'id': alert.id,
                'latitude': alert.latitude,
                'longitude': alert.longitude,
                'emergency_type': alert.emergency_type,
                'created_at': alert.created_at.isoformat(),
                'user_email': alert.user.email if alert.user else 'Anonymous',
                'is_active': alert.is_active
            })

        return Response(alerts_data)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def calculate_distance(lat1, lng1, lat2, lng2):
    """Calculate distance between two points using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)

    a = (math.sin(delta_lat/2) * math.sin(delta_lat/2) +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lng/2) * math.sin(delta_lng/2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c

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

@api_view(['POST'])
@permission_classes([AllowAny])
def resolve_sos(request, sos_id):
    """Resolve SOS alert"""
    try:
        sos_alert = get_object_or_404(SOSAlert, id=sos_id)
        sos_alert.is_active = False
        sos_alert.resolved_at = timezone.now()
        sos_alert.save()

        return Response({
            'success': True,
            'message': 'Emergency alert resolved successfully'
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== LOCATION SERVICES ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def send_location_update(request):
    """Receive periodic location updates during emergency"""
    try:
        # print(request.data)
        sos_id = request.data.get('sos_id')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        accuracy = request.data.get('accuracy')

        if not all([sos_id, latitude, longitude]):
            return Response({'error': 'SOS ID and location required'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        sos_alert = get_object_or_404(SOSAlert, id=sos_id, is_active=True)

        # Save location update
        location_update = SOSLocationUpdate.objects.create(
            sos_alert=sos_alert,
            latitude=float(latitude),
            longitude=float(longitude),
            accuracy=float(accuracy) if accuracy else None
        )

        # Update main SOS record with latest location
        sos_alert.latitude = float(latitude)
        sos_alert.longitude = float(longitude)
        sos_alert.save()

        return Response({
            'success': True,
            'message': 'Location updated successfully',
            'update_id': location_update.id
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_location_updates(request, sos_id):
    """Get location updates for specific SOS alert"""
    try:
        sos_alert = get_object_or_404(SOSAlert, id=sos_id)
        updates = SOSLocationUpdate.objects.filter(
            sos_alert=sos_alert
        ).order_by('-timestamp')

        updates_data = []
        for update in updates:
            updates_data.append({
                'id': update.id,
                'latitude': update.latitude,
                'longitude': update.longitude,
                'accuracy': update.accuracy,
                'timestamp': update.timestamp.isoformat()
            })

        return Response(updates_data)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def update_sos_location(request, sos_id):
    """Update location for an SOS alert"""
    try:
        sos_alert = get_object_or_404(SOSAlert, id=sos_id)
        
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        
        if not latitude or not longitude:
            return Response({'error': 'Latitude and longitude required'},
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Create location update
        location_update = SOSLocationUpdate.objects.create(
            sos_alert=sos_alert,
            latitude=float(latitude),
            longitude=float(longitude),
            timestamp=timezone.now()
        )
        
        # Update SOS alert location
        sos_alert.latitude = float(latitude)
        sos_alert.longitude = float(longitude)
        sos_alert.save()
        
        return Response({
            'success': True,
            'location_update_id': location_update.id,
            'message': 'Location updated successfully'
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def find_nearest_safe_location(request):
    """Find nearest safe location with directions"""
    try:
        latitude = float(request.data.get('latitude'))
        longitude = float(request.data.get('longitude'))
        radius = int(request.data.get('radius', 10000))

        # Import here to avoid circular imports
        from safety.models import PoliceStation, Hospital
        from safety.views import get_bounding_box

        bbox = get_bounding_box(latitude, longitude, radius)
        
        # Get nearby facilities
        nearby_hospitals = Hospital.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )
        
        nearby_police = PoliceStation.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )

        all_safe_locations = []

        # Add hospitals
        for hospital in nearby_hospitals:
            distance = calculate_distance(latitude, longitude, hospital.latitude, hospital.longitude)
            if distance <= radius:
                all_safe_locations.append({
                    'id': hospital.id,
                    'name': hospital.name,
                    'type': 'hospital',
                    'latitude': hospital.latitude,
                    'longitude': hospital.longitude,
                    'address': hospital.address or '',
                    'distance': round(distance),
                    'emergency_services': 'Medical Emergency',
                    'priority': 1
                })

        # Add police stations
        for station in nearby_police:
            distance = calculate_distance(latitude, longitude, station.latitude, station.longitude)
            if distance <= radius:
                all_safe_locations.append({
                    'id': station.id,
                    'name': station.name,
                    'type': 'police',
                    'latitude': station.latitude,
                    'longitude': station.longitude,
                    'address': station.address or '',
                    'distance': round(distance),
                    'emergency_services': 'Law Enforcement',
                    'priority': 1
                })

        if not all_safe_locations:
            return Response({'error': 'No safe locations found nearby'}, 
                          status=status.HTTP_404_NOT_FOUND)

        # Sort by distance
        all_safe_locations.sort(key=lambda x: x.get('distance', float('inf')))
        nearest = all_safe_locations[0]

        return Response({
            'nearest_location': nearest,
            'all_locations': all_safe_locations[:5],  # Return top 5
            'search_radius': radius
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== VOLUNTEER MANAGEMENT ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_volunteer_view(request):
    """Register user as volunteer"""
    try:
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response({'error': 'Phone number is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        volunteer, created = Volunteer.objects.get_or_create(
            user=request.user,
            defaults={'phone_number': phone_number}
        )

        if not created:
            volunteer.phone_number = phone_number
            volunteer.save()

        return Response({
            'success': True,
            'message': 'Volunteer registration successful',
            'volunteer_id': volunteer.id,
            'verification_pending': not volunteer.is_verified
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def volunteer_availability_view(request):
    """Get or update volunteer availability status"""
    try:
        volunteer = get_object_or_404(Volunteer, user=request.user)
        
        if request.method == 'GET':
            return Response({
                'is_available': volunteer.is_available,
                'last_location_update': volunteer.last_location_update,
                'current_latitude': volunteer.current_latitude,
                'current_longitude': volunteer.current_longitude
            })
        
        elif request.method == 'POST':
            is_available = request.data.get('is_available', volunteer.is_available)
            latitude = request.data.get('latitude')
            longitude = request.data.get('longitude')
            
            volunteer.is_available = is_available
            if latitude and longitude and is_available:
                volunteer.current_latitude = float(latitude)
                volunteer.current_longitude = float(longitude)
                volunteer.last_location_update = timezone.now()
            elif not is_available:
                volunteer.current_latitude = None
                volunteer.current_longitude = None
            
            volunteer.save()
            
            return Response({
                'success': True,
                'is_available': volunteer.is_available,
                'message': f'Availability updated to {"available" if is_available else "unavailable"}'
            })
            
    except Volunteer.DoesNotExist:
        return Response({'error': 'User is not registered as a volunteer'},
                      status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_volunteer_profile(request):
    """Get volunteer profile for current user"""
    try:
        volunteer = get_object_or_404(Volunteer, user=request.user)
        serializer = VolunteerSerializer(volunteer)
        return Response(serializer.data)
        
    except Volunteer.DoesNotExist:
        return Response({'error': 'User is not registered as a volunteer'},
                      status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_volunteer_status(request):
    """Get basic volunteer status for current user"""
    try:
        volunteer = Volunteer.objects.filter(user=request.user).first()
        if volunteer:
            return Response({
                'is_volunteer': True,
                'is_available': volunteer.is_available,
                'phone_number': volunteer.phone_number,
                'response_count': VolunteerAlert.objects.filter(volunteer=volunteer).count()
            })
        else:
            return Response({
                'is_volunteer': False,
                'is_available': False
            })
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== EMERGENCY RESPONSE ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def alert_volunteers_view(request):
    """Alert nearby volunteers about an SOS"""
    try:
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        sos_alert_id = request.data.get('sos_alert_id')
        radius = request.data.get('radius', 2000)  # Default 2km radius
        
        if not all([latitude, longitude, sos_alert_id]):
            return Response({'error': 'latitude, longitude, and sos_alert_id are required'},
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Get the SOS alert
        sos_alert = get_object_or_404(SOSAlert, id=sos_alert_id)
        
        # Find nearby available volunteers
        nearby_volunteers = get_volunteers_in_radius(float(latitude), float(longitude), radius)
        
        # Create volunteer alerts
        volunteer_alerts_created = []
        for volunteer in nearby_volunteers:
            # Don't alert if already responded to this SOS
            if not VolunteerAlert.objects.filter(
                volunteer=volunteer,
                sos_alert=sos_alert
            ).exists():
                volunteer_alert = VolunteerAlert.objects.create(
                    volunteer=volunteer,
                    sos_alert=sos_alert,
                    distance_from_sos=calculate_distance(
                        float(latitude), float(longitude),
                        volunteer.current_latitude, volunteer.current_longitude
                    )
                )
                volunteer_alerts_created.append(volunteer_alert)
        
        return Response({
            'success': True,
            'volunteers_alerted': len(volunteer_alerts_created),
            'message': f'Alerted {len(volunteer_alerts_created)} nearby volunteers'
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def volunteer_respond_to_sos(request, sos_id):
    """Volunteer responds to specific SOS alert"""
    try:
        volunteer = get_object_or_404(Volunteer, user=request.user)
        sos_alert = get_object_or_404(SOSAlert, id=sos_id)
        
        # Check if already responded
        existing_response = VolunteerAlert.objects.filter(
            volunteer=volunteer,
            sos_alert=sos_alert
        ).first()
        
        if existing_response:
            return Response({'error': 'You have already responded to this SOS'},
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate distance
        distance = 0
        if volunteer.current_latitude and volunteer.current_longitude:
            distance = calculate_distance(
                sos_alert.latitude, sos_alert.longitude,
                volunteer.current_latitude, volunteer.current_longitude
            )
        
        # Create volunteer response
        volunteer_alert = VolunteerAlert.objects.create(
            volunteer=volunteer,
            sos_alert=sos_alert,
            response_time=timezone.now(),
            distance_from_sos=distance,
            status='responding'
        )
        
        return Response({
            'success': True,
            'response_id': volunteer_alert.id,
            'message': 'Response registered successfully'
        })
        
    except Volunteer.DoesNotExist:
        return Response({'error': 'User is not registered as a volunteer'},
                      status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_nearby_volunteers(request):
    """Get volunteers near a specific location"""
    try:
        latitude = float(request.GET.get('latitude', 0))
        longitude = float(request.GET.get('longitude', 0))
        radius = float(request.GET.get('radius', 5000))  # Default 5km
        
        if not latitude or not longitude:
            return Response({'error': 'latitude and longitude are required'},
                          status=status.HTTP_400_BAD_REQUEST)
        
        volunteers = get_volunteers_in_radius(latitude, longitude, radius)
        serializer = VolunteerSerializer(volunteers, many=True)
        
        return Response({
            'count': len(volunteers),
            'volunteers': serializer.data
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== VIDEO/MEDIA SERVICES ====================

@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def upload_camera_feed(request):
    """Receive live camera feed for emergency services"""
    try:
        sos_id = request.data.get('sos_id')
        video_file = request.FILES.get('video')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        
        # Enhanced validation with detailed logging
        if not sos_id:
            logger.warning(f"Missing sos_id in request data: {request.data}")
            return Response({
                'success': False,
                'error': 'SOS ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        if not video_file:
            return Response({
                'success': False,
                'error': 'Video file is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Convert sos_id to integer if needed
        try:
            sos_id = int(sos_id)
        except (ValueError, TypeError):
            logger.error(f"Invalid sos_id format: {sos_id} (type: {type(sos_id)})")
            return Response({
                'success': False,
                'error': f'Invalid SOS ID format: {sos_id}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate video file size (max 50MB per chunk)
        if video_file.size > 50 * 1024 * 1024:
            return Response({
                'success': False,
                'error': 'Video chunk too large (max 50MB)'
            }, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        
        # Better SOS alert lookup with detailed error handling
        try:
            sos_alert = SOSAlert.objects.get(id=sos_id)
            logger.info(f"Found SOS Alert {sos_id}: is_active={sos_alert.is_active}")
        except SOSAlert.DoesNotExist:
            logger.error(f"SOS Alert with ID {sos_id} does not exist")
            return Response({
                'success': False,
                'error': f'SOS Alert with ID {sos_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if SOS is active
        if not sos_alert.is_active:
            logger.warning(f"SOS Alert {sos_id} is not active (is_active=False)")
            return Response({
                'success': False,
                'error': f'SOS Alert {sos_id} is no longer active'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Update SOS alert streaming status
            if not sos_alert.is_streaming:
                sos_alert.is_streaming = True
                sos_alert.camera_feed_started = timezone.now()
                sos_alert.save()
            
            # Get next sequence number
            last_chunk = SOSVideoFeed.objects.filter(
                sos_alert=sos_alert
            ).order_by('-chunk_sequence').first()
            
            next_sequence = (last_chunk.chunk_sequence + 1) if last_chunk else 1
            
            # Save video feed
            video_feed = SOSVideoFeed.objects.create(
                sos_alert=sos_alert,
                video_file=video_file,
                sent_to_police=True,
                file_size=video_file.size,
                chunk_sequence=next_sequence,
                timestamp=timezone.now()
            )
            
            # Update total counts
            sos_alert.video_chunks_count += 1
            sos_alert.save()
            
            # Notify all police users about new video feed
            try:
                notify_police_about_video_feed.delay(video_feed.id)
            except Exception as celery_error:
                logger.warning(f"Failed to send Celery notification: {celery_error}")
            
        logger.info(f"✅ Video chunk {next_sequence} uploaded for SOS {sos_id}: {video_file.name} ({video_file.size} bytes)")
        
        return Response({
            'success': True,
            'message': 'Video feed received by emergency services',
            'feed_details': {
                'feed_id': video_feed.id,
                'sos_id': sos_id,
                'chunk_sequence': next_sequence,
                'file_size': f"{video_file.size / 1024 / 1024:.1f}MB",
                'uploaded_at': video_feed.timestamp.isoformat(),
                'status': 'forwarded_to_police'
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error uploading camera feed: {str(e)}")
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_police_video_feeds(request):
    """Get video feeds for police officers"""
    try:
        # Check if user is police or admin
        user_role = get_user_role(request.user)
        if user_role not in ['police', 'admin']:
            return Response({
                'success': False,
                'error': 'Access denied - police access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get active SOS alerts with video feeds
        active_sos_with_video = SOSAlert.objects.filter(
            is_active=True,
            is_streaming=True,
            video_feeds__isnull=False
        ).distinct().order_by('-created_at')
        
        feeds_data = []
        for sos_alert in active_sos_with_video:
            # Get latest video feeds for this SOS
            latest_feeds = SOSVideoFeed.objects.filter(
                sos_alert=sos_alert
            ).order_by('-timestamp')[:10]  # Latest 10 chunks
            
            feed_chunks = []
            for feed in latest_feeds:
                # Mark as viewed by this police officer
                PoliceVideoView.objects.get_or_create(
                    video_feed=feed,
                    police_officer=request.user,
                    defaults={'viewed_at': timezone.now()}
                )
                
                feed_chunks.append({
                    'id': feed.id,
                    'video_url': feed.video_file.url if feed.video_file else None,
                    'timestamp': feed.timestamp.isoformat(),
                    'file_size': f"{feed.file_size / 1024 / 1024:.1f}MB" if feed.file_size else "Unknown",
                    'chunk_sequence': feed.chunk_sequence,
                    'viewed_by_police': feed.viewed_by_police
                })
            
            feeds_data.append({
                'sos_id': sos_alert.id,
                'emergency_type': sos_alert.emergency_type,
                'latitude': sos_alert.latitude,
                'longitude': sos_alert.longitude,
                'user_email': sos_alert.user.email if sos_alert.user else 'Anonymous',
                'created_at': sos_alert.created_at.isoformat(),
                'camera_feed_started': sos_alert.camera_feed_started.isoformat() if sos_alert.camera_feed_started else None,
                'total_chunks': sos_alert.video_chunks_count,
                'is_streaming': sos_alert.is_streaming,
                'video_feeds': feed_chunks
            })
        
        return Response({
            'success': True,
            'active_emergency_feeds': feeds_data,
            'total_active_sos': len(feeds_data),
            'officer': request.user.email,
            'last_updated': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting police video feeds: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# sos/views.py - Updated Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_emergency_video_feeds(request, emergency_id):
    """Get video feeds for specific emergency ID"""
    try:
        user_role = get_user_role(request.user)
        if user_role not in ['police', 'admin']:
            return Response({
                'success': False,
                'error': 'Access denied - police access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get video feeds for this emergency
        video_feeds = SOSVideoFeed.objects.filter(
            emergency_id=emergency_id
        ).order_by('-timestamp')

        
        feeds_data = []
        for feed in video_feeds:
            feeds_data.append({
                'id': feed.id,
                'video_url': request.build_absolute_uri(feed.video_file.url) if feed.video_file else None,
                'timestamp': feed.timestamp.isoformat(),
                'chunk_sequence': feed.chunk_sequence,
                'file_size': feed.file_size,
                'file_size_formatted': f"{feed.file_size / (1024 * 1024):.1f}MB" if feed.file_size else "Unknown",
                'duration': feed.duration
            })
        
        # Get associated SOS alert info
        try:
            sos_alert = SOSAlert.objects.filter(id=emergency_id).first()
            emergency_info = {
                'emergency_type': sos_alert.emergency_type if sos_alert else 'Unknown',
                'user_name': sos_alert.user.get_full_name() if sos_alert and sos_alert.user else 'Anonymous',
                'latitude': float(sos_alert.latitude) if sos_alert and sos_alert.latitude else None,
                'longitude': float(sos_alert.longitude) if sos_alert and sos_alert.longitude else None,
                'created_at': sos_alert.created_at.isoformat() if sos_alert else None,
                'description': sos_alert.description if sos_alert else None,
            }
        except:
            emergency_info = {
                'emergency_type': 'Unknown',
                'user_name': 'Anonymous',
                'latitude': None,
                'longitude': None,
                'created_at': None,
                'description': None,
            }
        
        return Response({
            'success': True,
            'emergency_id': emergency_id,
            'emergency_info': emergency_info,
            'video_feeds': feeds_data,
            'total_chunks': len(feeds_data),
            'last_updated': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting video feeds for emergency {emergency_id}: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# sos/views.py - Handle discrete chunks
@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def upload_emergency_video_chunk(request):
    """Upload discrete video chunk for emergency"""
    try:
        emergency_id = request.data.get('sos_id')
        video_file = request.FILES.get('video')
        chunk_number = request.data.get('chunk_number', 1)  # Get chunk sequence
        
        if not emergency_id or not video_file:
            return Response({
                'success': False,
                'error': 'Emergency ID and video file are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if video_file.size > 50 * 1024 * 1024:
            return Response({
                'success': False,
                'error': 'Video chunk too large (max 50MB)'
            }, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        
        with transaction.atomic():
            # ✅ SAVE EACH DISCRETE CHUNK AS SEPARATE RECORD
            video_feed = SOSVideoFeed.objects.create(
                emergency_id=emergency_id,
                video_file=video_file,
                sent_to_police=True,
                file_size=video_file.size,
                chunk_sequence=chunk_number,  # Track sequence
                timestamp=timezone.now()
            )
            
            # Update SOS alert streaming status
            try:
                sos_alert = SOSAlert.objects.get(id=emergency_id)
                if not sos_alert.is_streaming:
                    sos_alert.is_streaming = True
                    sos_alert.save()
                video_feed.sos_alert = sos_alert
                video_feed.save()
            except SOSAlert.DoesNotExist:
                pass
            
        logger.info(f"✅ Saved discrete chunk {chunk_number} for emergency {emergency_id}: {video_file.size} bytes")
        
        return Response({
            'success': True,
            'message': f'Discrete chunk {chunk_number} saved successfully',
            'feed_details': {
                'feed_id': video_feed.id,
                'emergency_id': emergency_id,
                'chunk_sequence': chunk_number,
                'file_size': f"{video_file.size / (1024 * 1024):.1f}MB",
                'uploaded_at': video_feed.timestamp.isoformat(),
                'video_url': request.build_absolute_uri(video_feed.video_file.url)
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error uploading discrete chunk: {str(e)}")
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_video_viewed(request, video_feed_id):
    """Mark video as viewed by police officer"""
    try:
        user_role = get_user_role(request.user)
        if user_role not in ['police', 'admin']:
            return Response({
                'success': False,
                'error': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        video_feed = get_object_or_404(SOSVideoFeed, id=video_feed_id)
        viewing_duration = request.data.get('viewing_duration', 0)
        
        # Update or create police view record
        police_view, created = PoliceVideoView.objects.get_or_create(
            video_feed=video_feed,
            police_officer=request.user,
            defaults={
                'viewed_at': timezone.now(),
                'viewing_duration': viewing_duration
            }
        )
        
        if not created:
            police_view.viewing_duration = viewing_duration
            police_view.save()
        
        # Mark video as viewed
        if not video_feed.viewed_by_police:
            video_feed.viewed_by_police = True
            video_feed.viewed_at = timezone.now()
            video_feed.save()
        
        return Response({
            'success': True,
            'message': 'Video marked as viewed',
            'viewing_duration': viewing_duration
        })
        
    except Exception as e:
        logger.error(f"Error marking video as viewed: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# NEW: Celery task for notifications (optional)
def notify_police_about_video_feed(video_feed_id):
    """Background task to notify police about new video feed"""
    try:
        video_feed = SOSVideoFeed.objects.get(id=video_feed_id)
        
        # Get all police users
        police_users = User.objects.filter(
            Q(is_police=True) | Q(groups__name='Police')
        )
        
        # Here you would send push notifications, emails, etc.
        # For now, just log
        logger.info(f"New video feed available for SOS {video_feed.sos_alert.id} - notifying {police_users.count()} officers")
        
    except Exception as e:
        logger.error(f"Error notifying police: {str(e)}")

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_video_feed(request, sos_id):
    """Get video feeds for specific SOS alert"""
    try:
        sos_alert = get_object_or_404(SOSAlert, id=sos_id)
        video_feeds = SOSVideoFeed.objects.filter(sos_alert=sos_alert).order_by('-timestamp')
        
        feeds_data = []
        for feed in video_feeds:
            feeds_data.append({
                'id': feed.id,
                'video_url': feed.video_file.url if feed.video_file else None,
                'timestamp': feed.timestamp.isoformat(),
                'sent_to_police': feed.sent_to_police
            })
        
        return Response(feeds_data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def start_video_feed(request, sos_id):
    """Start live video stream for emergency"""
    try:
        sos_alert = get_object_or_404(SOSAlert, id=sos_id, is_active=True)
        
        # Update alert to indicate streaming is active
        sos_alert.is_streaming = True
        sos_alert.stream_url = f"https://stream.cityshield.com/emergency/{sos_id}"
        sos_alert.save()

        return Response({
            'success': True,
            'message': 'Live stream initiated',
            'stream_active': True,
            'emergency_services_notified': True
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


User = get_user_model()
logger = logging.getLogger(__name__)

# Add this utility function
def get_user_role(user):
    """Determine user role"""
    return user.role

# ADD THESE MISSING FUNCTIONS:


@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_sos(request):
    """Get reports within specified radius"""
    try:
        user_lat = float(request.GET.get('latitude', 0))
        user_lng = float(request.GET.get('longitude', 0))
        radius = int(request.GET.get('radius', 5000))

        if not user_lat or not user_lng:
            return Response({'error': 'Latitude and longitude required'},
                          status=status.HTTP_400_BAD_REQUEST)

        bbox = get_bounding_box(user_lat, user_lng, radius)

        # Get nearby reports
        nearby_reports = SOSAlert.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        ).order_by('-created_at')

        # Filter by exact distance and add distance field
        alerts_data = []
        for alert in nearby_reports:
            alerts_data.append({
                'id': alert.id,
                'latitude': alert.latitude,
                'longitude': alert.longitude,
                'emergency_type': alert.emergency_type,
                'created_at': alert.created_at.isoformat(),
                'user_email': alert.user.email if alert.user else 'Anonymous',
                'is_active': alert.is_active
            })

        return Response(alerts_data)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sos_by_role(request):
    """Get SOS alerts filtered by user role - MAIN API ENDPOINT"""
    try:
        user_role = get_user_role(request.user)
        user_lat = float(request.GET.get('latitude', 0))
        user_lng = float(request.GET.get('longitude', 0))
        radius = int(request.GET.get('radius', 5000))
        logger.info(f"Getting SOS alerts for user role: {user_role}")
        print(user_role)

        if not user_lat or not user_lng:
            return Response({
                'success': False,
                'error': 'Latitude and longitude are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        bbox = get_bounding_box(user_lat, user_lng, radius)
        logger.info(f"Bounding box for radius {radius} around ({user_lat}, {user_lng}): {bbox}")
        # Get nearby SOS alerts based on bounding box
        # nearby_alerts = SOSAlert.objects.filter(
        #     latitude__gte=bbox['min_lat'],
        #     latitude__lte=bbox['max_lat'],
        #     longitude__gte=bbox['min_lng'],
        #     longitude__lte=bbox['max_lng']
        # ).order_by('-created_at')
        
        # Role-based filtering
        if user_role in ['admin', 'volunteer', 'police']:
            # Show all SOS alerts (active and resolved) for authorized users
            alerts = SOSAlert.objects.filter(
                latitude__gte=bbox['min_lat'],
                latitude__lte=bbox['max_lat'],
                longitude__gte=bbox['min_lng'],
                longitude__lte=bbox['max_lng']
            ).order_by('-created_at')
            logger.info(f"Showing all alerts for {user_role}: {alerts.count()} alerts")
        else:
            # Regular users only see resolved SOS alerts
            alerts = SOSAlert.objects.filter(
                is_active=False,
                latitude__gte=bbox['min_lat'],
                latitude__lte=bbox['max_lat'],
                longitude__gte=bbox['min_lng'],
                longitude__lte=bbox['max_lng']
            ).order_by('-created_at')[:50]
            logger.info(f"Showing resolved alerts for citizen: {alerts.count()} alerts")
        
        alerts_data = []
        for alert in alerts:
            try:
                # Count responders
                responders_count = VolunteerAlert.objects.filter(
                    sos_alert=alert,
                    responded=True
                ).count()
                
                alert_data = {
                    'id': alert.id,
                    'latitude': float(alert.latitude),
                    'longitude': float(alert.longitude),
                    'emergency_type': alert.emergency_type or 'general_emergency',
                    'description': getattr(alert, 'description', '') or f'Emergency: {alert.emergency_type or "General Emergency"} - Immediate assistance required',
                    'created_at': alert.created_at.isoformat(),
                    'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None,
                    'user_email': alert.user.email if alert.user else 'Anonymous',
                    'is_active': alert.is_active,
                    'is_streaming': alert.is_streaming or False,
                    'stream_url': alert.stream_url or '',
                    'responders_count': responders_count,
                }
                
                alerts_data.append(alert_data)
                
            except Exception as e:
                logger.error(f"Error processing alert {alert.id}: {str(e)}")
                continue
        
        response_data = {
            'success': True,
            'alerts': alerts_data,
            'user_role': user_role,
            'total_count': len(alerts_data),
            'active_count': len([a for a in alerts_data if a['is_active']]),
            'resolved_count': len([a for a in alerts_data if not a['is_active']]),
        }
        
        logger.info(f"Returning {len(alerts_data)} alerts for user role {user_role}")
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in get_sos_by_role: {str(e)}")
        return Response({
            'success': False,
            'error': str(e),
            'alerts': [],
            'user_role': 'unknown'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_sos(request):
    """Volunteer/Police respond to SOS alert"""
    try:
        user_role = get_user_role(request.user)
        logger.info(f"SOS response attempt by user role: {user_role}")
        
        if user_role not in ['volunteer', 'police', 'admin']:
            return Response({
                'success': False,
                'error': 'Only volunteers, police, and administrators can respond to SOS alerts'
            }, status=status.HTTP_403_FORBIDDEN)  # Changed from 404 to 403
        
        sos_id = request.data.get('sos_id')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        message = request.data.get('message', 'Responding to emergency')
        
        if not sos_id:
            return Response({
                'success': False,
                'error': 'SOS ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            sos_alert = SOSAlert.objects.get(id=sos_id, is_active=True)
        except SOSAlert.DoesNotExist:
            return Response({
                'success': False,
                'error': 'SOS alert not found or already resolved'
            }, status=status.HTTP_404_NOT_FOUND)
        
        with transaction.atomic():
            if user_role == 'volunteer':
                try:
                    volunteer = Volunteer.objects.get(user=request.user)
                    
                    if not volunteer.is_verified:
                        return Response({
                            'success': False,
                            'error': 'Only verified volunteers can respond to emergencies'
                        }, status=status.HTTP_403_FORBIDDEN)
                    
                except Volunteer.DoesNotExist:
                    # AUTO-REGISTER as volunteer if user tries to respond
                    phone_number = getattr(request.user, 'phone', '') or '000-000-0000'  # Fallback phone
                    volunteer = Volunteer.objects.create(
                        user=request.user,
                        phone_number=phone_number,
                        is_verified=True,  # Auto-verify for emergency response
                        is_available=True
                    )
                    logger.info(f"Auto-registered {request.user.email} as volunteer during emergency response")
                
                # Check if already responded
                existing_response = VolunteerAlert.objects.filter(
                    volunteer=volunteer,
                    sos_alert=sos_alert
                ).first()
                
                if existing_response and existing_response.responded:
                    return Response({
                        'success': False,
                        'error': 'You have already responded to this SOS alert'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Calculate distance if location provided
                distance = None
                if latitude and longitude:
                    try:
                        distance = calculate_distance(
                            sos_alert.latitude, sos_alert.longitude,
                            float(latitude), float(longitude)
                        )
                    except (ValueError, TypeError):
                        distance = None
                
                # Create or update volunteer response
                if existing_response:
                    existing_response.responded = True
                    existing_response.response_time = timezone.now()
                    existing_response.message = message
                    existing_response.distance = distance
                    existing_response.status = 'responding'
                    existing_response.save()
                    volunteer_alert = existing_response
                else:
                    volunteer_alert = VolunteerAlert.objects.create(
                        volunteer=volunteer,
                        sos_alert=sos_alert,
                        responded=True,
                        response_time=timezone.now(),
                        message=message,
                        distance=distance,
                        status='responding'
                    )
                
                # Update volunteer location if provided
                if latitude and longitude:
                    volunteer.current_latitude = float(latitude)
                    volunteer.current_longitude = float(longitude)
                    volunteer.last_location_update = timezone.now()
                    volunteer.save()
                
                logger.info(f"Volunteer {request.user.email} responded to SOS {sos_id}")
                
                return Response({
                    'success': True,
                    'message': 'Successfully registered as emergency responder',
                    'response_id': volunteer_alert.id,
                    'responder_type': 'volunteer',
                    'auto_registered': volunteer.pk is None  # True if just created
                }, status=status.HTTP_200_OK)  # Changed to 200
                
            else:  # Police or admin response
                logger.info(f"Police/Admin {request.user.email} responded to SOS {sos_id}")
                
                return Response({
                    'success': True,
                    'message': f'{user_role.title()} response registered successfully',
                    'responder_type': user_role
                }, status=status.HTTP_200_OK)  # Changed to 200
            
    except Exception as e:
        logger.error(f"Error in respond_to_sos: {str(e)}")
        return Response({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])  # Or AllowAny if anyone can access
def all_sos_responses(request):
    responses = VolunteerAlert.objects.all()
    serializer = VolunteerAlertSerializer(responses, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_sos_by_id(request, sos_id):
    """Get specific SOS alert by ID"""
    try:
        sos_alert = get_object_or_404(SOSAlert, id=sos_id)
        
        return Response({
            'id': sos_alert.id,
            'is_active': sos_alert.is_active,
            'emergency_type': sos_alert.emergency_type,
            'latitude': sos_alert.latitude,
            'longitude': sos_alert.longitude,
            'created_at': sos_alert.created_at.isoformat(),
            'resolved_at': sos_alert.resolved_at.isoformat() if sos_alert.resolved_at else None
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)