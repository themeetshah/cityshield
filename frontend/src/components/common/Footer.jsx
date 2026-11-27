import { Link } from 'react-router-dom';
import { ExternalLink, Heart, Phone, Shield, Siren } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import EMERGENCY_NUMBERS from './emergencyNumbers';

const PLATFORM = ['Incident reporting', 'Department routing', 'SOS alerts', 'Safety map', 'Community volunteers', 'Official alerts'];

const DEPARTMENTS = ['Police', 'Municipal', 'Fire & Rescue', 'Medical / EMS'];

const GUEST_LINKS = [
    { to: '/login', label: 'Sign in' },
    { to: '/register', label: 'Create an account' },
];

const USER_LINKS = [
    { to: '/', label: 'Home' },
    { to: '/reports', label: 'Reports' },
    { to: '/safety-map', label: 'Safety map' },
    { to: '/profile', label: 'Profile' },
];

const linkClass = 'text-slate-600 hover:text-blue-700 transition-colors focus:outline-none focus-visible:underline';

const Column = ({ title, children }) => (
    <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{title}</h2>
        <ul className="mt-4 space-y-3 text-sm">{children}</ul>
    </div>
);

const Footer = ({ showEmergencyNumbers = true, width = 'max-w-7xl' }) => {
    const { user } = useAuth();
    const links = user ? USER_LINKS : GUEST_LINKS;

    return (
        <footer className="bg-slate-50 border-t border-slate-200 text-slate-900">
            <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${width}`}>
                {/* Emergency numbers (pages that already show them can turn this off) */}
                {showEmergencyNumbers && (
                <div className="my-12 rounded-3xl bg-white p-5 sm:p-6 ring-1 ring-slate-200 shadow-xl shadow-slate-900/5">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
                        <div className="flex items-center gap-3 lg:w-60 shrink-0">
                            <span className="p-3 rounded-2xl bg-red-50 text-red-600">
                                <Siren className="w-6 h-6" aria-hidden="true" />
                            </span>
                            <div>
                                <h2 className="font-black text-lg leading-tight">Emergency numbers</h2>
                                <p className="text-sm text-slate-500">Tap to call, free from any phone</p>
                            </div>
                        </div>
                        <ul className="grid flex-1 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {EMERGENCY_NUMBERS.map((c) => (
                                <li key={c.number}>
                                    <a
                                        href={`tel:${c.number}`}
                                        aria-label={`Call ${c.label}: ${c.number}`}
                                        className="group flex h-full flex-col rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:ring-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                            <Phone className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
                                            {c.label}
                                        </span>
                                        <span className="mt-1 text-2xl font-black text-blue-700">{c.number}</span>
                                        <span className="text-xs text-slate-500">{c.desc}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                )}

                {/* Main columns */}
                <div className={`grid grid-cols-2 gap-10 pb-12 md:grid-cols-4 lg:grid-cols-6 ${showEmergencyNumbers ? '' : 'pt-12'}`}>
                    <div className="col-span-2 md:col-span-4 lg:col-span-3">
                        <Link to="/" className="inline-flex items-center gap-3">
                            <span className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 shadow">
                                <Shield className="w-6 h-6 text-white" aria-hidden="true" />
                            </span>
                            <span className="text-2xl font-black">CityShield</span>
                        </Link>
                        <p className="mt-4 max-w-md leading-relaxed text-slate-600">
                            Your safety, your city, your voice. CityShield connects citizens, volunteers and city departments
                            through incident reporting, emergency SOS alerts and official safety updates.
                        </p>
                    </div>

                    <Column title="Platform">
                        {PLATFORM.map((item) => (
                            <li key={item} className="text-slate-600">
                                {item}
                            </li>
                        ))}
                    </Column>

                    <Column title="Departments">
                        {DEPARTMENTS.map((item) => (
                            <li key={item} className="text-slate-600">
                                {item}
                            </li>
                        ))}
                    </Column>

                    <Column title={user ? 'Explore' : 'Get started'}>
                        {links.map(({ to, label }) => (
                            <li key={to}>
                                <Link to={to} className={linkClass}>
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </Column>
                </div>

                <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-6 text-sm md:flex-row">
                    <p className="text-slate-500">&copy; {new Date().getFullYear()} CityShield. All rights reserved.</p>
                    <p className="flex items-center gap-2 font-medium text-blue-700">
                        <Heart className="w-4 h-4" aria-hidden="true" />
                        Made for safer cities
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
