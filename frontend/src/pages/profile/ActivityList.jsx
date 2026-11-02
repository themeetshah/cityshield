import { Link } from 'react-router-dom';
import { Activity, ChevronRight, FileText, Siren, UserPlus } from 'lucide-react';
import { formatDateTime, humanize, timeAgo } from '../community/format';
import { SectionError } from '../community/StateViews';
import { Card, SectionHeading } from './ui';

const TYPE_ICONS = { report: FileText, sos: Siren, account: UserPlus };

const STATUS_CLASSES = {
    pending: 'bg-amber-100 text-amber-800',
    investigating: 'bg-blue-100 text-blue-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-emerald-100 text-emerald-800',
    dismissed: 'bg-gray-200 text-gray-700',
    active: 'bg-red-100 text-red-700',
};

const ActivityRow = ({ activity }) => {
    const Icon = TYPE_ICONS[activity.type] || Activity;
    const body = (
        <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-gray-600" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 break-words">{activity.action}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                    <time dateTime={activity.created_at} title={formatDateTime(activity.created_at)}>
                        {timeAgo(activity.created_at)}
                    </time>
                    {activity.report_type && <span>· {activity.report_type}</span>}
                    {activity.status && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[activity.status] || 'bg-gray-100 text-gray-700'}`}>
                            {humanize(activity.status)}
                        </span>
                    )}
                </div>
            </div>
            {activity.link && <ChevronRight className="w-5 h-5 text-gray-400 self-center" aria-hidden="true" />}
        </div>
    );

    const className = 'block p-4 rounded-2xl border-2 border-gray-100';
    return activity.link ? (
        <Link to={activity.link} className={`${className} hover:border-blue-200 hover:bg-blue-50/40 transition-colors`}>
            {body}
        </Link>
    ) : (
        <div className={className}>{body}</div>
    );
};

const ActivityList = ({ activities, error, onRetry }) => (
    <Card className="p-4 sm:p-6 lg:p-8">
        <SectionHeading
            icon={Activity}
            gradient="from-emerald-500 to-teal-600"
            title="Recent activity"
            description="Reports and SOS alerts you have raised."
        />
        {error ? (
            <SectionError message={error} onRetry={onRetry} />
        ) : activities.length === 0 ? (
            <div className="text-center py-12">
                <p className="text-lg font-bold text-gray-900 mb-2">No activity yet</p>
                <p className="text-gray-600 mb-6">Reports you submit will appear here.</p>
                <Link to="/" className="inline-flex px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
                    Go to home
                </Link>
            </div>
        ) : (
            <ul className="space-y-3">
                {activities.map((a) => (
                    <li key={a.id}>
                        <ActivityRow activity={a} />
                    </li>
                ))}
            </ul>
        )}
    </Card>
);

export default ActivityList;
