import { useCallback, useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { PageHeader, PageShell } from '../common/PageShell';
import { useAuth } from '../../context/AuthContext';
import { isVolunteer } from '../../auth/roles';
import { errorMessage } from '../../services/api';
import { listReports } from '../../services/reports';
import { getMyResponses, getSOSByRole, getVolunteerStatus } from '../../services/sos';
import { profileAPI } from '../../services/profile';
import useNearbyHelp from './home/useNearbyHelp';
import NearestHelp from './home/NearestHelp';
import ReportTracker from './home/ReportTracker';
import VolunteerDuty from './home/VolunteerDuty';
import VolunteerInvite from './home/VolunteerInvite';
import HelpRail from './home/HelpRail';
import { FadeUp } from './home/ui';

const RECENT_LIMIT = 4;
const VOLUNTEER_RADIUS_M = 10_000;

const greeting = () => {
    const h = new Date().getHours();
    if (h < 5) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

/** Home for citizens and volunteers. Every value shown comes from stored data or the device location. */
const Dashboard = () => {
    const { user } = useAuth();
    const userId = user?.id;
    const volunteer = isVolunteer(user);
    const firstName = (user?.name || '').trim().split(/\s+/)[0];
    const help = useNearbyHelp();
    const lat = help.location?.latitude;
    const lng = help.location?.longitude;

    const [stats, setStats] = useState(null);
    const [recent, setRecent] = useState({ items: [], loading: true, error: null });
    const [duty, setDuty] = useState({ status: null, responses: [], loading: true, error: null });
    const [nearbySos, setNearbySos] = useState(null);
    const [applicationStatus, setApplicationStatus] = useState(undefined);

    const loadReports = useCallback(async () => {
        setRecent((r) => ({ ...r, loading: true, error: null }));
        try {
            const [data, s] = await Promise.all([
                listReports({ mine: true, limit: RECENT_LIMIT }),
                userId ? profileAPI.getStats(userId) : null,
            ]);
            setRecent({ items: data?.reports || [], loading: false, error: null });
            setStats(s);
        } catch (err) {
            setRecent({ items: [], loading: false, error: errorMessage(err, 'Could not load your reports.') });
        }
    }, [userId]);

    const loadDuty = useCallback(async () => {
        if (!volunteer) return;
        setDuty((d) => ({ ...d, loading: true, error: null }));
        try {
            const [status, responses] = await Promise.all([getVolunteerStatus(), getMyResponses()]);
            setDuty({ status, responses: responses?.results || [], loading: false, error: null });
        } catch (err) {
            setDuty((d) => ({ ...d, loading: false, error: errorMessage(err, 'Could not load your volunteer status.') }));
        }
    }, [volunteer]);

    useEffect(() => { loadReports(); }, [loadReports]);
    useEffect(() => { loadDuty(); }, [loadDuty]);

    useEffect(() => {
        if (volunteer) return;
        profileAPI.getVolunteerApplicationStatus()
            .then((res) => setApplicationStatus(res?.status ?? null))
            .catch(() => setApplicationStatus(undefined)); // hide the invite rather than guess
    }, [volunteer]);

    // Volunteers: how many active SOS alerts are near them right now.
    useEffect(() => {
        if (!volunteer || !Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
        let cancelled = false;
        getSOSByRole({ latitude: lat, longitude: lng, radius: VOLUNTEER_RADIUS_M })
            .then((data) => { if (!cancelled) setNearbySos((data?.alerts || []).filter((a) => a.is_active).length); })
            .catch(() => { if (!cancelled) setNearbySos(null); });
        return () => { cancelled = true; };
    }, [volunteer, lat, lng]);

    return (
        <PageShell>
                <PageHeader
                    id="home-title"
                    title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
                    subtitle={(
                        <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                            {help.place
                                ? `You're near ${help.place}`
                                : help.geoLoading
                                    ? 'Finding where you are…'
                                    : 'Nearest help, based on your location'}
                        </p>
                    )}
                />
                {/* DOM order = phone order (nearest help, emergency help, then the rest);
                    on desktop the help rail spans both rows on the right. */}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[auto_1fr] lg:gap-5">
                    <FadeUp className="min-w-0 lg:col-start-1 lg:row-start-1">
                        <NearestHelp help={help} />
                    </FadeUp>
                    <FadeUp delay={0.1} className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
                        <HelpRail />
                    </FadeUp>
                    <FadeUp delay={0.15} className="space-y-4 lg:space-y-6 min-w-0 lg:col-start-1 lg:row-start-2">
                        {volunteer && (
                            <VolunteerDuty
                                status={duty.status}
                                responses={duty.responses}
                                nearby={nearbySos}
                                loading={duty.loading}
                                error={duty.error}
                                onRetry={loadDuty}
                                onStatusChange={(status) => setDuty((d) => ({ ...d, status }))}
                                location={help.location}
                            />
                        )}
                        <ReportTracker
                            reports={recent.items}
                            stats={stats}
                            loading={recent.loading}
                            error={recent.error}
                            onRetry={loadReports}
                        />
                        {!volunteer && applicationStatus !== undefined && <VolunteerInvite applicationStatus={applicationStatus} />}
                    </FadeUp>
                </div>
        </PageShell>
    );
};

export default Dashboard;
