import Navbar from './Navbar';
import Footer from './Footer';
import { FadeUp } from '../dashboard/home/ui';

/**
 * Page frame shared by the signed-in pages (dashboard, reports, community, safety map):
 * navbar, the landing-style sky gradient with a dotted backdrop, one content width, footer.
 */
export const PageShell = ({ children, footer = true, className = '' }) => (
    <div className={`min-h-screen bg-white text-slate-900 ${className}`}>
        <Navbar />
        <main className="relative isolate overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white">
            <div
                className="absolute inset-x-0 top-0 -z-10 h-[520px] opacity-60"
                aria-hidden="true"
                style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: '26px 26px',
                    maskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)',
                }}
            />
            <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">{children}</div>
        </main>
        {footer && <Footer showEmergencyNumbers={false} />}
    </div>
);

/** Left-aligned page title (same type as the dashboard greeting) with optional actions on the right. */
export const PageHeader = ({ title, subtitle, actions, children, id = 'page-title' }) => (
    <FadeUp>
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
                <h1 id={id} className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
                {subtitle && <div className="mt-2 max-w-2xl text-slate-600">{subtitle}</div>}
                {children}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">{actions}</div>}
        </header>
    </FadeUp>
);

/** Small rounded status chip used under page titles ("Location set", "SOS active", ...). */
export const StatusChip = ({ tone = 'slate', children, ...props }) => {
    const tones = {
        slate: 'bg-white text-slate-700 ring-slate-200',
        green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        amber: 'bg-amber-50 text-amber-800 ring-amber-100',
        blue: 'bg-blue-50 text-blue-700 ring-blue-100',
        red: 'bg-red-600 text-white ring-red-600',
    };
    return (
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1 ${tones[tone]}`} {...props}>
            {children}
        </span>
    );
};

/** Rounded notice strip (info / warning / error / success / purple). */
export const Notice = ({ tone = 'info', className = '', children, ...props }) => {
    const tones = {
        info: 'bg-blue-50 text-blue-900 ring-blue-100',
        warning: 'bg-amber-50 text-amber-900 ring-amber-100',
        error: 'bg-red-50 text-red-800 ring-red-100',
        success: 'bg-emerald-50 text-emerald-900 ring-emerald-100',
        purple: 'bg-violet-50 text-violet-900 ring-violet-100',
    };
    return (
        <div className={`rounded-2xl px-4 py-3 text-sm ring-1 ${tones[tone]} ${className}`} {...props}>
            {children}
        </div>
    );
};
