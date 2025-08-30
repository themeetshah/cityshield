import math
from django.db.models import Q
from sos.models import SOSAlert
from reports.models import Report

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    distance = R * c
    
    return distance

def get_bounding_box(latitude, longitude, radius_km):
    """Get bounding box for geographical filtering"""
    lat_offset = radius_km / 110.574  # degrees per km for latitude
    lon_offset = radius_km / (111.320 * math.cos(math.radians(latitude)))  # degrees per km for longitude
    
    return {
        'min_lat': latitude - lat_offset,
        'max_lat': latitude + lat_offset,
        'min_lon': longitude - lon_offset,
        'max_lon': longitude + lon_offset
    }

def filter_emergencies_nearby(latitude, longitude, radius_km=5):
    """Filter SOS alerts within specified radius"""
    bbox = get_bounding_box(latitude, longitude, radius_km)
    
    return SOSAlert.objects.filter(
        latitude__gte=bbox['min_lat'],
        latitude__lte=bbox['max_lat'],
        longitude__gte=bbox['min_lon'],
        longitude__lte=bbox['max_lon'],
        is_active=True
    ).order_by('-created_at')

def filter_reports_nearby(latitude, longitude, radius_km=5):
    """Filter incident reports within specified radius"""
    bbox = get_bounding_box(latitude, longitude, radius_km)
    
    return Report.objects.filter(
        latitude__gte=bbox['min_lat'],
        latitude__lte=bbox['max_lat'],
        longitude__gte=bbox['min_lon'],
        longitude__lte=bbox['max_lon']
    ).exclude(report_type='sos').order_by('-created_at')
