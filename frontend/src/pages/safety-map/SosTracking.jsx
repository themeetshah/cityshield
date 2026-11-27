// Focused layers + sidebar for following a live SOS on the Safety Map.
// Only what a responder needs: risk heatmap, route, SOS pin, own position and
// the safe places closest to the person in distress.
import L from 'leaflet';
import { Marker, Polyline, Popup } from 'react-leaflet';
import { Building2, Hospital, Navigation, Phone, Shield } from 'lucide-react';
import { formatDistance, formatDuration } from '../../components/map/geo';
import { RISK_LEVELS, markerIcon } from './mapConfig';

const sosPinIcon = L.divIcon({
    className: 'cs-sos-pin-wrapper',
    html: '<div class="cs-sos-pin"><span class="cs-sos-pulse"></span><span class="cs-sos-head"><span class="cs-sos-label">SOS</span></span></div>',
    iconSize: [48, 60],
    iconAnchor: [24, 58],
    popupAnchor: [0, -54],
});

const responderIcon = L.divIcon({
    className: 'cs-responder-wrapper',
    html: '<div class="cs-responder"><span class="cs-responder-halo"></span><span class="cs-responder-dot"></span></div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -14],
});

export const SosPin = ({ target, active }) => (
    <Marker position={[target.latitude, target.longitude]} icon={sosPinIcon} zIndexOffset={2000}>
        <Popup>
            <p className="font-semibold">{target.name}</p>
            <p className="text-xs">{active ? 'Live position - updates every few seconds' : 'Last known position (resolved)'}</p>
        </Popup>
    </Marker>
);

export const ResponderPin = ({ location, isManual }) => (
    <Marker position={[location.latitude, location.longitude]} icon={responderIcon} zIndexOffset={1500}>
        <Popup>
            <p className="font-semibold">{isManual ? 'Start point you chose' : 'You are here'}</p>
            {location.accuracy != null && <p className="text-xs">Accuracy ±{Math.round(location.accuracy)} m</p>}
        </Popup>
    </Marker>
);

export const SosTrail = ({ trail }) => (trail.length > 1 ? (
    <Polyline positions={trail} pathOptions={{ color: '#dc2626', weight: 3, opacity: 0.7, dashArray: '2 8', lineCap: 'round' }} />
) : null);

export const SafePlaceMarkers = ({ places }) => places.map((place) => (
    <Marker key={`${place.type}-${place.id}`} position={[place.latitude, place.longitude]} icon={markerIcon(place.type, 34)}>
        <Popup>
            <div className="text-sm min-w-[180px]">
                <p className="font-bold text-gray-900">{place.name}</p>
                <p className="text-gray-600">{place.type === 'hospital' ? 'Hospital' : 'Police station'} · {formatDistance(place.distance)} from the SOS</p>
                {place.address && <p className="text-xs text-gray-500 mt-1">{place.address}</p>}
                {place.contact_number && (
                    <a href={`tel:${place.contact_number}`} className="inline-flex items-center gap-1 mt-1 text-blue-700 font-semibold">
                        <Phone className="w-3 h-3" aria-hidden="true" /> {place.contact_number}
                    </a>
                )}
            </div>
        </Popup>
    </Marker>
));

const PlaceIcon = ({ type }) => (type === 'hospital'
    ? <Hospital className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
    : <Shield className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />);

export const SosTrackingSidebar = ({ sosTarget, routeInfo, straightLine, places, loadingPlaces, onFocus }) => (
    <aside className="w-full md:w-80 order-2 md:order-1 space-y-4" aria-label="SOS tracking details">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600" aria-hidden="true" /> Your route
            </h2>
            {routeInfo ? (
                <p className="mt-2 text-2xl font-black text-gray-900">
                    {formatDuration(routeInfo.duration)}
                    <span className="block text-sm font-medium text-gray-600">{formatDistance(routeInfo.distance)} by road</span>
                </p>
            ) : (
                <p className="mt-2 text-sm text-gray-600">
                    {straightLine != null ? `${formatDistance(straightLine)} away (straight line)` : 'Waiting for your location…'}
                </p>
            )}
            {sosTarget && (
                <button type="button" onClick={() => onFocus(sosTarget)} className="mt-3 w-full rounded-xl bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700">
                    Center on SOS
                </button>
            )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" aria-hidden="true" /> Safe places near the SOS
            </h2>
            {loadingPlaces && places.length === 0 && <p className="mt-2 text-sm text-gray-500">Loading…</p>}
            {!loadingPlaces && places.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">No hospitals or police stations found within 5 km of the SOS.</p>
            )}
            <ul className="mt-2 divide-y divide-gray-100">
                {places.map((place) => (
                    <li key={`${place.type}-${place.id}`} className="py-2">
                        <button type="button" onClick={() => onFocus(place)} className="w-full text-left flex items-start gap-2 hover:bg-gray-50 rounded-md p-1">
                            <PlaceIcon type={place.type} />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-gray-900 truncate">{place.name}</span>
                                <span className="block text-xs text-gray-500">{formatDistance(place.distance)} from the SOS</span>
                            </span>
                        </button>
                        {place.contact_number && (
                            <a href={`tel:${place.contact_number}`} className="ml-7 inline-flex items-center gap-1 text-xs text-blue-700 font-semibold">
                                <Phone className="w-3 h-3" aria-hidden="true" /> {place.contact_number}
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-bold text-gray-900 text-sm">Risk heatmap (heuristic)</h2>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-700">
                {RISK_LEVELS.map((l) => (
                    <li key={l.level} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ background: l.color }} aria-hidden="true" /> {l.label}
                    </li>
                ))}
            </ul>
            <p className="mt-2 text-[11px] text-gray-500">Based on reports from the last 12 months around the SOS.</p>
        </section>
    </aside>
);
