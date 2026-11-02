import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle, Clock, FileText, HandHeart, Siren } from 'lucide-react';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import { useAuth } from '../../context/AuthContext';
import { isVolunteer } from '../../auth/roles';
import { errorMessage } from '../../services/api';
import { listReports } from '../../services/reports';
import { getMyResponses, getVolunteerStatus } from '../../services/sos';
import { profileAPI } from '../../services/profile';
import { SectionError } from '../../pages/community/StateViews';
import DashboardHeader from './citizen/DashboardHeader';
import MetricCard from './citizen/MetricCard';
import QuickActions from './citizen/QuickActions';
import RecentReports from './citizen/RecentReports';
import VolunteerActivity from './citizen/VolunteerActivity';
import VolunteerCta from './citizen/VolunteerCta';
import EmergencyNumbers from './citizen/EmergencyNumbers';

const RECENT_LIMIT = 3;

/** Home page for citizens and volunteers. Every number shown is the user's own stored data. */
const Dashboard = () => {
    const { user } = useAuth();
    const userId = user?.id;
    const volunteer = isVolunteer(user);

    const [stats, setStats] = useState(null);
    const [statsError, setStatsError] = useState(null);

    const [recent, setRecent] = useState({ items: [], loading: true, error: null });
    const [volunteerData, setVolunteerData] = useState({ status: null, responses: [], loading: true, error: null });
    const [applicationStatus, setApplicationStatus] = useState(undefined);

    const loadStats = useCallback(async () => {
        if (!userId) return;
        try {
            setStats(await profileAPI.getStats(userId));
            setStatsError(null);
        } catch (err) {
            setStatsError(errorMessage(err, 'Could not load your statistics.'));
        }
    }, [userId]);

    const loadRecent = useCallback(async () => {
        setRecent((r) => ({ ...r, loading: true, error: null }));
        try {
            const data = await listReports({ mine: true, limit: RECENT_LIMIT });
            setRecent({ items: data?.reports || [], loading: false, error: null });
        } catch (err) {
            setRecent({ items: [], loading: false, error: errorMessage(err, 'Could not load your reports.') });
        }
    }, []);

    const loadVolunteer = useCallback(async () => {
        if (!volunteer) return;
        setVolunteerData((v) => ({ ...v, loading: true, error: null }));
        try {
            const [status, responses] = await Promise.all([getVolunteerStatus(), getMyResponses()]);
            setVolunteerData({ status, responses: responses?.results || [], loading: false, error: null });
        } catch (err) {
            setVolunteerData((v) => ({
                ...v,
                loading: false,
                error: errorMessage(err, 'Could not load your volunteer activity.'),
            }));
        }
    }, [volunteer]);

    const loadApplicationStatus = useCallback(async () => {
        if (volunteer) return;
        try {
            const res = await profileAPI.getVolunteerApplicationStatus();
            setApplicationStatus(res?.status ?? null);
        } catch {
            setApplicationStatus(undefined); // hide the call-to-action rather than guess
        }
    }, [volunteer]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);
    useEffect(() => {
        loadRecent();
    }, [loadRecent]);
    useEffect(() => {
        loadVolunteer();
    }, [loadVolunteer]);
    useEffect(() => {
        loadApplicationStatus();
    }, [loadApplicationStatus]);

    const loaded = !!stats;
    const metrics = [
        {
            title: 'Reports submitted',
            value: stats?.reports_submitted ?? 0,
            subtitle: 'All time',
            icon: FileText,
            color: 'from-blue-500 to-blue-600',
        },
        {
            title: 'Resolved',
            value: stats?.reports_resolved ?? 0,
            subtitle: 'Your reports marked resolved',
            icon: CheckCircle,
            color: 'from-green-500 to-green-600',
        },
        {
            title: 'In progress',
            value: stats?.reports_in_progress ?? 0,
            subtitle: 'Pending or under investigation',
            icon: Clock,
            color: 'from-amber-500 to-orange-600',
        },
        volunteer
            ? {
                  title: 'SOS responses',
                  value: stats?.sos_responses ?? 0,
                  subtitle: 'Emergencies you responded to',
                  icon: HandHeart,
                  color: 'from-purple-500 to-purple-600',
              }
            : {
                  title: 'SOS alerts raised',
                  value: stats?.sos_alerts_raised ?? 0,
                  subtitle: 'Times you asked for help',
                  icon: Siren,
                  color: 'from-red-500 to-pink-600',
              },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <DashboardHeader user={user} />

                <section aria-labelledby="stats-title" className="mb-12 sm:mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <BarChart3 className="w-6 h-6 text-white" aria-hidden="true" />
                        </div>
                        <div>
                            <h2 id="stats-title" className="text-2xl sm:text-3xl font-black text-gray-900">
                                Your contributions
                            </h2>
                            {stats?.join_date && <p className="text-sm text-gray-600">Member since {stats.join_date}</p>}
                        </div>
                    </div>
                    {statsError ? (
                        <SectionError message={statsError} onRetry={loadStats} />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                            {metrics.map((m) => (
                                <MetricCard key={m.title} {...m} loaded={loaded} />
                            ))}
                        </div>
                    )}
                </section>

                <QuickActions />

                <RecentReports reports={recent.items} loading={recent.loading} error={recent.error} onRetry={loadRecent} />

                {volunteer ? (
                    <VolunteerActivity
                        status={volunteerData.status}
                        responses={volunteerData.responses}
                        loading={volunteerData.loading}
                        error={volunteerData.error}
                        onRetry={loadVolunteer}
                    />
                ) : (
                    applicationStatus !== undefined && <VolunteerCta applicationStatus={applicationStatus} />
                )}

                <EmergencyNumbers />
            </main>

            <Footer />
        </div>
    );
};

export default Dashboard;
