import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AlertTriangle, BarChart3, Building2, CheckCircle2, FileText, RefreshCw, UserCheck } from 'lucide-react';
import { PageHeader, PageShell, StatusChip } from '../components/common/PageShell';
import { IconChip } from '../components/dashboard/home/ui';
import { primaryButton, secondaryButton } from '../components/dashboard/home/styles';
import { useAuth } from '../context/AuthContext';
import { isSuperAdmin, isVolunteer } from '../auth/roles';
import useGeolocation from '../hooks/useGeolocation';
import { errorMessage } from '../services/api';
import { fetchNearbyReports } from '../services/reports';
import { getSOSByRole, getVolunteerStatus, respondToSOS, setVolunteerAvailability, sosTrackingPath } from '../services/sos';
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

const StatTile = ({ label, value, icon: Icon, tone }) => (
    <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <span className="hidden sm:inline-flex"><IconChip icon={Icon} tone={tone} /></span>
        <div className="min-w-0">
            <div className="text-2xl font-black tabular-nums tracking-tight text-slate-900 sm:text-3xl">{value}</div>
            <div className="text-xs font-semibold leading-snug text-slate-500 sm:text-sm">{label}</div>
        </div>
    </div>
);

const selectClass =
    'rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500';

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
        if (type === 'sos') {
            // Follow the person live in the in-app map (the route updates as they move).
            navigate(sosTrackingPath(item.id, item.latitude, item.longitude));
            return;
        }
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
                        <button type="button" onClick={() => navigate('/report')} className={primaryButton}>
                            Report an incident
                        </button>
                    }
                >
                    No citizen reports have been submitted within {RADIUS_LABEL} of you.
                </EmptyState>
            );
        }
        return (
            <>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                    <label htmlFor="report-type-filter" className="text-sm font-bold text-slate-700">
                        Category
                    </label>
                    <select
                        id="report-type-filter"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className={selectClass}
                    >
                        <option value="all">All categories</option>
                        {typeOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                    <span className="text-sm font-medium text-slate-500" aria-live="polite">
                        {visibleReports.length} report{visibleReports.length === 1 ? '' : 's'} within {RADIUS_LABEL}
                    </span>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="space-y-5">
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
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
        <PageShell>
            <PageHeader
                title="Community"
                subtitle={`Citizen reports near you and official alerts from city departments${canSeeSos ? ', plus emergencies you can help with' : ''}.`}
                actions={(
                    <button type="button" onClick={handleRefresh} disabled={refreshing} className={`${secondaryButton} disabled:opacity-60`}>
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                )}
            >
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {(volunteer || isSuperAdmin(user)) && (
                        <StatusChip tone="blue">
                            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            {volunteer ? 'Volunteer: you can respond to nearby SOS alerts' : 'Super admin view'}
                        </StatusChip>
                    )}
                    <span className="text-xs font-medium text-slate-500">Updates every minute while this page is open.</span>
                </div>
            </PageHeader>

            <div className="space-y-6">
                <section aria-label="Summary" className={`grid gap-3 sm:gap-4 ${canSeeSos ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3'}`}>
                    <StatTile
                        icon={FileText}
                        tone="bg-blue-50 text-blue-600 ring-blue-100"
                        label={`Reports within ${RADIUS_LABEL}`}
                        value={statValue(reports, reports.items.length)}
                    />
                    <StatTile
                        icon={CheckCircle2}
                        tone="bg-emerald-50 text-emerald-600 ring-emerald-100"
                        label="Resolved nearby"
                        value={statValue(reports, reports.items.filter((r) => r.status === 'resolved').length)}
                    />
                    <StatTile
                        icon={Building2}
                        tone="bg-violet-50 text-violet-600 ring-violet-100"
                        label="Active official alerts"
                        value={statValue(alerts, alerts.items.length)}
                    />
                    {canSeeSos && (
                        <StatTile
                            icon={AlertTriangle}
                            tone="bg-red-50 text-red-600 ring-red-100"
                            label="Active SOS"
                            value={statValue(sos, activeSosCount)}
                        />
                    )}
                </section>

                {/* Segmented control (same as the reports page scope toggle); scrolls sideways on phones. */}
                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <div role="tablist" aria-label="Community sections" className="inline-flex gap-1 rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-200/60">
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
                                    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                                        selected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon className={`h-4 w-4 ${selected ? 'text-blue-600' : ''}`} aria-hidden="true" />
                                    {label}
                                    {tabCounts[key] !== null && (
                                        <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${selected ? 'bg-blue-50 text-blue-700' : 'bg-white/70 text-slate-600'}`}>
                                            {tabCounts[key]}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                    {panels[activeTab]()}
                </div>
            </div>
        </PageShell>
    );
};

export default Community;
