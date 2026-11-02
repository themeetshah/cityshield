import { useCallback, useId, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardCheck, Phone, Users } from 'lucide-react';
import { errorMessage } from '../../../services/api';
import { getVolunteerApplications, getVolunteers, reviewVolunteerApplication } from '../../../services/operations';
import { PAGE_SIZE, POLL_MS, formatDateTime, inputClass, timeAgo } from './format';
import usePolling from './usePolling';
import { EmptyState, ErrorBanner, Field, LoadMore, LoadingBlock, Modal, Panel } from './ui';

const APPLICATION_FILTERS = ['pending', 'approved', 'rejected', 'all'];

const VolunteerList = () => {
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [availableOnly, setAvailableOnly] = useState(false);
    const checkboxId = useId();
    const fetcher = useCallback(
        () => getVolunteers({ limit, available: availableOnly ? 'true' : undefined }),
        [limit, availableOnly]
    );
    const { data, loading, error, refresh, refreshing } = usePolling(fetcher, { intervalMs: POLL_MS * 2, deps: [limit, availableOnly] });
    const volunteers = data?.results || [];

    return (
        <>
            <div className="px-3 sm:px-4 pt-3">
                <label htmlFor={checkboxId} className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input id={checkboxId} type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
                    Available now only
                </label>
            </div>
            {error && <ErrorBanner message={errorMessage(error, 'Could not load volunteers.')} onRetry={refresh} />}
            {loading && !data ? (
                <LoadingBlock message="Loading volunteers…" />
            ) : volunteers.length === 0 ? (
                <EmptyState icon={Users} title="No volunteers" subtitle="Approved volunteer applications appear here." />
            ) : (
                <>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4">
                        {volunteers.map((v) => (
                            <li key={v.id} className="border border-slate-200 rounded-xl p-3 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-slate-900 truncate">{v.user_name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${v.is_available ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
                                        {v.is_available ? 'Available' : 'Unavailable'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                                    <a href={`tel:${v.phone_number}`} className="hover:underline">{v.phone_number}</a>
                                    {!v.is_verified && <span className="ml-2 text-amber-700">Not verified</span>}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {v.response_count} SOS response{v.response_count === 1 ? '' : 's'} ·{' '}
                                    {v.last_location_update ? `location shared ${timeAgo(v.last_location_update)}` : 'no location shared'}
                                </p>
                            </li>
                        ))}
                    </ul>
                    <LoadMore shown={volunteers.length} total={data?.count} onClick={() => setLimit((l) => l + PAGE_SIZE)} busy={refreshing} />
                </>
            )}
        </>
    );
};

const ReviewModal = ({ application, action, onDone, onClose }) => {
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);
    const notesId = useId();
    const approve = action === 'approve';

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const res = await reviewVolunteerApplication(application.id, action, notes.trim());
            toast.success(res.message || (approve ? 'Application approved' : 'Application rejected'));
            onDone();
            onClose();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not review the application.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title={`${approve ? 'Approve' : 'Reject'} ${application.user_name || application.user_email}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <Field
                    label={approve ? 'Notes (optional)' : 'Reason (shared with the applicant)'}
                    htmlFor={notesId}
                >
                    <textarea
                        id={notesId}
                        rows={3}
                        maxLength={2000}
                        required={!approve}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={inputClass}
                    />
                </Field>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Cancel</button>
                    <button
                        type="submit"
                        disabled={busy}
                        className={`px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60 ${approve ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        {busy ? 'Saving…' : approve ? 'Approve' : 'Reject'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const ApplicationList = () => {
    const [status, setStatus] = useState('pending');
    const [review, setReview] = useState(null); // { application, action }
    const selectId = useId();
    const fetcher = useCallback(() => getVolunteerApplications(status), [status]);
    const { data, loading, error, refresh } = usePolling(fetcher, { intervalMs: POLL_MS * 2, deps: [status] });
    const applications = data?.applications || [];

    return (
        <>
            <div className="px-3 sm:px-4 pt-3 flex items-center gap-2">
                <label htmlFor={selectId} className="text-sm text-slate-700">Show</label>
                <select id={selectId} value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white">
                    {APPLICATION_FILTERS.map((s) => (
                        <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                    ))}
                </select>
            </div>
            {error && <ErrorBanner message={errorMessage(error, 'Could not load applications.')} onRetry={refresh} />}
            {loading && !data ? (
                <LoadingBlock message="Loading applications…" />
            ) : applications.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title={`No ${status === 'all' ? '' : status} applications`} />
            ) : (
                <ul className="divide-y divide-slate-100">
                    {applications.map((a) => (
                        <li key={a.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900">{a.user_name || a.user_email}</p>
                                <p className="text-xs text-slate-600">
                                    {a.user_email} · {a.phone_number} · applied {formatDateTime(a.applied_at)}
                                </p>
                                {a.status !== 'pending' && (
                                    <p className="text-xs text-slate-500">
                                        {a.status} {a.reviewed_by_name && `by ${a.reviewed_by_name}`} {a.reviewed_at && `on ${formatDateTime(a.reviewed_at)}`}
                                        {a.notes && ` — “${a.notes}”`}
                                    </p>
                                )}
                            </div>
                            {a.status === 'pending' && (
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setReview({ application: a, action: 'approve' })} className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold">
                                        Approve
                                    </button>
                                    <button type="button" onClick={() => setReview({ application: a, action: 'reject' })} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">
                                        Reject
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {review && <ReviewModal {...review} onDone={refresh} onClose={() => setReview(null)} />}
        </>
    );
};

const VolunteersSection = () => {
    const [tab, setTab] = useState('volunteers');
    const tabs = [
        { key: 'volunteers', label: 'Volunteers' },
        { key: 'applications', label: 'Applications' },
    ];
    return (
        <Panel icon={Users} title="Volunteers" tone="green">
            <div role="tablist" aria-label="Volunteer views" className="flex gap-1 px-3 sm:px-4 pt-3 border-b border-slate-100">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.key ? 'border-green-600 text-green-800' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <div role="tabpanel">{tab === 'volunteers' ? <VolunteerList /> : <ApplicationList />}</div>
        </Panel>
    );
};

export default VolunteersSection;
