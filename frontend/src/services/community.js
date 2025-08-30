import api from './api';
import sosService from './sos';
import safetyService from './safety';

const communityService = {
    // Community Alerts (combining SOS and reports)
    getCommunityAlerts: async (latitude, longitude, radius = 5000) => {
        try {
            if (!latitude || !longitude) {
                throw new Error('Location coordinates are required');
            }

            // Get SOS alerts and reports in parallel
            const [sosAlerts, reportsResponse] = await Promise.allSettled([
                sosService.getActiveSOS(),
                api.get('/reports/nearby-reports/', {
                    params: { latitude, longitude, radius }
                })
            ]);

            const validSosAlerts = sosAlerts.status === 'fulfilled' ? sosAlerts.value : [];
            const validReports = reportsResponse.status === 'fulfilled'
                ? (reportsResponse.value.data.reports || [])
                : [];

            return {
                sos_alerts: validSosAlerts,
                reports: validReports,
                total_alerts: validSosAlerts.length + validReports.length
            };
        } catch (error) {
            console.error('Error fetching community alerts:', error);
            throw error;
        }
    },

    // Combined nearby data
    getNearbyData: async (latitude, longitude, radius = 5000) => {
        try {
            const [alerts, facilities] = await Promise.allSettled([
                communityService.getCommunityAlerts(latitude, longitude, radius),
                safetyService.getNearbyFacilities(latitude, longitude, radius)
            ]);

            return {
                alerts: alerts.status === 'fulfilled' ? alerts.value : { sos_alerts: [], reports: [], total_alerts: 0 },
                facilities: facilities.status === 'fulfilled' ? facilities.value : { hospitals: [], police_stations: [] }
            };
        } catch (error) {
            console.error('Error fetching nearby data:', error);
            throw error;
        }
    },

    // Volunteer Services (delegate to SOS service)
    getVolunteerStatus: () => sosService.getVolunteerStatus(),

    updateVolunteerAvailability: (isAvailable, latitude, longitude) =>
        sosService.updateVolunteerAvailability(isAvailable, latitude, longitude),

    registerVolunteer: (phoneNumber) => sosService.registerVolunteer(phoneNumber),

    respondToSOS: (sosId, message) => sosService.volunteerRespondToSOS(sosId, message),

    // Safety Services (delegate to safety service)
    getNearbyFacilities: (latitude, longitude, radius) =>
        safetyService.getNearbyFacilities(latitude, longitude, radius),

    predictSafetyZones: (latitude, longitude, radius) =>
        safetyService.predictSafetyZones(latitude, longitude, radius),

    getChloroplethData: (latitude, longitude, radius) =>
        safetyService.getChloroplethData(latitude, longitude, radius),

    // Community-specific functions
    getEmergencyContacts: async () => {
        try {
            const response = await api.get('/users/emergency-contacts/');
            return response.data;
        } catch (error) {
            console.error('Error fetching emergency contacts:', error);
            throw error;
        }
    },

    notifyEmergencyContacts: async (alertData) => {
        try {
            const response = await api.post('/users/notify-emergency-contacts/', alertData);
            return response.data;
        } catch (error) {
            console.error('Error notifying emergency contacts:', error);
            throw error;
        }
    }
};

export default communityService;
