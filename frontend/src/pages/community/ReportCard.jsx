import { Link } from 'react-router-dom';
import { Clock, MapPin, Route, Share2, User } from 'lucide-react';
import { StatusPill, TypeChip } from '../reports/ReportCards';
import { formatDistance, humanize, timeAgo, truncate } from './format';
import shareItem from './shareItem';
import { cardShell, cardAction, cardPrimaryAction } from './cardStyles';

const ReportCard = ({ report, onRoute }) => {
    const url = `${window.location.origin}/reports/${report.id}`;
    const typeLabel = report.report_type_display || humanize(report.report_type);

    return (
        <article className={cardShell}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <TypeChip type={report.report_type} size="md" />
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-700">{typeLabel}</p>
                        {report.is_mine && <p className="text-xs font-bold text-blue-600">Your report</p>}
                    </div>
                </div>
                <StatusPill report={report} />
            </div>

            <h3 className="mt-4 text-lg font-bold leading-snug text-slate-900 break-words">{report.title}</h3>
            {report.description && (
                <p className="mt-2 text-sm leading-relaxed text-slate-600 break-words">{truncate(report.description, 160)}</p>
            )}

            <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <dt className="sr-only">Distance</dt>
                    <dd>{formatDistance(report.distance) ? `${formatDistance(report.distance)} away` : 'Distance unknown'}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <dt className="sr-only">Reported</dt>
                    <dd><time dateTime={report.created_at}>{timeAgo(report.created_at)}</time></dd>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                    <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <dt className="sr-only">Reported by</dt>
                    <dd className="truncate">{report.is_mine ? 'You' : report.reported_by_name || 'Anonymous'}</dd>
                </div>
            </dl>

            <div className="min-h-5 flex-1" aria-hidden="true" />
            <div className="flex gap-2 border-t border-slate-100 pt-4">
                <Link to={`/reports/${report.id}`} className={cardPrimaryAction}>Details</Link>
                <button type="button" onClick={() => onRoute(report)} className={cardAction}>
                    <Route className="h-4 w-4" aria-hidden="true" /> Route
                </button>
                <button
                    type="button"
                    onClick={() => shareItem({ title: report.title, text: truncate(report.description, 100), url })}
                    className={cardAction}
                    aria-label="Share report"
                >
                    <Share2 className="h-4 w-4" aria-hidden="true" /> Share
                </button>
            </div>
        </article>
    );
};

export default ReportCard;
