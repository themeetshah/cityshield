import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Rectangle, useMap } from "react-leaflet";
import { useLocation } from 'react-router-dom';
import { useSOSContext } from '../context/SOSContext';
import Navbar from "../components/common/Navbar";
import SafetyRoute from "../components/SafetyRoute";
import safetyService from '../services/safety';
const { fetchNearbyReports, fetchNearbyFacilities, predictSafetyZones, fetchEnhancedChloroplethData } = safetyService;
import L from "leaflet";
import 'leaflet/dist/leaflet.css';
import './SafetyMap.css';
import { Shield } from "lucide-react";

// Enhanced debounce hook for performance
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

// Data cache with expiry for performance
const dataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (lat, lng, radius, type) => `${type}_${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`;

const getCachedData = (key) => {
    const cached = dataCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.data;
    }
    dataCache.delete(key);
    return null;
};

const setCachedData = (key, data) => {
    dataCache.set(key, { data, timestamp: Date.now() });
};

// Fixed Map resize handler component
const MapResizeHandler = () => {
    const map = useMap();
    const resizeTimeoutRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        const forceMapResize = () => {
            if (!isMounted || !map) return;

            try {
                const container = map.getContainer();
                if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
                    map.invalidateSize({ animate: false, pan: false });
                }
            } catch (error) {
                console.warn('Map resize failed:', error);
            }
        };

        const handleResize = () => {
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }

            resizeTimeoutRef.current = setTimeout(() => {
                forceMapResize();
            }, 100);
        };

        // Initial resize with multiple attempts
        const initializeMap = () => {
            forceMapResize();
            setTimeout(forceMapResize, 100);
            setTimeout(forceMapResize, 300);
            setTimeout(forceMapResize, 500);
        };

        // Listen for container visibility changes
        const observer = new ResizeObserver(() => {
            if (isMounted) {
                handleResize();
            }
        });

        const container = map.getContainer();
        if (container) {
            observer.observe(container);
        }

        initializeMap();
        window.addEventListener('resize', handleResize);

        return () => {
            isMounted = false;
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
        };
    }, [map]);

    return null;
};

// Auto-center component
const MapAutoCenter = ({ currentLocation }) => {
    const map = useMap();

    useEffect(() => {
        if (currentLocation && map) {
            try {
                map.setView([currentLocation.latitude, currentLocation.longitude], 13, {
                    animate: true,
                    duration: 1.0
                });
            } catch (error) {
                console.warn('Failed to center map:', error);
            }
        }
    }, [currentLocation, map]);

    return null;
};

// Optimized icon creation with caching
const iconCache = new Map();

const createIcon = (type, size = [32, 32]) => {
    const cacheKey = `${type}_${size[0]}_${size[1]}`;
    if (iconCache.has(cacheKey)) {
        return iconCache.get(cacheKey);
    }

    const iconConfigs = {
        user: {
            html: `<div style="background: linear-gradient(135deg, #047857 0%, #059669 100%); border: 3px solid white; border-radius: 50%; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center; font-size: ${size[0] * 0.5}px; box-shadow: 0 3px 10px rgba(4, 120, 87, 0.4); z-index: 1000;"><div class="pulse">📍</div></div>`,
            className: 'user-marker'
        },
        hospital: {
            html: `<div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border: 3px solid white; border-radius: 50%; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center; font-size: ${size[0] * 0.4}px; box-shadow: 0 3px 10px rgba(59, 130, 246, 0.4);">🏥</div>`,
            className: 'hospital-marker'
        },
        police: {
            html: `<div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border: 3px solid white; border-radius: 50%; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center; font-size: ${size[0] * 0.4}px; box-shadow: 0 3px 10px rgba(5, 150, 105, 0.4);">🚓</div>`,
            className: 'police-marker'
        },
        sos: {
            html: `<div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border: 3px solid white; border-radius: 50%; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center; font-size: ${size[0] * 0.4}px; box-shadow: 0 3px 10px rgba(220, 38, 38, 0.4); animation: pulse 1.5s infinite;"><div class="pulse">🆘</div></div>`,
            className: 'sos-marker'
        },
        crime: {
            html: `<div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); border: 3px solid white; border-radius: 50%; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center; font-size: ${size[0] * 0.4}px; box-shadow: 0 3px 10px rgba(234, 88, 12, 0.4);">🚨</div>`,
            className: 'crime-marker'
        },
        harassment: {
            html: `<div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); border: 3px solid white; border-radius: 50%; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center; font-size: ${size[0] * 0.4}px; box-shadow: 0 3px 10px rgba(234, 88, 12, 0.4);">⚠️</div>`,
            className: 'harassment-marker'
        },
        safety: {
            html: `<div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: 3px solid white; border-radius: 50%; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center; font-size: ${size[0] * 0.4}px; box-shadow: 0 3px 10px rgba(245, 158, 11, 0.4);">⚡</div>`,
            className: 'safety-marker'
        },
        infrastructure: {
            html: `<div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border: 3px solid white; border-radius: 50%; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center; font-size: ${size[0] * 0.4}px; box-shadow: 0 3px 10px rgba(99, 102, 241, 0.4);">🔧</div>`,
            className: 'infrastructure-marker'
        },
        incident: {
            html: `<div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: 3px solid white; border-radius: 50%; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center; font-size: ${size[0] * 0.4}px; box-shadow: 0 3px 10px rgba(245, 158, 11, 0.4);">⚠️</div>`,
            className: 'incident-marker'
        },
        other: {
            html: `<div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); border: 3px solid white; border-radius: 50%; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center; font-size: ${size[0] * 0.4}px; box-shadow: 0 3px 10px rgba(22, 163, 74, 0.4);">✅</div>`,
            className: 'other-marker'
        }
    };

    const config = iconConfigs[type] || iconConfigs.other;

    const icon = L.divIcon({
        html: config.html,
        className: config.className,
        iconSize: size,
        iconAnchor: [size[0] / 2, size[1] / 2],
        popupAnchor: [0, -size[1] / 2],
    });

    iconCache.set(cacheKey, icon);
    return icon;
};

// NEW: Compact Top Banner Component
const CleanTopBanner = ({
    currentLocation,
    emergencyMode,
    findingLocation,
    nearestSafeLocation,
    toggleEmergencyMode,
    onClearRoute,
    onBackToCommunity,
    dataLoading,
    getCurrentLocation,
    locationLoading
}) => (
    // <div className="bg-white border-b border-gray-200 shadow-sm">
    //     <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
    //         <div className="text-center">
    //             {/* Compact Live Status Banner */}
    //             <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-50 backdrop-blur-sm rounded-full border border-gray-200 mb-4">
    //                 <div className="flex items-center gap-2">
    //                     {currentLocation ? (
    //                         <>
    //                             <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
    //                             <span className="text-xs font-medium text-gray-700">Live Safety Network</span>
    //                         </>
    //                     ) : (
    //                         <>
    //                             <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
    //                             <span className="text-xs font-medium text-gray-700">Location Required</span>
    //                         </>
    //                     )}
    //                 </div>
    //                 <div className="h-3 w-px bg-gray-300"></div>
    //                 <button
    //                     onClick={getCurrentLocation}
    //                     disabled={locationLoading}
    //                     className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-all duration-200 disabled:opacity-50 text-xs font-medium text-gray-700"
    //                 >
    //                     <div className={`w-3 h-3 ${locationLoading ? 'animate-spin' : ''}`}>
    //                         {locationLoading ? '🔄' : '📍'}
    //                     </div>
    //                     {locationLoading ? 'Getting...' : 'Update'}
    //                 </button>
    //             </div>

    //             <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3 pb-1">
    //                 CityShield Safety Map
    //             </h1>

    //             <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed mb-6">
    //                 Real-time safety analytics and emergency response system for your area
    //             </p>

    //             {/* Compact Emergency Action Button */}
    //             {currentLocation && !nearestSafeLocation && (
    //                 <button
    //                     onClick={toggleEmergencyMode}
    //                     disabled={findingLocation}
    //                     className={`group relative overflow-hidden px-6 py-3 rounded-xl font-bold text-base shadow-lg transition-all duration-300 transform ${emergencyMode
    //                         ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white animate-pulse scale-105'
    //                         : findingLocation
    //                             ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white cursor-not-allowed opacity-75'
    //                             : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:scale-105 hover:shadow-xl'
    //                         }`}
    //                 >
    //                     <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
    //                     <div className="relative flex items-center gap-2">
    //                         {findingLocation ? (
    //                             <>
    //                                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    //                                 <span>Finding Safest Place...</span>
    //                             </>
    //                         ) : emergencyMode ? (
    //                             <>
    //                                 <span className="text-xl">🛑</span>
    //                                 <span>Stop Emergency Mode</span>
    //                             </>
    //                         ) : (
    //                             <>
    //                                 <span className="text-xl">🆘</span>
    //                                 <span>Find Safest Place</span>
    //                             </>
    //                         )}
    //                     </div>
    //                 </button>
    //             )}

    //             {/* Compact Route Controls */}
    //             {nearestSafeLocation && !emergencyMode && (
    //                 <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
    //                     <button
    //                         onClick={onClearRoute}
    //                         className="group relative overflow-hidden px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
    //                     >
    //                         <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
    //                         <span className="relative">Clear Route</span>
    //                     </button>

    //                     <button
    //                         onClick={onBackToCommunity}
    //                         className="group relative overflow-hidden px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
    //                     >
    //                         <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
    //                         <span className="relative flex items-center gap-2">
    //                             <span>←</span>
    //                             <span>Back to Community</span>
    //                         </span>
    //                     </button>
    //                 </div>
    //             )}

    //             {/* Compact Loading Indicator */}
    //             {dataLoading && (
    //                 <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
    //                     <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    //                     <span className="text-xs font-medium">Analyzing safety zones...</span>
    //                 </div>
    //             )}
    //         </div>
    //     </div>
    // </div>
    <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <div className="text-center">
                {/* Compact Live Status Banner */}
                <div className="inline-flex items-center gap-4 px-6 py-3 bg-gray-50 backdrop-blur-sm rounded-full border border-gray-200 mb-8">
                    <div className="flex items-center gap-2">
                        {currentLocation ? (
                            <>
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium text-gray-700">Live Safety Network</span>
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium text-gray-700">Location Required</span>
                            </>
                        )}
                    </div>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <button
                        onClick={getCurrentLocation}
                        disabled={locationLoading}
                        className="inline-flex items-center gap-2 px-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm font-medium text-gray-700"
                    >
                        <div className={`w-4 h-4 ${locationLoading ? 'animate-spin' : ''}`}>
                            {locationLoading ? '🔄' : '📍'}
                        </div>
                        {locationLoading ? 'Getting...' : 'Update'}
                    </button>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4 pb-3">
                    CityShield Safety Map
                </h1>

                <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-6">
                    Real-time safety analytics and emergency response system for your area
                </p>

                {/* Compact Emergency Action Button */}
                {currentLocation && !nearestSafeLocation && (
                    <button
                        onClick={toggleEmergencyMode}
                        disabled={findingLocation}
                        className={`group relative overflow-hidden px-6 py-3 rounded-xl font-bold text-base shadow-lg transition-all duration-300 transform ${emergencyMode
                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white animate-pulse scale-105'
                            : findingLocation
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white cursor-not-allowed opacity-75'
                                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:scale-105 hover:shadow-xl'
                            }`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        <div className="relative flex items-center gap-2">
                            {findingLocation ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Finding Safest Place...</span>
                                </>
                            ) : emergencyMode ? (
                                <>
                                    {/* <span className="text-xl">🛑</span> */}
                                    <span className="text-xl">🆘</span>
                                    <span>Stop Emergency Mode</span>
                                </>
                            ) : (
                                <>
                                    {/* <span className="text-xl">🆘</span> */}
                                    <span>Find Safest Place</span>
                                </>
                            )}
                        </div>
                    </button>
                )}

                {/* Compact Route Controls */}
                {nearestSafeLocation && !emergencyMode && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={onClearRoute}
                            className="group relative overflow-hidden px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <span className="relative">Clear Route</span>
                        </button>

                        <button
                            onClick={onBackToCommunity}
                            className="group relative overflow-hidden px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <span className="relative flex items-center gap-2">
                                <span>←</span>
                                <span>Back to Community</span>
                            </span>
                        </button>
                    </div>
                )}

                {/* Compact Loading Indicator */}
                {dataLoading && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-medium">Analyzing safety zones...</span>
                    </div>
                )}
            </div>
        </div>
    </div>
);

// Enhanced Sidebar Component - Responsive Layout
const ResponsiveSidebar = ({
    visibleAreaReports,
    currentLocation,
    filters,
    setFilters,
    clearAllExpandedAreas,
    getCurrentLocation,
    stats,
    nearbyReports,
    hospitals,
    policeStations,
    safetyZones,
    chloroplethData,
    selectedArea
}) => (
    <div className="w-full md:w-80 bg-white border border-gray-200 rounded-xl shadow-lg order-2 md:order-1">
        <div className="p-4 md:p-6 h-auto md:h-[600px] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4 md:gap-6">

                {/* Enhanced Statistics Grid */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="font-bold text-sm text-gray-800 mb-3">📊 Enhanced Statistics</div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="font-bold text-blue-600 text-lg">{stats.total_reports || nearbyReports.length}</div>
                            <div className="text-blue-700 text-xs">Total Reports</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="font-bold text-red-600 text-lg">{stats.sos_reports || 0}</div>
                            <div className="text-red-700 text-xs">SOS Alerts</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="font-bold text-green-600 text-lg">{hospitals.length}</div>
                            <div className="text-green-700 text-xs">Hospitals</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="font-bold text-purple-600 text-lg">{policeStations.length}</div>
                            <div className="text-purple-700 text-xs">Police</div>
                        </div>
                    </div>
                    {stats.avg_risk_score !== undefined && (
                        <div className="mt-3 text-center p-2 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="font-bold text-orange-600">Risk Score: {stats.avg_risk_score.toFixed(1)}/15</div>
                        </div>
                    )}
                </div>

                {/* Enhanced Risk Legend */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="font-bold text-sm text-gray-800 mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            🎯 Enhanced Risk Assessment
                        </span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-4 bg-red-900 border border-gray-300 rounded shadow-sm"></div>
                            <span className="text-xs">Critical (12-15)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-4 bg-red-600 border border-gray-300 rounded shadow-sm"></div>
                            <span className="text-xs">High Risk (9-12)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-4 bg-orange-600 border border-gray-300 rounded shadow-sm"></div>
                            <span className="text-xs">Medium-High (6-9)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-4 bg-amber-500 border border-gray-300 rounded shadow-sm"></div>
                            <span className="text-xs">Medium (4-6)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-4 bg-yellow-500 border border-gray-300 rounded shadow-sm"></div>
                            <span className="text-xs">Low-Medium (2-4)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-4 bg-lime-500 border border-gray-300 rounded shadow-sm"></div>
                            <span className="text-xs">Low Risk (0.5-2)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-4 bg-green-500 border border-gray-300 rounded shadow-sm"></div>
                            <span className="text-xs">Safe Area (0-0.5)</span>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-3 border-t pt-2">
                        Enhanced Manual Calculation
                    </div>
                </div>

                {/* Safety Zone Information */}
                {safetyZones && (safetyZones.safe_zones?.length > 0 || safetyZones.danger_zones?.length > 0) && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="font-bold text-sm text-gray-800 mb-3">🛡️ Safety Zones</div>
                        <div className="space-y-2 text-xs">
                            {safetyZones.safe_zones?.length > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-green-600">🟢 Safe Zones</span>
                                    <span className="font-bold">{safetyZones.safe_zones.length}</span>
                                </div>
                            )}
                            {safetyZones.danger_zones?.length > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-red-600">🔴 Danger Zones</span>
                                    <span className="font-bold">{safetyZones.danger_zones.length}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Location Info */}
                {currentLocation && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                            📍 Location Status
                        </div>
                        <div className="text-xs text-gray-600 space-y-2">
                            <div className="flex items-center justify-between">
                                <span>Coordinates:</span>
                                <span className="font-mono text-xs">{currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}</span>
                            </div>
                            {currentLocation.accuracy && (
                                <div className="flex items-center justify-between">
                                    <span>Accuracy:</span>
                                    <span>±{Math.round(currentLocation.accuracy)}m</span>
                                </div>
                            )}
                            <button
                                onClick={getCurrentLocation}
                                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                            >
                                🔄 Refresh Location
                            </button>
                        </div>
                    </div>
                )}

                {/* Enhanced Map Layers with more options */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="font-bold text-sm text-gray-800 mb-3">🔧 Map Layers & Filters</div>
                    <div className="space-y-3">
                        {[
                            { key: 'showChloropleth', label: 'Risk Zones', icon: '🎯', count: chloroplethData.length },
                            { key: 'showHospitals', label: 'Hospitals', icon: '🏥', count: hospitals.length },
                            { key: 'showPolice', label: 'Police Stations', icon: '🚓', count: policeStations.length },
                            { key: 'showReports', label: 'All Reports', icon: '📍', count: nearbyReports.length },
                        ].map(({ key, label, icon, count }) => (
                            <label key={key} className="flex items-center justify-between cursor-pointer">
                                <span className="text-sm text-gray-700 flex items-center gap-2">
                                    <span>{icon}</span>
                                    <span>{label}</span>
                                    <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">({count})</span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={filters[key]}
                                    onChange={() => setFilters(prev => ({ ...prev, [key]: !prev[key] }))}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </label>
                        ))}
                    </div>
                </div>

                {/* Selected Area Details */}
                {selectedArea && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="font-bold text-sm text-blue-800 mb-3">🎯 Selected Area Details</div>
                        <div className="text-xs space-y-2">
                            <div><strong>Risk Score:</strong> {selectedArea.data.risk_score.toFixed(2)}/15</div>
                            <div><strong>Grid Size:</strong> {(selectedArea.data.grid_size || 0.005).toFixed(5)}°</div>
                            <div><strong>Coordinates:</strong> {selectedArea.data.latitude.toFixed(4)}, {selectedArea.data.longitude.toFixed(4)}</div>
                            <button
                                onClick={() => setSelectedArea(null)}
                                className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Clear Selection
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
);

// Main SafetyMap component with ALL functionalities restored
export default function SafetyMap() {
    // Core state
    const [currentLocation, setCurrentLocation] = useState(null);
    const [nearestSafeLocation, setNearestSafeLocation] = useState(null);
    const [emergencyMode, setEmergencyMode] = useState(false);
    const [showRoute, setShowRoute] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);
    const [findingLocation, setFindingLocation] = useState(false);

    // All data state variables
    const [nearbyReports, setNearbyReports] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [policeStations, setPoliceStations] = useState([]);
    const [chloroplethData, setChloroplethData] = useState([]);
    const [stats, setStats] = useState({});
    const [safetyZones, setSafetyZones] = useState({ safe_zones: [], danger_zones: [] });

    // Loading and error states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [dataLoading, setDataLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [facilitiesLoading, setFacilitiesLoading] = useState(false);
    const [zonesLoading, setZonesLoading] = useState(false);

    // NEW: Facility routing states
    const [facilityRoute, setFacilityRoute] = useState(null);
    const [facilityRouteInfo, setFacilityRouteInfo] = useState({});

    // Area expansion state for on-demand incidents
    const [visibleAreaReports, setVisibleAreaReports] = useState(new Set());
    const [selectedArea, setSelectedArea] = useState(null);

    // Enhanced filters with more options
    const [filters, setFilters] = useState({
        showHospitals: false,
        showPolice: false,
        showChloropleth: true,
        showReports: false
    });

    const routeLocation = useLocation();
    const { sosActive, sosData, updateSOSLocation } = useSOSContext();
    const mapRef = useRef(null);

    // Debounced location for performance
    const debouncedLocation = useDebounce(currentLocation, 1000);

    // NEW: Facility routing handlers
    const handleGetDirections = useCallback((facility) => {
        if (!currentLocation) {
            alert('Current location not available. Please enable location services.');
            return;
        }

        const routeId = `${facility.type}-${facility.id || Math.random()}`;

        setFacilityRoute({
            start: currentLocation,
            end: facility,
            type: facility.type,
            id: routeId
        });
    }, [currentLocation]);

    const handleFacilityRouteFound = useCallback((routeData) => {
        setFacilityRouteInfo(prev => ({
            ...prev,
            [routeData.routeId]: routeData
        }));
    }, []);

    const handleFacilityRoutingError = useCallback((error) => {
        console.error('Facility routing error:', error);
        alert('Unable to calculate route to this facility. Please try again.');
    }, []);

    const clearFacilityRoute = useCallback(() => {
        setFacilityRoute(null);
        setFacilityRouteInfo({});
    }, []);

    // Get current location
    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by this browser");
            setLoading(false);
            return;
        }

        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCurrentLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                setLocationError(null);
                setLocationLoading(false);
                setLoading(false);
            },
            (error) => {
                setLocationError(error.message);
                setLocationLoading(false);
                // Fallback to LJ for demo
                setCurrentLocation({
                    latitude: 22.9906387,
                    longitude: 72.4872284,
                    accuracy: 1000
                });
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }, []);

    // Initialize location on mount
    useEffect(() => {
        getCurrentLocation();
    }, [getCurrentLocation]);

    // Complete data fetching with all features
    const fetchOptimizedData = useCallback(async (location) => {
        if (!location || dataLoading) return;

        setDataLoading(true);
        setFacilitiesLoading(true);
        setZonesLoading(true);

        try {
            const radius = 3000; // Keep full coverage

            // Check cache first
            const reportsKey = getCacheKey(location.latitude, location.longitude, radius, 'reports');
            const facilitiesKey = getCacheKey(location.latitude, location.longitude, radius, 'facilities');
            const chloroplethKey = getCacheKey(location.latitude, location.longitude, radius, 'chloropleth');
            const zonesKey = getCacheKey(location.latitude, location.longitude, radius, 'zones');

            const cachedReports = getCachedData(reportsKey);
            const cachedFacilities = getCachedData(facilitiesKey);
            const cachedChloropleth = getCachedData(chloroplethKey);
            const cachedZones = getCachedData(zonesKey);

            // Fetch all data including safety zones
            const promises = [];

            if (!cachedReports) {
                promises.push(
                    fetchNearbyReports(location.latitude, location.longitude, radius)
                        .then(data => ({ type: 'reports', data }))
                        .catch(error => ({ type: 'reports', error }))
                );
            }

            if (!cachedFacilities) {
                promises.push(
                    fetchNearbyFacilities(location.latitude, location.longitude, radius)
                        .then(data => ({ type: 'facilities', data }))
                        .catch(error => ({ type: 'facilities', error }))
                );
            }

            if (!cachedChloropleth) {
                promises.push(
                    fetchEnhancedChloroplethData(location.latitude, location.longitude, radius)
                        .then(data => ({ type: 'chloropleth', data }))
                        .catch(error => ({ type: 'chloropleth', error }))
                );
            }

            // Safety zones fetching
            if (!cachedZones) {
                promises.push(
                    predictSafetyZones(location.latitude, location.longitude, radius)
                        .then(data => ({ type: 'zones', data }))
                        .catch(error => ({ type: 'zones', error }))
                );
            }

            const results = await Promise.allSettled(promises);

            // Process all results including safety zones
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value && !result.value.error) {
                    const { type, data } = result.value;

                    switch (type) {
                        case 'reports':
                            setNearbyReports(data.reports || []);
                            const enhancedStats = {
                                ...(data.stats || {}),
                                high_risk_areas: (data.stats?.high_risk_areas || 0)
                            };
                            setStats(enhancedStats);
                            setCachedData(reportsKey, { reports: data.reports || [], stats: enhancedStats });
                            break;

                        case 'facilities':
                            setHospitals((data.hospitals || []));
                            setPoliceStations((data.police_stations || []));
                            setCachedData(facilitiesKey, {
                                hospitals: (data.hospitals || []),
                                police_stations: (data.police_stations || [])
                            });
                            setFacilitiesLoading(false);
                            break;

                        case 'chloropleth':
                            setChloroplethData(data.chloropleth_data || []);
                            setCachedData(chloroplethKey, { chloropleth_data: data.chloropleth_data || [] });
                            break;

                        // Safety zones processing
                        case 'zones':
                            setSafetyZones(data || { safe_zones: [], danger_zones: [] });
                            setCachedData(zonesKey, data || { safe_zones: [], danger_zones: [] });
                            setZonesLoading(false);
                            break;
                    }
                }
            });

            // Use cached data if available
            if (cachedReports) {
                setNearbyReports(cachedReports.reports || []);
                setStats(cachedReports.stats || {});
            }

            if (cachedFacilities) {
                setHospitals(cachedFacilities.hospitals || []);
                setPoliceStations(cachedFacilities.police_stations || []);
                setFacilitiesLoading(false);
            }

            if (cachedChloropleth) {
                setChloroplethData(cachedChloropleth.chloropleth_data || []);
            }

            // Use cached safety zones
            if (cachedZones) {
                setSafetyZones(cachedZones || { safe_zones: [], danger_zones: [] });
                setZonesLoading(false);
            }

        } catch (err) {
            setError('Failed to load safety data. Using cached data if available.');
            console.error('Data fetching error:', err);
        } finally {
            setDataLoading(false);
            setFacilitiesLoading(false);
            setZonesLoading(false);
        }
    }, [dataLoading]);

    // All useEffect hooks for proper functionality
    useEffect(() => {
        if (debouncedLocation && !sosActive) {
            fetchOptimizedData(debouncedLocation);
        }
    }, [debouncedLocation, sosActive, fetchOptimizedData]);

    // Handle incident routing from Community page
    useEffect(() => {
        const routeState = routeLocation.state;
        if (routeState?.navigationType === 'incident_route') {
            if (routeState.startLocation) {
                setCurrentLocation(routeState.startLocation);
            }

            if (routeState.endLocation) {
                setNearestSafeLocation({
                    ...routeState.endLocation,
                    name: routeState.endLocation.name || 'Incident Location',
                    type: routeState.endLocation.type || 'incident',
                    emergencyServices: routeState.endLocation.type === 'sos' ? '🚨 Emergency SOS Location' :
                        routeState.endLocation.type === 'admin_alert' ? '🏛️ Official Alert Location' :
                            '📍 Incident Report Location',
                    distance: routeState.endLocation.distance || 'Calculating...',
                    severity: routeState.endLocation.severity || 'medium'
                });
                setShowRoute(true);
                setEmergencyMode(false);
            }

            window.history.replaceState({}, document.title);
        }

        // Handle SOS emergency mode
        if (routeState?.emergencyMode && routeState?.sosData) {
            console.log('SOS Emergency Mode Activated:', routeState.sosData);
            setEmergencyMode(true);
            if (routeState.sosData.location) {
                setCurrentLocation(routeState.sosData.location);
            }
            if (routeState.sosData.nearestSafeLocation) {
                setNearestSafeLocation(routeState.sosData.nearestSafeLocation);
                setShowRoute(true);
            } else {
                findNearestSafeLocation();
            }
            window.history.replaceState({}, document.title);
        }
    }, [routeLocation.state]);

    // SOS location update
    useEffect(() => {
        if (sosActive && currentLocation && sosData && updateSOSLocation) {
            updateSOSLocation(currentLocation);
        }
    }, [currentLocation, sosActive, sosData, updateSOSLocation]);

    // Clear all expanded areas
    const clearAllExpandedAreas = useCallback(() => {
        setVisibleAreaReports(new Set());
        setSelectedArea(null);
    }, []);

    // Distance calculation
    const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }, []);

    // Emergency and routing handlers
    const toggleEmergencyMode = useCallback(() => {
        if (emergencyMode) {
            setEmergencyMode(false);
            setNearestSafeLocation(null);
            setShowRoute(false);
            setRouteInfo(null);
        } else {
            setEmergencyMode(true);
            findNearestSafeLocation();
        }
    }, [emergencyMode]);

    // Find nearest safe location functionality
    const findNearestSafeLocation = useCallback(async () => {
        if (!currentLocation) return;

        setFindingLocation(true);
        try {
            const allSafeLocations = [];

            hospitals.forEach(hospital => {
                const distance = calculateDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    hospital.latitude, hospital.longitude
                );
                allSafeLocations.push({
                    ...hospital,
                    type: 'hospital',
                    distance: Math.round(distance),
                    emergencyServices: '🏥 Emergency Medical Services',
                    icon: 'hospital'
                });
            });

            policeStations.forEach(station => {
                const distance = calculateDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    station.latitude, station.longitude
                );
                allSafeLocations.push({
                    ...station,
                    type: 'police',
                    distance: Math.round(distance),
                    emergencyServices: '🚓 Emergency Law Enforcement',
                    icon: 'police'
                });
            });

            if (allSafeLocations.length > 0) {
                allSafeLocations.sort((a, b) => a.distance - b.distance);
                const nearest = allSafeLocations[0];
                setNearestSafeLocation(nearest);
                setShowRoute(true);

                // Speech synthesis for emergency mode
                if ('speechSynthesis' in window) {
                    const message = new SpeechSynthesisUtterance(
                        `Emergency navigation activated. Proceeding to ${nearest.name}. Distance: ${nearest.distance} meters.`
                    );
                    message.rate = 0.9;
                    message.pitch = 1;
                    speechSynthesis.speak(message);
                }
            }
        } catch (err) {
            console.error('Error finding safe location:', err);
            setError('Error finding safe location');
        } finally {
            setFindingLocation(false);
        }
    }, [currentLocation, hospitals, policeStations, calculateDistance]);

    const handleRouteFound = useCallback((routeData) => {
        setRouteInfo(routeData);
    }, []);

    const handleRoutingError = useCallback((error) => {
        console.error('Routing error:', error);
        setError('Unable to calculate route');
    }, []);

    // Memoized components for performance
    const memoizedChloroplethCells = useMemo(() => {
        return chloroplethData.map((cell, index) => {
            return (
                <Rectangle
                    key={`chloropleth-${index}`}
                    bounds={[
                        [cell.latitude - (cell.grid_size || 0.005) / 2, cell.longitude - (cell.grid_size || 0.005) / 2],
                        [cell.latitude + (cell.grid_size || 0.005) / 2, cell.longitude + (cell.grid_size || 0.005) / 2]
                    ]}
                    pathOptions={{
                        fillColor: cell.risk_score >= 12 ? '#7f1d1d' :
                            cell.risk_score >= 9 ? '#dc2626' :
                                cell.risk_score >= 6 ? '#ea580c' :
                                    cell.risk_score >= 4 ? '#f59e0b' :
                                        cell.risk_score >= 2 ? '#eab308' :
                                            cell.risk_score >= 0.5 ? '#84cc16' : '#22c55e',
                        fillOpacity: 0.6,
                        color: '#ffffff',
                        weight: 1,
                        opacity: 1
                    }}
                >
                    <Popup>
                        <div className="p-3 min-w-[200px]">
                            <h4 className="font-bold text-lg mb-2 text-orange-700">
                                📊 Risk Assessment
                            </h4>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <div className="text-sm space-y-1">
                                    <div><strong>Risk Score:</strong> {cell.risk_score.toFixed(2)}/15</div>
                                    <div><strong>Grid Size:</strong> {(cell.grid_size || 0.005).toFixed(5)}°</div>
                                    <div><strong>Coordinates:</strong> {cell.latitude.toFixed(4)}, {cell.longitude.toFixed(4)}</div>
                                </div>
                            </div>
                        </div>
                    </Popup>
                </Rectangle>
            );
        });
    }, [chloroplethData]);

    // if (loading) {
    //     return (
    //         <>
    //             <Navbar />
    //             <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    //                 <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
    //                     <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
    //                     <h3 className="text-xl font-bold text-gray-800 mb-2">Loading CityShield Safety Map</h3>
    //                     <p className="text-gray-600">Getting your location and loading safety intelligence...</p>
    //                     {locationLoading && (
    //                         <p className="text-blue-600 text-sm mt-2">📍 Detecting your location...</p>
    //                     )}
    //                 </div>
    //             </div>
    //         </>
    //     );
    // }
    if (loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
                    <div className="text-center max-w-md mx-auto px-4">
                        <div className="w-20 h-20 mx-auto mb-6 bg-blue-600 rounded-full flex items-center justify-center relative">
                            <Shield className="w-10 h-10 text-white" />
                            <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping"></div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">
                            Loading CityShield...
                        </h3>
                        {/* <p className="text-gray-600 mb-4">📡 Connecting to community reports and safety data...</p> */}
                        <div className="flex justify-center space-x-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    </div>
                </div>
            </>
        );
    }


    if (error && !currentLocation) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Unable to Load Safety Map</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                        >
                            🔄 Reload Map
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />

            {/* Clean Top Banner */}
            <CleanTopBanner
                currentLocation={currentLocation}
                emergencyMode={emergencyMode}
                findingLocation={findingLocation}
                nearestSafeLocation={nearestSafeLocation}
                toggleEmergencyMode={toggleEmergencyMode}
                dataLoading={dataLoading}
                getCurrentLocation={getCurrentLocation}
                locationLoading={locationLoading}
                onClearRoute={() => {
                    setNearestSafeLocation(null);
                    setShowRoute(false);
                    setRouteInfo(null);
                }}
                onBackToCommunity={() => window.history.back()}
            />

            {/* All Emergency Status Notifications */}
            <div className="relative z-50">
                {findingLocation && (
                    <div className="fixed top-24 sm:top-28 left-1/2 transform -translate-x-1/2 z-[9999] bg-red-600 text-white px-6 py-3 rounded-lg shadow-2xl border border-red-700 animate-pulse mx-4">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🚨</span>
                                <span className="font-semibold text-sm">Finding nearest safe location...</span>
                            </div>
                        </div>
                    </div>
                )}

                {emergencyMode && nearestSafeLocation && routeInfo && (
                    <div className="fixed top-15 sm:top-28 sm:left-1/2 sm:transform sm:-translate-x-1/2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-xl shadow-2xl border border-green-500 max-w-sm animate-slide-down mx-4">
                        <div className="text-center">
                            <div className="text-lg font-bold mb-2 flex items-center justify-center gap-2">
                                {/* <span className="text-2xl">🛡️</span> */}
                                <span className="text-sm">EMERGENCY NAVIGATION ACTIVE</span>
                            </div>
                            <div className="text-sm mb-2">
                                <strong>{nearestSafeLocation.name}</strong>
                            </div>
                            <div className="text-xs space-y-1 mb-3">
                                <div className="flex justify-center gap-4">
                                    <span>📏 {routeInfo.distance}m</span>
                                    <span>⏱️ ~{Math.round(routeInfo.duration / 60)} min</span>
                                </div>
                                <div className="text-center text-xs opacity-90 mt-2">
                                    {nearestSafeLocation.emergencyServices}
                                </div>
                            </div>
                            <button
                                onClick={toggleEmergencyMode}
                                className="bg-white text-green-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-md"
                            >
                                End Navigation
                            </button>
                        </div>
                    </div>
                )}

                {sosActive && (
                    <div className="fixed top-24 right-4 z-[9999] bg-red-700 text-white px-4 py-2 rounded-lg shadow-xl border-2 border-red-500 animate-pulse">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🆘</span>
                            <span className="font-bold text-sm">SOS ACTIVE</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Route Status */}
            {routeInfo && nearestSafeLocation && !emergencyMode && (
                <div className="fixed top-24 sm:top-28 left-1/2 transform -translate-x-1/2 z-[9999] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 sm:py-3 rounded-xl shadow-2xl mx-4 max-w-xs sm:max-w-sm">
                    <div className="text-center">
                        <div className="text-sm font-bold mb-1 flex items-center justify-center gap-2">
                            <span>🗺️</span>
                            <span>INCIDENT ROUTE</span>
                        </div>
                        <div className="text-xs space-y-1">
                            <div><strong>{nearestSafeLocation.name}</strong></div>
                            <div>📏 {routeInfo.distance}m • ⏱️ ~{Math.round(routeInfo.duration / 60)} min</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Layout - Responsive */}
            <div className="bg-gray-50 min-h-screen">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row gap-6">

                        {/* Enhanced Sidebar with ALL missing features */}
                        <ResponsiveSidebar
                            visibleAreaReports={visibleAreaReports}
                            currentLocation={currentLocation}
                            filters={filters}
                            setFilters={setFilters}
                            clearAllExpandedAreas={clearAllExpandedAreas}
                            getCurrentLocation={getCurrentLocation}
                            stats={stats}
                            nearbyReports={nearbyReports}
                            hospitals={hospitals}
                            policeStations={policeStations}
                            safetyZones={safetyZones}
                            chloroplethData={chloroplethData}
                            selectedArea={selectedArea}
                        />

                        {/* Map Container */}
                        <div className="flex-1 relative order-1 md:order-2">
                            <div className="map-container bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden" style={{ height: '70vh', minHeight: '500px' }}>
                                {currentLocation ? (
                                    <div className="map-wrapper w-full h-full">
                                        <MapContainer
                                            center={[currentLocation.latitude, currentLocation.longitude]}
                                            zoom={13}
                                            style={{ height: '100%', width: '100%' }}
                                            className="z-0"
                                            zoomControl={true}
                                            preferCanvas={true}
                                            whenCreated={(mapInstance) => {
                                                mapRef.current = mapInstance;
                                                const resizeMap = () => {
                                                    setTimeout(() => {
                                                        if (mapInstance && mapInstance.getContainer()) {
                                                            mapInstance.invalidateSize({ animate: false, pan: false });
                                                        }
                                                    }, 100);
                                                };

                                                resizeMap();
                                                window.addEventListener('resize', resizeMap);
                                                return () => window.removeEventListener('resize', resizeMap);
                                            }}
                                        >
                                            <MapResizeHandler />
                                            <MapAutoCenter currentLocation={currentLocation} />

                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                maxZoom={18}
                                            />

                                            {/* Route Component */}
                                            {showRoute && nearestSafeLocation && (
                                                <SafetyRoute
                                                    startLocation={currentLocation}
                                                    endLocation={nearestSafeLocation}
                                                    onRouteFound={handleRouteFound}
                                                    onRoutingError={handleRoutingError}
                                                    isActive={true}
                                                    routeColor={emergencyMode || sosActive ? '#ef4444' : '#f59e0b'}
                                                />
                                            )}

                                            {/* NEW: Facility Routing Component */}
                                            {facilityRoute && (
                                                <SafetyRoute
                                                    startLocation={facilityRoute.start}
                                                    endLocation={facilityRoute.end}
                                                    onRouteFound={handleFacilityRouteFound}
                                                    onRoutingError={handleFacilityRoutingError}
                                                    isActive={true}
                                                    routeColor={facilityRoute.type === 'hospital' ? '#3b82f6' : '#059669'}
                                                    routeId={facilityRoute.id}
                                                />
                                            )}

                                            {/* Current Location Marker */}
                                            <Marker
                                                position={[currentLocation.latitude, currentLocation.longitude]}
                                                icon={createIcon('user', [35, 35])}
                                            >
                                                <Popup>
                                                    <div className="text-center p-4">
                                                        <h4 className="font-bold text-green-600 text-xl mb-3">📍 You Are Here</h4>
                                                        <p className="text-sm text-gray-600 mb-3">
                                                            Protected by CityShield Intelligence
                                                            {sosActive && <span className="block text-red-600 font-bold">🆘 SOS ACTIVE</span>}
                                                        </p>
                                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                                                            <div>Latitude: {currentLocation.latitude.toFixed(6)}</div>
                                                            <div>Longitude: {currentLocation.longitude.toFixed(6)}</div>
                                                            <div>Accuracy: ±{Math.round(currentLocation.accuracy)}m</div>
                                                            <div className="text-green-600 font-semibold">Enhanced Analysis: Active</div>
                                                            {(emergencyMode || sosActive) && (
                                                                <div className="text-red-600 font-semibold">🚨 Emergency Mode: ACTIVE</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Marker>

                                            {/* Full Chloropleth Analysis */}
                                            {filters.showChloropleth && memoizedChloroplethCells}

                                            {/* Safe Zones */}
                                            {safetyZones.safe_zones.map((zone, index) => (
                                                <Circle
                                                    key={`safe-${index}`}
                                                    center={[zone.center_latitude, zone.center_longitude]}
                                                    radius={zone.radius}
                                                    pathOptions={{
                                                        color: '#16a34a',
                                                        fillColor: '#bbf7d0',
                                                        opacity: 0.8,
                                                        fillOpacity: 0.3,
                                                        weight: 2,
                                                        dashArray: "5, 5"
                                                    }}
                                                >
                                                    <Popup>
                                                        <div className="text-center p-3">
                                                            <h4 className="font-bold text-green-600 text-lg mb-2">🛡️ Safe Zone</h4>
                                                            <p className="text-sm text-gray-600 mb-2">{zone.reason}</p>
                                                            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                                                                <p className="text-xs text-green-700 font-semibold">
                                                                    Radius: {zone.radius}m | Risk Score: {zone.risk_score}
                                                                </p>
                                                                <p className="text-xs text-green-600 mt-1">
                                                                    {zone.facility_type === 'hospital' ? '🏥 Hospital Safety Zone' : '🚓 Police Safety Zone'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </Circle>
                                            ))}

                                            {/* Danger Zones */}
                                            {safetyZones.danger_zones.map((zone, index) => (
                                                <Circle
                                                    key={`danger-${index}`}
                                                    center={[zone.center_latitude, zone.center_longitude]}
                                                    radius={zone.radius}
                                                    pathOptions={{
                                                        color: zone.danger_level === 'critical' ? '#dc2626' :
                                                            zone.danger_level === 'high' ? '#ea580c' : '#f59e0b',
                                                        fillColor: zone.danger_level === 'critical' ? '#fecaca' :
                                                            zone.danger_level === 'high' ? '#fed7aa' : '#fef3c7',
                                                        opacity: 0.8,
                                                        fillOpacity: zone.danger_level === 'critical' ? 0.5 : 0.4,
                                                        weight: 3
                                                    }}
                                                >
                                                    <Popup>
                                                        <div className="text-center p-3">
                                                            <h4 className={`font-bold text-lg mb-2 ${zone.danger_level === 'critical' ? 'text-red-600' :
                                                                zone.danger_level === 'high' ? 'text-orange-600' : 'text-yellow-600'
                                                                }`}>
                                                                {zone.danger_level === 'critical' ? '🚨 Critical Zone' :
                                                                    zone.danger_level === 'high' ? '⚠️ High Risk Zone' : '🟡 Medium Risk Zone'}
                                                            </h4>
                                                            <p className="text-sm text-gray-600 mb-2">{zone.reason}</p>
                                                            <div className="space-y-2">
                                                                <div className="bg-gray-100 rounded-lg p-2 text-xs">
                                                                    <strong>Manual Risk Score:</strong> {zone.risk_score}/15
                                                                </div>
                                                                <div className="bg-gray-100 rounded-lg p-2 text-xs">
                                                                    <strong>Total Incidents:</strong> {zone.incident_count}
                                                                </div>
                                                                {zone.sos_count > 0 && (
                                                                    <div className="bg-red-100 border border-red-300 rounded-lg p-2 text-xs">
                                                                        <strong className="text-red-800">{zone.sos_count} SOS Emergency</strong>
                                                                    </div>
                                                                )}
                                                                {zone.critical_count > 0 && (
                                                                    <div className="bg-orange-100 border border-orange-300 rounded-lg p-2 text-xs">
                                                                        <strong className="text-orange-800">{zone.critical_count} Critical Incidents</strong>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </Circle>
                                            ))}

                                            {/* All Safety Reports Display */}
                                            {filters.showReports && nearbyReports.map(report => (
                                                <Marker
                                                    key={`report-${report.id}`}
                                                    position={[report.latitude, report.longitude]}
                                                    icon={createIcon(report.report_type, [32, 32])}
                                                >
                                                    <Popup>
                                                        <div className="p-5 min-w-[320px] max-w-[400px]">
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <div className={`px-4 py-2 rounded-full text-xs font-bold border-2 ${report.report_type === 'sos' ? 'bg-red-100 text-red-800 border-red-300' :
                                                                    report.report_type === 'crime' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                                        report.report_type === 'harassment' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                                            report.report_type === 'safety' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                                                                report.report_type === 'infrastructure' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                                                                    'bg-green-100 text-green-800 border-green-300'
                                                                    }`}>
                                                                    {report.report_type === 'sos' ? '🆘 SOS EMERGENCY' : report.report_type.toUpperCase()}
                                                                </div>
                                                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                                    report.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                    {report.status.toUpperCase()}
                                                                </div>
                                                            </div>

                                                            <h3 className="font-bold text-xl text-gray-900 mb-3">
                                                                {report.title}
                                                            </h3>

                                                            <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                                                                {report.description}
                                                            </p>

                                                            <div className="text-sm text-gray-500 space-y-2 border-t pt-3">
                                                                {report.location && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-green-500">📍</span>
                                                                        <span className="font-medium">{report.location}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-400">🕒</span>
                                                                    <span>{new Date(report.created_at).toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-blue-500">👤</span>
                                                                    <span>{report.reported_by || 'Anonymous'}</span>
                                                                </div>
                                                                {report.distance && (
                                                                    <div className="flex items-center gap-2 text-green-600">
                                                                        <span>📏</span>
                                                                        <span>{report.distance}m from your location</span>
                                                                    </div>
                                                                )}
                                                                {report.report_type === 'sos' && (
                                                                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mt-3">
                                                                        <p className="text-red-800 font-bold text-xs flex items-center gap-2">
                                                                            <span className="text-lg pulse">🚨</span>
                                                                            ACTIVE EMERGENCY - Enhanced Priority Alert
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            ))}

                                            {/* Enhanced Hospital Markers with Get Directions */}
                                            {filters.showHospitals && hospitals.map((hospital, index) => {
                                                const hospitalId = `hospital-${index}`;
                                                const currentRouteInfo = facilityRouteInfo[hospitalId];
                                                const isActiveRoute = facilityRoute?.id === hospitalId;

                                                return (
                                                    <Marker
                                                        key={hospitalId}
                                                        position={[hospital.latitude, hospital.longitude]}
                                                        icon={createIcon('hospital', [32, 32])}
                                                    >
                                                        <Popup maxWidth={320}>
                                                            <div className="text-center p-4">
                                                                <h4 className="font-bold text-blue-600 text-lg mb-3">
                                                                    🏥 {hospital.name}
                                                                </h4>
                                                                <p className="text-sm text-gray-600 mb-3">
                                                                    24/7 Emergency Medical Services
                                                                </p>

                                                                {hospital.address && (
                                                                    <p className="text-xs text-gray-500 mb-3 text-left">
                                                                        📍 {hospital.address}
                                                                    </p>
                                                                )}

                                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                                                    <div className="text-xs space-y-1 text-left">
                                                                        <div><strong>Source:</strong> {hospital.source === 'overpass' ? 'OpenStreetMap API' : 'Database'}</div>

                                                                        {hospital.distance && (
                                                                            <div><strong>Direct Distance:</strong> {hospital.distance}m from your location</div>
                                                                        )}

                                                                        {isActiveRoute && currentRouteInfo && (
                                                                            <div className="border-t pt-2 mt-2">
                                                                                <div className="text-green-600 font-semibold">
                                                                                    <div>🗺️ <strong>Route Distance:</strong> {currentRouteInfo.distance}m</div>
                                                                                    <div>⏱️ <strong>Travel Time:</strong> ~{Math.round(currentRouteInfo.duration / 60)} minutes</div>
                                                                                    <div>🚗 <strong>Mode:</strong> Driving directions</div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    {!isActiveRoute ? (
                                                                        <button
                                                                            onClick={() => handleGetDirections({
                                                                                ...hospital,
                                                                                id: hospitalId,
                                                                                type: 'hospital'
                                                                            })}
                                                                            disabled={!currentLocation}
                                                                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                                        >
                                                                            {!currentLocation ? (
                                                                                <>
                                                                                    <span>⚠️</span>
                                                                                    <span>Location Required</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <span>🗺️</span>
                                                                                    <span>Get Directions</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            <div className="bg-green-100 border border-green-300 rounded-lg p-2">
                                                                                <div className="text-green-800 text-sm font-medium flex items-center gap-2">
                                                                                    <span>🧭</span>
                                                                                    <span>Route Active</span>
                                                                                </div>
                                                                            </div>

                                                                            <button
                                                                                onClick={clearFacilityRoute}
                                                                                className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                                                            >
                                                                                <span>✕</span>
                                                                                <span>Clear Route</span>
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {/* Optional: Call button */}
                                                                    {hospital.phone && (
                                                                        <a
                                                                            href={`tel:${hospital.phone}`}
                                                                            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                                                        >
                                                                            <span>📞</span>
                                                                            <span>Call Hospital</span>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </Popup>
                                                    </Marker>
                                                );
                                            })}

                                            {/* Enhanced Police Station Markers with Get Directions */}
                                            {filters.showPolice && policeStations.map((station, index) => {
                                                const stationId = `police-${index}`;
                                                const currentRouteInfo = facilityRouteInfo[stationId];
                                                const isActiveRoute = facilityRoute?.id === stationId;

                                                return (
                                                    <Marker
                                                        key={stationId}
                                                        position={[station.latitude, station.longitude]}
                                                        icon={createIcon('police', [32, 32])}
                                                    >
                                                        <Popup maxWidth={320}>
                                                            <div className="text-center p-4">
                                                                <h4 className="font-bold text-green-600 text-lg mb-3">
                                                                    🚓 {station.name}
                                                                </h4>
                                                                <p className="text-sm text-gray-600 mb-3">
                                                                    24/7 Law Enforcement & Safety Services
                                                                </p>

                                                                {station.address && (
                                                                    <p className="text-xs text-gray-500 mb-3 text-left">
                                                                        📍 {station.address}
                                                                    </p>
                                                                )}

                                                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                                                    <div className="text-xs space-y-1 text-left">
                                                                        <div><strong>Source:</strong> {station.source === 'csv' ? 'Official Database' : 'OpenStreetMap API'}</div>

                                                                        {station.distance && (
                                                                            <div><strong>Direct Distance:</strong> {station.distance}m from your location</div>
                                                                        )}

                                                                        {isActiveRoute && currentRouteInfo && (
                                                                            <div className="border-t pt-2 mt-2">
                                                                                <div className="text-green-600 font-semibold">
                                                                                    <div>🗺️ <strong>Route Distance:</strong> {currentRouteInfo.distance}m</div>
                                                                                    <div>⏱️ <strong>Travel Time:</strong> ~{Math.round(currentRouteInfo.duration / 60)} minutes</div>
                                                                                    <div>🚔 <strong>Mode:</strong> Emergency route</div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    {!isActiveRoute ? (
                                                                        <button
                                                                            onClick={() => handleGetDirections({
                                                                                ...station,
                                                                                id: stationId,
                                                                                type: 'police'
                                                                            })}
                                                                            disabled={!currentLocation}
                                                                            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                                        >
                                                                            {!currentLocation ? (
                                                                                <>
                                                                                    <span>⚠️</span>
                                                                                    <span>Location Required</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <span>🗺️</span>
                                                                                    <span>Get Directions</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            <div className="bg-green-100 border border-green-300 rounded-lg p-2">
                                                                                <div className="text-green-800 text-sm font-medium flex items-center gap-2">
                                                                                    <span>🧭</span>
                                                                                    <span>Route Active</span>
                                                                                </div>
                                                                            </div>

                                                                            <button
                                                                                onClick={clearFacilityRoute}
                                                                                className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                                                            >
                                                                                <span>✕</span>
                                                                                <span>Clear Route</span>
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {/* Emergency call button */}
                                                                    <a
                                                                        href="tel:100"
                                                                        className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                                                    >
                                                                        <span>🚨</span>
                                                                        <span>Emergency Call</span>
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </Popup>
                                                    </Marker>
                                                );
                                            })}

                                            {/* Incident/Emergency Location Marker */}
                                            {nearestSafeLocation && (
                                                <Marker
                                                    position={[nearestSafeLocation.latitude, nearestSafeLocation.longitude]}
                                                    icon={createIcon(nearestSafeLocation.type === 'sos' ? 'sos' :
                                                        nearestSafeLocation.type === 'admin_alert' ? 'police' :
                                                            emergencyMode ? nearestSafeLocation.type : 'incident', [45, 45])}
                                                >
                                                    <Popup>
                                                        <div className="text-center p-4 min-w-[250px]">
                                                            <h4 className={`font-bold text-lg mb-2 ${emergencyMode ? 'text-red-600' :
                                                                nearestSafeLocation.type === 'sos' ? 'text-red-600' : 'text-orange-600'
                                                                }`}>
                                                                {emergencyMode ? '🛡️ EMERGENCY SAFE LOCATION' :
                                                                    nearestSafeLocation.type === 'sos' ? '🚨 SOS INCIDENT' :
                                                                        '📍 INCIDENT LOCATION'}
                                                            </h4>
                                                            <p className="font-semibold mb-1">{nearestSafeLocation.name}</p>
                                                            <p className="text-sm text-gray-600 mb-2">{nearestSafeLocation.emergencyServices}</p>
                                                            <div className={`${emergencyMode ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                                                                } border rounded-lg p-2 text-xs`}>
                                                                <div>📏 Distance: {nearestSafeLocation.distance || 'Calculating...'}m</div>
                                                                {routeInfo && <div>⏱️ ~{Math.round(routeInfo.duration / 60)} minutes</div>}
                                                                {nearestSafeLocation.severity && (
                                                                    <div className="mt-1 font-semibold">
                                                                        Severity: {nearestSafeLocation.severity?.charAt(0).toUpperCase() + nearestSafeLocation.severity?.slice(1)}
                                                                    </div>
                                                                )}
                                                                <div className="mt-1 font-semibold">
                                                                    Source: {nearestSafeLocation.source === 'csv' ? 'Official Database' : 'Maps API'}
                                                                </div>
                                                                {sosActive && (
                                                                    <div className="mt-1 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                                                                        🆘 SOS ALERT SENT
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            )}
                                        </MapContainer>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full bg-gray-50">
                                        <div className="text-center">
                                            <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="text-gray-600">Initializing comprehensive safety analysis...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading Overlays */}
            {/* {(facilitiesLoading || zonesLoading) && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[10000] pointer-events-none">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Loading Safety Data</h3>
                            <div className="space-y-1 text-sm text-gray-600">
                                {facilitiesLoading && <div>🏥 Loading emergency facilities...</div>}
                                {zonesLoading && <div>📊 Analyzing risk zones...</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )} */}

            {/* Data Loading Overlay */}
            {/* {dataLoading && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[9999] pointer-events-none">
                    <div className="bg-white rounded-xl shadow-xl p-4 max-w-xs mx-4">
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <div className="text-sm font-semibold text-gray-900">Analyzing Risk Zones...</div>
                            <div className="text-xs text-gray-600 mt-1">Comprehensive safety analysis in progress</div>
                        </div>
                    </div>
                </div>
            )} */}
        </>
    );
}
