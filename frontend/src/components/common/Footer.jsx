import React from 'react';
import {
    Shield,
    MapPin,
    AlertTriangle,
    Heart,
    Phone,
    Mail,
    Clock,
    Users,
    Award,
    Zap
} from 'lucide-react';

const Footer = () => (
    <footer className="relative bg-gradient-to-br from-white via-blue-50 to-pink-50 text-gray-900 border-t border-gray-200 overflow-hidden">
        {/* Pastel blobs background */}
        <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute top-10 left-10 w-28 h-28 bg-blue-200/30 rounded-full blur-2xl" />
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-teal-100/30 rounded-full blur-2xl" />
            <div className="absolute top-1/3 left-1/2 w-24 h-24 bg-purple-100/30 rounded-full blur-2xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 py-12 sm:py-16">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    {/* Brand & Newsletter Section */}
                    <div className="lg:col-span-2">
                        {/* Brand Section */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                            {/* Shield logo with card gradient */}
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-xl flex-shrink-0 mx-auto sm:mx-0">
                                <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <div className="text-center sm:text-left">
                                {/* CityShield Brand with gradient text */}
                                <h3 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent select-none">
                                    CityShield
                                </h3>
                                <p className="text-blue-500 text-sm font-medium">Community Safety Platform</p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 text-base leading-relaxed mb-6 sm:mb-8 text-center sm:text-left max-w-none lg:max-w-prose">
                            Your Safety, Your City, Your Voice. Making cities safer through community-driven reporting, real-time emergency response, and collaborative initiatives. Join thousands creating safer communities together.
                        </p>

                        {/* Newsletter Signup */}
                        <div className="bg-gradient-to-r from-white/80 to-white/50 ring-1 ring-blue-100/20 rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm">
                            <h5 className="text-lg font-semibold mb-2 flex items-center justify-center sm:justify-start text-gray-900">
                                <Mail className="w-5 h-5 mr-2 text-blue-400" />
                                Safety Alerts & Updates
                            </h5>
                            <p className="text-gray-500 text-sm mb-4 text-center sm:text-left">
                                Get notified about safety incidents and community updates in your area.
                            </p>
                            <form
                                onSubmit={e => e.preventDefault()}
                                className="flex flex-col sm:flex-row gap-3"
                                aria-label="Signup for safety alerts newsletter"
                            >
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-0"
                                    required
                                />
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:via-blue-700 hover:to-purple-600 rounded-xl text-sm font-semibold text-white transition-all duration-300 transform hover:scale-105 shadow whitespace-nowrap"
                                >
                                    Subscribe
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Platform Features */}
                    <div className="space-y-6 sm:space-y-7">
                        <div className="text-xl font-semibold mb-4 flex items-center justify-center lg:justify-start">
                            <Zap className="w-6 h-6 mr-3 text-yellow-400" />
                            Platform Features
                        </div>

                        {/* Features Grid - Responsive Layout */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
                            {[
                                { title: 'Real-time Reporting', desc: 'Instant incident reporting' },
                                { title: 'Community Alerts', desc: 'Stay informed about your area' },
                                { title: 'Emergency Response', desc: 'Quick emergency assistance' },
                                { title: 'Safety Analytics', desc: 'Data-driven safety insights' }
                            ].map((feature, index) => (
                                <div
                                    key={index}
                                    className="p-4 bg-gradient-to-r from-white/80 to-white/70 rounded-xl border border-gray-200 hover:shadow-md group select-none transition-all duration-300 hover:scale-[1.02]"
                                >
                                    <h5 className="text-sm font-semibold text-gray-800 mb-1">{feature.title}</h5>
                                    <p className="text-xs text-gray-500">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>


                {/* Emergency Contacts */}
                <div className="transition-all duration-300 mt-14">
                    <h4 className="text-xl font-semibold mb-6 flex items-center">
                        <AlertTriangle className="w-6 h-6 mr-2 text-red-400" />
                        Emergency Contacts
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[
                            { label: 'Police', number: '100', desc: 'Crime & Safety' },
                            { label: 'Fire', number: '101', desc: 'Fire Emergency' },
                            { label: 'Medical', number: '102', desc: 'Medical Emergency' },
                            { label: 'Women Helpline', number: '1091', desc: 'Women Safety' },
                        ].map((contact, idx) => (
                            <a
                                key={idx}
                                href={`tel:${contact.number}`}
                                className="flex flex-col items-center justify-between p-4 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 text-center rounded-xl shadow group"
                                aria-label={`Call ${contact.label} emergency number ${contact.number}`}
                                tabIndex={0}
                            >
                                <span className="text-base font-semibold text-gray-900">{contact.label}</span>
                                <div className="flex items-center mt-2">
                                    <Phone className="w-4 h-4 mr-2 text-blue-400" aria-hidden="true" />
                                    <span className="text-xs text-gray-500">{contact.desc}</span>
                                </div>
                                <span className="text-xl font-bold mt-2 text-blue-700">{contact.number}</span>
                            </a>
                        ))}
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl text-sm text-blue-800 border border-blue-100 select-none text-center">
                        For mobile users: tap to call emergency numbers directly.
                    </div>
                </div>

                {/* Footer Base */}
                <div className="border-t border-gray-200 mt-12 pt-8 select-none">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <div className="flex items-center space-x-2 text-blue-400">
                            <Heart className="w-4 h-4" />
                            <span className="text-sm">Made for safer cities</span>
                        </div>
                        <p className="text-gray-400 text-sm">&copy; 2025 CityShield. All rights reserved.</p>
                        <div className="flex items-center space-x-6 text-sm text-gray-400">
                            <span className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>24/7 Support</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
