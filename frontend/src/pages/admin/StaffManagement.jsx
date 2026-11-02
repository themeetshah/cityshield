import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Pencil, Plus, Power, Search, Trash2, UserCog } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import { useAuth } from '../../context/AuthContext';
import { staffService } from '../../services/staff';
import { errorMessage } from '../../services/api';
import { DEPARTMENTS, departmentLabel, isSuperAdmin, roleLabel } from '../../auth/roles';
import StaffFormModal from './StaffFormModal';

const PAGE_SIZE = 50;

const StatusBadge = ({ active }) => (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
        {active ? 'Active' : 'Deactivated'}
    </span>
);

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : 'Never');

const StaffManagement = () => {
    const { user } = useAuth();
    const superadmin = isSuperAdmin(user);
    const creatableRoles = user?.creatable_roles || [];

    const [filters, setFilters] = useState({ department: '', role: '', is_active: '', search: '' });
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(undefined); // undefined = closed, null = create, object = edit

    const load = useCallback(async (offset = 0) => {
        setLoading(true);
        setError(null);
        try {
            const params = { limit: PAGE_SIZE, offset };
            Object.entries(filters).forEach(([k, v]) => {
                if (v) params[k] = v;
            });
            const data = await staffService.list(params);
            setRows((prev) => (offset ? [...prev, ...data.results] : data.results));
            setTotal(data.total_count);
        } catch (err) {
            setError(errorMessage(err, 'Could not load accounts.'));
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        load(0);
    }, [load]);

    useEffect(() => {
        const t = setTimeout(() => setFilters((f) => (f.search === search ? f : { ...f, search })), 300);
        return () => clearTimeout(t);
    }, [search]);

    const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

    const handleSaved = (saved, isEdit) => {
        setEditing(undefined);
        toast.success(isEdit ? 'Account updated' : `${roleLabel(saved.role)} account created`);
        if (isEdit) setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
        else load(0);
    };

    const toggleActive = async (member) => {
        const verb = member.is_active ? 'Deactivate' : 'Reactivate';
        if (!window.confirm(`${verb} ${member.email}?`)) return;
        try {
            const saved = await staffService.update(member.id, { is_active: !member.is_active });
            setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
            toast.success(`${verb}d ${member.email}`);
        } catch (err) {
            toast.error(errorMessage(err));
        }
    };

    const remove = async (member) => {
        if (!window.confirm(`Permanently delete ${member.email}? This cannot be undone. Prefer deactivating.`)) return;
        try {
            await staffService.remove(member.id);
            setRows((prev) => prev.filter((r) => r.id !== member.id));
            setTotal((t) => t - 1);
            toast.success('Account deleted');
        } catch (err) {
            toast.error(errorMessage(err));
        }
    };

    const scopeText = superadmin
        ? 'As super admin you can create department admins and staff for every department, and manage every account.'
        : `You manage ${departmentLabel(user?.department)} staff${user?.police_station_name ? ` at ${user.police_station_name}` : ''}. Department admins are created by the super admin.`;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="container mx-auto px-3 sm:px-6 py-6 sm:py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <UserCog className="w-6 h-6 text-blue-600" aria-hidden="true" /> Staff management
                        </h1>
                        <p className="text-sm text-gray-600 mt-1 max-w-2xl">{scopeText}</p>
                    </div>
                    {creatableRoles.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow self-start"
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" /> New account
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                        <label htmlFor="staff-search" className="sr-only">Search</label>
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                        <input
                            id="staff-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name or email"
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                    {superadmin && (
                        <div>
                            <label htmlFor="staff-dept" className="sr-only">Department</label>
                            <select id="staff-dept" value={filters.department} onChange={setFilter('department')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="">All departments</option>
                                {Object.entries(DEPARTMENTS).map(([key, d]) => (
                                    <option key={key} value={key}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {superadmin && (
                        <div>
                            <label htmlFor="staff-role-filter" className="sr-only">Role</label>
                            <select id="staff-role-filter" value={filters.role} onChange={setFilter('role')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="">All roles</option>
                                {[...creatableRoles, 'volunteer', 'citizen'].map((r) => (
                                    <option key={r} value={r}>{roleLabel(r)}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label htmlFor="staff-active" className="sr-only">Status</label>
                        <select id="staff-active" value={filters.is_active} onChange={setFilter('is_active')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                            <option value="">Any status</option>
                            <option value="true">Active</option>
                            <option value="false">Deactivated</option>
                        </select>
                    </div>
                </div>

                {error && <p role="alert" className="mb-4 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                        <caption className="sr-only">Accounts you manage</caption>
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr>
                                <th scope="col" className="px-4 py-3">Name</th>
                                <th scope="col" className="px-4 py-3">Role</th>
                                <th scope="col" className="px-4 py-3 hidden md:table-cell">Station</th>
                                <th scope="col" className="px-4 py-3 hidden lg:table-cell">Last sign-in</th>
                                <th scope="col" className="px-4 py-3">Status</th>
                                <th scope="col" className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.map((m) => (
                                <tr key={m.id} className={m.is_active ? '' : 'bg-gray-50 text-gray-500'}>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-gray-900">{m.name || '—'}</div>
                                        <div className="text-xs text-gray-500 break-all">{m.email}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>{m.role_label}</div>
                                        {m.department && <div className="text-xs text-gray-500">{departmentLabel(m.department)}</div>}
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">{m.police_station_name || '—'}</td>
                                    <td className="px-4 py-3 hidden lg:table-cell">{formatDate(m.last_login)}</td>
                                    <td className="px-4 py-3"><StatusBadge active={m.is_active} /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            <button type="button" onClick={() => setEditing(m)} className="p-2 rounded-lg hover:bg-gray-100" aria-label={`Edit ${m.email}`}>
                                                <Pencil className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                            <button type="button" onClick={() => toggleActive(m)} className="p-2 rounded-lg hover:bg-gray-100" aria-label={`${m.is_active ? 'Deactivate' : 'Reactivate'} ${m.email}`}>
                                                <Power className={`w-4 h-4 ${m.is_active ? 'text-amber-600' : 'text-green-600'}`} aria-hidden="true" />
                                            </button>
                                            {superadmin && (
                                                <button type="button" onClick={() => remove(m)} className="p-2 rounded-lg hover:bg-red-50" aria-label={`Delete ${m.email}`}>
                                                    <Trash2 className="w-4 h-4 text-red-600" aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                                        No accounts match these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {loading && <p className="px-4 py-4 text-sm text-gray-500" role="status">Loading…</p>}
                </div>

                {!loading && rows.length < total && (
                    <div className="text-center mt-4">
                        <button type="button" onClick={() => load(rows.length)} className="px-4 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50">
                            Load more ({total - rows.length} remaining)
                        </button>
                    </div>
                )}
            </main>

            {editing !== undefined && (
                <StaffFormModal
                    member={editing}
                    creatableRoles={creatableRoles}
                    actor={user}
                    onClose={() => setEditing(undefined)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
};

export default StaffManagement;
