import { formatDistance, formatDuration } from '../../components/map/geo';

const KIND_LABELS = {
    hospital: 'Hospital',
    police: 'Police station',
    sos: 'SOS location',
    incident: 'Incident',
    alert: 'Official alert',
};

export const SafetyMapHeader = ({
    hasLocation, emergencyMode, onToggleEmergency, sosActive, loading, onReload, canGoBack, onBack,
}) => (
    <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200 text-xs font-medium text-gray-700">
                    <span className={`w-2 h-2 rounded-full ${hasLocation ? 'bg-green-500' : 'bg-orange-400'}`} aria-hidden="true" />
                    {hasLocation ? 'Location set' : 'Location required'}
                </span>
                {sosActive && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-full text-xs font-bold" role="status">
                        SOS active
                    </span>
                )}
                {hasLocation && (
                    <button
                        type="button"
                        onClick={onReload}
                        disabled={loading}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 disabled:opacity-50"
                    >
                        {loading ? 'Loading…' : 'Refresh data'}
                    </button>
                )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3 pb-1">
                Safety Map
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto mb-5">
                Reported incidents, nearby hospitals and police stations, and a heuristic risk overview for your area.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={onToggleEmergency}
                    disabled={!hasLocation}
                    className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${emergencyMode
                        ? 'bg-gray-800 hover:bg-gray-900 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'}`}
                >
                    {emergencyMode ? 'Stop emergency navigation' : 'Route to nearest help'}
                </button>
                {canGoBack && (
                    <button type="button" onClick={onBack} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold">
                        ← Back
                    </button>
                )}
            </div>
        </div>
    </header>
);

export const RoutePanel = ({ destination, routeInfo, routeError, emergencyMode, onClear }) => {
    if (!destination) return null;
    return (
        <div
            className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${emergencyMode ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}
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
            <button type="button" onClick={onClear} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                {emergencyMode ? 'End navigation' : 'Clear route'}
            </button>
        </div>
    );
};

export const Notices = ({ geoError, geoLoading, hasLocation, isManual, pickMode, errors, warnings, onDismissErrors, onRetryLocation, onReloadData }) => (
    <div className="space-y-3">
        {!hasLocation && geoLoading && (
            <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800" role="status">
                Getting your location…
            </p>
        )}
        {!hasLocation && !geoLoading && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
                <p className="font-semibold">Your location is not available.</p>
                <p>{geoError || 'Location access was not granted.'} Tap the map to choose your position, or try again.</p>
                <button type="button" onClick={onRetryLocation} className="mt-2 underline font-semibold">Try device location again</button>
            </div>
        )}
        {hasLocation && isManual && (
            <p className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
                Using a location you chose on the map, not your device position.
            </p>
        )}
        {pickMode && hasLocation && (
            <p className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900" role="status">
                Tap anywhere on the map to set your location.
            </p>
        )}
        {warnings.map((warning) => (
            <p key={warning} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{warning}</p>
        ))}
        {errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                <ul className="list-disc list-inside">
                    {errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
                <div className="flex gap-4 mt-2">
                    <button type="button" onClick={onReloadData} className="underline font-semibold">Retry</button>
                    <button type="button" onClick={onDismissErrors} className="underline">Dismiss</button>
                </div>
            </div>
        )}
    </div>
);
