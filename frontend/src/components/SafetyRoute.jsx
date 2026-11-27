import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// OpenStreetMap-hosted OSRM (FOSSGIS, fair-use). It can be slow or down - callers get
// onRoutingError and fall back to a straight line. (The project-osrm.org demo server
// logs a "not suitable for production" warning on every request.)
const OSRM_URL = 'https://routing.openstreetmap.de/routed-car/route/v1';

/**
 * Draws a driving route from `start` to `end` ({latitude, longitude}) on the
 * surrounding react-leaflet map. Reports `{ routeId, distance, duration }`
 * (metres / seconds) through onRouteFound, and `(error, routeId)` through onRoutingError.
 */
const SafetyRoute = ({ start, end, routeId = null, color = '#DC2626', lineStyles = null, onRouteFound, onRoutingError }) => {
    const map = useMap();
    const callbacks = useRef({ onRouteFound, onRoutingError, routeId });

    useEffect(() => {
        callbacks.current = { onRouteFound, onRoutingError, routeId };
    });

    const startLat = start?.latitude;
    const startLng = start?.longitude;
    const endLat = end?.latitude;
    const endLng = end?.longitude;
    // Serialised so callers can pass a fresh array literal without re-creating the route.
    const stylesKey = JSON.stringify(lineStyles || [{ color, weight: 6, opacity: 0.85 }]);

    useEffect(() => {
        if (![startLat, startLng, endLat, endLng].every(Number.isFinite)) return undefined;

        const control = L.Routing.control({
            waypoints: [L.latLng(startLat, startLng), L.latLng(endLat, endLng)],
            router: L.Routing.osrmv1({ serviceUrl: OSRM_URL, profile: 'driving', timeout: 15000 }),
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            show: false,
            collapsible: true,
            createMarker: () => null,
            lineOptions: { styles: JSON.parse(stylesKey), addWaypoints: false },
        });

        control.on('routesfound', (event) => {
            const summary = event.routes?.[0]?.summary;
            if (!summary) return;
            callbacks.current.onRouteFound?.({
                routeId: callbacks.current.routeId,
                distance: Math.round(summary.totalDistance),
                duration: Math.round(summary.totalTime),
            });
        });
        control.on('routingerror', (event) => {
            callbacks.current.onRoutingError?.(event.error, callbacks.current.routeId);
        });

        control.addTo(map);

        return () => {
            // leaflet-routing-machine can throw if removed while a request is
            // still pending; clearing the waypoints first cancels it.
            try {
                control.getPlan().setWaypoints([]);
                map.removeControl(control);
            } catch {
                // control already detached together with the map
            }
        };
    }, [map, startLat, startLng, endLat, endLng, stylesKey]);

    return null;
};

export default SafetyRoute;
