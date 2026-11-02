import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Car, FileText, MapIcon, Megaphone, RefreshCw, Users } from 'lucide-react';

import Navbar from '../common/Navbar';
import VideoStreamModal from './VideoStreamModal';
import { useAuth } from '../../context/AuthContext';
import { canManageStaff, departmentLabel, departmentOf, inDepartment, isSuperAdmin, roleLabel } from '../../auth/roles';
import useGeolocation from '../../hooks/useGeolocation';
import { errorMessage } from '../../services/api';
import sosService from '../../services/sos';
import {
    assignTeamToSOS, getDashboardStats, getPatrolTeams, getReports, getSOSAlerts, updateDispatchStatus, updateReportStatus,
} from '../../services/operations';

import usePolling from './operations/usePolling';
import { PAGE_SIZE, POLL_MS } from './operations/format';
import Sidebar from './operations/Sidebar';
import OverviewSection from './operations/OverviewSection';
import SOSSection from './operations/SOSSection';
import ReportsSection from './operations/ReportsSection';
import IncidentMap from './operations/IncidentMap';
import OfficialAlertsSection from './operations/OfficialAlertsSection';
import PatrolTeamsSection from './operations/PatrolTeamsSection';
import VolunteersSection from './operations/VolunteersSection';

const round = (n) => Math.round(n * 1e4) / 1e4; // ~10 m; avoids refetching on GPS jitter

const OperationsDashboard = () => {
    const { user } = useAuth();
    const superadmin = isSuperAdmin(user);
    const isPolice = inDepartment(user, 'police');

    const [section, setSection] = useState('sos');
    const [department, setDepartment] = useState('');
    const [locationEnabled, setLocationEnabled] = useState(false);
    const [radiusM, setRadiusM] = useState(5000);
    const [sosStatus, setSosStatus] = useState('active');
    const [sosLimit, setSosLimit] = useState(PAGE_SIZE);
    const [reportFilters, setReportFilters] = useState({ type: 'all', status: 'open' });
    const [reportLimit, setReportLimit] = useState(PAGE_SIZE);
    const [mapFocus, setMapFocus] = useState(null);
    const [videoSosId, setVideoSosId] = useState(null);

    const geo = useGeolocation({ enabled: locationEnabled });
    const scope = useMemo(() => {
        const params = { department: superadmin ? department : undefined };
        if (locationEnabled && geo.location) {
            params.latitude = round(geo.location.latitude);
            params.longitude = round(geo.location.longitude);
            params.radius = radiusM;
        }
        return params;
    }, [superadmin, department, locationEnabled, geo.location, radiusM]);
    const scopeKey = JSON.stringify(scope);

    // --- data (polled every 30 s while the tab is visible; previous data kept while refetching) ---
    const stats = usePolling(useCallback(() => getDashboardStats(scope), [scope]), { intervalMs: POLL_MS, deps: [scopeKey] });
    const sos = usePolling(
        useCallback(() => getSOSAlerts({ ...scope, status: sosStatus, limit: sosLimit }), [scope, sosStatus, sosLimit]),
        { intervalMs: POLL_MS, deps: [scopeKey, sosStatus, sosLimit] }
    );
    const reports = usePolling(
        useCallback(() => getReports({ ...scope, ...reportFilters, limit: reportLimit }), [scope, reportFilters, reportLimit]),
        { intervalMs: POLL_MS, deps: [scopeKey, reportFilters, reportLimit] }
    );
    const teams = usePolling(getPatrolTeams, { intervalMs: POLL_MS, enabled: isPolice });

    const refreshAll = () => {
        stats.refresh();
        sos.refresh();
        reports.refresh();
        if (isPolice) teams.refresh();
    };

    // --- actions ---
    const onAssign = async (sosId, teamId) => {
        try {
            const res = await assignTeamToSOS(sosId, teamId);
            toast.success(res.message);
            sos.refresh();
            teams.refresh();
            stats.refresh();
            return true;
        } catch (err) {
            toast.error(errorMessage(err, 'Could not assign the team.'));
            return false;
        }
    };

    const onAdvance = async (responseId, status) => {
        try {
            const res = await updateDispatchStatus(responseId, status);
            toast.success(res.message);
            sos.refresh();
            teams.refresh();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not update the dispatch.'));
        }
    };

    const onResolve = async (sosId) => {
        if (!window.confirm(`Mark SOS #${sosId} as resolved?`)) return;
        try {
            const res = await sosService.resolveSOS(sosId);
            if (res && res.success === false) throw new Error(res.message);
            toast.success(res?.message || `SOS #${sosId} resolved`);
            sos.refresh();
            stats.refresh();
            if (isPolice) teams.refresh();
        } catch (err) {
            toast.error(errorMessage(err, err?.message || 'Could not resolve the SOS.'));
        }
    };

    const onUpdateReportStatus = async (report, status, note) => {
        try {
            await updateReportStatus(report.id, status, note);
            toast.success(`Report #${report.id} updated`);
            reports.refresh();
            stats.refresh();
            return true;
        } catch (err) {
            toast.error(errorMessage(err, 'Could not update the report.'));
            return false;
        }
    };

    const showOnMap = (item) => {
        setMapFocus({ latitude: item.latitude, longitude: item.longitude });
        setSection('map');
    };

    const toggleLocation = () => {
        if (!locationEnabled && geo.error) geo.refresh();
        setLocationEnabled((v) => !v);
    };

    // --- navigation (role based) ---
    const sections = [
        { key: 'sos', label: 'SOS alerts', icon: AlertTriangle, count: sos.data?.count },
        { key: 'reports', label: 'Reports', icon: FileText, count: reports.data?.count },
        { key: 'map', label: 'Map', icon: MapIcon },
        { key: 'alerts', label: 'Official alerts', icon: Megaphone },
        ...(isPolice
            ? [
                { key: 'teams', label: 'Patrol teams', icon: Car, count: teams.data?.results?.filter((t) => t.is_active).length },
                { key: 'volunteers', label: 'Volunteers', icon: Users },
            ]
            : []),
    ];

    const dept = departmentOf(user);
    const title = superadmin
        ? `Operations — ${department ? departmentLabel(department) : 'All departments'}`
        : `${departmentLabel(dept)} operations`;
    const anyRefreshing = stats.refreshing || sos.refreshing || reports.refreshing;
    const loadedRadius = scope.radius ?? null;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="w-full mx-auto max-w-[1600px] p-2 sm:p-4 lg:p-6 space-y-3 lg:space-y-4">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
                        <p className="text-sm text-slate-600">
                            {user?.name || user?.email} · {roleLabel(user?.role)}
                            {user?.police_station_name && ` · ${user.police_station_name}`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={refreshAll}
                        disabled={anyRefreshing}
                        aria-label="Refresh dashboard data"
                        className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold"
                    >
                        <RefreshCw className={`w-4 h-4 ${anyRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        Refresh
                    </button>
                </header>

                <OverviewSection
                    stats={stats.data}
                    loading={stats.loading}
                    scopeLabel={loadedRadius ? `within ${loadedRadius / 1000} km` : null}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6">
                    <aside className="lg:col-span-3 xl:col-span-2">
                        <Sidebar
                            sections={sections}
                            active={section}
                            onSelect={setSection}
                            showDepartmentFilter={superadmin}
                            department={department}
                            onDepartment={(value) => {
                                setDepartment(value);
                                setSosLimit(PAGE_SIZE);
                                setReportLimit(PAGE_SIZE);
                            }}
                            showStaffLink={canManageStaff(user)}
                            location={{
                                enabled: locationEnabled,
                                onToggle: toggleLocation,
                                radiusM,
                                onRadius: setRadiusM,
                                geo,
                            }}
                        />
                    </aside>

                    <main className="lg:col-span-9 xl:col-span-10 min-w-0">
                        {section === 'sos' && (
                            <SOSSection
                                data={sos.data}
                                loading={sos.loading}
                                error={sos.error && errorMessage(sos.error, 'Could not load SOS alerts.')}
                                onRetry={sos.refresh}
                                statusFilter={sosStatus}
                                onStatusFilter={(value) => {
                                    setSosStatus(value);
                                    setSosLimit(PAGE_SIZE);
                                }}
                                radiusM={loadedRadius}
                                isPolice={isPolice}
                                teams={teams.data?.results || []}
                                onAssign={onAssign}
                                onAdvance={onAdvance}
                                onResolve={onResolve}
                                onVideo={setVideoSosId}
                                onShowOnMap={showOnMap}
                                onLoadMore={() => setSosLimit((l) => l + PAGE_SIZE)}
                                loadingMore={sos.refreshing}
                            />
                        )}
                        {section === 'reports' && (
                            <ReportsSection
                                data={reports.data}
                                loading={reports.loading}
                                error={reports.error && errorMessage(reports.error, 'Could not load reports.')}
                                onRetry={reports.refresh}
                                filters={reportFilters}
                                onFilters={(value) => {
                                    setReportFilters(value);
                                    setReportLimit(PAGE_SIZE);
                                }}
                                radiusM={loadedRadius}
                                onUpdateStatus={onUpdateReportStatus}
                                onShowOnMap={showOnMap}
                                onLoadMore={() => setReportLimit((l) => l + PAGE_SIZE)}
                                loadingMore={reports.refreshing}
                            />
                        )}
                        {section === 'map' && (
                            <IncidentMap
                                alerts={sos.data?.results || []}
                                reports={reports.data?.results || []}
                                teams={teams.data?.results || []}
                                userLocation={locationEnabled ? geo.location : null}
                                radiusM={loadedRadius}
                                focus={mapFocus}
                            />
                        )}
                        {section === 'alerts' && <OfficialAlertsSection user={user} department={superadmin ? department : undefined} />}
                        {section === 'teams' && isPolice && (
                            <PatrolTeamsSection
                                user={user}
                                data={teams.data}
                                loading={teams.loading}
                                error={teams.error && errorMessage(teams.error, 'Could not load patrol teams.')}
                                onRetry={teams.refresh}
                                onChanged={() => {
                                    teams.refresh();
                                    stats.refresh();
                                }}
                            />
                        )}
                        {section === 'volunteers' && isPolice && <VolunteersSection />}
                    </main>
                </div>
            </div>

            {videoSosId !== null && <VideoStreamModal sosId={videoSosId} onClose={() => setVideoSosId(null)} />}
        </div>
    );
};

export default OperationsDashboard;
