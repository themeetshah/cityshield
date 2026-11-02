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
        <div className="flex flex-col sm:flex-row gap-4 p-5 bg-blue-50 border border-blue-200 rounded-2xl">
            <ShieldAlert className="w-8 h-8 text-blue-600 flex-shrink-0" aria-hidden="true" />
            <div className="text-sm text-blue-900 space-y-2">
                <p className="font-semibold text-base">Emergencies near you are shared only with responders</p>
                <p>
                    To protect the people involved, active SOS alerts are visible only to approved volunteers and
                    the responsible departments. If you need help, use the SOS button - your location is shared
                    with responders automatically.
                </p>
                <p>
                    <Link to="/profile" className="inline-flex items-center gap-1 font-semibold text-blue-700 underline">
                        <HandHeart className="w-4 h-4" aria-hidden="true" />
                        Apply to become a volunteer
                    </Link>{' '}
                    to receive and respond to nearby SOS alerts.
                </p>
            </div>
        </div>

        <section aria-labelledby="own-sos-title" className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 id="own-sos-title" className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Siren className="w-5 h-5 text-red-600" aria-hidden="true" />
                Your SOS alerts
            </h3>
            {loading ? (
                <SectionLoading label="Loading your SOS history…" />
            ) : error ? (
                <SectionError message={error} onRetry={onRetry} />
            ) : ownAlerts.length === 0 ? (
                <p className="text-gray-600 text-sm">You have not raised any SOS alerts.</p>
            ) : (
                <ul className="divide-y divide-gray-100">
                    {ownAlerts.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                            <span className="text-gray-800">
                                <time dateTime={item.created_at} title={formatDateTime(item.created_at)}>
                                    {timeAgo(item.created_at)}
                                </time>
                            </span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    item.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
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
