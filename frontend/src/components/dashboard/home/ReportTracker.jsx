import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, FileText, Plus, Search, XCircle } from 'lucide-react';
import { humanize, timeAgo } from '../../../pages/community/format';
import { SectionError } from '../../../pages/community/StateViews';
import { Card, CardHeader, Skeleton } from './ui';
import { primaryButton } from './styles';

// A report really is a sequence, so it is drawn as a three-step track.
const STEPS = ['Submitted', 'Under investigation', 'Resolved'];
const STATUS = {
    pending: { done: 1, text: 'Waiting for the department to review it', icon: Clock, pill: 'bg-amber-50 text-amber-700 ring-amber-100', bar: 'bg-gradient-to-r from-blue-600 to-sky-500' },
    investigating: { done: 2, text: 'The department is looking into it', icon: Search, pill: 'bg-blue-50 text-blue-700 ring-blue-100', bar: 'bg-gradient-to-r from-blue-600 to-sky-500' },
    resolved: { done: 3, text: 'Resolved', icon: CheckCircle2, pill: 'bg-emerald-50 text-emerald-700 ring-emerald-100', bar: 'bg-emerald-500' },
    dismissed: { done: 3, text: 'Closed without action', icon: XCircle, pill: 'bg-slate-100 text-slate-600 ring-slate-200', bar: 'bg-slate-400' },
};

const summary = (stats) => {
    if (!stats || !stats.reports_submitted) return 'Follow every report from submission to resolution.';
    const parts = [`${stats.reports_resolved} resolved`];
    if (stats.reports_in_progress) parts.push(`${stats.reports_in_progress} in progress`);
    if (stats.reports_dismissed) parts.push(`${stats.reports_dismissed} closed`);
    const n = stats.reports_submitted;
    return `You've submitted ${n} report${n === 1 ? '' : 's'}: ${parts.join(', ')}.`;
};

const ReportRow = ({ report }) => {
    const s = STATUS[report.status] || STATUS.pending;
    const Icon = s.icon;
    return (
        <li>
            <Link
                to={`/reports/${report.id}`}
                className="block rounded-2xl px-2 py-4 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
            >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 break-words">{report.title}</h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                            {report.report_type_display || humanize(report.report_type)}
                            {report.department ? `, handled by ${humanize(report.department)}` : ''} · {timeAgo(report.created_at)}
                        </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${s.pill}`}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {report.status_display || humanize(report.status)}
                    </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Progress: ${s.text}`}>
                    <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${(s.done / STEPS.length) * 100}%` }} />
                </div>
                <div className="mt-2 hidden justify-between text-xs font-semibold text-slate-400 sm:flex" aria-hidden="true">
                    {STEPS.map((step, i) => (
                        <span key={step} className={i < s.done ? 'text-slate-600' : ''}>{step}</span>
                    ))}
                </div>
                <p className="mt-2 text-sm font-medium text-slate-700 sm:hidden">{s.text}</p>
            </Link>
        </li>
    );
};

const ReportTracker = ({ reports, stats, loading, error, onRetry }) => (
    <Card aria-labelledby="reports-title" className="p-5 sm:p-8">
        <CardHeader icon={FileText} tone="bg-blue-50 text-blue-600 ring-blue-100" id="reports-title" title="Your reports" subtitle={summary(stats)}>
            <Link to="/report" className={primaryButton}>
                <Plus className="w-4 h-4" aria-hidden="true" /> Report an incident
            </Link>
        </CardHeader>

        {loading ? (
            <div className="mt-6 space-y-3">
                {[0, 1].map((i) => <Skeleton key={i} className="h-28" />)}
            </div>
        ) : error ? (
            <div className="mt-6"><SectionError message={error} onRetry={onRetry} /></div>
        ) : reports.length === 0 ? (
            <div className="mt-6">
                <p className="font-bold text-slate-900">You haven&apos;t reported anything yet.</p>
                <p className="mt-1 text-slate-600">
                    Broken street lights, harassment, fire risks: each report goes to the department that handles it, and
                    you can follow its progress here.
                </p>
            </div>
        ) : (
            <>
                <ul className="mt-4 divide-y divide-slate-100">
                    {reports.map((r) => <ReportRow key={r.id} report={r} />)}
                </ul>
                <Link to="/reports?mine=true" className="mt-4 inline-block text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline">
                    See all your reports
                </Link>
            </>
        )}
    </Card>
);

export default ReportTracker;
