import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

const SafetyRoute = ({
    startLocation,
    endLocation,
    onRouteFound = () => { },
    onRoutingError = () => { },
    isActive = true,
    routeColor = '#DC2626'
}) => {
    const map = useMap();
    const routingControlRef = useRef(null);

    useEffect(() => {
        console.log('🗺️ SafetyRoute useEffect triggered with data:', {
            startLocation: startLocation,
            endLocation: endLocation,
            isActive: isActive,
            hasMap: !!map,
            startLocationValid: !!(startLocation?.latitude && startLocation?.longitude),
            endLocationValid: !!(endLocation?.latitude && endLocation?.longitude)
        });

        // Enhanced condition checking with detailed logging
        if (!map) {
            console.log('❌ SafetyRoute: No map available');
            return;
        }

        if (!isActive) {
            console.log('❌ SafetyRoute: Route is not active');
            if (routingControlRef.current) {
                try {
                    map.removeControl(routingControlRef.current);
                    routingControlRef.current = null;
                } catch (error) {
                    console.warn('Error removing routing control:', error);
                }
            }
            return;
        }

        if (!startLocation) {
            console.log('❌ SafetyRoute: No start location provided');
            return;
        }

        if (!endLocation) {
            console.log('❌ SafetyRoute: No end location provided');
            return;
        }

        if (!startLocation.latitude || !startLocation.longitude) {
            console.log('❌ SafetyRoute: Invalid start location coordinates:', startLocation);
            return;
        }

        if (!endLocation.latitude || !endLocation.longitude) {
            console.log('❌ SafetyRoute: Invalid end location coordinates:', endLocation);
            return;
        }

        console.log('✅ SafetyRoute: All conditions met, creating route...');

        // Remove existing route
        if (routingControlRef.current) {
            try {
                console.log('🧹 SafetyRoute: Removing existing route');
                map.removeControl(routingControlRef.current);
                routingControlRef.current = null;
            } catch (error) {
                console.warn('Error removing existing route:', error);
            }
        }

        try {
            console.log('🚀 SafetyRoute: Creating new route from',
                `[${startLocation.latitude}, ${startLocation.longitude}]`,
                'to',
                `[${endLocation.latitude}, ${endLocation.longitude}]`
            );

            const routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(startLocation.latitude, startLocation.longitude),
                    L.latLng(endLocation.latitude, endLocation.longitude)
                ],
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1',
                    profile: 'driving',
                    timeout: 30000
                }),
                routeWhileDragging: false,
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: true,
                show: true, // Ensure route line is visible
                createMarker: function () { return null; }, // Hide waypoint markers
                lineOptions: {
                    styles: [{
                        color: routeColor,
                        weight: 6,
                        opacity: 0.8
                    }]
                }
            });

            // Add event listeners
            routingControl.on('routesfound', function (e) {
                console.log('🎉 SafetyRoute: Routes found!', e.routes);
                const routes = e.routes;
                if (routes && routes.length > 0) {
                    const summary = routes[0].summary;
                    const routeData = {
                        distance: Math.round(summary.totalDistance),
                        duration: Math.round(summary.totalTime),
                        route: routes[0]
                    };
                    console.log('📊 SafetyRoute: Route data calculated:', routeData);
                    onRouteFound(routeData);
                }
            });

            routingControl.on('routingerror', function (e) {
                console.error('💥 SafetyRoute: Routing error:', e.error);
                onRoutingError(e.error);
            });

            routingControl.on('routingstart', function () {
                console.log('🏁 SafetyRoute: Routing started...');
            });

            // Add control to map
            routingControl.addTo(map);
            routingControlRef.current = routingControl;

            console.log('✅ SafetyRoute: Routing control added to map successfully');

        } catch (error) {
            console.error('💥 SafetyRoute: Error creating route:', error);
            onRoutingError(error);
        }

        return () => {
            if (routingControlRef.current) {
                try {
                    console.log('🧹 SafetyRoute: Cleanup - removing route');
                    map.removeControl(routingControlRef.current);
                    routingControlRef.current = null;
                } catch (error) {
                    console.warn('Error during cleanup:', error);
                }
            }
        };

    }, [startLocation, endLocation, map, isActive, routeColor]);

    return null;
};

export default SafetyRoute;
