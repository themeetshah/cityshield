from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from safety.models import PoliceStation

from . import roles
from .models import EmergencyContact, Notification, User, VolunteerApplication


class UserProfileSerializer(serializers.ModelSerializer):
    role_label = serializers.SerializerMethodField()
    department = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'phone', 'location',
            'date_of_birth', 'gender', 'blood_group', 'role', 'role_label', 'department',
        ]
        read_only_fields = ['id', 'email', 'role', 'role_label', 'department']

    def get_role_label(self, obj):
        return roles.ROLE_LABELS.get(obj.role, obj.role)


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ['id', 'name', 'phone', 'relationship']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'link', 'is_read', 'created_at']
        read_only_fields = fields


class VolunteerApplicationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.name', read_only=True, default=None)

    class Meta:
        model = VolunteerApplication
        fields = ['id', 'user_email', 'user_name', 'phone_number', 'status', 'applied_at',
                  'reviewed_at', 'reviewed_by_name', 'notes']
        read_only_fields = ['status', 'applied_at', 'reviewed_at', 'reviewed_by_name', 'notes']


class VolunteerApplicationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = VolunteerApplication
        fields = ['status', 'applied_at', 'reviewed_at', 'notes']


# ---------------------------------------------------------------- staff mgmt

class StaffSerializer(serializers.ModelSerializer):
    """Read/update representation used by the staff-management API."""
    role_label = serializers.SerializerMethodField()
    department = serializers.CharField(read_only=True)
    police_station_name = serializers.CharField(source='police_station.name', read_only=True, default=None)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True, default=None)

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'phone', 'role', 'role_label', 'department',
                  'police_station', 'police_station_name', 'is_active', 'date_joined',
                  'last_login', 'created_by_email']
        read_only_fields = ['id', 'email', 'role_label', 'department', 'date_joined',
                            'last_login', 'created_by_email', 'police_station_name']

    def get_role_label(self, obj):
        return roles.ROLE_LABELS.get(obj.role, obj.role)

    def validate_role(self, value):
        actor = self.context['request'].user
        if value not in roles.creatable_roles(actor):
            raise serializers.ValidationError('You are not allowed to assign this role.')
        return value

    def validate(self, attrs):
        actor = self.context['request'].user
        role = attrs.get('role', getattr(self.instance, 'role', None))
        station = attrs.get('police_station', serializers.empty)

        if station is not serializers.empty and station is not None:
            if roles.department_of_role(role) != roles.POLICE:
                raise serializers.ValidationError({'police_station': 'Only police-department users have a station.'})
            # A police admin bound to a station can only assign that station.
            if (not roles.is_superadmin(actor) and actor.police_station_id
                    and station.id != actor.police_station_id):
                raise serializers.ValidationError({'police_station': 'You can only assign your own station.'})
        return attrs


class StaffCreateSerializer(StaffSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    police_station = serializers.PrimaryKeyRelatedField(
        queryset=PoliceStation.objects.all(), required=False, allow_null=True)

    class Meta(StaffSerializer.Meta):
        fields = StaffSerializer.Meta.fields + ['password']
        read_only_fields = [f for f in StaffSerializer.Meta.read_only_fields if f != 'email']
        extra_kwargs = {'role': {'required': True}}

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        actor = self.context['request'].user
        password = validated_data.pop('password')
        role = validated_data['role']
        # Police officers created by a station-bound police admin inherit the station.
        if (roles.department_of_role(role) == roles.POLICE and not validated_data.get('police_station')
                and actor.police_station_id):
            validated_data['police_station'] = actor.police_station
        return User.objects.create_user(
            email=validated_data.pop('email'),
            password=password,
            created_by=actor,
            **validated_data,
        )
