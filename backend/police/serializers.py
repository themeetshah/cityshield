from django.contrib.auth import get_user_model
from rest_framework import serializers

from reports.models import Report
from sos.models import SOSAlert, Volunteer
from users import roles

from .models import POLICE_ROLES, OfficialAlert, PatrolTeam, SOSResponse

User = get_user_model()


def _minutes(delta):
    return round(delta.total_seconds() / 60, 1) if delta is not None else None


# ------------------------------------------------------------------ reports

class StatusChangeSerializer(serializers.Serializer):
    status = serializers.CharField(source='new_status')
    note = serializers.CharField()
    changed_by_name = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()

    def get_changed_by_name(self, obj):
        user = obj.changed_by
        return (user.name or user.email) if user else None


class OperationsReportSerializer(serializers.ModelSerializer):
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reporter_name = serializers.SerializerMethodField()
    latest_update = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'title', 'description', 'report_type', 'report_type_display', 'status', 'status_display',
            'department', 'location', 'latitude', 'longitude', 'created_at', 'updated_at', 'reporter_name',
            'latest_update',
        ]

    def get_reporter_name(self, obj):
        if getattr(obj, 'is_anonymous', False) or obj.reported_by is None:
            return None
        return obj.reported_by.name or obj.reported_by.email

    def get_latest_update(self, obj):
        changes = getattr(obj, 'recent_changes', None)
        if changes is None:
            changes = list(obj.status_changes.select_related('changed_by')[:1])
        return StatusChangeSerializer(changes[0]).data if changes else None


class ReportStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Report.STATUS_CHOICES)
    note = serializers.CharField(required=False, allow_blank=True, max_length=2000, default='')


# ---------------------------------------------------------------------- SOS

class TeamBriefSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source='station.name', read_only=True)

    class Meta:
        model = PatrolTeam
        fields = ['id', 'team_id', 'station', 'station_name', 'vehicle_number']


class SOSResponseSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    team = TeamBriefSerializer(source='assigned_team', read_only=True)
    sos_id = serializers.IntegerField(source='sos_alert_id', read_only=True)
    assigned_at = serializers.DateTimeField(source='created_at', read_only=True)
    response_time_minutes = serializers.SerializerMethodField()
    next_statuses = serializers.SerializerMethodField()

    class Meta:
        model = SOSResponse
        fields = [
            'id', 'sos_id', 'status', 'status_display', 'team', 'notes', 'assigned_at', 'dispatched_at',
            'arrived_at', 'resolved_at', 'response_time_minutes', 'next_statuses',
        ]

    def get_response_time_minutes(self, obj):
        return _minutes(obj.response_time)

    def get_next_statuses(self, obj):
        order = SOSResponse.STATUS_ORDER
        return order[order.index(obj.status) + 1:] if obj.status in order else []


class OperationsSOSSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    volunteers_responded = serializers.SerializerMethodField()
    response = serializers.SerializerMethodField()
    distance = serializers.SerializerMethodField()

    class Meta:
        model = SOSAlert
        fields = [
            'id', 'user_name', 'latitude', 'longitude', 'emergency_type', 'department', 'description',
            'is_active', 'is_streaming', 'created_at', 'resolved_at', 'volunteers_responded', 'response',
            'distance',
        ]

    def get_user_name(self, obj):
        return (obj.user.name or obj.user.email) if obj.user else None

    def get_volunteers_responded(self, obj):
        value = getattr(obj, 'volunteers_responded_count', None)
        if value is None:
            value = obj.volunteer_alerts.filter(responded=True).count()
        return value

    def get_response(self, obj):
        # police_responses is prefetched newest first; the newest one is the current dispatch.
        responses = list(obj.police_responses.all())
        return SOSResponseSerializer(responses[0]).data if responses else None

    def get_distance(self, obj):
        return self.context.get('distances', {}).get(obj.id)


# -------------------------------------------------------------- patrol teams

class PatrolTeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone']


class PatrolTeamSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source='station.name', read_only=True)
    leader_name = serializers.SerializerMethodField()
    leader_email = serializers.CharField(source='team_leader.email', read_only=True)
    members_list = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    current_assignment = serializers.SerializerMethodField()

    class Meta:
        model = PatrolTeam
        fields = [
            'id', 'team_id', 'station', 'station_name', 'team_leader', 'leader_name', 'leader_email',
            'members_list', 'member_count', 'vehicle_number', 'is_active', 'current_latitude',
            'current_longitude', 'location_updated_at', 'current_assignment', 'created_at',
        ]

    def get_leader_name(self, obj):
        return obj.team_leader.name or obj.team_leader.email

    def _members(self, obj):
        return [m for m in obj.members.all() if m.pk != obj.team_leader_id]

    def get_members_list(self, obj):
        return PatrolTeamMemberSerializer(self._members(obj), many=True).data

    def get_member_count(self, obj):
        return len(self._members(obj)) + 1

    def get_current_assignment(self, obj):
        active = getattr(obj, 'active_responses', None)
        if active is None:
            active = list(obj.sos_responses.filter(sos_alert__is_active=True).exclude(status='resolved')[:1])
        if not active:
            return None
        return {'response_id': active[0].id, 'sos_id': active[0].sos_alert_id, 'status': active[0].status}


class PatrolTeamWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatrolTeam
        fields = ['team_id', 'station', 'team_leader', 'vehicle_number', 'is_active']

    def validate_team_leader(self, leader):
        if leader.role not in POLICE_ROLES or not leader.is_active:
            raise serializers.ValidationError('Team leader must be an active police officer.')
        return leader

    def validate(self, data):
        station = data.get('station', getattr(self.instance, 'station', None))
        leader = data.get('team_leader', getattr(self.instance, 'team_leader', None))
        if station is None:
            raise serializers.ValidationError({'station': 'A police station is required.'})
        if leader is not None and leader.police_station_id != station.id:
            raise serializers.ValidationError(
                {'team_leader': 'Team leader must belong to the same police station.'})
        return data


class PoliceOfficerSerializer(serializers.ModelSerializer):
    role_label = serializers.SerializerMethodField()
    police_station_name = serializers.CharField(source='police_station.name', read_only=True, default=None)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'role', 'role_label', 'police_station', 'police_station_name']

    def get_role_label(self, obj):
        return roles.ROLE_LABELS.get(obj.role, obj.role)


# ------------------------------------------------------------ official alerts

class OfficialAlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    department_label = serializers.CharField(source='get_department_display', read_only=True)
    station_name = serializers.CharField(source='issued_by_station.name', read_only=True, default=None)
    issued_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OfficialAlert
        fields = [
            'id', 'title', 'message', 'alert_type', 'alert_type_display', 'department', 'department_label',
            'station_name', 'issued_by_name', 'created_at', 'is_active',
        ]
        read_only_fields = ['is_active', 'created_at']
        extra_kwargs = {'department': {'required': False}}

    def get_issued_by_name(self, obj):
        user = obj.issued_by_officer
        return (user.name or user.email) if user else None

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError('Title is required.')
        return value.strip()

    def validate_message(self, value):
        if not value.strip():
            raise serializers.ValidationError('Message is required.')
        return value.strip()


# ------------------------------------------------------------------ volunteers

class VolunteerActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    response_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Volunteer
        fields = [
            'id', 'user_name', 'user_email', 'phone_number', 'is_verified', 'is_available', 'current_latitude',
            'current_longitude', 'last_location_update', 'response_count',
        ]

    def get_user_name(self, obj):
        return obj.user.name or obj.user.email
