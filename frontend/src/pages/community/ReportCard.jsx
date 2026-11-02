import { Link } from 'react-router-dom';
import { Clock, FileText, MapPin, Route, Share2, User } from 'lucide-react';
import { formatDistance, humanize, reportStatusClass, timeAgo, truncate } from './format';
import shareItem from './shareItem';

const ReportCard = ({ report, onRoute }) => {
    const url = `${window.location.origin}/reports/${report.id}`;
    const statusLabel = report.status_display || humanize(report.status);
    const typeLabel = report.report_type_display || humanize(report.report_type);

    return (
        <article className="flex flex-col bg-white rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <header className="p-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-white/90">
                        <FileText className="w-4 h-4" aria-hidden="true" />
                        {typeLabel}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${reportStatusClass(report.status)}`}>
                        {statusLabel}
                    </span>
                </div>
                <h3 className="font-bold text-lg leading-tight break-words">{report.title}</h3>
            </header>

            <div className="flex flex-col flex-1 p-5">
                {report.description && (
                    <p className="text-gray-700 text-sm leading-relaxed mb-4 break-words">{truncate(report.description, 160)}</p>
                )}

                <dl className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-5 mt-auto">
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <dt className="sr-only">Distance</dt>
                        <dd>{formatDistance(report.distance) || 'Distance unknown'}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <dt className="sr-only">Reported</dt>
                        <dd>
                            <time dateTime={report.created_at}>{timeAgo(report.created_at)}</time>
                        </dd>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2 min-w-0">
                        <User className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <dt className="sr-only">Reported by</dt>
                        <dd className="truncate">
                            {report.is_mine ? 'You' : report.reported_by_name || 'Anonymous'}
                        </dd>
                    </div>
                </dl>

                <div className="grid grid-cols-3 gap-2">
                    <Link
                        to={`/reports/${report.id}`}
                        className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                    >
                        Details
                    </Link>
                    <button
                        type="button"
                        onClick={() => onRoute(report)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-800 rounded-xl text-sm font-semibold hover:bg-gray-200"
                    >
                        <Route className="w-4 h-4" aria-hidden="true" />
                        Route
                    </button>
                    <button
                        type="button"
                        onClick={() => shareItem({ title: report.title, text: truncate(report.description, 100), url })}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-800 rounded-xl text-sm font-semibold hover:bg-gray-200"
                    >
                        <Share2 className="w-4 h-4" aria-hidden="true" />
                        Share
                    </button>
                </div>
            </div>
        </article>
    );
};

export default ReportCard;
