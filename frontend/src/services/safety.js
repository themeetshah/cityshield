import api from './api';

const point = (latitude, longitude, radius) => ({ latitude, longitude, ...(radius ? { radius } : {}) });

// ---- Nearby facilities (database + cached OpenStreetMap) -------------------
/** @returns {Promise<{hospitals, police_stations, total_hospitals, total_police, sources: string[], warnings: string[], search_radius}>} */
export const getNearbyFacilities = async (latitude, longitude, radius = 5000, config = {}) => {
    const { data } = await api.get('/safety/nearby-facilities/', { params: point(latitude, longitude, radius), ...config });
    return data;
};

export const getNearbyPoliceStations = async (latitude, longitude, radius = 5000, config = {}) => {
    const { data } = await api.get('/safety/nearby-police/', { params: point(latitude, longitude, radius), ...config });
    return data;
};

export const getNearbyHospitals = async (latitude, longitude, radius = 5000, config = {}) => {
    const { data } = await api.get('/safety/nearby-hospitals/', { params: point(latitude, longitude, radius), ...config });
    return data;
};

export const listPoliceStations = async (params = {}, config = {}) => {
    const { data } = await api.get('/safety/police-stations/', { params, ...config });
    return data;
};

export const listHospitals = async (params = {}, config = {}) => {
    const { data } = await api.get('/safety/hospitals/', { params, ...config });
    return data;
};

// ---- Heuristic risk (computed from stored incidents; not a prediction) -----
/** @returns {Promise<{cells: object[], total_cells, grid_size_m, search_radius, method, explanation}>} */
export const getRiskGrid = async (latitude, longitude, radius = 3000, config = {}) => {
    const { data } = await api.get('/safety/risk-grid/', { params: point(latitude, longitude, radius), ...config });
    return data;
};

/** @returns {Promise<{zones: object[], official_zones: object[], search_radius, method, explanation}>} */
export const getRiskZones = async (latitude, longitude, radius = 3000, config = {}) => {
    const { data } = await api.get('/safety/risk-zones/', { params: point(latitude, longitude, radius), ...config });
    return data;
};

/** @returns {Promise<{risk_score, risk_level, total_incidents, recent_incidents, by_type, radius, lookback_days, method, explanation}>} */
export const analyzeAreaRisk = async (latitude, longitude, radius = 1000, config = {}) => {
    const { data } = await api.get('/safety/risk-analysis/', { params: point(latitude, longitude, radius), ...config });
    return data;
};

// ---- Safety zones (write: superadmin only) ---------------------------------
export const listSafetyZones = async (params = {}) => (await api.get('/safety/safety-zones/', { params })).data;
export const createSafetyZone = async (zone) => (await api.post('/safety/create-safety-zone/', zone)).data;
export const updateSafetyZone = async (zoneId, zone) => (await api.patch(`/safety/update-safety-zone/${zoneId}/`, zone)).data;
export const deleteSafetyZone = async (zoneId) => {
    await api.delete(`/safety/delete-safety-zone/${zoneId}/`);
};

// ---- Data management (superadmin only) -------------------------------------
const uploadCsv = async (url, csvFile) => {
    const formData = new FormData();
    formData.append('csv_file', csvFile);
    return (await api.post(url, formData)).data;
};
export const importPoliceCSV = (csvFile) => uploadCsv('/safety/import-police-csv/', csvFile);
export const importHospitalsCSV = (csvFile) => uploadCsv('/safety/import-hospitals-csv/', csvFile);
export const exportFacilities = async (includePolice = true, includeHospitals = true) => (
    await api.get('/safety/export-facilities/', {
        params: { include_police: includePolice, include_hospitals: includeHospitals },
    })
).data;
export const syncFacilities = async (latitude, longitude, radius = 10000) => (
    await api.post('/safety/sync-facilities/', point(latitude, longitude, radius))
).data;

const safetyService = {
    getNearbyFacilities,
    getNearbyPoliceStations,
    getNearbyHospitals,
    listPoliceStations,
    listHospitals,
    getRiskGrid,
    getRiskZones,
    analyzeAreaRisk,
    listSafetyZones,
    createSafetyZone,
    updateSafetyZone,
    deleteSafetyZone,
    importPoliceCSV,
    importHospitalsCSV,
    exportFacilities,
    syncFacilities,
};

export default safetyService;
