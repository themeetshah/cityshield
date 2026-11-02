import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scroll to the top whenever the route path changes (not on query/state-only changes). */
const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

export default ScrollToTop;
