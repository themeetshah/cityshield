import io
from datetime import timedelta
import tempfile
from pathlib import Path
from unittest import mock

import requests
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import CommandError, call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from reports.models import Report
from users.models import User

from . import overpass, risk, sync
from .models import FacilitySyncArea, Hospital, PoliceStation, SafetyZone

LAT, LNG = 23.0225, 72.5714
OVERPASS_SAMPLE = {
    'elements': [
        {'type': 'node', 'id': 1, 'lat': LAT + 0.001, 'lon': LNG, 'tags': {'amenity': 'hospital', 'name': 'City Hospital'}},
        {'type': 'way', 'id': 2, 'center': {'lat': LAT, 'lon': LNG + 0.002}, 'tags': {'amenity': 'police', 'name': 'Navrangpura PS'}},
        {'type': 'node', 'id': 3, 'lat': LAT, 'lon': LNG, 'tags': {'amenity': 'cafe'}},
    ]
}


def make_user(email, role):
    return User.objects.create_user(email=email, password='pass12345!', role=role)


def overpass_response(payload=OVERPASS_SAMPLE):
    response = mock.Mock()
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    return response


class SafetyBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.citizen = make_user('c@example.com', 'citizen')
        self.police_admin = make_user('pa@example.com', 'police_admin')
        self.superadmin = make_user('root@example.com', 'superadmin')


class AuthTests(SafetyBase):
    def test_read_endpoints_require_authentication(self):
        for url in [
            '/api/safety/police-stations/', '/api/safety/hospitals/', '/api/safety/safety-zones/',
            f'/api/safety/nearby-facilities/?latitude={LAT}&longitude={LNG}',
            f'/api/safety/nearby-police/?latitude={LAT}&longitude={LNG}',
            f'/api/safety/risk-grid/?latitude={LAT}&longitude={LNG}',
            f'/api/safety/risk-zones/?latitude={LAT}&longitude={LNG}',
            f'/api/safety/risk-analysis/?latitude={LAT}&longitude={LNG}',
        ]:
            self.assertEqual(self.client.get(url).status_code, 401, url)

    def test_duplicate_report_endpoints_removed(self):
        self.client.force_authenticate(self.citizen)
        self.assertEqual(self.client.get('/api/safety/nearby-reports/').status_code, 404)
        self.assertEqual(self.client.get('/api/safety/safety-map-reports/').status_code, 404)


class WriteEndpointPermissionTests(SafetyBase):
    def zone_payload(self):
        return {'zone_type': 'danger', 'center_latitude': LAT, 'center_longitude': LNG, 'radius': 300, 'risk_score': 5}

    def test_safety_zone_crud_is_superadmin_only(self):
        zone = SafetyZone.objects.create(zone_type='safe', center_latitude=LAT, center_longitude=LNG,
                                         radius=100, risk_score=1)
        for user in (self.citizen, self.police_admin):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.post('/api/safety/create-safety-zone/', self.zone_payload(), format='json').status_code, 403)
            self.assertEqual(self.client.patch(f'/api/safety/update-safety-zone/{zone.id}/', {'radius': 5}, format='json').status_code, 403)
            self.assertEqual(self.client.delete(f'/api/safety/delete-safety-zone/{zone.id}/').status_code, 403)

        self.client.force_authenticate(self.superadmin)
        self.assertEqual(self.client.post('/api/safety/create-safety-zone/', self.zone_payload(), format='json').status_code, 201)
        self.assertEqual(self.client.patch(f'/api/safety/update-safety-zone/{zone.id}/', {'radius': 50}, format='json').status_code, 200)
        self.assertEqual(self.client.delete(f'/api/safety/delete-safety-zone/{zone.id}/').status_code, 204)

    def test_zone_validation(self):
        self.client.force_authenticate(self.superadmin)
        bad = {**self.zone_payload(), 'center_latitude': 200}
        self.assertEqual(self.client.post('/api/safety/create-safety-zone/', bad, format='json').status_code, 400)

    def test_csv_import_superadmin_only(self):
        csv_bytes = b'name,latitude,longitude,city\nStation A,23.01,72.51,Ahmedabad\nBad,abc,72.5,X\n'
        for user in (self.citizen, self.police_admin):
            self.client.force_authenticate(user)
            upload = SimpleUploadedFile('s.csv', csv_bytes, content_type='text/csv')
            self.assertEqual(self.client.post('/api/safety/import-police-csv/', {'csv_file': upload}).status_code, 403)
        self.client.force_authenticate(self.superadmin)
        upload = SimpleUploadedFile('s.csv', csv_bytes, content_type='text/csv')
        response = self.client.post('/api/safety/import-police-csv/', {'csv_file': upload})
        self.assertEqual(response.status_code, 200)
        self.assertEqual((response.data['created'], response.data['skipped']), (1, 1))
        upload = SimpleUploadedFile('h.csv', b'name,latitude,longitude\nH,23.0,72.0\n', content_type='text/csv')
        self.assertEqual(self.client.post('/api/safety/import-hospitals-csv/', {'csv_file': upload}).data['created'], 1)

    def test_csv_import_rejects_bad_schema(self):
        self.client.force_authenticate(self.superadmin)
        upload = SimpleUploadedFile('s.csv', b'foo,bar\n1,2\n', content_type='text/csv')
        response = self.client.post('/api/safety/import-police-csv/', {'csv_file': upload})
        self.assertEqual(response.status_code, 400)

    @mock.patch('safety.overpass.requests.post')
    def test_sync_and_export_superadmin_only(self, mock_post):
        mock_post.return_value = overpass_response()
        self.client.force_authenticate(self.police_admin)
        self.assertEqual(self.client.post('/api/safety/sync-facilities/', {'latitude': LAT, 'longitude': LNG}, format='json').status_code, 403)
        self.assertEqual(self.client.get('/api/safety/export-facilities/').status_code, 403)
        self.client.force_authenticate(self.superadmin)
        response = self.client.post('/api/safety/sync-facilities/', {'latitude': LAT, 'longitude': LNG}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['hospitals']['created'], 1)
        self.assertEqual(response.data['police_stations']['created'], 1)
        self.assertEqual(self.client.get('/api/safety/export-facilities/').data['count'], 2)


class FacilityTests(SafetyBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.citizen)
        PoliceStation.objects.create(name='DB Station', latitude=LAT, longitude=LNG + 0.002, source='manual')
        PoliceStation.objects.create(name='Far Station', latitude=LAT + 1, longitude=LNG)
        PoliceStation.objects.create(name='Closed Station', latitude=LAT, longitude=LNG, is_active=False)

    @mock.patch('safety.overpass.requests.post')
    def test_read_path_is_database_only(self, mock_post):
        data = self.client.get(f'/api/safety/nearby-facilities/?latitude={LAT}&longitude={LNG}&radius=2000').data
        self.assertEqual([p['name'] for p in data['police_stations']], ['DB Station'])  # inactive + far excluded
        self.assertEqual(data['warnings'], [])
        mock_post.assert_not_called()  # auto-sync is disabled in tests; never called inline

    def test_post_still_supported_and_radius_clamped(self):
        response = self.client.post('/api/safety/nearby-facilities/',
                                    {'latitude': LAT, 'longitude': LNG, 'radius': 10**9}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['search_radius'], overpass.MAX_OVERPASS_RADIUS_M)

    def test_bad_coordinates(self):
        self.assertEqual(self.client.get('/api/safety/nearby-facilities/?latitude=x&longitude=1').status_code, 400)
        self.assertEqual(self.client.get('/api/safety/risk-grid/').status_code, 400)

    def test_list_police_stations_paginated(self):
        data = self.client.get('/api/safety/police-stations/?limit=1').data
        self.assertEqual((data['count'], len(data['police_stations'])), (2, 1))


class RiskTests(SafetyBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.citizen)

    def add_report(self, lat=LAT, lng=LNG, report_type='crime', status='pending', days_ago=0):
        report = Report.objects.create(reported_by=self.citizen, title='t' * 5, description='d' * 20,
                                       report_type=report_type, latitude=lat, longitude=lng, status=status)
        if days_ago:
            Report.objects.filter(pk=report.pk).update(created_at=timezone.now() - timedelta(days=days_ago))
        return report

    def test_no_data_means_no_cells(self):
        data = self.client.get(f'/api/safety/risk-grid/?latitude={LAT}&longitude={LNG}').data
        self.assertEqual(data['cells'], [])
        self.assertEqual(data['method'], 'heuristic')
        summary = self.client.get(f'/api/safety/risk-analysis/?latitude={LAT}&longitude={LNG}').data
        self.assertEqual(summary['risk_level'], 'no_data')

    def test_grid_is_deterministic_and_ignores_dismissed_and_old(self):
        self.add_report()
        self.add_report(lat=LAT + 0.0005)
        self.add_report(status='dismissed', lat=LAT + 0.02)
        self.add_report(days_ago=400, lat=LAT - 0.02)
        url = f'/api/safety/risk-grid/?latitude={LAT}&longitude={LNG}&radius=3000'
        first = self.client.get(url).data
        second = self.client.get(url).data
        self.assertEqual(first['cells'], second['cells'])
        self.assertTrue(first['cells'])
        self.assertEqual(sum(c['incident_count'] for c in first['cells']), 2)
        for cell in first['cells']:
            self.assertLess(abs(cell['latitude'] - LAT), 0.01)

    def test_grid_query_count_is_constant(self):
        for i in range(10):
            self.add_report(lat=LAT + i * 0.003)
        with self.assertNumQueries(2):
            risk.risk_grid(LAT, LNG, 5000, risk.load_incidents(LAT, LNG, 5000))

    def test_zones_need_two_incidents(self):
        self.add_report()
        data = self.client.get(f'/api/safety/risk-zones/?latitude={LAT}&longitude={LNG}').data
        self.assertEqual(data['zones'], [])
        self.add_report(lat=LAT + 0.0005)
        zones = self.client.get(f'/api/safety/risk-zones/?latitude={LAT}&longitude={LNG}').data['zones']
        self.assertEqual(len(zones), 1)
        self.assertEqual(zones[0]['incident_count'], 2)

    def test_radius_clamped(self):
        data = self.client.get(f'/api/safety/risk-grid/?latitude={LAT}&longitude={LNG}&radius=900000').data
        self.assertEqual(data['search_radius'], risk.MAX_GRID_RADIUS_M)


class ImportCommandTests(TestCase):
    def write_csv(self, tmp_path, text):
        path = Path(tmp_path) / 'stations.csv'
        path.write_text(text, encoding='utf-8')
        return str(path)

    def test_import_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self.write_csv(tmp, 'name,latitude,longitude,city\nA,23.0,72.0,X\nB,23.1,72.1,Y\nC,,72.1,Y\n')
            out = io.StringIO()
            call_command('import_police_stations', csv=path, stdout=out)
            self.assertIn('2 created', out.getvalue())
            call_command('import_police_stations', csv=path, stdout=io.StringIO())
            self.assertEqual(PoliceStation.objects.count(), 2)

    def test_bundled_postal_csv_is_refused_without_flag(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self.write_csv(
                tmp,
                'circlename,officename,pincode,officetype,district,statename,latitude,longitude\n'
                'Gujarat Circle,Kanbha BO,382430,BO,AHMADABAD,GUJARAT,23.02,72.69\n',
            )
            with self.assertRaises(CommandError):
                call_command('import_police_stations', csv=path, stdout=io.StringIO())
        self.assertEqual(PoliceStation.objects.count(), 0)

    def test_missing_file(self):
        with self.assertRaises(CommandError):
            call_command('import_police_stations', csv='does-not-exist.csv', stdout=io.StringIO())


class FacilitySyncTests(TestCase):
    BBOX = (LAT - 0.05, LNG - 0.05, LAT + 0.05, LNG + 0.05)

    def run_sync(self, payload):
        with mock.patch('safety.overpass.requests.post', return_value=overpass_response(payload)):
            return sync.sync_bbox(*self.BBOX, key='test-area', label='Test')

    def test_creates_then_updates_moved_and_renamed_facility(self):
        summary = self.run_sync(OVERPASS_SAMPLE)
        self.assertEqual(summary['police_stations']['created'], 1)
        moved = {'elements': [
            {'type': 'way', 'id': 2, 'center': {'lat': LAT + 0.003, 'lon': LNG + 0.004},
             'tags': {'amenity': 'police', 'name': 'Navrangpura Police Station'}},
            OVERPASS_SAMPLE['elements'][0],
        ]}
        summary = self.run_sync(moved)
        self.assertEqual(summary['police_stations'], {'found': 1, 'created': 0, 'updated': 1, 'deactivated': 0})
        station = PoliceStation.objects.get(osm_type='way', osm_id=2)
        self.assertEqual(station.name, 'Navrangpura Police Station')
        self.assertAlmostEqual(station.latitude, LAT + 0.003)
        self.assertEqual(PoliceStation.objects.count(), 1)

    def test_removed_from_osm_is_deactivated_not_deleted(self):
        self.run_sync(OVERPASS_SAMPLE)
        summary = self.run_sync({'elements': [OVERPASS_SAMPLE['elements'][0]]})
        self.assertEqual(summary['police_stations']['deactivated'], 1)
        self.assertFalse(PoliceStation.objects.get(osm_id=2).is_active)
        # comes back if it reappears
        self.run_sync(OVERPASS_SAMPLE)
        self.assertTrue(PoliceStation.objects.get(osm_id=2).is_active)

    def test_adopts_legacy_row_keeping_foreign_keys(self):
        legacy = PoliceStation.objects.create(name='Old name', latitude=LAT + 0.0002, longitude=LNG + 0.002,
                                              source='overpass')
        officer = User.objects.create_user(email='o@x.com', password='x', role='police', police_station=legacy)
        self.run_sync(OVERPASS_SAMPLE)
        self.assertEqual(PoliceStation.objects.count(), 1)
        officer.refresh_from_db()
        self.assertEqual(officer.police_station.osm_id, 2)
        self.assertEqual(officer.police_station.name, 'Navrangpura PS')

    def test_tries_next_mirror_and_records_failure(self):
        ok = overpass_response(OVERPASS_SAMPLE)
        with mock.patch('safety.overpass.requests.post', side_effect=[requests.Timeout(), ok]) as post:
            sync.sync_bbox(*self.BBOX, key='mirror', label='m')
        self.assertEqual(post.call_count, 2)
        with mock.patch('safety.overpass.requests.post', side_effect=requests.Timeout()):
            with self.assertRaises(overpass.OverpassError):
                sync.sync_bbox(*self.BBOX, key='down', label='d')
        self.assertTrue(FacilitySyncArea.objects.get(key='down').last_error)

    def test_hospital_tagged_with_healthcare_only(self):
        payload = {'elements': [{'type': 'node', 'id': 9, 'lat': LAT, 'lon': LNG,
                                 'tags': {'healthcare': 'hospital', 'name:en': 'Civil Hospital', 'name': 'સિવિલ'}}]}
        self.run_sync(payload)
        self.assertEqual(Hospital.objects.get().name, 'Civil Hospital')

    def test_management_command(self):
        with mock.patch('safety.overpass.geocode_area', return_value=(self.BBOX, 'Testcity, India')),                 mock.patch('safety.overpass.requests.post', return_value=overpass_response(OVERPASS_SAMPLE)):
            out = io.StringIO()
            call_command('sync_facilities', 'Testcity', stdout=out)
        self.assertIn('1 new', out.getvalue())
        self.assertEqual(FacilitySyncArea.objects.get(key='place:testcity').police_count, 1)
