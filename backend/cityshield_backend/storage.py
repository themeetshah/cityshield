"""
Supabase Storage through its S3-compatible API (django-storages).

Two buckets:
  * public  (default storage)  - report evidence; files get plain public URLs.
  * private (``sos_private``)  - SOS videos; no URL is ever generated. Responders
    get them only through the signed, expiring stream endpoint in the sos app.

Create both buckets in the Supabase dashboard (Storage) and mark only the
public one as "Public bucket".
"""
from urllib.parse import urlparse

from botocore.config import Config
from storages.backends.s3 import S3Storage


class SupabasePrivateStorage(S3Storage):
    """Private bucket: refuse to build URLs so a video can never leak via a link."""

    def url(self, name, parameters=None, expire=None, http_method=None):
        raise NotImplementedError('Private SOS media has no public URL; use a signed stream URL.')


def supabase_storage_settings(*, supabase_url, access_key, secret_key, region, public_bucket, private_bucket):
    """Return STORAGES entries for the public and private Supabase buckets."""
    host = urlparse(supabase_url).netloc
    common = {
        'endpoint_url': f'{supabase_url}/storage/v1/s3',
        'access_key': access_key,
        'secret_key': secret_key,
        'region_name': region,
        'file_overwrite': False,      # uploads already use random names; never clobber
        'default_acl': None,          # Supabase does not use S3 ACLs; bucket settings decide access
        # A custom client_config replaces django-storages' own addressing/signature options,
        # so all of them are set here.
        'client_config': Config(
            s3={'addressing_style': 'path'},   # Supabase only supports path-style addressing
            signature_version='s3v4',
            # Recent boto3 sends extra checksum headers by default; send them only when required.
            request_checksum_calculation='when_required',
            response_checksum_validation='when_required',
        ),
    }
    return {
        'default': {
            'BACKEND': 'storages.backends.s3.S3Storage',
            'OPTIONS': {
                **common,
                'bucket_name': public_bucket,
                'querystring_auth': False,
                # Public objects are served from /storage/v1/object/public/<bucket>/<key>
                'custom_domain': f'{host}/storage/v1/object/public/{public_bucket}',
                'url_protocol': 'https:',
                'object_parameters': {'CacheControl': 'public, max-age=86400'},
            },
        },
        'sos_private': {
            'BACKEND': 'cityshield_backend.storage.SupabasePrivateStorage',
            'OPTIONS': {**common, 'bucket_name': private_bucket, 'querystring_auth': True},
        },
    }
