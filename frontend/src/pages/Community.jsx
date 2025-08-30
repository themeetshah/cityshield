import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import reportsService from '../services/reports';
import sosService from '../services/sos';
import { toast } from 'react-hot-toast';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import {
    MapPin,
    Clock,
    AlertTriangle,
    Users,
    Shield,
    RefreshCw,
    Filter,
    Heart,
    MessageCircle,
    Share2,
    Route,
    Star,
    Activity,
    TrendingUp,
    BarChart3,
    PieChart as PieChartIcon,
    Building,
    FileText,
    Zap,
    Radio,
    CheckCircle2,
    Phone,
    Navigation,
    Eye,
    ChevronDown,
    Search,
    X,
    UserCheck,
    Siren
} from 'lucide-react';

// Enhanced Category Dropdown Component
const CategoryDropdown = ({ currentFilter, setCurrentFilter, availableCategories, activeTab }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleCategorySelect = (category) => {
        setCurrentFilter(category);
        setIsOpen(false);
        setSearchTerm('');
    };

    const getDisplayName = (category) => {
        return category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1);
    };

    const filteredCategories = availableCategories.filter(category =>
        getDisplayName(category).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-white border-2 border-gray-300 rounded-xl hover:border-gray-400 focus:border-blue-500 focus:outline-none transition-all duration-200 min-w-[120px] shadow-sm hover:shadow-md"
            >
                <span className="text-sm font-medium text-gray-700 truncate flex-1">
                    {getDisplayName(currentFilter)}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* Search Bar */}
                    {availableCategories.length > 5 && (
                        <div className="p-3 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search categories..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Categories List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredCategories.length > 0 ? (
                            filteredCategories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => handleCategorySelect(category)}
                                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 ${currentFilter === category
                                        ? 'bg-blue-50 border-r-4 border-blue-500'
                                        : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm ${currentFilter === category
                                            ? 'text-blue-700 font-medium'
                                            : 'text-gray-700'
                                            }`}>
                                            {getDisplayName(category)}
                                        </span>
                                        {currentFilter === category && (
                                            <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                                        )}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                No categories found matching "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const Community = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State management
    const [userReports, setUserReports] = useState([]);
    const [adminAlerts, setAdminAlerts] = useState([]);
    const [sosAlerts, setSosAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('citizen_reports');

    // Tab-specific filters
    const [citizenFilter, setCitizenFilter] = useState('all');
    const [officialFilter, setOfficialFilter] = useState('all');
    const [sosFilter, setSosFilter] = useState('all');

    const [volunteerStatus, setVolunteerStatus] = useState({ is_volunteer: false, is_available: false });
    const [userRole, setUserRole] = useState('citizen');
    const [respondingToSOS, setRespondingToSOS] = useState({});

    // Stats and insights state
    const [communityStats, setCommunityStats] = useState({
        total_reports: 0,
        user_reports: 0,
        admin_alerts: 0,
        active_sos: 0,
        resolved_issues: 0,
        available_volunteers: 0
    });

    const [chartData, setChartData] = useState({
        categoryData: [],
        timelineData: [],
        severityData: [],
        weeklyTrends: []
    });

    // NEW: Get user role and permissions
    useEffect(() => {
        if (user) {
            // console.log(user)
            setUserRole(user.role)
        }
    }, [user, volunteerStatus]);

    // Get current location
    useEffect(() => {
        getCurrentLocation();
    }, []);

    // Load volunteer status
    useEffect(() => {
        if (user) {
            loadVolunteerStatus();
        }
    }, [user]);

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Location error:', error);
                    setLocationError('Unable to access location. Please enable location services.');
                    // Demo fallback for testing
                    setUserLocation({
                        latitude: 28.6139,
                        longitude: 77.2090
                    });
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
            );
        }
    };

    const loadVolunteerStatus = async () => {
        try {
            const status = await sosService.getVolunteerStatus();
            setVolunteerStatus(status);
        } catch (error) {
            console.error('Failed to load volunteer status:', error);
        }
    };

    // NEW: Handle volunteer response to SOS
    // NEW: Handle volunteer response to SOS
    const handleVolunteerResponse = async (sosItem) => {
        if (!['volunteer', 'police', 'admin'].includes(userRole)) {
            toast.error('Only volunteers and police can respond to SOS alerts');
            return;
        } else if (sosItem.reporter === user.email) {
            toast.error("You can't respond to your own SOS call")
            return;
        }

        try {
            setRespondingToSOS(prev => ({ ...prev, [sosItem.id]: true }));

            // Call the API to register volunteer response
            const response = await sosService.respondToSOS({
                sos_id: sosItem.sos_id,
                volunteer_id: user?.id,
                latitude: userLocation?.latitude,
                longitude: userLocation?.longitude,
                message: 'Responding to emergency'
            });

            if (response.auto_registered) {
                toast.success(`🚨 Auto-registered as volunteer and now responding to SOS alert!`, { duration: 5000 });
            } else {
                toast.success(`🚨 You are now responding to this SOS alert!`);
            }

            // Refresh volunteer status
            await loadVolunteerStatus();

            // Then navigate to the location
            setTimeout(() => {
                handleNavigateToIncident(sosItem);
            }, 1000);

        } catch (error) {
            console.error('Error responding to SOS:', error);

            if (error.response?.status === 404) {
                toast.error('SOS alert not found or already resolved');
            } else if (error.response?.status === 403) {
                toast.error(error.response?.data?.error || 'You do not have permission to respond to SOS alerts');
            } else if (error.response?.status === 400) {
                toast.error(error.response?.data?.error || 'Bad request - please check your data');
            } else {
                toast.error('Failed to register SOS response. Please try again.');
            }
        } finally {
            setRespondingToSOS(prev => ({ ...prev, [sosItem.id]: false }));
        }
    };


    // UPDATED: Fetch comprehensive community data with proper API calls
    const fetchCommunityData = async (showRefreshing = false) => {
        if (!userLocation) return;

        try {
            if (showRefreshing) setRefreshing(true);

            const [reportsResponse, sosResponse] = await Promise.all([
                reportsService.fetchNearbyReports(
                    userLocation.latitude,
                    userLocation.longitude,
                    5000
                ),
                sosService.getSOSByRole(
                    userLocation.latitude,
                    userLocation.longitude,
                ) // NEW: Use role-based API
            ]);

            // console.log('SOS API Response:', sosResponse);

            // Process user reports
            const processedUserReports = (reportsResponse.reports || reportsResponse.results || reportsResponse).map(report => ({
                id: report.id,
                type: 'user_report',
                source_type: 'citizen',
                title: report.title,
                description: report.description,
                coordinates: {
                    latitude: report.latitude,
                    longitude: report.longitude
                },
                distance: calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    report.latitude,
                    report.longitude
                ),
                timestamp: new Date(report.created_at),
                reporter: report.reported_by_name || 'Anonymous Citizen',
                status: report.status || 'active',
                severity: getSeverityFromCategory(report.report_type),
                isNew: (Date.now() - new Date(report.created_at).getTime()) < 600000,
                category: report.report_type || 'other',
                priority: report.priority || 'medium'
            }));

            // Generate mock admin alerts
            const mockAdminAlerts = generateMockAdminAlerts(userLocation);

            // UPDATED: Process SOS alerts from role-based API response
            let processedSosAlerts = [];

            if (sosResponse && sosResponse.success) {
                const sosData = sosResponse.alerts || sosResponse.data || [];
                processedSosAlerts = sosData.map(sos => ({
                    id: `sos-${sos.id}`,
                    type: 'sos',
                    source_type: 'emergency',
                    title: '🚨 EMERGENCY SOS ALERT',
                    description: sos.description || `Emergency: ${sos.emergency_type || 'General Emergency'} - Immediate assistance required`,
                    coordinates: {
                        latitude: sos.latitude,
                        longitude: sos.longitude
                    },
                    distance: calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        sos.latitude,
                        sos.longitude
                    ),
                    timestamp: new Date(sos.created_at),
                    reporter: sos.user_email || 'Emergency User',
                    status: sos.is_active ? 'active' : 'resolved',
                    severity: 'critical',
                    isNew: (Date.now() - new Date(sos.created_at).getTime()) < 600000,
                    category: 'emergency',
                    emergency_type: sos.emergency_type,
                    isStreaming: sos.is_streaming || false,
                    priority: 'critical',
                    sos_id: sos.id,
                    is_active: sos.is_active,
                    responders_count: sos.responders_count || 0,
                    estimated_response_time: sos.estimated_response_time || null
                }));
            }

            // console.log('Processed SOS Alerts:', processedSosAlerts);
            // console.log('User Role:', userRole);

            setUserReports(processedUserReports);
            setAdminAlerts(mockAdminAlerts);
            setSosAlerts(processedSosAlerts);

            // Calculate stats
            const stats = {
                total_reports: processedUserReports.length + mockAdminAlerts.length + processedSosAlerts.length,
                user_reports: processedUserReports.length,
                admin_alerts: mockAdminAlerts.length,
                active_sos: processedSosAlerts.filter(s => s.status === 'active').length,
                resolved_issues: [...processedUserReports, ...mockAdminAlerts, ...processedSosAlerts].filter(item => item.status === 'resolved').length,
                available_volunteers: Math.floor(Math.random() * 25) + 15
            };
            setCommunityStats(stats);

            // Generate chart data
            generateChartData([...processedUserReports, ...mockAdminAlerts, ...processedSosAlerts]);

            if (showRefreshing) {
                toast.success('🔄 Community data refreshed successfully!');
            }

        } catch (error) {
            console.error('Error fetching community data:', error);
            toast.error('Failed to load community data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Generate mock admin alerts (keeping existing function)
    const generateMockAdminAlerts = (location) => {
        const alertTypes = [
            {
                title: 'Road Closure - Construction Work',
                description: 'Main Street will be closed for emergency repairs from 9 AM to 6 PM today. Traffic is being diverted via alternate routes.',
                category: 'infrastructure',
                source: 'Municipal Corporation',
                severity: 'medium',
                priority: 'high'
            },
            {
                title: 'Security Alert - Increased Patrols',
                description: 'Police have increased security patrols in the area following recent incidents. Citizens are advised to remain vigilant.',
                category: 'safety',
                source: 'Police Department',
                severity: 'high',
                priority: 'high'
            },
            {
                title: 'Water Supply Maintenance',
                description: 'Scheduled maintenance of water supply infrastructure. Water supply may be disrupted between 11 PM to 6 AM.',
                category: 'utilities',
                source: 'Water Department',
                severity: 'medium',
                priority: 'medium'
            }
        ];

        return alertTypes.map((alert, index) => ({
            id: `admin-${index}`,
            type: 'admin_alert',
            source_type: 'authority',
            title: alert.title,
            description: alert.description,
            coordinates: {
                latitude: location.latitude + (Math.random() - 0.5) * 0.01,
                longitude: location.longitude + (Math.random() - 0.5) * 0.01
            },
            distance: Math.floor(Math.random() * 2000) + 500,
            timestamp: new Date(Date.now() - Math.random() * 86400000 * 2),
            reporter: alert.source,
            status: Math.random() > 0.3 ? 'active' : 'resolved',
            severity: alert.severity,
            isNew: Math.random() > 0.6,
            category: alert.category,
            priority: alert.priority,
            official: true
        }));
    };

    // Generate chart data for insights (keeping existing function)
    const generateChartData = (allData) => {
        // Category distribution
        const categoryCount = {};
        allData.forEach(item => {
            categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
        });

        const categoryData = Object.entries(categoryCount).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: getCategoryColor(name)
        }));

        // Severity distribution
        const severityCount = {};
        allData.forEach(item => {
            severityCount[item.severity] = (severityCount[item.severity] || 0) + 1;
        });

        const severityData = Object.entries(severityCount).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: getSeverityColor(name)
        }));

        // Timeline data (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date;
        });

        const timelineData = last7Days.map(date => {
            const dayData = allData.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate.toDateString() === date.toDateString();
            });

            return {
                date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                'Citizen Reports': dayData.filter(item => item.type === 'user_report').length,
                // 'Official Alerts': dayData.filter(item => item.type === 'admin_alert').length,
                'SOS Alerts': dayData.filter(item => item.type === 'sos').length,
                total: dayData.length
            };
        });

        // Weekly trends by source type
        const weeklyTrends = last7Days.map(date => {
            const dayData = allData.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate.toDateString() === date.toDateString();
            });

            return {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                Citizens: dayData.filter(item => item.source_type === 'citizen').length,
                // Authorities: dayData.filter(item => item.source_type === 'authority').length,
                Emergency: dayData.filter(item => item.source_type === 'emergency').length
            };
        });

        setChartData({
            categoryData,
            severityData,
            timelineData,
            weeklyTrends
        });
    };

    // Utility functions (keeping existing functions)
    const getSeverityFromCategory = (category) => {
        switch (category) {
            case 'crime':
            case 'safety':
                return 'high';
            case 'infrastructure':
            case 'traffic':
            case 'utilities':
                return 'medium';
            case 'environment':
            case 'health':
                return 'low';
            default:
                return 'medium';
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    };

    const getCategoryColor = (category) => {
        const colors = {
            infrastructure: '#3b82f6',
            safety: '#ef4444',
            environment: '#22c55e',
            traffic: '#f59e0b',
            health: '#8b5cf6',
            utilities: '#06b6d4',
            crime: '#dc2626',
            emergency: '#991b1b',
            other: '#6b7280'
        };
        return colors[category] || colors.other;
    };

    const getSeverityColor = (severity) => {
        const colors = {
            critical: '#dc2626',
            high: '#ea580c',
            medium: '#0891b2',
            low: '#16a34a'
        };
        return colors[severity] || colors.medium;
    };

    // Load data when location is available
    useEffect(() => {
        if (userLocation) {
            fetchCommunityData();
            const interval = setInterval(() => fetchCommunityData(), 60000);
            return () => clearInterval(interval);
        }
    }, [userLocation, userRole]); // Added userRole dependency

    // Get data based on active tab with tab-specific filters
    const getCurrentTabData = () => {
        let data = [];
        let currentFilter = 'all';

        switch (activeTab) {
            case 'citizen_reports':
                data = userReports;
                currentFilter = citizenFilter;
                break;
            case 'official_alerts':
                data = adminAlerts;
                currentFilter = officialFilter;
                break;
            case 'sos_reports':
                data = sosAlerts;
                currentFilter = sosFilter;
                break;
            case 'insights':
                return null;
            default:
                data = [...userReports, ...adminAlerts, ...sosAlerts];
        }

        // Apply tab-specific filters
        if (currentFilter !== 'all') {
            data = data.filter(item => item.category === currentFilter);
        }

        // Sort by priority and time
        data.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return b.timestamp - a.timestamp;
        });

        return data;
    };

    // Get available categories for current tab
    const getAvailableCategories = () => {
        let data = [];

        switch (activeTab) {
            case 'citizen_reports':
                data = userReports;
                break;
            case 'official_alerts':
                data = adminAlerts;
                break;
            case 'sos_reports':
                data = sosAlerts;
                break;
            default:
                return ['all'];
        }

        const categories = ['all', ...new Set(data.map(item => item.category))];
        return categories;
    };

    // Get current filter for active tab
    const getCurrentFilter = () => {
        switch (activeTab) {
            case 'citizen_reports':
                return citizenFilter;
            case 'official_alerts':
                return officialFilter;
            case 'sos_reports':
                return sosFilter;
            default:
                return 'all';
        }
    };

    // Set filter for active tab
    const setCurrentFilter = (filter) => {
        switch (activeTab) {
            case 'citizen_reports':
                setCitizenFilter(filter);
                break;
            case 'official_alerts':
                setOfficialFilter(filter);
                break;
            case 'sos_reports':
                setSosFilter(filter);
                break;
        }
    };

    const formatTimeAgo = (timestamp) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return timestamp.toLocaleDateString();
    };

    // Navigation functions to use SafetyMap
    const handleNavigateToIncident = (item) => {
        if (!userLocation) {
            toast.error('Unable to determine your location. Please enable location services.');
            return;
        }

        // Navigate to SafetyMap with incident routing data
        navigate('/safety-map', {
            state: {
                navigationType: 'incident_route',
                startLocation: {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    name: 'Your Location'
                },
                endLocation: {
                    latitude: item.coordinates.latitude,
                    longitude: item.coordinates.longitude,
                    name: item.title,
                    type: item.type,
                    severity: item.severity
                },
                incidentData: item,
                showRoute: true,
                routeType: 'incident',
                focusAlert: item.id,
                isActive: true
            }
        });

        toast.success(`🗺️ Opening route to: ${item.title}`, {
            duration: 3000,
            icon: item.type === 'sos' ? '🚨' : item.type === 'admin_alert' ? '🏛️' : '📍'
        });
    };

    // Navigate to safety map with overview (no routing)
    const handleViewOnSafetyMap = (item) => {
        navigate('/safety-map', {
            state: {
                navigationType: 'view',
                focusLocation: {
                    latitude: item.coordinates.latitude,
                    longitude: item.coordinates.longitude,
                    name: item.title
                },
                incidentData: item,
                showRoute: false,
                focusAlert: item.id
            }
        });

        toast.success(`📍 Opening safety map view for: ${item.title}`);
    };

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

    if (locationError) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md border border-gray-200">
                        <div className="w-20 h-20 mx-auto mb-6 bg-red-500 rounded-full flex items-center justify-center">
                            <Navigation className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Location Access Required</h3>
                        <p className="text-gray-600 mb-6">{locationError}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
                        >
                            Enable Location & Retry
                        </button>
                    </div>
                </div>
            </>
        );
    }

    const currentTabData = getCurrentTabData();
    const availableCategories = getAvailableCategories();
    const currentFilter = getCurrentFilter();

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">

                {/* Enhanced Banner */}
                <div className="bg-white border-b border-gray-200 shadow-sm">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                        <div className="text-center">
                            {/* Clean Live Status Banner */}
                            <div className="inline-flex items-center gap-4 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-black/20 mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium">Live Community Network</span>
                                </div>
                                <div className="h-4 w-px bg-black/30"></div>
                                <button
                                    onClick={() => fetchCommunityData(true)}
                                    disabled={refreshing}
                                    className="inline-flex items-center gap-2 px-1 py-2 bg-white/10 hover:bg-gray-500/10 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                                >
                                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                                </button>
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4 pb-3">
                                Community Safety Hub
                            </h1>

                            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                                Real-time safety insights from citizens and emergency services in your area
                            </p>

                            {/* Role-based information banner */}
                            {userRole !== 'citizen' && (
                                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-300 rounded-full">
                                    <UserCheck className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-700">
                                        {userRole === 'admin' && 'Administrator Access - Full SOS Visibility'}
                                        {userRole === 'volunteer' && 'Volunteer Access - Can Respond to SOS Alerts'}
                                        {userRole === 'police' && 'Police Access - Emergency Response Authority'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Enhanced Responsive Tab Navigation */}
                <div className="bg-white border-b border-gray-200 shadow-sm">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-wrap justify-center gap-1 sm:gap-2 py-4 sm:py-6">
                            {[
                                {
                                    key: 'citizen_reports',
                                    label: 'Citizen Reports',
                                    shortLabel: 'Citizens',
                                    icon: Users,
                                    count: userReports.length,
                                    color: 'blue'
                                },
                                // {
                                //     key: 'official_alerts',
                                //     label: 'Official Alerts',
                                //     shortLabel: 'Officials',
                                //     icon: Building,
                                //     count: adminAlerts.length,
                                //     color: 'purple'
                                // },
                                {
                                    key: 'sos_reports',
                                    label: 'SOS Reports',
                                    shortLabel: 'SOS',
                                    icon: AlertTriangle,
                                    count: sosAlerts.length,
                                    color: 'red'
                                },
                                {
                                    key: 'insights',
                                    label: 'Insights',
                                    shortLabel: 'Stats',
                                    icon: BarChart3,
                                    count: null,
                                    color: 'green'
                                }
                            ].map(({ key, label, shortLabel, icon: Icon, count, color }) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={`
                    group relative flex items-center justify-center 
                    px-1 py-2 xs:px-2 sm:px-3 md:px-4 
                    rounded-lg sm:rounded-xl 
                    font-semibold text-sm sm:text-base
                    transition-all duration-200
                    ${activeTab === key
                                            ? color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                                : color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                                                    : color === 'red' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                                                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent hover:border-gray-300'
                                        }
                  `}
                                >
                                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />

                                    <span className="hidden xs:block sm:hidden ml-1 text-xs">
                                        {shortLabel}
                                    </span>
                                    <span className="hidden sm:block ml-2">
                                        {label}
                                    </span>

                                    {count !== null && (
                                        <span className={`
                      ml-1 sm:ml-2 px-1.5 py-0.5 sm:px-2 sm:py-1 
                      text-xs rounded-full font-bold
                      ${activeTab === key ? 'bg-white/20' : 'bg-gray-200 text-gray-700'}
                    `}>
                                            {count}
                                        </span>
                                    )}

                                    <div className="xs:hidden absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                                        {label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">

                    {/* Insights Tab Content */}
                    {activeTab === 'insights' && (
                        <div className="space-y-8">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
                                    <BarChart3 className="w-8 h-8 text-green-600" />
                                    Community Safety Insights
                                </h2>
                                <p className="text-gray-600 max-w-2xl mx-auto">
                                    Comprehensive analytics and trends from your local area safety data
                                </p>
                            </div>

                            {/* Charts Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Category Distribution */}
                                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <PieChartIcon className="w-6 h-6 text-purple-600" />
                                        Reports by Category
                                    </h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartData.categoryData}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={100}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {chartData.categoryData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Weekly Timeline */}
                                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <TrendingUp className="w-6 h-6 text-blue-600" />
                                        7-Day Activity Timeline
                                    </h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData.timelineData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" />
                                                <YAxis />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="Citizen Reports" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                                                {/* <Area type="monotone" dataKey="Official Alerts" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} /> */}
                                                <Area type="monotone" dataKey="SOS Alerts" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Severity Distribution */}
                                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <Activity className="w-6 h-6 text-orange-600" />
                                        Severity Distribution
                                    </h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData.severityData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" />
                                                <YAxis />
                                                <Tooltip />
                                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                    {chartData.severityData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Source Trends */}
                                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <Zap className="w-6 h-6 text-green-600" />
                                        Weekly Trends by Source
                                    </h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData.weeklyTrends}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="day" />
                                                <YAxis />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="Citizens" stroke="#3b82f6" strokeWidth={3} />
                                                {/* <Line type="monotone" dataKey="Authorities" stroke="#8b5cf6" strokeWidth={3} /> */}
                                                <Line type="monotone" dataKey="Emergency" stroke="#ef4444" strokeWidth={3} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reports/Alerts Content */}
                    {activeTab !== 'insights' && (
                        <>
                            {/* Enhanced Category Filter with Dropdown */}
                            {currentTabData && currentTabData.length > 0 && availableCategories.length > 1 && (
                                <div className="flex flex-col sm:flex-row gap-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-lg mb-8">
                                    <div className="flex flex-row sm:items-center gap-4">
                                        {/* Filter Label */}
                                        <div className="flex items-center gap-2">
                                            <Filter className="w-5 h-5 text-gray-600" />
                                            <span className="font-semibold text-gray-700 hidden sm:inline">
                                                Filter {activeTab === 'citizen_reports' ? 'Citizen Reports' :
                                                    // activeTab === 'official_alerts' ? 'Official Alerts' :
                                                    'SOS Reports'} by Category:
                                            </span>
                                            <span className="font-semibold text-gray-700 sm:hidden">Filter by:</span>
                                        </div>

                                        {/* Category Dropdown */}
                                        <CategoryDropdown
                                            currentFilter={currentFilter}
                                            setCurrentFilter={setCurrentFilter}
                                            availableCategories={availableCategories}
                                            activeTab={activeTab}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="px-3 py-1 bg-gray-100 rounded-full">
                                            <span className="text-sm text-gray-600 font-medium">
                                                {currentTabData.length} result{currentTabData.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {/* Clear Filter Button */}
                                        {currentFilter !== 'all' && (
                                            <button
                                                onClick={() => setCurrentFilter('all')}
                                                className="px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors text-sm font-medium"
                                            >
                                                Clear Filter
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Content Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                                        {activeTab === 'citizen_reports' ? 'Citizen Reports' :
                                            // activeTab === 'official_alerts' ? 'Official Alerts' :
                                            'SOS Emergency Reports'}
                                    </h2>
                                    <p className="text-gray-600">
                                        {currentTabData ? `${currentTabData.length} items` : '0 items'} in your area
                                        {/* NEW: Role-based information */}
                                        {activeTab === 'sos_reports' && userRole === 'citizen' && (
                                            <span className="block text-sm text-blue-600 mt-1">
                                                ℹ️ Only showing resolved SOS alerts for privacy
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Content Grid */}
                            {!currentTabData || currentTabData.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                                        {activeTab === 'citizen_reports' && <Users className="w-12 h-12 text-gray-400" />}
                                        {activeTab === 'official_alerts' && <Building className="w-12 h-12 text-gray-400" />}
                                        {activeTab === 'sos_reports' && <AlertTriangle className="w-12 h-12 text-gray-400" />}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                                        {activeTab === 'citizen_reports' && 'No Citizen Reports'}
                                        {/* {activeTab === 'official_alerts' && 'No Official Alerts'} */}
                                        {activeTab === 'sos_reports' && 'No SOS Reports'}
                                    </h3>
                                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                                        {activeTab === 'citizen_reports' && 'No citizen reports have been submitted in your area recently.'}
                                        {/* {activeTab === 'official_alerts' && 'No official alerts from authorities in your area.'} */}
                                        {activeTab === 'sos_reports' && (
                                            userRole === 'citizen'
                                                ? 'No resolved SOS reports to display. Active emergencies are only visible to volunteers and authorities.'
                                                : 'No SOS emergency reports in your area. Your community is safe.'
                                        )}
                                    </p>
                                    {activeTab === 'citizen_reports' && (
                                        <button
                                            onClick={() => navigate('/reports/new')}
                                            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                                        >
                                            Submit a Report
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                                    {/* {console.log(currentTabData)}
                                    {console.log(user)} */}
                                    {currentTabData.map((item, index) => {
                                        const isAdmin = item.type === 'admin_alert';
                                        const isSOS = item.type === 'sos';
                                        const isUser = item.type === 'user_report';

                                        // console.log(item)
                                        // UPDATED: Enhanced status-based styling for SOS with proper condition checks
                                        const getHeaderStyle = () => {
                                            if (isSOS) {
                                                // Red header for active SOS, green header for resolved SOS
                                                return (item.status === 'active' || item.is_active)
                                                    ? 'bg-gradient-to-r from-red-600 to-red-700'      // Red for active
                                                    : 'bg-gradient-to-r from-green-600 to-green-700'; // Green for resolved
                                            } else if (isAdmin) {
                                                return 'bg-gradient-to-r from-purple-600 to-purple-700';
                                            } else {
                                                return 'bg-gradient-to-r from-blue-600 to-blue-700';
                                            }
                                        };

                                        const getCardBorderStyle = () => {
                                            if (isSOS) {
                                                return (item.status === 'active' || item.is_active)
                                                    ? 'border-red-200 bg-gradient-to-br from-red-50 to-white'    // Red border for active
                                                    : 'border-green-200 bg-gradient-to-br from-green-50 to-white'; // Green border for resolved
                                            } else if (isAdmin) {
                                                return 'border-purple-200 bg-gradient-to-br from-purple-50 to-white';
                                            } else {
                                                return 'border-blue-200 bg-gradient-to-br from-blue-50 to-white';
                                            }
                                        };

                                        const getStatusIcon = () => {
                                            if (isSOS) {
                                                return (item.status === 'active' || item.is_active) ? '🚨' : '✅';
                                            } else if (isAdmin) {
                                                return '🏛️';
                                            } else {
                                                return '👤';
                                            }
                                        };

                                        const getStatusText = () => {
                                            if (isSOS) {
                                                return (item.status === 'active' || item.is_active) ? 'Active Emergency' : 'Resolved SOS';
                                                // } else if (isAdmin) {
                                                //     return 'Official Alert';
                                            } else {
                                                return 'Citizen Report';
                                            }
                                        };

                                        return (
                                            <div
                                                key={item.id}
                                                className={`rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 ${getCardBorderStyle()} overflow-hidden`}
                                            >
                                                {/* Dynamic Card Header with Conditional Styling */}
                                                <div className={`${getHeaderStyle()} p-6 text-white relative overflow-hidden`}>
                                                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                                                    <div className="relative">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-3xl">
                                                                    {getStatusIcon()}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
                                                                        {getStatusText()}
                                                                    </span>
                                                                    <span className="text-sm font-medium text-white/90 capitalize">
                                                                        {item.category}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-2">
                                                                {/* Enhanced Status Badge for SOS */}
                                                                {isSOS && (
                                                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${(item.status === 'active' || item.is_active)
                                                                        ? 'bg-red-400/20 text-red-100 border border-red-300/30'
                                                                        : 'bg-green-400/20 text-green-100 border border-green-300/30'
                                                                        }`}>
                                                                        {(item.status === 'active' || item.is_active) ? 'ACTIVE' : 'RESOLVED'}
                                                                    </span>
                                                                )}

                                                                {item.isNew && (
                                                                    <span className="px-2 py-1 bg-white/20 rounded-lg text-xs font-bold">
                                                                        NEW
                                                                    </span>
                                                                )}
                                                                {item.official && (
                                                                    <Star className="w-4 h-4 text-yellow-300" />
                                                                )}
                                                                {item.isStreaming && (
                                                                    <Radio className="w-4 h-4 text-red-300" />
                                                                )}
                                                            </div>
                                                        </div>

                                                        <h3 className="font-bold text-lg leading-tight">
                                                            {item.title}
                                                        </h3>
                                                    </div>
                                                </div>

                                                {/* Card Content */}
                                                <div className="p-6">
                                                    <p className="text-gray-700 mb-6 text-sm leading-relaxed line-clamp-3">
                                                        {item.description}
                                                    </p>

                                                    {/* Metadata */}
                                                    <div className="space-y-3 mb-6">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                <MapPin className="w-4 h-4" />
                                                                <span className="font-medium">{Math.round(item.distance)}m away</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                <Clock className="w-4 h-4" />
                                                                <span>{formatTimeAgo(item.timestamp)}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between text-sm">
                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                <div className="flex items-center gap-1">
                                                                    {isAdmin ? <Building className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                                                    <span className="font-medium truncate max-w-[120px]">{item.reporter}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                {/* NEW: Show responders count for SOS */}
                                                                {isSOS && item.responders_count > 0 && (
                                                                    <div className="flex items-center gap-1 text-blue-500">
                                                                        <Siren className="w-4 h-4" />
                                                                        <span className="font-medium">{item.responders_count}</span>
                                                                    </div>
                                                                )}
                                                                {/* <div className="flex items-center gap-1 text-gray-500">
                                                                    <Heart className="w-4 h-4" />
                                                                    <span className="font-medium">0</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-gray-500">
                                                                    <MessageCircle className="w-4 h-4" />
                                                                    <span className="font-medium">0</span>
                                                                </div> */}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* UPDATED: Enhanced Action Buttons with Volunteer Response */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {/* NEW: Special handling for active SOS and volunteers */}
                                                        {/* {console.log(user)} */}
                                                        {isSOS && (item.status === 'active' || item.is_active) && (userRole === 'volunteer' || userRole === 'police') ? (
                                                            <button
                                                                onClick={() => handleVolunteerResponse(item)}
                                                                disabled={respondingToSOS[item.id]}
                                                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all duration-200 font-semibold text-sm shadow-lg disabled:opacity-50"
                                                            >
                                                                {respondingToSOS[item.id] ? (
                                                                    <>
                                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                        <span className="hidden sm:inline">Responding...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserCheck className="w-4 h-4" />
                                                                        <span className="">Respond</span>
                                                                        {/* <span className="sm:hidden">Help</span> */}
                                                                    </>
                                                                )}
                                                            </button>
                                                        ) : (
                                                            /* Primary Navigation Button - Routes via SafetyMap */
                                                            <button
                                                                onClick={() => handleNavigateToIncident(item)}
                                                                className={`flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${isSOS ?
                                                                    ((item.status === 'active' || item.is_active) ? 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700') :
                                                                    isAdmin ? 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' :
                                                                        'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                                                                    } text-white rounded-xl transition-all duration-200 font-semibold text-sm shadow-lg`}
                                                            >
                                                                <Route className="w-4 h-4" />
                                                                <span className="hidden sm:inline">Get Route</span>
                                                                <span className="sm:hidden">Route</span>
                                                            </button>
                                                        )}

                                                        {/* Secondary View Button - Opens SafetyMap view */}
                                                        {/* <button
                                                            onClick={() => handleViewOnSafetyMap(item)}
                                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold text-sm"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            <span className="hidden sm:inline">View Map</span>
                                                            <span className="sm:hidden">Map</span>
                                                            </button> */}
                                                        <button
                                                            onClick={() => {
                                                                navigator.share?.({
                                                                    title: item.title,
                                                                    text: item.description,
                                                                    url: window.location.href
                                                                }) || navigator.clipboard.writeText(window.location.href);
                                                                toast.success('Shared successfully!');
                                                            }}
                                                            className="w-full mt-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium text-sm"
                                                        >
                                                            <Share2 className="w-4 h-4 inline mr-2" />
                                                            Share Incident
                                                        </button>
                                                    </div>

                                                    {/* Share Button */}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default Community;
