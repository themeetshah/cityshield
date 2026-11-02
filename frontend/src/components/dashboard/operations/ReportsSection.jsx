import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ExternalLink, FileText, MapPin, MessageSquare, User } from 'lucide-react';
import { departmentLabel } from '../../../auth/roles';
import {
    REPORT_STATUSES, REPORT_TYPES, STATUS_STYLES, formatDateTime, formatKm, inputClass, staggerDelay, timeAgo,
} from './format';
import { EmptyState, ErrorBanner, Field, LoadMore, LoadingBlock, Modal, Panel } from './ui';

const MotionArticle = motion.article;

const StatusUpdateModal = ({ report, onSubmit, onClose }) => {
    const [status, setStatus] = useState(report.status);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const statusId = useId();
    const noteId = useId();
    const unchanged = status === report.status && !note.trim();

    const submit = async (e) => {
        e.preventDefault();
        if (unchanged) return;
        setBusy(true);
        const ok = await onSubmit(report, status, note.trim());
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Modal title={`Update report #${report.id}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <p className="text-sm text-slate-600 line-clamp-2">{report.title}</p>
                <Field label="Status" htmlFor={statusId}>
                    <select id={statusId} value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                        {REPORT_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Note to the reporter (optional)" htmlFor={noteId} hint="The reporter is notified of every update.">
                    <textarea
                        id={noteId}
                        rows={3}
                        maxLength={2000}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className={inputClass}
                    />
                </Field>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy || unchanged}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold"
                    >
                        {busy ? 'Saving…' : 'Save update'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const ReportCard = ({ report, index, onEdit, onShowOnMap }) => (
    <MotionArticle
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: staggerDelay(index) }}
        className="border border-slate-200 rounded-xl p-3 sm:p-4 bg-white hover:shadow-md transition-shadow space-y-2"
    >
        <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{report.title}</h3>
                <p className="text-xs text-slate-500">
                    #{report.id} · {report.report_type_display} · {departmentLabel(report.department)}
                </p>
            </div>
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[report.status] || ''}`}>
                {report.status_display}
            </span>
        </div>
        <p className="text-sm text-slate-700 line-clamp-2">{report.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                {report.reporter_name || 'Anonymous'}
            </span>
            <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <time dateTime={report.created_at}>{timeAgo(report.created_at)}</time>
            </span>
            {report.location && (
                <span className="flex items-center gap-1 min-w-0">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate max-w-[16rem]">{report.location}</span>
                </span>
            )}
        </div>
        {report.latest_update && (
            <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 flex gap-2">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-500" aria-hidden="true" />
                <span>
                    <strong>{report.latest_update.changed_by_name || 'Staff'}</strong> set{' '}
                    <em>{report.latest_update.status}</em> · {formatDateTime(report.latest_update.created_at)}
                    {report.latest_update.note && <>: “{report.latest_update.note}”</>}
                </span>
            </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
            <button
                type="button"
                onClick={() => onEdit(report)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
                Update status
            </button>
            <button
                type="button"
                onClick={() => onShowOnMap(report)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold"
            >
                Show on map
            </button>
            <Link
                to={`/reports/${report.id}`}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1"
            >
                Details <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </Link>
        </div>
    </MotionArticle>
);

const ReportsSection = ({
    data, loading, error, onRetry, filters, onFilters, radiusM, onUpdateStatus, onShowOnMap, onLoadMore, loadingMore,
}) => {
    const [editing, setEditing] = useState(null);
    const typeId = useId();
    const statusId = useId();
    const reports = data?.results || [];
    const counts = data?.counts_by_status;

    return (
        <Panel
            icon={FileText}
            title="Incident reports"
            tone="blue"
            badge={data ? data.count : null}
            actions={
                <>
                    {radiusM && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Within {formatKm(radiusM)}
                        </span>
                    )}
                    <label htmlFor={typeId} className="sr-only">Report type</label>
                    <select
                        id={typeId}
                        value={filters.type}
                        onChange={(e) => onFilters({ ...filters, type: e.target.value })}
                        className="text-sm border border-blue-200 rounded-lg px-2 py-1 bg-white"
                    >
                        <option value="all">All types</option>
                        {REPORT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                    <label htmlFor={statusId} className="sr-only">Report status</label>
                    <select
                        id={statusId}
                        value={filters.status}
                        onChange={(e) => onFilters({ ...filters, status: e.target.value })}
                        className="text-sm border border-blue-200 rounded-lg px-2 py-1 bg-white"
                    >
                        <option value="open">Open (pending + investigating)</option>
                        <option value="all">All statuses</option>
                        {REPORT_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}{counts ? ` (${counts[s.value] ?? 0})` : ''}
                            </option>
                        ))}
                    </select>
                </>
            }
        >
            {error && <ErrorBanner message={error} onRetry={onRetry} />}
            {loading && !data ? (
                <LoadingBlock message="Loading reports…" />
            ) : reports.length === 0 ? (
                <EmptyState icon={FileText} title="No reports" subtitle="No incident reports match these filters." />
            ) : (
                <>
                    <div className="space-y-3 p-3 sm:p-4">
                        {reports.map((report, index) => (
                            <ReportCard
                                key={report.id}
                                report={report}
                                index={index}
                                onEdit={setEditing}
                                onShowOnMap={onShowOnMap}
                            />
                        ))}
                    </div>
                    <LoadMore shown={reports.length} total={data?.count} onClick={onLoadMore} busy={loadingMore} />
                </>
            )}
            {editing && (
                <StatusUpdateModal report={editing} onSubmit={onUpdateStatus} onClose={() => setEditing(null)} />
            )}
        </Panel>
    );
};

export default ReportsSection;
