import { Link } from 'react-router-dom';
import { Bell, Building2, FileText, HandHeart, Map as MapIcon, Siren } from 'lucide-react';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';

// Describes what the product actually does - no invented numbers, quotes or claims.
const FEATURES = [
    {
        icon: FileText,
        title: 'Report incidents',
        description:
            'Report crime, harassment, fire hazards, medical issues or broken infrastructure with a location and photos. Reports can be anonymous.',
        color: 'from-blue-600 to-indigo-600',
    },
    {
        icon: Building2,
        title: 'Routed to the right department',
        description:
            'Each report goes to the department responsible - police, municipal corporation, fire & rescue or medical - and you are notified when its status changes.',
        color: 'from-purple-600 to-fuchsia-600',
    },
    {
        icon: Siren,
        title: 'One-tap SOS',
        description:
            'The SOS button shares your live location with responders. It works even if you are not signed in.',
        color: 'from-red-600 to-rose-600',
    },
    {
        icon: MapIcon,
        title: 'Safety map',
        description: 'See reported incidents around you, plus nearby police stations and hospitals with directions.',
        color: 'from-emerald-600 to-teal-600',
    },
    {
        icon: HandHeart,
        title: 'Community volunteers',
        description:
            'Citizens can apply to volunteer. Once approved by the police, volunteers are alerted to nearby emergencies and can respond.',
        color: 'from-amber-500 to-orange-600',
    },
    {
        icon: Bell,
        title: 'Official alerts',
        description: 'Read alerts published by city departments, such as road closures or safety advisories.',
        color: 'from-cyan-600 to-sky-600',
    },
];

const STEPS = [
    { title: 'Create a free account', text: 'Sign up with your email address or Google account.' },
    { title: 'Report what you see', text: 'Describe the issue, pin it on the map and add photos if you have them.' },
    { title: 'Track the response', text: 'Follow the status of your reports and get notified about updates.' },
];

const LandingPage = () => (
    <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 overflow-hidden">
            <section className="relative overflow-hidden pt-20 pb-28">
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-20 float-animation" />
                    <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full opacity-30 float-animation [animation-delay:1s]" />
                    <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full opacity-20 float-animation [animation-delay:2s]" />
                </div>

                <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-5xl">
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-8 leading-tight fade-in">
                        <span className="block">Your Safety,</span>
                        <span className="block">Your City,</span>
                        <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent gradient-shift">
                            Your Voice
                        </span>
                    </h1>
                    <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
                        Report issues, get emergency help, and work with your city&apos;s departments and volunteers to
                        build a safer community.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/register"
                            className="px-8 py-4 rounded-2xl text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 shadow-lg"
                        >
                            Create an account
                        </Link>
                        <Link
                            to="/login"
                            className="px-8 py-4 rounded-2xl text-lg font-bold text-blue-700 bg-white border-2 border-blue-600 hover:bg-blue-50"
                        >
                            Sign in
                        </Link>
                    </div>
                </div>
            </section>

            <section aria-labelledby="features-title" className="py-20 bg-white/90">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 id="features-title" className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
                            What you can do with
                            <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent"> CityShield</span>
                        </h2>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map(({ icon: Icon, title, description, color }) => (
                            <li key={title} className={`rounded-3xl p-7 bg-gradient-to-br ${color} text-white shadow-xl`}>
                                <Icon className="w-12 h-12 mb-5" aria-hidden="true" />
                                <h3 className="text-2xl font-bold mb-3">{title}</h3>
                                <p className="text-base opacity-95 leading-relaxed">{description}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section aria-labelledby="how-title" className="py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                    <h2 id="how-title" className="text-3xl sm:text-4xl font-black text-gray-900 mb-10 text-center">
                        How it works
                    </h2>
                    <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {STEPS.map((step, i) => (
                            <li key={step.title} className="bg-white rounded-2xl p-6 shadow border border-gray-100">
                                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold mb-4" aria-hidden="true">
                                    {i + 1}
                                </span>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                                <p className="text-gray-600">{step.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
                    <h2 className="text-4xl sm:text-5xl font-black mb-6">Make your neighbourhood safer</h2>
                    <p className="text-xl mb-10 text-blue-100">
                        Registration is free. In an emergency you can use the SOS button right away, without an account.
                    </p>
                    <Link
                        to="/register"
                        className="inline-block px-10 py-5 rounded-2xl text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 shadow-2xl"
                    >
                        Join CityShield
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    </>
);

export default LandingPage;
