from rest_framework import serializers
from .models import PoliceStation, Hospital, SafetyZone

class PoliceStationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliceStation
        fields = [
            'id', 'name', 'latitude', 'longitude', 'address', 'city', 
            'state', 'contact_number', 'source', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class HospitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'latitude', 'longitude', 'address', 'city', 
            'state', 'contact_number', 'hospital_type', 'source', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class SafetyZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafetyZone
        fields = [
            'id', 'zone_type', 'center_latitude', 'center_longitude', 
            'radius', 'risk_score', 'incident_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
