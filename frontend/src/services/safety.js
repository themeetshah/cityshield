import api from './api';

const safetyService = {
    // Facility Services
    getNearbyFacilities: async (latitude, longitude, radius = 5000) => {
        try {
            if (!latitude || !longitude) {
                throw new Error('Location coordinates are required');
            }

            const response = await api.post('/safety/nearby-facilities/', {
                latitude,
                longitude,
                radius
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching nearby facilities:', error);
            throw error;
        }
    },

    getNearbyPoliceStations: async (latitude, longitude, radius = 5000) => {
        try {
            if (!latitude || !longitude) {
                throw new Error('Location coordinates are required');
            }

            const response = await api.get('/safety/nearby-police/', {
                params: { latitude, longitude, radius }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching nearby police stations:', error);
            throw error;
        }
    },

    getNearbyHospitals: async (latitude, longitude, radius = 5000) => {
        try {
            if (!latitude || !longitude) {
                throw new Error('Location coordinates are required');
            }

            const response = await api.get('/safety/nearby-hospitals/', {
                params: { latitude, longitude, radius }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching nearby hospitals:', error);
            throw error;
        }
    },

    // Facility Management
    getPoliceStations: async (filters = {}) => {
        try {
            const response = await api.get('/safety/police-stations/', {
                params: filters
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching police stations:', error);
            throw error;
        }
    },

    getHospitals: async (filters = {}) => {
        try {
            const response = await api.get('/safety/hospitals/', {
                params: filters
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching hospitals:', error);
            throw error;
        }
    },

    // Safety Analysis
    predictSafetyZones: async (latitude, longitude, radius = 5000) => {
        try {
            if (!latitude || !longitude) {
                throw new Error('Location coordinates are required');
            }

            const response = await api.post('/safety/predict-safety-zones/', {
                latitude,
                longitude,
                radius
            });
            return response.data;
        } catch (error) {
            console.error('Error predicting safety zones:', error);
            throw error;
        }
    },

    getChloroplethData: async (latitude, longitude, radius = 5000) => {
        try {
            if (!latitude || !longitude) {
                throw new Error('Location coordinates are required');
            }

            const response = await api.get('/safety/chloropleth-data/', {
                params: { latitude, longitude, radius }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching chloropleth data:', error);
            throw error;
        }
    },

    getEnhancedChloroplethData: async (latitude, longitude, radius = 5000) => {
        try {
            const response = await api.get('/safety/enhanced-chloropleth-data/', {
                params: { latitude, longitude, radius }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching enhanced chloropleth data:', error);
            throw error;
        }
    },

    analyzeAreaRisk: async (latitude, longitude, radius = 1000) => {
        try {
            if (!latitude || !longitude) {
                throw new Error('Location coordinates are required');
            }

            const response = await api.post('/safety/risk-analysis/', {
                latitude,
                longitude,
                radius
            });
            return response.data;
        } catch (error) {
            console.error('Error analyzing area risk:', error);
            throw error;
        }
    },

    // Safety Zone Management
    getSafetyZones: async (zoneType = null) => {
        try {
            const params = zoneType ? { zone_type: zoneType } : {};
            const response = await api.get('/safety/safety-zones/', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching safety zones:', error);
            throw error;
        }
    },

    createSafetyZone: async (zoneData) => {
        try {
            const response = await api.post('/safety/create-safety-zone/', zoneData);
            return response.data;
        } catch (error) {
            console.error('Error creating safety zone:', error);
            throw error;
        }
    },

    updateSafetyZone: async (zoneId, zoneData) => {
        try {
            const response = await api.put(`/safety/update-safety-zone/${zoneId}/`, zoneData);
            return response.data;
        } catch (error) {
            console.error('Error updating safety zone:', error);
            throw error;
        }
    },

    deleteSafetyZone: async (zoneId) => {
        try {
            const response = await api.delete(`/safety/delete-safety-zone/${zoneId}/`);
            return response.data;
        } catch (error) {
            console.error('Error deleting safety zone:', error);
            throw error;
        }
    },

    // Data Import/Export
    getCSVStatistics: async () => {
        try {
            const response = await api.get('/safety/csv-statistics/');
            return response.data;
        } catch (error) {
            console.error('Error fetching CSV statistics:', error);
            throw error;
        }
    },

    importPoliceCSV: async (csvFile) => {
        try {
            const formData = new FormData();
            formData.append('csv_file', csvFile);

            const response = await api.post('/safety/import-police-csv/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error('Error importing police CSV:', error);
            throw error;
        }
    },

    importHospitalsCSV: async (csvFile) => {
        try {
            const formData = new FormData();
            formData.append('csv_file', csvFile);

            const response = await api.post('/safety/import-hospitals-csv/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error('Error importing hospitals CSV:', error);
            throw error;
        }
    },

    exportFacilities: async (includePolice = true, includeHospitals = true) => {
        try {
            const response = await api.get('/safety/export-facilities/', {
                params: {
                    include_police: includePolice,
                    include_hospitals: includeHospitals
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error exporting facilities:', error);
            throw error;
        }
    },

    // Overpass API Integration
    fetchOverpassData: async (latitude, longitude, radius = 5000) => {
        try {
            const response = await api.post('/safety/fetch-overpass-data/', {
                latitude,
                longitude,
                radius
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching Overpass data:', error);
            throw error;
        }
    },

    syncFacilities: async (latitude, longitude, radius = 10000) => {
        try {
            const response = await api.post('/safety/sync-facilities/', {
                latitude,
                longitude,
                radius
            });
            return response.data;
        } catch (error) {
            console.error('Error syncing facilities:', error);
            throw error;
        }
    },

    fetchSafetyMapReports: async () => {
        try {
            const response = await api.get('/safety/safety-map-reports/');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    fetchNearbyReports: async (latitude, longitude, radius = 5000) => {
        try {
            const response = await api.get('/safety/nearby-reports/', {
                params: { latitude, longitude, radius }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    fetchNearbyFacilities: async (latitude, longitude, radius = 5000) => {
        try {
            const response = await api.post('/safety/nearby-facilities/', {
                latitude,
                longitude,
                radius
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    predictSafetyZones: async (latitude, longitude, radius = 5000) => {
        try {
            const response = await api.post('/safety/predict-safety-zones/', {
                latitude,
                longitude,
                radius
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    fetchEnhancedChloroplethData: async (latitude, longitude, radius = 5000) => {
        try {
            const response = await api.get('/safety/chloropleth-data/', {
                params: { latitude, longitude, radius }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};


export default safetyService;
