from rest_framework.permissions import BasePermission

from users import roles


class CanFileReport(BasePermission):
    """Citizen reports are filed by citizens, volunteers and superadmins (not responders)."""
    message = 'Only citizens and volunteers can file incident reports.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return roles.is_superadmin(user) or user.role in (roles.CITIZEN, roles.VOLUNTEER)
