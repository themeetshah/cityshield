from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Count, Q
from django.db import transaction
from datetime import timedelta
import json
import traceback

from safety.models import PoliceStation
from .models import User, EmergencyContact
from reports.models import Report
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.hashers import check_password
from sos.models import VolunteerAlert, Volunteer

# Import Report model (adjust the import path based on your app structure)
try:
    from reports.models import Report  # Adjust this import path
except ImportError:
    # Fallback if reports app doesn't exist yet
    Report = None

# Import serializers with error handling
try:
    from .serializers import UserProfileSerializer, EmergencyContactSerializer
except ImportError:
    from rest_framework import serializers
    
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

# Your existing authentication views...
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Simple email + password registration - no verification needed"""
    print(request.data)
    email = request.data.get('email')
    print('Email:', email)
    password = request.data.get('password')
    role = request.data.get('role', 'citizen')
    
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=400)
    
    if User.objects.filter(email=email).exists():
        return Response({'error': 'User with this email already exists'}, status=400)
    
    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        role=role,
        # is_active=True
    )
    
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'message': 'Registration successful! You are now logged in.',
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role
        }
    }, status=201)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_police(request):
    """Simple email + password registration - no verification needed"""
    email = request.data.get('email')
    name = request.data.get('name')
    password = request.data.get('password')
    role = request.data.get('role', 'police')
    phone = request.data.get('phone')
    # police_station = request.data.get('police_station')
    # print(request.data)
    # print('Email:', email)
    # print('Police Station:', police_station)
    
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=400)
    
    # if not police_station:
    #     return Response({'error': 'Station is required'}, status=400)
    
    if User.objects.filter(email=email).exists():
        return Response({'error': 'User with this email already exists'}, status=400)
    
    # if not PoliceStation.objects.filter(id=police_station).exists():
    #     return Response({'error': 'No such police station exists'}, status=400)

    # station = PoliceStation.objects.get(id=police_station)
    # print('Station:', station)

    # Method 2: Use get_or_404 (shorter)
    # from django.shortcuts import get_object_or_404
    # station = get_object_or_404(PoliceStation, id=police_station)

    station = get_object_or_404(PoliceStation, id=request.user.police_station.id)
    print('Station:', station)

    user = User.objects.create_user(
        username=email,
        name=name,
        email=email,
        password=password,
        role=role,
        phone=phone,
        police_station=station,  # Set the police station
        is_active=True
    )
    
    return Response({
        'message': 'Registration successful!.',
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role
        }
    }, status=201)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Simple email + password login"""
    email = request.data.get('email')
    password = request.data.get('password')
    print('Entered:',password)
    
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=400)
    
    print(check_password(User.objects.get(username=email).password, password))
    user = authenticate(username=email, password=password)
    
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'role': user.role
            }
        })
    
    return Response({'error': 'Invalid email or password'}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """Get user profile"""
    user = request.user
    return Response({
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'date_joined': user.date_joined
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_by_id(request, id):
    """Get user by id"""
    try:
        user = User.objects.get(pk=id)
        return Response({
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role,
            'date_joined': user.date_joined
        })
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

# Profile Management Endpoints
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile_detail(request, user_id):
    """Get or update user profile"""
    try:
        if request.user.id != int(user_id):
            return Response({'error': 'Permission denied'}, status=403)
        
        if request.method == 'GET':
            serializer = UserProfileSerializer(request.user)
            data = serializer.data
            # Better way to check if user has a real password
            data['password_set'] = bool(request.user.password and 
                                      not request.user.password.startswith('!') and
                                      len(request.user.password) > 10)
            return Response(data)
        
        elif request.method == 'PATCH':
            # KEY FIX: Ensure partial=True is set
            serializer = UserProfileSerializer(
                request.user, 
                data=request.data, 
                partial=True  # This allows partial updates
            )
            
            if serializer.is_valid():
                serializer.save()
                # Include password status in response
                response_data = serializer.data
                response_data['password_set'] = bool(request.user.password and 
                                                   not request.user.password.startswith('!') and
                                                   len(request.user.password) > 10)
                return Response(response_data)
            else:
                print(f"Serializer errors: {serializer.errors}")  # Debug line
                return Response(serializer.errors, status=400)
            
    except Exception as e:
        print(f"Error in user_profile_detail: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': 'Internal server error'}, status=500)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_stats(request, user_id):
    """Get user statistics from Report model"""
    try:
        if request.user.id != int(user_id):
            return Response({'error': 'Permission denied'}, status=403)
        
        user = request.user
        
        # Calculate real stats from Report model
        if Report:
            user_reports = Report.objects.filter(reported_by=user)
            
            # Safely check if user is a volunteer
            volunteer = None
            user_helped_count = 0
            
            try:
                volunteer = Volunteer.objects.get(user=user)
                # Only calculate volunteer stats if user is actually a volunteer
                user_helped = VolunteerAlert.objects.filter(volunteer=volunteer)
                user_helped_count = user_helped.count()
            except Volunteer.DoesNotExist:
                # User is not a volunteer - this is normal, not an error
                volunteer = None
                user_helped_count = 0
            
            stats = {
                'reports_submitted': user_reports.count(),
                'reports_resolved': user_reports.filter(status='resolved').count(),
                'reports_in_progress': user_reports.filter(
                    Q(status='pending') | Q(status='investigating')
                ).count(),
                'reports_dismissed': user_reports.filter(status='dismissed').count(),
                'volunteered_hours': 0,  # Implement based on volunteer activities
                'helped_citizens': user_helped_count,
                'is_volunteer': volunteer is not None,  # Add this info
                'join_date': user.date_joined.strftime('%B %Y') if user.date_joined else '',
                'last_active': timezone.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            # Add report type breakdown
            report_types = {}
            for report_type, _ in Report.REPORT_TYPES:
                report_types[report_type] = user_reports.filter(report_type=report_type).count()
            stats['report_types'] = report_types
            
        else:
            # Fallback if Report model not available
            stats = {
                'reports_submitted': 0,
                'reports_resolved': 0,
                'reports_in_progress': 0,
                'reports_dismissed': 0,
                'volunteered_hours': 0,
                'helped_citizens': 0,
                'is_volunteer': False,
                'join_date': user.date_joined.strftime('%B %Y') if user.date_joined else '',
                'last_active': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
                'report_types': {}
            }
        
        return Response(stats)
        
    except Exception as e:
        print(f"Error in user_stats: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': 'Internal server error'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_activities(request, user_id):
    """Get user activities from Report model"""
    try:
        if request.user.id != int(user_id):
            return Response({'error': 'Permission denied'}, status=403)
        
        activities = []
        
        if Report:
            # Get recent reports as activities
            recent_reports = Report.objects.filter(reported_by=request.user).order_by('-created_at')[:10]
            
            for report in recent_reports:
                activities.append({
                    'id': report.id,
                    'action': f'Submitted report: {report.title}',
                    'status': report.status,
                    'created_at': report.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'report_type': report.get_report_type_display(),
                    'location': report.location or f"Lat: {report.latitude}, Lon: {report.longitude}"
                })
        
        # Add account creation activity
        activities.append({
            'id': 0,
            'action': 'Joined CityShield platform',
            'status': 'completed',
            'created_at': request.user.date_joined.strftime('%Y-%m-%d %H:%M:%S') if request.user.date_joined else timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
        # Sort by created_at
        activities.sort(key=lambda x: x['created_at'], reverse=True)
        
        return Response(activities)
        
    except Exception as e:
        print(f"Error in user_activities: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': 'Internal server error'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_notifications(request, user_id):
    """Get user notifications"""
    try:
        if request.user.id != int(user_id):
            return Response({'error': 'Permission denied'}, status=403)
        
        notifications = []
        
        if Report:
            # Create notifications based on report status changes
            user_reports = Report.objects.filter(reported_by=request.user).order_by('-updated_at')[:5]
            
            for report in user_reports:
                if report.status == 'resolved':
                    notifications.append({
                        'id': report.id,
                        'message': f'Your report "{report.title}" has been resolved.',
                        'read': False,
                        'created_at': report.updated_at.strftime('%Y-%m-%d %H:%M:%S')
                    })
                elif report.status == 'investigating':
                    notifications.append({
                        'id': report.id + 1000,  # Offset to avoid ID conflicts
                        'message': f'Your report "{report.title}" is being investigated.',
                        'read': False,
                        'created_at': report.updated_at.strftime('%Y-%m-%d %H:%M:%S')
                    })
        
        # Add welcome notification
        notifications.append({
            'id': 999999,
            'message': 'Welcome to CityShield! You can now report safety issues in your community.',
            'read': True,
            'created_at': request.user.date_joined.strftime('%Y-%m-%d %H:%M:%S') if request.user.date_joined else timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
        # Sort by created_at
        notifications.sort(key=lambda x: x['created_at'], reverse=True)
        
        return Response(notifications)
        
    except Exception as e:
        print(f"Error in user_notifications: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': 'Internal server error'}, status=500)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, user_id, notification_id):
    """Mark notification as read"""
    try:
        if request.user.id != int(user_id):
            return Response({'error': 'Permission denied'}, status=403)
        
        # Mock response - implement actual notification marking when you have a notification model
        return Response({'message': 'Notification marked as read'})
        
    except Exception as e:
        print(f"Error in mark_notification_read: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': 'Internal server error'}, status=500)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def emergency_contacts(request, user_id):
    """Get or create emergency contacts"""
    try:
        if request.user.id != int(user_id):
            return Response({'error': 'Permission denied'}, status=403)
        
        if request.method == 'GET':
            contacts = EmergencyContact.objects.filter(user=request.user)
            serializer = EmergencyContactSerializer(contacts, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = EmergencyContactSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user)
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)
            
    except Exception as e:
        print(f"Error in emergency_contacts: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': 'Internal server error'}, status=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def emergency_contact_delete(request, user_id, contact_id):
    """Delete emergency contact"""
    try:
        if request.user.id != int(user_id):
            return Response({'error': 'Permission denied'}, status=403)
        
        contact = EmergencyContact.objects.get(id=contact_id, user=request.user)
        contact.delete()
        return Response({'message': 'Contact deleted successfully'}, status=204)
        
    except EmergencyContact.DoesNotExist:
        return Response({'error': 'Contact not found'}, status=404)
    except Exception as e:
        print(f"Error in emergency_contact_delete: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': 'Internal server error'}, status=500)

# Your existing Google auth views...
@api_view(['POST'])
@permission_classes([AllowAny])
def google_signup_view(request):
    """Handle Google OAuth signup"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        name = data.get('name')
        role = data.get('role', 'citizen')

        if not email:
            return JsonResponse({'error': 'Email is required'}, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'User with this email already exists'}, status=400)

        user = User.objects.create_user(
            username=email,
            email=email,
            name=name,
            role=role,
            is_active=True
        )

        refresh = RefreshToken.for_user(user)

        return JsonResponse({
            'message': 'Google signup successful',
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'role': user.role
            }
        })

    except Exception as e:
        print(f"Error in google_signup_view: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def google_login_view(request):
    """Handle Google OAuth login"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        name = data.get('name')

        if not email:
            return JsonResponse({'error': 'Email is required'}, status=400)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'name': name,
                'role': 'citizen',
                'is_active': True
            }
        )

        if not created and not user.name and name:
            user.name = name
            user.save()

        refresh = RefreshToken.for_user(user)

        return JsonResponse({
            'message': 'Google login successful',
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'role': user.role
            },
            'isNew': created
        })

    except Exception as e:
        print(f"Error in google_login_view: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request, user_id):
    """Change user password or set password for OAuth users"""
    try:
        if request.user.id != int(user_id):
            return Response({'error': 'Permission denied'}, status=403)
        
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        # Check if user currently has a usable password (OAuth users don't)
        has_password = (
            request.user.password and 
            not request.user.password.startswith('!') and 
            request.user.has_usable_password() and
            len(request.user.password) > 20
        )
        
        if has_password:
            # User has existing password - require current password
            if not all([current_password, new_password, confirm_password]):
                return Response({'error': 'All password fields are required'}, status=400)
            
            # Check if current password is correct
            if not check_password(current_password, request.user.password):
                return Response({'error': 'Current password is incorrect'}, status=400)
        else:
            # OAuth user without password - only need new password fields
            if not all([new_password, confirm_password]):
                return Response({'error': 'New password and confirm password are required'}, status=400)
            
            # For OAuth users, current_password is not required
            if current_password:
                return Response({'error': 'You don\'t have a current password. Just set your new password.'}, status=400)
        
        # Check if new passwords match
        if new_password != confirm_password:
            return Response({'error': 'New passwords do not match'}, status=400)
        
        # Check password strength
        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters long'}, status=400)
        
        # Update password
        request.user.set_password(new_password)
        request.user.save()
        
        # Update session to prevent logout
        update_session_auth_hash(request, request.user)
        
        # Return appropriate success message
        if has_password:
            return Response({'message': 'Password changed successfully'}, status=200)
        else:
            return Response({'message': 'Password set successfully! You can now use email/password login.'}, status=200)
        
    except Exception as e:
        print(f"Error in change_password: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': 'Internal server error'}, status=500)


from .models import VolunteerApplication
from sos.models import Volunteer
from .serializers import VolunteerApplicationSerializer, VolunteerApplicationStatusSerializer
from django.shortcuts import get_object_or_404

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_for_volunteer(request):
    """Apply to become a volunteer"""
    try:
        user = request.user
        
        # Check if user is already a volunteer
        if hasattr(user, 'volunteer'):
            return Response({
                'error': 'You are already a volunteer'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already has a pending/approved application
        existing_application = VolunteerApplication.objects.filter(user=user).first()
        if existing_application:
            return Response({
                'error': f'You already have a {existing_application.status} application',
                'status': existing_application.status,
                'applied_at': existing_application.applied_at
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create new volunteer application
        serializer = VolunteerApplicationSerializer(data=request.data)
        if serializer.is_valid():
            volunteer_application = serializer.save(user=user)
            
            return Response({
                'message': 'Volunteer application submitted successfully',
                'application': VolunteerApplicationSerializer(volunteer_application).data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'error': 'Invalid data',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def volunteer_application_status(request):
    """Get current user's volunteer application status"""
    try:
        user = request.user
        
        # Check if user is already a volunteer
        if hasattr(user, 'volunteer'):
            return Response({
                'status': 'approved',
                'is_volunteer': True,
                'message': 'You are already a volunteer'
            })
        
        # Check for application
        try:
            application = VolunteerApplication.objects.get(user=user)
            serializer = VolunteerApplicationStatusSerializer(application)
            return Response({
                'status': application.status,
                'is_volunteer': False,
                **serializer.data
            })
        except VolunteerApplication.DoesNotExist:
            return Response({
                'status': None,
                'is_volunteer': False,
                'message': 'No volunteer application found'
            })
            
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_volunteer_application(request, application_id):
    """Approve or reject volunteer application (Police only)"""
    try:
        user = request.user
        
        # Check if user is police
        if user.role != 'police':
            return Response({
                'error': 'Only police officers can approve volunteer applications'
            }, status=status.HTTP_403_FORBIDDEN)
        
        application = get_object_or_404(VolunteerApplication, id=application_id)
        action = request.data.get('action')  # 'approve' or 'reject'
        notes = request.data.get('notes', '')
        
        if action not in ['approve', 'reject']:
            return Response({
                'error': 'Action must be either "approve" or "reject"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Update application status
            application.status = 'approved' if action == 'approve' else 'rejected'
            application.reviewed_at = timezone.now()
            application.reviewed_by = user
            application.notes = notes
            application.save()
            
            # If approved, create Volunteer record and update user role
            if action == 'approve':
                volunteer = Volunteer.objects.create(
                    user=application.user,
                    phone_number=application.phone_number
                )
                
                # Update user role to volunteer
                application.user.role = 'volunteer'
                application.user.save()
                
                return Response({
                    'message': f'Volunteer application approved for {application.user.email}',
                    'volunteer_id': volunteer.id
                })
            else:
                return Response({
                    'message': f'Volunteer application rejected for {application.user.email}'
                })
                
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_volunteer_applications(request):
    """List all volunteer applications (Police only)"""
    try:
        user = request.user
        
        if user.role != 'police':
            return Response({
                'error': 'Only police officers can view volunteer applications'
            }, status=status.HTTP_403_FORBIDDEN)
        
        status_filter = request.GET.get('status', 'all')
        
        if status_filter == 'all':
            applications = VolunteerApplication.objects.all()
        else:
            applications = VolunteerApplication.objects.filter(status=status_filter)
        
        applications = applications.order_by('-applied_at')
        serializer = VolunteerApplicationSerializer(applications, many=True)
        
        return Response({
            'applications': serializer.data,
            'total_count': applications.count()
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)