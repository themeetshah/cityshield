import { CheckCircle2, Clock, MapPin, Route, Siren, User, UserCheck } from 'lucide-react';
import { departmentLabel } from '../../auth/roles';
import { IconChip } from '../../components/dashboard/home/ui';
import { formatDistance, humanize, timeAgo } from './format';
import { cardAction, cardShell } from './cardStyles';

const respondButton =
    'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:from-red-600 hover:to-rose-700 disabled:opacity-60';

const SosAlertCard = ({ alert, canRespond, responding, onRespond, onRoute }) => {
    const active = alert.is_active;
    const showRespond = canRespond && active && !alert.has_responded;

    return (
        <article className={`${cardShell} relative overflow-hidden`}>
            {/* Same side rail as the dashboard's nearest-help cards: red while active. */}
            <span className={`absolute inset-y-0 left-0 w-1.5 ${active ? 'bg-red-600' : 'bg-emerald-500'}`} aria-hidden="true" />
            <div className="flex items-start justify-between gap-3 pl-1">
                <div className="flex min-w-0 items-center gap-3">
                    <IconChip icon={Siren} tone={active ? 'bg-red-50 text-red-600 ring-red-100' : 'bg-emerald-50 text-emerald-600 ring-emerald-100'} />
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-700">SOS · {humanize(alert.emergency_type) || 'Emergency'}</p>
                        {alert.department && (
                            <p className="truncate text-xs font-semibold text-slate-500">
                                {departmentLabel(alert.department) || alert.department}
                            </p>
                        )}
                    </div>
                </div>
                <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                        active ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                    }`}
                >
                    {active && <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" />}
                    {active ? 'Active' : 'Resolved'}
                </span>
            </div>

            <h3 className="mt-4 pl-1 text-lg font-bold leading-snug text-slate-900">
                {alert.description || 'Emergency assistance requested'}
            </h3>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 pl-1 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <dt className="sr-only">Distance</dt>
                    <dd>{formatDistance(alert.distance) ? `${formatDistance(alert.distance)} away` : 'Distance unknown'}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <dt className="sr-only">Raised</dt>
                    <dd><time dateTime={alert.created_at}>{timeAgo(alert.created_at)}</time></dd>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                    <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <dt className="sr-only">Person</dt>
                    <dd className="truncate">{alert.user_name || 'Anonymous'}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <dt className="sr-only">Responders</dt>
                    <dd>{alert.responders_count || 0} responder{alert.responders_count === 1 ? '' : 's'}</dd>
                </div>
            </dl>

            <div className="min-h-5 flex-1" aria-hidden="true" />
            <div className="flex gap-2 border-t border-slate-100 pt-4 pl-1">
                {showRespond && (
                    <button type="button" onClick={() => onRespond(alert)} disabled={responding} className={respondButton}>
                        {responding ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                        ) : (
                            <UserCheck className="h-4 w-4" aria-hidden="true" />
                        )}
                        {responding ? 'Responding…' : 'Respond'}
                    </button>
                )}
                {alert.has_responded && (
                    <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> You responded
                    </span>
                )}
                <button type="button" onClick={() => onRoute(alert)} className={cardAction}>
                    <Route className="h-4 w-4" aria-hidden="true" /> Route
                </button>
            </div>
        </article>
    );
};

export default SosAlertCard;
