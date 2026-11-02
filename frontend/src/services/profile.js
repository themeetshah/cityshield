import api from './api';

// Thin wrappers around the users API (backend/users/urls.py).
// Errors are thrown as axios errors - format them with `errorMessage()` from ./api.

const data = (promise) => promise.then((res) => res.data);

export const profileAPI = {
    /** Own profile: {id, name, email, phone, location, date_of_birth, gender, blood_group, role, ..., password_set} */
    getProfile: () => data(api.get('/users/me/')),

    /** PATCH own profile. Only name/phone/location/date_of_birth/gender/blood_group are writable. */
    updateProfile: (fields) => data(api.patch('/users/me/', fields)),

    /** {reports_submitted, reports_resolved, reports_in_progress, reports_dismissed, sos_alerts_raised,
     *  is_volunteer, sos_responses, join_date, report_types} */
    getStats: (userId) => data(api.get(`/users/stats/${userId}/`)),

    /** [{id, type, action, status, created_at, link?, report_type?}] newest first */
    getActivities: (userId) => data(api.get(`/users/activities/${userId}/`)),

    /** {results: [{id, title, message, link, is_read, created_at}], unread_count} */
    getNotifications: ({ unreadOnly = false } = {}) =>
        data(api.get('/users/notifications/', { params: unreadOnly ? { unread: 'true' } : undefined })),

    markNotificationRead: (notificationId) => data(api.post(`/users/notifications/${notificationId}/read/`)),

    markAllNotificationsRead: () => data(api.post('/users/notifications/read-all/')),

    /** [{id, name, phone, relationship}] */
    getEmergencyContacts: (userId) => data(api.get(`/users/emergency-contacts/${userId}/`)),

    addEmergencyContact: (userId, contact) => data(api.post(`/users/emergency-contacts/${userId}/`, contact)),

    /** Resolves to undefined (204). */
    deleteEmergencyContact: async (userId, contactId) => {
        await api.delete(`/users/emergency-contacts/${userId}/${contactId}/`);
    },

    /** {current_password?, new_password, confirm_password} - omit current_password when user.password_set is false. */
    changePassword: (userId, payload) => data(api.post(`/users/change-password/${userId}/`, payload)),

    /** Citizens only. {phone_number} -> {message, application} */
    applyForVolunteer: (phoneNumber) => data(api.post('/users/volunteer/apply/', { phone_number: phoneNumber })),

    /** {status: null|'pending'|'approved'|'rejected', is_volunteer, applied_at?, reviewed_at?, notes?} */
    getVolunteerApplicationStatus: () => data(api.get('/users/volunteer/application-status/')),

    /** Police department / superadmin only. {applications, total_count} */
    listVolunteerApplications: (statusFilter = 'all') =>
        data(api.get('/users/volunteer/applications/', { params: { status: statusFilter } })),

    /** Police department / superadmin only. action: 'approve' | 'reject' */
    reviewVolunteerApplication: (applicationId, action, notes = '') =>
        data(api.post(`/users/volunteer/applications/${applicationId}/review/`, { action, notes })),
};

export default profileAPI;
