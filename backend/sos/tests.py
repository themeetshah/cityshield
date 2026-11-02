import shutil
import tempfile
from datetime import timedelta
from pathlib import Path
from unittest import mock

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from users.models import Notification, User

from .models import SOSAlert, SOSLocationUpdate, SOSVideoFeed, Volunteer, VolunteerAlert

LAT, LNG = 19.0760, 72.8777
WEBM = b'\x1a\x45\xdf\xa3' + b'\x00' * 200
TMP_PRIVATE = tempfile.mkdtemp(prefix='sos-test-private-')


def make_user(email, role='citizen', **extra):
    return User.objects.create_user(email=email, password='pass12345!', role=role, **extra)


@override_settings(PRIVATE_MEDIA_ROOT=Path(TMP_PRIVATE), MAX_SOS_CHUNK_BYTES=1024)
class SOSTestBase(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP_PRIVATE, ignore_errors=True)

    def setUp(self):
        cache.clear()  # throttle counters
        self.citizen = make_user('citizen@example.com')
        self.other_citizen = make_user('other@example.com')
        self.police = make_user('police@example.com', 'police')
        self.fire = make_user('fire@example.com', 'firefighter')
        self.medic = make_user('medic@example.com', 'paramedic')
        self.superadmin = make_user('root@example.com', 'superadmin')
        self.volunteer_user = make_user('vol@example.com', 'volunteer')
        self.volunteer = Volunteer.objects.create(
            user=self.volunteer_user, phone_number='9999999999', is_verified=True, is_available=True,
            current_latitude=LAT + 0.005, current_longitude=LNG, last_location_update=timezone.now())

    def create_sos(self, user=None, **data):
        self.client.force_authenticate(user)
        payload = {'latitude': LAT, 'longitude': LNG, **data}
        res = self.client.post('/api/sos/emergency/', payload, format='json')
        self.client.force_authenticate(None)
        return res

    def as_user(self, user):
        self.client.force_authenticate(user)
        return self.client


class CreateAndOwnershipTests(SOSTestBase):
    def test_anonymous_create_returns_token_and_stores_only_hash(self):
        res = self.create_sos()
        self.assertEqual(res.status_code, 201)
        token = res.data['sos_token']
        self.assertTrue(token)
        alert = SOSAlert.objects.get(id=res.data['sos_id'])
        self.assertIsNone(alert.user)
        self.assertNotEqual(alert.token_hash, token)
        self.assertEqual(len(alert.token_hash), 64)
        self.assertEqual(alert.department, 'police')

    def test_invalid_location_and_type_rejected(self):
        self.assertEqual(self.create_sos(latitude=200).status_code, 400)
        self.assertEqual(self.create_sos(emergency_type='alien').status_code, 400)

    def test_department_from_emergency_type(self):
        res = self.create_sos(emergency_type='fire')
        self.assertEqual(res.data['department'], 'fire')

    def test_authenticated_user_cannot_open_second_sos(self):
        first = self.create_sos(self.citizen)
        second = self.create_sos(self.citizen)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.data['already_active'])
        self.assertEqual(second.data['sos_id'], first.data['sos_id'])
        self.assertEqual(SOSAlert.objects.filter(user=self.citizen).count(), 1)

    def test_token_gated_location_update(self):
        res = self.create_sos()
        sos_id, token = res.data['sos_id'], res.data['sos_token']
        url = f'/api/sos/emergency/{sos_id}/location-updates/'
        body = {'latitude': LAT + 0.001, 'longitude': LNG}
        self.assertEqual(self.client.post(url, body, format='json').status_code, 403)
        self.assertEqual(self.client.post(url, body, format='json', HTTP_X_SOS_TOKEN='wrong').status_code, 403)
        # the create call stored the first point < 3 s ago -> ignored, not stored
        ok = self.client.post(url, body, format='json', HTTP_X_SOS_TOKEN=token)
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(ok.data['ignored'])
        SOSLocationUpdate.objects.filter(sos_alert_id=sos_id).update(timestamp=timezone.now() - timedelta(seconds=10))
        ok = self.client.post(url, body, format='json', HTTP_X_SOS_TOKEN=token)
        self.assertFalse(ok.data['ignored'])
        self.assertAlmostEqual(SOSAlert.objects.get(id=sos_id).latitude, LAT + 0.001)

    def test_resolve_permissions(self):
        res = self.create_sos()
        sos_id, token = res.data['sos_id'], res.data['sos_token']
        url = f'/api/sos/resolve/{sos_id}/'
        self.assertEqual(self.client.post(url).status_code, 403)
        self.assertEqual(self.as_user(self.other_citizen).post(url).status_code, 403)
        self.assertEqual(self.as_user(self.volunteer_user).post(url).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(url, HTTP_X_SOS_TOKEN=token).status_code, 200)
        self.assertFalse(SOSAlert.objects.get(id=sos_id).is_active)

    def test_police_can_resolve_any_and_owner_is_notified(self):
        res = self.create_sos(self.citizen, emergency_type='medical')
        sos_id = res.data['sos_id']
        self.assertEqual(self.as_user(self.fire).post(f'/api/sos/resolve/{sos_id}/').status_code, 403)
        self.assertEqual(self.as_user(self.police).post(f'/api/sos/resolve/{sos_id}/').status_code, 200)
        alert = SOSAlert.objects.get(id=sos_id)
        self.assertEqual(alert.resolved_by, self.police)
        self.assertTrue(Notification.objects.filter(user=self.citizen, title__icontains='resolved').exists())

    def test_owner_detail_and_strangers_forbidden(self):
        res = self.create_sos()
        sos_id, token = res.data['sos_id'], res.data['sos_token']
        url = f'/api/sos/emergency/{sos_id}/'
        self.assertEqual(self.client.get(url).status_code, 403)
        self.assertEqual(self.as_user(self.other_citizen).get(url).status_code, 403)
        self.client.force_authenticate(None)
        owner = self.client.get(url, HTTP_X_SOS_TOKEN=token)
        self.assertEqual(owner.status_code, 200)
        self.assertTrue(owner.data['is_owner'])


class ListingAndScopingTests(SOSTestBase):
    def setUp(self):
        super().setUp()
        self.police_sos = self.create_sos(self.other_citizen).data['sos_id']
        self.medical_sos = SOSAlert.objects.create(latitude=LAT, longitude=LNG, emergency_type='medical').id

    def test_citizen_cannot_list(self):
        c = self.as_user(self.citizen)
        for url in ('/api/sos/by-role/?latitude=1&longitude=1', '/api/sos/active/', '/api/sos/all/'):
            self.assertEqual(c.get(url).status_code, 403, url)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/sos/active/').status_code, 401)

    def test_department_scoping(self):
        ids = lambda res: {a['id'] for a in res.data['alerts']}  # noqa: E731
        self.assertEqual(ids(self.as_user(self.police).get('/api/sos/by-role/')), {self.police_sos, self.medical_sos})
        self.assertEqual(ids(self.as_user(self.medic).get('/api/sos/by-role/')), {self.medical_sos})
        self.assertEqual(ids(self.as_user(self.fire).get('/api/sos/by-role/')), set())
        self.assertEqual(ids(self.as_user(self.superadmin).get('/api/sos/by-role/')),
                         {self.police_sos, self.medical_sos})
        self.assertEqual(self.as_user(self.fire).get(f'/api/sos/emergency/{self.medical_sos}/').status_code, 403)
        self.assertEqual(self.as_user(self.medic).get(f'/api/sos/emergency/{self.medical_sos}/').status_code, 200)
        trail = f'/api/sos/emergency/{self.police_sos}/location-updates/'
        self.assertEqual(self.as_user(self.medic).get(trail).status_code, 403)
        self.assertEqual(self.as_user(self.police).get(trail).status_code, 200)

    def test_volunteer_by_role_hides_identity(self):
        res = self.as_user(self.volunteer_user).get(f'/api/sos/by-role/?latitude={LAT}&longitude={LNG}')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['alerts'])
        self.assertTrue(all(a['user_name'] is None for a in res.data['alerts']))
        self.assertEqual(self.as_user(self.volunteer_user).get('/api/sos/by-role/').status_code, 400)

    def test_volunteer_trail_forbidden(self):
        url = f'/api/sos/emergency/{self.police_sos}/location-updates/'
        self.assertEqual(self.as_user(self.volunteer_user).get(url).status_code, 403)


class VolunteerTests(SOSTestBase):
    def test_nearby_volunteer_alerted_on_create(self):
        """Regression: alerting used a non-existent `distance_from_sos` kwarg."""
        far_user = make_user('far@example.com', 'volunteer')
        Volunteer.objects.create(user=far_user, phone_number='1', is_verified=True, is_available=True,
                                 current_latitude=LAT + 1, current_longitude=LNG,
                                 last_location_update=timezone.now())
        stale_user = make_user('stale@example.com', 'volunteer')
        Volunteer.objects.create(user=stale_user, phone_number='2', is_verified=True, is_available=True,
                                 current_latitude=LAT, current_longitude=LNG,
                                 last_location_update=timezone.now() - timedelta(hours=2))
        res = self.create_sos()
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['volunteers_alerted'], 1)
        va = VolunteerAlert.objects.get(sos_alert_id=res.data['sos_id'])
        self.assertEqual(va.volunteer, self.volunteer)
        self.assertGreater(va.distance, 400)
        self.assertTrue(Notification.objects.filter(user=self.volunteer_user).exists())
        self.assertTrue(Notification.objects.filter(user=self.police).exists())
        self.assertTrue(res.data['emergency_services_notified'])
        # alerted volunteer may read details
        self.assertEqual(self.as_user(self.volunteer_user).get(
            f'/api/sos/emergency/{res.data["sos_id"]}/').status_code, 200)

    def test_respond_requires_verified_volunteer_and_no_auto_create(self):
        sos_id = self.create_sos().data['sos_id']
        unverified = make_user('newvol@example.com', 'volunteer')
        res = self.as_user(unverified).post('/api/sos/respond/', {'sos_id': sos_id}, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Volunteer.objects.filter(user=unverified).exists())
        self.assertEqual(self.as_user(self.citizen).post(
            '/api/sos/respond/', {'sos_id': sos_id}, format='json').status_code, 403)
        ok = self.as_user(self.volunteer_user).post('/api/sos/respond/', {'sos_id': sos_id}, format='json')
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(VolunteerAlert.objects.get(sos_alert_id=sos_id, volunteer=self.volunteer).responded)
        again = self.as_user(self.volunteer_user).post('/api/sos/respond/', {'sos_id': sos_id}, format='json')
        self.assertEqual(again.status_code, 400)
        mine = self.as_user(self.volunteer_user).get('/api/sos/volunteer/responses/')
        self.assertEqual(mine.data['results'][0]['sos_id'], sos_id)

    def test_availability_requires_location_and_parses_bool(self):
        c = self.as_user(self.volunteer_user)
        self.assertEqual(c.post('/api/sos/volunteer-availability/', {'is_available': True}, format='json')
                         .status_code, 400)
        res = c.post('/api/sos/volunteer-availability/', {'is_available': 'false'}, format='json')
        self.assertFalse(res.data['is_available'])
        self.assertEqual(self.as_user(self.citizen).post('/api/sos/volunteer-availability/', {}, format='json')
                         .status_code, 403)
        status = self.as_user(self.citizen).get('/api/sos/volunteer/status/').data
        self.assertFalse(status['is_volunteer'])


class VideoTests(SOSTestBase):
    def setUp(self):
        super().setUp()
        res = self.create_sos()
        self.sos_id, self.token = res.data['sos_id'], res.data['sos_token']
        self.upload_url = f'/api/sos/emergency/{self.sos_id}/video/'

    def upload(self, content=WEBM, content_type='video/webm', token=None, **extra):
        f = SimpleUploadedFile('chunk.webm', content, content_type=content_type)
        return self.client.post(self.upload_url, {'video': f, **extra}, format='multipart',
                                HTTP_X_SOS_TOKEN=token or self.token)

    def test_upload_validation(self):
        self.assertEqual(self.upload(token='nope').status_code, 403)
        self.assertEqual(self.upload(content_type='text/html').status_code, 415)
        self.assertEqual(self.upload(content=b'<html>' + b'x' * 100).status_code, 415)
        self.assertEqual(self.upload(content=WEBM + b'\x00' * 2000).status_code, 413)
        self.assertEqual(self.upload(content=b'').status_code, 400)
        res = self.upload(chunk_number=1)
        self.assertEqual(res.status_code, 201)
        dup = self.upload(chunk_number=1)
        self.assertTrue(dup.data['duplicate'])
        feed = SOSVideoFeed.objects.get(id=res.data['feed_id'])
        self.assertTrue(Path(feed.video_file.path).resolve().is_relative_to(Path(TMP_PRIVATE).resolve()))

    def test_upload_requires_active_sos(self):
        SOSAlert.objects.filter(id=self.sos_id).update(is_active=False)
        self.assertEqual(self.upload().status_code, 409)

    def test_signed_url_flow(self):
        self.upload(chunk_number=1)
        self.assertEqual(self.as_user(self.citizen).get(
            f'/api/sos/emergency/{self.sos_id}/video-feeds/').status_code, 403)
        self.assertEqual(self.as_user(self.fire).get(
            f'/api/sos/emergency/{self.sos_id}/video-feeds/').status_code, 403)
        res = self.as_user(self.police).get(f'/api/sos/emergency/{self.sos_id}/video-feeds/')
        self.assertEqual(res.status_code, 200)
        feed = res.data['video_feeds'][0]
        self.client.force_authenticate(None)
        path = feed['video_url'].replace('http://testserver', '')
        ok = self.client.get(path)
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(b''.join(ok.streaming_content), WEBM)
        unsigned = f'/api/sos/videos/{feed["id"]}/stream/'
        self.assertEqual(self.client.get(unsigned).status_code, 403)
        self.assertEqual(self.client.get(unsigned + '?sig=1:abc:def').status_code, 403)
        with mock.patch('django.core.signing.time.time', return_value=timezone.now().timestamp() + 3600):
            self.assertEqual(self.client.get(path).status_code, 403)

    def test_feed_list_has_no_view_side_effect_and_explicit_mark(self):
        feed_id = self.upload(chunk_number=1).data['feed_id']
        c = self.as_user(self.police)
        c.get('/api/sos/police/video-feeds/')
        res = c.get(f'/api/sos/emergency/{self.sos_id}/video-feeds/')
        self.assertFalse(res.data['video_feeds'][0]['viewed'])
        self.assertEqual(c.post(f'/api/sos/videos/{feed_id}/viewed/').status_code, 200)
        res = c.get(f'/api/sos/emergency/{self.sos_id}/video-feeds/')
        self.assertTrue(res.data['video_feeds'][0]['viewed'])
