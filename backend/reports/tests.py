import shutil
import tempfile
from unittest import mock

import requests
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User

from .models import Report

PNG_BYTES = b'\x89PNG\r\n\x1a\n' + b'\x00' * 64
MP4_BYTES = b'\x00\x00\x00\x18ftypmp42' + b'\x00' * 64

EXACT_LAT, EXACT_LNG = 23.0225123, 72.5713987


def make_user(email, role, name=None):
    return User.objects.create_user(email=email, password='pass12345!', role=role, name=name or email.split('@')[0])


class ReportTestBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.media_root = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media_root)
        self.override.enable()
        self.citizen = make_user('citizen@example.com', 'citizen', 'Alice Citizen')
        self.other_citizen = make_user('other@example.com', 'citizen', 'Bob Other')
        self.volunteer = make_user('vol@example.com', 'volunteer')
        self.police = make_user('cop@example.com', 'police')
        self.municipal = make_user('muni@example.com', 'municipal_officer')
        self.superadmin = make_user('root@example.com', 'superadmin')

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)

    def make_report(self, reporter=None, report_type='harassment', anonymous=False, **extra):
        return Report.objects.create(
            reported_by=reporter or self.citizen, title='Something happened',
            description='A detailed description of the incident.', report_type=report_type,
            latitude=EXACT_LAT, longitude=EXACT_LNG, location='12 MG Road, Navrangpura, Ahmedabad, Gujarat, 380009, India',
            is_anonymous=anonymous, **extra,
        )

    def payload(self, **overrides):
        data = {
            'title': 'Broken street light',
            'description': 'The street light near the gate has been off for a week.',
            'report_type': 'infrastructure',
            'latitude': EXACT_LAT,
            'longitude': EXACT_LNG,
            'location': 'Some address',
        }
        data.update(overrides)
        return data


class AuthRequiredTests(ReportTestBase):
    def test_read_endpoints_require_authentication(self):
        report = self.make_report()
        urls = [
            '/api/reports/list/',
            f'/api/reports/{report.id}/',
            f'/api/reports/nearby-reports/?latitude={EXACT_LAT}&longitude={EXACT_LNG}',
            f'/api/reports/reverse-geocode/?lat={EXACT_LAT}&lon={EXACT_LNG}',
        ]
        for url in urls:
            self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED, url)

    def test_create_requires_authentication(self):
        response = self.client.post('/api/reports/', self.payload(), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_removed_duplicate_endpoints_are_gone(self):
        self.client.force_authenticate(self.citizen)
        self.assertEqual(self.client.get('/api/reports/safety-map-reports/').status_code, 404)


class CreatePermissionTests(ReportTestBase):
    def test_citizen_volunteer_superadmin_can_create(self):
        for user in (self.citizen, self.volunteer, self.superadmin):
            self.client.force_authenticate(user)
            response = self.client.post('/api/reports/', self.payload(), format='multipart')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, user.role)

    def test_responders_cannot_create(self):
        for user in (self.police, self.municipal):
            self.client.force_authenticate(user)
            response = self.client.post('/api/reports/', self.payload(), format='multipart')
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, user.role)

    def test_reporter_always_stored_and_status_not_writable(self):
        self.client.force_authenticate(self.citizen)
        response = self.client.post(
            '/api/reports/', self.payload(is_anonymous='true', status='resolved', reported_by=self.other_citizen.id),
            format='multipart')
        self.assertEqual(response.status_code, 201)
        report = Report.objects.get(pk=response.data['id'])
        self.assertEqual(report.reported_by, self.citizen)
        self.assertTrue(report.is_anonymous)
        self.assertEqual(report.status, 'pending')
        self.assertTrue(response.data['is_mine'])
        self.assertNotIn('reported_by', response.data)

    def test_department_set_from_type(self):
        self.client.force_authenticate(self.citizen)
        expected = {'crime': 'police', 'harassment': 'police', 'infrastructure': 'municipal',
                    'fire_hazard': 'fire', 'medical': 'medical', 'other': 'municipal'}
        for report_type, department in expected.items():
            response = self.client.post('/api/reports/', self.payload(report_type=report_type), format='multipart')
            self.assertEqual(response.status_code, 201, response.data)
            self.assertEqual(response.data['department'], department, report_type)

    def test_department_follows_type_on_save(self):
        report = self.make_report(report_type='crime')
        report.report_type = 'medical'
        report.save()
        report.refresh_from_db()
        self.assertEqual(report.department, 'medical')

    def test_field_validation(self):
        self.client.force_authenticate(self.citizen)
        cases = [
            {'title': 'ab'},
            {'title': 'x' * 201},
            {'description': 'short'},
            {'latitude': 91},
            {'longitude': -181},
            {'latitude': 'nan'},
            {'report_type': 'sos'},
        ]
        for override in cases:
            response = self.client.post('/api/reports/', self.payload(**override), format='multipart')
            self.assertEqual(response.status_code, 400, override)
        self.assertEqual(Report.objects.count(), 0)

    def test_long_location_is_truncated(self):
        self.client.force_authenticate(self.citizen)
        response = self.client.post('/api/reports/', self.payload(location='a' * 500), format='multipart')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(Report.objects.get().location), 200)


class MediaValidationTests(ReportTestBase):
    def post_with(self, files):
        self.client.force_authenticate(self.citizen)
        data = self.payload()
        data['media'] = files
        return self.client.post('/api/reports/', data, format='multipart')

    def test_valid_image_and_video_accepted(self):
        response = self.post_with([
            SimpleUploadedFile('photo.png', PNG_BYTES, content_type='image/png'),
            SimpleUploadedFile('clip.mp4', MP4_BYTES, content_type='video/mp4'),
        ])
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(len(response.data['media']), 2)
        # stored under a random name, not the client's filename
        self.assertNotIn('photo', response.data['media'][0]['file'])

    def test_disallowed_extension_rejected(self):
        response = self.post_with([SimpleUploadedFile('evil.html', b'<script>', content_type='text/html')])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Report.objects.count(), 0)

    def test_spoofed_content_rejected(self):
        response = self.post_with([SimpleUploadedFile('fake.png', b'<?php echo 1; ?>' * 4, content_type='image/png')])
        self.assertEqual(response.status_code, 400)

    def test_too_many_files_rejected(self):
        files = [SimpleUploadedFile(f'p{i}.png', PNG_BYTES, content_type='image/png') for i in range(6)]
        self.assertEqual(self.post_with(files).status_code, 400)

    @override_settings(MAX_REPORT_MEDIA_BYTES=32)
    def test_oversized_file_rejected(self):
        response = self.post_with([SimpleUploadedFile('big.png', PNG_BYTES, content_type='image/png')])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Report.objects.count(), 0)


class PrivacyTests(ReportTestBase):
    def get_as(self, user, report):
        self.client.force_authenticate(user)
        response = self.client.get(f'/api/reports/{report.id}/')
        self.assertEqual(response.status_code, 200)
        return response.data

    def test_other_citizen_sees_masked_identity_and_coordinates(self):
        data = self.get_as(self.other_citizen, self.make_report())
        self.assertEqual(data['reported_by_name'], 'Community member')
        self.assertEqual(data['latitude'], round(EXACT_LAT, 3))
        self.assertEqual(data['longitude'], round(EXACT_LNG, 3))
        self.assertNotIn('12 MG Road', data['location'])
        self.assertFalse(data['is_mine'])

    def test_reporter_sees_everything(self):
        data = self.get_as(self.citizen, self.make_report())
        self.assertEqual(data['reported_by_name'], 'Alice Citizen')
        self.assertEqual(data['latitude'], EXACT_LAT)
        self.assertTrue(data['is_mine'])

    def test_department_responder_sees_identity_other_department_does_not(self):
        report = self.make_report(report_type='harassment')  # police
        police_view = self.get_as(self.police, report)
        self.assertEqual(police_view['reported_by_name'], 'Alice Citizen')
        self.assertEqual(police_view['longitude'], EXACT_LNG)
        municipal_view = self.get_as(self.municipal, report)
        self.assertEqual(municipal_view['reported_by_name'], 'Community member')
        self.assertEqual(municipal_view['longitude'], round(EXACT_LNG, 3))

    def test_anonymous_hidden_from_everyone_but_superadmin(self):
        report = self.make_report(anonymous=True)
        for user in (self.other_citizen, self.police, self.citizen):
            self.assertEqual(self.get_as(user, report)['reported_by_name'], 'Anonymous', user.role)
        self.assertEqual(self.get_as(self.superadmin, report)['reported_by_name'], 'Alice Citizen')
        # anonymity hides identity, not ownership
        self.assertTrue(self.get_as(self.citizen, report)['is_mine'])
        self.assertEqual(self.get_as(self.police, report)['latitude'], EXACT_LAT)

    def test_legacy_report_without_reporter(self):
        report = Report.objects.create(title='Old one', description='Legacy description text',
                                       report_type='crime', latitude=1.0, longitude=1.0)
        data = self.get_as(self.superadmin, report)
        self.assertEqual(data['reported_by_name'], 'Anonymous')

    def test_list_and_nearby_are_masked(self):
        self.make_report()
        self.client.force_authenticate(self.other_citizen)
        listed = self.client.get('/api/reports/list/').data['reports'][0]
        self.assertEqual(listed['latitude'], round(EXACT_LAT, 3))
        self.assertEqual(listed['reported_by_name'], 'Community member')
        nearby = self.client.get(
            f'/api/reports/nearby-reports/?latitude={EXACT_LAT}&longitude={EXACT_LNG}&radius=1000').data
        self.assertEqual(nearby['count'], 1)
        self.assertEqual(nearby['reports'][0]['latitude'], round(EXACT_LAT, 3))
        self.assertIn('distance', nearby['reports'][0])


class ListTests(ReportTestBase):
    def test_pagination_shape_and_limits(self):
        for _ in range(25):
            self.make_report()
        self.client.force_authenticate(self.other_citizen)
        data = self.client.get('/api/reports/list/').data
        self.assertEqual((data['count'], len(data['reports']), data['limit'], data['offset']), (25, 20, 20, 0))
        data = self.client.get('/api/reports/list/?limit=10&offset=20').data
        self.assertEqual(len(data['reports']), 5)
        data = self.client.get('/api/reports/list/?limit=5000').data
        self.assertEqual(data['limit'], 100)

    def test_mine_filter(self):
        self.make_report(reporter=self.citizen)
        self.make_report(reporter=self.other_citizen)
        self.make_report(reporter=self.citizen, anonymous=True)
        self.client.force_authenticate(self.citizen)
        data = self.client.get('/api/reports/list/?mine=true').data
        self.assertEqual(data['count'], 2)
        self.assertTrue(all(r['is_mine'] for r in data['reports']))

    def test_type_status_filters(self):
        self.make_report(report_type='crime')
        self.make_report(report_type='infrastructure', status='resolved')
        self.client.force_authenticate(self.citizen)
        self.assertEqual(self.client.get('/api/reports/list/?type=crime').data['count'], 1)
        self.assertEqual(self.client.get('/api/reports/list/?status=resolved').data['count'], 1)

    def test_responders_default_to_their_department(self):
        self.make_report(report_type='crime')
        self.make_report(report_type='infrastructure')
        self.make_report(report_type='fire_hazard')
        self.client.force_authenticate(self.municipal)
        data = self.client.get('/api/reports/list/').data
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['reports'][0]['department'], 'municipal')
        self.client.force_authenticate(self.superadmin)
        self.assertEqual(self.client.get('/api/reports/list/').data['count'], 3)
        self.assertEqual(self.client.get('/api/reports/list/?department=fire').data['count'], 1)
        self.assertEqual(self.client.get('/api/reports/list/?department=bogus').status_code, 400)


class NearbyTests(ReportTestBase):
    def test_requires_coordinates(self):
        self.client.force_authenticate(self.citizen)
        self.assertEqual(self.client.get('/api/reports/nearby-reports/').status_code, 400)
        self.assertEqual(self.client.get('/api/reports/nearby-reports/?latitude=100&longitude=0').status_code, 400)

    def test_radius_is_clamped(self):
        self.client.force_authenticate(self.citizen)
        data = self.client.get(
            f'/api/reports/nearby-reports/?latitude={EXACT_LAT}&longitude={EXACT_LNG}&radius=99999999').data
        self.assertEqual(data['search_radius'], 50000)


class ReverseGeocodeTests(ReportTestBase):
    @mock.patch('reports.views.requests.get')
    def test_cached_and_trimmed(self, mock_get):
        mock_get.return_value.json.return_value = {
            'display_name': 'Somewhere, India', 'address': {'city': 'Ahmedabad'}, 'osm_id': 1, 'licence': 'x'}
        mock_get.return_value.raise_for_status.return_value = None
        self.client.force_authenticate(self.citizen)
        url = '/api/reports/reverse-geocode/?lat=23.02251&lon=72.57139'
        first = self.client.get(url)
        second = self.client.get('/api/reports/reverse-geocode/?lat=23.02249&lon=72.57141')
        self.assertEqual(first.data, {'display_name': 'Somewhere, India', 'address': {'city': 'Ahmedabad'}})
        self.assertEqual(second.data, first.data)
        self.assertEqual(mock_get.call_count, 1)
        kwargs = mock_get.call_args.kwargs
        self.assertIn('timeout', kwargs)
        self.assertIn('User-Agent', kwargs['headers'])

    @mock.patch('reports.views.requests.get', side_effect=requests.Timeout)
    def test_upstream_failure_is_502(self, _):
        self.client.force_authenticate(self.citizen)
        response = self.client.get('/api/reports/reverse-geocode/?lat=1&lon=1')
        self.assertEqual(response.status_code, 502)
        self.assertNotIn('Timeout', str(response.data))

    def test_invalid_coordinates(self):
        self.client.force_authenticate(self.citizen)
        self.assertEqual(self.client.get('/api/reports/reverse-geocode/?lat=abc&lon=1').status_code, 400)
