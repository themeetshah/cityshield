// pages/AllReports.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Search, Filter, Calendar, MapPin, User, Clock,
    Shield, AlertTriangle, Construction, HelpCircle, Eye,
    ChevronDown, ChevronRight, Grid, List, SortAsc, SortDesc,
    FileText, ImageIcon, VideoIcon, ExternalLink, Loader2,
    RefreshCw, Plus, TrendingUp, Activity, CheckCircle, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listReports } from '../services/reports';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const AllReports = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, status, type
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // grid, list
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchAllReports();
    }, []);

    useEffect(() => {
        applyFiltersAndSort();
    }, [reports, searchTerm, sortBy, filterStatus, filterType]);

    const fetchAllReports = async () => {
        try {
            setLoading(true);
            const reportsData = await listReports();
            // console.log(reportsData)
            setReports(reportsData.reports);
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    };

    const applyFiltersAndSort = () => {
        // console.log(reports)
        let filtered = [...reports];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(report =>
                report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.report_type.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(report => report.status === filterStatus);
        }

        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(report => report.report_type === filterType);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'status':
                    return a.status.localeCompare(b.status);
                case 'type':
                    return a.report_type.localeCompare(b.report_type);
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        setFilteredReports(filtered);
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'pending':
                return {
                    color: 'bg-amber-100 text-amber-800 border-amber-200',
                    icon: Clock,
                    iconBg: 'bg-amber-500'
                };
            case 'investigating':
                return {
                    color: 'bg-blue-100 text-blue-800 border-blue-200',
                    icon: Activity,
                    iconBg: 'bg-blue-500'
                };
            case 'resolved':
                return {
                    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    icon: CheckCircle,
                    iconBg: 'bg-emerald-500'
                };
            case 'dismissed':
                return {
                    color: 'bg-red-100 text-red-800 border-red-200',
                    icon: X,
                    iconBg: 'bg-red-500'
                };
            default:
                return {
                    color: 'bg-gray-100 text-gray-800 border-gray-200',
                    icon: Clock,
                    iconBg: 'bg-gray-500'
                };
        }
    };

    const getTypeConfig = (type) => {
        switch (type) {
            case 'crime':
                return {
                    color: 'bg-red-100 text-red-800 border-red-200',
                    icon: Shield,
                    iconBg: 'bg-red-500'
                };
            case 'harassment':
                return {
                    color: 'bg-red-100 text-red-800 border-red-200',
                    icon: AlertTriangle,
                    iconBg: 'bg-red-500'
                };
            case 'safety':
                return {
                    color: 'bg-orange-100 text-orange-800 border-orange-200',
                    icon: AlertTriangle,
                    iconBg: 'bg-orange-500'
                };
            case 'infrastructure':
                return {
                    color: 'bg-blue-100 text-blue-800 border-blue-200',
                    icon: Construction,
                    iconBg: 'bg-blue-500'
                };
            default:
                return {
                    color: 'bg-purple-100 text-purple-800 border-purple-200',
                    icon: HelpCircle,
                    iconBg: 'bg-purple-500'
                };
        }
    };

    const getTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);

        const timeUnits = [
            { unit: 'year', seconds: 31536000 },
            { unit: 'month', seconds: 2592000 },
            { unit: 'week', seconds: 604800 },
            { unit: 'day', seconds: 86400 },
            { unit: 'hour', seconds: 3600 },
            { unit: 'minute', seconds: 60 }
        ];

        for (const { unit, seconds } of timeUnits) {
            const count = Math.floor(diffInSeconds / seconds);
            if (count >= 1) {
                return `${count} ${unit}${count !== 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now';
    };

    const ReportCard = ({ report }) => {
        const statusConfig = getStatusConfig(report.status);
        const typeConfig = getTypeConfig(report.report_type);
        const StatusIcon = statusConfig.icon;
        const TypeIcon = typeConfig.icon;

        return (
            <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden group transform hover:scale-[1.02]">
                {/* Card Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl ${typeConfig.iconBg} flex items-center justify-center shadow-lg`}>
                                <TypeIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${typeConfig.color}`}>
                                    {report.report_type_display || report.report_type}
                                </span>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-sm font-bold border ${statusConfig.color}`}>
                            {report.status_display || report.status}
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {report.title}
                    </h3>

                    <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed mb-4">
                        {report.description}
                    </p>

                    {/* Report Meta */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <User className="w-4 h-4" />
                            <span>{report.reported_by_name || 'Anonymous'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{getTimeAgo(report.created_at)}</span>
                        </div>
                        {report.latitude && report.longitude && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <MapPin className="w-4 h-4" />
                                <span className="truncate">
                                    {report.location ? report.location : `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Media Preview */}
                {/* {report.media && report.media.length > 0 && ( */}
                <div className="px-6 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                            {report.media.length} attachment{report.media.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {/* <div className="flex gap-2 overflow-x-auto">
                            {report.media.slice(0, 3).map((media, index) => (
                                <div key={index} className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                    <img
                                        src={media.file}
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                </div>
                            ))}
                            {report.media.length > 3 && (
                                <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                                    <span className="text-xs font-bold text-gray-600">
                                        +{report.media.length - 3}
                                    </span>
                                </div>
                            )}
                        </div> */}
                </div>
                {/* )} */}

                {/* Card Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            ID: <code className="font-mono">{report.id}</code>
                        </div>
                        <button
                            onClick={() => navigate(`/reports/${report.id}`)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                        >
                            <Eye className="w-4 h-4" />
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const ListItem = ({ report }) => {
        const statusConfig = getStatusConfig(report.status);
        const typeConfig = getTypeConfig(report.report_type);
        const StatusIcon = statusConfig.icon;
        const TypeIcon = typeConfig.icon;

        return (
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 p-6 group">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-2xl ${typeConfig.iconBg} flex items-center justify-center shadow-lg flex-shrink-0`}>
                            <TypeIcon className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${typeConfig.color}`}>
                                    {report.report_type_display || report.report_type}
                                </span>
                                <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${statusConfig.color}`}>
                                    {report.status_display || report.status}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                {report.title}
                            </h3>

                            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                                {report.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    <span>{report.reported_by_name || 'Anonymous'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{getTimeAgo(report.created_at)}</span>
                                </div>
                                {report.media && report.media.length > 0 && (
                                    <div className="flex items-center gap-1">
                                        <ImageIcon className="w-4 h-4" />
                                        <span>{report.media.length} files</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                        <div className="text-sm text-gray-500 text-right">
                            <div className="font-mono text-xs">
                                ID: {report.id}
                            </div>
                            <div className="mt-1">
                                {new Date(report.created_at).toLocaleDateString('en-IN')}
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/reports/${report.id}`)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
                        >
                            <Eye className="w-4 h-4" />
                            View
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // if (loading) {
    //     return (
    //         <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
    //             <Navbar />
    //             <div className="flex items-center justify-center min-h-[70vh]">
    //                 <div className="text-center">
    //                     <div className="relative w-24 h-24 mx-auto mb-8">
    //                         <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping"></div>
    //                         <div className="relative w-24 h-24 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
    //                     </div>
    //                     <h3 className="text-2xl font-bold text-gray-800 mb-2">Loading Reports</h3>
    //                     <p className="text-gray-600">Fetching all incident reports...</p>
    //                 </div>
    //             </div>
    //             <Footer />
    //         </div>
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <Navbar />

            <main className="mx-auto pb-8">
                {/* Header */}
                {/* <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 hover:text-gray-800 transition-colors group bg-white/60 backdrop-blur-sm px-3 py-2 rounded-lg hover:bg-white/80"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Dashboard
                        </button>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-gray-900 font-medium">All Reports</span>
                    </div> */}
                {/* <div className="mb-8">

                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                                    All Incident Reports
                                </h1>
                                <p className="text-gray-600 text-lg">
                                    {filteredReports.length} of {reports.length} reports
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={fetchAllReports}
                                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Refresh
                                </button>
                                <button
                                    onClick={() => navigate('/report')}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl transition-colors font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Report
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters 
                        <div className="space-y-4">
                            <div className="flex flex-col lg:flex-row gap-4">
                                {/* Search 
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search reports by title, description, or type..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* View Mode 
                                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'grid'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-800'
                                            }`}
                                    >
                                        <Grid className="w-4 h-4" />
                                        Grid
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'list'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-800'
                                            }`}
                                    >
                                        <List className="w-4 h-4" />
                                        List
                                    </button>
                                </div>

                                {/* Filter Toggle 
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl transition-colors"
                                >
                                    <Filter className="w-4 h-4" />
                                    Filters
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {/* Filter Options 
                            {showFilters && (
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Sort By 
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Sort By
                                            </label>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="newest">Newest First</option>
                                                <option value="oldest">Oldest First</option>
                                                <option value="status">Status</option>
                                                <option value="type">Type</option>
                                            </select>
                                        </div>

                                        {/* Filter by Status 
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Status
                                            </label>
                                            <select
                                                value={filterStatus}
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="all">All Status</option>
                                                <option value="pending">Pending</option>
                                                <option value="investigating">Investigating</option>
                                                <option value="resolved">Resolved</option>
                                                <option value="dismissed">Dismissed</option>
                                            </select>
                                        </div>

                                        {/* Filter by Type 
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Type
                                            </label>
                                            <select
                                                value={filterType}
                                                onChange={(e) => setFilterType(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="all">All Types</option>
                                                <option value="crime">Crime</option>
                                                <option value="harassment">Harassment</option>
                                                <option value="safety">Safety</option>
                                                <option value="infrastructure">Infrastructure</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div> */}
                <div className="bg-white border-b border-gray-200 shadow-sm mb-8">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12 pb-5">
                        <div className="text-center">
                            {/* Clean Live Status Banner */}
                            <div className="inline-flex items-center gap-4 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-black/20 mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium">Live Incident Reports</span>
                                </div>
                                <div className="h-4 w-px bg-black/30"></div>
                                <button
                                    onClick={fetchAllReports}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-gray-500/10 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    {loading ? 'Refreshing...' : 'Refresh Data'}
                                </button>
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4 pb-3">
                                All Incident Reports
                            </h1>

                            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-6">
                                {filteredReports.length} of {reports.length} reports from community members and authorities
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                                <button
                                    onClick={() => navigate('/report')}
                                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    <Plus className="w-5 h-5" />
                                    Submit New Report
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters Section */}
                        <div className="max-w-6xl mx-auto">
                            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                                <div className="space-y-4">
                                    <div className="flex flex-col lg:flex-row gap-4">
                                        {/* Search */}
                                        <div className="flex-1 relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search reports by title, description, or type..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                                            />
                                        </div>

                                        {/* View Mode */}
                                        <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-gray-200">
                                            <button
                                                onClick={() => setViewMode('grid')}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'grid'
                                                    ? 'bg-white text-blue-600 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-800'
                                                    }`}
                                            >
                                                <Grid className="w-4 h-4" />
                                                Grid
                                            </button>
                                            <button
                                                onClick={() => setViewMode('list')}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'list'
                                                    ? 'bg-white text-blue-600 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-800'
                                                    }`}
                                            >
                                                <List className="w-4 h-4" />
                                                List
                                            </button>
                                        </div>

                                        {/* Filter Toggle */}
                                        <button
                                            onClick={() => setShowFilters(!showFilters)}
                                            className="flex items-center gap-2 bg-white/60 backdrop-blur-sm hover:bg-white/80 text-gray-700 px-4 py-3 rounded-xl transition-colors border border-gray-200"
                                        >
                                            <Filter className="w-4 h-4" />
                                            Filters
                                            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>

                                    {/* Filter Options */}
                                    {showFilters && (
                                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-inner">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Sort By */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Sort By
                                                    </label>
                                                    <select
                                                        value={sortBy}
                                                        onChange={(e) => setSortBy(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                                                    >
                                                        <option value="newest">Newest First</option>
                                                        <option value="oldest">Oldest First</option>
                                                        <option value="status">Status</option>
                                                        <option value="type">Type</option>
                                                    </select>
                                                </div>

                                                {/* Filter by Status */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Status
                                                    </label>
                                                    <select
                                                        value={filterStatus}
                                                        onChange={(e) => setFilterStatus(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                                                    >
                                                        <option value="all">All Status</option>
                                                        <option value="pending">Pending</option>
                                                        <option value="investigating">Investigating</option>
                                                        <option value="resolved">Resolved</option>
                                                        <option value="dismissed">Dismissed</option>
                                                    </select>
                                                </div>

                                                {/* Filter by Type */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Type
                                                    </label>
                                                    <select
                                                        value={filterType}
                                                        onChange={(e) => setFilterType(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                                                    >
                                                        <option value="all">All Types</option>
                                                        <option value="crime">Crime</option>
                                                        <option value="harassment">Harassment</option>
                                                        <option value="safety">Safety</option>
                                                        <option value="infrastructure">Infrastructure</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Reports Display */}
                {filteredReports.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <FileText className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Reports Found</h3>
                        <p className="text-gray-600 mb-6">
                            {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'No incident reports have been submitted yet'
                            }
                        </p>
                        {/* <button
                            onClick={() => navigate('/report-incident')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors font-medium"
                        >
                            Submit First Report
                        </button> */}
                    </div>
                ) : (
                    <div className={
                        viewMode === 'grid'
                            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-7 sm:px-12 md:px-15'
                            : 'space-y-4 px-5 sm:px-30 md:px-40'
                    }>
                        {filteredReports.map((report) => (
                            viewMode === 'grid'
                                ? <ReportCard key={report.id} report={report} />
                                : <ListItem key={report.id} report={report} />
                        ))}
                    </div>
                )}

                {/* Load More Button (if needed for pagination) */}
                {filteredReports.length > 0 && (
                    <div className="text-center mt-12">
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 inline-block">
                            <p className="text-gray-600 mb-4">
                                Showing {filteredReports.length} of {reports.length} reports
                            </p>
                            <div className="flex items-center justify-center gap-4">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <TrendingUp className="w-4 h-4" />
                                    Updated {getTimeAgo(reports[0]?.updated_at || new Date())}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default AllReports;
