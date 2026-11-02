import { Link } from 'react-router-dom';
import { HandHeart, Siren } from 'lucide-react';
import { formatDateTime, humanize, timeAgo } from '../../../pages/community/format';
import { SectionError } from '../../../pages/community/StateViews';

/** Approved volunteers: availability + their real SOS alert/response history. */
const VolunteerActivity = ({ status, responses, loading, error, onRetry }) => (
    <section aria-labelledby="volunteer-activity-title" className="mb-12 sm:mb-16">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-emerald-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center">
                        <HandHeart className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 id="volunteer-activity-title" className="text-xl sm:text-2xl font-bold text-gray-900">
                            Volunteer activity
                        </h2>
                        {status && (
                            <p className="text-sm text-gray-600">
                                You are currently{' '}
                                <strong className={status.is_available ? 'text-emerald-700' : 'text-gray-800'}>
                                    {status.is_available ? 'available' : 'unavailable'}
                                </strong>{' '}
                                for emergency alerts.
                            </p>
                        )}
                    </div>
                </div>
                <Link
                    to="/community"
                    className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700"
                >
                    Manage availability &amp; nearby SOS
                </Link>
            </div>

            {loading ? (
                <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" aria-hidden="true" />
            ) : error ? (
                <SectionError message={error} onRetry={onRetry} />
            ) : responses.length === 0 ? (
                <p className="text-gray-600">You haven&apos;t been alerted to any SOS emergencies yet.</p>
            ) : (
                <ul className="divide-y divide-gray-100">
                    {responses.slice(0, 5).map((r) => (
                        <li key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
                            <span className="flex items-center gap-2 font-semibold text-gray-900 flex-1">
                                <Siren className="w-4 h-4 text-red-600" aria-hidden="true" />
                                {humanize(r.emergency_type) || 'Emergency'}
                            </span>
                            <time dateTime={r.alerted_at} title={formatDateTime(r.alerted_at)} className="text-sm text-gray-500">
                                Alerted {timeAgo(r.alerted_at)}
                            </time>
                            <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    r.responded ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                {r.responded ? 'You responded' : 'No response'}
                            </span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    r.sos_is_active ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                {r.sos_is_active ? 'Still active' : 'Closed'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    </section>
);

export default VolunteerActivity;
