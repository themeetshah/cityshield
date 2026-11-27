import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { humanize } from './format';
import { EmptyState } from './StateViews';

const AXIS_TICK = { fill: '#64748b', fontSize: 12 };

const STATUS_COLORS = {
    pending: '#d97706',
    investigating: '#2563eb',
    resolved: '#059669',
    dismissed: '#6b7280',
};

const buildInsights = (reports) => {
    const byType = new Map();
    const byStatus = new Map();
    reports.forEach((r) => {
        const type = r.report_type_display || humanize(r.report_type) || 'Other';
        byType.set(type, (byType.get(type) || 0) + 1);
        const status = r.status || 'pending';
        byStatus.set(status, (byStatus.get(status) || 0) + 1);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return d;
    });
    const timeline = days.map((day) => {
        const next = new Date(day);
        next.setDate(day.getDate() + 1);
        return {
            day: day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
            Reports: reports.filter((r) => {
                const t = new Date(r.created_at);
                return t >= day && t < next;
            }).length,
        };
    });

    return {
        byType: [...byType.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        byStatus: [...byStatus.entries()].map(([status, value]) => ({
            status,
            name: humanize(status),
            value,
        })),
        timeline,
    };
};

const ChartCard = ({ title, description, children }) => (
    <figure className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <figcaption className="mb-4">
            <h3 className="text-lg font-black tracking-tight text-slate-900">{title}</h3>
            {description && <p className="text-sm text-slate-500">{description}</p>}
        </figcaption>
        <div className="h-72">{children}</div>
    </figure>
);

const InsightsPanel = ({ reports, radiusLabel }) => {
    const insights = useMemo(() => buildInsights(reports), [reports]);

    if (reports.length === 0) {
        return (
            <EmptyState icon={BarChart3} title="No data to analyse yet">
                Insights are calculated from citizen reports within {radiusLabel} of you. None have been submitted yet.
            </EmptyState>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600">
                Based on {reports.length} citizen report{reports.length === 1 ? '' : 's'} within {radiusLabel} of your
                location.
            </p>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ChartCard title="Reports by category">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={insights.byType} layout="vertical" margin={{ left: 24 }}>
                            <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={110} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="value" name="Reports" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Reports in the last 7 days">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={insights.timeline}>
                            <CartesianGrid stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="Reports" fill="#6366f1" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Report status" description="How nearby reports are being handled">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={insights.byStatus}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={95}
                                label={({ name, value }) => `${name}: ${value}`}
                            >
                                {insights.byStatus.map((entry) => (
                                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#9ca3af'} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
};

export default InsightsPanel;
