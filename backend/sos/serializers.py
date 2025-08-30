from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import SOSAlert, Volunteer, VolunteerAlert, SOSLocationUpdate, SOSVideoFeed

User = get_user_model()

# ==================== VOLUNTEER SERIALIZERS ====================

class VolunteerRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for volunteer registration"""
    class Meta:
        model = Volunteer
        fields = ['phone_number']  # FIXED: Removed non-existent fields
        
    def validate_phone_number(self, value):
        """Ensure phone number is unique"""
        # Check if already exists for different user
        existing = Volunteer.objects.filter(phone_number=value).exclude(
            user=self.context.get('request').user if self.context.get('request') else None
        ).first()
        if existing:
            raise serializers.ValidationError("This phone number is already registered as a volunteer")
        return value

class VolunteerSerializer(serializers.ModelSerializer):
    """Complete volunteer serializer with user details"""
    user_email = serializers.EmailField(source='user.email', read_only=True)  # FIXED: Changed to user.email
    full_name = serializers.SerializerMethodField()
    response_count = serializers.SerializerMethodField()
    distance_from_user = serializers.SerializerMethodField()
    
    class Meta:
        model = Volunteer
        fields = [
            'id', 'user_email', 'full_name', 'phone_number',  # FIXED: Removed non-existent fields
            'is_available', 'is_verified', 'current_latitude', 'current_longitude',
            'last_location_update', 'response_count', 'distance_from_user'
        ]
        read_only_fields = [
            'id', 'user_email', 'full_name', 'is_verified', 
            'response_count', 'distance_from_user'
        ]
    
    def get_full_name(self, obj):
        """Get volunteer's full name"""
        if hasattr(obj.user, 'first_name') and obj.user.first_name:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.email
        return obj.user.email
    
    def get_response_count(self, obj):
        """Get total number of emergency responses - FIXED: Count only responses that were made"""
        return VolunteerAlert.objects.filter(volunteer=obj, responded=True).count()
    
    def get_distance_from_user(self, obj):
        """Calculate distance from current user (if location provided in context)"""
        request = self.context.get('request')
        if request and hasattr(request, 'user_location'):
            user_lat = request.user_location.get('latitude')
            user_lng = request.user_location.get('longitude')
            if user_lat and user_lng and obj.current_latitude and obj.current_longitude:
                # Import here to avoid circular imports
                from .views import calculate_distance
                distance = calculate_distance(
                    user_lat, user_lng, 
                    obj.current_latitude, obj.current_longitude
                )
                return round(distance)
        return None

class VolunteerStatusSerializer(serializers.ModelSerializer):
    """Lightweight serializer for volunteer status updates"""
    class Meta:
        model = Volunteer
        fields = ['is_available', 'current_latitude', 'current_longitude']
    
    def validate(self, data):
        """Validate location data when available"""
        is_available = data.get('is_available', True)
        latitude = data.get('current_latitude')
        longitude = data.get('current_longitude')
        
        if is_available and (latitude is None or longitude is None):
            raise serializers.ValidationError(
                "Location coordinates required when setting availability to true"
            )
        
        # Validate coordinate ranges
        if latitude is not None and not -90 <= latitude <= 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90")
        
        if longitude is not None and not -180 <= longitude <= 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180")
        
        return data

# ==================== SOS ALERT SERIALIZERS ====================

class SOSAlertCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating SOS alerts"""
    class Meta:
        model = SOSAlert
        fields = ['latitude', 'longitude', 'emergency_type', 'description']
        
    def validate_latitude(self, value):
        """Validate latitude is within reasonable bounds"""
        if not -90 <= value <= 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90")
        return value
    
    def validate_longitude(self, value):
        """Validate longitude is within reasonable bounds"""  
        if not -180 <= value <= 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180")
        return value

class SOSAlertSerializer(serializers.ModelSerializer):
    """Complete SOS Alert serializer with related data"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    volunteer_count = serializers.SerializerMethodField()
    response_volunteers = serializers.SerializerMethodField()
    location_updates_count = serializers.SerializerMethodField()
    has_video_feed = serializers.SerializerMethodField()
    time_active = serializers.SerializerMethodField()
    distance_from_user = serializers.SerializerMethodField()
    
    class Meta:
        model = SOSAlert
        fields = [
            'id', 'user', 'user_email', 'user_name', 'emergency_type',
            'latitude', 'longitude', 'description', 'is_active', 
            'resolved_at', 'created_at', 'is_streaming', 'stream_url',  # FIXED: Removed non-existent fields
            'volunteer_count', 'response_volunteers', 'location_updates_count',
            'has_video_feed', 'time_active', 'distance_from_user'
        ]
        read_only_fields = [
            'id', 'user_email', 'user_name', 'volunteer_count', 
            'response_volunteers', 'location_updates_count', 'has_video_feed',
            'time_active', 'distance_from_user', 'created_at'
        ]
    
    def get_user_name(self, obj):
        """Get user's display name"""
        if obj.user:
            if hasattr(obj.user, 'first_name') and obj.user.first_name:
                return f"{obj.user.first_name} {obj.user.last_name}".strip()
            return obj.user.email  # FIXED: Use email instead of username
        return "Anonymous User"
    
    def get_volunteer_count(self, obj):
        """Get number of volunteers who responded - FIXED"""
        return VolunteerAlert.objects.filter(sos_alert=obj, responded=True).count()
    
    def get_response_volunteers(self, obj):
        """Get list of responding volunteers - FIXED"""
        volunteer_alerts = VolunteerAlert.objects.filter(
            sos_alert=obj,
            responded=True  # Only get volunteers who actually responded
        ).select_related('volunteer__user')[:5]  # Limit to first 5
        
        return [
            {
                'id': alert.volunteer.id,
                'name': alert.volunteer.user.email,  # FIXED: Use email
                'phone': alert.volunteer.phone_number,
                'response_time': alert.response_time.isoformat() if alert.response_time else None,
                'status': alert.status,
                'distance': round(alert.distance) if alert.distance else None  # FIXED: Use correct field name
            }
            for alert in volunteer_alerts
        ]
    
    def get_location_updates_count(self, obj):
        """Get number of location updates"""
        return SOSLocationUpdate.objects.filter(sos_alert=obj).count()
    
    def get_has_video_feed(self, obj):
        """Check if SOS has video feed"""
        return SOSVideoFeed.objects.filter(sos_alert=obj).exists()
    
    def get_time_active(self, obj):
        """Get how long the SOS has been active"""
        if not obj.is_active and obj.resolved_at:  # FIXED: Check is_active instead of is_resolved
            duration = obj.resolved_at - obj.created_at
        else:
            from django.utils import timezone
            duration = timezone.now() - obj.created_at
        
        total_minutes = int(duration.total_seconds() / 60)
        if total_minutes < 60:
            return f"{total_minutes} minutes"
        else:
            hours = total_minutes // 60
            minutes = total_minutes % 60
            return f"{hours}h {minutes}m"
    
    def get_distance_from_user(self, obj):
        """Calculate distance from current user location"""
        request = self.context.get('request')
        if request and hasattr(request, 'user_location'):
            user_lat = request.user_location.get('latitude')
            user_lng = request.user_location.get('longitude')
            if user_lat and user_lng:
                from .views import calculate_distance
                distance = calculate_distance(
                    user_lat, user_lng, 
                    obj.latitude, obj.longitude
                )
                return round(distance)
        return None

class SOSAlertListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing SOS alerts"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    volunteer_count = serializers.SerializerMethodField()
    time_active = serializers.SerializerMethodField()
    
    class Meta:
        model = SOSAlert
        fields = [
            'id', 'user_email', 'emergency_type', 'latitude', 'longitude',
            'is_active', 'created_at', 'volunteer_count', 'time_active'
        ]
        read_only_fields = ['id', 'user_email', 'volunteer_count', 'time_active', 'created_at']
    
    def get_volunteer_count(self, obj):
        return VolunteerAlert.objects.filter(sos_alert=obj, responded=True).count()  # FIXED: Only count actual responses
    
    def get_time_active(self, obj):
        from django.utils import timezone
        duration = timezone.now() - obj.created_at
        total_minutes = int(duration.total_seconds() / 60)
        return f"{total_minutes}m" if total_minutes < 60 else f"{total_minutes // 60}h {total_minutes % 60}m"

# ==================== VOLUNTEER ALERT SERIALIZERS ====================

class VolunteerAlertSerializer(serializers.ModelSerializer):
    """Serializer for volunteer emergency responses"""
    volunteer_name = serializers.CharField(source='volunteer.user.email', read_only=True)  # FIXED: Use email
    volunteer_phone = serializers.CharField(source='volunteer.phone_number', read_only=True)
    volunteer_email = serializers.EmailField(source='volunteer.user.email', read_only=True)
    sos_emergency_type = serializers.CharField(source='sos_alert.emergency_type', read_only=True)
    sos_location = serializers.SerializerMethodField()
    response_time_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = VolunteerAlert
        fields = [
            'id', 'volunteer', 'volunteer_name', 'volunteer_phone', 'volunteer_email',
            'sos_alert', 'sos_emergency_type', 'sos_location', 'response_time',
            'response_time_formatted', 'distance', 'status', 'message',  # FIXED: Use correct field names
            'responded', 'alerted_at'  # ADDED: Include these important fields
        ]
        read_only_fields = [
            'id', 'volunteer_name', 'volunteer_phone', 'volunteer_email',
            'sos_emergency_type', 'sos_location', 'response_time_formatted', 'alerted_at'
        ]
    
    def get_sos_location(self, obj):
        """Get SOS alert location"""
        return {
            'latitude': obj.sos_alert.latitude,
            'longitude': obj.sos_alert.longitude
        }
    
    def get_response_time_formatted(self, obj):
        """Format response time in a readable way"""
        if obj.response_time:
            from django.utils import timezone
            now = timezone.now()
            if obj.response_time <= now:
                diff = now - obj.response_time
                total_minutes = int(diff.total_seconds() / 60)
                if total_minutes < 1:
                    return "Just now"
                elif total_minutes < 60:
                    return f"{total_minutes} minutes ago"
                else:
                    hours = total_minutes // 60
                    return f"{hours} hours ago"
        return None

class VolunteerAlertCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating volunteer alert responses"""
    class Meta:
        model = VolunteerAlert
        fields = ['sos_alert', 'message']  # FIXED: Use correct field name
    
    def validate_sos_alert(self, value):
        """Validate SOS alert is still active"""
        if not value.is_active:
            raise serializers.ValidationError("Cannot respond to resolved SOS alert")
        return value
    
    def create(self, validated_data):
        """Create volunteer alert with additional context"""
        request = self.context.get('request')
        if request and request.user:
            try:
                volunteer = Volunteer.objects.get(user=request.user)
                validated_data['volunteer'] = volunteer
                
                # Calculate distance if volunteer has location
                sos_alert = validated_data['sos_alert']
                if volunteer.current_latitude and volunteer.current_longitude:
                    from .views import calculate_distance
                    distance = calculate_distance(
                        sos_alert.latitude, sos_alert.longitude,
                        volunteer.current_latitude, volunteer.current_longitude
                    )
                    validated_data['distance'] = distance  # FIXED: Use correct field name
                
            except Volunteer.DoesNotExist:
                raise serializers.ValidationError("User is not registered as a volunteer")
        
        return super().create(validated_data)

# ==================== LOCATION UPDATE SERIALIZERS ====================

class SOSLocationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for SOS location updates"""
    time_since_update = serializers.SerializerMethodField()
    
    class Meta:
        model = SOSLocationUpdate
        fields = [
            'id', 'sos_alert', 'latitude', 'longitude', 'accuracy',
            'timestamp', 'time_since_update'
        ]
        read_only_fields = ['id', 'time_since_update']
    
    def get_time_since_update(self, obj):
        """Get time since this location update"""
        from django.utils import timezone
        diff = timezone.now() - obj.timestamp
        total_seconds = int(diff.total_seconds())
        
        if total_seconds < 60:
            return f"{total_seconds}s ago"
        elif total_seconds < 3600:
            return f"{total_seconds // 60}m ago"
        else:
            return f"{total_seconds // 3600}h ago"
    
    def validate_latitude(self, value):
        """Validate latitude"""
        if not -90 <= value <= 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90")
        return value
    
    def validate_longitude(self, value):
        """Validate longitude"""
        if not -180 <= value <= 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180")
        return value

class SOSLocationUpdateCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating location updates"""
    class Meta:
        model = SOSLocationUpdate
        fields = ['sos_alert', 'latitude', 'longitude', 'accuracy']
    
    def validate_sos_alert(self, value):
        """Ensure SOS alert is still active"""
        if not value.is_active:
            raise serializers.ValidationError("Cannot update location for resolved SOS alert")
        return value

# ==================== VIDEO FEED SERIALIZERS ====================

class SOSVideoFeedSerializer(serializers.ModelSerializer):
    """Serializer for SOS video feeds"""
    file_size_formatted = serializers.SerializerMethodField()  # FIXED: Renamed method
    time_since_upload = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SOSVideoFeed
        fields = [
            'id', 'sos_alert', 'video_file', 'video_url', 'file_size', 'file_size_formatted',
            'sent_to_police', 'timestamp', 'time_since_upload', 'chunk_sequence',
            'viewed_by_police', 'viewed_at'  # ADDED: Include new fields
        ]
        read_only_fields = ['id', 'video_url', 'file_size_formatted', 'time_since_upload']
    
    def get_file_size_formatted(self, obj):  # FIXED: Method name matches field
        """Get formatted file size"""
        if obj.file_size:
            size_bytes = obj.file_size
            if size_bytes < 1024:
                return f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                return f"{size_bytes / 1024:.1f} KB"
            else:
                return f"{size_bytes / (1024 * 1024):.1f} MB"
        elif obj.video_file:
            try:
                size_bytes = obj.video_file.size
                if size_bytes < 1024:
                    return f"{size_bytes} B"
                elif size_bytes < 1024 * 1024:
                    return f"{size_bytes / 1024:.1f} KB"
                else:
                    return f"{size_bytes / (1024 * 1024):.1f} MB"
            except (OSError, AttributeError):
                return "Unknown size"
        return None
    
    def get_time_since_upload(self, obj):
        """Get time since video upload"""
        from django.utils import timezone
        diff = timezone.now() - obj.timestamp
        total_minutes = int(diff.total_seconds() / 60)
        
        if total_minutes < 1:
            return "Just uploaded"
        elif total_minutes < 60:
            return f"{total_minutes}m ago"
        else:
            return f"{total_minutes // 60}h ago"
    
    def get_video_url(self, obj):
        """Get full video URL"""
        if obj.video_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_file.url)
            return obj.video_file.url
        return None

class SOSVideoFeedCreateSerializer(serializers.ModelSerializer):
    """Serializer for uploading video feeds"""
    class Meta:
        model = SOSVideoFeed
        fields = ['sos_alert', 'video_file']
    
    def validate_sos_alert(self, value):
        """Ensure SOS alert is active"""
        if not value.is_active:
            raise serializers.ValidationError("Cannot upload video for resolved SOS alert")
        return value
    
    def validate_video_file(self, value):
        """Validate video file"""
        if not value:
            raise serializers.ValidationError("Video file is required")
        
        # Check file size (max 50MB for emergency videos)
        max_size = 50 * 1024 * 1024  # 50MB
        if value.size > max_size:
            raise serializers.ValidationError("Video file too large (max 50MB)")
        
        # Check file type
        allowed_types = ['video/mp4', 'video/webm', 'video/quicktime']
        if hasattr(value, 'content_type') and value.content_type not in allowed_types:
            raise serializers.ValidationError("Invalid video format. Use MP4, WebM, or QuickTime")
        
        return value

# ==================== DASHBOARD SERIALIZERS ====================

class SOSDashboardSerializer(serializers.Serializer):
    """Serializer for SOS dashboard data"""
    active_alerts = serializers.IntegerField()
    total_volunteers = serializers.IntegerField()
    available_volunteers = serializers.IntegerField()
    alerts_today = serializers.IntegerField()
    alerts_this_week = serializers.IntegerField()
    response_time_avg = serializers.FloatField()
    recent_alerts = SOSAlertListSerializer(many=True)
    volunteer_distribution = serializers.DictField()

class VolunteerDashboardSerializer(serializers.Serializer):
    """Serializer for volunteer dashboard data"""
    total_responses = serializers.IntegerField()
    active_responses = serializers.IntegerField()
    response_success_rate = serializers.FloatField()
    average_response_time = serializers.FloatField()
    nearby_alerts = SOSAlertListSerializer(many=True)
    recent_responses = VolunteerAlertSerializer(many=True)

# ==================== UTILITY SERIALIZERS ====================

class EmergencyContactSerializer(serializers.Serializer):
    """Serializer for emergency contacts during SOS"""
    name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20)
    relationship = serializers.CharField(max_length=50)

class SafeLocationSerializer(serializers.Serializer):
    """Serializer for safe location suggestions"""
    id = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    distance = serializers.IntegerField()
    address = serializers.CharField(required=False)
    contact_number = serializers.CharField(required=False)
