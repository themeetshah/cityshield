from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/sos/', include('sos.urls')),
    path('api/safety/', include('safety.urls')),
    path('api/police/', include('police.urls')),
    # Login is /api/users/login/ (the generic TokenObtainPairView was removed).
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    # Only public report media. SOS videos live in PRIVATE_MEDIA_ROOT and are never served here.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
