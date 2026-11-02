import api from './api';

export const REPORT_TYPES = ['crime', 'harassment', 'safety', 'infrastructure', 'fire_hazard', 'medical', 'other'];
export const REPORT_STATUSES = ['pending', 'investigating', 'resolved', 'dismissed'];

/**
 * Paginated list of reports visible to the caller.
 * @returns {Promise<{count:number, reports:object[], limit:number, offset:number}>}
 */
export const listReports = async ({ type, status, department, mine, limit, offset } = {}, config = {}) => {
    const params = {};
    if (type && type !== 'all') params.type = type;
    if (status && status !== 'all') params.status = status;
    if (department) params.department = department;
    if (mine) params.mine = 'true';
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;
    const { data } = await api.get('/reports/list/', { params, ...config });
    return data;
};

export const fetchReportById = async (id, config = {}) => {
    const { data } = await api.get(`/reports/${id}/`, config);
    return data;
};

/** `formData` fields: title, description, report_type, latitude, longitude, location?, is_anonymous?, media[] */
export const createReport = async (formData) => {
    const { data } = await api.post('/reports/', formData);
    return data;
};
export const create_report = createReport;

/** @returns {Promise<{reports: object[], count: number, search_radius: number}>} */
export const fetchNearbyReports = async (latitude, longitude, radius = 5000, config = {}) => {
    const { data } = await api.get('/reports/nearby-reports/', {
        params: { latitude, longitude, radius },
        ...config,
    });
    return data;
};

/** @returns {Promise<{display_name: string, address: object}>} */
export const reverseGeocode = async (latitude, longitude, config = {}) => {
    const { data } = await api.get('/reports/reverse-geocode/', {
        params: { lat: latitude, lon: longitude },
        ...config,
    });
    return data;
};

const reportsService = {
    listReports,
    fetchReportById,
    createReport,
    create_report,
    fetchNearbyReports,
    reverseGeocode,
};

export default reportsService;
