import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Car, Crosshair, Edit, Plus, Power, Trash2, Users } from 'lucide-react';
import { errorMessage } from '../../../services/api';
import {
    addTeamMember, createPatrolTeam, deletePatrolTeam, getPoliceOfficers, removeTeamMember, toggleTeamStatus,
    updatePatrolTeam, updateTeamLocation,
} from '../../../services/operations';
import { getCurrentPosition } from '../../../hooks/useGeolocation';
import { DISPATCH_STEPS, staggerDelay, timeAgo } from './format';
import { MembersModal, TeamFormModal } from './TeamModals';
import { EmptyState, ErrorBanner, LoadingBlock, Panel } from './ui';

const MotionArticle = motion.article;

/** Runs an API call with toasts; returns true on success. */
const run = async (fn, success, failure) => {
    try {
        const res = await fn();
        toast.success(res?.data?.message || res?.message || success);
        return true;
    } catch (err) {
        toast.error(errorMessage(err, failure));
        return false;
    }
};

const IconButton = ({ label, onClick, icon: Icon, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className={`p-2 rounded-lg border border-slate-200 hover:bg-slate-50 ${className}`}
    >
        <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
);

const TeamCard = ({ team, index, canManage, isMember, onEdit, onMembers, onToggle, onDelete, onShareLocation }) => (
    <MotionArticle
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: staggerDelay(index) }}
        className="border border-slate-200 rounded-xl p-3 sm:p-4 bg-white space-y-2"
    >
        <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
                <h3 className="font-bold text-slate-900">{team.team_id}</h3>
                <p className="text-xs text-slate-500">{team.station_name}{team.vehicle_number && ` · ${team.vehicle_number}`}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${team.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
                {team.is_active ? 'On duty' : 'Off duty'}
            </span>
        </div>
        <p className="text-sm text-slate-700">
            Leader: <strong>{team.leader_name}</strong> · {team.member_count} member{team.member_count === 1 ? '' : 's'}
        </p>
        {team.current_assignment ? (
            <p className="text-xs bg-red-50 border border-red-200 text-red-800 rounded-lg px-2 py-1">
                On SOS #{team.current_assignment.sos_id} — {DISPATCH_STEPS[team.current_assignment.status]}
            </p>
        ) : (
            team.is_active && <p className="text-xs text-green-700">Available for dispatch</p>
        )}
        <p className="text-xs text-slate-500">
            {team.location_updated_at ? `Position reported ${timeAgo(team.location_updated_at)}` : 'No position reported yet'}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
            {(canManage || isMember) && (
                <button
                    type="button"
                    onClick={() => onShareLocation(team)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold"
                >
                    <Crosshair className="w-3.5 h-3.5" aria-hidden="true" /> Report my position
                </button>
            )}
            {canManage && (
                <>
                    <IconButton label={`Edit ${team.team_id}`} icon={Edit} onClick={() => onEdit(team)} />
                    <IconButton label={`Manage members of ${team.team_id}`} icon={Users} onClick={() => onMembers(team)} />
                    <IconButton
                        label={team.is_active ? `Take ${team.team_id} off duty` : `Put ${team.team_id} on duty`}
                        icon={Power}
                        onClick={() => onToggle(team)}
                    />
                    <IconButton label={`Delete ${team.team_id}`} icon={Trash2} onClick={() => onDelete(team)} className="text-red-600" />
                </>
            )}
        </div>
    </MotionArticle>
);

const PatrolTeamsSection = ({ user, data, loading, error, onRetry, onChanged }) => {
    const teams = data?.results || [];
    const canManage = !!data?.can_manage;
    const stationScoped = !!data?.station_filtered;
    const [officers, setOfficers] = useState([]);
    const [form, setForm] = useState(null); // { team } | { team: null } for create
    const [membersTeamId, setMembersTeamId] = useState(null);

    useEffect(() => {
        if (!canManage) return undefined;
        let cancelled = false;
        getPoliceOfficers()
            .then((res) => {
                if (!cancelled) setOfficers(res.officers || []);
            })
            .catch((err) => toast.error(errorMessage(err, 'Could not load officers.')));
        return () => {
            cancelled = true;
        };
    }, [canManage]);

    const after = (ok) => {
        if (ok) onChanged();
        return ok;
    };

    const saveTeam = async (payload) =>
        after(await run(
            () => (form.team ? updatePatrolTeam(form.team.id, payload) : createPatrolTeam(payload)),
            form.team ? 'Team updated' : 'Team created',
            'Could not save the team.'
        ));

    const deleteTeam = async (team) => {
        if (!window.confirm(`Delete patrol team ${team.team_id}? This cannot be undone.`)) return;
        after(await run(() => deletePatrolTeam(team.id), `Team ${team.team_id} deleted`, 'Could not delete the team.'));
    };

    const shareLocation = async (team) => {
        try {
            const pos = await getCurrentPosition();
            after(await run(() => updateTeamLocation(team.id, pos.latitude, pos.longitude), 'Position updated', 'Could not update the position.'));
        } catch (err) {
            toast.error(err.message);
        }
    };

    const isMember = (team) => team.team_leader === user.id || team.members_list.some((m) => m.id === user.id);
    const membersTeam = teams.find((t) => t.id === membersTeamId);

    return (
        <Panel
            icon={Car}
            title="Patrol teams"
            tone="blue"
            badge={data ? `${teams.filter((t) => t.is_active).length} on duty` : null}
            actions={
                canManage && (
                    <button
                        type="button"
                        onClick={() => setForm({ team: null })}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                    >
                        <Plus className="w-4 h-4" aria-hidden="true" /> New team
                    </button>
                )
            }
        >
            {error && <ErrorBanner message={error} onRetry={onRetry} />}
            {loading && !data ? (
                <LoadingBlock message="Loading patrol teams…" />
            ) : teams.length === 0 ? (
                <EmptyState
                    icon={Car}
                    title="No patrol teams"
                    subtitle={canManage ? 'Create the first team for your station.' : 'Your station has no patrol teams yet.'}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4">
                    {teams.map((team, index) => (
                        <TeamCard
                            key={team.id}
                            team={team}
                            index={index}
                            canManage={canManage}
                            isMember={isMember(team)}
                            onEdit={(t) => setForm({ team: t })}
                            onMembers={(t) => setMembersTeamId(t.id)}
                            onToggle={async (t) => after(await run(() => toggleTeamStatus(t.id), 'Team status updated', 'Could not update the team.'))}
                            onDelete={deleteTeam}
                            onShareLocation={shareLocation}
                        />
                    ))}
                </div>
            )}

            {form && (
                <TeamFormModal
                    team={form.team}
                    officers={officers}
                    stationScoped={stationScoped}
                    onSubmit={saveTeam}
                    onClose={() => setForm(null)}
                />
            )}
            {membersTeam && (
                <MembersModal
                    team={membersTeam}
                    officers={officers}
                    onAdd={async (teamId, userId) => after(await run(() => addTeamMember(teamId, userId), 'Member added', 'Could not add the member.'))}
                    onRemove={async (teamId, userId) => after(await run(() => removeTeamMember(teamId, userId), 'Member removed', 'Could not remove the member.'))}
                    onClose={() => setMembersTeamId(null)}
                />
            )}
        </Panel>
    );
};

export default PatrolTeamsSection;
