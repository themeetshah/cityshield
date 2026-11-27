import { formatDistance } from '../../components/map/geo';
import { ANALYSIS_RADIUS_M, FACILITIES_RADIUS_M, REPORTS_RADIUS_M, RISK_LEVELS, RISK_LEVEL_LABELS, TYPE_LABELS } from './mapConfig';

const LAYERS = [
    { key: 'showRisk', label: 'Risk grid & incident clusters', countKey: 'cells' },
    { key: 'showReports', label: 'Incident reports', countKey: 'reports' },
    { key: 'showHospitals', label: 'Hospitals', countKey: 'hospitals' },
    { key: 'showPolice', label: 'Police stations', countKey: 'policeStations' },
];

const Section = ({ title, children }) => (
    <section className="py-5 first:pt-0 last:pb-0">
        <h2 className="mb-3 text-sm font-black tracking-tight text-slate-900">{title}</h2>
        {children}
    </section>
);

// Coloured dot = the marker colour of that layer on the map.
const Stat = ({ value, label, dot }) => (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
        <div className="text-2xl font-black tabular-nums tracking-tight text-slate-900">{value}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
            {label}
        </div>
    </div>
);

const AreaSummary = ({ analysis, loading }) => {
    if (!analysis) {
        return <p className="text-sm text-slate-500">{loading ? 'Analysing your area…' : 'Not available yet.'}</p>;
    }
    const typeEntries = Object.entries(analysis.by_type || {});
    return (
        <div className="space-y-2 text-sm text-slate-700">
            <p>
                <span className="font-bold text-slate-900">
                    {RISK_LEVEL_LABELS[analysis.risk_level] || analysis.risk_level}
                </span>
                {' '}within {formatDistance(analysis.radius || ANALYSIS_RADIUS_M)}
                {analysis.total_incidents > 0 && <span className="text-slate-500"> · score {analysis.risk_score.toFixed(1)} / 10</span>}
            </p>
            <p className="text-slate-600">
                {analysis.total_incidents} incident{analysis.total_incidents === 1 ? '' : 's'} in the last 12 months,
                {' '}{analysis.recent_incidents} in the last 30 days.
            </p>
            {typeEntries.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 pt-1">
                    {typeEntries.map(([type, count]) => (
                        <li key={type} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            {TYPE_LABELS[type] || type} · {count}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const smallPrimary = 'flex-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700';
const smallSecondary = 'flex-1 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-800 ring-1 ring-slate-300 transition hover:bg-slate-50';

const SafetySidebar = ({ data, counts, filters, onToggleLayer, location, isManual, onRefreshLocation, onPickOnMap, pickMode }) => (
    <aside className="order-2 w-full rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 md:order-1 md:w-80 md:shrink-0" aria-label="Map details">
        <div className="divide-y divide-slate-100 overflow-y-auto p-5 md:max-h-[70vh]">
            <Section title="Around you">
                <div className="grid grid-cols-2 gap-2">
                    <Stat value={counts.reports} label={`Reports · ${formatDistance(REPORTS_RADIUS_M)}`} dot="bg-orange-500" />
                    <Stat value={counts.zones} label="Clusters" dot="bg-red-500" />
                    <Stat value={counts.hospitals} label={`Hospitals · ${formatDistance(FACILITIES_RADIUS_M)}`} dot="bg-blue-600" />
                    <Stat value={counts.policeStations} label={`Police · ${formatDistance(FACILITIES_RADIUS_M)}`} dot="bg-emerald-600" />
                </div>
            </Section>

            <Section title="Area summary">
                <AreaSummary analysis={data.analysis} loading={data.loading} />
            </Section>

            <Section title="Risk legend">
                <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-slate-700">
                    {RISK_LEVELS.map(({ level, label, color }) => (
                        <li key={level} className="flex items-center gap-2">
                            <span className="h-3.5 w-5 rounded ring-1 ring-black/10" style={{ backgroundColor: color }} aria-hidden="true" />
                            {label}
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    {data.riskExplanation
                        || 'Heuristic, based on reported incidents. No colour means nothing was reported, not that an area is guaranteed safe.'}
                </p>
            </Section>

            <Section title="Map layers">
                <div className="space-y-2.5">
                    {LAYERS.map(({ key, label, countKey }) => (
                        <label key={key} htmlFor={`layer-${key}`} className="flex cursor-pointer items-center justify-between gap-2 text-sm text-slate-700">
                            <span className="flex items-center gap-2">
                                {label}
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{counts[countKey]}</span>
                            </span>
                            <input
                                id={`layer-${key}`}
                                type="checkbox"
                                checked={filters[key]}
                                onChange={() => onToggleLayer(key)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                        </label>
                    ))}
                </div>
            </Section>

            <Section title="Your location">
                <div className="space-y-3 text-sm text-slate-600">
                    {location ? (
                        <p>
                            {isManual ? 'Chosen on the map' : 'From your device'}
                            {location.accuracy != null && <span className="text-slate-500"> · ±{Math.round(location.accuracy)} m</span>}
                            <span className="mt-0.5 block font-mono text-xs text-slate-500">
                                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                            </span>
                        </p>
                    ) : (
                        <p>No location yet.</p>
                    )}
                    <div className="flex gap-2">
                        <button type="button" onClick={onRefreshLocation} className={smallPrimary}>Use my location</button>
                        <button
                            type="button"
                            onClick={onPickOnMap}
                            aria-pressed={pickMode}
                            className={pickMode ? `${smallPrimary} !bg-violet-600 hover:!bg-violet-700` : smallSecondary}
                        >
                            {pickMode ? 'Tap the map…' : 'Pick on map'}
                        </button>
                    </div>
                </div>
            </Section>
        </div>
    </aside>
);

export default SafetySidebar;
