import { ArrowLeft, Navigation, RefreshCw, Square } from 'lucide-react';
import { formatDistance, formatDuration } from '../../components/map/geo';
import { Notice, PageHeader, StatusChip } from '../../components/common/PageShell';
import { secondaryButton, sosButton } from '../../components/dashboard/home/styles';

const KIND_LABELS = {
    hospital: 'Hospital',
    police: 'Police station',
    sos: 'SOS location',
    incident: 'Incident',
    alert: 'Official alert',
};

const darkButton =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300';

export const SafetyMapHeader = ({
    hasLocation, emergencyMode, onToggleEmergency, sosActive, loading, onReload, canGoBack, onBack, trackingSosId = null,
}) => (
    <PageHeader
        title={trackingSosId ? `Live SOS #${trackingSosId}` : 'Safety map'}
        subtitle={trackingSosId
            ? 'Route to the person in distress, the area risk heatmap and the safe places closest to them.'
            : 'Incidents, hospitals and police stations near you, with a risk overview of the area.'}
        actions={(
            <>
                {canGoBack && (
                    <button type="button" onClick={onBack} className={secondaryButton}>
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
                    </button>
                )}
                {hasLocation && (
                    <button type="button" onClick={onReload} disabled={loading} className={`${secondaryButton} disabled:opacity-60`}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                        {loading ? 'Loading…' : 'Refresh'}
                    </button>
                )}
                {!trackingSosId && (
                    <button
                        type="button"
                        onClick={onToggleEmergency}
                        disabled={!hasLocation}
                        className={`${emergencyMode ? darkButton : sosButton} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                        {emergencyMode
                            ? <><Square className="h-4 w-4" aria-hidden="true" /> Stop emergency navigation</>
                            : <><Navigation className="h-4 w-4" aria-hidden="true" /> Route to nearest help</>}
                    </button>
                )}
            </>
        )}
    >
        <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusChip tone={hasLocation ? 'green' : 'amber'}>
                <span className={`h-2 w-2 rounded-full ${hasLocation ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
                {hasLocation ? 'Location set' : 'Location required'}
            </StatusChip>
            {sosActive && <StatusChip tone="red" role="status">SOS active</StatusChip>}
        </div>
    </PageHeader>
);

const panelButton =
    'inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-800 ring-1 ring-slate-300 transition hover:bg-slate-50';

export const RoutePanel = ({ destination, routeInfo, routeError, emergencyMode, onClear }) => {
    if (!destination) return null;
    return (
        <div
            className={`flex flex-col gap-3 rounded-2xl px-4 py-3 ring-1 sm:flex-row sm:items-center ${emergencyMode ? 'bg-red-50 ring-red-100' : 'bg-blue-50 ring-blue-100'}`}
            role="status"
            aria-live="polite"
        >
            <div className="flex-1 text-sm">
                <p className={`font-bold ${emergencyMode ? 'text-red-800' : 'text-blue-800'}`}>
                    {emergencyMode ? 'Emergency route to ' : 'Route to '}
                    {destination.name} {KIND_LABELS[destination.kind] && <span className="font-normal">({KIND_LABELS[destination.kind]})</span>}
                </p>
                {routeInfo && (
                    <p className="text-gray-700">
                        {formatDistance(routeInfo.distance)} by road · about {formatDuration(routeInfo.duration)} driving
                    </p>
                )}
                {!routeInfo && !routeError && <p className="text-gray-600">Calculating route…</p>}
                {routeError && (
                    <p className="text-amber-800">
                        {routeError}
                        {destination.straightLine != null && ` Straight-line distance: ${formatDistance(destination.straightLine)}.`}
                    </p>
                )}
            </div>
            <button type="button" onClick={onClear} className={panelButton}>
                {emergencyMode ? 'End navigation' : 'Clear route'}
            </button>
        </div>
    );
};

export const Notices = ({ geoError, geoLoading, hasLocation, isManual, pickMode, errors, warnings, onDismissErrors, onRetryLocation, onReloadData }) => (
    <div className="space-y-3 empty:hidden">
        {!hasLocation && geoLoading && <Notice tone="info" role="status">Getting your location…</Notice>}
        {!hasLocation && !geoLoading && (
            <Notice tone="warning" role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <p className="font-bold">Your location is not available.</p>
                    <p>{geoError || 'Location access was not granted.'} Tap the map to choose your position, or try again.</p>
                </div>
                <button type="button" onClick={onRetryLocation} className={panelButton}>Try again</button>
            </Notice>
        )}
        {hasLocation && isManual && <Notice tone="purple">Using a location you chose on the map, not your device position.</Notice>}
        {pickMode && hasLocation && <Notice tone="purple" role="status">Tap anywhere on the map to set your location.</Notice>}
        {warnings.map((warning) => <Notice key={warning} tone="warning">{warning}</Notice>)}
        {errors.length > 0 && (
            <Notice tone="error" role="alert">
                <ul className="list-inside list-disc">
                    {errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
                <div className="mt-2 flex gap-4">
                    <button type="button" onClick={onReloadData} className="font-bold underline">Retry</button>
                    <button type="button" onClick={onDismissErrors} className="underline">Dismiss</button>
                </div>
            </Notice>
        )}
    </div>
);

/** Status strip shown while following a live SOS on the map. */
export const LiveSosPanel = ({ sosId, tracking, onStop }) => {
    if (!sosId) return null;
    const { active, updatedAt, error, loading } = tracking;
    return (
        <div
            className={`flex flex-col gap-3 rounded-2xl px-4 py-3 ring-1 sm:flex-row sm:items-center ${active ? 'bg-red-50 ring-red-100' : 'bg-slate-50 ring-slate-200'}`}
            role="status"
            aria-live="polite"
        >
            <div className="flex-1 text-sm">
                <p className={`font-bold flex items-center gap-2 ${active ? 'text-red-800' : 'text-gray-800'}`}>
                    {active && <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />}
                    {active ? `Live tracking SOS #${sosId}` : `SOS #${sosId} has been resolved`}
                </p>
                {loading && <p className="text-gray-600">Fetching the latest position…</p>}
                {!loading && active && updatedAt && !error && (
                    <p className="text-gray-700">
                        Position refreshes every 5 seconds · last update {updatedAt.toLocaleTimeString()}. The route follows the person as they move.
                    </p>
                )}
                {!active && <p className="text-gray-600">Live tracking stopped. The marker shows the last known position.</p>}
                {error && <p className="text-amber-800">{error}</p>}
            </div>
            <button type="button" onClick={onStop} className={panelButton}>
                Stop tracking
            </button>
        </div>
    );
};
