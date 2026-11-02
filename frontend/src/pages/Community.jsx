import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AlertTriangle, BarChart3, Building2, FileText, RefreshCw, UserCheck } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { useAuth } from '../context/AuthContext';
import { isSuperAdmin, isVolunteer } from '../auth/roles';
import useGeolocation from '../hooks/useGeolocation';
import { errorMessage } from '../services/api';
import { fetchNearbyReports } from '../services/reports';
import { getSOSByRole, getVolunteerStatus, respondToSOS, setVolunteerAvailability } from '../services/sos';
import { getOfficialAlerts } from '../services/community';
import { profileAPI } from '../services/profile';
import usePolling from './community/usePolling';
import { distanceBetween } from './community/format';
import { EmptyState, LocationNeeded, SectionError, SectionLoading } from './community/StateViews';
import ReportCard from './community/ReportCard';
import OfficialAlertCard from './community/OfficialAlertCard';
import SosAlertCard from './community/SosAlertCard';
import VolunteerPanel from './community/VolunteerPanel';
import CitizenSosPanel from './community/CitizenSosPanel';
import InsightsPanel from './community/InsightsPanel';

const RADIUS_M = 5000;
const RADIUS_LABEL = '5 km';
const POLL_MS = 60000;

const EMPTY_SECTION = { items: [], loading: false, error: null, loaded: false };

/** Load into a section state; only shows the spinner on the first load so polling doesn't flicker. */
const loadInto = async (setSection, loader, fallback) => {
    setSection((s) => ({ ...s, loading: !s.loaded, error: null }));
    try {
        const items = await loader();
        setSection({ items, loading: false, error: null, loaded: true });
    } catch (err) {
        setSection((s) => ({ ...s, loading: false, error: errorMessage(err, fallback) }));
    }
};

const byNewest = (a, b) => new Date(b.created_at) - new Date(a.created_at);

const TABS = [
    { key: 'reports', label: 'Nearby reports', icon: FileText },
    { key: 'alerts', label: 'Official alerts', icon: Building2 },
    { key: 'sos', label: 'Emergencies', icon: AlertTriangle },
    { key: 'insights', label: 'Insights', icon: BarChart3 },
];

const StatTile = ({ label, value }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
        <div className="text-2xl font-black text-gray-900">{value}</div>
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-1">{label}</div>
    </div>
);

const Community = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const volunteer = isVolunteer(user);
    const canSeeSos = volunteer || isSuperAdmin(user);

    const { location, error: locationError, loading: locating, refresh: retryLocation } = useGeolocation();

    const [activeTab, setActiveTab] = useState('reports');
    const [typeFilter, setTypeFilter] = useState('all');
    const [refreshing, setRefreshing] = useState(false);

    const [reports, setReports] = useState(EMPTY_SECTION);
    const [alerts, setAlerts] = useState(EMPTY_SECTION);
    const [sos, setSos] = useState(EMPTY_SECTION);
    const [ownSos, setOwnSos] = useState(EMPTY_SECTION);

    const [volunteerStatus, setVolunteerStatus] = useState(null);
    const [volunteerError, setVolunteerError] = useState(null);
    const [availabilityUpdating, setAvailabilityUpdating] = useState(false);
    const [respondingId, setRespondingId] = useState(null);

    // ---- loaders ------------------------------------------------------------
    const loadReports = useCallback(async () => {
        if (!location) return;
        await loadInto(
            setReports,
            async () => {
                const data = await fetchNearbyReports(location.latitude, location.longitude, RADIUS_M);
                return (data?.reports || [])
                    .map((r) => ({ ...r, distance: r.distance ?? distanceBetween(location, r) }))
                    .sort(byNewest);
            },
            'Could not load nearby reports.'
        );
    }, [location]);

    const loadAlerts = useCallback(
        () => loadInto(setAlerts, async () => (await getOfficialAlerts()).sort(byNewest), 'Could not load official alerts.'),
        []
    );

    const loadSos = useCallback(async () => {
        if (!canSeeSos) return;
        if (volunteer && !location) return; // volunteers only see alerts near them
        await loadInto(
            setSos,
            async () => {
                const params = location
                    ? { latitude: location.latitude, longitude: location.longitude, radius: RADIUS_M }
                    : {};
                const data = await getSOSByRole(params);
                return [...(data?.alerts || [])].sort(
                    (a, b) => Number(b.is_active) - Number(a.is_active) || byNewest(a, b)
                );
            },
            'Could not load emergencies.'
        );
    }, [canSeeSos, volunteer, location]);

    const userId = user?.id;
    const loadOwnSos = useCallback(async () => {
        if (canSeeSos || !userId) return;
        await loadInto(
            setOwnSos,
            async () => {
                const activities = await profileAPI.getActivities(userId);
                return (Array.isArray(activities) ? activities : []).filter((a) => a.type === 'sos');
            },
            'Could not load your SOS history.'
        );
    }, [canSeeSos, userId]);

    const loadVolunteerStatus = useCallback(async () => {
        if (!volunteer) return;
        try {
            setVolunteerStatus(await getVolunteerStatus());
            setVolunteerError(null);
        } catch (err) {
            setVolunteerError(errorMessage(err, 'Could not load your volunteer status.'));
        }
    }, [volunteer]);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);
    useEffect(() => {
        loadReports();
    }, [loadReports]);
    useEffect(() => {
        loadSos();
    }, [loadSos]);
    useEffect(() => {
        loadOwnSos();
    }, [loadOwnSos]);
    useEffect(() => {
        loadVolunteerStatus();
    }, [loadVolunteerStatus]);

    const refreshAll = useCallback(
        () => Promise.all([loadAlerts(), loadReports(), loadSos(), loadOwnSos(), loadVolunteerStatus()]),
        [loadAlerts, loadReports, loadSos, loadOwnSos, loadVolunteerStatus]
    );
    usePolling(refreshAll, POLL_MS);

    const handleRefresh = async () => {
        setRefreshing(true);
        if (!location) retryLocation();
        await refreshAll();
        setRefreshing(false);
    };

    // ---- actions ------------------------------------------------------------
    const handleRoute = (item, type) => {
        if (!location) {
            toast.error('Your location is unavailable, so a route cannot be calculated.');
            return;
        }
        navigate('/safety-map', {
            state: {
                navigationType: 'incident_route',
                startLocation: { latitude: location.latitude, longitude: location.longitude, name: 'Your location' },
                endLocation: {
                    latitude: Number(item.latitude),
                    longitude: Number(item.longitude),
                    name: type === 'sos' ? 'SOS location' : item.title,
                    type,
                    severity: type === 'sos' ? 'critical' : 'medium',
                },
            },
        });
    };

    const handleRespond = async (alert) => {
        setRespondingId(alert.id);
        try {
            const res = await respondToSOS(alert.id, {
                message: 'Volunteer responding',
                latitude: location?.latitude,
                longitude: location?.longitude,
            });
            toast.success(res?.message || 'You are now responding to this SOS alert.');
            setSos((s) => ({
                ...s,
                items: s.items.map((a) =>
                    a.id === alert.id ? { ...a, has_responded: true, responders_count: (a.responders_count || 0) + 1 } : a
                ),
            }));
            loadVolunteerStatus();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not register your response. Please try again.'));
        } finally {
            setRespondingId(null);
        }
    };

    const handleToggleAvailability = async (next) => {
        if (next && !location) {
            toast.error('Your location is needed to become available - emergencies are matched by distance.');
            retryLocation();
            return;
        }
        setAvailabilityUpdating(true);
        try {
            const coords = location ? { latitude: location.latitude, longitude: location.longitude } : null;
            const res = await setVolunteerAvailability(next, coords);
            const isAvailable = res?.is_available ?? next;
            setVolunteerStatus((s) => ({ ...s, is_available: isAvailable }));
            toast.success(isAvailable ? 'You are now available for emergencies.' : 'You are now unavailable.');
        } catch (err) {
            toast.error(errorMessage(err, 'Could not update your availability.'));
        } finally {
            setAvailabilityUpdating(false);
        }
    };

    // ---- derived ------------------------------------------------------------
    const typeOptions = useMemo(() => {
        const map = new Map();
        reports.items.forEach((r) => map.set(r.report_type, r.report_type_display || r.report_type));
        return [...map.entries()];
    }, [reports.items]);

    const visibleReports = useMemo(
        () => (typeFilter === 'all' ? reports.items : reports.items.filter((r) => r.report_type === typeFilter)),
        [reports.items, typeFilter]
    );

    const activeSosCount = sos.items.filter((a) => a.is_active).length;
    const tabCounts = {
        reports: reports.loaded ? reports.items.length : null,
        alerts: alerts.loaded ? alerts.items.length : null,
        sos: canSeeSos && sos.loaded ? activeSosCount : null,
        insights: null,
    };
    const statValue = (section, value) => (section.loaded ? value : '—');

    // ---- render helpers -----------------------------------------------------
    const renderReports = () => {
        if (!location) return <LocationNeeded error={locationError} loading={locating} onRetry={retryLocation} />;
        if (reports.loading) return <SectionLoading label="Loading nearby reports…" />;
        if (reports.error) return <SectionError message={reports.error} onRetry={loadReports} />;
        if (reports.items.length === 0) {
            return (
                <EmptyState
                    icon={FileText}
                    title="No reports nearby"
                    action={
                        <button
                            type="button"
                            onClick={() => navigate('/report')}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                        >
                            Submit a report
                        </button>
                    }
                >
                    No citizen reports have been submitted within {RADIUS_LABEL} of you.
                </EmptyState>
            );
        }
        return (
            <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                    <label htmlFor="report-type-filter" className="font-semibold text-gray-700">
                        Category
                    </label>
                    <select
                        id="report-type-filter"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                        <option value="all">All categories</option>
                        {typeOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                    <span className="text-sm text-gray-600" aria-live="polite">
                        {visibleReports.length} result{visibleReports.length === 1 ? '' : 's'}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleReports.map((r) => (
                        <ReportCard key={r.id} report={r} onRoute={(item) => handleRoute(item, 'user_report')} />
                    ))}
                </div>
            </>
        );
    };

    const renderAlerts = () => {
        if (alerts.loading) return <SectionLoading label="Loading official alerts…" />;
        if (alerts.error) return <SectionError message={alerts.error} onRetry={loadAlerts} />;
        if (alerts.items.length === 0) {
            return (
                <EmptyState icon={Building2} title="No official alerts">
                    There are no active alerts from the police, municipal, fire or medical departments right now.
                </EmptyState>
            );
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {alerts.items.map((a) => (
                    <OfficialAlertCard key={a.id} alert={a} />
                ))}
            </div>
        );
    };

    const renderSos = () => {
        if (!canSeeSos) {
            return <CitizenSosPanel ownAlerts={ownSos.items} loading={ownSos.loading} error={ownSos.error} onRetry={loadOwnSos} />;
        }
        return (
            <div className="space-y-6">
                {volunteer && (
                    <VolunteerPanel
                        status={volunteerStatus}
                        error={volunteerError}
                        updating={availabilityUpdating}
                        hasLocation={!!location}
                        onToggle={handleToggleAvailability}
                    />
                )}
                {volunteer && !location ? (
                    <LocationNeeded error={locationError} loading={locating} onRetry={retryLocation} />
                ) : sos.loading ? (
                    <SectionLoading label="Loading emergencies…" />
                ) : sos.error ? (
                    <SectionError message={sos.error} onRetry={loadSos} />
                ) : sos.items.length === 0 ? (
                    <EmptyState icon={AlertTriangle} title="No emergencies nearby">
                        There are no SOS alerts {volunteer ? `within ${RADIUS_LABEL} of you` : 'to show'} right now.
                    </EmptyState>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sos.items.map((a) => (
                            <SosAlertCard
                                key={a.id}
                                alert={a}
                                canRespond={volunteer}
                                responding={respondingId === a.id}
                                onRespond={handleRespond}
                                onRoute={(item) => handleRoute(item, 'sos')}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderInsights = () => {
        if (!location) return <LocationNeeded error={locationError} loading={locating} onRetry={retryLocation} />;
        if (reports.loading) return <SectionLoading label="Loading nearby reports…" />;
        if (reports.error) return <SectionError message={reports.error} onRetry={loadReports} />;
        return <InsightsPanel reports={reports.items} radiusLabel={RADIUS_LABEL} />;
    };

    const panels = { reports: renderReports, alerts: renderAlerts, sos: renderSos, insights: renderInsights };

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                <header className="bg-white border-b border-gray-200">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 text-center">
                        <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3 pb-2">
                            Community Safety Hub
                        </h1>
                        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                            Citizen reports near you, official alerts from city departments
                            {canSeeSos ? ' and emergencies you can help with.' : '.'}
                        </p>
                        {(volunteer || isSuperAdmin(user)) && (
                            <p className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm font-medium text-blue-700">
                                <UserCheck className="w-4 h-4" aria-hidden="true" />
                                {volunteer ? 'Volunteer access - you can respond to nearby SOS alerts' : 'Super admin view'}
                            </p>
                        )}
                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold disabled:opacity-60"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                                {refreshing ? 'Refreshing…' : 'Refresh'}
                            </button>
                            <p className="mt-2 text-xs text-gray-500">Updates automatically every minute while this tab is open.</p>
                        </div>
                    </div>
                </header>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                    <section aria-label="Summary" className={`grid grid-cols-2 ${canSeeSos ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                        <StatTile label={`Reports within ${RADIUS_LABEL}`} value={statValue(reports, reports.items.length)} />
                        <StatTile
                            label="Resolved nearby"
                            value={statValue(reports, reports.items.filter((r) => r.status === 'resolved').length)}
                        />
                        <StatTile label="Official alerts" value={statValue(alerts, alerts.items.length)} />
                        {canSeeSos && <StatTile label="Active SOS" value={statValue(sos, activeSosCount)} />}
                    </section>

                    <div role="tablist" aria-label="Community sections" className="flex flex-wrap justify-center gap-2">
                        {TABS.map(({ key, label, icon: Icon }) => {
                            const selected = activeTab === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    id={`tab-${key}`}
                                    aria-selected={selected}
                                    aria-controls={`panel-${key}`}
                                    onClick={() => setActiveTab(key)}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm sm:text-base transition-colors ${
                                        selected ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" aria-hidden="true" />
                                    {label}
                                    {tabCounts[key] !== null && (
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${selected ? 'bg-white/20' : 'bg-gray-100'}`}>
                                            {tabCounts[key]}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                        {panels[activeTab]()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Community;
