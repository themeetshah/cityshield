import math

from rest_framework import serializers

from . import privacy
from .models import Media, Report

TITLE_MIN, TITLE_MAX = 3, 200
DESCRIPTION_MIN, DESCRIPTION_MAX = 10, 5000
LOCATION_MAX = 200


class ReportMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = ['id', 'file']


class ReportSerializer(serializers.ModelSerializer):
    """Read serializer. Applies privacy rules for `context['request'].user`."""

    media = ReportMediaSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    reported_by_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'title', 'description', 'report_type', 'report_type_display',
            'status', 'status_display', 'department', 'latitude', 'longitude', 'location',
            'is_anonymous', 'reported_by_name', 'is_mine', 'media', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def _viewer(self):
        request = self.context.get('request')
        return getattr(request, 'user', None)

    def get_reported_by_name(self, obj):
        return privacy.reporter_label(self._viewer(), obj)

    def get_is_mine(self, obj):
        return privacy.is_reporter(self._viewer(), obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        viewer = self._viewer()
        if not privacy.is_privileged_viewer(viewer, instance):
            data['latitude'], data['longitude'] = privacy.viewer_coordinates(viewer, instance)
            data['location'] = privacy.coarse_address(instance.location)
        return data


class ReportCreateSerializer(serializers.ModelSerializer):
    """Write serializer for citizens/volunteers/superadmins filing a report."""

    title = serializers.CharField(min_length=TITLE_MIN, max_length=TITLE_MAX, trim_whitespace=True)
    description = serializers.CharField(
        min_length=DESCRIPTION_MIN, max_length=DESCRIPTION_MAX, trim_whitespace=True
    )
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    location = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_anonymous = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = Report
        fields = ['title', 'description', 'report_type', 'latitude', 'longitude', 'location', 'is_anonymous']

    def validate_location(self, value):
        if not value:
            return ''
        return value.strip()[:LOCATION_MAX]

    def validate(self, attrs):
        for field in ('latitude', 'longitude'):
            if not math.isfinite(attrs[field]):
                raise serializers.ValidationError({field: 'Must be a finite number.'})
        return attrs
