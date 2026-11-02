import { useId, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, MapPin, Navigation, Shield, Truck, User, Video } from 'lucide-react';
import { departmentLabel } from '../../../auth/roles';
import {
    DISPATCH_STEPS, NEXT_STEP_LABEL, formatDistance, formatKm, humanize, inputClass, mapsUrl, staggerDelay, timeAgo,
} from './format';
import { EmptyState, ErrorBanner, LoadMore, LoadingBlock, Panel } from './ui';

const MotionArticle = motion.article;

const STATUS_FILTERS = [
    { value: 'active', label: 'Active' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'all', label: 'All' },
];

const AssignTeam = ({ alert, teams, onAssign }) => {
    const selectId = useId();
    const [teamId, setTeamId] = useState('');
    const [busy, setBusy] = useState(false);
    const currentTeamId = alert.response?.team?.id;
    const options = teams.filter(
        (t) => t.is_active && t.id !== currentTeamId && (!t.current_assignment || t.current_assignment.sos_id === alert.id)
    );

    const submit = async () => {
        if (!teamId) return;
        setBusy(true);
        const ok = await onAssign(alert.id, Number(teamId));
        setBusy(false);
        if (ok) setTeamId('');
    };

    return (
        <div className="flex gap-2">
            <label htmlFor={selectId} className="sr-only">
                {currentTeamId ? 'Reassign patrol team' : 'Assign patrol team'}
            </label>
            <select id={selectId} value={teamId} onChange={(e) => setTeamId(e.target.value)} className={inputClass}>
                <option value="">
                    {options.length ? (currentTeamId ? 'Reassign to team…' : 'Assign patrol team…') : 'No free teams on duty'}
                </option>
                {options.map((t) => (
                    <option key={t.id} value={t.id}>
                        {t.team_id} — {t.station_name}
                    </option>
                ))}
            </select>
            <button
                type="button"
                onClick={submit}
                disabled={!teamId || busy}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold"
            >
                {busy ? '…' : 'Assign'}
            </button>
        </div>
    );
};

const DispatchStatus = ({ response, onAdvance }) => {
    const [busy, setBusy] = useState(false);
    const next = response.next_statuses?.[0];
    const advance = async (status) => {
        setBusy(true);
        await onAdvance(response.id, status);
        setBusy(false);
    };
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-xs font-bold text-blue-700 uppercase">{DISPATCH_STEPS[response.status]}</div>
                    <div className="font-semibold text-blue-900 truncate">
                        {response.team?.team_id} · {response.team?.station_name}
                    </div>
                    {response.response_time_minutes !== null && (
                        <div className="text-xs text-blue-700">Assigned {response.response_time_minutes} min after SOS</div>
                    )}
                </div>
                {onAdvance && next && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => advance(next)}
                        className="flex-shrink-0 px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold"
                    >
                        {NEXT_STEP_LABEL[next]}
                    </button>
                )}
            </div>
        </div>
    );
};

const SOSCard = ({ alert, index, isPolice, teams, onAssign, onAdvance, onResolve, onVideo, onShowOnMap }) => {
    const distance = formatDistance(alert.distance);
    return (
        <MotionArticle
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: staggerDelay(index) }}
            className={`border-2 rounded-xl p-3 sm:p-4 space-y-3 ${alert.is_active ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}
            aria-label={`SOS ${alert.id}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${alert.is_active ? 'bg-red-600' : 'bg-slate-500'}`}>
                        <AlertTriangle className="w-5 h-5 text-white" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{humanize(alert.emergency_type) || 'SOS'}</h3>
                        <p className="text-xs text-slate-600">
                            #{alert.id} · {departmentLabel(alert.department) || 'Unrouted'}
                        </p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${alert.is_active ? 'bg-red-600 text-white' : 'bg-green-100 text-green-800'}`}>
                        {alert.is_active ? 'ACTIVE' : 'RESOLVED'}
                    </span>
                    <div className="text-xs text-slate-600 mt-1">
                        <time dateTime={alert.created_at}>{timeAgo(alert.created_at)}</time>
                    </div>
                </div>
            </div>

            <dl className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <dt className="sr-only">Raised by</dt>
                    <dd className="truncate">{alert.user_name || 'Anonymous'}</dd>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <dt className="sr-only">Location</dt>
                    <dd>
                        {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                        {distance && <span className="text-slate-500"> · {distance} away</span>}
                    </dd>
                </div>
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <dt className="sr-only">Volunteers</dt>
                    <dd>{alert.volunteers_responded} volunteer{alert.volunteers_responded === 1 ? '' : 's'} responded</dd>
                </div>
            </dl>

            {alert.description && (
                <p className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-sm text-amber-900 line-clamp-3">
                    {alert.description}
                </p>
            )}

            {alert.response && (
                <DispatchStatus response={alert.response} onAdvance={isPolice ? onAdvance : null} />
            )}

            {isPolice && alert.is_active && <AssignTeam alert={alert} teams={teams} onAssign={onAssign} />}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                    type="button"
                    onClick={() => onVideo(alert.id)}
                    className="flex items-center justify-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white py-2 text-xs font-semibold"
                >
                    <Video className="w-4 h-4" aria-hidden="true" />
                    {alert.is_streaming ? 'Live video' : 'Video'}
                </button>
                <button
                    type="button"
                    onClick={() => onShowOnMap(alert)}
                    className="flex items-center justify-center gap-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white py-2 text-xs font-semibold"
                >
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    Map
                </button>
                <a
                    href={mapsUrl(alert.latitude, alert.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 rounded-lg bg-green-600 hover:bg-green-700 text-white py-2 text-xs font-semibold"
                >
                    <Navigation className="w-4 h-4" aria-hidden="true" />
                    Navigate
                </a>
                {alert.is_active && (
                    <button
                        type="button"
                        onClick={() => onResolve(alert.id)}
                        className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-semibold"
                    >
                        <CheckCircle className="w-4 h-4" aria-hidden="true" />
                        Resolve
                    </button>
                )}
            </div>
        </MotionArticle>
    );
};

const SOSSection = ({
    data, loading, error, onRetry, statusFilter, onStatusFilter, radiusM, isPolice, teams,
    onAssign, onAdvance, onResolve, onVideo, onShowOnMap, onLoadMore, loadingMore,
}) => {
    const alerts = data?.results || [];
    const filterId = useId();
    return (
        <Panel
            icon={AlertTriangle}
            title="SOS alerts"
            tone="red"
            badge={data ? data.count : null}
            actions={
                <>
                    {radiusM && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Within {formatKm(radiusM)}
                        </span>
                    )}
                    <label htmlFor={filterId} className="sr-only">SOS status</label>
                    <select
                        id={filterId}
                        value={statusFilter}
                        onChange={(e) => onStatusFilter(e.target.value)}
                        className="text-sm border border-red-200 rounded-lg px-2 py-1 bg-white"
                    >
                        {STATUS_FILTERS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                </>
            }
        >
            {error && <ErrorBanner message={error} onRetry={onRetry} />}
            {loading && !data ? (
                <LoadingBlock message="Loading SOS alerts…" />
            ) : alerts.length === 0 ? (
                <EmptyState
                    icon={Truck}
                    title={statusFilter === 'active' ? 'No active SOS alerts' : 'No SOS alerts'}
                    subtitle={radiusM ? `Nothing within ${formatKm(radiusM)} of your location.` : 'Nothing in your scope right now.'}
                />
            ) : (
                <>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 p-3 sm:p-4">
                        {alerts.map((alert, index) => (
                            <SOSCard
                                key={alert.id}
                                alert={alert}
                                index={index}
                                isPolice={isPolice}
                                teams={teams}
                                onAssign={onAssign}
                                onAdvance={onAdvance}
                                onResolve={onResolve}
                                onVideo={onVideo}
                                onShowOnMap={onShowOnMap}
                            />
                        ))}
                    </div>
                    <LoadMore shown={alerts.length} total={data?.count} onClick={onLoadMore} busy={loadingMore} />
                </>
            )}
        </Panel>
    );
};

export default SOSSection;
