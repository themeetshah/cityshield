"""DRF permission classes built on users.roles."""
from rest_framework.permissions import BasePermission

from . import roles


class IsSuperAdmin(BasePermission):
    message = 'Super admin access required.'

    def has_permission(self, request, view):
        return roles.is_superadmin(request.user)


class IsResponderOrSuperAdmin(BasePermission):
    """Any department staff/admin, or a superadmin."""
    message = 'Department staff access required.'

    def has_permission(self, request, view):
        return roles.is_superadmin(request.user) or roles.is_responder(request.user)


class IsAdminOrSuperAdmin(BasePermission):
    """A department admin or a superadmin."""
    message = 'Administrator access required.'

    def has_permission(self, request, view):
        return roles.is_superadmin(request.user) or roles.is_department_admin(request.user)


def department_permission(department):
    """Permission class: member (staff/admin) of `department`, or superadmin."""

    class _InDepartment(BasePermission):
        message = f'{roles.DEPARTMENTS[department]["label"]} access required.'

        def has_permission(self, request, view):
            return roles.in_department(request.user, department)

    _InDepartment.__name__ = f'In{department.title()}Department'
    return _InDepartment


IsPoliceDepartment = department_permission(roles.POLICE)


class CanReviewVolunteers(BasePermission):
    """Volunteer applications are reviewed by the police department."""
    message = 'Only the police department can review volunteer applications.'

    def has_permission(self, request, view):
        return roles.in_department(request.user, roles.POLICE)
