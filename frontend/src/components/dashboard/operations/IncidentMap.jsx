import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapIcon } from 'lucide-react';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '../../map/leafletSetup';
import { humanize, timeAgo } from './format';
import { Panel } from './ui';

const svgIcon = (svg, size, anchor) =>
    new L.Icon({
        iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        iconSize: size,
        iconAnchor: anchor,
        popupAnchor: [0, -anchor[1]],
    });

const sosIcon = svgIcon(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path fill="#dc2626" stroke="#fff" stroke-width="1.5" d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><text x="12" y="12" font-size="7" font-weight="bold" text-anchor="middle" fill="#fff">SOS</text></svg>',
    [32, 32],
    [16, 32]
);
const reportIcon = svgIcon(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#2563eb" stroke="#fff" stroke-width="1.5" d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#fff"/></svg>',
    [24, 24],
    [12, 24]
);
const teamIcon = svgIcon(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="4" fill="#0f766e" stroke="#fff" stroke-width="1.5"/><text x="12" y="16" font-size="9" font-weight="bold" text-anchor="middle" fill="#fff">P</text></svg>',
    [24, 24],
    [12, 12]
);
const userIcon = svgIcon(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="8" fill="#1d4ed8" stroke="#fff" stroke-width="3"/></svg>',
    [20, 20],
    [10, 10]
);

// Neutral initial view when nothing is known yet (country-level, not a user position).
const DEFAULT_VIEW = { center: [20.5937, 78.9629], zoom: 5 };

const FlyTo = ({ target }) => {
    const map = useMap();
    useEffect(() => {
        if (target) map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 15), { duration: 0.8 });
    }, [map, target]);
    return null;
};

const IncidentMap = ({ alerts, reports, teams, userLocation, radiusM, focus }) => {
    const first = focus || userLocation || alerts[0] || reports[0];
    const center = first ? [first.latitude, first.longitude] : DEFAULT_VIEW.center;
    const zoom = first ? 13 : DEFAULT_VIEW.zoom;
    const placedTeams = teams.filter((t) => t.current_latitude !== null && t.current_longitude !== null);

    return (
        <Panel
            icon={MapIcon}
            title="Incident map"
            tone="green"
            actions={
                <ul className="flex flex-wrap gap-3 text-xs text-slate-700" aria-label="Map legend">
                    <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600" />SOS ({alerts.length})</li>
                    <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-600" />Reports ({reports.length})</li>
                    {teams.length > 0 && (
                        <li className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-700" />Teams ({placedTeams.length})</li>
                    )}
                </ul>
            }
        >
            <div className="h-[60vh] min-h-[360px]">
                <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
                    <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} maxZoom={19} />
                    <FlyTo target={focus} />
                    {userLocation && (
                        <>
                            <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
                                <Popup>Your location</Popup>
                            </Marker>
                            {radiusM && (
                                <Circle
                                    center={[userLocation.latitude, userLocation.longitude]}
                                    radius={radiusM}
                                    pathOptions={{ color: '#16a34a', fillOpacity: 0.05 }}
                                />
                            )}
                        </>
                    )}
                    {alerts.map((a) => (
                        <Marker key={`sos-${a.id}`} position={[a.latitude, a.longitude]} icon={sosIcon}>
                            <Popup>
                                <strong>SOS #{a.id}</strong> — {humanize(a.emergency_type)}
                                <br />
                                {a.user_name || 'Anonymous'} · {timeAgo(a.created_at)}
                                {a.response && (
                                    <>
                                        <br />
                                        Team {a.response.team?.team_id}: {a.response.status}
                                    </>
                                )}
                            </Popup>
                        </Marker>
                    ))}
                    {reports.map((r) => (
                        <Marker key={`report-${r.id}`} position={[r.latitude, r.longitude]} icon={reportIcon}>
                            <Popup>
                                <strong>{r.title}</strong>
                                <br />
                                {r.report_type_display} · {r.status_display}
                                <br />
                                <Link to={`/reports/${r.id}`}>Open report</Link>
                            </Popup>
                        </Marker>
                    ))}
                    {placedTeams.map((t) => (
                        <Marker key={`team-${t.id}`} position={[t.current_latitude, t.current_longitude]} icon={teamIcon}>
                            <Popup>
                                <strong>{t.team_id}</strong> ({t.is_active ? 'on duty' : 'off duty'})
                                <br />
                                Position reported {timeAgo(t.location_updated_at)}
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </Panel>
    );
};

export default IncidentMap;
