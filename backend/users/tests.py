from unittest import mock

from django.test import override_settings
from rest_framework.test import APITestCase

from safety.models import PoliceStation

from . import roles
from .models import Notification, User, VolunteerApplication

PASSWORD = 'Str0ng-Passw0rd!'


def make_user(email, role, **extra):
    return User.objects.create_user(email=email, password=PASSWORD, role=role, **extra)


class RegistrationAndLoginTests(APITestCase):
    def test_register_ignores_role_and_creates_citizen(self):
        res = self.client.post('/api/users/register/', {
            'email': 'Evil@Example.com', 'password': PASSWORD, 'role': 'superadmin'}, format='json')
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='evil@example.com')
        self.assertEqual(user.role, roles.CITIZEN)
        self.assertFalse(user.is_staff)
        self.assertEqual(res.data['user']['role'], roles.CITIZEN)
        self.assertIn('refresh', res.data)

    def test_register_rejects_weak_password(self):
        res = self.client.post('/api/users/register/', {'email': 'a@b.com', 'password': '123'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_login_unknown_email_is_400_not_500(self):
        res = self.client.post('/api/users/login/', {'email': 'nobody@x.com', 'password': 'x'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['error'], 'Invalid email or password')

    def test_login_success_and_inactive_rejected(self):
        user = make_user('c@x.com', roles.CITIZEN)
        res = self.client.post('/api/users/login/', {'email': 'C@x.com', 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 200)
        user.is_active = False
        user.save()
        res = self.client.post('/api/users/login/', {'email': 'c@x.com', 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_register_police_endpoint_is_gone(self):
        res = self.client.post('/api/users/register-police/', {'email': 'p@x.com', 'password': PASSWORD})
        self.assertEqual(res.status_code, 404)

    def test_generic_token_obtain_endpoint_removed(self):
        self.assertEqual(self.client.post('/api/token/', {}).status_code, 404)


class GoogleAuthTests(APITestCase):
    def test_plain_email_payload_is_rejected(self):
        make_user('victim@x.com', 'police')
        res = self.client.post('/api/users/google-login/', {'email': 'victim@x.com', 'name': 'x'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertNotIn('token', res.data)

    @override_settings(GOOGLE_CLIENT_ID='client-id')
    def test_invalid_credential_rejected(self):
        res = self.client.post('/api/users/google/', {'credential': 'not-a-jwt'}, format='json')
        self.assertEqual(res.status_code, 400)

    @override_settings(GOOGLE_CLIENT_ID='client-id')
    def test_verified_credential_creates_citizen(self):
        claims = {'iss': 'accounts.google.com', 'email': 'G@x.com', 'email_verified': True, 'name': 'G'}
        with mock.patch('google.oauth2.id_token.verify_oauth2_token', return_value=claims):
            res = self.client.post('/api/users/google/', {'credential': 'tok'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(User.objects.get(email='g@x.com').role, roles.CITIZEN)

    @override_settings(GOOGLE_CLIENT_ID='client-id')
    def test_unverified_email_rejected(self):
        claims = {'iss': 'accounts.google.com', 'email': 'g@x.com', 'email_verified': False}
        with mock.patch('google.oauth2.id_token.verify_oauth2_token', return_value=claims):
            res = self.client.post('/api/users/google/', {'credential': 'tok'}, format='json')
        self.assertEqual(res.status_code, 400)


class SuperuserTests(APITestCase):
    def test_createsuperuser_gets_superadmin_role(self):
        user = User.objects.create_superuser(email='root@x.com', username='root@x.com', password=PASSWORD)
        self.assertEqual(user.role, roles.SUPERADMIN)
        self.assertTrue(user.is_staff and user.is_superuser)

    def test_createsuperuser_command_needs_only_email(self):
        from django.core.management import call_command
        with mock.patch.dict('os.environ', {'DJANGO_SUPERUSER_PASSWORD': PASSWORD}):
            call_command('createsuperuser', '--noinput', '--email', 'Boss@X.com', verbosity=0)
        user = User.objects.get(email='boss@x.com')
        self.assertEqual(user.role, roles.SUPERADMIN)
        self.assertTrue(user.check_password(PASSWORD))

    def test_staff_flag_tracks_role(self):
        user = make_user('p@x.com', 'police_admin')
        self.assertFalse(user.is_staff)


class StaffManagementTests(APITestCase):
    def setUp(self):
        self.station_a = PoliceStation.objects.create(name='A', latitude=1, longitude=1)
        self.station_b = PoliceStation.objects.create(name='B', latitude=2, longitude=2)
        self.superadmin = make_user('root@x.com', roles.SUPERADMIN)
        self.police_admin = make_user('pa@x.com', 'police_admin', police_station=self.station_a)
        self.fire_admin = make_user('fa@x.com', 'fire_admin')
        self.officer = make_user('po@x.com', 'police', police_station=self.station_a)
        self.citizen = make_user('c@x.com', roles.CITIZEN)

    def create(self, actor, **payload):
        self.client.force_authenticate(actor)
        body = {'email': 'new@x.com', 'password': PASSWORD, 'name': 'New'}
        body.update(payload)
        return self.client.post('/api/users/staff/', body, format='json')

    def test_only_superadmin_creates_department_admins(self):
        for actor in (self.police_admin, self.fire_admin, self.officer, self.citizen):
            res = self.create(actor, role='municipal_admin')
            self.assertIn(res.status_code, (400, 403), actor.role)
        res = self.create(self.superadmin, role='municipal_admin')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(User.objects.get(email='new@x.com').created_by, self.superadmin)

    def test_department_admin_creates_only_own_staff(self):
        self.assertEqual(self.create(self.fire_admin, role='police').status_code, 400)
        self.assertEqual(self.create(self.fire_admin, role='firefighter').status_code, 201)

    def test_police_admin_officer_inherits_station(self):
        res = self.create(self.police_admin, role='police')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(User.objects.get(email='new@x.com').police_station, self.station_a)

    def test_police_admin_cannot_assign_other_station(self):
        res = self.create(self.police_admin, role='police', police_station=self.station_b.id)
        self.assertEqual(res.status_code, 400)

    def test_staff_and_citizens_cannot_use_staff_api(self):
        for actor in (self.officer, self.citizen):
            self.client.force_authenticate(actor)
            self.assertEqual(self.client.get('/api/users/staff/').status_code, 403)

    def test_cannot_create_citizen_or_volunteer_via_staff_api(self):
        self.assertEqual(self.create(self.superadmin, role='citizen').status_code, 400)

    def test_list_is_scoped(self):
        make_user('ff@x.com', 'firefighter')
        self.client.force_authenticate(self.fire_admin)
        emails = {u['email'] for u in self.client.get('/api/users/staff/').data['results']}
        self.assertEqual(emails, {'ff@x.com'})
        self.client.force_authenticate(self.superadmin)
        self.assertEqual(self.client.get('/api/users/staff/').data['total_count'], User.objects.count() - 1)

    def test_admin_can_deactivate_own_staff_only(self):
        self.client.force_authenticate(self.fire_admin)
        res = self.client.patch(f'/api/users/staff/{self.officer.id}/', {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 403)
        self.client.force_authenticate(self.police_admin)
        res = self.client.patch(f'/api/users/staff/{self.officer.id}/', {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 200)
        self.officer.refresh_from_db()
        self.assertFalse(self.officer.is_active)

    def test_admin_cannot_promote_staff_to_admin(self):
        self.client.force_authenticate(self.police_admin)
        res = self.client.patch(f'/api/users/staff/{self.officer.id}/', {'role': 'police_admin'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_only_superadmin_deletes(self):
        self.client.force_authenticate(self.police_admin)
        self.assertEqual(self.client.delete(f'/api/users/staff/{self.officer.id}/').status_code, 403)
        self.client.force_authenticate(self.superadmin)
        self.assertEqual(self.client.delete(f'/api/users/staff/{self.officer.id}/').status_code, 204)


class ProfileAndPrivacyTests(APITestCase):
    def setUp(self):
        self.a = make_user('a@x.com', roles.CITIZEN)
        self.b = make_user('b@x.com', roles.CITIZEN)

    def test_cannot_read_other_users_profile_or_contacts(self):
        self.client.force_authenticate(self.a)
        for path in (f'/api/users/profile/{self.b.id}/', f'/api/users/stats/{self.b.id}/',
                     f'/api/users/emergency-contacts/{self.b.id}/'):
            self.assertEqual(self.client.get(path).status_code, 403, path)

    def test_citizen_cannot_see_other_email(self):
        self.client.force_authenticate(self.a)
        self.assertNotIn('email', self.client.get(f'/api/users/{self.b.id}/').data)

    def test_me_cannot_change_role(self):
        self.client.force_authenticate(self.a)
        res = self.client.patch('/api/users/me/', {'role': 'superadmin', 'name': 'A'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.a.refresh_from_db()
        self.assertEqual(self.a.role, roles.CITIZEN)
        self.assertEqual(self.a.name, 'A')

    def test_notifications_are_real_and_private(self):
        Notification.objects.create(user=self.a, title='Hi')
        Notification.objects.create(user=self.b, title='Other')
        self.client.force_authenticate(self.a)
        res = self.client.get('/api/users/notifications/')
        self.assertEqual([n['title'] for n in res.data['results']], ['Hi'])
        other = Notification.objects.get(user=self.b)
        self.assertEqual(self.client.post(f'/api/users/notifications/{other.id}/read/').status_code, 404)

    def test_change_password_requires_current(self):
        self.client.force_authenticate(self.a)
        res = self.client.post(f'/api/users/change-password/{self.a.id}/', {
            'new_password': 'An0ther-Str0ng!', 'confirm_password': 'An0ther-Str0ng!'}, format='json')
        self.assertEqual(res.status_code, 400)


class VolunteerFlowTests(APITestCase):
    def setUp(self):
        self.citizen = make_user('c@x.com', roles.CITIZEN)
        self.officer = make_user('p@x.com', 'police')
        self.medic = make_user('m@x.com', 'paramedic')

    def test_apply_review_approve(self):
        self.client.force_authenticate(self.citizen)
        res = self.client.post('/api/users/volunteer/apply/', {'phone_number': '9876543210'}, format='json')
        self.assertEqual(res.status_code, 201)
        app = VolunteerApplication.objects.get(user=self.citizen)

        self.client.force_authenticate(self.medic)
        res = self.client.post(f'/api/users/volunteer/applications/{app.id}/review/', {'action': 'approve'})
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(self.officer)
        res = self.client.post(f'/api/users/volunteer/applications/{app.id}/review/', {'action': 'approve'})
        self.assertEqual(res.status_code, 200)
        self.citizen.refresh_from_db()
        self.assertEqual(self.citizen.role, roles.VOLUNTEER)
        self.assertTrue(Notification.objects.filter(user=self.citizen).exists())

        # Re-reviewing must not crash or duplicate.
        res = self.client.post(f'/api/users/volunteer/applications/{app.id}/review/', {'action': 'approve'})
        self.assertEqual(res.status_code, 400)
