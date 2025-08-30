import api from "./api";

// Reverse geocode coordinates to address
export const reverse_geocode = async (lat, lon) => {
    try {
        if (!lat || !lon) {
            throw new Error('Latitude and longitude are required');
        }

        const response = await api.get(`/reports/reverse-geocode/?lat=${lat}&lon=${lon}`);
        return response.data;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        throw error;
    }
};

// Get user's current location
export const getCurrentLocation = (options = {}) => {
    const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options
    };

    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                });
            },
            (error) => {
                let errorMessage = 'Location access denied';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }
                reject(new Error(errorMessage));
            },
            defaultOptions
        );
    });
};

// Watch user location changes
export const watchLocation = (callback, errorCallback, options = {}) => {
    const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000, // 1 minute
        ...options
    };

    if (!navigator.geolocation) {
        errorCallback(new Error('Geolocation is not supported'));
        return null;
    }

    return navigator.geolocation.watchPosition(
        (position) => {
            callback({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
            });
        },
        errorCallback,
        defaultOptions
    );
};

// Calculate distance between two points (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance * 1000; // Convert to meters
};

// Format distance for display
export const formatDistance = (meters) => {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    } else {
        return `${(meters / 1000).toFixed(1)}km`;
    }
};

const locationService = {
    getCurrentLocation,
    watchLocation,
    calculateDistance,
    formatDistance,
    reverse_geocode
};

export default locationService;
