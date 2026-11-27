from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from safety import overpass, sync


class Command(BaseCommand):
    help = (
        'Update police stations and hospitals from OpenStreetMap (inserts new ones, updates moved/renamed ones, '
        'deactivates ones removed from OSM). Run it on a schedule, e.g. daily or weekly.'
    )

    def add_arguments(self, parser):
        parser.add_argument('places', nargs='*',
                            help='Place names to sync, e.g. "Ahmedabad" "Gandhinagar". '
                                 'Default: settings.FACILITY_SYNC_PLACES.')
        parser.add_argument('--bbox', help='south,west,north,east instead of place names')
        parser.add_argument('--around', help='lat,lng (use with --radius, metres)')
        parser.add_argument('--radius', type=float, default=10_000)

    def handle(self, *args, **opts):
        jobs = []
        if opts['bbox']:
            try:
                south, west, north, east = (float(v) for v in opts['bbox'].split(','))
            except ValueError as exc:
                raise CommandError('--bbox must be south,west,north,east') from exc
            jobs.append(('bbox', lambda: sync.sync_bbox(
                south, west, north, east, key=f'bbox:{opts["bbox"]}', label=f'BBox {opts["bbox"]}')))
        elif opts['around']:
            try:
                lat, lng = (float(v) for v in opts['around'].split(','))
            except ValueError as exc:
                raise CommandError('--around must be lat,lng') from exc
            jobs.append(('around', lambda: sync.sync_around(lat, lng, opts['radius'])))
        else:
            for place in opts['places'] or settings.FACILITY_SYNC_PLACES:
                jobs.append((place, lambda place=place: sync.sync_place(place)))

        failures = 0
        for label, job in jobs:
            self.stdout.write(f'Syncing {label} ...')
            try:
                summary = job()
            except (overpass.OverpassError, ValueError) as exc:
                failures += 1
                self.stderr.write(self.style.ERROR(f'  failed: {exc}'))
                continue
            for kind in ('police_stations', 'hospitals'):
                s = summary[kind]
                self.stdout.write(
                    f"  {kind.replace('_', ' ')}: {s['found']} found, {s['created']} new, "
                    f"{s['updated']} updated, {s['deactivated']} removed")
            self.stdout.write(self.style.SUCCESS(f"  done: {summary['area']}"))
        if failures == len(jobs):
            raise CommandError('Every sync failed - OpenStreetMap may be busy; try again later.')
