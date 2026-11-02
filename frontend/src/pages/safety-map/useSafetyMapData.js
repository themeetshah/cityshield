import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../services/api';
import { fetchNearbyReports } from '../../services/reports';
import { analyzeAreaRisk, getNearbyFacilities, getRiskGrid, getRiskZones } from '../../services/safety';
import { ANALYSIS_RADIUS_M, FACILITIES_RADIUS_M, REPORTS_RADIUS_M, RISK_RADIUS_M } from './mapConfig';

const EMPTY = {
    reports: [],
    hospitals: [],
    policeStations: [],
    cells: [],
    zones: [],
    officialZones: [],
    analysis: null,
    riskExplanation: '',
    warnings: [],
};

const SOURCES = [
    { key: 'reports', label: 'nearby reports', load: (lat, lng, cfg) => fetchNearbyReports(lat, lng, REPORTS_RADIUS_M, cfg) },
    { key: 'facilities', label: 'hospitals and police stations', load: (lat, lng, cfg) => getNearbyFacilities(lat, lng, FACILITIES_RADIUS_M, cfg) },
    { key: 'grid', label: 'risk grid', load: (lat, lng, cfg) => getRiskGrid(lat, lng, RISK_RADIUS_M, cfg) },
    { key: 'zones', label: 'incident clusters', load: (lat, lng, cfg) => getRiskZones(lat, lng, RISK_RADIUS_M, cfg) },
    { key: 'analysis', label: 'area summary', load: (lat, lng, cfg) => analyzeAreaRisk(lat, lng, ANALYSIS_RADIUS_M, cfg) },
];

const apply = (state, key, data) => {
    switch (key) {
        case 'reports':
            return { ...state, reports: data.reports || [] };
        case 'facilities':
            return {
                ...state,
                hospitals: data.hospitals || [],
                policeStations: data.police_stations || [],
                warnings: data.warnings || [],
            };
        case 'grid':
            return { ...state, cells: data.cells || [], riskExplanation: data.explanation || state.riskExplanation };
        case 'zones':
            return { ...state, zones: data.zones || [], officialZones: data.official_zones || [] };
        case 'analysis':
            return { ...state, analysis: data };
        default:
            return state;
    }
};

/**
 * Loads everything the safety map shows around `center`. Requests for an
 * outdated centre are aborted, so results can never arrive out of order and
 * nothing refetches unless the centre (or reload token) actually changes.
 */
const useSafetyMapData = (center) => {
    const [data, setData] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState([]);
    const [reloadToken, setReloadToken] = useState(0);

    const latitude = center?.latitude;
    const longitude = center?.longitude;

    useEffect(() => {
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
        const controller = new AbortController();
        const config = { signal: controller.signal };
        setLoading(true);

        Promise.allSettled(SOURCES.map((source) => source.load(latitude, longitude, config))).then((results) => {
            if (controller.signal.aborted) return;
            setData((prev) => results.reduce(
                (state, result, index) => (
                    result.status === 'fulfilled' ? apply(state, SOURCES[index].key, result.value) : state
                ),
                prev,
            ));
            setErrors(results.flatMap((result, index) => (
                result.status === 'rejected'
                    ? [`Could not load ${SOURCES[index].label}: ${errorMessage(result.reason)}`]
                    : []
            )));
            setLoading(false);
        });

        return () => controller.abort();
    }, [latitude, longitude, reloadToken]);

    const reload = useCallback(() => setReloadToken((n) => n + 1), []);
    const dismissErrors = useCallback(() => setErrors([]), []);

    return { ...data, loading, errors, reload, dismissErrors };
};

export default useSafetyMapData;
