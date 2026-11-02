import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Marker, Popup } from 'react-leaflet';
import { formatDistance, formatDuration } from '../../components/map/geo';
import { TYPE_LABELS, facilityKey, markerIcon } from './mapConfig';

export const ReportMarkers = memo(({ reports }) => reports.map((report) => (
    <Marker
        key={`report-${report.id}`}
        position={[report.latitude, report.longitude]}
        icon={markerIcon(report.report_type)}
    >
        <Popup maxWidth={300}>
            <div className="text-sm space-y-2 min-w-[220px]">
                <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold">
                        {report.report_type_display || TYPE_LABELS[report.report_type] || report.report_type}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">
                        {report.status_display || report.status}
                    </span>
                </div>
                <p className="font-bold text-gray-900 text-base">{report.title}</p>
                <p className="text-gray-700 line-clamp-3">{report.description}</p>
                <div className="text-xs text-gray-500 space-y-0.5 border-t pt-2">
                    {report.location && <p>{report.location}</p>}
                    <p>{new Date(report.created_at).toLocaleString()}</p>
                    <p>Reported by {report.reported_by_name}</p>
                    {report.distance != null && <p>About {formatDistance(report.distance)} away</p>}
                </div>
                <Link to={`/reports/${report.id}`} className="inline-block text-blue-600 font-semibold hover:underline">
                    View report
                </Link>
            </div>
        </Popup>
    </Marker>
)));
ReportMarkers.displayName = 'ReportMarkers';

const FacilityPopup = ({ facility, routeInfo, isActive, canRoute, onDirections, onClearRoute }) => {
    const isHospital = facility.type === 'hospital';
    return (
        <div className="text-sm space-y-2 min-w-[220px]">
            <p className={`font-bold text-base ${isHospital ? 'text-blue-700' : 'text-emerald-700'}`}>
                {isHospital ? '🏥' : '🚓'} {facility.name}
            </p>
            {facility.address && <p className="text-gray-600">{facility.address}</p>}
            <div className="text-xs text-gray-600 space-y-0.5">
                <p>Source: {facility.source === 'openstreetmap' ? 'OpenStreetMap' : 'CityShield database'}</p>
                {facility.distance != null && <p>Straight-line distance: {formatDistance(facility.distance)}</p>}
                {isActive && routeInfo && (
                    <p className="text-emerald-700 font-semibold">
                        Route: {formatDistance(routeInfo.distance)} · about {formatDuration(routeInfo.duration)} by road
                    </p>
                )}
            </div>
            <div className="flex flex-col gap-2">
                {isActive ? (
                    <button
                        type="button"
                        onClick={onClearRoute}
                        className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold"
                    >
                        Clear route
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => onDirections(facility)}
                        disabled={!canRoute}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {canRoute ? 'Get directions' : 'Set your location first'}
                    </button>
                )}
                {facility.contact_number && (
                    <a
                        href={`tel:${facility.contact_number}`}
                        className="w-full text-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white! rounded-lg font-semibold"
                    >
                        Call {facility.contact_number}
                    </a>
                )}
            </div>
        </div>
    );
};

export const FacilityMarkers = ({ facilities, activeKey, routeInfo, canRoute, onDirections, onClearRoute }) => (
    facilities.map((facility) => {
        const key = facilityKey(facility);
        return (
            <Marker key={key} position={[facility.latitude, facility.longitude]} icon={markerIcon(facility.type)}>
                <Popup maxWidth={300}>
                    <FacilityPopup
                        facility={facility}
                        isActive={activeKey === key}
                        routeInfo={routeInfo?.routeId === key ? routeInfo : null}
                        canRoute={canRoute}
                        onDirections={onDirections}
                        onClearRoute={onClearRoute}
                    />
                </Popup>
            </Marker>
        );
    })
);
