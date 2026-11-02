import { useId, useState } from 'react';
import { UserMinus } from 'lucide-react';
import { inputClass } from './format';
import { Field, Modal } from './ui';

const officerLabel = (o) => `${o.name || o.email} (${o.role_label})${o.police_station_name ? ` — ${o.police_station_name}` : ''}`;

/** Create / edit a patrol team. The station comes from the admin's own station, else from the chosen leader. */
export const TeamFormModal = ({ team, officers, stationScoped, onSubmit, onClose }) => {
    const [form, setForm] = useState({
        team_id: team?.team_id || '',
        team_leader: team?.team_leader ? String(team.team_leader) : '',
        vehicle_number: team?.vehicle_number || '',
        is_active: team ? team.is_active : true,
    });
    const [busy, setBusy] = useState(false);
    const ids = { teamId: useId(), leader: useId(), vehicle: useId(), active: useId() };
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        const leader = officers.find((o) => o.id === Number(form.team_leader));
        const payload = { ...form, team_leader: Number(form.team_leader) };
        if (!stationScoped && leader?.police_station) payload.station = leader.police_station;
        setBusy(true);
        const ok = await onSubmit(payload);
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Modal title={team ? `Edit team ${team.team_id}` : 'New patrol team'} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <Field label="Team ID" htmlFor={ids.teamId} hint="e.g. PT-001 or ALPHA-7">
                    <input id={ids.teamId} required maxLength={20} value={form.team_id} onChange={set('team_id')} className={inputClass} />
                </Field>
                <Field
                    label="Team leader"
                    htmlFor={ids.leader}
                    hint={stationScoped ? 'Officers of your station.' : 'The team is created at the leader’s police station.'}
                >
                    <select id={ids.leader} required value={form.team_leader} onChange={set('team_leader')} className={inputClass}>
                        <option value="" disabled>Select an officer…</option>
                        {officers.map((o) => (
                            <option key={o.id} value={o.id} disabled={!o.police_station}>
                                {officerLabel(o)}{o.police_station ? '' : ' — no station assigned'}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Vehicle number (optional)" htmlFor={ids.vehicle}>
                    <input id={ids.vehicle} maxLength={20} value={form.vehicle_number} onChange={set('vehicle_number')} className={inputClass} />
                </Field>
                <div className="flex items-center gap-2">
                    <input id={ids.active} type="checkbox" checked={form.is_active} onChange={set('is_active')} />
                    <label htmlFor={ids.active} className="text-sm text-slate-700">On duty</label>
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold"
                    >
                        {busy ? 'Saving…' : team ? 'Save changes' : 'Create team'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export const MembersModal = ({ team, officers, onAdd, onRemove, onClose }) => {
    const [selected, setSelected] = useState('');
    const [busy, setBusy] = useState(false);
    const selectId = useId();
    const memberIds = new Set([team.team_leader, ...team.members_list.map((m) => m.id)]);
    const candidates = officers.filter((o) => o.police_station === team.station && !memberIds.has(o.id));

    const add = async (e) => {
        e.preventDefault();
        if (!selected) return;
        setBusy(true);
        const ok = await onAdd(team.id, Number(selected));
        setBusy(false);
        if (ok) setSelected('');
    };

    return (
        <Modal title={`Members of ${team.team_id}`} onClose={onClose}>
            <ul className="divide-y divide-slate-100 mb-4">
                <li className="py-2 text-sm">
                    <strong>{team.leader_name}</strong> <span className="text-slate-500">— team leader</span>
                </li>
                {team.members_list.map((m) => (
                    <li key={m.id} className="py-2 flex items-center justify-between text-sm">
                        <span>{m.name || m.email}</span>
                        <button
                            type="button"
                            onClick={() => onRemove(team.id, m.id)}
                            aria-label={`Remove ${m.name || m.email} from ${team.team_id}`}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                        >
                            <UserMinus className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </li>
                ))}
                {team.members_list.length === 0 && <li className="py-2 text-sm text-slate-500">No other members yet.</li>}
            </ul>
            <form onSubmit={add} className="space-y-2">
                <Field label="Add officer" htmlFor={selectId}>
                    <select id={selectId} value={selected} onChange={(e) => setSelected(e.target.value)} className={inputClass}>
                        <option value="">{candidates.length ? 'Select an officer…' : 'No other officers at this station'}</option>
                        {candidates.map((o) => (
                            <option key={o.id} value={o.id}>{officerLabel(o)}</option>
                        ))}
                    </select>
                </Field>
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!selected || busy}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold"
                    >
                        Add member
                    </button>
                </div>
            </form>
        </Modal>
    );
};
