import { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { roleLabel } from '../../../auth/roles';
import { initialsOf } from '../../../pages/community/format';

const greetingFor = (date) => {
    const hour = date.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

const DashboardHeader = ({ user }) => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const displayName = user?.name || user?.email?.split('@')[0] || '';

    return (
        <header className="mb-8 sm:mb-12">
            <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-gray-100 relative overflow-hidden">
                <div
                    className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-full translate-x-32 sm:translate-x-48 -translate-y-32 sm:-translate-y-48 opacity-40 pointer-events-none"
                    aria-hidden="true"
                />
                <div className="relative flex flex-col sm:flex-row items-center sm:items-center gap-6">
                    <div
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-xl sm:text-3xl shadow-xl border-4 border-white flex-shrink-0"
                        aria-hidden="true"
                    >
                        {initialsOf(user?.name, user?.email)}
                    </div>
                    <div className="space-y-3 text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900">
                            {greetingFor(now)}
                            {displayName ? `, ${displayName}` : ''}!
                        </h1>
                        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-gray-600 text-sm sm:text-base">
                            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">{roleLabel(user?.role)}</span>
                            <span className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                                <Calendar className="w-4 h-4" aria-hidden="true" />
                                {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                                <Clock className="w-4 h-4" aria-hidden="true" />
                                {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;
