import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2, MapPin, UserCog } from 'lucide-react';
import { DEPARTMENTS } from '../../../auth/roles';
import { RADIUS_OPTIONS_M, formatKm } from './format';

const NavItem = ({ icon: Icon, label, count, active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={`flex-shrink-0 lg:w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${active ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}
    >
        <span className="flex items-center gap-2">
            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {label}
        </span>
        {count !== undefined && count !== null && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-blue-200 text-blue-900' : 'bg-slate-200 text-slate-700'}`}>
                {count}
            </span>
        )}
    </button>
);

const LocationFilter = ({ enabled, onToggle, radiusM, onRadius, geo }) => {
    const radiusId = useId();
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4" aria-hidden="true" /> Near me
                </span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label="Only show incidents near my location"
                    onClick={onToggle}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${enabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}
                >
                    {enabled ? 'ON' : 'OFF'}
                </button>
            </div>
            {enabled && (
                <>
                    <label htmlFor={radiusId} className="text-xs text-slate-600 block">Radius</label>
                    <select
                        id={radiusId}
                        value={radiusM}
                        onChange={(e) => onRadius(Number(e.target.value))}
                        className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white"
                    >
                        {RADIUS_OPTIONS_M.map((r) => (
                            <option key={r} value={r}>{formatKm(r)}</option>
                        ))}
                    </select>
                    {geo.loading && (
                        <p className="text-xs text-slate-500 flex items-center gap-1" role="status">
                            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Getting your location…
                        </p>
                    )}
                    {geo.error && !geo.location && (
                        <p className="text-xs text-red-700" role="alert">
                            {geo.error} Showing all incidents instead.{' '}
                            <button type="button" onClick={geo.refresh} className="underline">Try again</button>
                        </p>
                    )}
                    {geo.location && (
                        <p className="text-xs text-green-700">
                            Using your location{geo.location.accuracy ? ` (±${Math.round(geo.location.accuracy)} m)` : ''}.
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

const Sidebar = ({ sections, active, onSelect, location, department, onDepartment, showDepartmentFilter, showStaffLink }) => {
    const deptId = useId();
    return (
        <div className="space-y-3">
            <nav aria-label="Operations sections" className="bg-white border border-slate-200 rounded-xl shadow-sm p-2 flex lg:flex-col gap-1 overflow-x-auto">
                {sections.map((s) => (
                    <NavItem
                        key={s.key}
                        icon={s.icon}
                        label={s.label}
                        count={s.count}
                        active={active === s.key}
                        onClick={() => onSelect(s.key)}
                    />
                ))}
            </nav>

            {showDepartmentFilter && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 space-y-1">
                    <label htmlFor={deptId} className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4" aria-hidden="true" /> Department
                    </label>
                    <select
                        id={deptId}
                        value={department}
                        onChange={(e) => onDepartment(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white"
                    >
                        <option value="">All departments</option>
                        {Object.entries(DEPARTMENTS).map(([key, d]) => (
                            <option key={key} value={key}>{d.label}</option>
                        ))}
                    </select>
                </div>
            )}

            <LocationFilter {...location} />

            {showStaffLink && (
                <Link
                    to="/admin/staff"
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
                >
                    <UserCog className="w-4 h-4" aria-hidden="true" /> Manage staff
                </Link>
            )}
        </div>
    );
};

export default Sidebar;
