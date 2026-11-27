import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Grid, List, Loader2, Plus, RefreshCw, Search, X } from 'lucide-react';
import { PageHeader, PageShell } from '../components/common/PageShell';
import { primaryButton } from '../components/dashboard/home/styles';
import { useAuth } from '../context/AuthContext';
import { departmentLabel, isCommunityUser, isResponder, isSuperAdmin } from '../auth/roles';
import { errorMessage } from '../services/api';
import { listReports } from '../services/reports';
import { ReportCard, ReportListItem } from './reports/ReportCards';
import { DEPARTMENT_LABELS, REPORT_TYPE_OPTIONS, STATUS_OPTIONS } from './reports/reportConfig';

const PAGE_SIZE = 20;
const DEFAULT_FILTERS = { type: 'all', status: 'all', scope: 'all', department: '' };

const matchesSearch = (report, term) => {
    if (!term) return true;
    const needle = term.toLowerCase();
    return [report.title, report.description, report.report_type_display, report.location]
        .some((value) => value && value.toLowerCase().includes(needle));
};

const STATUS_CONFIG = {
    all: { label: 'All', active: 'bg-slate-900 text-white font-bold' },
    pending: { label: 'Pending', active: 'bg-amber-50 text-amber-800 ring-1 ring-amber-300 font-bold' },
    investigating: { label: 'Investigating', active: 'bg-blue-50 text-blue-800 ring-1 ring-blue-300 font-bold' },
    resolved: { label: 'Resolved', active: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300 font-bold' },
    dismissed: { label: 'Dismissed', active: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300 font-bold' },
};

const AllReports = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [filters, setFilters] = useState(() => (
        searchParams.get('mine') === 'true' ? { ...DEFAULT_FILTERS, scope: 'mine' } : DEFAULT_FILTERS
    ));
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [viewMode, setViewMode] = useState('grid');
    const [reloadToken, setReloadToken] = useState(0);
    const [page, setPage] = useState({ reports: [], count: 0, loading: true, loadingMore: false, error: null, loadedAt: null });
    const loadMoreController = useRef(null);

    const query = useMemo(() => ({
        type: filters.type,
        status: filters.status,
        mine: filters.scope === 'mine',
        department: filters.department || undefined,
    }), [filters]);

    useEffect(() => {
        const controller = new AbortController();
        loadMoreController.current?.abort();
        setPage((prev) => ({ ...prev, loading: true, error: null }));
        listReports({ ...query, limit: PAGE_SIZE, offset: 0 }, { signal: controller.signal })
            .then((data) => setPage({
                reports: data.reports, count: data.count, loading: false, loadingMore: false, error: null, loadedAt: Date.now(),
            }))
            .catch((err) => {
                if (controller.signal.aborted) return;
                setPage((prev) => ({ ...prev, loading: false, error: errorMessage(err, 'Could not load reports.') }));
            });
        return () => controller.abort();
    }, [query, reloadToken]);

    useEffect(() => () => loadMoreController.current?.abort(), []);

    const loadMore = useCallback(() => {
        const controller = new AbortController();
        loadMoreController.current?.abort();
        loadMoreController.current = controller;
        setPage((prev) => ({ ...prev, loadingMore: true, error: null }));
        listReports({ ...query, limit: PAGE_SIZE, offset: page.reports.length }, { signal: controller.signal })
            .then((data) => setPage((prev) => {
                const seen = new Set(prev.reports.map((r) => r.id));
                return {
                    ...prev,
                    reports: [...prev.reports, ...data.reports.filter((r) => !seen.has(r.id))],
                    count: data.count,
                    loadingMore: false,
                };
            }))
            .catch((err) => {
                if (controller.signal.aborted) return;
                setPage((prev) => ({ ...prev, loadingMore: false, error: errorMessage(err, 'Could not load more reports.') }));
            });
    }, [query, page.reports.length]);

    const visibleReports = useMemo(() => {
        const filtered = page.reports.filter((report) => matchesSearch(report, searchTerm.trim()));
        return sortOrder === 'oldest' ? [...filtered].reverse() : filtered;
    }, [page.reports, searchTerm, sortOrder]);

    const setFilter = (key) => (value) => setFilters((prev) => ({ ...prev, [key]: value }));
    const canFile = isCommunityUser(user) || isSuperAdmin(user);
    const hasMore = page.reports.length < page.count;
    const filtersActive = filters.type !== 'all' || filters.status !== 'all' || filters.scope !== 'all' || !!filters.department;
    const staff = isSuperAdmin(user) || isResponder(user);

    const subtitle = isResponder(user)
        ? `Incident reports routed to ${departmentLabel(user.department) || 'your department'}. Open one to update its status.`
        : isSuperAdmin(user)
            ? 'Every incident report across all departments.'
            : 'What people across the city have reported, and how each report is being handled.';

    return (
        <PageShell>
                <PageHeader
                    title="Reports"
                    subtitle={subtitle}
                    actions={canFile && (
                        <Link to="/report" className={primaryButton}>
                            <Plus className="h-4 w-4" aria-hidden="true" /> Report an incident
                        </Link>
                    )}
                />
                {/* Search, scope, view mode and filters */}
                <div className="mb-6 space-y-3 rounded-3xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200 sm:p-4">
                    {/* Primary Bar: Search & Top Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden="true" />
                            <input
                                id="report-search"
                                type="search"
                                placeholder="Search reports by title, place or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl bg-slate-50 py-2 pl-10 pr-9 text-sm font-medium text-slate-800 placeholder:text-slate-400 ring-1 ring-slate-200/80 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Top Actions: Scope, View mode, Refresh, Report CTA */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                            {/* Scope: All / Mine */}
                            <div className="flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/50 text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => setFilter('scope')('all')}
                                    className={`px-3 py-1.5 rounded-lg transition ${filters.scope === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilter('scope')('mine')}
                                    className={`px-3 py-1.5 rounded-lg transition ${filters.scope === 'mine' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Mine
                                </button>
                            </div>

                            {/* View Toggle */}
                            <div className="flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/50 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    title="Grid view"
                                    className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <Grid className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    title="List view"
                                    className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Refresh Feed */}
                            <button
                                type="button"
                                onClick={() => setReloadToken((n) => n + 1)}
                                disabled={page.loading}
                                title="Refresh"
                                aria-label="Refresh reports"
                                className="p-2 rounded-xl text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-800 transition disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 ${page.loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Secondary Bar: Status Pills & Filters */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {[{ value: 'all', label: 'All statuses' }, ...STATUS_OPTIONS].map((status) => {
                                const on = filters.status === status.value;
                                const cfg = STATUS_CONFIG[status.value] || STATUS_CONFIG.all;
                                return (
                                    <button
                                        key={status.value}
                                        type="button"
                                        onClick={() => setFilter('status')(status.value)}
                                        className={`px-3 py-1.5 rounded-full text-xs transition whitespace-nowrap ${
                                            on
                                                ? cfg.active
                                                : 'text-slate-600 bg-slate-50 hover:bg-slate-100 ring-1 ring-slate-200/60'
                                        }`}
                                    >
                                        {status.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Dropdowns & Reset */}
                        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                            {/* Type Filter */}
                            <select
                                id="filter-type"
                                value={filters.type}
                                onChange={(e) => setFilter('type')(e.target.value)}
                                className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All types</option>
                                {REPORT_TYPE_OPTIONS.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>

                            {/* Staff Department Filter */}
                            {staff && (
                                <select
                                    id="filter-department"
                                    value={filters.department}
                                    onChange={(e) => setFilter('department')(e.target.value)}
                                    className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">{isSuperAdmin(user) ? 'All departments' : 'My department'}</option>
                                    {Object.entries(DEPARTMENT_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            )}

                            {/* Sort Order */}
                            <select
                                id="filter-sort"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="newest">Newest first</option>
                                <option value="oldest">Oldest first</option>
                            </select>

                            {/* Reset Button */}
                            {filtersActive && (
                                <button
                                    type="button"
                                    onClick={() => setFilters(DEFAULT_FILTERS)}
                                    className="px-2 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quiet Status Bar */}
                <div className="flex items-center justify-between px-1 mb-4 text-xs font-medium text-slate-500">
                    <div>
                        {!page.loading && (
                            <span>
                                Showing <strong className="text-slate-800">{visibleReports.length}</strong> of{' '}
                                <strong className="text-slate-800">{page.count}</strong> reports
                                {isResponder(user) && !filters.department && filters.scope === 'all' && (
                                    <span> in <strong className="text-slate-700">{departmentLabel(user.department) || 'Department'}</strong></span>
                                )}
                            </span>
                        )}
                    </div>
                    {searchTerm && (
                        <span className="text-slate-400 italic">Search applies to loaded reports</span>
                    )}
                </div>

                {/* Error State */}
                {page.error && (
                    <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-red-50 p-4 text-xs text-red-800 ring-1 ring-red-100" role="alert">
                        <span>{page.error}</span>
                        <button type="button" onClick={() => setReloadToken((n) => n + 1)} className="font-bold underline">Retry</button>
                    </div>
                )}

                {/* Loading Skeleton / Empty / Feed Grid */}
                {page.loading && !page.loadedAt ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" role="status">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="h-72 animate-pulse rounded-3xl bg-slate-200/60" />
                        ))}
                    </div>
                ) : visibleReports.length === 0 ? (
                    <div className="mx-auto max-w-md rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-slate-200/80 shadow-xs">
                        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                            <FileText className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <h3 className="mt-4 text-base font-bold text-slate-900">No reports found</h3>
                        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                            {searchTerm || filtersActive ? 'Try adjusting your search terms or filters.' : 'No incident reports have been submitted yet.'}
                        </p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {visibleReports.map((report) => (
                            <ReportCard key={report.id} report={report} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3.5">
                        {visibleReports.map((report) => (
                            <ReportListItem key={report.id} report={report} />
                        ))}
                    </div>
                )}

                {/* Load More Pagination */}
                {page.reports.length > 0 && hasMore && (
                    <div className="mt-8 text-center">
                        <button
                            type="button"
                            onClick={loadMore}
                            disabled={page.loadingMore}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 shadow-xs hover:bg-slate-50 transition disabled:opacity-60"
                        >
                            {page.loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" aria-hidden="true" />}
                            {page.loadingMore ? 'Loading more...' : 'Load more reports'}
                        </button>
                    </div>
                )}
        </PageShell>
    );
};

export default AllReports;
