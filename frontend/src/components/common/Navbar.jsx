import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
    Shield,
    ChevronDown,
    User,
    LogOut,
    Menu,
    X,
    Home,
    FileText,
    Map,
    Users,
    Bell,
    Settings,
    Car,
    TrendingUp,
    Group
} from "lucide-react";

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const profileRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
        setProfileMenuOpen(false);
    }, [location]);

    const handleLogout = () => {
        logout();
        navigate("/");
        setIsMenuOpen(false);
        setProfileMenuOpen(false);
    };

    const navLinks = user
        ? user.role === 'police'
            ? [
                { to: "/", label: "Command Center", icon: Shield },
                // { to: "/safety-map", label: "Safety Map", icon: Map },
                // { to: "/community", label: "Community", icon: Users },
                // { to: "/analytics", label: "Analytics", icon: TrendingUp }
            ]
            : [
                { to: "/", label: "Dashboard", icon: Home },
                { to: "/reports", label: "Reports", icon: FileText },
                { to: "/safety-map", label: "Safety Map", icon: Map },
                { to: "/community", label: "Community", icon: Users }
            ]
        : [];

    const isActiveLink = (path) => {
        if (path === "/" && location.pathname === "/") return true;
        if (path !== "/" && location.pathname.startsWith(path)) return true;
        return false;
    };

    const getUserInitials = () => {
        if (user?.name) {
            const names = user.name.split(' ');
            return names.length > 1
                ? `${names[0][0]}${names[1][0]}`.toUpperCase()
                : names[0][0].toUpperCase();
        }
        return user?.email?.[0]?.toUpperCase() || 'U';
    };

    return (
        <nav className="bg-white/95 backdrop-blur-xl border-b border-gray-200/80 sticky top-0 z-50 shadow-lg">
            <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14 sm:h-16 lg:h-18">
                    {/* Logo - Always visible */}
                    <Link
                        to="/"
                        className="flex items-center space-x-2 sm:space-x-3 group select-none"
                        onClick={() => {
                            setIsMenuOpen(false);
                            setProfileMenuOpen(false);
                        }}
                    >
                        <div className="relative">
                            <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl transition-all duration-300">
                                <Shield className="text-white w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-xl"></div>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-xl lg:text-2xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent select-none">
                                CityShield
                            </h1>
                            <p className="text-blue-600 text-xs tracking-wide select-none hidden xs:block">
                                Community Platform
                            </p>
                        </div>
                    </Link>

                    {/* Desktop Navigation (>lg: shows full menu with text) */}
                    <div className="hidden lg:flex items-center space-x-3">
                        {navLinks.map(({ to, label, icon: Icon }) => {
                            const isActive = isActiveLink(to);
                            return (
                                <Link
                                    key={to}
                                    to={to}
                                    className={`
                                        flex items-center gap-2 p-2 rounded-xl font-semibold transition-all duration-300
                                        ${isActive
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                                            : 'text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:scale-105 hover:shadow-md'
                                        }
                                    `}
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setProfileMenuOpen(false);
                                    }}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Mini Desktop Navigation (sm to lg: shows icons only) */}
                    <div className="hidden sm:flex lg:hidden items-center space-x-2">
                        {navLinks.map(({ to, label, icon: Icon }) => {
                            const isActive = isActiveLink(to);
                            return (
                                <Link
                                    key={to}
                                    to={to}
                                    title={label}
                                    className={`
                                        flex items-center justify-center p-3 rounded-xl transition-all duration-300
                                        ${isActive
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                                            : 'text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:scale-105 hover:shadow-md'
                                        }
                                    `}
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setProfileMenuOpen(false);
                                    }}
                                >
                                    <Icon className="w-5 h-5" />
                                </Link>
                            );
                        })}
                    </div>

                    {/* User Section for Desktop and Mini-Desktop */}
                    {user ? (
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Profile Dropdown for Desktop (lg+) */}
                            <div className="hidden sm:flex items-center relative" ref={profileRef}>
                                <button
                                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all duration-300 group"
                                    aria-haspopup="true"
                                    aria-expanded={profileMenuOpen}
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        {getUserInitials()}
                                    </div>
                                    <div className="text-left min-w-0 lg:block hidden">
                                        <div className="text-sm font-semibold text-gray-900 truncate">
                                            {user.name || 'User'}
                                        </div>
                                        <div className="text-xs text-gray-500 capitalize truncate">
                                            {user.role === 'police' ? '👮‍♂️ Police Officer' :
                                                user.role === 'volunteer' ? '🤝 Volunteer' :
                                                    '👤 Citizen'}
                                        </div>
                                    </div>
                                    <ChevronDown
                                        className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${profileMenuOpen ? "rotate-180" : "rotate-0"}`}
                                    />
                                </button>

                                {/* Dropdown Menu */}
                                {profileMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 py-2 z-50 animate-fade-in-up border border-gray-100">
                                        {/* User Info Header */}
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                    {getUserInitials()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-gray-900 truncate">
                                                        {user.name || 'User'}
                                                    </div>
                                                    <div className="text-sm text-gray-500 truncate">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-2">
                                            {user.role !== 'police' && (
                                                <Link
                                                    to="/profile"
                                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 transition-all duration-300 group"
                                                    onClick={() => setProfileMenuOpen(false)}
                                                >
                                                    <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                    <span className="font-medium">My Profile</span>
                                                </Link>
                                            )}

                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-all duration-300 group"
                                            >
                                                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                <span className="font-medium">Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Profile Avatar for Mini-Desktop (sm to lg) */}
                            {/* <div className="hidden sm:flex lg:hidden">
                                <button
                                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all duration-300 group"
                                    aria-haspopup="true"
                                    aria-expanded={profileMenuOpen}
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        {getUserInitials()}
                                    </div>
                                    <ChevronDown
                                        className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${profileMenuOpen ? "rotate-180" : "rotate-0"}`}
                                    />
                                </button>
                            </div> */}
                        </div>
                    ) : (
                        // Auth buttons for non-mobile
                        <div className="hidden sm:flex items-center gap-4">
                            <Link
                                to="/login"
                                className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-xl font-semibold transition-all duration-300 hover:bg-blue-50"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/register"
                                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Get Started
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu Button (<sm) */}
                    <button
                        className="sm:hidden p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300"
                        aria-label="Toggle menu"
                        aria-expanded={isMenuOpen}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {!isMenuOpen ? (
                            <Menu className="w-5 h-5" />
                        ) : (
                            <X className="w-5 h-5" />
                        )}
                    </button>
                </div>

                {/* Mobile Menu (<sm) */}
                {isMenuOpen && (
                    <div className="sm:hidden border-t border-gray-200 bg-white/95 backdrop-blur-xl shadow-lg animate-slide-down">
                        {user ? (
                            <div className="px-3 py-4 space-y-2">
                                {/* Mobile User Info */}
                                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        {getUserInitials()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-900 truncate">
                                            {user.name || 'User'}
                                        </div>
                                        <div className="text-sm text-gray-500 truncate">
                                            {user.email}
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Navigation Links */}
                                {navLinks.map(({ to, label, icon: Icon }) => {
                                    const isActive = isActiveLink(to);
                                    return (
                                        <Link
                                            key={to}
                                            to={to}
                                            className={`
                                                flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300
                                                ${isActive
                                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                                }
                                            `}
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0" />
                                            <span>{label}</span>
                                        </Link>
                                    );
                                })}

                                <div className="border-t border-gray-200 my-3"></div>

                                {user.role !== 'police' && (

                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-300"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <User className="w-5 h-5 flex-shrink-0" />
                                        <span>My Profile</span>
                                    </Link>
                                )}

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300"
                                >
                                    <LogOut className="w-5 h-5 flex-shrink-0" />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        ) : (
                            <div className="px-3 py-4 space-y-2">
                                <Link
                                    to="/login"
                                    className="flex items-center justify-center px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-300"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    className="flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold transition-all duration-300"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes slide-down {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.2s ease-out;
                }
                .animate-slide-down {
                    animation: slide-down 0.3s ease-out;
                }
            `}</style>
        </nav>
    );
};

export default Navbar;
