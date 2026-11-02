"""Never leak stack traces / exception text to clients; log them instead."""
import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger('cityshield')


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None:
        return response
    view = context.get('view')
    logger.exception('Unhandled error in %s', getattr(view, '__class__', type(view)).__name__)
    return Response({'error': 'Internal server error'}, status=500)
