import { useEffect, useState } from 'react';
import useGeolocation from '../../../hooks/useGeolocation';
import useStableLocation from '../../map/useStableLocation';
import { analyzeAreaRisk, getNearbyFacilities } from '../../../services/safety';
import { reverseGeocode } from '../../../services/reports';
import { errorMessage } from '../../../services/api';

const FACILITY_RADIUS_M = 5000;
const AREA_RADIUS_M = 1000;
const REFETCH_AFTER_M = 300;

const placeName = (geo) => {
    const a = geo?.address || {};
    const local = a.neighbourhood || a.suburb || a.road || a.quarter || a.village;
    // In India, OSM often has no `city` and `county` is a taluka ("SabarmatiTaluka");
    // `state_district` holds the readable city name ("Ahmedabad").
    const city = a.city || a.town || a.state_district || a.county;
    if (local && city) return `${local}, ${city}`;
    return local || city || null;
};

/**
 * The user's real surroundings: nearest police station + hospital, incidents
 * reported nearby and a readable place name. Nothing is shown without a real
 * device location.
 */
const useNearbyHelp = () => {
    const geo = useGeolocation();
    const center = useStableLocation(geo.location, REFETCH_AFTER_M);
    const [state, setState] = useState({ police: null, hospital: null, area: null, place: null, loading: false, error: null });

    const latitude = center?.latitude;
    const longitude = center?.longitude;

    useEffect(() => {
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
        const controller = new AbortController();
        const config = { signal: controller.signal };
        setState((s) => ({ ...s, loading: true, error: null }));

        Promise.allSettled([
            getNearbyFacilities(latitude, longitude, FACILITY_RADIUS_M, config),
            analyzeAreaRisk(latitude, longitude, AREA_RADIUS_M, config),
            reverseGeocode(latitude, longitude, config),
        ]).then(([facilities, area, place]) => {
            if (controller.signal.aborted) return;
            const f = facilities.status === 'fulfilled' ? facilities.value : null;
            setState({
                police: f?.police_stations?.[0] || null,
                hospital: f?.hospitals?.[0] || null,
                syncing: !!f?.syncing,
                area: area.status === 'fulfilled' ? area.value : null,
                place: place.status === 'fulfilled' ? placeName(place.value) : null,
                loading: false,
                error: facilities.status === 'rejected'
                    ? errorMessage(facilities.reason, 'Could not load nearby police stations and hospitals.')
                    : null,
            });
        });
        return () => controller.abort();
    }, [latitude, longitude]);

    return { ...state, location: geo.location, geoError: geo.error, geoLoading: geo.loading, retryLocation: geo.refresh };
};

export default useNearbyHelp;
