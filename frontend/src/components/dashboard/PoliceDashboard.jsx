import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Shield, AlertTriangle, Users, Car, TrendingUp, Search, Bell, Radio, Play, MapPin,
    User, Eye, Clock, CheckCircle, Activity, Filter, RefreshCw,
    Maximize2, MapIcon, Loader2,
    Navigation, FileText, FileType2, Menu, X, Plus, Edit, Trash2, MoreVertical, UserPlus,
    FileUser
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

import Navbar from '../common/Navbar';
import {
    getReports, getSosAlerts, getVolunteers, getPatrolTeams,
    getDashboardStats, updateReportStatus, assignTeamToSOS, releaseOfficialAlert,
    patrolTeamServices, getCurrentLocation, getDashboardStatsWithLocation,
    getSosAlertsWithLocation, getReportsWithLocation
} from '../../services/police';
import VideoStreamModal from './VideoStreamModal';
import sosService from '../../services/sos';

// Map imports
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';

// Custom marker icons
const sosIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" width="32" height="32">
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
        </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

const incidentIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64=' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue" width="24" height="24">
            <circle cx="12" cy="12" r="10"/>
        </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
});

const userLocationIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64=' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue" width="24" height="24">
            <circle cx="12" cy="12" r="8" fill="blue" stroke="white" stroke-width="2"/>
        </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const PANEL_PAD = 'px-3 py-2 sm:px-5 sm:py-3';

// Service functions for Police Station and Officer Management
const getPoliceStations = async () => {
    try {
        const location = await getCurrentLocation();
        const response = await api.get('/safety/nearby-police/', {
            params: {
                latitude: location.latitude,
                longitude: location.longitude
            }
        });
        return response.data?.police_stations || [];
    } catch (error) {
        console.error('Error fetching police stations:', error);
        return [];
    }
};


const addOfficer = async (officerData) => {
    try {
        console.log('Adding officer with data:', officerData);
        // If api.POST already sets method, don't include it again!
        const response = await api.post('/users/register-police/', {
            name: officerData.name,
            username: officerData.email,
            email: officerData.email,
            password: officerData.password,
            phone: officerData.phone,
            role: 'police',
            police_station: parseInt(officerData.station_id)
        });
        const data = await response.data;
        console.log('Add officer response:', response);
        return {
            success: response.status,
            data,
            message: response.status === 201 ? 'Officer added successfully' : (JSON.stringify(data) || 'Failed to add officer')
        };
    } catch (error) {
        console.error('Error adding officer:', error);
        return { success: false, message: 'Network error' };
    }
};

const PoliceDashboard = () => {
    const [activeSection, setActiveSection] = useState('emergency');
    const [isLoading, setIsLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [locationRadius, setLocationRadius] = useState(5);
    const [locationEnabled, setLocationEnabled] = useState(false);
    const [allReports, setAllReports] = useState([]);
    const [filters, setFilters] = useState({
        query: '',
        type: 'all'
    });

    const [data, setData] = useState({
        emergencyAlerts: [],
        criticalReports: [],
        patrolUnits: [],
        volunteers: [],
        stats: {}
    });

    const [selectedIncident, setSelectedIncident] = useState(null);
    const [selectedStream, setSelectedStream] = useState(null);
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [availableOfficers, setAvailableOfficers] = useState([]);

    // New state for officer management
    const [showAddOfficer, setShowAddOfficer] = useState(false);
    const [stations, setStations] = useState([]);

    // Get user location on component mount
    useEffect(() => {
        const getLocation = async () => {
            try {
                const location = await getCurrentLocation();
                if (location) {
                    setUserLocation(location);
                    setLocationEnabled(true);
                    // toast.success('📍 Location enabled - showing nearby incidents');
                }
            } catch (error) {
                console.warn('Location access denied:', error);
                setLocationEnabled(false);
            }
        };
        getLocation();
    }, []);

    // In your PoliceDashboard component, when you need to fetch stations:
    useEffect(() => {
        if (userLocation) {
            // Pass the actual location coordinates
            getPoliceStations().then(stationList => {
                setStations(stationList);
            });
        }
    }, [activeSection]);

    // Fetch police stations when teams section is active
    useEffect(() => {
        if (activeSection === 'teams') {
            getPoliceStations().then(stationList => {
                setStations(stationList);
            });
        }
    }, [activeSection]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSelectedIncident(null);
                setSidebarOpen(false);
                setShowTeamForm(false);
                setEditingTeam(null);
                setShowAddOfficer(false);
            }
            if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                refresh();
            }
            if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                toggleLocationFiltering();
            }
            if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                onBroadcast();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleLocationFiltering = () => {
        setLocationEnabled(!locationEnabled);
        if (!locationEnabled && !userLocation) {
            getCurrentLocation().then(location => {
                if (location) {
                    setUserLocation(location);
                    setLocationEnabled(true);
                    refresh();
                    toast.success('📍 Location enabled');
                }
            }).catch(() => {
                toast.error('Unable to access location');
            });
        } else {
            toast.error(locationEnabled ? '📍 Location disabled' : '📍 Location enabled');
            refresh();
        }
    };

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            let reports, sos, vols, teams, stats, allReportsData;

            if (locationEnabled && userLocation) {
                [reports, sos, vols, teams, stats, allReportsData] = await Promise.all([
                    getReportsWithLocation(filters.type, locationRadius),
                    getSosAlertsWithLocation(locationRadius),
                    getVolunteers(),
                    getPatrolTeams(),
                    getDashboardStatsWithLocation(locationRadius),
                    // getAllReportsCombined(userLocation, locationRadius)
                ]);
            } else {
                [reports, sos, vols, teams, stats, allReportsData] = await Promise.all([
                    getReports(filters.type),
                    getSosAlerts(),
                    getVolunteers(),
                    getPatrolTeams(),
                    getDashboardStats(),
                    // getAllReportsCombined()
                ]);
            }

            const criticalReports = (reports?.data?.results || []).filter(r =>
                ['harassment', 'crime', 'safety'].includes(r.report_type)
            );

            const payload = {
                emergencyAlerts: sos?.data?.results || [],
                criticalReports,
                patrolUnits: teams?.data?.results || [],
                volunteers: vols?.data?.results || [],
                stats: stats?.data || {}
            };

            setData(payload);
            // setAllReports(allReportsData?.data?.results || []);

            // Fetch available officers for team management
            if (activeSection === 'teams') {
                try {
                    const officersRes = await patrolTeamServices.getAvailableOfficers();
                    if (officersRes.success) {
                        console.log('Available officers:', officersRes.data.officers);
                        setAvailableOfficers(officersRes.data.officers || []);
                    }
                } catch (error) {
                    console.warn('Failed to fetch officers:', error);
                }
            }

        } catch (e) {
            console.error('Dashboard refresh error:', e);
            toast.error(`Sync failed: ${e.message || 'Network error'}`);
        } finally {
            setIsLoading(false);
        }
    }, [filters.type, locationEnabled, userLocation, locationRadius, activeSection]);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 30000);
        return () => clearInterval(id);
    }, [refresh]);

    // Officer management function
    const handleAddOfficer = async (officerData) => {
        const t = toast.loading('Adding police officer...');
        try {
            const res = await addOfficer({
                name: officerData.name,
                email: officerData.email,
                password: officerData.password,
                phone: officerData.phone,
                // station_id: officerData.station
            });
            if (res.success) {
                toast.success('👮 Police officer added successfully', { id: t });
                refresh(); // Refresh to update officer lists
                return true;
            } else {
                toast.error(res.message || 'Failed to add officer', { id: t });
                return false;
            }
        } catch (error) {
            console.error('Error adding officer:', error);
            toast.error('Network error', { id: t });
            return false;
        }
    };

    // Team management functions
    const handleCreateTeam = async (teamData) => {
        const t = toast.loading('Creating patrol team...');
        try {
            // Ensure station field is properly included
            const payload = {
                team_id: teamData.team_id,
                station: parseInt(teamData.station), // Ensure it's an integer
                team_leader: parseInt(teamData.team_leader),
                members_count: parseInt(teamData.members_count),
                vehicle_number: teamData.vehicle_number,
                is_active: teamData.is_active
            };

            const res = await patrolTeamServices.createPatrolTeam(payload);
            if (res.success) {
                toast.success('✅ Patrol team created successfully', { id: t });
                setShowTeamForm(false);
                refresh();
            } else {
                toast.error(res.message || 'Failed to create team', { id: t });
            }
        } catch (error) {
            console.error('Error creating team:', error);
            toast.error('Network error', { id: t });
        }
    };

    const handleUpdateTeam = async (teamId, teamData) => {
        const t = toast.loading('Updating patrol team...');
        try {
            // Ensure station field is properly included
            const payload = {
                team_id: teamData.team_id,
                station: parseInt(teamData.station),
                team_leader: parseInt(teamData.team_leader),
                members_count: parseInt(teamData.members_count),
                vehicle_number: teamData.vehicle_number,
                is_active: teamData.is_active
            };

            const res = await patrolTeamServices.updatePatrolTeam(teamId, payload);
            if (res.success) {
                toast.success('✅ Patrol team updated successfully', { id: t });
                setEditingTeam(null);
                refresh();
            } else {
                toast.error(res.message || 'Failed to update team', { id: t });
            }
        } catch (error) {
            console.error('Error updating team:', error);
            toast.error('Network error', { id: t });
        }
    };

    const handleDeleteTeam = async (teamId) => {
        if (!confirm('⚠️ Are you sure you want to delete this patrol team? This action cannot be undone.')) return;

        const t = toast.loading('Deleting patrol team...');
        try {
            const res = await patrolTeamServices.deletePatrolTeam(teamId);
            if (res.success) {
                toast.success('🗑️ Patrol team deleted successfully', { id: t });
                refresh();
            } else {
                toast.error(res.message || 'Failed to delete team', { id: t });
            }
        } catch (error) {
            console.error('Error deleting team:', error);
            toast.error('Network error', { id: t });
        }
    };

    const handleToggleTeamStatus = async (teamId) => {
        const t = toast.loading('Updating team status...');
        try {
            const res = await patrolTeamServices.toggleTeamStatus(teamId);
            if (res.success) {
                toast.success('Team status updated', { id: t });
                refresh();
            } else {
                toast.error(res.message || 'Failed to update status', { id: t });
            }
        } catch (error) {
            console.error('Error updating team status:', error);
            toast.error('Network error', { id: t });
        }
    };

    const handleAssignMember = async (teamId, userId) => {
        const t = toast.loading('Assigning team member...');
        try {
            const res = await patrolTeamServices.assignMember(teamId, userId);
            if (res.success) {
                toast.success('👤 Member assigned successfully', { id: t });
                refresh();
            } else {
                toast.error(res.message || 'Failed to assign member', { id: t });
            }
        } catch (error) {
            console.error('Error assigning member:', error);
            toast.error('Network error', { id: t });
        }
    };

    const handleRemoveMember = async (teamId, userId) => {
        if (!confirm('Remove this member from the team?')) return;

        const t = toast.loading('Removing team member...');
        try {
            const res = await patrolTeamServices.removeMember(teamId, userId);
            if (res.success) {
                toast.success('👤 Member removed successfully', { id: t });
                refresh();
            } else {
                toast.error(res.message || 'Failed to remove member', { id: t });
            }
        } catch (error) {
            console.error('Error removing member:', error);
            toast.error('Network error', { id: t });
        }
    };

    // Existing functions
    const onAssignTeam = async (emergencyId, teamId) => {
        if (!teamId) return toast.error('Please select a team');

        const selectedTeam = data.patrolUnits.find(u => u.id === teamId);
        const teamName = selectedTeam ? `${selectedTeam.team_id} (${selectedTeam.station_name})` : 'Unit';

        const t = toast.loading(`Assigning ${teamName}...`);

        try {
            const res = await assignTeamToSOS(emergencyId, teamId);
            if (!res?.success) {
                toast.error(res?.message || 'Assignment failed', { id: t });
                return;
            }
            toast.success(`🚔 ${teamName} assigned successfully`, { id: t });
            refresh();
        } catch (error) {
            console.error('Team assignment error:', error);
            toast.error('Network error during assignment', { id: t });
        }
    };

    const onResolve = async (incidentId) => {
        if (!confirm('✅ Mark this emergency as resolved?')) return;

        const t = toast.loading('Resolving emergency...');
        try {
            await sosService.resolveSOS(incidentId);
            toast.success('✅ Emergency resolved successfully', { id: t });
            setSelectedIncident(null);
            refresh();

            // **NEW: The polling in SOSContext will automatically detect this**
            // No need to manually call context methods since polling handles it

        } catch (error) {
            console.error('Resolution error:', error);
            toast.error('Failed to resolve emergency', { id: t });
        }
    };

    const updateReportStatusInline = async (incidentId, newStatus) => {
        const t = toast.loading(`Updating status to ${newStatus}...`);
        try {
            const res = await updateReportStatus(incidentId, newStatus);
            if (!res?.success) {
                toast.error(res?.message || 'Update failed', { id: t });
                return;
            }
            toast.success(`📝 Status updated to ${newStatus}`, { id: t });
            refresh();
        } catch (error) {
            console.error('Status update error:', error);
            toast.error('Network error during update', { id: t });
        }
    };

    const onBroadcast = async () => {
        const title = prompt('🚨 EMERGENCY BROADCAST\n\nAlert Title:');
        if (!title?.trim()) return;

        const message = prompt('Alert Message:');
        if (!message?.trim()) return;

        const confirmBroadcast = confirm(
            `📢 Broadcast to all units and citizens?\n\nTitle: ${title}\nMessage: ${message}`
        );
        if (!confirmBroadcast) return;

        const t = toast.loading('Broadcasting emergency alert...');
        try {
            const res = await releaseOfficialAlert({
                title: title.trim(),
                message: message.trim(),
                alert_type: 'emergency'
            });

            if (!res?.success) {
                toast.error(res?.message || 'Broadcast failed', { id: t });
                return;
            }

            toast.success('📢 Emergency alert broadcasted to all units', { id: t });
        } catch (error) {
            console.error('Broadcast error:', error);
            toast.error('Network error during broadcast', { id: t });
        }
    };

    const openIncident = (incident) => {
        setSelectedIncident(incident);
    };

    // Enhanced filtered search
    const filteredEmergencies = useMemo(() => {
        const q = filters.query.trim().toLowerCase();
        if (!q) return data.emergencyAlerts;

        return data.emergencyAlerts.filter(incident =>
            (incident.emergency_type || '').toLowerCase().includes(q) ||
            (incident.description || '').toLowerCase().includes(q) ||
            (incident.user_name || '').toLowerCase().includes(q) ||
            String(incident.id).includes(q) ||
            (incident.assigned_team_name || '').toLowerCase().includes(q)
        );
    }, [data.emergencyAlerts, filters.query]);

    const filteredReports = useMemo(() => {
        const q = filters.query.trim().toLowerCase();
        let reports = data.criticalReports;

        if (filters.type !== 'all') {
            reports = reports.filter(r => r.report_type === filters.type);
        }

        if (!q) return reports;

        return reports.filter(report =>
            (report.title || '').toLowerCase().includes(q) ||
            (report.description || '').toLowerCase().includes(q) ||
            (report.reporter_name || '').toLowerCase().includes(q) ||
            String(report.id).includes(q)
        );
    }, [data.criticalReports, filters.query, filters.type]);

    const filteredPatrolUnits = useMemo(() => {
        const q = filters.query.trim().toLowerCase();
        if (!q) return data.patrolUnits;

        return data.patrolUnits.filter(unit =>
            (unit.team_id || '').toLowerCase().includes(q) ||
            (unit.station_name || '').toLowerCase().includes(q) ||
            (unit.leader_name || '').toLowerCase().includes(q) ||
            (unit.vehicle_number || '').toLowerCase().includes(q)
        );
    }, [data.patrolUnits, filters.query]);

    const filteredAllReports = useMemo(() => {
        const q = filters.query.trim().toLowerCase();
        if (!q) return allReports;

        return allReports.filter(report =>
            (report.title || '').toLowerCase().includes(q) ||
            (report.description || '').toLowerCase().includes(q) ||
            (report.reporter_name || '').toLowerCase().includes(q) ||
            (report.type || '').toLowerCase().includes(q) ||
            (report.status || '').toLowerCase().includes(q) ||
            String(report.original_id).includes(q)
        );
    }, [allReports, filters.query]);

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            {/* Mobile Header */}
            <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold text-slate-900">Police Dashboard</h1>
                    <div className="flex items-center gap-2">
                        {/* <button
                            onClick={toggleLocationFiltering}
                            className={`p-2 rounded-lg text-white transition-colors ${locationEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
                                }`}
                            title={`Location filtering: ${locationEnabled ? 'ON' : 'OFF'} (Ctrl+L)`}
                        >
                            <MapPin className="w-4 h-4" />
                        </button> */}
                        <button
                            onClick={refresh}
                            disabled={isLoading}
                            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                            title="Refresh data (Ctrl+R)"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onBroadcast}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            title="Emergency broadcast (Ctrl+B)"
                        >
                            <Bell className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Location Status Bar */}
                {locationEnabled && (
                    <div className="bg-green-50 border-t border-green-200 px-4 py-2">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-green-700">
                                <MapPin className="w-4 h-4" />
                                <span>Showing incidents within {locationRadius}km</span>
                            </div>
                            <select
                                value={locationRadius}
                                onChange={(e) => setLocationRadius(Number(e.target.value))}
                                className="text-xs border border-green-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                            >
                                <option value={2}>2km</option>
                                <option value={5}>5km</option>
                                <option value={10}>10km</option>
                                <option value={20}>20km</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <motion.div
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            className="bg-white w-80 h-full shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b flex items-center justify-between">
                                <h2 className="text-lg font-bold">Navigation</h2>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <MobileSidebar
                                activeSection={activeSection}
                                setActiveSection={setActiveSection}
                                data={data}
                                setSidebarOpen={setSidebarOpen}
                                locationEnabled={locationEnabled}
                                locationRadius={locationRadius}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Layout */}
            <div className="w-full mx-auto max-w-[1600px] p-2 sm:p-4 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6">
                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:block lg:col-span-2">
                        <DesktopSidebar
                            activeSection={activeSection}
                            setActiveSection={setActiveSection}
                            data={data}
                            locationEnabled={locationEnabled}
                            locationRadius={locationRadius}
                            toggleLocationFiltering={toggleLocationFiltering}
                            setLocationRadius={setLocationRadius}
                        />
                    </aside>

                    {/* Main Content */}
                    <main className="col-span-1 lg:col-span-7">
                        <div className="space-y-3 lg:space-y-6">
                            {/* Search and Filters - Mobile */}
                            <div className="lg:hidden bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            value={filters.query}
                                            onChange={(e) => setFilters(f => ({ ...f, query: e.target.value }))}
                                            placeholder="Search incidents, teams, or reports..."
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                        />
                                    </div>
                                    {(activeSection === 'incidents' || activeSection === 'reports') && (
                                        <select
                                            value={filters.type}
                                            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                        >
                                            <option value="all">All Types</option>
                                            <option value="crime">Crime</option>
                                            <option value="harassment">Harassment</option>
                                            <option value="safety">Safety</option>
                                            <option value="infrastructure">Infrastructure</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* Content Sections */}
                            {activeSection === 'emergency' && (
                                <EmergencySection
                                    isLoading={isLoading}
                                    emergencies={filteredEmergencies}
                                    onOpen={openIncident}
                                    onAssignTeam={onAssignTeam}
                                    onResolve={onResolve}
                                    patrolUnits={data.patrolUnits}
                                    onVideoStream={setSelectedStream}
                                    locationEnabled={locationEnabled}
                                    locationRadius={locationRadius}
                                />
                            )}

                            {activeSection === 'incidents' && (
                                <IncidentsSection
                                    isLoading={isLoading}
                                    reports={filteredReports}
                                    onOpen={openIncident}
                                    onStatusUpdate={updateReportStatusInline}
                                    locationEnabled={locationEnabled}
                                    locationRadius={locationRadius}
                                />
                            )}

                            {activeSection === 'map' && (
                                <MapSection
                                    emergencies={filteredEmergencies}
                                    reports={filteredReports}
                                    selectedIncident={selectedIncident}
                                    onSelectIncident={setSelectedIncident}
                                    userLocation={userLocation}
                                    locationRadius={locationRadius}
                                />
                            )}

                            {activeSection === 'teams' && (
                                <PatrolUnitsSection
                                    isLoading={isLoading}
                                    patrolUnits={filteredPatrolUnits}
                                    volunteers={data.volunteers}
                                    availableOfficers={availableOfficers}
                                    stations={stations}
                                    onCreateTeam={handleCreateTeam}
                                    onUpdateTeam={handleUpdateTeam}
                                    onDeleteTeam={handleDeleteTeam}
                                    onToggleStatus={handleToggleTeamStatus}
                                    onAssignMember={handleAssignMember}
                                    onRemoveMember={handleRemoveMember}
                                    onAddOfficer={handleAddOfficer}
                                    showTeamForm={showTeamForm}
                                    setShowTeamForm={setShowTeamForm}
                                    editingTeam={editingTeam}
                                    setEditingTeam={setEditingTeam}
                                    showAddOfficer={showAddOfficer}
                                    setShowAddOfficer={setShowAddOfficer}
                                />
                            )}

                            {/* {activeSection === 'all-reports' && (
                                <AllReportsSection
                                    isLoading={isLoading}
                                    reports={filteredAllReports}
                                    onOpen={openIncident}
                                    onStatusUpdate={updateReportStatusInline}
                                    onVideoStream={setSelectedStream}
                                    onResolve={onResolve}
                                    onAssignTeam={onAssignTeam}
                                    patrolUnits={data.patrolUnits}
                                    locationEnabled={locationEnabled}
                                    locationRadius={locationRadius}
                                />
                            )} */}
                        </div>
                    </main>

                    {/* Context Drawer - Desktop */}
                    <aside className="hidden lg:block lg:col-span-3">
                        <ContextDrawer
                            incident={selectedIncident}
                            patrolUnits={data.patrolUnits}
                            onStream={() => setSelectedStream(selectedIncident)}
                            onAssignTeam={onAssignTeam}
                            onResolve={onResolve}
                            onStatusUpdate={updateReportStatusInline}
                            onClose={() => setSelectedIncident(null)}
                        />
                    </aside>
                </div>

                {/* Mobile Context Drawer */}
                {selectedIncident && (
                    <div className="lg:hidden mt-4">
                        <ContextDrawer
                            incident={selectedIncident}
                            patrolUnits={data.patrolUnits}
                            onStream={() => setSelectedStream(selectedIncident)}
                            onAssignTeam={onAssignTeam}
                            onResolve={onResolve}
                            onStatusUpdate={updateReportStatusInline}
                            onClose={() => setSelectedIncident(null)}
                        />
                    </div>
                )}
            </div>

            {/* Stream Modal */}
            <AnimatePresence>
                {selectedStream && (
                    <VideoStreamModal
                        streamData={selectedStream}
                        onClose={() => setSelectedStream(null)}
                    />
                )}
            </AnimatePresence>

            {/* Toast Notifications */}
            <Toaster
                position="top-right"
                // position="top-center"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#ffffff',
                        color: '#1f2937',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px',
                        fontWeight: 500,
                        padding: '12px 16px',
                        maxWidth: '90vw',
                    },
                    success: {
                        iconTheme: { primary: '#10b981', secondary: '#ffffff' },
                    },
                    info: {
                        iconTheme: { primary: '#10b981', secondary: '#ffffff' },
                    },
                    error: {
                        iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
                    },
                    loading: {
                        iconTheme: { primary: '#3b82f6', secondary: '#ffffff' },
                    },
                }}
            />
        </div>
    );
};

/* --- Component Definitions --- */

const MobileSidebar = ({ activeSection, setActiveSection, data, setSidebarOpen, locationEnabled, locationRadius }) => (
    <div className="p-4 space-y-4">
        {/* Location Status */}
        {locationEnabled && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-700 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>Showing nearby incidents ({locationRadius}km)</span>
                </div>
            </div>
        )}

        {/* Navigation */}
        <div className="space-y-2">
            <RailItem
                icon={AlertTriangle}
                label="Emergencies"
                count={data.emergencyAlerts.length}
                active={activeSection === 'emergency'}
                onClick={() => {
                    setActiveSection('emergency');
                    setSidebarOpen(false);
                }}
            />
            <RailItem
                icon={FileText}
                label="Incidents"
                count={data.criticalReports.length}
                active={activeSection === 'incidents'}
                onClick={() => {
                    setActiveSection('incidents');
                    setSidebarOpen(false);
                }}
            />
            <RailItem
                icon={MapIcon}
                label="Map View"
                active={activeSection === 'map'}
                onClick={() => {
                    setActiveSection('map');
                    setSidebarOpen(false);
                }}
            />
            <RailItem
                icon={Car}
                label="Patrol Teams"
                count={data.patrolUnits.filter(u => u.is_active).length}
                active={activeSection === 'teams'}
                onClick={() => {
                    setActiveSection('teams');
                    setSidebarOpen(false);
                }}
            />
            {/* <RailItem
                icon={FileUser}
                label="All Reports"
                count={data.patrolUnits.filter(u => u.is_active).length}
                active={activeSection === 'all-reports'}
                onClick={() => {
                    setActiveSection('all-reports');
                    setSidebarOpen(false);
                }}
            /> */}
        </div>

        {/* Quick Stats */}
        <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-2">
                <MiniStat
                    icon={AlertTriangle}
                    label="Emergencies"
                    value={data.emergencyAlerts.length}
                    tone="red"
                    compact
                />
                <MiniStat
                    icon={Car}
                    label="Active Units"
                    value={data.patrolUnits.filter(u => u.is_active).length}
                    tone="blue"
                    compact
                />
                <MiniStat
                    icon={Users}
                    label="Volunteers"
                    value={data.volunteers.filter(v => v.is_active).length}
                    tone="green"
                    compact
                />
                <MiniStat
                    icon={TrendingUp}
                    label="Response"
                    value={`${data.stats?.response_rate?.toFixed?.(1) || 95.0}%`}
                    tone="purple"
                    compact
                />
            </div>
        </div>
    </div>
);

const DesktopSidebar = ({
    activeSection,
    setActiveSection,
    data,
    locationEnabled,
    locationRadius,
    toggleLocationFiltering,
    setLocationRadius
}) => (
    <div className="space-y-4">
        {/* Location Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location Filter
                </h3>
                <button
                    onClick={toggleLocationFiltering}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${locationEnabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    {locationEnabled ? 'ON' : 'OFF'}
                </button>
            </div>
            {locationEnabled && (
                <div>
                    <label className="text-xs text-slate-600 block mb-1">Search Radius</label>
                    <select
                        value={locationRadius}
                        onChange={(e) => setLocationRadius(Number(e.target.value))}
                        className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    >
                        <option value={2}>2km radius</option>
                        <option value={5}>5km radius</option>
                        <option value={10}>10km radius</option>
                        <option value={20}>20km radius</option>
                    </select>
                </div>
            )}
        </div>

        {/* Navigation */}
        <nav className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3">
            <RailItem
                icon={AlertTriangle}
                label="Emergencies"
                count={data.emergencyAlerts.length}
                active={activeSection === 'emergency'}
                onClick={() => setActiveSection('emergency')}
            />
            <RailItem
                icon={FileText}
                label="Incidents"
                count={data.criticalReports.length}
                active={activeSection === 'incidents'}
                onClick={() => setActiveSection('incidents')}
            />
            <RailItem
                icon={MapIcon}
                label="Map View"
                active={activeSection === 'map'}
                onClick={() => setActiveSection('map')}
            />
            <RailItem
                icon={Car}
                label="Patrol Teams"
                count={data.patrolUnits.filter(u => u.is_active).length}
                active={activeSection === 'teams'}
                onClick={() => setActiveSection('teams')}
            />
            {/* give icon for all reports */}
            {/* <RailItem
                icon={FileUser}
                label="All Reports"
                count={data.patrolUnits.filter(u => u.is_active).length}
                active={activeSection === 'all-reports'}
                onClick={() => setActiveSection('all-reports')}
            /> */}
        </nav>

        {/* Enhanced Stats */}
        <div className="space-y-3">
            <MiniStat
                icon={AlertTriangle}
                label="Active Emergencies"
                value={data.emergencyAlerts.length}
                tone="red"
            />
            <MiniStat
                icon={Car}
                label="Patrol Units On Duty"
                value={data.patrolUnits.filter(u => u.is_active).length}
                tone="blue"
            />
            <MiniStat
                icon={Users}
                label="Active Volunteers"
                value={data.volunteers.filter(v => v.is_active).length}
                tone="green"
            />
            <MiniStat
                icon={TrendingUp}
                label="Response Rate"
                value={`${data.stats?.response_rate?.toFixed?.(1) || 95.0}%`}
                tone="purple"
            />
        </div>
    </div>
);

const RailItem = ({ icon: Icon, label, count, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${active ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'text-slate-700 hover:bg-slate-50'
            }`}
        type="button"
    >
        <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{label}</span>
        </div>
        {/* {count !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'
                }`}>
                {count}
            </span>
        )} */}
    </button>
);

const MiniStat = ({ icon: Icon, label, value, tone, compact = false }) => {
    const toneClasses = {
        red: 'text-red-700 bg-red-50 border-red-200',
        blue: 'text-blue-700 bg-blue-50 border-blue-200',
        green: 'text-green-700 bg-green-50 border-green-200',
        purple: 'text-purple-700 bg-purple-50 border-purple-200'
    };

    return (
        <div className={`bg-white border rounded-xl ${compact ? 'p-2' : 'p-3'} flex items-center gap-2 hover:shadow-md transition-shadow ${toneClasses[tone]}`}>
            <div className={`${compact ? 'p-1' : 'p-2'} rounded-lg ${toneClasses[tone]} flex-shrink-0`}>
                <Icon className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </div>
            <div className="min-w-0 flex-1">
                <div className={`text-slate-900 font-semibold leading-tight ${compact ? 'text-sm' : ''}`}>{value}</div>
                <div className={`text-slate-600 ${compact ? 'text-xs' : 'text-xs'} truncate`}>{label}</div>
            </div>
        </div>
    );
};

const EmergencySection = ({
    isLoading,
    emergencies,
    onOpen,
    onAssignTeam,
    onResolve,
    patrolUnits,
    onVideoStream,
    locationEnabled,
    locationRadius
}) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className={`${PANEL_PAD} border-b border-slate-200 bg-gradient-to-r from-red-50 to-orange-50`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-red-900 flex items-center gap-2 sm:gap-3">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600 flex-shrink-0" />
                    <span className="truncate">SOS Emergency Alerts</span>
                    {emergencies.length > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse font-bold">
                            {emergencies.length}
                        </span>
                    )}
                    {locationEnabled && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                            📍 {locationRadius}km
                        </span>
                    )}
                </h2>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-red-600">LIVE</span>
                </div>
            </div>
        </div>

        <div>
            {isLoading ? (
                <LoadingSpinner message="Loading emergency situations..." />
            ) : emergencies.length === 0 ? (
                <EmptyState
                    icon={Shield}
                    title={locationEnabled ? "No Nearby Emergencies" : "All Clear"}
                    subtitle={locationEnabled ? `No emergencies within ${locationRadius}km radius` : "No active emergency situations"}
                    variant="success"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 max-h-[70vh] overflow-y-auto p-3 sm:p-4 lg:p-6">
                    {emergencies.map((alert, index) => (
                        <EmergencyAlertCard
                            key={alert.id}
                            alert={alert}
                            index={index}
                            patrolUnits={patrolUnits}
                            onVideoStreamSelect={onVideoStream}
                            onTeamAssignment={onAssignTeam}
                            onResolve={onResolve}
                            onOpen={onOpen}
                        />
                    ))}
                </div>
            )}
        </div>
    </div>
);

const IncidentsSection = ({
    isLoading,
    reports,
    onOpen,
    onStatusUpdate,
    locationEnabled,
    locationRadius
}) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className={`${PANEL_PAD} border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50`}>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-blue-900 flex items-center gap-2 sm:gap-3">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 flex-shrink-0" />
                <span className="truncate">Incident Reports</span>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
                    {reports.length}
                </span>
                {locationEnabled && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                        📍 {locationRadius}km
                    </span>
                )}
            </h2>
        </div>

        <div>
            {isLoading ? (
                <LoadingSpinner message="Loading incident reports..." />
            ) : reports.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title={locationEnabled ? "No Nearby Reports" : "No Reports"}
                    subtitle={locationEnabled ? `No reports within ${locationRadius}km radius` : "No incident reports found"}
                />
            ) : (
                <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto p-3 sm:p-4 lg:p-6">
                    {reports.map((report, index) => (
                        <ReportCard
                            key={report.id}
                            report={report}
                            index={index}
                            onOpen={onOpen}
                            onStatusUpdate={onStatusUpdate}
                        />
                    ))}
                </div>
            )}
        </div>
    </div>
);

const MapSection = ({ emergencies, reports, selectedIncident, onSelectIncident, userLocation, locationRadius }) => (
    <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
        <div className={`${PANEL_PAD} border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-slate-900 font-semibold text-sm sm:text-base">Live Incident Map</h3>
                        <p className="text-slate-600 text-xs hidden sm:block">Real-time tracking of incidents and units</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs sm:text-sm border border-slate-200 transition-colors">
                        🛰️ Satellite
                    </button>
                    <button className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs sm:text-sm border border-slate-200 inline-flex items-center gap-1 transition-colors">
                        <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Filters</span>
                    </button>
                </div>
            </div>
        </div>

        <div className="h-[50vh] sm:h-[60vh] lg:h-[400px] relative">
            <MapContainer
                center={userLocation ? [userLocation.latitude, userLocation.longitude] : [22.9906, 72.4872]}
                zoom={userLocation ? 12 : 10}
                scrollWheelZoom={true}
                style={{ width: '100%', height: '100%' }}
                className="z-0"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* User location marker */}
                {userLocation && (
                    <Marker
                        position={[userLocation.latitude, userLocation.longitude]}
                        icon={userLocationIcon}
                    >
                        <Popup>
                            <div className="p-2">
                                <h4 className="font-bold text-blue-700">📍 Your Location</h4>
                                <p className="text-xs">Police Station</p>
                                <p className="text-xs text-slate-600">
                                    {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Emergency markers */}
                {emergencies.map((emergency) => (
                    emergency.latitude && emergency.longitude && (
                        <Marker
                            key={`emergency-${emergency.id}`}
                            position={[emergency.latitude, emergency.longitude]}
                            icon={sosIcon}
                            eventHandlers={{
                                click: () => onSelectIncident(emergency),
                            }}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h4 className="font-bold text-red-700">
                                        🚨 {emergency.emergency_type || 'SOS Emergency'}
                                    </h4>
                                    <p className="text-sm">{emergency.description}</p>
                                    <p className="text-xs text-slate-600">
                                        📅 {new Date(emergency.created_at).toLocaleString()}
                                    </p>
                                    {emergency.user_name && (
                                        <p className="text-xs">👤 Reporter: {emergency.user_name}</p>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}

                {/* Report markers */}
                {reports.map((report) => (
                    report.latitude && report.longitude && (
                        <Marker
                            key={`report-${report.id}`}
                            position={[report.latitude, report.longitude]}
                            icon={incidentIcon}
                            eventHandlers={{
                                click: () => onSelectIncident(report),
                            }}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h4 className="font-bold text-blue-700">📋 {report.title}</h4>
                                    <p className="text-sm">{report.description}</p>
                                    <p className="text-xs text-slate-600">
                                        🏷️ Type: {report.report_type} | Status: {report.status}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                        📅 {new Date(report.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>

            {/* Map overlay */}
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-white rounded-lg shadow-lg p-2 sm:p-3 border border-slate-200 max-w-[calc(100%-1rem)] sm:max-w-none">
                <div className="text-xs sm:text-sm font-semibold text-slate-900 mb-1 sm:mb-2">📊 Live Status</div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                        <span className="truncate">🚨 {emergencies.length} Emergency</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span className="truncate">📋 {reports.length} Reports</span>
                    </div>
                    {userLocation && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-700 rounded-full flex-shrink-0"></div>
                            <span className="truncate">📍 Your Location</span>
                        </div>
                    )}
                </div>
            </div>

            {selectedIncident && (
                <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-white rounded-lg shadow-lg p-2 sm:p-3 border border-slate-200 max-w-[calc(100%-1rem)] sm:max-w-sm">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 mb-1 truncate">
                        📍 {selectedIncident.emergency_type || selectedIncident.title}
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                        {selectedIncident.latitude && selectedIncident.longitude ?
                            `${selectedIncident.latitude.toFixed(4)}, ${selectedIncident.longitude.toFixed(4)}` :
                            'Location unknown'
                        }
                    </div>
                </div>
            )}
        </div>
    </div>
);

const PatrolUnitsSection = ({
    isLoading,
    patrolUnits,
    volunteers,
    availableOfficers,
    stations,
    onCreateTeam,
    onUpdateTeam,
    onDeleteTeam,
    onToggleStatus,
    onAssignMember,
    onRemoveMember,
    onAddOfficer,
    showTeamForm,
    setShowTeamForm,
    editingTeam,
    setEditingTeam,
    showAddOfficer,
    setShowAddOfficer
}) => (
    <div className="space-y-4 lg:space-y-6">
        {/* Patrol Units */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className={`${PANEL_PAD} border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50`}>
                <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-bold text-purple-900 flex items-center gap-2 sm:gap-3">
                        <Car className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
                        <span className="truncate">Patrol Units</span>
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-semibold">
                            🚔 {patrolUnits.filter(unit => unit.is_active).length} ON DUTY
                        </span>
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAddOfficer(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Police</span>
                            <span className="sm:hidden">Add</span>
                        </button>
                        <button
                            onClick={() => setShowTeamForm(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Team</span>
                            <span className="sm:hidden">Team</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 max-h-80 overflow-y-auto">
                {isLoading ? (
                    <LoadingSpinner message="Loading patrol units..." />
                ) : patrolUnits.length === 0 ? (
                    <EmptyState
                        icon={Car}
                        title="No Patrol Units"
                        subtitle="Create your first patrol team to get started"
                    />
                ) : (
                    patrolUnits.map((unit, index) => (
                        <PatrolUnitCard
                            key={unit.id}
                            unit={unit}
                            index={index}
                            onEdit={setEditingTeam}
                            onDelete={onDeleteTeam}
                            onToggleStatus={onToggleStatus}
                            onAssignMember={onAssignMember}
                            onRemoveMember={onRemoveMember}
                            availableOfficers={availableOfficers}
                        />
                    ))
                )}
            </div>
        </div>

        {/* Community Volunteers */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className={`${PANEL_PAD} border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-green-50`}>
                <h2 className="text-base sm:text-lg font-bold text-emerald-900 flex items-center gap-2 sm:gap-3">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">Community Volunteers</span>
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-semibold">
                        👥 {volunteers.filter(v => v.is_active).length} ACTIVE
                    </span>
                </h2>
            </div>

            <div className="p-3 sm:p-4 lg:p-6 space-y-3 max-h-72 overflow-y-auto">
                {isLoading ? (
                    <LoadingSpinner message="Loading volunteers..." />
                ) : volunteers.length === 0 ? (
                    <EmptyState icon={Users} title="No Volunteers" subtitle="No active volunteers at this time" />
                ) : (
                    volunteers.map(volunteer => (
                        <VolunteerCard key={volunteer.id} volunteer={volunteer} />
                    ))
                )}
            </div>
        </div>

        {/* Modals */}
        <AnimatePresence>
            {/* Add Officer Modal */}
            {showAddOfficer && (
                <AddOfficerModal
                    show={showAddOfficer}
                    onClose={() => setShowAddOfficer(false)}
                    onSave={onAddOfficer}
                    stations={stations}
                />
            )}

            {/* Team Form Modal */}
            {(showTeamForm || editingTeam) && (
                <TeamFormModal
                    team={editingTeam}
                    availableOfficers={availableOfficers}
                    stations={stations}
                    onSubmit={editingTeam ?
                        (data) => onUpdateTeam(editingTeam.id, data) :
                        onCreateTeam
                    }
                    onClose={() => {
                        setShowTeamForm(false);
                        setEditingTeam(null);
                    }}
                />
            )}
        </AnimatePresence>
    </div>
);

const AllReportsSection = ({
    isLoading,
    reports,
    onOpen,
    onStatusUpdate,
    onVideoStream,
    onResolve,
    onAssignTeam,
    patrolUnits,
    locationEnabled,
    locationRadius
}) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className={`${PANEL_PAD} border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50`}>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-purple-900 flex items-center gap-2 sm:gap-3">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 flex-shrink-0" />
                <span className="truncate">All Reports & Alerts</span>
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold">
                    {reports.length}
                </span>
                {locationEnabled && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                        📍 {locationRadius}km
                    </span>
                )}
            </h2>
        </div>

        <div>
            {isLoading ? (
                <LoadingSpinner message="Loading all reports..." />
            ) : reports.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title={locationEnabled ? "No Nearby Reports" : "No Reports"}
                    subtitle={locationEnabled ? `No reports within ${locationRadius}km radius` : "No reports found"}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 max-h-[70vh] overflow-y-auto p-3 sm:p-4 lg:p-6">
                    {reports.map((report, index) => (
                        <UnifiedReportCard
                            key={report.id}
                            report={report}
                            index={index}
                            onOpen={onOpen}
                            onVideoStreamSelect={onVideoStream}
                            onStatusUpdate={onStatusUpdate}
                            onResolve={onResolve}
                            onAssignTeam={onAssignTeam}
                            patrolUnits={patrolUnits}
                        />
                    ))}
                </div>
            )}
        </div>
    </div>
);

// Add this after your imports and before the main component
const UnifiedReportCard = ({ report, index, onOpen, onVideoStreamSelect, onStatusUpdate, onResolve, onAssignTeam, patrolUnits, onVideoStream }) => {
    const isSOS = report.type === 'sos' || report.emergency_type;
    const isActiveSOS = isSOS && report.is_active !== false && report.status === 'active';
    const isResolvedSOS = isSOS && (report.is_active === false || report.status === 'resolved');

    const timeAgo = (dateString) => {
        const now = new Date();
        const created = new Date(dateString);
        const diffMs = now - created;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return created.toLocaleDateString();
    };

    const getStatusColor = (status, type) => {
        if (isSOS) {
            return isActiveSOS ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
        }
        switch (status) {
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'investigating': return 'bg-blue-100 text-blue-800';
            case 'dismissed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getTypeEmoji = () => {
        if (isSOS) return '🚨';
        switch (report.report_type) {
            case 'crime': return '🚔';
            case 'harassment': return '⚠️';
            case 'safety': return '🛡️';
            case 'infrastructure': return '🏗️';
            default: return '📋';
        }
    };

    const getCardBorderAndBackground = () => {
        if (isSOS) {
            return isActiveSOS
                ? 'border-red-200 bg-red-50'
                : 'border-green-200 bg-green-50';
        }
        return 'border-slate-200 bg-white';
    };

    const getIconBackground = () => {
        if (isSOS) {
            return isActiveSOS ? 'bg-red-600' : 'bg-green-600';
        }
        return 'bg-blue-600';
    };

    const getDescriptionBackground = () => {
        if (isSOS) {
            return isActiveSOS
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-100 border-green-300';
        }
        return 'bg-slate-50 border-slate-200';
    };

    const getDescriptionTextColor = () => {
        if (isSOS) {
            return isActiveSOS ? 'text-amber-900' : 'text-green-800';
        }
        return 'text-slate-700';
    };

    // **NEW: Handle video stream for SOS reports**
    const handleVideoStream = (e) => {
        e.stopPropagation();
        if (onVideoStream) {
            // Create a compatible stream object for VideoStreamModal
            const streamData = {
                ...report,
                id: report.original_id || report.id,
                emergency_type: report.emergency_type || 'SOS Emergency',
                user_name: report.reporter_name || report.user_name,
                is_streaming: report.is_streaming || true
            };
            onVideoStream(streamData);
        } else {
            // Fallback: Open video in new window or show modal
            console.log('Opening video stream for report:', report.original_id || report.id);
            // You can add additional video handling logic here
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`border-2 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer ${getCardBorderAndBackground()}`}
            onClick={() => onOpen(report)}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${getIconBackground()}`}>
                        <span className="text-white text-lg sm:text-2xl">
                            {getTypeEmoji()}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-lg font-bold text-slate-900 truncate">
                            {getTypeEmoji()} {report.title || `${report.emergency_type || report.report_type} Report`}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-700">ID: {report.original_id || report.id}</p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${isActiveSOS
                        ? 'bg-red-600 text-white animate-pulse'
                        : isResolvedSOS
                            ? 'bg-green-600 text-white'
                            : getStatusColor(report.status, report.type)
                        }`}>
                        {isActiveSOS ? '🚨 CRITICAL' :
                            isResolvedSOS ? '✅ RESOLVED' :
                                report.status?.toUpperCase() || 'UNKNOWN'}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">📅 {timeAgo(report.created_at)}</div>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 flex-shrink-0" />
                    <span className="font-medium truncate">
                        👤 {report.reporter_name || report.user_name || 'Anonymous'}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 flex-shrink-0" />
                    {report.latitude && report.longitude ? (
                        <span className="truncate">
                            📍 {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                        </span>
                    ) : (
                        <span className="text-amber-600 truncate">🔍 {report.location || 'Location unknown'}</span>
                    )}
                </div>
            </div>

            {report.description && (
                <div className={`border rounded-lg p-2 sm:p-3 mb-4 ${getDescriptionBackground()}`}>
                    <p className={`text-xs sm:text-sm line-clamp-2 ${getDescriptionTextColor()}`}>
                        📝 {report.description}
                    </p>
                </div>
            )}

            {/* Assigned Team (for SOS) */}
            {(report.assigned_team || report.assigned_team_name) && (
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 mb-4">
                    <div className="text-xs text-blue-600 font-bold">🚔 UNIT ASSIGNED</div>
                    <div className="text-blue-800 font-semibold text-xs sm:text-sm truncate">
                        {report.assigned_team || report.assigned_team_name}
                    </div>
                </div>
            )}

            {/* **UPDATED: Video Stream Section with Working Functionality** */}
            {isSOS && (report.is_streaming || report.has_video_feed) && (
                <div className="bg-purple-100 border border-purple-300 rounded-lg p-2 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse flex-shrink-0" />
                        <span className="text-purple-800 font-semibold text-xs sm:text-sm flex-1 truncate">
                            📹 Live Video Available
                        </span>
                        <button
                            onClick={onVideoStreamSelect ? () => onVideoStreamSelect(report) : handleVideoStream}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-2 sm:px-3 py-1 rounded text-xs flex-shrink-0 transition-colors"
                            title="Watch live video feed"
                        >
                            <Eye className="w-3 h-3 inline mr-1" />
                            Watch
                        </button>
                    </div>
                </div>
            )}

            {/* **NEW: Video Feed Option for All SOS (even without is_streaming)** */}
            {/* {isSOS && !(report.is_streaming || report.has_video_feed) && (
                <div className="bg-slate-100 border border-slate-300 rounded-lg p-2 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full flex-shrink-0" />
                        <span className="text-slate-600 font-medium text-xs sm:text-sm flex-1 truncate">
                            📹 Check for Video Feed
                        </span>
                        <button
                            onClick={handleVideoStream}
                            className="bg-slate-600 hover:bg-slate-700 text-white px-2 sm:px-3 py-1 rounded text-xs flex-shrink-0 transition-colors"
                            title="Check for available video feed"
                        >
                            <Eye className="w-3 h-3 inline mr-1" />
                            Check
                        </button>
                    </div>
                </div>
            )} */}

            {/* Actions */}
            <div className="space-y-2">
                {isSOS ? (
                    // **UPDATED: SOS Actions with Conditional Resolve Button**
                    <>
                        {/* Show assignment and resolve options only for active SOS */}
                        {isActiveSOS && (
                            <>
                                <select
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        onAssignTeam(report.original_id || report.id, e.target.value);
                                    }}
                                    defaultValue=""
                                    className="w-full bg-white border border-red-300 rounded-lg px-3 py-2 text-xs sm:text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="" disabled>🚔 Assign Patrol Unit</option>
                                    {patrolUnits.filter(u => u.is_active).map(unit => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.team_id} - {unit.station_name}
                                        </option>
                                    ))}
                                </select>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (report.latitude && report.longitude) {
                                                window.open(`https://maps.google.com/?q=${report.latitude},${report.longitude}`, '_blank');
                                            }
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1"
                                    >
                                        <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Navigate</span>
                                        <span className="sm:hidden">🧭 Nav</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onResolve(report.original_id || report.id);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1"
                                    >
                                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Resolve</span>
                                        <span className="sm:hidden">✅ Fix</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* For resolved SOS, show status and navigation only */}
                        {isResolvedSOS && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (report.latitude && report.longitude) {
                                            window.open(`https://maps.google.com/?q=${report.latitude},${report.longitude}`, '_blank');
                                        }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1"
                                >
                                    <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">View Location</span>
                                    <span className="sm:hidden">🧭 Map</span>
                                </button>
                                <div className="bg-green-100 border border-green-300 rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 text-green-800">
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>Emergency Resolved</span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    // Regular Report Actions
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onStatusUpdate && onStatusUpdate(report.original_id || report.id, 'investigating');
                            }}
                            disabled={report.status === 'investigating'}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                        >
                            🔍 Investigate
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onStatusUpdate && onStatusUpdate(report.original_id || report.id, 'resolved');
                            }}
                            disabled={report.status === 'resolved'}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                        >
                            ✅ Resolve
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onStatusUpdate && onStatusUpdate(report.original_id || report.id, 'dismissed');
                            }}
                            disabled={report.status === 'dismissed'}
                            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                        >
                            ❌ Dismiss
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Add Officer Modal Component
const AddOfficerModal = ({ show, onClose, onSave, stations }) => {
    const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", station: "" });
    const [error, setError] = useState("");

    useEffect(() => {
        if (show) {
            setForm({ name: "", email: "", password: "", phone: "", station: "" });
            setError("");
        }
    }, [show]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError("Name and Station are required.");
            return;
        }
        setError("");
        const success = await onSave(form);
        if (success) onClose();
    };

    if (!show) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">
                        👮 Add New Police Officer
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">👤 Full Name</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={form.name}
                            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Enter officer's full name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">📧 Email Address</label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={form.email}
                            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="officer@police.gov"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={form.password}
                            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                            placeholder="Password to access"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">📞 Phone Number</label>
                        <input
                            type="tel"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={form.phone}
                            onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="Enter phone number"
                        />
                    </div>

                    {/* <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">🏢 Police Station</label>
                        <select
                            value={form.station}
                            onChange={(e) => setForm(f => ({ ...f, station: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            required
                        >
                            <option value="">Select police station...</option>
                            {stations.map(station => (
                                <option key={station.id} value={station.id}>
                                    {station.name}
                                </option>
                            ))}
                        </select>
                    </div> */}

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            👮 Add Officer
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

const PatrolUnitCard = ({ unit, index, onEdit, onDelete, onToggleStatus, onAssignMember, onRemoveMember, availableOfficers }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showMemberForm, setShowMemberForm] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`border rounded-xl p-4 transition-all hover:shadow-md ${unit.is_active ? 'bg-white border-purple-200' : 'bg-slate-50 border-slate-200'
                }`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${unit.is_active ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                        <Car className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 text-base truncate">🚔 {unit.team_id}</div>
                        <div className="text-sm text-slate-600 truncate">🏢 {unit.station_name}</div>
                        <div className="text-xs text-slate-500">
                            👤 Leader: {unit.leader_name || 'Not assigned'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${unit.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                        {unit.is_active ? '✅ On Duty' : '⏸️ Off Duty'}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {showDropdown && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                                <button
                                    onClick={() => {
                                        onEdit(unit);
                                        setShowDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <Edit className="w-3 h-3" />
                                    Edit Team
                                </button>
                                <button
                                    onClick={() => {
                                        onToggleStatus(unit.id);
                                        setShowDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <CheckCircle className="w-3 h-3" />
                                    {unit.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowMemberForm(true);
                                        setShowDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <Users className="w-3 h-3" />
                                    Manage Members
                                </button>
                                <button
                                    onClick={() => {
                                        onDelete(unit.id);
                                        setShowDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Delete Team
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Team Details */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                    <span className="text-slate-500">👥 Members:</span>
                    <span className="ml-1 font-medium">{unit.actual_member_count || unit.members_count}</span>
                </div>
                <div>
                    <span className="text-slate-500">🚗 Vehicle:</span>
                    <span className="ml-1 font-medium">{unit.vehicle_number || 'N/A'}</span>
                </div>
            </div>

            {/* Members List */}
            {unit.members_list && unit.members_list.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                    <div className="text-xs font-medium text-slate-700 mb-2">👥 Team Members:</div>
                    <div className="flex flex-wrap gap-2">
                        {unit.members_list.map(member => (
                            <div
                                key={member.id}
                                className="flex items-center gap-1 text-xs bg-slate-100 rounded-full px-2 py-1"
                            >
                                <span>👤 {member.name}</span>
                                <button
                                    onClick={() => onRemoveMember(unit.id, member.id)}
                                    className="text-red-500 hover:text-red-700 ml-1"
                                    title="Remove member"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Member Management Modal */}
            <AnimatePresence>
                {showMemberForm && (
                    <MemberManagementModal
                        unit={unit}
                        availableOfficers={availableOfficers}
                        onAssignMember={onAssignMember}
                        onClose={() => setShowMemberForm(false)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Add this to your service functions
// const getAllReportsCombined = async (userLocation = null, radius = 5) => {
//     try {
//         const params = userLocation ? {
//             latitude: userLocation.latitude,
//             longitude: userLocation.longitude,
//             radius: radius
//         } : {};

//         const response = await api.get('/police/all-reports/', { params });
//         return {
//             success: true,
//             data: response.data,
//             message: 'All reports fetched successfully'
//         };
//     } catch (error) {
//         console.error('Error fetching all reports:', error);
//         return {
//             success: false,
//             data: { results: [], total_count: 0 },
//             message: error.response?.data?.error || 'Failed to fetch all reports'
//         };
//     }
// };

const VolunteerCard = ({ volunteer }) => (
    <div className="border rounded-xl p-3 flex items-center justify-between bg-white border-slate-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                    👤 {volunteer.user_name || `Volunteer #${volunteer.id}`}
                </div>
                <div className="text-xs text-slate-600 truncate">
                    📞 {volunteer.phone_number || 'Contact unavailable'}
                </div>
            </div>
        </div>
        <div className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${volunteer.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
            }`}>
            {volunteer.is_active ? '✅ Active' : '⏸️ Inactive'}
        </div>
    </div>
);

const TeamFormModal = ({ team, availableOfficers, stations, onSubmit, onClose }) => {
    const [formData, setFormData] = useState({
        team_id: team?.team_id || '',
        station: team?.station || '',  // This should be the station ID
        team_leader: team?.team_leader || '',
        members_count: team?.members_count || 2,
        vehicle_number: team?.vehicle_number || '',
        is_active: team?.is_active ?? true
    });

    // Set the station field properly when editing
    useEffect(() => {
        if (team) {
            setFormData({
                team_id: team.team_id || '',
                station: team.station || '',  // Make sure this gets the station ID, not name
                team_leader: team.team_leader || '',
                members_count: team.members_count || 2,
                vehicle_number: team.vehicle_number || '',
                is_active: team.is_active ?? true
            });
        }
    }, [team]);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Ensure all required fields are present and properly formatted
        const payload = {
            team_id: formData.team_id.trim(),
            station: parseInt(formData.station), // Ensure station is an integer
            team_leader: parseInt(formData.team_leader),
            members_count: parseInt(formData.members_count),
            vehicle_number: formData.vehicle_number.trim(),
            is_active: formData.is_active
        };

        console.log('Submitting team data:', payload); // Debug log
        onSubmit(payload);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">
                        {team ? '✏️ Edit Patrol Team' : '➕ Create Patrol Team'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            🆔 Team ID
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.team_id}
                            onChange={(e) => setFormData(f => ({ ...f, team_id: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            placeholder="e.g., ALPHA-01, BRAVO-02"
                        />
                    </div>

                    {/* <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            🏢 Police Station
                        </label>
                        <select
                            required
                            value={formData.station}
                            onChange={(e) => setFormData(f => ({ ...f, station: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                            <option value="">Select Police Station</option>
                            {stations.map(station => (
                                <option key={station.id} value={station.id}>
                                    {station.name}
                                </option>
                            ))}
                        </select>
                    </div> */}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            👤 Team Leader
                        </label>
                        <select
                            required
                            value={formData.team_leader}
                            onChange={(e) => setFormData(f => ({ ...f, team_leader: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                            <option value="">Select Team Leader</option>
                            {availableOfficers.map(officer => (
                                <option key={officer.id} value={officer.id}>
                                    {officer.name} ({officer.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                👥 Members Count
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={formData.members_count}
                                onChange={(e) => setFormData(f => ({ ...f, members_count: parseInt(e.target.value) }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                🚗 Vehicle Number
                            </label>
                            <input
                                type="text"
                                value={formData.vehicle_number}
                                onChange={(e) => setFormData(f => ({ ...f, vehicle_number: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                placeholder="GJ-01-AB-1234"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData(f => ({ ...f, is_active: e.target.checked }))}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="is_active" className="text-sm text-slate-700">
                            ✅ Active Status
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                            {team ? 'Update Team' : 'Create Team'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

const MemberManagementModal = ({ unit, availableOfficers, onAssignMember, onClose }) => {
    const [selectedOfficer, setSelectedOfficer] = useState('');

    const handleAssign = () => {
        if (selectedOfficer) {
            onAssignMember(unit.id, selectedOfficer);
            setSelectedOfficer('');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">
                        👥 Manage Team Members - {unit.team_id}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            ➕ Assign New Member
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={selectedOfficer}
                                onChange={(e) => setSelectedOfficer(e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            >
                                <option value="">Select Officer</option>
                                {availableOfficers
                                    .filter(officer =>
                                        !unit.members_list?.some(member => member.id === officer.id) &&
                                        officer.id !== unit.team_leader
                                    )
                                    .map(officer => (
                                        <option key={officer.id} value={officer.id}>
                                            {officer.name} ({officer.email})
                                        </option>
                                    ))
                                }
                            </select>
                            <button
                                onClick={handleAssign}
                                disabled={!selectedOfficer}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="text-sm font-medium text-slate-700 mb-2">
                            👥 Current Members ({unit.actual_member_count || 0})
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {/* Team Leader */}
                            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-200">
                                <span className="text-sm font-medium">
                                    👑 {unit.leader_name} (Leader)
                                </span>
                                <span className="text-xs text-purple-600 font-medium">LEADER</span>
                            </div>

                            {/* Team Members */}
                            {unit.members_list?.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                    <span className="text-sm">👤 {member.name}</span>
                                    <span className="text-xs text-slate-500">MEMBER</span>
                                </div>
                            ))}

                            {(!unit.members_list || unit.members_list.length === 0) && (
                                <div className="text-center text-slate-500 text-sm py-4 bg-slate-50 rounded-lg">
                                    👥 No additional members assigned
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const EmergencyAlertCard = ({ alert, index, patrolUnits, onVideoStreamSelect, onTeamAssignment, onResolve, onOpen }) => {
    const timeAgo = (dateString) => {
        const now = new Date();
        const created = new Date(dateString);
        const diffMs = now - created;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return created.toLocaleDateString();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border-2 border-red-200 bg-red-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => onOpen(alert)}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-lg font-bold text-red-900 truncate">
                            🚨 {alert.emergency_type || 'SOS Emergency'}
                        </h3>
                        <p className="text-xs sm:text-sm text-red-700">ID: {alert.id}</p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <div className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                        🚨 CRITICAL
                    </div>
                    <div className="text-xs text-red-600 mt-1">📅 {timeAgo(alert.created_at)}</div>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 flex-shrink-0" />
                    <span className="font-medium truncate">{alert.user_name || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 flex-shrink-0" />
                    {alert.latitude && alert.longitude ? (
                        <span className="truncate">{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                    ) : (
                        <span className="text-amber-600">🔍 Locating...</span>
                    )}
                </div>
            </div>

            {alert.description && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-3 mb-4">
                    <p className="text-amber-900 text-xs sm:text-sm line-clamp-2">📝 {alert.description}</p>
                </div>
            )}

            {alert.assigned_team_name && (
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 mb-4">
                    <div className="text-xs text-blue-600 font-bold">🚔 UNIT ASSIGNED</div>
                    <div className="text-blue-800 font-semibold text-xs sm:text-sm truncate">{alert.assigned_team_name}</div>
                </div>
            )}

            {alert.is_streaming && (
                <div className="bg-purple-100 border border-purple-300 rounded-lg p-2 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse flex-shrink-0" />
                        <span className="text-purple-800 font-semibold text-xs sm:text-sm flex-1 truncate">📹 Live Video Available</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onVideoStreamSelect(alert);
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-2 sm:px-3 py-1 rounded text-xs flex-shrink-0"
                        >
                            View
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <select
                    onChange={(e) => {
                        e.stopPropagation();
                        onTeamAssignment(alert.id, e.target.value);
                    }}
                    defaultValue=""
                    className="w-full bg-white border border-red-300 rounded-lg px-3 py-2 text-xs sm:text-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    <option value="" disabled>🚔 Assign Patrol Unit</option>
                    {patrolUnits.filter(u => u.is_active).map(unit => (
                        <option key={unit.id} value={unit.id}>
                            {unit.team_id} - {unit.station_name}
                        </option>
                    ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (alert.latitude && alert.longitude) {
                                window.open(`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`, '_blank');
                            }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1"
                    >
                        <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Navigate</span>
                        <span className="sm:hidden">🧭 Nav</span>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onResolve(alert.id);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1"
                    >
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Resolve</span>
                        <span className="sm:hidden">✅ Fix</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const ReportCard = ({ report, index, onOpen, onStatusUpdate }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'investigating': return 'bg-blue-100 text-blue-800';
            case 'dismissed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'crime': return 'bg-red-100 text-red-800';
            case 'harassment': return 'bg-orange-100 text-orange-800';
            case 'safety': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeEmoji = (type) => {
        switch (type) {
            case 'crime': return '🚔';
            case 'harassment': return '⚠️';
            case 'safety': return '🛡️';
            case 'infrastructure': return '🏗️';
            default: return '📋';
        }
    };

    const getStatusEmoji = (status) => {
        switch (status) {
            case 'resolved': return '✅';
            case 'investigating': return '🔍';
            case 'dismissed': return '❌';
            default: return '⏳';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="border border-slate-200 bg-white rounded-xl p-3 sm:p-4 hover:shadow-md transition-all cursor-pointer"
            onClick={() => onOpen(report)}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-lg font-bold text-slate-900 truncate">
                        📋 {report.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2">{report.description}</p>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(report.report_type)}`}>
                        {getTypeEmoji(report.report_type)} {report.report_type.toUpperCase()}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(report.status)}`}>
                        {getStatusEmoji(report.status)} {report.status.toUpperCase()}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-1">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">👤 {report.reporter_name || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">📅 {new Date(report.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">📍 {report.location || 'Location unknown'}</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onStatusUpdate(report.id, 'investigating');
                    }}
                    disabled={report.status === 'investigating'}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                >
                    <span className="hidden sm:inline">🔍 Mark Investigating</span>
                    <span className="sm:hidden">🔍 Investigating</span>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onStatusUpdate(report.id, 'resolved');
                    }}
                    disabled={report.status === 'resolved'}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                >
                    <span className="hidden sm:inline">✅ Mark Resolved</span>
                    <span className="sm:hidden">✅ Resolved</span>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onStatusUpdate(report.id, 'dismissed');
                    }}
                    disabled={report.status === 'dismissed'}
                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                >
                    ❌ Dismiss
                </button>
            </div>
        </motion.div>
    );
};

const ContextDrawer = ({ incident, patrolUnits, onStream, onAssignTeam, onResolve, onStatusUpdate, onClose }) => (
    <div className="lg:sticky lg:top-[84px]">
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
            <div className={`${PANEL_PAD} border-b border-slate-200 flex items-center justify-between`}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg flex-shrink-0">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-slate-900 font-semibold text-sm sm:text-base truncate">📋 Details Panel</h3>
                        <p className="text-slate-600 text-xs hidden sm:block">Incident information & actions</p>
                    </div>
                </div>
                {/* <button
                    onClick={onClose}
                    className="text-slate-600 text-xs sm:text-sm hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded flex-shrink-0"
                    type="button"
                    title="Press Escape to close"
                >
                    ❌ Close
                </button> */}
            </div>

            {!incident ? (
                <div className="p-4 sm:p-6 text-slate-600 text-sm text-center">
                    <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 mx-auto mb-2" />
                    <p>📋 Select an incident to view details and actions here.</p>
                </div>
            ) : (
                <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 max-h-[70vh] overflow-y-auto" role="region" aria-live="polite">
                    {/* Enhanced Details */}
                    <div className="space-y-3">
                        <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="text-slate-900 font-semibold text-base sm:text-lg truncate">
                                    {incident.emergency_type ? '🚨' : '📋'} {incident.emergency_type || incident.title || 'Incident'}
                                </div>
                                <div className="text-xs text-slate-600">🆔 ID: {incident.id}</div>
                            </div>
                            {incident.status && (
                                <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${incident.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                    incident.status === 'investigating' ? 'bg-blue-100 text-blue-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                    {incident.status === 'resolved' ? '✅' :
                                        incident.status === 'investigating' ? '🔍' : '⏳'} {incident.status.toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate">👤 {incident.user_name || incident.reporter_name || 'Anonymous'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                {incident.latitude && incident.longitude ? (
                                    <span className="truncate">📍 {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}</span>
                                ) : (
                                    <span className="text-amber-600">🔍 Location pending...</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate">📅 {new Date(incident.created_at).toLocaleString()}</span>
                            </div>
                        </div>

                        {incident.assigned_team_name && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="text-xs text-blue-600 font-semibold mb-1">🚔 ASSIGNED UNIT</div>
                                <div className="text-blue-800 font-medium text-sm truncate">{incident.assigned_team_name}</div>
                            </div>
                        )}

                        {incident.description && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="text-xs text-amber-600 font-semibold mb-1">📝 DESCRIPTION</div>
                                <div className="text-amber-800 text-xs sm:text-sm leading-relaxed">{incident.description}</div>
                            </div>
                        )}
                        {/* Video Section */}
                        <div>
                            <div className="text-slate-900 font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                Live Video Feed
                            </div>
                            <div className="aspect-video bg-slate-900 rounded-lg relative overflow-hidden">
                                {incident.is_streaming ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center p-4">
                                            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Play className="w-4 h-4 sm:w-6 sm:h-6 text-red-400" />
                                            </div>
                                            <p className="text-white font-medium mb-2 text-sm sm:text-base">Live Stream Active</p>
                                            <p className="text-red-300 text-xs mb-4">Emergency ID: {incident.id}</p>
                                            <button
                                                onClick={onStream}
                                                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
                                                type="button"
                                            >
                                                <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                                Open Stream
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center p-4">
                                            <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500 mx-auto mb-2" />
                                            <p className="text-slate-400 text-xs sm:text-sm">No live stream available</p>
                                            <p className="text-slate-500 text-xs mt-1">Stream may become available if caller initiates video</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Actions */}
                        <div className="space-y-4">
                            <div>
                                <div className="text-slate-900 font-semibold mb-2 text-sm sm:text-base">Assign Patrol Unit</div>
                                <select
                                    onChange={(e) => onAssignTeam(incident.id, e.target.value)}
                                    defaultValue=""
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="" disabled>Select patrol unit...</option>
                                    {patrolUnits.filter(u => u.is_active).map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.team_id} - {u.station_name} (Available)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        if (incident.latitude && incident.longitude) {
                                            window.open(`https://maps.google.com/?q=${incident.latitude},${incident.longitude}`, '_blank');
                                        } else {
                                            toast.error('Location not available yet');
                                        }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm inline-flex items-center justify-center gap-1 sm:gap-2 transition-colors"
                                    type="button"
                                >
                                    <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
                                    Navigate
                                </button>
                                <button
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm inline-flex items-center justify-center gap-1 sm:gap-2 transition-colors"
                                    type="button"
                                >
                                    <Radio className="w-3 h-3 sm:w-4 sm:h-4" />
                                    Dispatch
                                </button>
                            </div>
                            {/* Status update buttons */}
                            {incident.emergency_type ? (
                                <button
                                    onClick={() => onResolve(incident.id)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-xs sm:text-sm inline-flex items-center justify-center gap-1 sm:gap-2 transition-colors"
                                    type="button"
                                >
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                    Resolve Emergency
                                </button>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => onStatusUpdate(incident.id, 'investigating')}
                                        disabled={incident.status === 'investigating'}
                                        className="bg-blue-50 hover:bg-blue-100 disabled:bg-gray-100 text-blue-700 disabled:text-gray-500 border border-blue-200 disabled:border-gray-200 rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm transition-colors"
                                        type="button"
                                    >
                                        <span className="hidden sm:inline">Mark Investigating</span>
                                        <span className="sm:hidden">Investigating</span>
                                    </button>
                                    <button
                                        onClick={() => onStatusUpdate(incident.id, 'resolved')}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm inline-flex items-center justify-center gap-1 transition-colors"
                                        type="button"
                                    >
                                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                        Resolve
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);

const LoadingSpinner = ({ message }) => (
    <div className="py-8 sm:py-10 text-center">
        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 animate-spin mx-auto mb-3" />
        <div className="text-slate-600 text-xs sm:text-sm">{message || 'Loading...'}</div>
    </div>
);

const EmptyState = ({ icon: Icon, title, subtitle, variant = 'default' }) => {
    const variantClasses =
        variant === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-slate-50 border-slate-200 text-slate-600';
    return (
        <div className={`py-8 sm:py-10 text-center border rounded-xl ${variantClasses}`}>
            <Icon className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2" />
            <div className="text-slate-900 font-semibold text-sm sm:text-base">{title}</div>
            <div className="text-xs sm:text-sm">{subtitle}</div>
        </div>
    );
};

export default PoliceDashboard;
