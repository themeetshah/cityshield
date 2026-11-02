import { memo } from 'react';
import { Circle, Popup, Rectangle } from 'react-leaflet';
import { RISK_LEVEL_LABELS, TYPE_LABELS, riskColor } from './mapConfig';

const typeSummary = (byType = {}) => Object.entries(byType)
    .map(([type, count]) => `${count} ${TYPE_LABELS[type] || type}`)
    .join(', ');

export const RiskCells = memo(({ cells }) => cells.map((cell) => (
    <Rectangle
        key={`${cell.latitude}-${cell.longitude}`}
        bounds={[
            [cell.latitude - cell.lat_size / 2, cell.longitude - cell.lng_size / 2],
            [cell.latitude + cell.lat_size / 2, cell.longitude + cell.lng_size / 2],
        ]}
        pathOptions={{ fillColor: riskColor(cell.level), fillOpacity: 0.45, color: '#ffffff', weight: 1 }}
    >
        <Popup>
            <div className="min-w-[180px] text-sm">
                <p className="font-bold text-gray-900 mb-1">Heuristic risk: {RISK_LEVEL_LABELS[cell.level]}</p>
                <p>Score {cell.risk_score.toFixed(1)} / 10</p>
                <p>{cell.incident_count} incident{cell.incident_count === 1 ? '' : 's'} in this ~250 m cell</p>
                <p className="text-xs text-gray-500 mt-1">Based on reports from the last 12 months.</p>
            </div>
        </Popup>
    </Rectangle>
)));
RiskCells.displayName = 'RiskCells';

export const IncidentZones = memo(({ zones }) => zones.map((zone) => (
    <Circle
        key={`zone-${zone.center_latitude}-${zone.center_longitude}`}
        center={[zone.center_latitude, zone.center_longitude]}
        radius={zone.radius}
        pathOptions={{ color: riskColor(zone.level), fillColor: riskColor(zone.level), fillOpacity: 0.15, weight: 2 }}
    >
        <Popup>
            <div className="min-w-[200px] text-sm">
                <p className="font-bold text-gray-900 mb-1">Incident cluster</p>
                <p>{zone.incident_count} incidents within ~{zone.radius} m</p>
                {zone.by_type && <p className="text-gray-600">{typeSummary(zone.by_type)}</p>}
                <p>Heuristic score {zone.risk_score.toFixed(1)} / 10 ({RISK_LEVEL_LABELS[zone.level]})</p>
            </div>
        </Popup>
    </Circle>
)));
IncidentZones.displayName = 'IncidentZones';

export const OfficialZones = memo(({ zones }) => zones.map((zone) => (
    <Circle
        key={`official-${zone.id}`}
        center={[zone.center_latitude, zone.center_longitude]}
        radius={zone.radius}
        pathOptions={{
            color: zone.zone_type === 'danger' ? '#b91c1c' : '#15803d',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '6 6',
        }}
    >
        <Popup>
            <div className="text-sm">
                <p className="font-bold">{zone.zone_type === 'danger' ? 'Official danger zone' : 'Official safe zone'}</p>
                <p>Defined by an administrator · radius {Math.round(zone.radius)} m</p>
            </div>
        </Popup>
    </Circle>
)));
OfficialZones.displayName = 'OfficialZones';
