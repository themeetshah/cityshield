import { Building2, Clock, Share2 } from 'lucide-react';
import { formatDateTime, humanize, timeAgo } from './format';
import shareItem from './shareItem';

const OfficialAlertCard = ({ alert }) => {
    const source = [alert.department_label, alert.station_name].filter(Boolean).join(' · ');

    return (
        <article className="flex flex-col bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <header className="p-5 bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
                <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-white/90">
                        <Building2 className="w-4 h-4" aria-hidden="true" />
                        Official alert
                    </span>
                    {(alert.alert_type_display || alert.alert_type) && (
                        <span className="px-2 py-0.5 rounded-full bg-white/20 font-semibold">
                            {alert.alert_type_display || humanize(alert.alert_type)}
                        </span>
                    )}
                </div>
                <h3 className="font-bold text-lg leading-tight break-words">{alert.title}</h3>
            </header>

            <div className="flex flex-col flex-1 p-5">
                {alert.message && (
                    <p className="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-line break-words">{alert.message}</p>
                )}
                <div className="mt-auto space-y-1 text-sm text-gray-600 mb-4">
                    {source && <p className="font-medium text-gray-800">{source}</p>}
                    {alert.issued_by_name && <p>Issued by {alert.issued_by_name}</p>}
                    <p className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        <time dateTime={alert.created_at} title={formatDateTime(alert.created_at)}>
                            {timeAgo(alert.created_at)}
                        </time>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        shareItem({
                            title: alert.title,
                            text: `${alert.title}${source ? ` (${source})` : ''}: ${alert.message || ''}`,
                        })
                    }
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-800 rounded-xl text-sm font-semibold hover:bg-gray-200"
                >
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                    Share
                </button>
            </div>
        </article>
    );
};

export default OfficialAlertCard;
