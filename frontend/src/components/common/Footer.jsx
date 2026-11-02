import { AlertTriangle, Heart, Phone, Shield } from 'lucide-react';
import EMERGENCY_NUMBERS from '../dashboard/citizen/emergencyNumberList';

const FEATURES = [
    { title: 'Incident reporting', desc: 'Report issues with location and photos' },
    { title: 'Department routing', desc: 'Reports reach the responsible department' },
    { title: 'SOS alerts', desc: 'Share your live location with responders' },
    { title: 'Safety map', desc: 'Incidents, police stations and hospitals near you' },
];

const Footer = () => (
    <footer className="relative bg-gradient-to-br from-white via-blue-50 to-pink-50 text-gray-900 border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-xl flex-shrink-0 mx-auto sm:mx-0">
                            <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-white" aria-hidden="true" />
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-2xl sm:text-3xl font-black text-gray-900">CityShield</p>
                            <p className="text-blue-600 text-sm font-medium">Community Safety Platform</p>
                        </div>
                    </div>
                    <p className="text-gray-600 text-base leading-relaxed text-center sm:text-left max-w-prose">
                        Your Safety, Your City, Your Voice. CityShield connects citizens, volunteers and city departments
                        through incident reporting, emergency SOS alerts and official safety updates.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-4 text-center lg:text-left">Platform features</h2>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                        {FEATURES.map((f) => (
                            <li key={f.title} className="p-4 bg-white/80 rounded-xl border border-gray-200">
                                <p className="text-sm font-semibold text-gray-800 mb-1">{f.title}</p>
                                <p className="text-xs text-gray-500">{f.desc}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="mt-12">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <AlertTriangle className="w-6 h-6 mr-2 text-red-500" aria-hidden="true" />
                    Emergency numbers
                </h2>
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {EMERGENCY_NUMBERS.map((c) => (
                        <li key={c.number}>
                            <a
                                href={`tel:${c.number}`}
                                className="flex flex-col items-center p-4 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-center rounded-xl shadow-sm"
                                aria-label={`Call ${c.label}: ${c.number}`}
                            >
                                <span className="text-base font-semibold text-gray-900">{c.label}</span>
                                <span className="flex items-center mt-1 text-xs text-gray-500">
                                    <Phone className="w-3.5 h-3.5 mr-1.5 text-blue-500" aria-hidden="true" />
                                    {c.desc}
                                </span>
                                <span className="text-xl font-bold mt-2 text-blue-700">{c.number}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
                <p className="flex items-center gap-2 text-blue-600">
                    <Heart className="w-4 h-4" aria-hidden="true" />
                    Made for safer cities
                </p>
                <p className="text-gray-500">&copy; {new Date().getFullYear()} CityShield. All rights reserved.</p>
            </div>
        </div>
    </footer>
);

export default Footer;
