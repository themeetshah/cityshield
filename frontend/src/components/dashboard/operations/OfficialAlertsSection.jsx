import { useCallback, useId, useState } from 'react';
import toast from 'react-hot-toast';
import { Megaphone, Plus } from 'lucide-react';
import { DEPARTMENTS, departmentOf, isDepartmentAdmin, isSuperAdmin } from '../../../auth/roles';
import { errorMessage } from '../../../services/api';
import { getOfficialAlerts, publishOfficialAlert, setOfficialAlertActive } from '../../../services/operations';
import { ALERT_TYPES, POLL_MS, formatDateTime, inputClass } from './format';
import usePolling from './usePolling';
import { EmptyState, ErrorBanner, Field, LoadMore, LoadingBlock, Modal, Panel } from './ui';

const PAGE = 20;

const PublishAlertModal = ({ user, onPublished, onClose }) => {
    const superadmin = isSuperAdmin(user);
    const [form, setForm] = useState({
        title: '', message: '', alert_type: 'safety', department: superadmin ? '' : departmentOf(user),
    });
    const [busy, setBusy] = useState(false);
    const ids = { title: useId(), message: useId(), type: useId(), dept: useId() };
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const res = await publishOfficialAlert(form);
            toast.success(res.message || 'Alert published');
            onPublished();
            onClose();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not publish the alert.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title="Publish official alert" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <p className="text-sm text-slate-600">
                    Published alerts are visible to every signed-in citizen on the Community page.
                </p>
                {superadmin && (
                    <Field label="Issuing department" htmlFor={ids.dept}>
                        <select id={ids.dept} required value={form.department} onChange={set('department')} className={inputClass}>
                            <option value="" disabled>Select department…</option>
                            {Object.entries(DEPARTMENTS).map(([key, d]) => (
                                <option key={key} value={key}>{d.label}</option>
                            ))}
                        </select>
                    </Field>
                )}
                <Field label="Type" htmlFor={ids.type}>
                    <select id={ids.type} value={form.alert_type} onChange={set('alert_type')} className={inputClass}>
                        {ALERT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Title" htmlFor={ids.title}>
                    <input id={ids.title} required maxLength={200} value={form.title} onChange={set('title')} className={inputClass} />
                </Field>
                <Field label="Message" htmlFor={ids.message}>
                    <textarea id={ids.message} required rows={4} value={form.message} onChange={set('message')} className={inputClass} />
                </Field>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold"
                    >
                        {busy ? 'Publishing…' : 'Publish'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const OfficialAlertsSection = ({ user, department }) => {
    const [showForm, setShowForm] = useState(false);
    const [activeOnly, setActiveOnly] = useState(true);
    const [limit, setLimit] = useState(PAGE);
    const toggleId = useId();

    const fetchAlerts = useCallback(
        () => getOfficialAlerts({ active: activeOnly ? 'true' : undefined, department, limit }),
        [activeOnly, department, limit]
    );
    const { data, loading, error, refresh, refreshing } = usePolling(fetchAlerts, {
        intervalMs: POLL_MS * 2,
        deps: [activeOnly, department, limit],
    });
    const alerts = data?.results || [];
    const canDeactivate = (alert) => isSuperAdmin(user) || (isDepartmentAdmin(user) && departmentOf(user) === alert.department);

    const toggleActive = async (alert) => {
        try {
            await setOfficialAlertActive(alert.id, !alert.is_active);
            toast.success(alert.is_active ? 'Alert deactivated' : 'Alert reactivated');
            refresh();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not update the alert.'));
        }
    };

    return (
        <Panel
            icon={Megaphone}
            title="Official alerts"
            tone="amber"
            badge={data ? data.count : null}
            actions={
                <>
                    <label htmlFor={toggleId} className="flex items-center gap-1 text-sm text-slate-700">
                        <input id={toggleId} type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
                        Active only
                    </label>
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                    >
                        <Plus className="w-4 h-4" aria-hidden="true" /> Publish alert
                    </button>
                </>
            }
        >
            {error && <ErrorBanner message={errorMessage(error, 'Could not load alerts.')} onRetry={refresh} />}
            {loading && !data ? (
                <LoadingBlock message="Loading alerts…" />
            ) : alerts.length === 0 ? (
                <EmptyState icon={Megaphone} title="No alerts yet" subtitle="Alerts you publish appear here and on the Community page." />
            ) : (
                <>
                    <ul className="divide-y divide-slate-100">
                        {alerts.map((a) => (
                            <li key={a.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold text-slate-900">{a.title}</h3>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{a.alert_type_display}</span>
                                        {!a.is_active && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">Inactive</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-700 whitespace-pre-line mt-1">{a.message}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {a.department_label}
                                        {a.station_name && ` · ${a.station_name}`}
                                        {a.issued_by_name && ` · ${a.issued_by_name}`} · {formatDateTime(a.created_at)}
                                    </p>
                                </div>
                                {canDeactivate(a) && (
                                    <button
                                        type="button"
                                        onClick={() => toggleActive(a)}
                                        className="self-start px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold"
                                    >
                                        {a.is_active ? 'Deactivate' : 'Reactivate'}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                    <LoadMore shown={alerts.length} total={data?.count} onClick={() => setLimit((l) => l + PAGE)} busy={refreshing} />
                </>
            )}
            {showForm && <PublishAlertModal user={user} onPublished={refresh} onClose={() => setShowForm(false)} />}
        </Panel>
    );
};

export default OfficialAlertsSection;
