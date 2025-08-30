// pages/ReportDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, MapPin, Calendar, User, Clock, Eye, Download,
    Shield, AlertTriangle, Construction, HelpCircle, Play,
    ExternalLink, Share2, Flag, Maximize2, X, ChevronRight,
    Info, ImageIcon, VideoIcon, FileIcon, Copy, CheckCircle,
    MessageSquare, Star, Activity, Zap, Target, Menu, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchReportById } from '../services/reports';
// import { getUserById } from '../services/auth';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const incidentIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const ReportDetail = () => {
    const { reportId } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [copiedId, setCopiedId] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        fetchReport();
    }, [reportId]);

    const fetchReport = async () => {
        try {
            let reportData = await fetchReportById(reportId);
            setReport(reportData);
        } catch (err) {
            if (err.response?.status === 404) {
                setError('Report not found');
                toast.error('Report not found');
            } else {
                setError('Failed to load report');
                toast.error('Failed to load report');
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'pending':
                return {
                    color: 'bg-amber-100 text-amber-800 border-amber-200',
                    icon: Clock,
                    bgGradient: 'from-amber-50 via-orange-50 to-yellow-50',
                    iconGradient: 'from-amber-500 to-orange-600',
                    pulse: 'animate-pulse',
                    ring: 'ring-amber-200'
                };
            case 'investigating':
                return {
                    color: 'bg-blue-100 text-blue-800 border-blue-200',
                    icon: Activity,
                    bgGradient: 'from-blue-50 via-indigo-50 to-cyan-50',
                    iconGradient: 'from-blue-500 to-indigo-600',
                    pulse: '',
                    ring: 'ring-blue-200'
                };
            case 'resolved':
                return {
                    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    icon: CheckCircle,
                    bgGradient: 'from-emerald-50 via-green-50 to-teal-50',
                    iconGradient: 'from-emerald-500 to-green-600',
                    pulse: '',
                    ring: 'ring-emerald-200'
                };
            case 'dismissed':
                return {
                    color: 'bg-red-100 text-red-800 border-red-200',
                    icon: X,
                    bgGradient: 'from-red-50 via-rose-50 to-pink-50',
                    iconGradient: 'from-red-500 to-rose-600',
                    pulse: '',
                    ring: 'ring-red-200'
                };
            default:
                return {
                    color: 'bg-gray-100 text-gray-800 border-gray-200',
                    icon: Clock,
                    bgGradient: 'from-gray-50 via-slate-50 to-zinc-50',
                    iconGradient: 'from-gray-500 to-slate-600',
                    pulse: '',
                    ring: 'ring-gray-200'
                };
        }
    };

    const getTypeConfig = (type) => {
        switch (type) {
            case 'crime':
                return {
                    color: 'bg-red-100 text-red-800 border-red-200',
                    icon: Shield,
                    gradient: 'from-red-500 to-red-600',
                    priority: 'Critical',
                    priorityColor: 'bg-red-500 text-white',
                    glowColor: 'shadow-red-200'
                };
            case 'harassment':
                return {
                    color: 'bg-red-100 text-red-800 border-red-200',
                    icon: AlertTriangle,
                    gradient: 'from-red-500 to-rose-600',
                    priority: 'High',
                    priorityColor: 'bg-rose-500 text-white',
                    glowColor: 'shadow-rose-200'
                };
            case 'safety':
                return {
                    color: 'bg-orange-100 text-orange-800 border-orange-200',
                    icon: AlertTriangle,
                    gradient: 'from-orange-500 to-amber-500',
                    priority: 'Medium',
                    priorityColor: 'bg-orange-500 text-white',
                    glowColor: 'shadow-orange-200'
                };
            case 'infrastructure':
                return {
                    color: 'bg-blue-100 text-blue-800 border-blue-200',
                    icon: Construction,
                    gradient: 'from-blue-500 to-indigo-600',
                    priority: 'Standard',
                    priorityColor: 'bg-blue-500 text-white',
                    glowColor: 'shadow-blue-200'
                };
            default:
                return {
                    color: 'bg-purple-100 text-purple-800 border-purple-200',
                    icon: HelpCircle,
                    gradient: 'from-purple-500 to-indigo-600',
                    priority: 'Standard',
                    priorityColor: 'bg-purple-500 text-white',
                    glowColor: 'shadow-purple-200'
                };
        }
    };

    const isVideoFile = (filename) => {
        const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
        return videoExtensions.some(ext => filename.toLowerCase().includes(ext));
    };

    const getFileExtension = (filename) => {
        return filename.split('.').pop().toLowerCase();
    };

    const copyReportId = () => {
        navigator.clipboard.writeText(report.id);
        setCopiedId(true);
        toast.success('Report ID copied to clipboard');
        setTimeout(() => setCopiedId(false), 2000);
    };

    const shareReport = () => {
        if (navigator.share) {
            navigator.share({
                title: `Report: ${report.title}`,
                text: `Check out this incident report: ${report.title}`,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Report link copied to clipboard');
        }
    };

    const formatAddress = (addressData) => {
        if (typeof addressData === 'object' && addressData !== null) {
            return Object.entries(addressData)
                .filter(([key, value]) => !['ISO3166-2-lvl4', 'country', 'country_code'].includes(key) && Boolean(value))
                .map(([_, value]) => value)
                .join(', ');
        }
        return addressData;
    };

    // if (loading) {
    //     return (
    //         <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
    //             <Navbar />
    //             <div className="flex items-center justify-center min-h-[70vh] px-4">
    //                 <div className="text-center">
    //                     <div className="relative w-24 h-24 mx-auto mb-8">
    //                         <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping"></div>
    //                         <div className="relative w-24 h-24 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
    //                         <div className="absolute inset-2 border-2 border-purple-400 rounded-full animate-spin border-b-transparent" style={{ animationDelay: '0.5s', animationDirection: 'reverse' }}></div>
    //                     </div>
    //                     <div className="space-y-4">
    //                         <h3 className="text-2xl lg:text-3xl font-bold text-gray-800">Loading Report Details</h3>
    //                         <p className="text-gray-600 text-lg">Fetching incident information...</p>
    //                         <div className="flex justify-center space-x-1">
    //                             <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
    //                             <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
    //                             <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    //                         </div>
    //                     </div>
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

    if (error || !report) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center bg-white rounded-3xl shadow-2xl p-8 lg:p-12 border border-gray-100">
                        <div className="w-28 h-28 mx-auto mb-8 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center shadow-xl">
                            <AlertTriangle className="w-14 h-14 text-red-600" />
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Report Not Found</h1>
                        <p className="text-gray-600 mb-8 text-lg lg:text-xl">{error}</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => navigate('/')}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg transform hover:scale-105"
                            >
                                Back to Dashboard
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-4 rounded-xl transition-all duration-300 font-semibold"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const statusConfig = getStatusConfig(report.status);
    const typeConfig = getTypeConfig(report.report_type);
    const StatusIcon = statusConfig.icon;
    const TypeIcon = typeConfig.icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                {/* Enhanced Responsive Breadcrumb */}
                <nav className="flex items-center justify-between mb-6 lg:mb-8">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 hover:text-gray-800 transition-colors group bg-white/60 backdrop-blur-sm px-3 py-2 rounded-lg hover:bg-white/80 shadow-sm"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="hidden sm:inline">Dashboard</span>
                        </button>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-gray-900 font-medium">Report Details</span>
                    </div>

                    {/* Mobile Sidebar Toggle */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-sm hover:bg-white/90 transition-colors"
                    >
                        <Menu className="w-5 h-5 text-gray-700" />
                    </button>
                </nav>

                {/* Premium Responsive Hero Section */}
                <div className={`bg-gradient-to-br ${statusConfig.bgGradient} rounded-2xl lg:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-12 mb-6 lg:mb-8 border border-gray-200 relative overflow-hidden`}>
                    {/* Responsive Background Decorations */}
                    <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-white/10 rounded-full transform translate-x-16 sm:translate-x-24 lg:translate-x-32 -translate-y-16 sm:-translate-y-24 lg:-translate-y-32"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-36 sm:h-36 lg:w-48 lg:h-48 bg-white/10 rounded-full transform -translate-x-12 sm:-translate-x-18 lg:-translate-x-24 translate-y-12 sm:translate-y-18 lg:translate-y-24"></div>
                    <div className="absolute top-1/2 right-1/4 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white/5 rounded-full"></div>

                    <div className="relative">
                        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 lg:gap-8">
                            <div className="flex-1 min-w-0">
                                {/* Enhanced Responsive Type & Priority */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6">
                                    <div className={`w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl bg-gradient-to-br ${typeConfig.gradient} flex items-center justify-center shadow-2xl ${typeConfig.glowColor} transform hover:scale-105 transition-transform flex-shrink-0`}>
                                        <TypeIcon className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-white" />
                                    </div>
                                    <div className="space-y-3 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                            <span className={`inline-block px-3 py-2 sm:px-4 sm:py-2 rounded-lg lg:rounded-xl text-sm sm:text-base font-bold border-2 ${typeConfig.color} shadow-lg`}>
                                                {report.report_type_display || report.report_type}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1 rounded-md lg:rounded-lg text-xs sm:text-sm font-bold ${typeConfig.priorityColor} shadow-md`}>
                                                <Zap className="w-3 h-3" />
                                                {typeConfig.priority}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Target className="w-4 h-4 flex-shrink-0" />
                                            <span className="text-sm font-medium">Incident Report</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Responsive Title & ID */}
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 lg:mb-6 leading-tight break-words">
                                    {report.title}
                                </h1>
                                <div className="flex flex-row sm:items-center gap-4 sm:gap-6">
                                    <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 sm:px-6 rounded-lg lg:rounded-xl shadow-lg overflow-hidden">
                                        <span className="text-gray-600 font-semibold text-sm sm:text-base flex-shrink-0">ID:</span>
                                        <code className="font-mono font-bold text-gray-900 text-sm sm:text-base truncate">
                                            <span className="sm:hidden">{report.id}</span>
                                            <span className="hidden sm:inline">{report.id}</span>
                                        </code>
                                        <button
                                            onClick={copyReportId}
                                            className="ml-2 p-1 sm:p-2 hover:bg-white/50 rounded-lg transition-colors flex-shrink-0"
                                            title="Copy full ID"
                                        >
                                            {copiedId ? (
                                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                            ) : (
                                                <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="text-sm sm:text-base text-gray-700 bg-white/70 px-3 sm:px-4 py-2 rounded-lg lg:rounded-xl shadow-md">
                                        <span className="hidden sm:inline">Submitted on </span>
                                        {new Date(report.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: window.innerWidth < 640 ? 'short' : 'long',
                                            year: 'numeric'
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Responsive Status & Actions */}
                            <div className="flex flex-col gap-4 lg:gap-6 xl:min-w-0 xl:max-w-sm">
                                <div className={`flex items-center gap-4 lg:gap-5 px-6 sm:px-8 py-4 sm:py-6 rounded-2xl lg:rounded-3xl border-2 ${statusConfig.color} shadow-2xl bg-white/90 backdrop-blur-sm ${statusConfig.pulse} ring-4 ${statusConfig.ring} ring-opacity-30`}>
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br ${statusConfig.iconGradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                                        <StatusIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs sm:text-sm font-bold uppercase tracking-wider opacity-80">Status</p>
                                        <p className="font-bold text-lg sm:text-xl lg:text-2xl truncate">{report.status_display || report.status}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 sm:gap-3">
                                    <button
                                        onClick={shareReport}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-white/90 hover:bg-white border-2 border-gray-200 rounded-xl lg:rounded-2xl transition-all duration-300 text-gray-700 hover:text-gray-900 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105"
                                    >
                                        <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="text-sm sm:text-base">Share</span>
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-white/90 hover:bg-white border-2 border-gray-200 rounded-xl lg:rounded-2xl transition-all duration-300 text-gray-700 hover:text-gray-900 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105"
                                    >
                                        <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="hidden sm:inline text-sm sm:text-base">Print</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Responsive Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 relative">
                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-6 lg:space-y-8">
                        {/* Enhanced Responsive Description Card */}
                        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100 hover:shadow-2xl transition-shadow">
                            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl flex-shrink-0">
                                    <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Incident Description</h2>
                                    <p className="text-gray-600 text-sm sm:text-base">Detailed account of the reported issue</p>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl lg:rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-inner">
                                <p className="text-gray-800 leading-relaxed text-base sm:text-lg whitespace-pre-wrap font-medium">
                                    {report.description}
                                </p>
                            </div>
                        </div>

                        {/* Premium Responsive Media Gallery */}
                        {report.media && report.media.length > 0 && (
                            <div className="bg-white rounded-2xl lg:rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100 hover:shadow-2xl transition-shadow">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl flex-shrink-0">
                                            <ImageIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Evidence Gallery</h2>
                                            <p className="text-gray-600 text-sm sm:text-base">{report.media.length} file{report.media.length !== 1 ? 's' : ''} attached</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                                        <div className="bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-md lg:rounded-lg font-semibold">
                                            {report.media.filter(item => !isVideoFile(item.file)).length} Images
                                        </div>
                                        <div className="bg-purple-100 text-purple-700 px-2 sm:px-3 py-1 rounded-md lg:rounded-lg font-semibold">
                                            {report.media.filter(item => isVideoFile(item.file)).length} Videos
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {report.media.map((mediaItem, index) => (
                                        <div key={mediaItem.id} className="group relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl lg:rounded-3xl overflow-hidden border-2 border-gray-200 hover:border-blue-300 hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
                                            {isVideoFile(mediaItem.file) ? (
                                                <div className="relative aspect-video bg-gray-900 rounded-t-2xl lg:rounded-t-3xl overflow-hidden">
                                                    <video
                                                        src={mediaItem.file}
                                                        className="w-full h-full object-cover"
                                                        preload="metadata"
                                                        controls
                                                        playsInline
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                    <div className="hidden absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center flex-col gap-4">
                                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                                                            <VideoIcon className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
                                                        </div>
                                                        <p className="text-white text-sm font-medium text-center px-4">Video Preview Unavailable</p>
                                                        <a
                                                            href={mediaItem.file}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg lg:rounded-xl transition-colors flex items-center gap-2 font-medium shadow-lg text-sm sm:text-base"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                            Open Video
                                                        </a>
                                                    </div>
                                                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                                                        <div className="bg-black/80 backdrop-blur-sm text-white px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs font-bold flex items-center gap-1 sm:gap-2 shadow-lg">
                                                            <VideoIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                            VIDEO
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="relative aspect-video rounded-t-2xl lg:rounded-t-3xl overflow-hidden">
                                                    <img
                                                        src={mediaItem.file}
                                                        alt={`Evidence ${index + 1}`}
                                                        className="w-full h-full object-cover cursor-pointer group-hover:scale-110 transition-transform duration-700"
                                                        onClick={() => setSelectedMedia(mediaItem)}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                    <div className="hidden absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-col gap-4">
                                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-300 flex items-center justify-center">
                                                            <FileIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-500" />
                                                        </div>
                                                        <p className="text-gray-600 text-sm font-medium text-center px-4">Image Preview Unavailable</p>
                                                        <a
                                                            href={mediaItem.file}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg lg:rounded-xl transition-colors flex items-center gap-2 font-medium shadow-lg text-sm sm:text-base"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                            Open File
                                                        </a>
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                                                        <Maximize2 className="w-8 h-8 sm:w-10 sm:h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    </div>
                                                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                                                        <div className="bg-black/80 backdrop-blur-sm text-white px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs font-bold flex items-center gap-1 sm:gap-2 shadow-lg">
                                                            <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                            IMAGE
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-4 sm:p-6">
                                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                                    <p className="text-base sm:text-lg font-bold text-gray-800 truncate">
                                                        Evidence {index + 1}
                                                    </p>
                                                    <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 sm:px-3 py-1 rounded-full uppercase flex-shrink-0 ml-2">
                                                        .{getFileExtension(mediaItem.file)}
                                                    </span>
                                                </div>
                                                <a
                                                    href={mediaItem.file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors group text-sm sm:text-base"
                                                >
                                                    <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    View Full Size
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Enhanced Responsive Map Section */}
                        {report.latitude && report.longitude && (
                            <div className="bg-white rounded-2xl lg:rounded-3xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-shadow">
                                <div className="p-6 sm:p-8 pb-0">
                                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-xl flex-shrink-0">
                                            <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Incident Location</h3>
                                            <p className="text-gray-600 text-sm sm:text-base">Interactive map view with precise coordinates</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-64 sm:h-80 bg-gray-100 relative mx-4 sm:mx-6 lg:mx-8 rounded-xl lg:rounded-2xl overflow-hidden shadow-inner mb-4 sm:mb-6">
                                    <MapContainer
                                        center={[report.latitude, report.longitude]}
                                        zoom={16}
                                        style={{ height: '100%', width: '100%' }}
                                        scrollWheelZoom={true}
                                        className='z-0'
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        <Marker
                                            position={[report.latitude, report.longitude]}
                                            icon={incidentIcon}
                                        />
                                    </MapContainer>
                                </div>
                                <div className="p-4 sm:p-6 lg:p-8 pt-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-gray-50 to-gray-100 p-4 sm:p-6 rounded-xl lg:rounded-2xl">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-700 mb-2">Location Address:</p>
                                            <p className="text-gray-900 font-semibold leading-relaxed text-sm sm:text-base break-words">
                                                {report.location ? report.location : `${report.latitude}, ${report.longitude}`}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-2 font-mono break-all">
                                                Coordinates: {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                                            </p>
                                        </div>
                                        <a
                                            href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}&zoom=16`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 sm:px-6 py-3 rounded-lg lg:rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base flex-shrink-0"
                                        >
                                            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span className="hidden sm:inline">Open in Maps</span>
                                            <span className="sm:hidden">Maps</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Enhanced Responsive Sidebar */}
                    <div className={`lg:col-span-1 space-y-6 ${sidebarOpen ? 'block' : 'hidden lg:block'} lg:space-y-6`}>
                        {/* Mobile Sidebar Overlay */}
                        {sidebarOpen && (
                            <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
                        )}

                        {/* Sidebar Content */}
                        <div className={`${sidebarOpen ? 'fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 overflow-y-auto' : ''} lg:relative lg:top-auto lg:right-auto lg:h-auto lg:w-auto lg:max-w-none lg:bg-transparent lg:shadow-none lg:z-auto lg:overflow-visible`}>
                            {/* Mobile Sidebar Header */}
                            {sidebarOpen && (
                                <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-lg font-bold text-gray-900">Report Details</h3>
                                    <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            )}

                            <div className={`${sidebarOpen ? 'p-4' : ''} lg:p-0`}>
                                {/* Report Information */}
                                <div className="bg-white rounded-2xl lg:rounded-3xl shadow-xl p-4 sm:p-6 border border-gray-100 hover:shadow-2xl transition-shadow">
                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                                        <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                        Report Details
                                    </h3>

                                    <div className="space-y-4 sm:space-y-6">
                                        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl lg:rounded-2xl border border-blue-100">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                                                <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs sm:text-sm font-bold text-blue-700 uppercase tracking-wide">Reported by</p>
                                                <p className="font-bold text-blue-900 text-base sm:text-lg truncate">{report.reported_by_name || 'Anonymous Citizen'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl lg:rounded-2xl border border-green-100">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                                                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs sm:text-sm font-bold text-green-700 uppercase tracking-wide">Submitted</p>
                                                <p className="font-bold text-green-900 text-base sm:text-lg leading-tight">
                                                    {new Date(report.created_at).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: window.innerWidth < 640 ? 'short' : 'long',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                                <p className="text-sm text-green-600 font-medium">
                                                    {new Date(report.created_at).toLocaleTimeString('en-IN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl lg:rounded-2xl border border-orange-100">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                                                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs sm:text-sm font-bold text-orange-700 uppercase tracking-wide">Last Updated</p>
                                                <p className="font-bold text-orange-900 text-base sm:text-lg">
                                                    {new Date(report.updated_at).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: window.innerWidth < 640 ? 'short' : 'long',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Report Stats */}
                                    <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                                        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 sm:mb-4">Report Statistics</h4>
                                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                            <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg lg:rounded-xl shadow-sm">
                                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{report.media?.length || 0}</p>
                                                <p className="text-xs text-gray-600 font-semibold">Attachments</p>
                                            </div>
                                            <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg lg:rounded-xl shadow-sm">
                                                {(() => {
                                                    const now = new Date();
                                                    const createdAt = new Date(report.created_at);
                                                    const diff = Math.floor((now - createdAt) / 1000); // diff in seconds

                                                    const days = Math.floor(diff / (60 * 60 * 24));
                                                    const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
                                                    const minutes = Math.floor((diff % (60 * 60)) / 60);
                                                    const seconds = diff % 60;

                                                    if (days >= 1) {
                                                        return (
                                                            <>
                                                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{days}</p>
                                                                <p className="text-xs text-gray-600 font-semibold">Days Ago</p>
                                                            </>
                                                        );
                                                    }
                                                    if (hours >= 1) {
                                                        return (
                                                            <>
                                                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{hours}</p>
                                                                <p className="text-xs text-gray-600 font-semibold">Hours Ago</p>
                                                            </>
                                                        );
                                                    }
                                                    if (minutes >= 1) {
                                                        return (
                                                            <>
                                                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{minutes}</p>
                                                                <p className="text-xs text-gray-600 font-semibold">Minutes Ago</p>
                                                            </>
                                                        );
                                                    }
                                                    return (
                                                        <>
                                                            <p className="text-xl sm:text-2xl font-bold text-gray-900">{seconds}</p>
                                                            <p className="text-xs text-gray-600 font-semibold">Seconds Ago</p>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                                        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 sm:mb-4">Quick Actions</h4>
                                        <div className="space-y-2 sm:space-y-3">
                                            <button
                                                onClick={shareReport}
                                                className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-lg lg:rounded-xl transition-all duration-300 text-blue-700 hover:text-blue-900 font-semibold shadow-sm hover:shadow-md text-sm sm:text-base"
                                            >
                                                <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                Share Report
                                            </button>
                                            <button
                                                onClick={copyReportId}
                                                className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 border border-gray-200 rounded-lg lg:rounded-xl transition-all duration-300 text-gray-700 hover:text-gray-900 font-semibold shadow-sm hover:shadow-md text-sm sm:text-base"
                                            >
                                                {copiedId ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                                                Copy Report ID
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Responsive Image Modal */}
                {selectedMedia && (
                    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="relative max-w-6xl max-h-[95vh] w-full">
                            <button
                                onClick={() => setSelectedMedia(null)}
                                className="absolute -top-12 sm:-top-16 right-0 text-white hover:text-gray-300 transition-colors flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-lg lg:rounded-xl font-semibold text-sm sm:text-base"
                            >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                Close Preview
                            </button>
                            <div className="bg-white rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                                <div className="flex-1 overflow-hidden">
                                    <img
                                        src={selectedMedia.file}
                                        alt="Full size evidence"
                                        className="w-full h-full object-contain max-h-[70vh]"
                                    />
                                </div>
                                <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t flex-shrink-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="min-w-0">
                                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Evidence Image</h3>
                                            <p className="text-gray-600 text-sm sm:text-base">High-resolution view</p>
                                        </div>
                                        <a
                                            href={selectedMedia.file}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg lg:rounded-xl transition-colors flex items-center justify-center gap-2 font-semibold shadow-lg text-sm sm:text-base flex-shrink-0"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Open Original
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Sidebar Overlay Close Area */}
                {sidebarOpen && (
                    <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
                )}
            </main>

            <Footer />
        </div>
    );
};

export default ReportDetail;
