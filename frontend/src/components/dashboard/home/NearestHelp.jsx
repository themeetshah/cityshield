import { Link } from 'react-router-dom';
import { CheckCircle2, Hospital, LocateFixed, Navigation, Phone, Shield, TriangleAlert } from 'lucide-react';
import { Skeleton } from './ui';
import { primaryButton, secondaryButton } from './styles';

const splitDistance = (metres) => {
    if (metres == null) return { value: '—', unit: '' };
    if (metres < 1000) return { value: String(Math.round(metres)), unit: 'm' };
    return { value: (metres / 1000).toFixed(metres < 10000 ? 1 : 0), unit: 'km' };
};

const routeState = (place, type) => ({
    navigationType: 'incident_route',
    endLocation: { latitude: place.latitude, longitude: place.longitude, name: place.name, type },
});

const KINDS = {
    police: { icon: Shield, label: 'Nearest police station', rail: 'bg-blue-600', iconTone: 'text-blue-600' },
    hospital: { icon: Hospital, label: 'Nearest hospital', rail: 'bg-rose-600', iconTone: 'text-rose-600' },
};

const HelpPlace = ({ kind, place, loading }) => {
    const { icon: Icon, label, rail, iconTone } = KINDS[kind];
    const { value, unit } = splitDistance(place?.distance);
    return (
        <article className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label={label}>
            <span className={`absolute inset-y-0 left-0 w-1.5 ${rail}`} aria-hidden="true" />
            <div className="pl-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Icon className={`h-4 w-4 ${iconTone}`} aria-hidden="true" />
                    {label}
                </p>
                {loading ? (
                    <div className="mt-4 space-y-3">
                        <Skeleton className="h-12 w-28" />
                        <Skeleton className="h-5 w-3/4" />
                    </div>
                ) : place ? (
                    <>
                        <p className="mt-4 flex items-baseline gap-2 tabular-nums">
                            <span className="text-5xl font-black tracking-tight text-slate-900">{value}</span>
                            {unit && <span className="text-lg font-semibold text-slate-500">{unit}</span>}
                        </p>
                        <h2 className="mt-1 text-base font-bold leading-snug text-slate-900 break-words">{place.name}</h2>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link to="/safety-map" state={routeState(place, kind)} className={primaryButton}>
                                <Navigation className="h-4 w-4" aria-hidden="true" /> Directions
                            </Link>
                            {place.contact_number && (
                                <a href={`tel:${place.contact_number}`} className={secondaryButton}>
                                    <Phone className="h-4 w-4" aria-hidden="true" /> Call
                                </a>
                            )}
                        </div>
                    </>
                ) : (
                    <p className="mt-4 text-slate-600">None found within 5 km.</p>
                )}
            </div>
        </article>
    );
};

const AreaNote = ({ area }) => {
    if (!area) return null;
    const total = area.total_incidents ?? 0;
    const recent = area.recent_incidents ?? 0;
    const quiet = total === 0;
    const text = quiet
        ? 'No incidents reported within 1 km of you in the last 12 months.'
        : `${total} incident${total === 1 ? '' : 's'} reported within 1 km in the last 12 months${recent ? `, ${recent} in the last 30 days` : ''}.`;
    const Icon = quiet ? CheckCircle2 : TriangleAlert;
    return (
        <div className={`flex flex-col gap-2 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:gap-3 ${quiet ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <p className="flex flex-1 items-start gap-2.5 text-sm font-medium text-slate-700">
                <Icon className={`mt-px h-5 w-5 shrink-0 ${quiet ? 'text-emerald-600' : 'text-amber-600'}`} aria-hidden="true" />
                {text}
            </p>
            <Link to="/safety-map" className="text-sm font-bold text-blue-700 hover:underline">
                See the safety map
            </Link>
        </div>
    );
};

/** Closest police station and hospital. The greeting lives in the page header. */
const NearestHelp = ({ help }) => {
    const noLocation = !help.location && !help.geoLoading;
    const placesLoading = help.geoLoading || help.loading;

    if (noLocation) {
        return (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6" role="status">
                <p className="font-bold text-slate-900">Turn on location to see the nearest police station and hospital.</p>
                <p className="mt-1 text-sm text-slate-600">{help.geoError || 'Location access was not granted.'}</p>
                <button type="button" onClick={help.retryLocation} className={`${secondaryButton} mt-4`}>
                    <LocateFixed className="h-4 w-4" aria-hidden="true" /> Use my location
                </button>
            </section>
        );
    }

    return (
        <section aria-label="Nearest help" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <HelpPlace kind="police" place={help.police} loading={placesLoading} />
                <HelpPlace kind="hospital" place={help.hospital} loading={placesLoading} />
            </div>
            {help.error && <p className="text-sm font-medium text-red-600" role="alert">{help.error}</p>}
            {help.syncing && !help.police && !help.hospital && (
                <p className="text-sm text-slate-600">Loading police stations and hospitals for your area. Check back in a minute.</p>
            )}
            <AreaNote area={help.area} />
        </section>
    );
};

export default NearestHelp;
