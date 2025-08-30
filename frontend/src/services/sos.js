import api from './api';

const sosService = {
    // Emergency Alert Management
    createEmergencyAlert: async (emergencyData) => {
        try {
            console.log('Sending SOS data:', emergencyData);

            if (!emergencyData.location?.latitude || !emergencyData.location?.longitude) {
                throw new Error('Location data is required for SOS alert');
            }

            const response = await api.post('/sos/emergency/', {
                latitude: emergencyData.location.latitude,
                longitude: emergencyData.location.longitude,
                emergency_type: emergencyData.emergency_type || 'general_emergency',
                description: emergencyData.description || 'Emergency assistance needed',
                timestamp: emergencyData.timestamp || new Date().toISOString()
            });

            console.log('SOS Response:', response.data);
            return response.data;
        } catch (error) {
            console.error('SOS API Error:', error.response?.data || error.message);
            throw error;
        }
    },

    // Get active SOS alerts
    getActiveSOS: async () => {
        try {
            const response = await api.get('/sos/active/');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching active SOS:', error);
            return [];
        }
    },

    // NEW: Get all SOS alerts (active and resolved) for authorized users
    getAllSOS: async () => {
        try {
            const response = await api.get('/sos/all/');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching all SOS:', error);
            return [];
        }
    },

    getSOSById: async (sosId) => {
        try {
            const response = await api.get(`/sos/emergency/${sosId}/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching SOS by ID:', error);
            throw error;
        }
    },

    // NEW: Get SOS by user role
    getSOSByRole: async (latitude, longitude) => {
        try {
            console.log('Fetching SOS by role with coordinates:', { latitude, longitude });
            const response = await api.get('/sos/by-role/', { params: { latitude: latitude, longitude: longitude } });
            return response.data || [];
        } catch (error) {
            console.error('Error fetching SOS by role:', error);
            return [];
        }
    },

    // Resolve SOS alert
    resolveSOS: async (sosId) => {
        try {
            if (!sosId) {
                throw new Error('SOS ID is required');
            }

            const response = await api.post(`/sos/resolve/${sosId}/`);
            return response.data;
        } catch (error) {
            console.error('Error resolving SOS:', error);
            throw error;
        }
    },

    // NEW: Respond to SOS (for volunteers/police)
    respondToSOS: async (sosData) => {
        try {
            console.log('Sending SOS response:', sosData);
            const response = await api.post('/sos/respond/', {
                sos_id: sosData.sos_id,
                latitude: sosData.latitude,
                longitude: sosData.longitude,
                message: sosData.message || 'Volunteer responding to emergency'
            });
            console.log('SOS Response result:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error responding to SOS:', error);
            throw error;
        }
    },

    // Location Services
    findNearestSafeLocation: async (location) => {
        try {
            if (!location.latitude || !location.longitude) {
                throw new Error('Location coordinates are required');
            }

            const response = await api.post('/sos/nearest-safe-location/', {
                latitude: location.latitude,
                longitude: location.longitude,
                radius: 5000
            });
            return response.data;
        } catch (error) {
            console.error('Error finding safe location:', error);
            throw error;
        }
    },

    sendLocationUpdate: async (sosId, location) => {
        try {
            if (!sosId || !location.latitude || !location.longitude) {
                throw new Error('SOS ID and location are required');
            }

            const response = await api.post('/sos/location-update/', {
                sos_id: sosId,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy || null,
                timestamp: new Date().toISOString()
            });
            return response.data;
        } catch (error) {
            console.error('Error sending location update:', error);
            throw error;
        }
    },

    // Get location updates for SOS
    getLocationUpdates: async (sosId) => {
        try {
            const response = await api.get(`/sos/${sosId}/location-updates/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching location updates:', error);
            throw error;
        }
    },

    // Video/Media Services
    sendCameraFeedToPolice: async (videoBlob, sosId, chunkNumber, location) => {
        try {
            if (!videoBlob || !sosId) {
                throw new Error('Video file and SOS ID are required');
            }

            const formData = new FormData();
            formData.append('video', videoBlob, `emergency-video-${sosId}-chunk-${chunkNumber}.webm`);
            formData.append('sos_id', sosId);
            formData.append('chunk_number', chunkNumber); // ✅ Send chunk number

            if (location) {
                formData.append('latitude', location.latitude);
                formData.append('longitude', location.longitude);
            }

            const response = await api.post('/sos/camera-feed/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 10000,
            });
            return response.data;
        } catch (error) {
            console.error('Error sending camera feed:', error);
            throw error;
        }
    },

    // src/services/police.js - Update or add this function
    getEmergencyVideoFeeds: async (emergencyId) => {
        try {
            const response = await api.get(`/sos/emergency/${emergencyId}/video-feeds/`);
            return {
                success: true,
                data: response.data,
                message: 'Video feeds fetched successfully'
            };
        } catch (error) {
            console.error('Error fetching emergency video feeds:', error);
            return {
                success: false,
                data: { video_feeds: [], emergency_info: {} },
                message: error.response?.data?.error || 'Failed to fetch video feeds'
            };
        }
    },

    startVideoStream: async (sosId) => {
        try {
            const response = await api.post(`/sos/${sosId}/start-video/`);
            return response.data;
        } catch (error) {
            console.error('Error starting video stream:', error);
            throw error;
        }
    },

    getVideoFeed: async (sosId) => {
        try {
            const response = await api.get(`/sos/${sosId}/video-feed/`);
            return response.data;
        } catch (error) {
            console.error('Error getting video feed:', error);
            throw error;
        }
    },

    // Volunteer Management
    getVolunteerStatus: async () => {
        try {
            const response = await api.get('/sos/volunteer/status/');
            return response.data;
        } catch (error) {
            // Fallback: try profile endpoint
            try {
                const profileResponse = await api.get('/sos/volunteer/profile/');
                return {
                    is_volunteer: true,
                    is_available: profileResponse.data.is_available || false
                };
            } catch (profileError) {
                return {
                    is_volunteer: false,
                    is_available: false
                };
            }
        }
    },

    updateVolunteerAvailability: async (isAvailable, latitude = null, longitude = null) => {
        try {
            const response = await api.post('/sos/volunteer-availability/', {
                is_available: isAvailable,
                latitude: latitude,
                longitude: longitude
            });
            return response.data;
        } catch (error) {
            console.error('Error updating volunteer availability:', error);
            throw error;
        }
    },

    registerVolunteer: async (phoneNumber, additionalData = {}) => {
        try {
            if (!phoneNumber) {
                throw new Error('Phone number is required for volunteer registration');
            }

            const response = await api.post('/sos/register-volunteer/', {
                phone_number: phoneNumber,
                ...additionalData
            });
            return response.data;
        } catch (error) {
            console.error('Error registering volunteer:', error);
            throw error;
        }
    },

    getVolunteerProfile: async () => {
        try {
            const response = await api.get('/sos/volunteer/profile/');
            return response.data;
        } catch (error) {
            console.error('Error fetching volunteer profile:', error);
            throw error;
        }
    },

    // Emergency Response
    alertVolunteers: async (latitude, longitude, sosId, radius = 2000) => {
        try {
            if (!latitude || !longitude || !sosId) {
                throw new Error('Location and SOS ID are required');
            }

            const response = await api.post('/sos/alert-volunteers/', {
                latitude: latitude,
                longitude: longitude,
                sos_alert_id: sosId,
                radius: radius
            });
            return response.data;
        } catch (error) {
            console.error('Error alerting volunteers:', error);
            throw error;
        }
    },

    volunteerRespondToSOS: async (sosId, message = 'Volunteer responding to emergency') => {
        try {
            if (!sosId) {
                throw new Error('SOS ID is required');
            }

            const response = await api.post(`/sos/${sosId}/respond/`, {
                message: message,
                timestamp: new Date().toISOString()
            });
            return response.data;
        } catch (error) {
            console.error('Error responding to SOS:', error);
            throw error;
        }
    },

    getNearbyVolunteers: async (latitude, longitude, radius = 5000) => {
        try {
            if (!latitude || !longitude) {
                throw new Error('Location coordinates are required');
            }

            const response = await api.get('/sos/nearby-volunteers/', {
                params: { latitude, longitude, radius }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching nearby volunteers:', error);
            throw error;
        }
    },

    listAllSosResponses: async function () {
        const response = await api.get('/sos/sos-responses/');
        return response.data;
    },
};

export default sosService;
