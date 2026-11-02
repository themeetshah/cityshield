import { Link } from 'react-router-dom';
import { ArrowRight, FilePlus2, List, Map as MapIcon, Users } from 'lucide-react';

const ACTIONS = [
    {
        icon: FilePlus2,
        title: 'Report an incident',
        description: 'Report a safety concern, crime, hazard or infrastructure problem.',
        color: 'from-red-500 to-red-600',
        to: '/report',
    },
    {
        icon: List,
        title: 'Browse reports',
        description: 'See reports from your community and follow their status.',
        color: 'from-blue-500 to-blue-600',
        to: '/reports',
    },
    {
        icon: MapIcon,
        title: 'Safety map',
        description: 'View reported incidents, nearby police stations and hospitals.',
        color: 'from-green-500 to-green-600',
        to: '/safety-map',
    },
    {
        icon: Users,
        title: 'Community',
        description: 'Nearby reports, official alerts and emergencies you can help with.',
        color: 'from-teal-500 to-teal-600',
        to: '/community',
    },
];

const QuickActions = () => (
    <section aria-labelledby="quick-actions-title" className="mb-12 sm:mb-16">
        <h2 id="quick-actions-title" className="text-2xl sm:text-3xl font-black text-gray-900 mb-6 text-center">
            Take action in your community
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {ACTIONS.map(({ icon: Icon, title, description, color, to }) => (
                <Link
                    key={to}
                    to={to}
                    className={`group flex flex-col p-6 rounded-3xl bg-gradient-to-br ${color} text-white shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300`}
                >
                    <div className="flex items-start justify-between mb-4">
                        <Icon className="w-9 h-9" aria-hidden="true" />
                        <ArrowRight className="w-5 h-5 opacity-80 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </div>
                    <h3 className="font-bold text-lg sm:text-xl mb-2">{title}</h3>
                    <p className="text-sm opacity-90 leading-relaxed">{description}</p>
                </Link>
            ))}
        </div>
    </section>
);

export default QuickActions;
