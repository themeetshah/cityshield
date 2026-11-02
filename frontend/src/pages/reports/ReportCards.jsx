import { Link } from 'react-router-dom';
import { Clock, Eye, ImageIcon, MapPin, User } from 'lucide-react';
import { DEPARTMENT_LABELS, formatDate, getStatusConfig, getTypeConfig, timeAgo } from './reportConfig';

const Badges = ({ report }) => {
    const type = getTypeConfig(report.report_type);
    const status = getStatusConfig(report.status);
    return (
        <>
            <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${type.badge}`}>
                {report.report_type_display || type.label}
            </span>
            <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${status.badge}`}>
                {report.status_display || status.label}
            </span>
            {report.is_mine && <span className="px-3 py-1 rounded-lg text-sm font-semibold bg-indigo-600 text-white">Yours</span>}
        </>
    );
};

const TypeIcon = ({ type }) => {
    const config = getTypeConfig(type);
    const Icon = config.icon;
    return (
        <span className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-lg shrink-0`}>
            <Icon className="w-6 h-6 text-white" aria-hidden="true" />
        </span>
    );
};

const mediaCount = (report) => report.media?.length || 0;

export const ReportCard = ({ report }) => (
    <article className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-shadow border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-6 pb-4 flex-1">
            <div className="flex items-start gap-3 mb-4">
                <TypeIcon type={report.report_type} />
                <div className="flex flex-wrap gap-2"><Badges report={report} /></div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">{report.title}</h2>
            <p className="text-gray-600 text-sm line-clamp-3 mb-4">{report.description}</p>
            <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2"><User className="w-4 h-4" aria-hidden="true" />{report.reported_by_name}</li>
                <li className="flex items-center gap-2"><Clock className="w-4 h-4" aria-hidden="true" />{timeAgo(report.created_at)}</li>
                {report.location && (
                    <li className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" aria-hidden="true" /><span className="truncate">{report.location}</span></li>
                )}
                <li className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" aria-hidden="true" />
                    {mediaCount(report)} attachment{mediaCount(report) === 1 ? '' : 's'}
                </li>
            </ul>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">{DEPARTMENT_LABELS[report.department] || ''}</span>
            <Link
                to={`/reports/${report.id}`}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
            >
                <Eye className="w-4 h-4" aria-hidden="true" /> View details
            </Link>
        </div>
    </article>
);

export const ReportListItem = ({ report }) => (
    <article className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
                <TypeIcon type={report.report_type} />
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2"><Badges report={report} /></div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">{report.title}</h2>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-2">{report.description}</p>
                    <p className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><User className="w-4 h-4" aria-hidden="true" />{report.reported_by_name}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" aria-hidden="true" />{timeAgo(report.created_at)}</span>
                        {mediaCount(report) > 0 && (
                            <span className="flex items-center gap-1"><ImageIcon className="w-4 h-4" aria-hidden="true" />{mediaCount(report)} files</span>
                        )}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                <span className="text-sm text-gray-500">{formatDate(report.created_at)}</span>
                <Link
                    to={`/reports/${report.id}`}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap"
                >
                    <Eye className="w-4 h-4" aria-hidden="true" /> View
                </Link>
            </div>
        </div>
    </article>
);
