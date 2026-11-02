import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import {
    AlertTriangle, ArrowLeft, Building2, Calendar, CheckCircle, ChevronRight, Clock, Copy, ExternalLink,
    EyeOff, MapPin, MessageSquare, Printer, Share2, User,
} from 'lucide-react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import FullPageLoader from '../components/common/FullPageLoader';
import { OSM_ATTRIBUTION, OSM_TILE_URL, defaultMarkerIcon } from '../components/map/leafletSetup';
import { errorMessage } from '../services/api';
import { fetchReportById } from '../services/reports';
import ReportMediaGallery from './reports/ReportMediaGallery';
import {
    DEPARTMENT_LABELS, formatDate, formatDateTime, getStatusConfig, getTypeConfig, timeAgo,
} from './reports/reportConfig';

const copyText = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
};

const ErrorState = ({ message, onRetry, onBack }) => (
    <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center bg-white rounded-3xl shadow-2xl p-8 lg:p-12 border border-gray-100" role="alert">
            <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-red-600" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{message}</h1>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <button type="button" onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold">
                    All reports
                </button>
                {onRetry && (
                    <button type="button" onClick={onRetry} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-semibold">
                        Try again
                    </button>
                )}
            </div>
        </div>
    </div>
);

const InfoRow = ({ icon: Icon, label, children, tone }) => (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${tone}`}>
        <Icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
            <div className="font-semibold break-words">{children}</div>
        </div>
    </div>
);

const ReportHero = ({ report, onShare, onCopyId }) => {
    const type = getTypeConfig(report.report_type);
    const status = getStatusConfig(report.status);
    const TypeIcon = type.icon;
    const StatusIcon = status.icon;
    return (
        <div className={`bg-gradient-to-br ${status.bg} rounded-2xl lg:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 mb-6 border border-gray-200`}>
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                        <span className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${type.gradient} flex items-center justify-center shadow-xl`}>
                            <TypeIcon className="w-7 h-7 text-white" aria-hidden="true" />
                        </span>
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 ${type.badge}`}>
                            {report.report_type_display || type.label}
                        </span>
                        {report.department && (
                            <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/80 text-gray-700 border border-gray-200">
                                {DEPARTMENT_LABELS[report.department] || report.department}
                            </span>
                        )}
                        {report.is_mine && (
                            <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white">Your report</span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 break-words">{report.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                        <button type="button" onClick={onCopyId} className="inline-flex items-center gap-2 bg-white/90 px-3 py-2 rounded-lg shadow" aria-label="Copy report ID">
                            ID <code className="font-mono font-bold">{report.id}</code> <Copy className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <span className="bg-white/70 px-3 py-2 rounded-lg shadow">Submitted {formatDate(report.created_at)}</span>
                    </div>
                </div>
                <div className="flex flex-col gap-4 xl:max-w-xs">
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 bg-white/90 ${status.badge}`}>
                        <span className={`w-11 h-11 rounded-xl bg-gradient-to-br ${status.gradient} flex items-center justify-center`}>
                            <StatusIcon className="w-6 h-6 text-white" aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Status</p>
                            <p className="font-bold text-xl">{report.status_display || status.label}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={onShare} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/90 hover:bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700">
                            <Share2 className="w-4 h-4" aria-hidden="true" /> Share
                        </button>
                        <button type="button" onClick={() => window.print()} className="flex items-center justify-center gap-2 px-4 py-3 bg-white/90 hover:bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700">
                            <Printer className="w-4 h-4" aria-hidden="true" /> Print
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LocationCard = ({ report }) => (
    <section className="bg-white rounded-2xl lg:rounded-3xl shadow-xl overflow-hidden border border-gray-100" aria-labelledby="location-heading">
        <div className="p-6 sm:p-8 pb-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-xl">
                <MapPin className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <h2 id="location-heading" className="text-xl sm:text-2xl font-bold text-gray-900">Location</h2>
        </div>
        <div className="h-64 sm:h-80 mx-4 sm:mx-6 rounded-2xl overflow-hidden mb-4">
            <MapContainer center={[report.latitude, report.longitude]} zoom={16} scrollWheelZoom={false} className="h-full w-full z-0">
                <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
                <Marker position={[report.latitude, report.longitude]} icon={defaultMarkerIcon} />
            </MapContainer>
        </div>
        <div className="px-4 sm:px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50 p-4 sm:p-6 rounded-2xl">
                <div className="min-w-0">
                    {report.location && <p className="text-gray-900 font-semibold break-words">{report.location}</p>}
                    <p className="text-xs text-gray-500 mt-1 font-mono">Coordinates: {report.latitude}, {report.longitude}</p>
                </div>
                <a
                    href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=16/${report.latitude}/${report.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shrink-0"
                >
                    <ExternalLink className="w-4 h-4" aria-hidden="true" /> Open in maps
                </a>
            </div>
        </div>
    </section>
);

const DetailsSidebar = ({ report }) => (
    <aside className="bg-white rounded-2xl lg:rounded-3xl shadow-xl p-5 sm:p-6 border border-gray-100 space-y-4 h-fit" aria-label="Report details">
        <InfoRow icon={report.is_anonymous ? EyeOff : User} label="Reported by" tone="bg-blue-50 border-blue-100 text-blue-900">
            {report.reported_by_name}
            {report.is_anonymous && <span className="block text-xs font-normal">Filed anonymously</span>}
        </InfoRow>
        <InfoRow icon={Building2} label="Handled by" tone="bg-indigo-50 border-indigo-100 text-indigo-900">
            {DEPARTMENT_LABELS[report.department] || 'Not assigned'}
        </InfoRow>
        <InfoRow icon={Calendar} label="Submitted" tone="bg-green-50 border-green-100 text-green-900">
            {formatDateTime(report.created_at)}
            <span className="block text-xs font-normal">{timeAgo(report.created_at)}</span>
        </InfoRow>
        <InfoRow icon={Clock} label="Last updated" tone="bg-orange-50 border-orange-100 text-orange-900">
            {formatDateTime(report.updated_at)}
        </InfoRow>
        <InfoRow icon={CheckCircle} label="Attachments" tone="bg-gray-50 border-gray-200 text-gray-900">
            {report.media?.length || 0}
        </InfoRow>
    </aside>
);

const ReportDetail = () => {
    const { reportId } = useParams();
    const navigate = useNavigate();
    const [state, setState] = useState({ status: 'loading', report: null, error: null });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setState({ status: 'loading', report: null, error: null });
        fetchReportById(reportId, { signal: controller.signal })
            .then((report) => setState({ status: 'ready', report, error: null }))
            .catch((err) => {
                if (controller.signal.aborted) return;
                const notFound = err.response?.status === 404;
                setState({
                    status: 'error',
                    report: null,
                    error: notFound ? 'Report not found' : errorMessage(err, 'Could not load this report'),
                    retryable: !notFound,
                });
            });
        return () => controller.abort();
    }, [reportId, attempt]);

    const { report } = state;

    const shareReport = useCallback(async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: `CityShield report: ${report.title}`, url });
                return;
            } catch (err) {
                if (err?.name === 'AbortError') return;
            }
        }
        if (await copyText(url)) toast.success('Link copied to clipboard');
        else toast.error('Could not share this report');
    }, [report]);

    const copyId = useCallback(async () => {
        if (await copyText(String(report.id))) toast.success('Report ID copied');
        else toast.error('Could not copy the report ID');
    }, [report]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <Navbar />
            {state.status === 'loading' && <FullPageLoader message="Loading report…" />}
            {state.status === 'error' && (
                <ErrorState
                    message={state.error}
                    onBack={() => navigate('/reports')}
                    onRetry={state.retryable ? () => setAttempt((n) => n + 1) : null}
                />
            )}
            {state.status === 'ready' && report && (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
                        <Link to="/reports" className="flex items-center gap-2 hover:text-gray-800 bg-white/60 px-3 py-2 rounded-lg shadow-sm">
                            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All reports
                        </Link>
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        <span className="text-gray-900 font-medium">Report #{report.id}</span>
                    </nav>

                    <ReportHero report={report} onShare={shareReport} onCopyId={copyId} />

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3 space-y-6">
                            <section className="bg-white rounded-2xl lg:rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100" aria-labelledby="description-heading">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
                                        <MessageSquare className="w-6 h-6 text-white" aria-hidden="true" />
                                    </div>
                                    <h2 id="description-heading" className="text-xl sm:text-2xl font-bold text-gray-900">Description</h2>
                                </div>
                                <p className="text-gray-800 leading-relaxed text-base sm:text-lg whitespace-pre-wrap bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                    {report.description}
                                </p>
                            </section>
                            <ReportMediaGallery media={report.media} />
                            {Number.isFinite(report.latitude) && Number.isFinite(report.longitude) && <LocationCard report={report} />}
                        </div>
                        <DetailsSidebar report={report} />
                    </div>
                </main>
            )}
            <Footer />
        </div>
    );
};

export default ReportDetail;
