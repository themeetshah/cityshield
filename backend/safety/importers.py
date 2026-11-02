"""CSV import of facilities (used by the management command and the superadmin upload API).

Expected columns: name, latitude, longitude and optionally address, city, state,
contact_number (and hospital_type for hospitals). Imports are idempotent: rows
are matched on (latitude, longitude) and updated in place.
"""
import csv
import io
import math

from django.db import transaction

from .models import Hospital, PoliceStation

MAX_ROWS = 20_000

# The legacy bundled file (police_station_data.csv) uses the India Post office
# directory schema. Those rows are post offices, not police stations.
POSTAL_COLUMNS = {'officename', 'officetype', 'pincode'}


class FacilityImportError(ValueError):
    """Raised for unusable CSV input (message is safe to show to an admin)."""


def _clean(value, limit):
    value = (value or '').strip()
    return '' if value.upper() in ('NA', 'N/A', 'NAN', 'NULL') else value[:limit]


def _coords(row):
    try:
        lat, lng = float(row.get('latitude', '')), float(row.get('longitude', ''))
    except (TypeError, ValueError):
        return None
    if not (math.isfinite(lat) and math.isfinite(lng) and -90 <= lat <= 90 and -180 <= lng <= 180):
        return None
    if lat == 0 and lng == 0:
        return None
    return lat, lng


def _postal_row(row):
    """Map an India Post directory row onto facility fields."""
    district = _clean(row.get('district'), 100)
    return {
        'name': _clean(row.get('officename'), 200),
        'address': ', '.join(p for p in (
            _clean(row.get('officename'), 200), _clean(row.get('divisionname'), 200), district,
            _clean(row.get('statename'), 100), _clean(row.get('pincode'), 10),
        ) if p),
        'city': district,
        'state': _clean(row.get('statename'), 100),
        'contact_number': '',
    }


def _standard_row(row, with_type):
    fields = {
        'name': _clean(row.get('name'), 200),
        'address': _clean(row.get('address'), 1000),
        'city': _clean(row.get('city'), 100),
        'state': _clean(row.get('state'), 100),
        'contact_number': _clean(row.get('contact_number'), 20),
    }
    if with_type:
        fields['hospital_type'] = _clean(row.get('hospital_type'), 100)
    return fields


def read_csv_text(text):
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise FacilityImportError('The CSV file has no header row.')
    reader.fieldnames = [name.strip().lower() for name in reader.fieldnames]
    return reader


def is_postal_schema(reader):
    return POSTAL_COLUMNS.issubset(set(reader.fieldnames or []))


def import_facilities(reader, model, source, allow_postal=False):
    """Create/update rows of `model` from a csv.DictReader. Returns counts."""
    columns = set(reader.fieldnames or [])
    postal = is_postal_schema(reader)
    if postal and not allow_postal:
        raise FacilityImportError(
            'This CSV is the India Post office directory (officename/officetype/pincode). '
            'Its rows are post offices, not police stations or hospitals, so it is not imported '
            'by default. Provide a facilities CSV with name, latitude, longitude columns.'
        )
    if not postal and not {'name', 'latitude', 'longitude'}.issubset(columns):
        raise FacilityImportError('The CSV must have name, latitude and longitude columns.')

    with_type = model is Hospital
    counts = {'created': 0, 'updated': 0, 'skipped': 0}
    with transaction.atomic():
        for index, row in enumerate(reader):
            if index >= MAX_ROWS:
                raise FacilityImportError(f'The CSV has more than {MAX_ROWS} rows.')
            coords = _coords(row)
            fields = _postal_row(row) if postal else _standard_row(row, with_type)
            if coords is None or not fields['name']:
                counts['skipped'] += 1
                continue
            _, created = model.objects.update_or_create(
                latitude=coords[0], longitude=coords[1], defaults={**fields, 'source': source},
            )
            counts['created' if created else 'updated'] += 1
    return counts


def import_police_stations(reader, source='csv', allow_postal=False):
    return import_facilities(reader, PoliceStation, source, allow_postal=allow_postal)


def import_hospitals(reader, source='csv'):
    return import_facilities(reader, Hospital, source)
