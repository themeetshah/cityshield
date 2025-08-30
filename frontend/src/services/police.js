// src/services/police.js
import api from './api';

// ==================== CORE POLICE SERVICES ====================

export const getReports = async (type = 'all', userLocation = null, radius = 5) => {
    try {
        const params = { type };

        if (userLocation) {
            params.latitude = userLocation.latitude;
            params.longitude = userLocation.longitude;
            params.radius = radius;
        }

        const response = await api.get('/police/reports/', { params });
        return {
            success: true,
            data: response.data,
            message: 'Reports fetched successfully'
        };
    } catch (error) {
        console.error('Error fetching reports:', error);
        return {
            success: false,
            data: { results: [], total_count: 0 },
            message: error.response?.data?.error || 'Failed to fetch reports'
        };
    }
};

export const getSosAlerts = async (userLocation = null, radius = 5) => {
    try {
        const params = userLocation ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            radius: radius
        } : {};

        const response = await api.get('/police/sos-alerts/', { params });
        return {
            success: true,
            data: response.data,
            message: 'SOS alerts fetched successfully'
        };
    } catch (error) {
        console.error('Error fetching SOS alerts:', error);
        return {
            success: false,
            data: { results: [], total_count: 0 },
            message: error.response?.data?.error || 'Failed to fetch SOS alerts'
        };
    }
};

export const getVolunteers = async () => {
    try {
        const response = await api.get('/police/volunteers/');
        return {
            success: true,
            data: response.data,
            message: 'Volunteers fetched successfully'
        };
    } catch (error) {
        console.error('Error fetching volunteers:', error);
        return {
            success: false,
            data: { results: [], total_count: 0 },
            message: error.response?.data?.error || 'Failed to fetch volunteers'
        };
    }
};

export const getPatrolTeams = async () => {
    try {
        const response = await api.get('/police/patrol-teams/');
        return {
            success: true,
            data: response.data,
            message: 'Patrol teams fetched successfully'
        };
    } catch (error) {
        console.error('Error fetching patrol teams:', error);
        return {
            success: false,
            data: { results: [], total_count: 0 },
            message: error.response?.data?.error || 'Failed to fetch patrol teams'
        };
    }
};

export const getDashboardStats = async (userLocation = null, radius = 5) => {
    try {
        const params = userLocation ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            radius: radius
        } : {};

        const response = await api.get('/police/dashboard-stats/', { params });
        return {
            success: true,
            data: response.data,
            message: 'Dashboard stats fetched successfully'
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
            success: false,
            data: {
                total_reports: 0,
                active_sos_alerts: 0,
                active_volunteers: 0,
                response_rate: 0,
                reports_this_week: 0,
                resolved_this_week: 0,
                avg_response_time: 0,
                patrol_teams_active: 0,
                location_filtered: false,
                filter_radius_km: null
            },
            message: error.response?.data?.error || 'Failed to fetch dashboard stats'
        };
    }
};

export const updateReportStatus = async (reportId, status) => {
    try {
        const response = await api.patch(`/police/reports/${reportId}/status/`, { status });
        return {
            success: true,
            data: response.data,
            message: `Report status updated to ${status}`
        };
    } catch (error) {
        console.error('Error updating report status:', error);
        return {
            success: false,
            data: null,
            message: error.response?.data?.error || 'Failed to update report status'
        };
    }
};

export const assignTeamToSOS = async (sosId, teamId) => {
    try {
        const response = await api.post(`/police/sos-alerts/${sosId}/assign-team/`, { team_id: teamId });
        return {
            success: true,
            data: response.data,
            message: 'Team assigned successfully'
        };
    } catch (error) {
        console.error('Error assigning team to SOS:', error);
        return {
            success: false,
            data: null,
            message: error.response?.data?.error || 'Failed to assign team to SOS alert'
        };
    }
};

export const releaseOfficialAlert = async (alertData) => {
    try {
        const response = await api.post('/police/official-alerts/', alertData);
        return {
            success: true,
            data: response.data,
            message: 'Official alert published successfully'
        };
    } catch (error) {
        console.error('Error releasing official alert:', error);
        return {
            success: false,
            data: null,
            message: error.response?.data?.error || 'Failed to publish official alert'
        };
    }
};

// ==================== VIDEO SERVICES ====================

export const getEmergencyVideoFeeds = async (emergencyId) => {
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
};

// ==================== PATROL TEAM MANAGEMENT ====================

export const patrolTeamServices = {
    // Get all patrol teams (wrapper for consistency)
    getPatrolTeams: async () => {
        try {
            const response = await api.get('/police/patrol-teams/');
            return {
                success: true,
                data: response.data,
                message: 'Patrol teams fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                data: { results: [], total_count: 0 },
                message: error.response?.data?.error || 'Failed to fetch patrol teams'
            };
        }
    },

    // Create new patrol team
    createPatrolTeam: async (teamData) => {
        try {
            const response = await api.post('/police/patrol-teams/', teamData);
            return {
                success: true,
                data: response.data,
                message: 'Patrol team created successfully'
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: error.response?.data?.error || 'Failed to create patrol team'
            };
        }
    },

    // Get single patrol team
    getPatrolTeam: async (teamId) => {
        try {
            const response = await api.get(`/police/patrol-teams/${teamId}/`);
            return {
                success: true,
                data: response.data,
                message: 'Patrol team details fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: error.response?.data?.error || 'Failed to fetch patrol team details'
            };
        }
    },

    // Update patrol team
    updatePatrolTeam: async (teamId, teamData) => {
        try {
            const response = await api.patch(`/police/patrol-teams/${teamId}/`, teamData);
            return {
                success: true,
                data: response.data,
                message: 'Patrol team updated successfully'
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: error.response?.data?.error || 'Failed to update patrol team'
            };
        }
    },

    // Delete patrol team
    deletePatrolTeam: async (teamId) => {
        try {
            const response = await api.delete(`/police/patrol-teams/${teamId}/`);
            return {
                success: true,
                data: response.data,
                message: 'Patrol team deleted successfully'
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: error.response?.data?.error || 'Failed to delete patrol team'
            };
        }
    },

    // Assign member to team
    assignMember: async (teamId, userId) => {
        try {
            const response = await api.post(`/police/patrol-teams/${teamId}/assign-member/`, { user_id: userId });
            return {
                success: true,
                data: response.data,
                message: 'Member assigned successfully'
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: error.response?.data?.error || 'Failed to assign member'
            };
        }
    },

    // Remove member from team
    removeMember: async (teamId, userId) => {
        try {
            const response = await api.post(`/police/patrol-teams/${teamId}/remove-member/`, { user_id: userId });
            return {
                success: true,
                data: response.data,
                message: 'Member removed successfully'
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: error.response?.data?.error || 'Failed to remove member'
            };
        }
    },

    // Toggle team status
    toggleTeamStatus: async (teamId) => {
        try {
            const response = await api.patch(`/police/patrol-teams/${teamId}/toggle-status/`);
            return {
                success: true,
                data: response.data,
                message: 'Team status updated successfully'
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: error.response?.data?.error || 'Failed to update team status'
            };
        }
    },

    // Update team location
    updateTeamLocation: async (teamId, latitude, longitude) => {
        try {
            const response = await api.patch(`/police/patrol-teams/${teamId}/update-location/`, {
                latitude,
                longitude
            });
            return {
                success: true,
                data: response.data,
                message: 'Team location updated successfully'
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: error.response?.data?.error || 'Failed to update team location'
            };
        }
    },

    // Get available police officers
    getAvailableOfficers: async () => {
        try {
            const response = await api.get('/police/police-officers/');
            return {
                success: true,
                data: response.data,
                message: 'Available officers fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                data: { officers: [], total_count: 0 },
                message: error.response?.data?.error || 'Failed to fetch available officers'
            };
        }
    }
};

// ==================== UTILITY FUNCTIONS ====================

// Helper function to get user's current location (for dashboard calls)
export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                console.warn('Location access denied:', error);
                resolve(null); // Return null instead of rejecting
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    });
};

// Wrapper function for dashboard with automatic location detection
export const getDashboardStatsWithLocation = async (radius = 5) => {
    try {
        const userLocation = await getCurrentLocation();
        return await getDashboardStats(userLocation, radius);
    } catch (error) {
        // Fallback to stats without location filtering
        return await getDashboardStats();
    }
};

// Wrapper function for SOS alerts with automatic location detection
export const getSosAlertsWithLocation = async (radius = 5) => {
    try {
        const userLocation = await getCurrentLocation();
        return await getSosAlerts(userLocation, radius);
    } catch (error) {
        // Fallback to alerts without location filtering
        return await getSosAlerts();
    }
};

// Wrapper function for reports with automatic location detection
export const getReportsWithLocation = async (type = 'all', radius = 5) => {
    try {
        const userLocation = await getCurrentLocation();
        return await getReports(type, userLocation, radius);
    } catch (error) {
        // Fallback to reports without location filtering
        return await getReports(type);
    }
};
