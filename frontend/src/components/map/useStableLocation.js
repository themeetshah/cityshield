import { useEffect, useState } from 'react';
import { distanceMeters } from './geo';

/**
 * Returns `location`, but only updates once it moved at least `thresholdMeters`
 * (manually chosen points, which have no accuracy, always apply immediately).
 * Keeps GPS jitter from refetching data or recomputing routes.
 */
const useStableLocation = (location, thresholdMeters) => {
    const [stable, setStable] = useState(location);

    useEffect(() => {
        if (!location) return;
        setStable((prev) => {
            if (!prev || location.accuracy == null || distanceMeters(prev, location) >= thresholdMeters) {
                return location;
            }
            return prev;
        });
    }, [location, thresholdMeters]);

    return stable;
};

export default useStableLocation;
