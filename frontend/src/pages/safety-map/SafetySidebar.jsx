import { formatDistance } from '../../components/map/geo';
import { ANALYSIS_RADIUS_M, FACILITIES_RADIUS_M, REPORTS_RADIUS_M, RISK_LEVELS, RISK_LEVEL_LABELS, TYPE_LABELS } from './mapConfig';

const LAYERS = [
    { key: 'showRisk', label: 'Risk grid & incident clusters', countKey: 'cells' },
    { key: 'showReports', label: 'Incident reports', countKey: 'reports' },
    { key: 'showHospitals', label: 'Hospitals', countKey: 'hospitals' },
    { key: 'showPolice', label: 'Police stations', countKey: 'policeStations' },
];

const Card = ({ title, children }) => (
    <section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h2 className="font-bold text-sm text-gray-800 mb-3">{title}</h2>
        {children}
    </section>
);

const Stat = ({ value, label, tone }) => (
    <div className={`text-center p-3 rounded-lg border ${tone}`}>
        <div className="font-bold text-lg">{value}</div>
        <div className="text-xs">{label}</div>
    </div>
);

const AreaSummary = ({ analysis, loading }) => {
    if (!analysis) {
        return <p className="text-xs text-gray-500">{loading ? 'Analysing your area…' : 'Not available yet.'}</p>;
    }
    const typeEntries = Object.entries(analysis.by_type || {});
    return (
        <div className="text-xs text-gray-700 space-y-2">
            <p>
                <span className="font-semibold">Within {formatDistance(analysis.radius || ANALYSIS_RADIUS_M)}:</span>{' '}
                {RISK_LEVEL_LABELS[analysis.risk_level] || analysis.risk_level}
                {analysis.total_incidents > 0 && ` (score ${analysis.risk_score.toFixed(1)} / 10)`}
            </p>
            <p>
                {analysis.total_incidents} incident{analysis.total_incidents === 1 ? '' : 's'} in the last 12 months,
                {' '}{analysis.recent_incidents} in the last 30 days.
            </p>
            {typeEntries.length > 0 && (
                <ul className="list-disc list-inside text-gray-600">
                    {typeEntries.map(([type, count]) => (
                        <li key={type}>{TYPE_LABELS[type] || type}: {count}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const SafetySidebar = ({ data, counts, filters, onToggleLayer, location, isManual, onRefreshLocation, onPickOnMap, pickMode }) => (
    <aside className="w-full md:w-80 bg-white border border-gray-200 rounded-xl shadow-lg order-2 md:order-1" aria-label="Map details">
        <div className="p-4 md:p-5 md:max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4">
                <Card title="Around you">
                    <div className="grid grid-cols-2 gap-2">
                        <Stat value={counts.reports} label={`Reports (${formatDistance(REPORTS_RADIUS_M)})`} tone="bg-orange-50 border-orange-200 text-orange-800" />
                        <Stat value={counts.zones} label="Incident clusters" tone="bg-red-50 border-red-200 text-red-800" />
                        <Stat value={counts.hospitals} label={`Hospitals (${formatDistance(FACILITIES_RADIUS_M)})`} tone="bg-blue-50 border-blue-200 text-blue-800" />
                        <Stat value={counts.policeStations} label={`Police (${formatDistance(FACILITIES_RADIUS_M)})`} tone="bg-emerald-50 border-emerald-200 text-emerald-800" />
                    </div>
                </Card>

                <Card title="Area summary">
                    <AreaSummary analysis={data.analysis} loading={data.loading} />
                </Card>

                <Card title="Risk legend (heuristic)">
                    <ul className="space-y-1.5">
                        {RISK_LEVELS.map(({ level, label, color }) => (
                            <li key={level} className="flex items-center gap-3 text-xs">
                                <span className="w-6 h-4 rounded border border-gray-300" style={{ backgroundColor: color }} aria-hidden="true" />
                                {label}
                            </li>
                        ))}
                        <li className="flex items-center gap-3 text-xs">
                            <span className="w-6 h-4 rounded border border-gray-300 bg-white" aria-hidden="true" />
                            No colour: no reported incidents (not a guarantee of safety)
                        </li>
                    </ul>
                    {data.riskExplanation && (
                        <p className="text-xs text-gray-500 mt-3 border-t pt-2">{data.riskExplanation}</p>
                    )}
                </Card>

                <Card title="Map layers">
                    <div className="space-y-3">
                        {LAYERS.map(({ key, label, countKey }) => (
                            <label key={key} htmlFor={`layer-${key}`} className="flex items-center justify-between gap-2 cursor-pointer text-sm text-gray-700">
                                <span>
                                    {label} <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{counts[countKey]}</span>
                                </span>
                                <input
                                    id={`layer-${key}`}
                                    type="checkbox"
                                    checked={filters[key]}
                                    onChange={() => onToggleLayer(key)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </label>
                        ))}
                    </div>
                </Card>

                <Card title="Your location">
                    <div className="text-xs text-gray-600 space-y-2">
                        {location ? (
                            <>
                                <p>{isManual ? 'Chosen manually on the map' : 'From your device'}</p>
                                <p className="font-mono">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
                                {location.accuracy != null && <p>Accuracy ±{Math.round(location.accuracy)} m</p>}
                            </>
                        ) : (
                            <p>No location yet.</p>
                        )}
                        <div className="flex gap-2">
                            <button type="button" onClick={onRefreshLocation} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                                Use device location
                            </button>
                            <button
                                type="button"
                                onClick={onPickOnMap}
                                aria-pressed={pickMode}
                                className={`flex-1 px-3 py-2 rounded-lg font-semibold border ${pickMode ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                {pickMode ? 'Tap the map…' : 'Pick on map'}
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    </aside>
);

export default SafetySidebar;
