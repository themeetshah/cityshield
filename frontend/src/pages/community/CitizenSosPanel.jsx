import { Link } from 'react-router-dom';
import { HandHeart, ShieldAlert, Siren } from 'lucide-react';
import { formatDateTime, timeAgo } from './format';
import { SectionError, SectionLoading } from './StateViews';

/**
 * Citizens cannot see other people's SOS alerts (privacy). Instead they see their own SOS history
 * and how to become a volunteer.
 */
const CitizenSosPanel = ({ ownAlerts, loading, error, onRetry }) => (
    <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-blue-50 p-5 ring-1 ring-blue-100 sm:flex-row sm:p-6">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-blue-200">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="text-sm text-blue-900 space-y-2">
                <p className="text-base font-bold">Emergencies near you are shared only with responders</p>
                <p>
                    To protect the people involved, active SOS alerts are visible only to approved volunteers and
                    the responsible departments. If you need help, use the SOS button - your location is shared
                    with responders automatically.
                </p>
                <p>
                    <Link to="/profile" className="inline-flex items-center gap-1 font-bold text-blue-700 underline">
                        <HandHeart className="w-4 h-4" aria-hidden="true" />
                        Apply to become a volunteer
                    </Link>{' '}
                    to receive and respond to nearby SOS alerts.
                </p>
            </div>
        </div>

        <section aria-labelledby="own-sos-title" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <h3 id="own-sos-title" className="mb-4 flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
                <Siren className="w-5 h-5 text-red-600" aria-hidden="true" />
                Your SOS alerts
            </h3>
            {loading ? (
                <SectionLoading label="Loading your SOS history…" />
            ) : error ? (
                <SectionError message={error} onRetry={onRetry} />
            ) : ownAlerts.length === 0 ? (
                <p className="text-sm text-slate-600">You have not raised any SOS alerts.</p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {ownAlerts.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                            <span className="text-slate-800">
                                <time dateTime={item.created_at} title={formatDateTime(item.created_at)}>
                                    {timeAgo(item.created_at)}
                                </time>
                            </span>
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                    item.status === 'active' ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                }`}
                            >
                                {item.status === 'active' ? 'Active' : 'Resolved'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    </div>
);

export default CitizenSosPanel;
