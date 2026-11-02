import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullPageLoader from '../components/common/FullPageLoader';

/**
 * Route guard. `allow` is an optional predicate (user) => boolean, e.g.
 * <RequireAuth allow={canManageStaff}>. UI-only - the API enforces access.
 */
const RequireAuth = ({ children, allow }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <FullPageLoader />;
    if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
    if (allow && !allow(user)) return <Navigate to="/" replace />;
    return children;
};

export default RequireAuth;
