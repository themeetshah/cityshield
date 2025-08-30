# police/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from reports.models import Report
from sos.models import SOSAlert, Volunteer
from safety.models import PoliceStation
from .models import PatrolTeam, OfficialAlert, SOSResponse

User = get_user_model()

class PoliceReportSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source='reported_by.name', read_only=True)
    location_name = serializers.CharField(source='location', read_only=True)  # Fixed: using 'location' field
    
    class Meta:
        model = Report
        fields = [
            'id', 'title', 'description', 'report_type', 'status', 
            'location', 'location_name', 'latitude', 'longitude',  # Added missing fields
            'created_at', 'updated_at', 'reporter_name'
        ]

class ReportStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        ('pending', 'Pending'),
        ('investigating', 'Investigating'), 
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed')
    ])

class PoliceSOSAlertSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    assigned_team = serializers.SerializerMethodField()
    volunteers_responded = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = SOSAlert
        fields = [
            'id', 'user_name', 'latitude', 'longitude', 'emergency_type',  # Fixed: using actual fields
            'description', 'is_active', 'is_streaming', 'created_at', 
            'resolved_at', 'assigned_team', 'volunteers_responded', 'duration'
        ]
    
    def get_assigned_team(self, obj):
        response = obj.police_responses.first()
        if response:
            return f"{response.assigned_team.team_id} - {response.assigned_team.station.name}"
        return "No team assigned"
    
    def get_volunteers_responded(self, obj):
        # Fixed: Check if volunteer_responses relation exists
        if hasattr(obj, 'volunteer_responses'):
            return obj.volunteer_responses.filter(status='responded').count()
        return 0
    
    def get_duration(self, obj):
        from django.utils import timezone
        if obj.is_active:
            duration = timezone.now() - obj.created_at
            minutes = duration.total_seconds() // 60
            return f"{int(minutes)} min ago"
        return "Resolved"

class PatrolTeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone']

class PatrolTeamSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source='station.name', read_only=True)
    leader_name = serializers.CharField(source='team_leader.name', read_only=True)
    leader_email = serializers.CharField(source='team_leader.email', read_only=True)
    members_list = PatrolTeamMemberSerializer(source='members', many=True, read_only=True)
    actual_member_count = serializers.SerializerMethodField()

    class Meta:
        model = PatrolTeam
        fields = [
            'id', 'team_id', 'station', 'station_name', 'team_leader', 
            'leader_name', 'leader_email', 'members', 'members_list',
            'members_count', 'actual_member_count', 'vehicle_number', 
            'is_active', 'current_latitude', 'current_longitude',
            # 'created_at', 'updated_at'
        ]

    def get_actual_member_count(self, obj):
        return obj.get_member_count()

class PatrolTeamCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatrolTeam
        fields = [
            'team_id', 'station', 'team_leader', 'members_count', 
            'vehicle_number', 'is_active'
        ]

    def validate(self, data):
        # Ensure team leader belongs to same station as team
        if 'station' in data and 'team_leader' in data:
            leader = data['team_leader']
            if hasattr(leader, 'police_station') and leader.police_station != data['station']:
                raise serializers.ValidationError(
                    "Team leader must belong to the same police station"
                )
        return data

class PoliceOfficerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'police_station']

class OfficialAlertSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source='issued_by_station.name', read_only=True)
    officer_name = serializers.CharField(source='issued_by_officer.name', read_only=True)
    
    class Meta:
        model = OfficialAlert
        fields = [
            'id', 'title', 'message', 'alert_type', 'station_name', 
            'officer_name', 'is_active', 'created_at'
        ]
        read_only_fields = ['issued_by_officer']
    
    def create(self, validated_data):
        # Auto-assign officer and station from request
        user = self.context['request'].user
        validated_data['issued_by_officer'] = user
        
        # You might want to get the station based on the officer
        # For now, we'll need to pass it in the request data
        if 'issued_by_station' not in validated_data:
            # Get first available station or handle this differently
            from safety.models import PoliceStation
            station = PoliceStation.objects.first()
            if station:
                validated_data['issued_by_station'] = station
        
        return super().create(validated_data)

class SOSResponseSerializer(serializers.ModelSerializer):
    team_id = serializers.CharField(source='assigned_team.team_id', read_only=True)
    station_name = serializers.CharField(source='assigned_team.station.name', read_only=True)
    
    class Meta:
        model = SOSResponse
        fields = [
            'id', 'status', 'team_id', 'station_name', 'response_time', 
            'notes', 'created_at', 'updated_at'
        ]

class VolunteerActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    current_location = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()  # Fixed: Volunteer doesn't have is_active
    
    class Meta:
        model = Volunteer
        fields = [
            'id', 'user_name', 'user_phone', 'phone_number', 'is_verified',
            'is_available', 'current_location', 'is_active', 'last_location_update'
        ]
    
    def get_current_location(self, obj):
        if obj.current_latitude and obj.current_longitude:
            return f"{obj.current_latitude:.4f}, {obj.current_longitude:.4f}"
        return "Location not available"
    
    def get_is_active(self, obj):
        # Use is_available as active status for volunteers
        return obj.is_available

# Dashboard Stats Serializer
class PoliceDashboardStatsSerializer(serializers.Serializer):
    total_reports = serializers.IntegerField()
    active_sos_alerts = serializers.IntegerField()
    active_volunteers = serializers.IntegerField()
    response_rate = serializers.FloatField()
    reports_this_week = serializers.IntegerField()
    resolved_this_week = serializers.IntegerField()
    avg_response_time = serializers.FloatField()
    patrol_teams_active = serializers.IntegerField()
