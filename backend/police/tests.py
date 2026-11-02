from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from reports.models import Report
from safety.models import PoliceStation
from sos.models import SOSAlert
from users.models import Notification, User

from .models import OfficialAlert, PatrolTeam, ReportStatusChange, SOSResponse

API = '/api/police'


def make_user(email, role, station=None):
    return User.objects.create_user(email=email, password='pass12345!', role=role, police_station=station)


class OperationsTestBase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.station_a = PoliceStation.objects.create(name='Station A', latitude=19.0, longitude=72.8)
        cls.station_b = PoliceStation.objects.create(name='Station B', latitude=19.1, longitude=72.9)

        cls.citizen = make_user('citizen@x.com', 'citizen')
        cls.superadmin = make_user('super@x.com', 'superadmin')
        cls.police_admin_a = make_user('padmin.a@x.com', 'police_admin', cls.station_a)
        cls.police_admin_b = make_user('padmin.b@x.com', 'police_admin', cls.station_b)
        cls.officer_a = make_user('officer.a@x.com', 'police', cls.station_a)
        cls.officer_a2 = make_user('officer.a2@x.com', 'police', cls.station_a)
        cls.officer_b = make_user('officer.b@x.com', 'police', cls.station_b)
        cls.municipal = make_user('muni@x.com', 'municipal_officer')
        cls.municipal_admin = make_user('muni.admin@x.com', 'municipal_admin')
        cls.firefighter = make_user('fire@x.com', 'firefighter')

        cls.team_a = PatrolTeam.objects.create(team_id='A-1', station=cls.station_a, team_leader=cls.officer_a)
        cls.team_b = PatrolTeam.objects.create(team_id='B-1', station=cls.station_b, team_leader=cls.officer_b)

        cls.sos_general = SOSAlert.objects.create(latitude=19.0, longitude=72.8, emergency_type='general_emergency')
        cls.sos_fire = SOSAlert.objects.create(latitude=19.0, longitude=72.8, emergency_type='fire')

        cls.crime = Report.objects.create(title='Theft', description='d', report_type='crime',
                                          latitude=19.0, longitude=72.8, reported_by=cls.citizen)
        cls.pothole = Report.objects.create(title='Pothole', description='d', report_type='infrastructure',
                                            latitude=19.0, longitude=72.8, reported_by=cls.citizen)

    def as_user(self, user):
        self.client.force_authenticate(user)


class DepartmentScopingTests(OperationsTestBase):
    def test_department_fields_routed(self):
        self.assertEqual(self.sos_fire.department, 'fire')
        self.assertEqual(self.pothole.department, 'municipal')

    def test_citizen_forbidden_everywhere(self):
        self.as_user(self.citizen)
        for url in ('dashboard-stats/', 'sos-alerts/', 'reports/', 'all-reports/', 'patrol-teams/',
                    'volunteers/', 'police-officers/'):
            self.assertEqual(self.client.get(f'{API}/{url}').status_code, 403, url)
        resp = self.client.patch(f'{API}/reports/{self.crime.id}/status/', {'status': 'resolved'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_anonymous_unauthorized(self):
        self.assertEqual(self.client.get(f'{API}/sos-alerts/').status_code, 401)

    def test_municipal_sees_only_municipal_reports(self):
        self.as_user(self.municipal)
        ids = [r['id'] for r in self.client.get(f'{API}/reports/').data['results']]
        self.assertEqual(ids, [self.pothole.id])

    def test_police_sees_all_sos(self):
        self.as_user(self.officer_a)
        ids = {s['id'] for s in self.client.get(f'{API}/sos-alerts/').data['results']}
        self.assertEqual(ids, {self.sos_general.id, self.sos_fire.id})

    def test_fire_sees_only_fire_sos(self):
        self.as_user(self.firefighter)
        ids = [s['id'] for s in self.client.get(f'{API}/sos-alerts/').data['results']]
        self.assertEqual(ids, [self.sos_fire.id])

    def test_non_superadmin_cannot_widen_scope(self):
        self.as_user(self.municipal)
        ids = [r['id'] for r in self.client.get(f'{API}/reports/?department=police').data['results']]
        self.assertEqual(ids, [self.pothole.id])

    def test_superadmin_sees_all_and_filters(self):
        self.as_user(self.superadmin)
        self.assertEqual(self.client.get(f'{API}/reports/').data['count'], 2)
        ids = [r['id'] for r in self.client.get(f'{API}/reports/?department=police').data['results']]
        self.assertEqual(ids, [self.crime.id])
        ids = [s['id'] for s in self.client.get(f'{API}/sos-alerts/?department=fire').data['results']]
        self.assertEqual(ids, [self.sos_fire.id])
        self.assertEqual(self.client.get(f'{API}/reports/?department=nope').status_code, 400)

    def test_non_police_departments_cannot_use_police_features(self):
        self.as_user(self.municipal_admin)
        self.assertEqual(self.client.get(f'{API}/patrol-teams/').status_code, 403)
        self.assertEqual(self.client.get(f'{API}/volunteers/').status_code, 403)
        resp = self.client.post(f'{API}/sos-alerts/{self.sos_fire.id}/assign-team/', {'team_id': self.team_a.id})
        self.assertEqual(resp.status_code, 403)

    def test_location_filter_in_metres(self):
        far = SOSAlert.objects.create(latitude=20.0, longitude=73.5)
        self.as_user(self.officer_a)
        data = self.client.get(f'{API}/sos-alerts/?latitude=19.0&longitude=72.8&radius=1000').data
        ids = {s['id'] for s in data['results']}
        self.assertNotIn(far.id, ids)
        self.assertIn(self.sos_general.id, ids)
        self.assertEqual(data['radius_m'], 1000)


class ReportStatusTests(OperationsTestBase):
    def test_department_staff_update_notifies_reporter(self):
        self.as_user(self.municipal)
        resp = self.client.patch(f'{API}/reports/{self.pothole.id}/status/',
                                 {'status': 'investigating', 'note': 'Crew assigned'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.pothole.refresh_from_db()
        self.assertEqual(self.pothole.status, 'investigating')
        self.assertEqual(resp.data['report']['latest_update']['note'], 'Crew assigned')
        note = Notification.objects.get(user=self.citizen)
        self.assertEqual(note.link, f'/reports/{self.pothole.id}')
        self.assertEqual(note.message, 'Crew assigned')
        self.assertTrue(ReportStatusChange.objects.filter(report=self.pothole, new_status='investigating').exists())

    def test_other_department_forbidden(self):
        self.as_user(self.municipal)
        resp = self.client.patch(f'{API}/reports/{self.crime.id}/status/', {'status': 'resolved'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_invalid_status_rejected(self):
        self.as_user(self.officer_a)
        resp = self.client.patch(f'{API}/reports/{self.crime.id}/status/', {'status': 'bogus'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_superadmin_can_update_any(self):
        self.as_user(self.superadmin)
        resp = self.client.patch(f'{API}/reports/{self.crime.id}/status/', {'status': 'resolved'}, format='json')
        self.assertEqual(resp.status_code, 200)


class StatsTests(OperationsTestBase):
    def test_stats_null_without_responses(self):
        self.as_user(self.municipal)
        data = self.client.get(f'{API}/dashboard-stats/').data
        self.assertEqual(data['sos_in_period'], 0)  # no municipal SOS
        self.assertIsNone(data['response_rate'])
        self.assertIsNone(data['avg_response_minutes'])
        self.assertIsNone(data['active_patrol_teams'])
        self.assertEqual(data['open_reports'], 1)

    def test_stats_are_computed_from_records(self):
        SOSAlert.objects.filter(pk=self.sos_general.pk).update(created_at=timezone.now() - timedelta(minutes=10))
        self.as_user(self.officer_a)
        resp = self.client.post(f'{API}/sos-alerts/{self.sos_general.id}/assign-team/',
                                {'team_id': self.team_a.id}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        data = self.client.get(f'{API}/dashboard-stats/').data
        self.assertEqual(data['sos_in_period'], 2)
        self.assertEqual(data['sos_responded_in_period'], 1)
        self.assertEqual(data['response_rate'], 50.0)
        self.assertAlmostEqual(data['avg_response_minutes'], 10.0, delta=0.5)
        self.assertEqual(data['active_patrol_teams'], 1)  # station A only


class PatrolTeamTests(OperationsTestBase):
    def test_officer_can_view_but_not_create(self):
        self.as_user(self.officer_a)
        data = self.client.get(f'{API}/patrol-teams/').data
        self.assertEqual([t['team_id'] for t in data['results']], ['A-1'])
        self.assertFalse(data['can_manage'])
        resp = self.client.post(f'{API}/patrol-teams/', {'team_id': 'A-2', 'team_leader': self.officer_a2.id})
        self.assertEqual(resp.status_code, 403)

    def test_admin_creates_team_on_own_station_with_form_data(self):
        self.as_user(self.police_admin_a)
        # multipart (QueryDict) payload used to crash the old view
        resp = self.client.post(f'{API}/patrol-teams/', {'team_id': 'A-2', 'team_leader': self.officer_a2.id,
                                                         'station': self.station_b.id})
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(PatrolTeam.objects.get(team_id='A-2').station, self.station_a)

    def test_leader_must_be_from_station(self):
        self.as_user(self.police_admin_a)
        resp = self.client.post(f'{API}/patrol-teams/', {'team_id': 'A-3', 'team_leader': self.officer_b.id})
        self.assertEqual(resp.status_code, 400)

    def test_stationless_admin_without_station_gets_400(self):
        self.as_user(self.superadmin)
        resp = self.client.post(f'{API}/patrol-teams/', {'team_id': 'X-1', 'team_leader': self.officer_a2.id},
                                format='json')
        self.assertEqual(resp.status_code, 400)

    def test_admin_of_station_a_cannot_touch_station_b(self):
        self.as_user(self.police_admin_a)
        self.assertEqual(self.client.get(f'{API}/patrol-teams/{self.team_b.id}/').status_code, 403)
        self.assertEqual(self.client.patch(f'{API}/patrol-teams/{self.team_b.id}/', {'vehicle_number': 'X'},
                                           format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'{API}/patrol-teams/{self.team_b.id}/').status_code, 403)
        self.assertEqual(self.client.post(f'{API}/patrol-teams/{self.team_b.id}/assign-member/',
                                          {'user_id': self.officer_a2.id}).status_code, 403)
        self.assertEqual(self.client.patch(f'{API}/patrol-teams/{self.team_b.id}/toggle-status/').status_code, 403)

    def test_officer_cannot_mutate_team(self):
        self.as_user(self.officer_a)
        self.assertEqual(self.client.post(f'{API}/patrol-teams/{self.team_a.id}/assign-member/',
                                          {'user_id': self.officer_a2.id}).status_code, 403)
        self.assertEqual(self.client.delete(f'{API}/patrol-teams/{self.team_a.id}/').status_code, 403)

    def test_member_management(self):
        self.as_user(self.police_admin_a)
        resp = self.client.post(f'{API}/patrol-teams/{self.team_a.id}/assign-member/', {'user_id': self.officer_a2.id})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['member_count'], 2)
        resp = self.client.post(f'{API}/patrol-teams/{self.team_a.id}/assign-member/', {'user_id': self.officer_b.id})
        self.assertEqual(resp.status_code, 400)
        resp = self.client.post(f'{API}/patrol-teams/{self.team_a.id}/remove-member/', {'user_id': self.officer_a2.id})
        self.assertEqual(resp.status_code, 200)

    def test_location_update_by_leader_only(self):
        self.as_user(self.officer_a2)
        url = f'{API}/patrol-teams/{self.team_a.id}/update-location/'
        self.assertEqual(self.client.patch(url, {'latitude': 19, 'longitude': 72}, format='json').status_code, 403)
        self.as_user(self.officer_a)
        self.assertEqual(self.client.patch(url, {'latitude': 19, 'longitude': 72}, format='json').status_code, 200)
        self.assertEqual(self.client.patch(url, {'latitude': 99, 'longitude': 72}, format='json').status_code, 400)

    def test_officers_list_station_scoped(self):
        self.as_user(self.police_admin_a)
        emails = {o['email'] for o in self.client.get(f'{API}/police-officers/').data['officers']}
        self.assertEqual(emails, {'padmin.a@x.com', 'officer.a@x.com', 'officer.a2@x.com'})

    def test_superadmin_can_do_all(self):
        self.as_user(self.superadmin)
        self.assertEqual(len(self.client.get(f'{API}/patrol-teams/').data['results']), 2)
        resp = self.client.post(f'{API}/patrol-teams/', {'team_id': 'B-2', 'team_leader': self.officer_b.id,
                                                         'station': self.station_b.id}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(self.client.patch(f'{API}/patrol-teams/{self.team_b.id}/toggle-status/').status_code, 200)
        self.assertEqual(self.client.delete(f'{API}/patrol-teams/{self.team_a.id}/').status_code, 204)


class DispatchTests(OperationsTestBase):
    def assign(self, sos, team):
        return self.client.post(f'{API}/sos-alerts/{sos.id}/assign-team/', {'team_id': team.id}, format='json')

    def test_assign_notifies_and_records_response_time(self):
        self.team_a.members.add(self.officer_a2)
        self.as_user(self.police_admin_a)
        with self.captureOnCommitCallbacks(execute=True):
            resp = self.assign(self.sos_general, self.team_a)
        self.assertEqual(resp.status_code, 200, resp.data)
        response = SOSResponse.objects.get(sos_alert=self.sos_general)
        self.assertIsNotNone(response.response_time)
        self.assertEqual(Notification.objects.filter(user__in=[self.officer_a, self.officer_a2]).count(), 2)

    def test_cannot_assign_other_station_or_inactive_or_busy_team(self):
        self.as_user(self.police_admin_a)
        self.assertEqual(self.assign(self.sos_general, self.team_b).status_code, 403)
        self.assertEqual(self.assign(self.sos_general, self.team_a).status_code, 200)
        self.assertEqual(self.assign(self.sos_fire, self.team_a).status_code, 400)  # busy
        PatrolTeam.objects.filter(pk=self.team_a.pk).update(is_active=False)
        SOSResponse.objects.all().delete()
        self.assertEqual(self.assign(self.sos_fire, self.team_a).status_code, 400)  # off duty

    def test_status_transitions(self):
        self.as_user(self.officer_a)
        rid = self.assign(self.sos_general, self.team_a).data['response']['id']
        url = f'{API}/sos-responses/{rid}/status/'
        resp = self.client.patch(url, {'status': 'dispatched'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(resp.data['response']['dispatched_at'])
        self.assertEqual(self.client.patch(url, {'status': 'assigned'}, format='json').status_code, 400)
        resp = self.client.patch(url, {'status': 'resolved'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(resp.data['response']['arrived_at'])
        self.assertIsNotNone(resp.data['response']['resolved_at'])
        self.as_user(self.officer_b)
        self.assertEqual(self.client.patch(url, {'status': 'resolved'}, format='json').status_code, 403)


class OfficialAlertTests(OperationsTestBase):
    def test_citizen_can_list_active_but_not_publish(self):
        OfficialAlert.objects.create(title='Old', message='m', is_active=False)
        OfficialAlert.objects.create(title='Live', message='m', department='fire')
        self.as_user(self.citizen)
        data = self.client.get(f'{API}/official-alerts/?active=true').data
        self.assertEqual([a['title'] for a in data['results']], ['Live'])
        self.assertEqual(set(data['results'][0]), {
            'id', 'title', 'message', 'alert_type', 'alert_type_display', 'department', 'department_label',
            'station_name', 'issued_by_name', 'created_at', 'is_active'})
        resp = self.client.post(f'{API}/official-alerts/', {'title': 't', 'message': 'm'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_staff_publish_in_own_department(self):
        self.as_user(self.officer_a)
        resp = self.client.post(f'{API}/official-alerts/', {'title': 'Road closed', 'message': 'm',
                                                            'alert_type': 'traffic', 'department': 'fire'},
                                format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data['alert']['department'], 'police')
        self.assertEqual(resp.data['alert']['station_name'], 'Station A')

    def test_superadmin_must_pass_department(self):
        self.as_user(self.superadmin)
        self.assertEqual(self.client.post(f'{API}/official-alerts/', {'title': 't', 'message': 'm'},
                                          format='json').status_code, 400)
        resp = self.client.post(f'{API}/official-alerts/', {'title': 't', 'message': 'm', 'department': 'medical'},
                                format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertIsNone(resp.data['alert']['station_name'])

    def test_deactivate_permissions(self):
        alert = OfficialAlert.objects.create(title='A', message='m', department='municipal')
        url = f'{API}/official-alerts/{alert.id}/'
        self.as_user(self.municipal)
        self.assertEqual(self.client.patch(url, {'is_active': False}, format='json').status_code, 403)
        self.as_user(self.police_admin_a)
        self.assertEqual(self.client.patch(url, {'is_active': False}, format='json').status_code, 403)
        self.as_user(self.municipal_admin)
        self.assertEqual(self.client.patch(url, {'is_active': False}, format='json').status_code, 200)
        alert.refresh_from_db()
        self.assertFalse(alert.is_active)
        self.assertIsNotNone(alert.deactivated_at)
