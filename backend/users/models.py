from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager
from django.core.validators import RegexValidator
from django.db import models

from safety.models import PoliceStation

from . import roles

phone_validator = RegexValidator(
    r'^\+?[0-9]{7,15}$', 'Enter a valid phone number (7-15 digits, optional leading +).'
)


class UserManager(DjangoUserManager):
    """Email is the login. `createsuperuser` produces a role=superadmin user."""

    def create_user(self, email=None, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email).lower()
        extra_fields.setdefault('username', email)
        extra_fields.setdefault('role', roles.CITIZEN)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email=None, password=None, **extra_fields):
        extra_fields['role'] = roles.SUPERADMIN
        extra_fields['is_staff'] = True
        extra_fields['is_superuser'] = True
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=20, choices=roles.ROLE_CHOICES, default=roles.CITIZEN, db_index=True)

    police_station = models.ForeignKey(
        PoliceStation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='Station for police-department users',
    )
    created_by = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_users',
        help_text='Admin who created this staff account',
    )

    phone = models.CharField(max_length=16, blank=True, validators=[phone_validator])
    location = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True)
    blood_group = models.CharField(max_length=5, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # username is derived from email by the manager

    objects = UserManager()

    def save(self, *args, **kwargs):
        # Only superadmins get Django-admin access; keep flags in sync with role.
        is_super = self.role == roles.SUPERADMIN
        self.is_staff = is_super
        self.is_superuser = is_super
        super().save(*args, **kwargs)

    @property
    def department(self):
        return roles.department_of_role(self.role)

    def __str__(self):
        return self.email


class EmergencyContact(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='emergency_contacts')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=16, validators=[phone_validator])
    relationship = models.CharField(max_length=50, default='Family')

    def __str__(self):
        return f"{self.name} - {self.user.email}"


class VolunteerApplication(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='volunteer_application')
    phone_number = models.CharField(max_length=16, validators=[phone_validator])
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_volunteer_applications',
    )
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user.email} - {self.status}"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    link = models.CharField(max_length=300, blank=True, help_text='Frontend path, e.g. /reports/12')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'is_read', '-created_at'])]

    def __str__(self):
        return f"{self.user.email}: {self.title}"
