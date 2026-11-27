import { Link } from 'react-router-dom';
import { ChevronRight, FileText, Map, Phone, Users } from 'lucide-react';
import EMERGENCY_NUMBERS from '../../common/emergencyNumbers';
import { Card, IconChip } from './ui';
import { sosButton } from './styles';

const SHORTCUTS = [
    { to: '/safety-map', label: 'Safety map', text: 'Incidents, stations and hospitals', icon: Map, tone: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
    { to: '/community', label: 'Community', text: 'Official alerts and nearby reports', icon: Users, tone: 'bg-violet-50 text-violet-600 ring-violet-100' },
    { to: '/reports', label: 'All reports', text: 'What people have reported', icon: FileText, tone: 'bg-blue-50 text-blue-600 ring-blue-100' },
];

const helplines = EMERGENCY_NUMBERS.filter((n) => n.number !== '112');

/** Side rail: what to do in an emergency, numbers to call, shortcuts. Stays put while the page scrolls. */
const HelpRail = () => (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:space-y-5" aria-label="Emergency help">
        <section aria-labelledby="sos-help-title" className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
            <h2 id="sos-help-title" className="text-lg font-black tracking-tight">In an emergency</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Tap the red <strong className="font-semibold text-white">SOS</strong> button at the bottom of the screen.
                Police get your live location and camera, and nearby volunteers are alerted. You have 5 seconds to cancel.
            </p>
            <a href="tel:112" className={`${sosButton} mt-5 w-full py-3 text-base`}>
                <Phone className="h-5 w-5" aria-hidden="true" /> Call 112
            </a>
        </section>

        <Card aria-labelledby="numbers-title" className="p-5">
            <h2 id="numbers-title" className="text-lg font-black tracking-tight text-slate-900">Helplines</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2">
                {helplines.map((n) => (
                    <li key={n.number}>
                        <a
                            href={`tel:${n.number}`}
                            className="flex h-full flex-col rounded-2xl bg-slate-50 px-3 py-3 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                        >
                            <span className="text-2xl font-black tabular-nums tracking-tight text-slate-900">{n.number}</span>
                            <span className="mt-0.5 text-sm font-semibold leading-snug text-slate-600">{n.label}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </Card>

        {/* Phones already have these in the navbar menu; keep the page short there. */}
        <Card className="hidden p-3 lg:block">
            <nav aria-label="Shortcuts">
                <ul>
                    {SHORTCUTS.map(({ to, label, text, icon, tone }) => (
                        <li key={to}>
                            <Link to={to} className="group flex items-center gap-3 rounded-2xl p-3 transition hover:bg-slate-50">
                                <IconChip icon={icon} tone={tone} />
                                <span className="min-w-0 flex-1">
                                    <span className="block font-bold text-slate-900">{label}</span>
                                    <span className="block text-xs text-slate-500">{text}</span>
                                </span>
                                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </Card>
    </aside>
);

export default HelpRail;
