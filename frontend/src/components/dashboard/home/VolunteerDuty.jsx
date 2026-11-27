import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HandHeart, Siren } from 'lucide-react';
import { setVolunteerAvailability } from '../../../services/sos';
import { errorMessage } from '../../../services/api';
import { humanize, timeAgo } from '../../../pages/community/format';
import { SectionError } from '../../../pages/community/StateViews';
import { Card, CardHeader, Skeleton } from './ui';
import { sosButton } from './styles';

/**
 * Volunteers: on/off duty switch (needs a real location so nearby SOS alerts
 * can reach them), active SOS alerts near them, and their recent alerts.
 */
const VolunteerDuty = ({ status, responses, nearby, loading, error, onRetry, onStatusChange, location }) => {
    const [busy, setBusy] = useState(false);
    const onDuty = !!status?.is_available;

    const toggle = async () => {
        const next = !onDuty;
        if (next && !location) {
            toast.error('Turn on location first, so nearby SOS alerts can reach you.');
            return;
        }
        setBusy(true);
        try {
            await setVolunteerAvailability(next, next ? location : null);
            onStatusChange({ ...status, is_available: next });
            toast.success(next ? "You're on duty" : "You're off duty");
        } catch (err) {
            toast.error(errorMessage(err, 'Could not change your duty status.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card aria-labelledby="duty-title" className={`p-5 sm:p-8 ${onDuty ? 'bg-gradient-to-br from-white to-emerald-50/70' : ''}`}>
            <CardHeader
                icon={HandHeart}
                tone={onDuty ? 'bg-emerald-50 text-emerald-600 ring-emerald-100' : 'bg-amber-50 text-amber-600 ring-amber-100'}
                id="duty-title"
                title={onDuty ? "You're on duty" : "You're off duty"}
                subtitle={onDuty
                    ? 'You will be alerted when someone within 2 km raises an SOS.'
                    : 'Go on duty to receive SOS alerts from people near you.'}
            >
                <div className="flex items-center gap-3">
                    {onDuty && (
                        <span className="relative flex h-3 w-3" aria-hidden="true">
                            <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                            <span className="relative h-3 w-3 rounded-full bg-emerald-500" />
                        </span>
                    )}
                    <button
                        type="button"
                        role="switch"
                        aria-checked={onDuty}
                        aria-labelledby="duty-title"
                        onClick={toggle}
                        disabled={busy || loading || !status}
                        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:opacity-50 ${onDuty ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                        <span
                            aria-hidden="true"
                            className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${onDuty ? 'translate-x-7' : 'translate-x-1'}`}
                        />
                    </button>
                </div>
            </CardHeader>

            {loading ? (
                <Skeleton className="mt-6 h-16" />
            ) : error ? (
                <div className="mt-6"><SectionError message={error} onRetry={onRetry} /></div>
            ) : (
                <>
                    <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ring-1 ${nearby > 0 ? 'bg-red-50 ring-red-100' : 'bg-white ring-slate-200'}`}>
                        <p className={`flex items-center gap-2 font-bold tabular-nums ${nearby > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                            <Siren className={`w-5 h-5 ${nearby > 0 ? 'text-red-600' : 'text-slate-400'}`} aria-hidden="true" />
                            {nearby == null
                                ? 'Turn on location to see SOS alerts near you.'
                                : nearby === 0
                                    ? 'No active SOS alerts within 10 km.'
                                    : `${nearby} active SOS alert${nearby === 1 ? '' : 's'} within 10 km`}
                        </p>
                        {nearby > 0 && <Link to="/community" className={sosButton}>View and respond</Link>}
                    </div>

                    <h3 className="mt-6 font-bold text-slate-900">Your recent alerts</h3>
                    {responses.length === 0 ? (
                        <p className="mt-1 text-slate-600">You haven&apos;t been alerted to an emergency yet.</p>
                    ) : (
                        <ul className="mt-2 divide-y divide-slate-100">
                            {responses.slice(0, 4).map((r) => (
                                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                                    <span className="font-semibold text-slate-900">{humanize(r.emergency_type) || 'Emergency'}</span>
                                    <span className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                        {timeAgo(r.alerted_at)}
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${r.responded ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                                            {r.responded ? 'You responded' : 'No response'}
                                        </span>
                                        {r.sos_is_active && (
                                            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-100">Still active</span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </Card>
    );
};

export default VolunteerDuty;
