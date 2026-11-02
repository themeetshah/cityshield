import { Calendar, CheckCircle, Clock, FileText, HandHeart, Mail, MapPin, Shield, Siren } from 'lucide-react';
import { departmentLabel, isVolunteer } from '../../auth/roles';
import { initialsOf } from '../community/format';
import { Card } from './ui';

const StatTile = ({ icon: Icon, label, value, color }) => (
    <div className={`p-3 sm:p-4 rounded-xl border-2 bg-gradient-to-br ${color}`}>
        <div className="flex items-center gap-2 mb-1">
            <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold opacity-80">{label}</span>
        </div>
        <div className="text-xl sm:text-2xl font-black">{value ?? '—'}</div>
    </div>
);

const ProfileHeader = ({ user, profile, stats }) => {
    const volunteer = isVolunteer(user);
    const dept = departmentLabel(user?.department);

    return (
        <Card className="mb-6 p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
                <div className="flex flex-col items-center gap-3 flex-shrink-0">
                    <div
                        className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg"
                        aria-hidden="true"
                    >
                        {initialsOf(profile?.name, profile?.email)}
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold border-2 bg-blue-50 text-blue-700 border-blue-200">
                        <Shield className="w-4 h-4" aria-hidden="true" />
                        {user?.role_label || user?.role}
                    </span>
                </div>

                <div className="flex-1 w-full min-w-0 text-center lg:text-left">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 break-words mb-3">
                        {profile?.name || 'Your profile'}
                    </h1>
                    <ul className="flex flex-wrap justify-center lg:justify-start gap-2 text-gray-600 text-xs sm:text-sm mb-5">
                        <li className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg min-w-0">
                            <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" aria-hidden="true" />
                            <span className="truncate">{profile?.email}</span>
                        </li>
                        {profile?.location && (
                            <li className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" aria-hidden="true" />
                                {profile.location}
                            </li>
                        )}
                        {stats?.join_date && (
                            <li className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" aria-hidden="true" />
                                Joined {stats.join_date}
                            </li>
                        )}
                        {dept && (
                            <li className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                <Shield className="w-4 h-4 text-indigo-500 flex-shrink-0" aria-hidden="true" />
                                {dept}
                                {user?.police_station_name ? ` · ${user.police_station_name}` : ''}
                            </li>
                        )}
                    </ul>

                    {stats && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatTile icon={FileText} label="Reports" value={stats.reports_submitted} color="from-blue-50 to-blue-100 text-blue-700 border-blue-200" />
                            <StatTile icon={CheckCircle} label="Resolved" value={stats.reports_resolved} color="from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200" />
                            <StatTile icon={Clock} label="In progress" value={stats.reports_in_progress} color="from-orange-50 to-orange-100 text-orange-700 border-orange-200" />
                            {volunteer ? (
                                <StatTile icon={HandHeart} label="SOS responses" value={stats.sos_responses} color="from-purple-50 to-purple-100 text-purple-700 border-purple-200" />
                            ) : (
                                <StatTile icon={Siren} label="SOS raised" value={stats.sos_alerts_raised} color="from-red-50 to-red-100 text-red-700 border-red-200" />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default ProfileHeader;
