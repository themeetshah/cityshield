import os
import sys
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')


def env_bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in ('1', 'true', 'yes', 'on')


def env_list(name, default=''):
    return [item.strip() for item in os.getenv(name, default).split(',') if item.strip()]


RUNNING_TESTS = len(sys.argv) > 1 and sys.argv[1] == 'test'

DEBUG = env_bool('DJANGO_DEBUG', False)

SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'dev-only-insecure-key-do-not-use-in-production'
    else:
        raise ImproperlyConfigured('SECRET_KEY must be set when DJANGO_DEBUG is false')

ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', 'localhost,127.0.0.1')

# Public user uploads (report evidence). Served by Django only in DEBUG.
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
# SOS videos are PRIVATE: stored outside MEDIA_ROOT and streamed only through
# an authenticated, signed endpoint in the sos app.
PRIVATE_MEDIA_ROOT = BASE_DIR / 'private_media'

FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 60 * 1024 * 1024
MAX_REPORT_MEDIA_BYTES = 50 * 1024 * 1024
MAX_SOS_CHUNK_BYTES = 50 * 1024 * 1024

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')

FRONTEND_URL = os.getenv('FRONTEND_URL')
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5174')
CORS_ALLOW_CREDENTIALS = False  # JWT in Authorization header; no cookies needed
CORS_ALLOW_HEADERS = [
    'accept', 'authorization', 'content-type', 'origin', 'x-requested-with', 'x-sos-token',
]

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(seconds=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME', 900))),
    'REFRESH_TOKEN_LIFETIME': timedelta(seconds=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME', 7 * 86400))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
    'SIGNING_KEY': os.getenv('JWT_SIGNING_KEY') or SECRET_KEY,
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'auth': os.getenv('THROTTLE_AUTH', '10/min'),
        'sos_create': os.getenv('THROTTLE_SOS_CREATE', '5/min'),
        'uploads': os.getenv('THROTTLE_UPLOADS', '30/min'),
        'anon': '120/min',
        'user': '600/min',
    },
    'EXCEPTION_HANDLER': 'cityshield_backend.exceptions.exception_handler',
}

AUTH_USER_MODEL = 'users.User'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'users',
    'reports',
    'sos',
    'safety',
    'police',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'cityshield_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'cityshield_backend.wsgi.application'

# PostgreSQL (e.g. Supabase) when DATABASE_URL is set, SQLite otherwise.
# The test suite never uses DATABASE_URL; set TEST_DATABASE_URL to run it on Postgres.
DATABASE_URL = os.getenv('TEST_DATABASE_URL' if RUNNING_TESTS else 'DATABASE_URL', '').strip()
if DATABASE_URL:
    import dj_database_url

    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            # 0 = close after each request. Keep it 0 with `runserver`: it starts a thread per
            # request and each thread would hold its own connection, exhausting Supabase's
            # pooler (15 clients in session mode). Under gunicorn (fixed workers) set e.g. 60.
            conn_max_age=int(os.getenv('DB_CONN_MAX_AGE', 0)),
            conn_health_checks=True,
            ssl_require=env_bool('DATABASE_SSL_REQUIRE', 'supabase' in DATABASE_URL),
        )
    }
    # Supabase's transaction pooler (port 6543) cannot keep server-side cursors open.
    if ':6543' in DATABASE_URL:
        DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / os.getenv('SQLITE_NAME', 'db.sqlite3'),
            # SOS traffic writes concurrently (video segments, live location, resolve).
            # IMMEDIATE transactions + a busy timeout make writers queue instead of
            # failing with "database is locked"; WAL lets reads continue during writes.
            'OPTIONS': {
                'timeout': 20,
                'transaction_mode': 'IMMEDIATE',
                'init_command': 'PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;',
            },
        }
    }

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'cityshield',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

if RUNNING_TESTS:
    # Fast hashing in the test suite only.
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# File storage: local folders by default, Supabase Storage (S3 protocol) when configured.
#   default     -> public bucket for report evidence (plain public URLs)
#   sos_private -> private bucket for SOS videos (no public URL; streamed by the signed endpoint)
# The test suite always uses local folders.
SUPABASE_URL = os.getenv('SUPABASE_URL', '').strip().rstrip('/')
SUPABASE_S3_ACCESS_KEY_ID = os.getenv('SUPABASE_S3_ACCESS_KEY_ID', '').strip()
SUPABASE_S3_SECRET_ACCESS_KEY = os.getenv('SUPABASE_S3_SECRET_ACCESS_KEY', '').strip()
USE_SUPABASE_STORAGE = bool(SUPABASE_URL and SUPABASE_S3_ACCESS_KEY_ID and SUPABASE_S3_SECRET_ACCESS_KEY) and not RUNNING_TESTS

STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}
if USE_SUPABASE_STORAGE:
    from cityshield_backend.storage import supabase_storage_settings

    STORAGES.update(supabase_storage_settings(
        supabase_url=SUPABASE_URL,
        access_key=SUPABASE_S3_ACCESS_KEY_ID,
        secret_key=SUPABASE_S3_SECRET_ACCESS_KEY,
        # `or` (not a getenv default) so an empty "NAME=" line in .env still falls back.
        region=os.getenv('SUPABASE_S3_REGION') or 'ap-south-1',
        public_bucket=os.getenv('SUPABASE_PUBLIC_BUCKET') or 'report-media',
        private_bucket=os.getenv('SUPABASE_PRIVATE_BUCKET') or 'sos-videos',
    ))

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# External services (OpenStreetMap). Identify the app per their usage policies.
OSM_USER_AGENT = os.getenv('OSM_USER_AGENT', 'CityShield/2.0 (student project)')
EXTERNAL_HTTP_TIMEOUT = 10
OVERPASS_SYNC_TIMEOUT = int(os.getenv('OVERPASS_SYNC_TIMEOUT', 90))  # admin-triggered sync only
# Police stations / hospitals come from OpenStreetMap. Map requests only read the DB;
# missing or stale (> FACILITY_REFRESH_DAYS) ~25 km tiles are refreshed in a background thread.
FACILITY_AUTO_SYNC = env_bool('FACILITY_AUTO_SYNC', True) and not RUNNING_TESTS
FACILITY_REFRESH_DAYS = int(os.getenv('FACILITY_REFRESH_DAYS', 7))
# Areas refreshed by `manage.py sync_facilities` with no arguments (comma separated place names).
FACILITY_SYNC_PLACES = env_list('FACILITY_SYNC_PLACES', 'Ahmedabad')

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', 0))
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {'simple': {'format': '%(asctime)s %(levelname)s %(name)s: %(message)s'}},
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'simple'}},
    'root': {'handlers': ['console'], 'level': os.getenv('LOG_LEVEL', 'INFO')},
}
