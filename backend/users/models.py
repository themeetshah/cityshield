from django.contrib.auth.models import AbstractUser
from django.db import models

from safety.models import PoliceStation

class User(AbstractUser):
    ROLE_CHOICES = [
        ('citizen', 'Citizen'),
        ('volunteer', 'Volunteer'),
        ('police', 'Police'),
        ('municipality', 'Municipality'),
        ('government', 'Government'),
        ('admin', 'Admin')
    ]

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='citizen')

    police_station = models.ForeignKey(
        PoliceStation,
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="Police Station for police role users"
    )
    
    # Keep only these profile fields
    phone = models.CharField(max_length=10, blank=True)
    location = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True)
    blood_group = models.CharField(max_length=5, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.email
    
def get_user_role(user):
    return user.role if hasattr(user, 'role') else None

class EmergencyContact(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='emergency_contacts')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=10)
    relationship = models.CharField(max_length=50, default='Family')
    
    def __str__(self):
        return f"{self.name} - {self.user.email}"

class VolunteerApplication(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='volunteer_application')
    phone_number = models.CharField(max_length=10)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='reviewed_volunteer_applications'
    )
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.status}"