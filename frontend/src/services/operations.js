// Operations dashboard API (backend app: police). All functions return response data and throw on
// failure - use errorMessage(err) from ./api to show a readable message.
import api from './api';

const get = (url, params) => api.get(url, { params }).then((r) => r.data);

/** Drop empty values so the server applies its defaults. */
const clean = (params = {}) =>
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all'));

// --- department-aware -----------------------------------------------------
export const getDashboardStats = (params) => get('/police/dashboard-stats/', clean(params));
export const getSOSAlerts = (params) => get('/police/sos-alerts/', clean(params));
export const getReports = (params) => get('/police/reports/', clean(params));
export const updateReportStatus = (reportId, status, note = '') =>
    api.patch(`/police/reports/${reportId}/status/`, { status, note }).then((r) => r.data);

// --- official alerts ------------------------------------------------------
export const getOfficialAlerts = (params) => get('/police/official-alerts/', clean(params));
export const publishOfficialAlert = (payload) => api.post('/police/official-alerts/', payload).then((r) => r.data);
export const setOfficialAlertActive = (alertId, isActive) =>
    api.patch(`/police/official-alerts/${alertId}/`, { is_active: isActive }).then((r) => r.data);

// --- police: dispatch -----------------------------------------------------
export const assignTeamToSOS = (sosId, teamId) =>
    api.post(`/police/sos-alerts/${sosId}/assign-team/`, { team_id: teamId }).then((r) => r.data);
export const updateDispatchStatus = (responseId, status) =>
    api.patch(`/police/sos-responses/${responseId}/status/`, { status }).then((r) => r.data);

// --- police: patrol teams -------------------------------------------------
export const getPatrolTeams = () => get('/police/patrol-teams/');
export const createPatrolTeam = (payload) => api.post('/police/patrol-teams/', payload).then((r) => r.data);
export const updatePatrolTeam = (teamId, payload) =>
    api.patch(`/police/patrol-teams/${teamId}/`, payload).then((r) => r.data);
export const deletePatrolTeam = (teamId) => api.delete(`/police/patrol-teams/${teamId}/`);
export const addTeamMember = (teamId, userId) =>
    api.post(`/police/patrol-teams/${teamId}/assign-member/`, { user_id: userId }).then((r) => r.data);
export const removeTeamMember = (teamId, userId) =>
    api.post(`/police/patrol-teams/${teamId}/remove-member/`, { user_id: userId }).then((r) => r.data);
export const toggleTeamStatus = (teamId) =>
    api.patch(`/police/patrol-teams/${teamId}/toggle-status/`).then((r) => r.data);
export const updateTeamLocation = (teamId, latitude, longitude) =>
    api.patch(`/police/patrol-teams/${teamId}/update-location/`, { latitude, longitude }).then((r) => r.data);
export const getPoliceOfficers = () => get('/police/police-officers/');

// --- police: volunteers ---------------------------------------------------
export const getVolunteers = (params) => get('/police/volunteers/', clean(params));
export const getVolunteerApplications = (status = 'pending') =>
    get('/users/volunteer/applications/', { status });
export const reviewVolunteerApplication = (applicationId, action, notes = '') =>
    api.post(`/users/volunteer/applications/${applicationId}/review/`, { action, notes }).then((r) => r.data);
