import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canManageStaff, isCommunityUser, isOperations, isSuperAdmin } from '../auth/roles';
import Navbar from '../components/common/Navbar';

const linkClass =
    'px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1';

/** Quick links that the current user is actually allowed to open. */
const quickLinksFor = (user) => {
    if (!user) {
        return [
            { to: '/login', label: 'Sign in', className: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
            { to: '/register', label: 'Create account', className: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700' },
        ];
    }
    const links = [
        { to: '/reports', label: 'Reports', className: 'bg-orange-50 hover:bg-orange-100 text-orange-700' },
        { to: '/safety-map', label: 'Safety map', className: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
    ];
    if (isCommunityUser(user) || isSuperAdmin(user)) {
        links.push({ to: '/report', label: 'New report', className: 'bg-red-50 hover:bg-red-100 text-red-700' });
        links.push({ to: '/community', label: 'Community', className: 'bg-teal-50 hover:bg-teal-100 text-teal-700' });
    }
    if (canManageStaff(user)) {
        links.push({ to: '/admin/staff', label: 'Staff', className: 'bg-gray-100 hover:bg-gray-200 text-gray-800' });
    }
    links.push({ to: '/profile', label: 'Profile', className: 'bg-green-50 hover:bg-green-100 text-green-700' });
    return links;
};

const NotFound = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const homeLabel = !user ? 'Go to home' : isOperations(user) ? 'Go to operations dashboard' : 'Go to dashboard';
    const quickLinks = quickLinksFor(user);
    const showsSosButton = !user || isCommunityUser(user);

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full mx-auto text-center bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-slate-200">
                    <p className="text-8xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-red-600 mb-6">
                        404
                    </p>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">Page not found</h1>
                    <p className="text-gray-600 mb-8">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>

                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <Link
                            to="/"
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
                        >
                            {homeLabel}
                        </Link>
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex-1 bg-gradient-to-r from-slate-500 to-slate-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
                        >
                            Go back
                        </button>
                    </div>

                    <nav aria-label="Quick navigation" className="border-t border-gray-200 pt-6">
                        <p className="text-sm text-gray-600 mb-4">Quick navigation</p>
                        <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {quickLinks.map((l) => (
                                <li key={l.to}>
                                    <Link to={l.to} className={`${linkClass} ${l.className}`}>
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {showsSosButton && (
                        <p className="mt-8 p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
                            <strong>Emergency?</strong> Use the SOS button on screen or call 112.
                        </p>
                    )}
                </div>
            </main>
        </>
    );
};

export default NotFound;
