import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, FileText, Home, LogOut, Map, Menu, Shield, User, UserCog, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { canManageStaff, isCommunityUser, isOperations, isSuperAdmin, roleLabel } from '../../auth/roles';

const linksFor = (user) => {
    if (!user) return [];
    if (isOperations(user)) {
        const links = [
            { to: '/', label: 'Operations', icon: Shield },
            { to: '/reports', label: 'Reports', icon: FileText },
            { to: '/safety-map', label: 'Map', icon: Map },
        ];
        if (isSuperAdmin(user)) links.push({ to: '/community', label: 'Community', icon: Users });
        if (canManageStaff(user)) links.push({ to: '/admin/staff', label: 'Staff', icon: UserCog });
        return links;
    }
    return [
        { to: '/', label: 'Dashboard', icon: Home },
        { to: '/reports', label: 'Reports', icon: FileText },
        { to: '/safety-map', label: 'Safety Map', icon: Map },
        { to: '/community', label: 'Community', icon: Users },
    ];
};

const initials = (user) => {
    const parts = (user?.name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return user?.email?.[0]?.toUpperCase() || 'U';
};

const useUnreadCount = (enabled) => {
    const [count, setCount] = useState(0);
    const load = useCallback(async () => {
        if (document.hidden) return;
        try {
            const { data } = await api.get('/users/notifications/', { params: { unread: 'true' } });
            setCount(data.unread_count || 0);
        } catch {
            // non-critical
        }
    }, []);
    useEffect(() => {
        if (!enabled) return undefined;
        load();
        const id = setInterval(load, 60000);
        document.addEventListener('visibilitychange', load);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', load);
        };
    }, [enabled, load]);
    return count;
};

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const unread = useUnreadCount(!!user);
    const links = linksFor(user);

    useEffect(() => {
        const onClick = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') {
                setProfileOpen(false);
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    const closeMenus = () => {
        setMenuOpen(false);
        setProfileOpen(false);
    };

    const handleLogout = async () => {
        closeMenus();
        await logout();
        navigate('/');
    };

    const isActive = (path) =>
        path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`);
    const linkClass = (active) =>
        `flex items-center gap-2 px-3 py-2 rounded-xl font-semibold transition-colors ${
            active ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow' : 'text-gray-700 hover:bg-blue-50'
        }`;

    return (
        <nav className="bg-white/95 backdrop-blur-xl border-b border-gray-200/80 sticky top-0 z-50 shadow-sm" aria-label="Main">
            <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14 sm:h-16">
                    <Link to="/" onClick={closeMenus} className="flex items-center gap-2 sm:gap-3 select-none">
                        <span className="bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 p-2 sm:p-2.5 rounded-xl shadow">
                            <Shield className="text-white w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                        </span>
                        <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                            CityShield
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        {links.map(({ to, label, icon: Icon }) => (
                            <Link key={to} to={to} className={linkClass(isActive(to))} aria-current={isActive(to) ? 'page' : undefined}>
                                <Icon className="w-4 h-4" aria-hidden="true" />
                                <span>{label}</span>
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                <Link
                                    to="/profile#notifications"
                                    className="relative p-2 rounded-xl text-gray-600 hover:bg-blue-50"
                                    aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                                >
                                    <Bell className="w-5 h-5" aria-hidden="true" />
                                    {unread > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                                            {unread > 99 ? '99+' : unread}
                                        </span>
                                    )}
                                </Link>

                                <div className="relative" ref={profileRef}>
                                    <button
                                        type="button"
                                        onClick={() => setProfileOpen((o) => !o)}
                                        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-blue-50"
                                        aria-haspopup="menu"
                                        aria-expanded={profileOpen}
                                        aria-label="Account menu"
                                    >
                                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold flex items-center justify-center">
                                            {initials(user)}
                                        </span>
                                        <span className="hidden lg:flex flex-col items-start leading-tight">
                                            <span className="text-sm font-semibold text-gray-900 max-w-[10rem] truncate">
                                                {user.name || user.email}
                                            </span>
                                            <span className="text-[11px] text-gray-500">{roleLabel(user.role)}</span>
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:block" aria-hidden="true" />
                                    </button>
                                    {profileOpen && (
                                        <div role="menu" className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                                            <div className="px-4 py-2 border-b border-gray-100">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{user.name || 'Account'}</p>
                                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                <p className="text-xs text-blue-700 mt-0.5">
                                                    {roleLabel(user.role)}
                                                    {user.police_station_name ? ` · ${user.police_station_name}` : ''}
                                                </p>
                                            </div>
                                            <Link role="menuitem" to="/profile" onClick={closeMenus} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                                <User className="w-4 h-4" aria-hidden="true" /> Profile
                                            </Link>
                                            {canManageStaff(user) && (
                                                <Link role="menuitem" to="/admin/staff" onClick={closeMenus} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                                    <UserCog className="w-4 h-4" aria-hidden="true" /> Staff management
                                                </Link>
                                            )}
                                            <button role="menuitem" type="button" onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                                <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-blue-700">
                                    Sign in
                                </Link>
                                <Link to="/register" className="px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow">
                                    Join
                                </Link>
                            </>
                        )}

                        {links.length > 0 && (
                            <button
                                type="button"
                                className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-blue-50"
                                onClick={() => setMenuOpen((o) => !o)}
                                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={menuOpen}
                                aria-controls="mobile-nav"
                            >
                                {menuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
                            </button>
                        )}
                    </div>
                </div>

                {menuOpen && (
                    <div id="mobile-nav" className="md:hidden pb-3 space-y-1">
                        {links.map(({ to, label, icon: Icon }) => (
                            <Link key={to} to={to} onClick={closeMenus} className={linkClass(isActive(to))}>
                                <Icon className="w-4 h-4" aria-hidden="true" />
                                <span>{label}</span>
                            </Link>
                        ))}
                        {isCommunityUser(user) && (
                            <Link to="/report" onClick={closeMenus} className={linkClass(isActive('/report'))}>
                                <FileText className="w-4 h-4" aria-hidden="true" />
                                <span>Report an incident</span>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
