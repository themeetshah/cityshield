import { Link } from 'react-router-dom';
import { Clock, FileText } from 'lucide-react';
import { humanize, reportStatusClass, timeAgo, truncate } from '../../../pages/community/format';
import { SectionError } from '../../../pages/community/StateViews';

const RecentReports = ({ reports, loading, error, onRetry }) => (
    <section aria-labelledby="recent-reports-title" className="mb-12 sm:mb-16">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h2 id="recent-reports-title" className="text-xl sm:text-2xl font-bold text-gray-900">
                        Your latest reports
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base">The most recent reports you submitted.</p>
                </div>
                <Link to="/reports" className="text-blue-700 font-semibold hover:underline text-sm">
                    Browse all reports
                </Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-36 rounded-2xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <SectionError message={error} onRetry={onRetry} />
            ) : reports.length === 0 ? (
                <div className="text-center py-10">
                    <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" aria-hidden="true" />
                    <p className="text-gray-700 font-semibold">You haven&apos;t submitted any reports yet.</p>
                    <Link
                        to="/report"
                        className="inline-block mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                    >
                        Submit your first report
                    </Link>
                </div>
            ) : (
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {reports.map((report) => (
                        <li key={report.id}>
                            <Link
                                to={`/reports/${report.id}`}
                                className="flex flex-col h-full p-5 rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white hover:border-blue-300 hover:shadow-md transition"
                            >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {report.report_type_display || humanize(report.report_type)}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${reportStatusClass(report.status)}`}>
                                        {report.status_display || humanize(report.status)}
                                    </span>
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2 break-words">{report.title}</h3>
                                {report.description && (
                                    <p className="text-sm text-gray-700 mb-3 break-words">{truncate(report.description, 120)}</p>
                                )}
                                <span className="mt-auto flex items-center gap-1.5 text-xs text-gray-500">
                                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                                    <time dateTime={report.created_at}>{timeAgo(report.created_at)}</time>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    </section>
);

export default RecentReports;
