import { Link } from 'react-router-dom';
import { ArrowRight, Clock, ImageIcon, MapPin, User } from 'lucide-react';
import { mediaUrl } from '../../services/api';
import { DEPARTMENT_LABELS, getStatusConfig, getTypeConfig, isVideoPath, timeAgo } from './reportConfig';

const CHIP = {
    crime: 'bg-red-50 text-red-600 ring-red-100',
    harassment: 'bg-rose-50 text-rose-600 ring-rose-100',
    safety: 'bg-amber-50 text-amber-600 ring-amber-100',
    infrastructure: 'bg-blue-50 text-blue-600 ring-blue-100',
    fire_hazard: 'bg-orange-50 text-orange-600 ring-orange-100',
    medical: 'bg-sky-50 text-sky-600 ring-sky-100',
    other: 'bg-violet-50 text-violet-600 ring-violet-100',
};

const STATUS_PILL = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-100',
    investigating: 'bg-blue-50 text-blue-700 ring-blue-100',
    resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    dismissed: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const coverImage = (report) => {
    const image = (report.media || []).find((item) => item.file && !isVideoPath(item.file));
    return image ? mediaUrl(image.file) : null;
};

const mediaCount = (report) => report.media?.length || 0;

export const TypeChip = ({ type, size = 'lg' }) => {
    const config = getTypeConfig(type);
    const Icon = config.icon;
    return (
        <span className={`inline-flex shrink-0 ring-1 ${size === 'lg' ? 'rounded-2xl p-3' : 'rounded-xl p-2.5'} ${CHIP[type] || CHIP.other}`}>
            <Icon className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden="true" />
        </span>
    );
};

export const StatusPill = ({ report }) => {
    const status = getStatusConfig(report.status);
    const Icon = status.icon;
    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${STATUS_PILL[report.status] || STATUS_PILL.pending}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {report.status_display || status.label}
        </span>
    );
};

const Facts = ({ report, cover }) => {
    const files = mediaCount(report);
    const showFiles = files > 1 || (files === 1 && !cover);
    return (
        <ul className="mt-4 space-y-1.5 text-sm text-slate-500">
            <li className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                {report.is_mine ? 'You' : report.reported_by_name || 'Anonymous'}
            </li>
            <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                {timeAgo(report.created_at)}
            </li>
            {report.location && (
                <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{report.location}</span>
                </li>
            )}
            {showFiles && (
                <li className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {files} attachment{files === 1 ? '' : 's'}
                </li>
            )}
        </ul>
    );
};

const cardClass =
    'group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition duration-300 hover:shadow-lg motion-safe:hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300';

const Heading = ({ report }) => {
    const type = getTypeConfig(report.report_type);
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <TypeChip type={report.report_type} />
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700">{report.report_type_display || type.label}</p>
                    {report.is_mine && <p className="text-xs font-bold text-blue-600">Your report</p>}
                </div>
            </div>
            <StatusPill report={report} />
        </div>
    );
};

const Footer = ({ report }) => (
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-sm font-semibold text-slate-500">{DEPARTMENT_LABELS[report.department] || ''}</span>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600">
            View details
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
    </div>
);

export const ReportCard = ({ report }) => {
    const cover = coverImage(report);
    return (
        <article className="h-full min-w-0">
            <Link to={`/reports/${report.id}`} className={cardClass}>
                {cover && <img src={cover} alt="" className="h-44 w-full object-cover" />}
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <Heading report={report} />
                    <h2 className="mt-4 text-lg font-bold leading-snug text-slate-900 break-words line-clamp-2">{report.title}</h2>
                    {report.description && <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-3">{report.description}</p>}
                    <Facts report={report} cover={cover} />
                    <Footer report={report} />
                </div>
            </Link>
        </article>
    );
};

export const ReportListItem = ({ report }) => {
    const cover = coverImage(report);
    return (
        <article>
            <Link to={`/reports/${report.id}`} className={`${cardClass} sm:flex-row sm:items-stretch`}>
                {cover && <img src={cover} alt="" className="h-44 w-full object-cover sm:h-auto sm:w-56 sm:shrink-0" />}
                <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                    <Heading report={report} />
                    <h2 className="mt-4 text-lg font-bold leading-snug text-slate-900 break-words">{report.title}</h2>
                    {report.description && <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-2">{report.description}</p>}
                    <Facts report={report} cover={cover} />
                    <Footer report={report} />
                </div>
            </Link>
        </article>
    );
};
