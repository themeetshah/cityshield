import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, FileText, Filter, Grid, List, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useAuth } from '../context/AuthContext';
import { departmentLabel, isCommunityUser, isResponder, isSuperAdmin } from '../auth/roles';
import { errorMessage } from '../services/api';
import { listReports } from '../services/reports';
import { ReportCard, ReportListItem } from './reports/ReportCards';
import { DEPARTMENT_LABELS, REPORT_TYPE_OPTIONS, STATUS_OPTIONS, timeAgo } from './reports/reportConfig';

const PAGE_SIZE = 20;
const DEFAULT_FILTERS = { type: 'all', status: 'all', scope: 'all', department: '' };

const matchesSearch = (report, term) => {
    if (!term) return true;
    const needle = term.toLowerCase();
    return [report.title, report.description, report.report_type_display, report.location]
        .some((value) => value && value.toLowerCase().includes(needle));
};

const SelectField = ({ id, label, value, onChange, children }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <select
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
            {children}
        </select>
    </div>
);

const AllReports = () => {
    const { user } = useAuth();
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [viewMode, setViewMode] = useState('grid');
    const [showFilters, setShowFilters] = useState(false);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <Navbar />
            <main className="pb-8">
                <div className="bg-white border-b border-gray-200 shadow-sm mb-8">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12 pb-6">
                        <div className="text-center">
                            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4 pb-2">
                                Incident Reports
                            </h1>
                            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-2" aria-live="polite">
                                {page.loading && !page.loadedAt ? 'Loading reports…' : `${page.count} report${page.count === 1 ? '' : 's'} match your filters`}
                            </p>
                            {isResponder(user) && !filters.department && filters.scope === 'all' && (
                                <p className="text-sm text-gray-500 mb-2">Showing reports for {departmentLabel(user.department) || 'your department'}.</p>
                            )}
                            {page.loadedAt && <p className="text-xs text-gray-500 mb-6">Updated {timeAgo(page.loadedAt)}</p>}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                                {canFile && (
                                    <Link to="/report" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg">
                                        <Plus className="w-5 h-5" aria-hidden="true" /> Submit new report
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setReloadToken((n) => n + 1)}
                                    disabled={page.loading}
                                    className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${page.loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                                    {page.loading ? 'Refreshing…' : 'Refresh'}
                                </button>
                            </div>
                        </div>

                        <div className="max-w-6xl mx-auto bg-white/50 rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-lg space-y-4">
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <label htmlFor="report-search" className="sr-only">Search loaded reports</label>
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                                    <input
                                        id="report-search"
                                        type="search"
                                        placeholder="Search loaded reports by title, description or place…"
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                                <div className="flex items-center bg-white rounded-xl p-1 border border-gray-200" role="group" aria-label="View mode">
                                    {[['grid', Grid, 'Grid'], ['list', List, 'List']].map(([mode, Icon, label]) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setViewMode(mode)}
                                            aria-pressed={viewMode === mode}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${viewMode === mode ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                                        >
                                            <Icon className="w-4 h-4" aria-hidden="true" /> {label}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowFilters((prev) => !prev)}
                                    aria-expanded={showFilters}
                                    aria-controls="report-filters"
                                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl border border-gray-200"
                                >
                                    <Filter className="w-4 h-4" aria-hidden="true" /> Filters
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} aria-hidden="true" />
                                </button>
                            </div>

                            {showFilters && (
                                <div id="report-filters" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white rounded-2xl p-4 border border-gray-200">
                                    <SelectField id="filter-scope" label="Show" value={filters.scope} onChange={setFilter('scope')}>
                                        <option value="all">All visible reports</option>
                                        <option value="mine">Only my reports</option>
                                    </SelectField>
                                    <SelectField id="filter-type" label="Type" value={filters.type} onChange={setFilter('type')}>
                                        <option value="all">All types</option>
                                        {REPORT_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </SelectField>
                                    <SelectField id="filter-status" label="Status" value={filters.status} onChange={setFilter('status')}>
                                        <option value="all">All statuses</option>
                                        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </SelectField>
                                    {(isSuperAdmin(user) || isResponder(user)) && (
                                        <SelectField id="filter-department" label="Department" value={filters.department} onChange={setFilter('department')}>
                                            <option value="">{isSuperAdmin(user) ? 'All departments' : 'My department'}</option>
                                            {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                        </SelectField>
                                    )}
                                    <SelectField id="filter-sort" label="Order" value={sortOrder} onChange={setSortOrder}>
                                        <option value="newest">Newest first</option>
                                        <option value="oldest">Oldest first (loaded)</option>
                                    </SelectField>
                                    {filtersActive && (
                                        <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="self-end text-sm underline text-gray-600 py-2">
                                            Reset filters
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {page.error && (
                    <div className="max-w-3xl mx-auto mb-6 px-4" role="alert">
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center justify-between gap-4">
                            <span>{page.error}</span>
                            <button type="button" onClick={() => setReloadToken((n) => n + 1)} className="underline font-semibold">Retry</button>
                        </div>
                    </div>
                )}

                {page.loading && !page.loadedAt ? (
                    <div className="flex justify-center py-16" role="status">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" aria-hidden="true" />
                        <span className="sr-only">Loading reports</span>
                    </div>
                ) : visibleReports.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <FileText className="w-12 h-12 text-gray-400" aria-hidden="true" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">No reports found</h2>
                        <p className="text-gray-600">
                            {searchTerm || filtersActive ? 'Try adjusting your search or filters.' : 'No incident reports have been submitted yet.'}
                        </p>
                    </div>
                ) : (
                    <div className={viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 container mx-auto px-4 sm:px-6 lg:px-8'
                        : 'space-y-4 max-w-5xl mx-auto px-4 sm:px-6'}
                    >
                        {visibleReports.map((report) => (viewMode === 'grid'
                            ? <ReportCard key={report.id} report={report} />
                            : <ReportListItem key={report.id} report={report} />))}
                    </div>
                )}

                {page.reports.length > 0 && (
                    <div className="text-center mt-10 px-4">
                        <p className="text-gray-600 mb-4">
                            Showing {visibleReports.length} of {page.count} report{page.count === 1 ? '' : 's'}
                            {searchTerm && ' (search applies to loaded reports)'}
                        </p>
                        {hasMore && (
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={page.loadingMore}
                                className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-300 px-6 py-3 rounded-xl font-semibold text-gray-700 disabled:opacity-50"
                            >
                                {page.loadingMore && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                                {page.loadingMore ? 'Loading…' : 'Load more'}
                            </button>
                        )}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default AllReports;
