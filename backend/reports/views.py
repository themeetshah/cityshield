from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from .models import Report, Media
from .serializers import ReportSerializer
from django.http import JsonResponse
from django.conf import settings
import requests
import math
import json

# ==================== REPORT MANAGEMENT VIEWS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def create_report(request):
    """Create a new incident report"""
    data = request.data.copy()
    anonymous = data.get('is_anonymous') == 'true'

    # Handle media files separately
    media_files = request.FILES.getlist('media')
    data.pop('media', None)

    serializer = ReportSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        report = serializer.save(reported_by=None if anonymous else request.user)

        # Save each file and attach to the report
        for file in media_files:
            media_instance = Media.objects.create(file=file)
            report.media.add(media_instance)

        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
def list_reports(request):
    """List all reports with optional filtering"""
    reports = Report.objects.all().order_by('-created_at')
    
    # Optional filters
    report_type = request.GET.get('type')
    status_filter = request.GET.get('status')
    
    if report_type:
        reports = reports.filter(report_type=report_type)
    if status_filter:
        reports = reports.filter(status=status_filter)
    
    serializer = ReportSerializer(reports, many=True, context={'request': request})
    return Response({
        'count': reports.count(),
        'reports': serializer.data
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def get_report(request, report_id):
    """Get specific report details"""
    try:
        report = Report.objects.get(id=report_id)
        serializer = ReportSerializer(report, context={'request': request})
        return Response(serializer.data)
    except Report.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)

# ==================== UTILITY FUNCTIONS ====================

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

# ==================== LOCATION-BASED VIEWS ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def nearby_reports(request):
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
        nearby_reports = Report.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        ).order_by('-created_at')

        # Filter by exact distance and add distance field
        reports_with_distance = []
        for report in nearby_reports:
            distance = calculate_distance(user_lat, user_lng, report.latitude, report.longitude)
            if distance <= radius:
                report_data = ReportSerializer(report, context={'request': request}).data
                report_data['distance'] = round(distance)
                reports_with_distance.append(report_data)

        # Sort by distance
        reports_with_distance.sort(key=lambda x: x['distance'])

        return Response({
            'reports': reports_with_distance,
            'count': len(reports_with_distance),
            'search_radius': radius
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def safety_map_reports(request):
    """Get all reports for safety map visualization"""
    try:
        reports = Report.objects.all().order_by('-created_at')
        serializer = ReportSerializer(reports, many=True, context={'request': request})
        
        return Response({
            'reports': serializer.data,
            'count': reports.count()
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== GEOCODING SERVICES ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def reverse_geocode(request):
    """Reverse geocode coordinates to address"""
    lat = request.GET.get("lat")
    lon = request.GET.get("lon")

    if not lat or not lon:
        return JsonResponse({"error": "Missing lat/lon"}, status=400)

    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&addressdetails=1&accept-language=en"
        headers = {
            "User-Agent": "CityShield/1.0 (cityshield.mern@gmail.com)"
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()

        return JsonResponse(data)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
