import { Clock, Megaphone, ShieldAlert, Share2, Siren, TrafficCone } from 'lucide-react';
import { IconChip } from '../../components/dashboard/home/ui';
import { formatDateTime, humanize, timeAgo } from './format';
import shareItem from './shareItem';
import { cardAction, cardShell } from './cardStyles';

const TYPES = {
    safety: { icon: ShieldAlert, tone: 'bg-amber-50 text-amber-600 ring-amber-100' },
    traffic: { icon: TrafficCone, tone: 'bg-blue-50 text-blue-600 ring-blue-100' },
    emergency: { icon: Siren, tone: 'bg-red-50 text-red-600 ring-red-100' },
    community: { icon: Megaphone, tone: 'bg-violet-50 text-violet-600 ring-violet-100' },
};

const OfficialAlertCard = ({ alert }) => {
    const source = [alert.department_label, alert.station_name].filter(Boolean).join(' · ');
    const type = TYPES[alert.alert_type] || TYPES.community;

    return (
        <article className={cardShell}>
            <div className="flex items-center gap-3">
                <IconChip icon={type.icon} tone={type.tone} />
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700">
                        {alert.alert_type_display || humanize(alert.alert_type) || 'Official alert'}
                    </p>
                    {source && <p className="truncate text-xs font-semibold text-slate-500">{source}</p>}
                </div>
            </div>

            <h3 className="mt-4 text-lg font-bold leading-snug text-slate-900 break-words">{alert.title}</h3>
            {alert.message && (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600 break-words">{alert.message}</p>
            )}

            <div className="min-h-5 flex-1" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
                <p className="flex min-w-0 items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <time dateTime={alert.created_at} title={formatDateTime(alert.created_at)}>{timeAgo(alert.created_at)}</time>
                    {alert.issued_by_name && <span className="truncate">· {alert.issued_by_name}</span>}
                </p>
                <button
                    type="button"
                    onClick={() => shareItem({
                        title: alert.title,
                        text: `${alert.title}${source ? ` (${source})` : ''}: ${alert.message || ''}`,
                    })}
                    className={`${cardAction} !flex-none`}
                    aria-label="Share alert"
                >
                    <Share2 className="h-4 w-4" aria-hidden="true" /> Share
                </button>
            </div>
        </article>
    );
};

export default OfficialAlertCard;
