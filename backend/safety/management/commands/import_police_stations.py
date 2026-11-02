from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from safety.importers import FacilityImportError, import_police_stations, read_csv_text


class Command(BaseCommand):
    help = (
        'Load police stations from a CSV (columns: name, latitude, longitude, '
        '[address, city, state, contact_number]) into the database. Idempotent: '
        'rows are matched on latitude/longitude and updated in place.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv', dest='csv_path', default=str(Path(settings.BASE_DIR) / 'police_station_data.csv'),
            help='Path to the CSV file (default: BASE_DIR/police_station_data.csv).',
        )
        parser.add_argument(
            '--allow-postal-data', action='store_true',
            help='Also accept the India Post office directory schema (officename/officetype/pincode). '
                 'Those rows are post offices, not police stations - only use this knowingly.',
        )

    def handle(self, *args, csv_path, allow_postal_data, **options):
        path = Path(csv_path)
        if not path.is_file():
            raise CommandError(f'CSV file not found: {path}')
        try:
            text = path.read_text(encoding='utf-8-sig')
        except UnicodeDecodeError as exc:
            raise CommandError('The CSV file must be UTF-8 encoded.') from exc

        try:
            counts = import_police_stations(read_csv_text(text), source='csv', allow_postal=allow_postal_data)
        except FacilityImportError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS(
            f"Police stations: {counts['created']} created, {counts['updated']} updated, "
            f"{counts['skipped']} rows skipped (missing name or invalid coordinates)."
        ))
