from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.conf import settings
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
import json
import requests
import math
import os
import pandas as pd
import numpy as np

from reports.serializers import ReportSerializer
from .models import PoliceStation, Hospital, SafetyZone
from .serializers import PoliceStationSerializer, HospitalSerializer, SafetyZoneSerializer
from reports.models import Report
from sos.models import SOSAlert

# Add these imports at the top of your views.py
import csv
from io import StringIO
from django.http import HttpResponse

@api_view(['GET'])
@permission_classes([AllowAny])
def list_police_stations(request):
    """Get all police stations with optional filtering"""
    try:
        stations = PoliceStation.objects.all()
        
        # Optional filters
        state = request.GET.get('state')
        city = request.GET.get('city')
        
        if state:
            stations = stations.filter(state__icontains=state)
        if city:
            stations = stations.filter(city__icontains=city)
            
        serializer = PoliceStationSerializer(stations, many=True)
        return Response({
            'count': stations.count(),
            'police_stations': serializer.data
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_police_station(request, station_id):
    """Get specific police station details"""
    try:
        station = get_object_or_404(PoliceStation, id=station_id)
        serializer = PoliceStationSerializer(station)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def nearby_police_stations(request):
    """Get nearby police stations within specified radius"""
    try:
        user_lat = float(request.GET.get('latitude', 0))
        user_lng = float(request.GET.get('longitude', 0))
        radius = int(request.GET.get('radius', 5000))
        
        if not user_lat or not user_lng:
            return Response({'error': 'Latitude and longitude required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Get CSV data using pandas
        csv_stations = get_filtered_police_stations(user_lat, user_lng, radius)
        
        # Get database stations
        bbox = get_bounding_box(user_lat, user_lng, radius)
        db_stations = PoliceStation.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )
        
        db_stations_list = []
        for station in db_stations:
            distance = calculate_distance(user_lat, user_lng, station.latitude, station.longitude)
            if distance <= radius:
                station_data = PoliceStationSerializer(station).data
                station_data['distance'] = round(distance)
                db_stations_list.append(station_data)
        
        # Combine and remove duplicates
        all_stations = db_stations_list + csv_stations
        unique_stations = []
        
        for station in all_stations:
            is_duplicate = False
            for existing in unique_stations:
                if calculate_distance(station['latitude'], station['longitude'],
                                    existing['latitude'], existing['longitude']) < 50:
                    is_duplicate = True
                    if station.get('source') == 'csv' and existing.get('source') != 'csv':
                        unique_stations.remove(existing)
                        unique_stations.append(station)
                    break
            if not is_duplicate:
                unique_stations.append(station)
        
        # Sort by distance
        unique_stations.sort(key=lambda x: x.get('distance', 0))
        
        return Response({
            'count': len(unique_stations),
            'police_stations': unique_stations
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== HOSPITAL VIEWS ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def list_hospitals(request):
    """Get all hospitals with optional filtering"""
    try:
        hospitals = Hospital.objects.all()
        
        # Optional filters
        state = request.GET.get('state')
        city = request.GET.get('city')
        hospital_type = request.GET.get('hospital_type')
        
        if state:
            hospitals = hospitals.filter(state__icontains=state)
        if city:
            hospitals = hospitals.filter(city__icontains=city)
        if hospital_type:
            hospitals = hospitals.filter(hospital_type__icontains=hospital_type)
            
        serializer = HospitalSerializer(hospitals, many=True)
        return Response({
            'count': hospitals.count(),
            'hospitals': serializer.data
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_hospital(request, hospital_id):
    """Get specific hospital details"""
    try:
        hospital = get_object_or_404(Hospital, id=hospital_id)
        serializer = HospitalSerializer(hospital)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def nearby_hospitals(request):
    """Get nearby hospitals within specified radius"""
    try:
        user_lat = float(request.GET.get('latitude', 0))
        user_lng = float(request.GET.get('longitude', 0))
        radius = int(request.GET.get('radius', 5000))
        
        if not user_lat or not user_lng:
            return Response({'error': 'Latitude and longitude required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Get database hospitals
        bbox = get_bounding_box(user_lat, user_lng, radius)
        nearby_hospitals = Hospital.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )
        
        hospitals_list = []
        for hospital in nearby_hospitals:
            distance = calculate_distance(user_lat, user_lng, hospital.latitude, hospital.longitude)
            if distance <= radius:
                hospital_data = HospitalSerializer(hospital).data
                hospital_data['distance'] = round(distance)
                hospitals_list.append(hospital_data)
        
        # Fetch from Overpass API
        overpass_data = fetch_overpass_hospitals(user_lat, user_lng, radius)
        
        # Combine and remove duplicates
        all_hospitals = hospitals_list + overpass_data
        unique_hospitals = []
        
        for hospital in all_hospitals:
            is_duplicate = False
            for existing in unique_hospitals:
                if calculate_distance(hospital['latitude'], hospital['longitude'],
                                    existing['latitude'], existing['longitude']) < 50:
                    is_duplicate = True
                    break
            if not is_duplicate:
                unique_hospitals.append(hospital)
        
        # Sort by distance
        unique_hospitals.sort(key=lambda x: x.get('distance', 0))
        
        return Response({
            'count': len(unique_hospitals),
            'hospitals': unique_hospitals
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== SAFETY ANALYSIS VIEWS ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def analyze_area_risk(request):
    """Analyze risk for a specific area"""
    try:
        data = json.loads(request.body)
        user_lat = data.get('latitude')
        user_lng = data.get('longitude')
        radius = data.get('radius', 1000)

        if not user_lat or not user_lng:
            return Response({'error': 'Latitude and longitude required'},
                          status=status.HTTP_400_BAD_REQUEST)

        # Calculate comprehensive risk analysis
        risk_analysis = calculate_comprehensive_risk_analysis(user_lat, user_lng, radius)

        return Response(risk_analysis)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== HELPER FUNCTIONS ====================

def fetch_overpass_hospitals(latitude, longitude, radius=5000):
    """Fetch nearby hospitals from Overpass API"""
    overpass_url = 'https://overpass-api.de/api/interpreter'
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:{radius},{latitude},{longitude});
      way["amenity"="hospital"](around:{radius},{latitude},{longitude});
    );
    out center meta;
    """

    try:
        response = requests.post(overpass_url, data={'data': query}, timeout=30)
        if response.status_code == 200:
            data = response.json()
            return process_overpass_hospitals(data, latitude, longitude)
        else:
            return []
    except Exception as e:
        print(f"Overpass API error: {e}")
        return []

def process_overpass_hospitals(data, user_lat, user_lng):
    """Process Overpass API response for hospitals"""
    hospitals = []

    for element in data.get('elements', []):
        lat, lng = extract_coordinates(element)
        if not lat or not lng:
            continue

        name = element.get('tags', {}).get('name', 'Unknown Hospital')
        
        # Calculate distance
        distance = calculate_distance(user_lat, user_lng, lat, lng)

        # Save to database
        hospital, created = Hospital.objects.get_or_create(
            latitude=lat,
            longitude=lng,
            defaults={
                'name': name,
                'hospital_type': element.get('tags', {}).get('healthcare', ''),
                'source': 'overpass'
            }
        )

        hospitals.append({
            'id': str(hospital.id),
            'name': hospital.name,
            'latitude': hospital.latitude,
            'longitude': hospital.longitude,
            'type': 'hospital',
            'source': 'overpass',
            'distance': round(distance)
        })

    return hospitals

def extract_coordinates(element):
    """Extract coordinates from Overpass element"""
    if element['type'] == 'node':
        return element.get('lat'), element.get('lon')
    elif element['type'] == 'way' and 'center' in element:
        return element['center'].get('lat'), element['center'].get('lon')
    return None, None

# Add all the other helper functions from the safety analysis...
# (calculate_manual_safety_zones, calculate_enhanced_grid_risk, etc.)
# I'll include a few key ones:

def calculate_comprehensive_risk_analysis(user_lat, user_lng, radius):
    """Calculate comprehensive risk analysis for an area"""
    try:
        bbox = get_bounding_box(user_lat, user_lng, radius)

        # Get all relevant data
        reports = Report.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )

        sos_alerts = SOSAlert.objects.filter(
            is_active=True,
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )

        hospitals = Hospital.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )

        police_stations = PoliceStation.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )

        # Calculate various risk metrics
        total_incidents = len(reports) + len(sos_alerts)
        critical_incidents = len([r for r in reports if r.report_type in ['crime', 'harassment']]) + len(sos_alerts)
        
        # Calculate overall risk score
        overall_risk = calculate_enhanced_grid_risk(user_lat, user_lng, user_lat, user_lng, radius)
        
        # Safety infrastructure score
        safety_score = len(hospitals) * 2 + len(police_stations) * 3

        # Risk level classification
        if overall_risk >= 10:
            risk_level = 'Critical'
            risk_color = '#dc2626'
        elif overall_risk >= 7:
            risk_level = 'High'
            risk_color = '#ea580c'
        elif overall_risk >= 4:
            risk_level = 'Medium'
            risk_color = '#f59e0b'
        elif overall_risk >= 2:
            risk_level = 'Low'
            risk_color = '#84cc16'
        else:
            risk_level = 'Safe'
            risk_color = '#22c55e'

        return {
            'overall_risk_score': overall_risk,
            'risk_level': risk_level,
            'risk_color': risk_color,
            'total_incidents': total_incidents,
            'critical_incidents': critical_incidents,
            'safety_infrastructure_score': safety_score,
            'nearby_hospitals': len(hospitals),
            'nearby_police_stations': len(police_stations),
            'analysis_radius': radius,
            'center_coordinates': {
                'latitude': user_lat,
                'longitude': user_lng
            }
        }

    except Exception as e:
        return {'error': str(e)}

# ==================== SAFETY ZONE MANAGEMENT ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def list_safety_zones(request):
    """Get all safety zones"""
    try:
        zones = SafetyZone.objects.all()
        zone_type = request.GET.get('zone_type')
        
        if zone_type:
            zones = zones.filter(zone_type=zone_type)
            
        serializer = SafetyZoneSerializer(zones, many=True)
        return Response({
            'count': zones.count(),
            'safety_zones': serializer.data
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_safety_zone(request, zone_id):
    """Get specific safety zone details"""
    try:
        zone = get_object_or_404(SafetyZone, id=zone_id)
        serializer = SafetyZoneSerializer(zone)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_safety_zone(request):
    """Create a new safety zone"""
    try:
        serializer = SafetyZoneSerializer(data=request.data)
        if serializer.is_valid():
            zone = serializer.save()
            return Response(SafetyZoneSerializer(zone).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_safety_zone(request, zone_id):
    """Update an existing safety zone"""
    try:
        zone = get_object_or_404(SafetyZone, id=zone_id)
        serializer = SafetyZoneSerializer(zone, data=request.data, partial=True)
        if serializer.is_valid():
            zone = serializer.save()
            return Response(SafetyZoneSerializer(zone).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_safety_zone(request, zone_id):
    """Delete a safety zone"""
    try:
        zone = get_object_or_404(SafetyZone, id=zone_id)
        zone.delete()
        return Response({'success': True, 'message': 'Safety zone deleted successfully'})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== DATA IMPORT/EXPORT VIEWS ====================


@api_view(['GET'])
@permission_classes([AllowAny])
def export_facilities(request):
    """Export facilities data to CSV"""
    try:
        include_police = request.GET.get('include_police', 'true').lower() == 'true'
        include_hospitals = request.GET.get('include_hospitals', 'true').lower() == 'true'

        facilities_data = []

        if include_police:
            police_stations = PoliceStation.objects.all()
            for station in police_stations:
                facilities_data.append({
                    'type': 'police',
                    'name': station.name,
                    'latitude': station.latitude,
                    'longitude': station.longitude,
                    'address': station.address,
                    'city': station.city,
                    'state': station.state,
                    'contact_number': station.contact_number,
                    'source': station.source
                })

        if include_hospitals:
            hospitals = Hospital.objects.all()
            for hospital in hospitals:
                facilities_data.append({
                    'type': 'hospital',
                    'name': hospital.name,
                    'latitude': hospital.latitude,
                    'longitude': hospital.longitude,
                    'address': hospital.address,
                    'city': hospital.city,
                    'state': hospital.state,
                    'contact_number': hospital.contact_number,
                    'hospital_type': hospital.hospital_type,
                    'source': hospital.source
                })

        return Response({
            'success': True,
            'data': facilities_data,
            'count': len(facilities_data)
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def import_police_csv(request):
    """Import police station data from CSV file"""
    if 'csv_file' not in request.FILES:
        return Response({'error': 'CSV file required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        csv_file = request.FILES['csv_file']
        df = pd.read_csv(csv_file)
        imported_count = 0

        for index, row in df.iterrows():
            police_station, created = PoliceStation.objects.get_or_create(
                latitude=row['latitude'],
                longitude=row['longitude'],
                defaults={
                    'name': row.get('name', f'Police Station {index}'),
                    'address': row.get('address', ''),
                    'city': row.get('city', ''),
                    'state': row.get('state', ''),
                    'contact_number': row.get('contact_number', ''),
                    'source': 'csv_import'
                }
            )
            if created:
                imported_count += 1

        return Response({
            'success': True, 
            'imported': imported_count,
            'message': f'Successfully imported {imported_count} police stations'
        })

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def import_hospitals_csv(request):
    """Import hospital data from CSV file"""
    if 'csv_file' not in request.FILES:
        return Response({'error': 'CSV file required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        csv_file = request.FILES['csv_file']
        df = pd.read_csv(csv_file)
        imported_count = 0

        for index, row in df.iterrows():
            hospital, created = Hospital.objects.get_or_create(
                latitude=row['latitude'],
                longitude=row['longitude'],
                defaults={
                    'name': row.get('name', f'Hospital {index}'),
                    'address': row.get('address', ''),
                    'city': row.get('city', ''),
                    'state': row.get('state', ''),
                    'contact_number': row.get('contact_number', ''),
                    'hospital_type': row.get('hospital_type', ''),
                    'source': 'csv_import'
                }
            )
            if created:
                imported_count += 1

        return Response({
            'success': True, 
            'imported': imported_count,
            'message': f'Successfully imported {imported_count} hospitals'
        })

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_facilities_from_overpass(request):
    """Sync facilities from Overpass API to database"""
    try:
        data = json.loads(request.body)
        user_lat = data.get('latitude')
        user_lng = data.get('longitude')
        radius = data.get('radius', 10000)

        if not user_lat or not user_lng:
            return Response({'error': 'Latitude and longitude required'},
                          status=status.HTTP_400_BAD_REQUEST)

        # Fetch hospitals from Overpass
        hospitals_data = fetch_overpass_hospitals(user_lat, user_lng, radius)
        hospitals_saved = 0

        for hospital_data in hospitals_data:
            hospital, created = Hospital.objects.get_or_create(
                latitude=hospital_data['latitude'],
                longitude=hospital_data['longitude'],
                defaults={
                    'name': hospital_data['name'],
                    'source': 'overpass_sync'
                }
            )
            if created:
                hospitals_saved += 1

        return Response({
            'success': True,
            'hospitals_saved': hospitals_saved,
            'message': f'Synchronized {hospitals_saved} hospitals from Overpass API'
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# # views.py
# from rest_framework.decorators import api_view, permission_classes, parser_classes
# from rest_framework.permissions import IsAuthenticated, AllowAny
# from rest_framework.parsers import MultiPartParser, FormParser
# from rest_framework.response import Response
# from rest_framework import status
# from .models import Report, Media, PoliceStation, Hospital, SafetyZone
# from .serializers import ReportSerializer
# from sos.models import SOSAlert
# from django.http import JsonResponse
# from django.conf import settings
# from datetime import datetime, timedelta
# import json
# import requests
# import math
# import os
# import pandas as pd
# import numpy as np

# ==================== SAFETY MAP UTILITIES ====================

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

def fetch_overpass_data(latitude, longitude, radius=5000):
    """Fetch nearby POIs from Overpass API"""
    overpass_url = 'https://overpass-api.de/api/interpreter'
    
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="police"](around:{radius},{latitude},{longitude});
      way["amenity"="police"](around:{radius},{latitude},{longitude});
      node["amenity"="hospital"](around:{radius},{latitude},{longitude});
      way["amenity"="hospital"](around:{radius},{latitude},{longitude});
    );
    out center meta;
    """
    
    try:
        response = requests.post(overpass_url, data={'data': query}, timeout=30)
        if response.status_code == 200:
            data = response.json()
            return process_overpass_data(data)
        else:
            return {'hospitals': [], 'police_stations': []}
    except Exception as e:
        print(f"Overpass API error: {e}")
        return {'hospitals': [], 'police_stations': []}

def process_overpass_data(data):
    """Process Overpass API response"""
    hospitals = []
    police_stations = []
    
    for element in data.get('elements', []):
        lat, lng = extract_coordinates(element)
        if not lat or not lng:
            continue
            
        name = element.get('tags', {}).get('name', 'Unknown')
        amenity = element.get('tags', {}).get('amenity')
        
        if amenity == 'hospital':
            # Save to database and return
            hospital, created = Hospital.objects.get_or_create(
                latitude=lat,
                longitude=lng,
                defaults={
                    'name': name,
                    'hospital_type': element.get('tags', {}).get('healthcare', ''),
                    'source': 'overpass'
                }
            )
            hospitals.append({
                'id': str(hospital.id),
                'name': hospital.name,
                'latitude': hospital.latitude,
                'longitude': hospital.longitude,
                'type': 'hospital',
                'source': 'overpass'
            })
            
        elif amenity == 'police':
            station, created = PoliceStation.objects.get_or_create(
                latitude=lat,
                longitude=lng,
                defaults={
                    'name': name,
                    'source': 'overpass'
                }
            )
            police_stations.append({
                'id': str(station.id),
                'name': station.name,
                'latitude': station.latitude,
                'longitude': station.longitude,
                'type': 'police',
                'source': 'overpass'
            })
    
    return {'hospitals': hospitals, 'police_stations': police_stations}

def extract_coordinates(element):
    """Extract coordinates from Overpass element"""
    if element['type'] == 'node':
        return element.get('lat'), element.get('lon')
    elif element['type'] == 'way' and 'center' in element:
        return element['center'].get('lat'), element['center'].get('lon')
    return None, None

# ==================== MANUAL SAFETY CALCULATIONS ====================

def calculate_manual_safety_zones(user_lat, user_lng, radius=3000):
    """Calculate safety zones using manual risk assessment"""
    try:
        # Get nearby data
        bbox = get_bounding_box(user_lat, user_lng, radius)
        
        # Get reports in the area
        nearby_reports = Report.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )
        
        # Get SOS alerts in the area
        nearby_sos = SOSAlert.objects.filter(
            is_active=True,
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )
        
        # Get facilities
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
        
        safe_zones = []
        danger_zones = []
        
        # Create safe zones around hospitals and police stations
        for hospital in nearby_hospitals:
            distance = calculate_distance(user_lat, user_lng, hospital.latitude, hospital.longitude)
            if distance <= radius:
                safe_zones.append({
                    'center_latitude': hospital.latitude,
                    'center_longitude': hospital.longitude,
                    'radius': 400,  # 400m safe radius around hospitals
                    'risk_score': 0.2,  # Low risk score
                    'zone_type': 'safe',
                    'reason': f'Safe zone around {hospital.name}',
                    'facility_type': 'hospital'
                })
        
        for station in nearby_police:
            distance = calculate_distance(user_lat, user_lng, station.latitude, station.longitude)
            if distance <= radius:
                safe_zones.append({
                    'center_latitude': station.latitude,
                    'center_longitude': station.longitude,
                    'radius': 500,  # 500m safe radius around police stations
                    'risk_score': 0.1,  # Very low risk score
                    'zone_type': 'safe',
                    'reason': f'Safe zone around {station.name}',
                    'facility_type': 'police'
                })
        
        # Create danger zones around incident clusters
        incident_clusters = calculate_incident_clusters(nearby_reports, nearby_sos, user_lat, user_lng, radius)
        
        for cluster in incident_clusters:
            if cluster['total_incidents'] >= 2:  # At least 2 incidents to create danger zone
                # Calculate risk level based on incidents
                risk_score = calculate_manual_risk_score(cluster)
                
                if risk_score >= 7:  # High risk
                    zone_type = 'critical'
                    zone_radius = 600
                elif risk_score >= 4:  # Medium risk
                    zone_type = 'high'
                    zone_radius = 400
                else:  # Low-medium risk
                    zone_type = 'medium'
                    zone_radius = 300
                
                danger_zones.append({
                    'center_latitude': cluster['center_lat'],
                    'center_longitude': cluster['center_lng'],
                    'radius': zone_radius,
                    'risk_score': risk_score,
                    'zone_type': 'danger',
                    'danger_level': zone_type,
                    'incident_count': cluster['total_incidents'],
                    'sos_count': cluster['sos_count'],
                    'critical_count': cluster['critical_count'],
                    'reason': f'{cluster["total_incidents"]} incidents reported in this area'
                })
        
        return {
            'safe_zones': safe_zones[:20],  # Limit for performance
            'danger_zones': danger_zones[:20]
        }
        
    except Exception as e:
        print(f"Error calculating safety zones: {e}")
        return {'safe_zones': [], 'danger_zones': []}

def calculate_incident_clusters(reports, sos_alerts, user_lat, user_lng, radius):
    """Group nearby incidents into clusters"""
    all_incidents = []
    
    # Add regular reports
    for report in reports:
        distance = calculate_distance(user_lat, user_lng, report.latitude, report.longitude)
        if distance <= radius:
            all_incidents.append({
                'latitude': report.latitude,
                'longitude': report.longitude,
                'type': report.report_type,
                'severity': get_incident_severity(report.report_type),
                'created_at': report.created_at
            })
    
    # Add SOS alerts
    for sos in sos_alerts:
        distance = calculate_distance(user_lat, user_lng, sos.latitude, sos.longitude)
        if distance <= radius:
            all_incidents.append({
                'latitude': sos.latitude,
                'longitude': sos.longitude,
                'type': 'sos',
                'severity': 10,  # Highest severity
                'created_at': sos.created_at
            })
    
    if not all_incidents:
        return []
    
    # Simple clustering: group incidents within 300m of each other
    clusters = []
    cluster_radius = 300  # meters
    
    for incident in all_incidents:
        # Check if this incident belongs to an existing cluster
        added_to_cluster = False
        
        for cluster in clusters:
            distance = calculate_distance(
                incident['latitude'], incident['longitude'],
                cluster['center_lat'], cluster['center_lng']
            )
            
            if distance <= cluster_radius:
                # Add to existing cluster
                cluster['incidents'].append(incident)
                
                # Recalculate cluster center (weighted by severity)
                total_weight = sum(inc['severity'] for inc in cluster['incidents'])
                cluster['center_lat'] = sum(
                    inc['latitude'] * inc['severity'] for inc in cluster['incidents']
                ) / total_weight
                cluster['center_lng'] = sum(
                    inc['longitude'] * inc['severity'] for inc in cluster['incidents']
                ) / total_weight
                
                cluster['total_incidents'] = len(cluster['incidents'])
                cluster['sos_count'] = len([inc for inc in cluster['incidents'] if inc['type'] == 'sos'])
                cluster['critical_count'] = len([inc for inc in cluster['incidents'] 
                                               if inc['type'] in ['crime', 'harassment']])
                
                added_to_cluster = True
                break
        
        if not added_to_cluster:
            # Create new cluster
            clusters.append({
                'center_lat': incident['latitude'],
                'center_lng': incident['longitude'],
                'incidents': [incident],
                'total_incidents': 1,
                'sos_count': 1 if incident['type'] == 'sos' else 0,
                'critical_count': 1 if incident['type'] in ['crime', 'harassment'] else 0
            })
    
    return clusters

def get_incident_severity(report_type):
    """Get severity score for incident type"""
    severity_map = {
        'sos': 10,
        'crime': 8,
        'harassment': 7,
        'safety': 5,
        'infrastructure': 3,
        'other': 2
    }
    return severity_map.get(report_type, 2)

def calculate_manual_risk_score(cluster):
    """Calculate risk score based on incident cluster"""
    base_score = cluster['total_incidents']
    
    # Add weight for SOS incidents
    sos_weight = cluster['sos_count'] * 5
    
    # Add weight for critical incidents
    critical_weight = cluster['critical_count'] * 3
    
    # Time decay factor (recent incidents are more dangerous)
    recent_incidents = 0
    cutoff_date = datetime.now() - timedelta(days=30)
    
    for incident in cluster['incidents']:
        if incident['created_at'] >= cutoff_date:
            recent_incidents += 1
    
    time_factor = recent_incidents * 1.5
    
    total_score = base_score + sos_weight + critical_weight + time_factor
    
    return min(total_score, 15)  # Cap at 15

def calculate_grid_risk(lat, lng):
    """Calculate risk score for a grid cell"""
    risk_score = 0
    search_radius = 300  # 300m search radius
    
    # Count incidents within radius
    bbox = get_bounding_box(lat, lng, search_radius)
    
    nearby_reports = Report.objects.filter(
        latitude__gte=bbox['min_lat'],
        latitude__lte=bbox['max_lat'],
        longitude__gte=bbox['min_lng'],
        longitude__lte=bbox['max_lng']
    )
    
    nearby_sos = SOSAlert.objects.filter(
        is_active=True,
        latitude__gte=bbox['min_lat'],
        latitude__lte=bbox['max_lat'],
        longitude__gte=bbox['min_lng'],
        longitude__lte=bbox['max_lng']
    )
    
    # Calculate incident-based risk
    for report in nearby_reports:
        distance = calculate_distance(lat, lng, report.latitude, report.longitude)
        if distance <= search_radius:
            # Closer incidents have higher impact
            distance_factor = max(0.1, 1 - (distance / search_radius))
            severity = get_incident_severity(report.report_type)
            risk_score += severity * distance_factor
    
    # SOS alerts have highest impact
    for sos in nearby_sos:
        distance = calculate_distance(lat, lng, sos.latitude, sos.longitude)
        if distance <= search_radius:
            distance_factor = max(0.1, 1 - (distance / search_radius))
            risk_score += 10 * distance_factor
    
    # Reduce risk near safety facilities
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
    
    # Safety facility bonus (reduces risk)
    for hospital in nearby_hospitals:
        distance = calculate_distance(lat, lng, hospital.latitude, hospital.longitude)
        if distance <= 500:  # 500m safety radius
            safety_factor = max(0.1, 1 - (distance / 500))
            risk_score = max(0, risk_score - (3 * safety_factor))
    
    for station in nearby_police:
        distance = calculate_distance(lat, lng, station.latitude, station.longitude)
        if distance <= 600:  # 600m safety radius
            safety_factor = max(0.1, 1 - (distance / 600))
            risk_score = max(0, risk_score - (4 * safety_factor))
    
    return min(risk_score, 15)  # Cap at 15

# ==================== SAFETY MAP API ENDPOINTS ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def safety_map_reports(request):
    """Get all reports including SOS alerts for safety map"""
    # Get regular reports
    reports = Report.objects.all().order_by('-created_at')
    serializer = ReportSerializer(reports, many=True, context={'request': request})
    results = list(serializer.data)
    
    # Add active SOS alerts
    active_sos = SOSAlert.objects.filter(is_active=True).order_by('-created_at')
    for sos in active_sos:
        results.append({
            'id': f"sos_{sos.id}",
            'title': 'SOS Emergency Alert',
            'description': 'Emergency SOS alert - immediate assistance required',
            'report_type': 'sos',
            'status': 'pending',
            'latitude': sos.latitude,
            'longitude': sos.longitude,
            'location': '',
            'created_at': sos.created_at.isoformat(),
            'reported_by': sos.user.email if sos.user else 'Anonymous',
        })
    
    return Response(results)

# Replace the read_police_stations_from_csv function with this pandas version
def read_police_stations_from_csv():
    """Read police station data directly from CSV file using pandas"""
    csv_file_path = os.path.join(settings.BASE_DIR, 'police_station_data.csv')
    police_stations = []
    
    if not os.path.exists(csv_file_path):
        print(f"CSV file not found: {csv_file_path}")
        return police_stations
    
    try:
        # Read CSV using pandas
        df = pd.read_csv(csv_file_path, encoding='utf-8')
        
        # Clean the dataframe - remove rows with missing critical data
        df = df.dropna(subset=['latitude', 'longitude', 'officename'])
        
        # Convert latitude and longitude to numeric, handling any conversion errors
        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
        
        # Remove rows where lat/lng conversion failed
        df = df.dropna(subset=['latitude', 'longitude'])
        
        # Fill NaN values with empty strings for text fields
        text_columns = ['circlename', 'regionname', 'divisionname', 'officename', 
                       'pincode', 'officetype', 'delivery', 'district', 'statename']
        df[text_columns] = df[text_columns].fillna('')
        
        print(f"Successfully loaded {len(df)} police stations from CSV")
        
        # Convert dataframe to list of dictionaries
        for index, row in df.iterrows():
            try:
                # Create a meaningful name from the available data
                office_name = str(row['officename']).strip()
                office_type = str(row['officetype']).strip()
                district = str(row['district']).strip()
                
                # Create full name
                if office_type and office_type.upper() in office_name.upper():
                    name = f"{office_name}, {district}"
                else:
                    name = f"{office_name} ({office_type}), {district}" if office_type else f"{office_name}, {district}"
                
                # Create address from available fields
                address_parts = [
                    str(row['officename']).strip(),
                    str(row['divisionname']).strip(),
                    str(row['district']).strip(),
                    str(row['statename']).strip(),
                    str(row['pincode']).strip()
                ]
                address = ', '.join([part for part in address_parts if part and part != 'nan'])
                
                police_stations.append({
                    'id': f"csv_{index + 1}",
                    'name': name,
                    'latitude': float(row['latitude']),
                    'longitude': float(row['longitude']),
                    'address': address,
                    'city': str(row['district']).strip(),
                    'state': str(row['statename']).strip(),
                    'contact_number': '',  # Not available in your CSV
                    'source': 'csv',
                    'office_type': str(row['officetype']).strip(),
                    'pincode': str(row['pincode']).strip(),
                    'circle': str(row['circlename']).strip(),
                    'region': str(row['regionname']).strip(),
                    'division': str(row['divisionname']).strip()
                })
                
            except Exception as e:
                print(f'Skipping invalid CSV row {index}: {e}')
                continue
                
    except Exception as e:
        print(f'Error reading CSV file with pandas: {e}')
    
    return police_stations

# Enhanced function to get police stations with filtering capabilities
def get_filtered_police_stations(user_lat, user_lng, radius=5000, office_types=None, states=None):
    """Get filtered police stations from CSV with pandas"""
    csv_file_path = os.path.join(settings.BASE_DIR, 'police_station_data.csv')
    
    if not os.path.exists(csv_file_path):
        return []
    
    try:
        # Read and clean data
        df = pd.read_csv(csv_file_path, encoding='utf-8')
        df = df.dropna(subset=['latitude', 'longitude', 'officename'])
        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
        df = df.dropna(subset=['latitude', 'longitude'])
        
        # Apply filters if provided
        if office_types:
            df = df[df['officetype'].isin(office_types)]
        
        if states:
            df = df[df['statename'].isin(states)]
        
        # Calculate distances using vectorized operations
        df['distance'] = df.apply(
            lambda row: calculate_distance(user_lat, user_lng, row['latitude'], row['longitude']), 
            axis=1
        )
        
        # Filter by radius
        df = df[df['distance'] <= radius]
        
        # Sort by distance
        df = df.sort_values('distance')
        
        # Convert to list format
        police_stations = []
        for index, row in df.iterrows():
            office_name = str(row['officename']).strip()
            office_type = str(row['officetype']).strip()
            district = str(row['district']).strip()
            
            if office_type and office_type.upper() in office_name.upper():
                name = f"{office_name}, {district}"
            else:
                name = f"{office_name} ({office_type}), {district}" if office_type else f"{office_name}, {district}"
            
            address_parts = [
                str(row['officename']).strip(),
                str(row['divisionname']).strip(),
                str(row['district']).strip(),
                str(row['statename']).strip(),
                str(row['pincode']).strip()
            ]
            address = ', '.join([part for part in address_parts if part and part != 'nan'])
            
            police_stations.append({
                'id': f"csv_{index + 1}",
                'name': name,
                'latitude': float(row['latitude']),
                'longitude': float(row['longitude']),
                'address': address,
                'city': str(row['district']).strip(),
                'state': str(row['statename']).strip(),
                'contact_number': '',
                'source': 'csv',
                'distance': round(row['distance']),
                'office_type': str(row['officetype']).strip(),
                'pincode': str(row['pincode']).strip(),
                'circle': str(row['circlename']).strip(),
                'region': str(row['regionname']).strip(),
                'division': str(row['divisionname']).strip(),
                'type': 'police'
            })
        
        return police_stations
        
    except Exception as e:
        print(f'Error filtering police stations: {e}')
        return []
        
# from django.db import IntegrityError
# from .models import PoliceStation
# import csv

# def csv_into_database():
#     try:
#         with open('police_station_data.csv', mode='r', encoding='utf-8') as file:
#             reader = csv.DictReader(file)
#             for row in reader:
#                 name = row.get('officename')
#                 latitude_str = row.get('latitude')
#                 longitude_str = row.get('longitude')

#                 # Handle invalid latitude and longitude values
#                 if latitude_str in ['NA', 'N/A', ''] or longitude_str in ['NA', 'N/A', '']:
#                     print(f"Skipping row due to invalid latitude or longitude: {row}")
#                     continue  # Skip this row
                
#                 try:
#                     latitude = float(latitude_str)
#                     longitude = float(longitude_str)
#                 except ValueError:
#                     print(f"Skipping row due to invalid latitude or longitude: {row}")
#                     continue  # Skip this row if conversion fails
                
#                 address = row.get('officename', '')
#                 city = row.get('district', '')
#                 state = row.get('statename', '')
#                 contact_number = ''  # Placeholder, as there is no contact number in the CSV
                
#                 # Check if a PoliceStation with the same latitude and longitude exists
#                 police_station, created = PoliceStation.objects.get_or_create(
#                     latitude=latitude,
#                     longitude=longitude,
#                     defaults={
#                         'name': name,
#                         'address': address,
#                         'city': city,
#                         'state': state,
#                         'contact_number': contact_number
#                     }
#                 )

#                 if not created:
#                     # If the record already exists, update the fields
#                     police_station.name = name
#                     police_station.address = address
#                     police_station.city = city
#                     police_station.state = state
#                     police_station.contact_number = contact_number
#                     police_station.save()

#                 print(f'{name} {"created" if created else "updated"}')

#     except FileNotFoundError:
#         print('File not found.')
#     except Exception as e:
#         print(f'Error occurred: {e}')

# Update your existing nearby_facilities function to use the pandas version
@api_view(['POST'])
@permission_classes([AllowAny])
def nearby_facilities(request):
    """Get nearby hospitals and police stations using pandas for CSV data"""

    # csv_into_database()
    try:
        data = json.loads(request.body)
        user_lat = data.get('latitude')
        user_lng = data.get('longitude')
        radius = data.get('radius', 5000)
        
        if not user_lat or not user_lng:
            return Response({'error': 'Latitude and longitude required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Get facilities from database (for hospitals and any existing police stations)
        bbox = get_bounding_box(user_lat, user_lng, radius)
        
        nearby_hospitals = Hospital.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )
        
        # Get database police stations
        db_police = PoliceStation.objects.filter(
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        )
        
        # Convert database hospitals to list
        db_hospitals = []
        for hospital in nearby_hospitals:
            distance = calculate_distance(user_lat, user_lng, hospital.latitude, hospital.longitude)
            if distance <= radius:
                db_hospitals.append({
                    'id': str(hospital.id),
                    'name': hospital.name,
                    'latitude': hospital.latitude,
                    'longitude': hospital.longitude,
                    'address': hospital.address or '',
                    'type': 'hospital',
                    'source': hospital.source or 'database',
                    'distance': round(distance)
                })
        
        # Convert database police stations to list
        db_police_list = []
        for station in db_police:
            distance = calculate_distance(user_lat, user_lng, station.latitude, station.longitude)
            if distance <= radius:
                db_police_list.append({
                    'id': str(station.id),
                    'name': station.name,
                    'latitude': station.latitude,
                    'longitude': station.longitude,
                    'address': station.address or '',
                    'type': 'police',
                    'source': station.source or 'database',
                    'distance': round(distance)
                })
        
        # Use pandas to read CSV police stations with better performance
        csv_police_nearby = get_filtered_police_stations(user_lat, user_lng, radius)
        
        # Combine database and CSV police stations
        all_police = db_police_list + csv_police_nearby
        
        # Remove duplicates based on coordinates (within 50m)
        unique_police = []
        for station in all_police:
            is_duplicate = False
            for existing in unique_police:
                if calculate_distance(station['latitude'], station['longitude'], 
                                    existing['latitude'], existing['longitude']) < 50:
                    is_duplicate = True
                    # Keep the CSV version if there's a duplicate
                    if station['source'] == 'csv' and existing['source'] != 'csv':
                        # Replace database version with CSV version
                        unique_police.remove(existing)
                        unique_police.append(station)
                    break
            if not is_duplicate:
                unique_police.append(station)
        
        # Fetch fresh data from Overpass API for hospitals
        overpass_data = fetch_overpass_data(user_lat, user_lng, radius)
        
        # Combine hospitals and remove duplicates
        all_hospitals = db_hospitals + overpass_data['hospitals']
        unique_hospitals = []
        
        for hospital in all_hospitals:
            is_duplicate = False
            for existing in unique_hospitals:
                if calculate_distance(hospital['latitude'], hospital['longitude'], 
                                    existing['latitude'], existing['longitude']) < 50:
                    is_duplicate = True
                    break
            if not is_duplicate:
                unique_hospitals.append(hospital)
        
        return Response({
            'hospitals': unique_hospitals,
            'police_stations': unique_police,
            'total_hospitals': len(unique_hospitals),
            'total_police': len(unique_police),
            'csv_police_count': len(csv_police_nearby),
            'db_police_count': len(db_police_list)
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Add a new API endpoint to get CSV statistics
@api_view(['GET'])
@permission_classes([AllowAny])
def csv_statistics(request):
    """Get statistics about the CSV police station data"""
    try:
        csv_file_path = os.path.join(settings.BASE_DIR, 'police_station_data.csv')

        if not os.path.exists(csv_file_path):
            return Response({'error': 'CSV file not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Read CSV with pandas
        df = pd.read_csv(csv_file_path, encoding='utf-8')
        
        # Clean data
        df = df.dropna(subset=['latitude', 'longitude', 'officename'])
        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
        df = df.dropna(subset=['latitude', 'longitude'])
        
        # Calculate statistics
        stats = {
            'total_records': len(df),
            'unique_states': df['statename'].nunique(),
            'unique_districts': df['district'].nunique(),
            'unique_office_types': df['officetype'].nunique(),
            'states_list': df['statename'].unique().tolist(),
            'office_types_count': df['officetype'].value_counts().to_dict(),
            'states_count': df['statename'].value_counts().to_dict(),
            'top_districts': df['district'].value_counts().head(10).to_dict()
        }
        
        return Response(stats)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def predict_safety_zones(request):
    """Calculate safety zones using manual risk assessment"""
    try:
        data = json.loads(request.body)
        user_lat = data.get('latitude')
        user_lng = data.get('longitude')
        radius = data.get('radius', 5000)
        
        if not user_lat or not user_lng:
            return Response({'error': 'Latitude and longitude required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate safety zones using manual methods
        safety_zones = calculate_manual_safety_zones(user_lat, user_lng, radius)
        
        return Response(safety_zones)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def nearby_reports(request):
    """Get reports and SOS alerts within specified radius with stats"""
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
        
        # Get nearby active SOS alerts
        nearby_sos = SOSAlert.objects.filter(
            is_active=True,
            latitude__gte=bbox['min_lat'],
            latitude__lte=bbox['max_lat'],
            longitude__gte=bbox['min_lng'],
            longitude__lte=bbox['max_lng']
        ).order_by('-created_at')
        
        # Combine and filter by exact distance
        combined_reports = []
        
        for report in nearby_reports:
            distance = calculate_distance(user_lat, user_lng, report.latitude, report.longitude)
            if distance <= radius:
                combined_reports.append({
                    'id': str(report.id),
                    'title': report.title,
                    'description': report.description,
                    'report_type': report.report_type,
                    'status': report.status,
                    'latitude': report.latitude,
                    'longitude': report.longitude,
                    'location': report.location or '',
                    'distance': round(distance),
                    'created_at': report.created_at.isoformat(),
                    'reported_by': report.reported_by.email if report.reported_by else 'Anonymous',
                    'source': 'report'
                })
        
        for sos in nearby_sos:
            distance = calculate_distance(user_lat, user_lng, sos.latitude, sos.longitude)
            if distance <= radius:
                combined_reports.append({
                    'id': f"sos_{sos.id}",
                    'title': 'SOS Emergency Alert',
                    'description': 'Emergency SOS alert - immediate assistance required',
                    'report_type': 'sos',
                    'status': 'pending',
                    'latitude': sos.latitude,
                    'longitude': sos.longitude,
                    'location': '',
                    'distance': round(distance),
                    'created_at': sos.created_at.isoformat(),
                    'reported_by': sos.user.email if sos.user else 'Anonymous',
                    'source': 'sos'
                })
        
        # Calculate comprehensive stats
        stats = {
            'total_reports': len(combined_reports),
            'sos_reports': len([r for r in combined_reports if r['report_type'] == 'sos']),
            'critical_reports': len([r for r in combined_reports if r['report_type'] in ['crime', 'harassment']]),
            'resolved_reports': len([r for r in combined_reports if r['status'] == 'resolved']),
            'pending_reports': len([r for r in combined_reports if r['status'] == 'pending']),
        }
        
        return Response({
            'reports': combined_reports,
            'stats': stats
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def calculate_enhanced_grid_risk(lat, lng, user_lat, user_lng, radius):
    """Calculate enhanced risk score for a grid cell with better granularity"""
    risk_score = 0
    search_radius = 250  # Reduced to 250m for better granularity
    
    # Count incidents within radius with distance weighting
    bbox = get_bounding_box(lat, lng, search_radius)
    
    nearby_reports = Report.objects.filter(
        latitude__gte=bbox['min_lat'],
        latitude__lte=bbox['max_lat'],
        longitude__gte=bbox['min_lng'],
        longitude__lte=bbox['max_lng']
    )
    
    nearby_sos = SOSAlert.objects.filter(
        is_active=True,
        latitude__gte=bbox['min_lat'],
        latitude__lte=bbox['max_lat'],
        longitude__gte=bbox['min_lng'],
        longitude__lte=bbox['max_lng']
    )
    
    # Enhanced incident-based risk with smooth falloff
    for report in nearby_reports:
        distance = calculate_distance(lat, lng, report.latitude, report.longitude)
        if distance <= search_radius:
            # Smooth distance falloff using exponential decay
            distance_factor = math.exp(-distance / (search_radius * 0.3))
            severity = get_incident_severity(report.report_type)
            risk_score += severity * distance_factor
    
    # SOS alerts with highest impact and smooth falloff
    for sos in nearby_sos:
        distance = calculate_distance(lat, lng, sos.latitude, sos.longitude)
        if distance <= search_radius:
            distance_factor = math.exp(-distance / (search_radius * 0.3))
            risk_score += 12 * distance_factor
    
    # Safety facility proximity bonus with smoother transitions
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
    
    # Enhanced safety bonus with exponential decay
    for hospital in nearby_hospitals:
        distance = calculate_distance(lat, lng, hospital.latitude, hospital.longitude)
        if distance <= 600:
            safety_factor = math.exp(-distance / 200) * 4
            risk_score = max(0, risk_score - safety_factor)
    
    for station in nearby_police:
        distance = calculate_distance(lat, lng, station.latitude, station.longitude)
        if distance <= 700:
            safety_factor = math.exp(-distance / 200) * 5
            risk_score = max(0, risk_score - safety_factor)
    
    return min(risk_score, 15)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_chloropleth_data(request):
    """Get enhanced chloropleth data with better resolution and smooth gradients"""
    try:
        user_lat = float(request.GET.get('latitude', 0))
        user_lng = float(request.GET.get('longitude', 0))
        radius = int(request.GET.get('radius', 5000))
        
        if not user_lat or not user_lng:
            return Response({'error': 'Latitude and longitude required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Enhanced grid with better resolution
        grid_size = 0.0025  # approximately 275m for smoother visualization
        chloropleth_data = []
        
        lat_start = user_lat - (radius / 111000)
        lat_end = user_lat + (radius / 111000)
        lng_start = user_lng - (radius / (111000 * math.cos(math.radians(user_lat))))
        lng_end = user_lng + (radius / (111000 * math.cos(math.radians(user_lat))))
        
        lat = lat_start
        while lat <= lat_end:
            lng = lng_start
            while lng <= lng_end:
                distance = calculate_distance(user_lat, user_lng, lat, lng)
                if distance <= radius:
                    # Enhanced risk calculation
                    risk_score = calculate_enhanced_grid_risk(lat, lng, user_lat, user_lng, radius)
                    
                    # Enhanced color scheme with more gradations
                    if risk_score >= 12:
                        color = '#7f1d1d'  # Very dark red
                        opacity = 0.8
                        risk_level = 'Critical'
                    elif risk_score >= 9:
                        color = '#dc2626'  # Dark red
                        opacity = 0.7
                        risk_level = 'High'
                    elif risk_score >= 6:
                        color = '#ea580c'  # Orange-red
                        opacity = 0.6
                        risk_level = 'Medium-High'
                    elif risk_score >= 4:
                        color = '#f59e0b'  # Orange
                        opacity = 0.45
                        risk_level = 'Medium'
                    elif risk_score >= 2:
                        color = '#eab308'  # Yellow
                        opacity = 0.35
                        risk_level = 'Low-Medium'
                    elif risk_score >= 0.5:
                        color = '#84cc16'  # Light green
                        opacity = 0.25
                        risk_level = 'Low'
                    else:
                        color = '#22c55e'  # Green
                        opacity = 0.15
                        risk_level = 'Safe'
                    
                    chloropleth_data.append({
                        'latitude': lat,
                        'longitude': lng,
                        'risk_score': risk_score,
                        'color': color,
                        'opacity': opacity,
                        'grid_size': grid_size,
                        'risk_level': risk_level
                    })
                
                lng += grid_size
            lat += grid_size
        
        return Response({
            'chloropleth_data': chloropleth_data,
            'grid_size': grid_size,
            'total_cells': len(chloropleth_data)
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def import_police_csv(request):
    """Import police station data from CSV file"""
    if 'csv_file' not in request.FILES:
        return Response({'error': 'CSV file required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        csv_file = request.FILES['csv_file']
        
        # Read CSV using pandas
        df = pd.read_csv(csv_file)
        imported_count = 0
        
        for index, row in df.iterrows():
            police_station, created = PoliceStation.objects.get_or_create(
                latitude=row['latitude'],
                longitude=row['longitude'],
                defaults={
                    'name': row.get('name', f'Police Station {index}'),
                    'address': row.get('address', ''),
                    'city': row.get('city', ''),
                    'state': row.get('state', ''),
                    'contact_number': row.get('contact_number', ''),
                    'source': 'csv'
                }
            )
            if created:
                imported_count += 1
        
        return Response({'success': True, 'imported': imported_count})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)