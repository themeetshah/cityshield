import { BadgeCheck, HandHeart } from 'lucide-react';

/** Availability switch + real counters for an approved volunteer. */
const VolunteerPanel = ({ status, error, updating, hasLocation, onToggle }) => {
    const available = !!status?.is_available;

    return (
        <section aria-labelledby="volunteer-panel-title" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-50 p-2.5 text-emerald-600 ring-1 ring-emerald-100">
                    <HandHeart className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                    <h2 id="volunteer-panel-title" className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
                        Volunteer status
                        {status?.is_verified && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                                <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                Verified
                            </span>
                        )}
                    </h2>
                    {error ? (
                        <p className="text-sm text-red-700">{error}</p>
                    ) : status ? (
                        <p className="mt-0.5 text-sm text-slate-600">
                            {available
                                ? 'You are available and can be alerted to nearby emergencies.'
                                : 'You are currently unavailable and will not be alerted to emergencies.'}{' '}
                            You have responded to {status.response_count ?? 0} SOS alert
                            {status.response_count === 1 ? '' : 's'}.
                        </p>
                    ) : (
                        <p className="mt-0.5 text-sm text-slate-500">Loading your volunteer status…</p>
                    )}
                    {available && !hasLocation && (
                        <p className="text-sm text-amber-700 mt-1">
                            Your location is unavailable, so nearby emergencies cannot be matched to you.
                        </p>
                    )}
                </div>
                {status && (
                    <div className="inline-flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700" aria-hidden="true">{available ? 'Available' : 'Unavailable'}</span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={available}
                            aria-label="Available for emergency alerts"
                            disabled={updating}
                            onClick={() => onToggle(!available)}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-60 ${
                                available ? 'bg-emerald-600' : 'bg-slate-300'
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
