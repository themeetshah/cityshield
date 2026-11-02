"""Scoped throttles. Rates are configured in settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']."""
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthThrottle(AnonRateThrottle):
    """Login / register / Google auth - per IP."""
    scope = 'auth'


class SOSCreateThrottle(AnonRateThrottle):
    """Creating SOS alerts - per IP (authenticated users included)."""
    scope = 'sos_create'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class UploadThrottle(UserRateThrottle):
    """Media / video uploads - per user (or IP when anonymous)."""
    scope = 'uploads'
