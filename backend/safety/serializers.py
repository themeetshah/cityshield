from rest_framework import serializers

from cityshield_backend.geo import MAX_RADIUS_M

from .models import Hospital, PoliceStation, SafetyZone


class PoliceStationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliceStation
        fields = [
            'id', 'name', 'latitude', 'longitude', 'address', 'city',
            'state', 'contact_number', 'source', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HospitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'latitude', 'longitude', 'address', 'city',
            'state', 'contact_number', 'hospital_type', 'source',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SafetyZoneSerializer(serializers.ModelSerializer):
    center_latitude = serializers.FloatField(min_value=-90, max_value=90)
    center_longitude = serializers.FloatField(min_value=-180, max_value=180)
    radius = serializers.FloatField(min_value=1, max_value=MAX_RADIUS_M)
    risk_score = serializers.FloatField(min_value=0, max_value=10)
    incident_count = serializers.IntegerField(min_value=0, required=False)

    class Meta:
        model = SafetyZone
        fields = [
            'id', 'zone_type', 'center_latitude', 'center_longitude',
            'radius', 'risk_score', 'incident_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
