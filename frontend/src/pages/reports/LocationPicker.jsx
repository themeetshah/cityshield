import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
    OSM_ATTRIBUTION, OSM_TILE_URL, OVERVIEW_CENTER, OVERVIEW_ZOOM, defaultMarkerIcon,
} from '../../components/map/leafletSetup';

const ClickToPlace = ({ onPick }) => {
    useMapEvents({
        click(event) {
            onPick(event.latlng.lat, event.latlng.lng);
        },
    });
    return null;
};

/** Pans to the pin when it comes from the device (manual pins are already in view). */
const FollowDevicePin = ({ pin }) => {
    const map = useMap();
    const lat = pin?.latitude;
    const lng = pin?.longitude;
    const fromDevice = pin?.source === 'device';
    useEffect(() => {
        if (fromDevice && Number.isFinite(lat) && Number.isFinite(lng)) {
            map.setView([lat, lng], Math.max(map.getZoom(), 16));
        }
    }, [map, lat, lng, fromDevice]);
    return null;
};

/**
 * Inline map: click anywhere (or drag the marker) to choose the incident location.
 * `pin` = { latitude, longitude, source: 'device' | 'manual' } | null.
 */
const LocationPicker = ({ pin, onPick }) => (
    <div className="h-72 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 cursor-crosshair">
        <MapContainer
            center={pin ? [pin.latitude, pin.longitude] : OVERVIEW_CENTER}
            zoom={pin ? 16 : OVERVIEW_ZOOM}
            scrollWheelZoom={false}
            className="h-full w-full z-0"
        >
            <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
            <ClickToPlace onPick={onPick} />
            <FollowDevicePin pin={pin} />
            {pin && (
                <Marker
                    position={[pin.latitude, pin.longitude]}
                    icon={defaultMarkerIcon}
                    draggable
                    eventHandlers={{
                        dragend: (event) => {
                            const { lat, lng } = event.target.getLatLng();
                            onPick(lat, lng);
                        },
                    }}
                />
            )}
        </MapContainer>
    </div>
);

export default LocationPicker;
