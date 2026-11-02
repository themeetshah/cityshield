import api from './api';

/**
 * Official alerts issued by departments (backend police app).
 * @returns {Promise<Array<{id, title, message, alert_type, alert_type_display, department, department_label,
 *   station_name, issued_by_name, created_at, is_active}>>}
 */
export const getOfficialAlerts = async ({ activeOnly = true } = {}) => {
    const { data } = await api.get('/police/official-alerts/', {
        params: activeOnly ? { active: 'true' } : undefined,
    });
    return Array.isArray(data?.results) ? data.results : [];
};

const communityService = { getOfficialAlerts };

export default communityService;
