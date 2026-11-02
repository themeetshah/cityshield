import { BadgeCheck, HandHeart } from 'lucide-react';

/** Availability switch + real counters for an approved volunteer. */
const VolunteerPanel = ({ status, error, updating, hasLocation, onToggle }) => {
    const available = !!status?.is_available;

    return (
        <section aria-labelledby="volunteer-panel-title" className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <HandHeart className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 id="volunteer-panel-title" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        Volunteer status
                        {status?.is_verified && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                Verified
                            </span>
                        )}
                    </h2>
                    {error ? (
                        <p className="text-sm text-red-700">{error}</p>
                    ) : status ? (
                        <p className="text-sm text-gray-600">
                            {available
                                ? 'You are available and can be alerted to nearby emergencies.'
                                : 'You are currently unavailable and will not be alerted to emergencies.'}{' '}
                            You have responded to {status.response_count ?? 0} SOS alert
                            {status.response_count === 1 ? '' : 's'}.
                        </p>
                    ) : (
                        <p className="text-sm text-gray-500">Loading your volunteer status…</p>
                    )}
                    {available && !hasLocation && (
                        <p className="text-sm text-amber-700 mt-1">
                            Your location is unavailable, so nearby emergencies cannot be matched to you.
                        </p>
                    )}
                </div>
                {status && (
                    <div className="inline-flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700" aria-hidden="true">{available ? 'Available' : 'Unavailable'}</span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={available}
                            aria-label="Available for emergency alerts"
                            disabled={updating}
                            onClick={() => onToggle(!available)}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-60 ${
                                available ? 'bg-emerald-600' : 'bg-gray-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                                    available ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default VolunteerPanel;
