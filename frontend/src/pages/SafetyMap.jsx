import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { OSM_ATTRIBUTION, OSM_TILE_URL, OVERVIEW_CENTER, OVERVIEW_ZOOM } from '../components/map/leafletSetup';
import { distanceMeters, formatDistance, isValidPoint } from '../components/map/geo';
import useStableLocation from '../components/map/useStableLocation';
import { useSOSContext } from '../context/SOSContext';
import useGeolocation from '../hooks/useGeolocation';
import { CenterOnFirstFix, MapClickPicker, MapResizeHandler } from './safety-map/MapBehaviors';
import { FacilityMarkers, ReportMarkers } from './safety-map/MapMarkers';
import { IncidentZones, OfficialZones, RiskCells } from './safety-map/RiskLayers';
import { Notices, RoutePanel, SafetyMapHeader } from './safety-map/SafetyMapHeader';
import SafetySidebar from './safety-map/SafetySidebar';
import { REFETCH_DISTANCE_M, REROUTE_DISTANCE_M, facilityKey, markerIcon } from './safety-map/mapConfig';
import useSafetyMapData from './safety-map/useSafetyMapData';
import './SafetyMap.css';

// leaflet-routing-machine is large; load it only when a route is shown.
const SafetyRoute = lazy(() => import('../components/SafetyRoute'));

const ROUTE_COLORS = { emergency: '#dc2626', hospital: '#2563eb', police: '#059669', default: '#f59e0b' };

const kindFromType = (type) => {
    if (type === 'sos') return 'sos';
    if (type === 'admin_alert') return 'alert';
    if (type === 'hospital' || type === 'police') return type;
    return 'incident';
};

const toDestination = (point, fallbackName, key) => ({
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
    name: point.name || fallbackName,
    kind: kindFromType(point.type),
    key,
});

/** Read the router state passed by Community / SOS once, on mount. */
const parseNavigationState = (state) => {
    const empty = { destination: null, focus: null, emergency: false, canGoBack: false };
    if (!state) return empty;
    if (state.navigationType === 'incident_route' && isValidPoint(state.endLocation)) {
        return { ...empty, destination: toDestination(state.endLocation, 'Incident location', 'nav-target'), canGoBack: true };
    }
    if (state.navigationType === 'view' && isValidPoint(state.focusLocation)) {
        return { ...empty, focus: { ...state.focusLocation, name: state.focusLocation.name || 'Selected location' }, canGoBack: true };
    }
    if (state.emergencyMode) {
        const target = state.sosData?.nearestSafeLocation;
        return {
            ...empty,
            emergency: true,
            destination: isValidPoint(target) ? toDestination(target, 'Nearest safe location', 'sos-target') : null,
        };
    }
    return empty;
};

const DEFAULT_FILTERS = { showRisk: true, showReports: true, showHospitals: true, showPolice: true };

export default function SafetyMap() {
    const routerLocation = useLocation();
    const navigate = useNavigate();
    const [nav] = useState(() => parseNavigationState(routerLocation.state));
    const { sosActive } = useSOSContext();
    const geo = useGeolocation({ watch: true });
    const { location, isManual, setManualLocation, refresh: refreshLocation } = geo;

    const [map, setMap] = useState(null);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [pickMode, setPickMode] = useState(false);
    const [emergencyMode, setEmergencyMode] = useState(nav.emergency);
    const [emergencyTarget, setEmergencyTarget] = useState(nav.emergency ? nav.destination : null);
    const [selectedDestination, setSelectedDestination] = useState(nav.emergency ? null : nav.destination);
    const [routeResult, setRouteResult] = useState(null); // { routeId, distance, duration } | { routeId, error }

    // Don't replay the navigation intent on refresh / back.
    useEffect(() => {
        if (routerLocation.state) navigate(routerLocation.pathname, { replace: true, state: null });
    }, [navigate, routerLocation.pathname, routerLocation.state]);

    const dataCenter = useStableLocation(location, REFETCH_DISTANCE_M);
    const routeStart = useStableLocation(location, REROUTE_DISTANCE_M);
    const data = useSafetyMapData(dataCenter);
    const { hospitals, policeStations } = data;

    const nearestFacility = useMemo(() => {
        if (!routeStart) return null;
        let best = null;
        for (const facility of [...hospitals, ...policeStations]) {
            const distance = distanceMeters(routeStart, facility);
            if (!best || distance < best.distance) best = { facility, distance };
        }
        return best && toDestination({ ...best.facility }, best.facility.name, facilityKey(best.facility));
    }, [routeStart, hospitals, policeStations]);

    const destination = emergencyMode ? (emergencyTarget || nearestFacility) : selectedDestination;
    const routeInfo = destination && routeResult?.routeId === destination.key && !routeResult.error ? routeResult : null;
    const routeError = destination && routeResult?.routeId === destination.key ? routeResult.error : null;
    const straightLine = destination && routeStart ? distanceMeters(routeStart, destination) : null;
    const routeColor = emergencyMode ? ROUTE_COLORS.emergency : (ROUTE_COLORS[destination?.kind] || ROUTE_COLORS.default);

    // Announce emergency navigation once per destination.
    const announcedRef = useRef(null);
    useEffect(() => {
        if (!emergencyMode || !destination || announcedRef.current === destination.key) return;
        announcedRef.current = destination.key;
        if ('speechSynthesis' in window) {
            const message = new SpeechSynthesisUtterance(`Emergency navigation to ${destination.name}.`);
            message.rate = 0.9;
            window.speechSynthesis.speak(message);
        }
    }, [emergencyMode, destination]);

    const toggleEmergency = useCallback(() => {
        if (emergencyMode) {
            setEmergencyMode(false);
            setEmergencyTarget(null);
            announcedRef.current = null;
        } else {
            setSelectedDestination(null);
            setEmergencyMode(true);
        }
        setRouteResult(null);
    }, [emergencyMode]);

    const clearRoute = useCallback(() => {
        setSelectedDestination(null);
        setEmergencyMode(false);
        setEmergencyTarget(null);
        setRouteResult(null);
        announcedRef.current = null;
    }, []);

    const handleDirections = useCallback((facility) => {
        setEmergencyMode(false);
        setEmergencyTarget(null);
        setSelectedDestination(toDestination(facility, facility.name, facilityKey(facility)));
        setRouteResult(null);
        map?.closePopup();
    }, [map]);

    const handleRouteFound = useCallback((result) => setRouteResult(result), []);
    const handleRoutingError = useCallback((_error, routeId) => {
        setRouteResult({ routeId, error: 'Road route unavailable right now.' });
    }, []);

    const handlePick = useCallback((lat, lng) => {
        setManualLocation(lat, lng);
        setPickMode(false);
    }, [setManualLocation]);

    const recenter = useCallback(() => {
        if (map && location) map.setView([location.latitude, location.longitude], Math.max(map.getZoom(), 15));
    }, [map, location]);

    const toggleLayer = useCallback((key) => setFilters((prev) => ({ ...prev, [key]: !prev[key] })), []);

    const counts = {
        reports: data.reports.length,
        zones: data.zones.length,
        cells: data.cells.length,
        hospitals: hospitals.length,
        policeStations: policeStations.length,
    };
    const activeFacilityKey = destination && (destination.kind === 'hospital' || destination.kind === 'police') ? destination.key : null;
    const noHelpNearby = emergencyMode && !destination && !data.loading && routeStart;

    return (
        <div className="safety-map-page bg-gray-50 min-h-screen">
            <Navbar />
            <SafetyMapHeader
                hasLocation={!!location}
                emergencyMode={emergencyMode}
                onToggleEmergency={toggleEmergency}
                sosActive={sosActive}
                loading={data.loading}
                onReload={data.reload}
                canGoBack={nav.canGoBack}
                onBack={() => navigate(-1)}
            />

            <main className="container mx-auto px-4 py-6 space-y-4">
                <Notices
                    geoError={geo.error}
                    geoLoading={geo.loading}
                    hasLocation={!!location}
                    isManual={isManual}
                    pickMode={pickMode}
                    errors={data.errors}
                    warnings={data.warnings}
                    onDismissErrors={data.dismissErrors}
                    onRetryLocation={refreshLocation}
                    onReloadData={data.reload}
                />
                {noHelpNearby && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                        No hospitals or police stations were found within 5 km. In an emergency call 112.
                    </p>
                )}
                <RoutePanel
                    destination={destination && { ...destination, straightLine }}
                    routeInfo={routeInfo}
                    routeError={routeError}
                    emergencyMode={emergencyMode}
                    onClear={clearRoute}
                />

                <div className="flex flex-col md:flex-row gap-6">
                    <SafetySidebar
                        data={data}
                        counts={counts}
                        filters={filters}
                        onToggleLayer={toggleLayer}
                        location={location}
                        isManual={isManual}
                        onRefreshLocation={refreshLocation}
                        onPickOnMap={() => setPickMode((prev) => !prev)}
                        pickMode={pickMode}
                    />

                    <div className="flex-1 relative order-1 md:order-2">
                        <div className={`safety-map-frame rounded-xl shadow-xl border border-gray-200 overflow-hidden ${pickMode || !location ? 'picking' : ''}`}>
                            <MapContainer
                                ref={setMap}
                                center={nav.focus ? [nav.focus.latitude, nav.focus.longitude] : OVERVIEW_CENTER}
                                zoom={nav.focus ? 15 : OVERVIEW_ZOOM}
                                className="h-full w-full z-0"
                                preferCanvas
                            >
                                <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />
                                <MapResizeHandler />
                                <CenterOnFirstFix target={nav.focus || location} />
                                <MapClickPicker enabled={pickMode || !location} onPick={handlePick} />

                                {filters.showRisk && <RiskCells cells={data.cells} />}
                                {filters.showRisk && <IncidentZones zones={data.zones} />}
                                <OfficialZones zones={data.officialZones} />
                                {filters.showReports && <ReportMarkers reports={data.reports} />}
                                <FacilityMarkers
                                    facilities={[
                                        ...(filters.showHospitals ? hospitals : []),
                                        ...(filters.showPolice ? policeStations : []),
                                    ]}
                                    activeKey={activeFacilityKey}
                                    routeInfo={routeInfo}
                                    canRoute={!!location}
                                    onDirections={handleDirections}
                                    onClearRoute={clearRoute}
                                />

                                {location && (
                                    <Marker position={[location.latitude, location.longitude]} icon={markerIcon(isManual ? 'manual' : 'user', 36)} zIndexOffset={1000}>
                                        <Popup>
                                            <div className="text-sm text-center">
                                                <p className="font-bold text-gray-900">{isManual ? 'Location you chose' : 'You are here'}</p>
                                                {location.accuracy != null && <p>Accuracy ±{Math.round(location.accuracy)} m</p>}
                                                {sosActive && <p className="text-red-600 font-bold">SOS active</p>}
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}

                                {nav.focus && (
                                    <Marker position={[nav.focus.latitude, nav.focus.longitude]} icon={markerIcon('incident', 40)}>
                                        <Popup><p className="font-semibold">{nav.focus.name}</p></Popup>
                                    </Marker>
                                )}

                                {destination && !activeFacilityKey && (
                                    <Marker position={[destination.latitude, destination.longitude]} icon={markerIcon(destination.kind === 'sos' ? 'sos' : 'incident', 40)}>
                                        <Popup>
                                            <p className="font-semibold">{destination.name}</p>
                                            {straightLine != null && <p className="text-xs">{formatDistance(straightLine)} away (straight line)</p>}
                                        </Popup>
                                    </Marker>
                                )}

                                {destination && routeStart && !routeError && (
                                    <Suspense fallback={null}>
                                        <SafetyRoute
                                            start={routeStart}
                                            end={destination}
                                            routeId={destination.key}
                                            color={routeColor}
                                            onRouteFound={handleRouteFound}
                                            onRoutingError={handleRoutingError}
                                        />
                                    </Suspense>
                                )}
                                {destination && routeStart && routeError && (
                                    <Polyline
                                        positions={[[routeStart.latitude, routeStart.longitude], [destination.latitude, destination.longitude]]}
                                        pathOptions={{ color: routeColor, weight: 4, dashArray: '8 8' }}
                                    />
                                )}
                            </MapContainer>

                            {location && (
                                <button
                                    type="button"
                                    onClick={recenter}
                                    aria-label="Recenter map on your location"
                                    title="Recenter on your location"
                                    className="absolute bottom-6 left-3 z-[400] bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-md"
                                >
                                    <LocateFixed className="w-5 h-5 text-gray-700" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
