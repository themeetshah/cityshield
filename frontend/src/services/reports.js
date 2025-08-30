import api from "./api";

const reportsService = {
    // Create new report
    createReport: async (formData) => {
        try {
            const response = await api.post('/reports/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data; // Return data instead of full response
        } catch (error) {
            console.error('Create report error:', error);
            throw error;
        }
    },

    // Get report by ID
    fetchReportById: async (id) => {
        try {
            if (!id) {
                throw new Error('Report ID is required');
            }
            const response = await api.get(`/reports/${id}/`);
            return response.data;
        } catch (error) {
            console.error('Fetch report error:', error);
            throw error;
        }
    },

    // List all reports with optional filters
    listReports: async (filters = {}) => {
        try {
            const params = new URLSearchParams();

            // Add filters to params
            if (filters.type) params.append('type', filters.type);
            if (filters.status) params.append('status', filters.status);
            if (filters.limit) params.append('limit', filters.limit);
            if (filters.offset) params.append('offset', filters.offset);

            const queryString = params.toString();
            const url = queryString ? `/reports/list/?${queryString}` : '/reports/list/';

            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('List reports error:', error);
            throw error;
        }
    },

    // Get reports for safety map
    fetchSafetyMapReports: async () => {
        try {
            const response = await api.get('/reports/safety-map-reports/');
            return response.data;
        } catch (error) {
            console.error('Fetch safety map reports error:', error);
            throw error;
        }
    },

    // Get nearby reports
    fetchNearbyReports: async (latitude, longitude, radius = 5000) => {
        try {
            if (!latitude || !longitude) {
                throw new Error('Latitude and longitude are required');
            }

            const response = await api.get('/reports/nearby-reports/', {
                params: { latitude, longitude, radius }
            });
            return response.data;
        } catch (error) {
            console.error('Fetch nearby reports error:', error);
            throw error;
        }
    },

    // Update report status
    updateReportStatus: async (reportId, status) => {
        try {
            const response = await api.patch(`/reports/${reportId}/`, { status });
            return response.data;
        } catch (error) {
            console.error('Update report status error:', error);
            throw error;
        }
    },

    // Delete report
    deleteReport: async (reportId) => {
        try {
            const response = await api.delete(`/reports/${reportId}/`);
            return response.data;
        } catch (error) {
            console.error('Delete report error:', error);
            throw error;
        }
    },

    // Get user's reports
    getUserReports: async () => {
        try {
            const response = await api.get('/reports/my-reports/');
            return response.data;
        } catch (error) {
            console.error('Get user reports error:', error);
            throw error;
        }
    }
};

// Export individual functions for backward compatibility
export const create_report = reportsService.createReport;
export const fetchReportById = reportsService.fetchReportById;
export const listReports = reportsService.listReports;
export const fetchSafetyMapReports = reportsService.fetchSafetyMapReports;
export const fetchNearbyReports = reportsService.fetchNearbyReports;

// Export service for new usage pattern
export default reportsService;
