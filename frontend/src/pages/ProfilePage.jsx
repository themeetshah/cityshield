import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Activity, Bell, Lock, User } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import FullPageLoader from '../components/common/FullPageLoader';
import { useAuth } from '../context/AuthContext';
import { CITIZEN, hasRole } from '../auth/roles';
import { errorMessage } from '../services/api';
import { profileAPI } from '../services/profile';
import { SectionError } from './community/StateViews';
import ProfileHeader from './profile/ProfileHeader';
import ProfileForm from './profile/ProfileForm';
import ActivityList from './profile/ActivityList';
import NotificationsPanel from './profile/NotificationsPanel';
import SecuritySettings from './profile/SecuritySettings';
import EmergencyContacts from './profile/EmergencyContacts';
import VolunteerApplication from './profile/VolunteerApplication';

const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
];

const ProfilePage = () => {
    const { user, refreshUser } = useAuth();
    const userId = user?.id;

    const { hash } = useLocation();
    const hashTab = TABS.some((t) => t.id === hash.slice(1)) ? hash.slice(1) : null;
    const [activeTab, setActiveTab] = useState(hashTab || 'profile');
    // Deep links such as the navbar bell (/profile#notifications) select a tab.
    useEffect(() => {
        if (hashTab) setActiveTab(hashTab);
    }, [hashTab]);
    const [profile, setProfile] = useState(null);
    const [profileError, setProfileError] = useState(null);
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState(null);
    const [activities, setActivities] = useState([]);
    const [activitiesError, setActivitiesError] = useState(null);
    const [notifications, setNotifications] = useState({ results: [], unread_count: 0 });
    const [notificationsError, setNotificationsError] = useState(null);
    const [notificationsBusy, setNotificationsBusy] = useState(false);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            setProfile(await profileAPI.getProfile());
            setProfileError(null);
        } catch (err) {
            setProfileError(errorMessage(err, 'Could not load your profile.'));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadStats = useCallback(async () => {
        if (!userId) return;
        try {
            setStats(await profileAPI.getStats(userId));
        } catch {
            setStats(null); // the header simply hides the counters
        }
    }, [userId]);

    const loadActivities = useCallback(async () => {
        if (!userId) return;
        try {
            const data = await profileAPI.getActivities(userId);
            setActivities(Array.isArray(data) ? data : []);
            setActivitiesError(null);
        } catch (err) {
            setActivitiesError(errorMessage(err, 'Could not load your activity.'));
        }
    }, [userId]);

    const loadNotifications = useCallback(async () => {
        try {
            const data = await profileAPI.getNotifications();
            setNotifications({ results: data?.results || [], unread_count: data?.unread_count || 0 });
            setNotificationsError(null);
        } catch (err) {
            setNotificationsError(errorMessage(err, 'Could not load your notifications.'));
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);
    useEffect(() => {
        loadStats();
        loadActivities();
    }, [loadStats, loadActivities]);
    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const syncUser = useCallback(async () => {
        try {
            await refreshUser();
        } catch {
            // The page already shows the saved data; the navbar catches up on next load.
        }
    }, [refreshUser]);

    const handleProfileSaved = async (updated) => {
        setProfile((p) => ({ ...p, ...updated }));
        await syncUser();
    };

    const handlePasswordSet = async () => {
        setProfile((p) => ({ ...p, password_set: true }));
        await syncUser();
    };

    const markRead = async (id) => {
        setNotificationsBusy(true);
        try {
            await profileAPI.markNotificationRead(id);
            setNotifications((n) => ({
                results: n.results.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
                unread_count: Math.max(0, n.unread_count - (n.results.some((i) => i.id === id && !i.is_read) ? 1 : 0)),
            }));
        } catch (err) {
            toast.error(errorMessage(err, 'Could not update the notification.'));
        } finally {
            setNotificationsBusy(false);
        }
    };

    const markAllRead = async () => {
        setNotificationsBusy(true);
        try {
            await profileAPI.markAllNotificationsRead();
            setNotifications((n) => ({ results: n.results.map((i) => ({ ...i, is_read: true })), unread_count: 0 }));
        } catch (err) {
            toast.error(errorMessage(err, 'Could not update notifications.'));
        } finally {
            setNotificationsBusy(false);
        }
    };

    if (loading && !profile) {
        return (
            <>
                <Navbar />
                <FullPageLoader message="Loading your profile…" />
            </>
        );
    }

    if (!profile) {
        return (
            <>
                <Navbar />
                <main className="min-h-screen flex items-center justify-center p-4">
                    <div className="max-w-lg w-full">
                        <SectionError message={profileError || 'Could not load your profile.'} onRetry={loadProfile} />
                    </div>
                </main>
            </>
        );
    }

    const isCitizen = hasRole(user, CITIZEN);

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-pink-50 py-6 sm:py-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    <ProfileHeader user={user} profile={profile} stats={stats} />

                    <div role="tablist" aria-label="Profile sections" className="flex overflow-x-auto gap-2 mb-6 p-2 bg-white rounded-2xl shadow border border-gray-100">
                        {TABS.map(({ id, label, icon: Icon }) => {
                            const selected = activeTab === id;
                            const badge = id === 'notifications' && notifications.unread_count > 0 ? notifications.unread_count : null;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    id={`profile-tab-${id}`}
                                    aria-selected={selected}
                                    aria-controls={`profile-panel-${id}`}
                                    onClick={() => setActiveTab(id)}
                                    className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                                        selected ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" aria-hidden="true" />
                                    {label}
                                    {badge !== null && (
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-500 text-white" aria-label={`${badge} unread`}>
                                            {badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                        <div
                            role="tabpanel"
                            id={`profile-panel-${activeTab}`}
                            aria-labelledby={`profile-tab-${activeTab}`}
                            className="xl:col-span-3"
                        >
                            {activeTab === 'profile' && <ProfileForm profile={profile} onSaved={handleProfileSaved} />}
                            {activeTab === 'activity' && (
                                <ActivityList activities={activities} error={activitiesError} onRetry={loadActivities} />
                            )}
                            {activeTab === 'notifications' && (
                                <NotificationsPanel
                                    notifications={notifications.results}
                                    unreadCount={notifications.unread_count}
                                    error={notificationsError}
                                    busy={notificationsBusy}
                                    onRetry={loadNotifications}
                                    onMarkRead={markRead}
                                    onMarkAllRead={markAllRead}
                                />
                            )}
                            {activeTab === 'security' && (
                                <SecuritySettings
                                    userId={userId}
                                    hasPassword={profile.password_set !== false}
                                    onPasswordSet={handlePasswordSet}
                                />
                            )}
                        </div>

                        <aside className="xl:col-span-1 space-y-6" aria-label="Safety settings">
                            {isCitizen && <VolunteerApplication defaultPhone={profile.phone} onApproved={syncUser} />}
                            <EmergencyContacts userId={userId} />
                        </aside>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
};

export default ProfilePage;
