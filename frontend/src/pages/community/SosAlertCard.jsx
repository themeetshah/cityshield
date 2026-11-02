import { CheckCircle2, Clock, MapPin, Route, Siren, User, UserCheck } from 'lucide-react';
import { departmentLabel } from '../../auth/roles';
import { formatDistance, humanize, timeAgo } from './format';

const SosAlertCard = ({ alert, canRespond, responding, onRespond, onRoute }) => {
    const active = alert.is_active;

    return (
        <article
            className={`flex flex-col bg-white rounded-2xl border shadow-sm overflow-hidden ${
                active ? 'border-red-200' : 'border-emerald-200'
            }`}
        >
            <header
                className={`p-5 text-white bg-gradient-to-r ${
                    active ? 'from-red-600 to-red-700' : 'from-emerald-600 to-emerald-700'
                }`}
            >
                <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-white/90">
                        <Siren className="w-4 h-4" aria-hidden="true" />
                        SOS · {humanize(alert.emergency_type) || 'Emergency'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 font-bold">{active ? 'ACTIVE' : 'RESOLVED'}</span>
                </div>
                <h3 className="font-bold text-lg leading-tight">
                    {alert.description || 'Emergency assistance requested'}
                </h3>
            </header>

            <div className="flex flex-col flex-1 p-5">
                <dl className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-5">
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <dt className="sr-only">Distance</dt>
                        <dd>{formatDistance(alert.distance) || 'Distance unknown'}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <dt className="sr-only">Raised</dt>
                        <dd>
                            <time dateTime={alert.created_at}>{timeAgo(alert.created_at)}</time>
                        </dd>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <dt className="sr-only">Person</dt>
                        <dd className="truncate">{alert.user_name || 'Anonymous'}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <dt className="sr-only">Responders</dt>
                        <dd>
                            {alert.responders_count || 0} responder{alert.responders_count === 1 ? '' : 's'}
                        </dd>
                    </div>
                    {alert.department && (
                        <div className="col-span-2 text-xs text-gray-500">
                            Routed to {departmentLabel(alert.department) || alert.department}
                        </div>
                    )}
                </dl>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                    {canRespond && active && !alert.has_responded && (
                        <button
                            type="button"
                            onClick={() => onRespond(alert)}
                            disabled={responding}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
                        >
                            {responding ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                            ) : (
                                <UserCheck className="w-4 h-4" aria-hidden="true" />
                            )}
                            {responding ? 'Responding…' : 'Respond'}
                        </button>
                    )}
                    {alert.has_responded && (
                        <span className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold">
                            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            You responded
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => onRoute(alert)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-800 rounded-xl text-sm font-semibold hover:bg-gray-200 ${
                            !(canRespond && active) && !alert.has_responded ? 'col-span-2' : ''
                        }`}
                    >
                        <Route className="w-4 h-4" aria-hidden="true" />
                        Route
                    </button>
                </div>
            </div>
        </article>
    );
};

export default SosAlertCard;
