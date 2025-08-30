from rest_framework import serializers
from .models import User, EmergencyContact, VolunteerApplication

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'phone', 'location', 
            'date_of_birth', 'gender', 'blood_group', 'role'
        ]
        read_only_fields = ['email', 'role']

class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ['id', 'name', 'phone', 'relationship']

class VolunteerApplicationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    
    class Meta:
        model = VolunteerApplication
        fields = ['id', 'user_email', 'user_name', 'phone_number', 'status', 'applied_at', 'reviewed_at', 'notes']
        read_only_fields = ['status', 'applied_at', 'reviewed_at']

class VolunteerApplicationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = VolunteerApplication
        fields = ['status', 'applied_at', 'reviewed_at', 'notes']