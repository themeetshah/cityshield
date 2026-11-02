import { Activity, AlertTriangle, Car, CheckCircle, Clock, FileText, TrendingUp, Users } from 'lucide-react';
import { orDash } from './format';
import { LoadingBlock, Panel, StatTile } from './ui';

/** Real metrics from /police/dashboard-stats/. Null metrics show "—". */
const OverviewSection = ({ stats, loading, scopeLabel }) => {
    const period = stats?.period_days ?? 7;
    return (
        <Panel icon={Activity} title="Overview" tone="slate" badge={scopeLabel}>
            {loading && !stats ? (
                <LoadingBlock message="Loading statistics…" />
            ) : !stats ? (
                <p className="p-4 text-sm text-slate-500">Statistics are unavailable right now.</p>
            ) : (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 p-3 sm:p-4">
                    <StatTile icon={AlertTriangle} tone="red" label="Active SOS alerts" value={stats.active_sos} />
                    <StatTile
                        icon={TrendingUp}
                        tone="purple"
                        label="SOS response rate"
                        value={orDash(stats.response_rate, '%')}
                        hint={`${stats.sos_responded_in_period} of ${stats.sos_in_period} in last ${period} days`}
                    />
                    <StatTile
                        icon={Clock}
                        tone="amber"
                        label="Avg. time to first response"
                        value={orDash(stats.avg_response_minutes, ' min')}
                        hint={`Last ${period} days`}
                    />
                    <StatTile icon={FileText} tone="blue" label="Open reports" value={stats.open_reports} />
                    <StatTile
                        icon={FileText}
                        tone="blue"
                        label="New reports"
                        value={stats.reports_in_period}
                        hint={`Last ${period} days`}
                    />
                    <StatTile
                        icon={CheckCircle}
                        tone="green"
                        label="Reports resolved"
                        value={stats.resolved_in_period}
                        hint={`Last ${period} days`}
                    />
                    {stats.active_patrol_teams !== null && (
                        <StatTile icon={Car} tone="blue" label="Patrol teams on duty" value={stats.active_patrol_teams} />
                    )}
                    {stats.available_volunteers !== null && (
                        <StatTile icon={Users} tone="green" label="Volunteers available" value={stats.available_volunteers} />
                    )}
                </div>
            )}
        </Panel>
    );
};

export default OverviewSection;
