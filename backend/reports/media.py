"""Validation of uploaded report evidence (images and short videos)."""
import os

from django.conf import settings
from rest_framework import serializers

MAX_FILES = 5

# extension -> (kind, accepted content types)
ALLOWED = {
    '.jpg': ('image', {'image/jpeg', 'image/pjpeg'}),
    '.jpeg': ('image', {'image/jpeg', 'image/pjpeg'}),
    '.png': ('image', {'image/png'}),
    '.webp': ('image', {'image/webp'}),
    '.gif': ('image', {'image/gif'}),
    '.mp4': ('video', {'video/mp4'}),
    '.m4v': ('video', {'video/mp4', 'video/x-m4v'}),
    '.webm': ('video', {'video/webm'}),
    '.mov': ('video', {'video/quicktime'}),
}


def _signature_kind(head):
    """Identify the real file type from its first bytes (do not trust the client)."""
    if head.startswith(b'\xff\xd8\xff'):
        return '.jpg'
    if head.startswith(b'\x89PNG\r\n\x1a\n'):
        return '.png'
    if head[:6] in (b'GIF87a', b'GIF89a'):
        return '.gif'
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        return '.webp'
    if head.startswith(b'\x1a\x45\xdf\xa3'):
        return '.webm'
    if head[4:8] == b'ftyp':
        brand = head[8:12]
        return '.mov' if brand == b'qt  ' else '.mp4'
    if head[4:8] in (b'moov', b'mdat', b'wide', b'free'):
        return '.mov'
    return None


_FAMILIES = [{'.jpg', '.jpeg'}, {'.mp4', '.m4v', '.mov'}]


def _same_family(a, b):
    return a == b or any(a in fam and b in fam for fam in _FAMILIES)


def validate_media_files(files):
    if len(files) > MAX_FILES:
        raise serializers.ValidationError(f'You can attach at most {MAX_FILES} files.')
    max_bytes = settings.MAX_REPORT_MEDIA_BYTES
    for upload in files:
        ext = os.path.splitext(upload.name or '')[1].lower()
        if ext not in ALLOWED:
            raise serializers.ValidationError(
                f'"{upload.name}" is not a supported file type. '
                'Use JPEG, PNG, WebP or GIF images, or MP4, WebM or MOV videos.'
            )
        if upload.size > max_bytes:
            raise serializers.ValidationError(
                f'"{upload.name}" is larger than {max_bytes // (1024 * 1024)} MB.'
            )
        if upload.size == 0:
            raise serializers.ValidationError(f'"{upload.name}" is empty.')
        _, content_types = ALLOWED[ext]
        if upload.content_type and upload.content_type not in content_types:
            raise serializers.ValidationError(f'"{upload.name}" has an unexpected content type.')
        upload.seek(0)
        head = upload.read(16)
        upload.seek(0)
        detected = _signature_kind(head)
        if detected is None or not _same_family(detected, ext):
            raise serializers.ValidationError(f'"{upload.name}" does not look like a valid {ext} file.')
    return files
