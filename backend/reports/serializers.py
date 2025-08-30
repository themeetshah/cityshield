# serializers.py
from rest_framework import serializers
from .models import Report, Media

class ReportMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = ['id', 'file']

class ReportSerializer(serializers.ModelSerializer):
    media = ReportMediaSerializer(many=True, read_only=True)
    reported_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    
    class Meta:
        model = Report
        fields = [
            'id', 'title', 'description', 'report_type', 'report_type_display',
            'status', 'status_display', 'latitude', 'longitude', 'location',
            'reported_by', 'reported_by_name', 'media', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reported_by', 'status', 'created_at', 'updated_at']
    
    def get_reported_by_name(self, obj):
        if obj.reported_by:
            return obj.reported_by.name
        return 'Anonymous'
    
    def validate(self, data):
        # Validate coordinates
        if not (-90 <= data['latitude'] <= 90):
            raise serializers.ValidationError("Invalid latitude value")
        if not (-180 <= data['longitude'] <= 180):
            raise serializers.ValidationError("Invalid longitude value")
        return data

