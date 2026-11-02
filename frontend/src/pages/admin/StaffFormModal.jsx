import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { staffService } from '../../services/staff';
import { errorMessage } from '../../services/api';
import { departmentOfRole, roleLabel } from '../../auth/roles';

const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400';

const StationPicker = ({ value, valueLabel, onChange, lockedToOwn }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    useEffect(() => {
        let cancelled = false;
        const t = setTimeout(async () => {
            try {
                const rows = await staffService.searchStations(query);
                if (!cancelled) setResults(rows);
            } catch {
                if (!cancelled) setResults([]);
            }
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [query]);

    return (
        <div>
            <label htmlFor="station-search" className="block text-xs font-semibold text-gray-700 mb-1">
                Police station {lockedToOwn && <span className="font-normal text-gray-500">(your station)</span>}
            </label>
            {value ? (
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <span>{valueLabel || `Station #${value}`}</span>
                    <button type="button" className="text-blue-700 text-xs font-semibold" onClick={() => onChange(null, '')}>
                        Change
                    </button>
                </div>
            ) : (
                <>
                    <input
                        id="station-search"
                        className={inputClass}
                        placeholder="Search by name or city"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <ul className="mt-1 max-h-40 overflow-y-auto border border-gray-100 rounded-lg divide-y" aria-label="Matching stations">
                        {results.length === 0 && <li className="px-3 py-2 text-xs text-gray-500">No stations found</li>}
                        {results.map((s) => (
                            <li key={s.id}>
                                <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                    onClick={() => onChange(s.id, s.name)}
                                >
                                    {s.name}
                                    <span className="text-xs text-gray-500"> {[s.city, s.state].filter(Boolean).join(', ')}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

/**
 * Create (member == null) or edit a staff account.
 * `creatableRoles` comes from the server (`user.creatable_roles`).
 */
const StaffFormModal = ({ member, creatableRoles, actor, onClose, onSaved }) => {
    const isEdit = !!member;
    const dialogRef = useRef(null);
    const [form, setForm] = useState(() => ({
        email: member?.email || '',
        name: member?.name || '',
        phone: member?.phone || '',
        role: member?.role || creatableRoles[0] || '',
        password: '',
        police_station: member?.police_station ?? null,
        police_station_name: member?.police_station_name || '',
    }));
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const isPoliceRole = departmentOfRole(form.role) === 'police';
    const roleOptions = isEdit && !creatableRoles.includes(member.role) ? [member.role, ...creatableRoles] : creatableRoles;

    useEffect(() => {
        dialogRef.current?.querySelector('input,select')?.focus();
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSaving(true);
        const payload = {
            name: form.name.trim(),
            phone: form.phone.trim(),
            police_station: isPoliceRole ? form.police_station : null,
        };
        if (!isEdit || form.role !== member.role) payload.role = form.role;
        if (form.password) payload.password = form.password;
        try {
            const saved = isEdit
                ? await staffService.update(member.id, payload)
                : await staffService.create({ ...payload, email: form.email.trim() });
            onSaved(saved, isEdit);
        } catch (err) {
            setError(errorMessage(err, 'Could not save this account.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onMouseDown={onClose}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="staff-form-title"
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h2 id="staff-form-title" className="text-lg font-bold text-gray-900">
                        {isEdit ? `Edit ${member.name || member.email}` : 'Create account'}
                    </h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-gray-100">
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label htmlFor="staff-role" className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                        <select
                            id="staff-role"
                            className={inputClass}
                            value={form.role}
                            onChange={set('role')}
                            disabled={roleOptions.length < 2}
                            required
                        >
                            {roleOptions.map((r) => (
                                <option key={r} value={r}>{roleLabel(r)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="staff-email" className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                        <input id="staff-email" type="email" className={inputClass} value={form.email}
                            onChange={set('email')} required disabled={isEdit} autoComplete="off" />
                    </div>
                    <div>
                        <label htmlFor="staff-name" className="block text-xs font-semibold text-gray-700 mb-1">Full name</label>
                        <input id="staff-name" className={inputClass} value={form.name} onChange={set('name')} required maxLength={100} />
                    </div>
                    <div>
                        <label htmlFor="staff-phone" className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                        <input id="staff-phone" type="tel" className={inputClass} value={form.phone} onChange={set('phone')}
                            pattern="\+?[0-9]{7,15}" title="7-15 digits, optional leading +" />
                    </div>
                    {isPoliceRole && (
                        <StationPicker
                            value={form.police_station}
                            valueLabel={form.police_station_name}
                            lockedToOwn={!actor.is_superadmin && !!actor.police_station}
                            onChange={(id, name) => setForm((f) => ({ ...f, police_station: id, police_station_name: name }))}
                        />
                    )}
                    <div>
                        <label htmlFor="staff-password" className="block text-xs font-semibold text-gray-700 mb-1">
                            {isEdit ? 'New password (leave blank to keep)' : 'Initial password'}
                        </label>
                        <input id="staff-password" type="password" className={inputClass} value={form.password}
                            onChange={set('password')} required={!isEdit} minLength={8} autoComplete="new-password" />
                        {!isEdit && (
                            <p className="mt-1 text-[11px] text-gray-500">Share it securely; ask them to change it after first sign-in.</p>
                        )}
                    </div>
                    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StaffFormModal;
