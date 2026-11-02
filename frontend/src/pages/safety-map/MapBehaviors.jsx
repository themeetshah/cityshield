import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

/** Centres the map the first time `target` becomes available; never fights later user pans. */
export const CenterOnFirstFix = ({ target, zoom = 14 }) => {
    const map = useMap();
    const centered = useRef(false);
    const lat = target?.latitude;
    const lng = target?.longitude;

    useEffect(() => {
        if (centered.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
        centered.current = true;
        map.setView([lat, lng], zoom);
    }, [map, lat, lng, zoom]);

    return null;
};

/** While enabled, a click on the map reports its coordinates. */
export const MapClickPicker = ({ enabled, onPick }) => {
    useMapEvents({
        click(event) {
            if (enabled) onPick(event.latlng.lat, event.latlng.lng);
        },
    });
    return null;
};

/** Keeps Leaflet's size in sync with its container (layout changes, sidebar, rotation). */
export const MapResizeHandler = () => {
    const map = useMap();

    useEffect(() => {
        const container = map.getContainer();
        let frame = null;
        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => map.invalidateSize({ animate: false, pan: false }));
        });
        observer.observe(container);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [map]);

    return null;
};
