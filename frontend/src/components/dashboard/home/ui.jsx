// Shared building blocks for the citizen / volunteer home - same visual language
// as the landing page (rounded-3xl cards, tinted icon chips, blue primary buttons).
import { motion as Motion, useReducedMotion } from 'framer-motion';

export const Card = ({ className = '', children, ...props }) => (
    <section className={`rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`} {...props}>
        {children}
    </section>
);

/** Tinted icon chip, e.g. tone="bg-blue-50 text-blue-600 ring-blue-100". */
export const IconChip = ({ icon: Icon, tone, size = 'md' }) => (
    <span className={`inline-flex shrink-0 items-center justify-center ring-1 ${size === 'lg' ? 'p-3 rounded-2xl' : 'p-2.5 rounded-xl'} ${tone}`}>
        <Icon className={size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} aria-hidden="true" />
    </span>
);

/** Card heading row: icon chip + title + optional subtitle, actions on the right. */
export const CardHeader = ({ icon, tone, title, id, subtitle, children }) => (
    <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
            <IconChip icon={icon} tone={tone} />
            <div className="min-w-0">
                <h2 id={id} className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">{title}</h2>
                {subtitle && <p className="mt-0.5 text-slate-600">{subtitle}</p>}
            </div>
        </div>
        {children}
    </div>
);

/** One gentle fade-up on page load (skipped for reduced motion), like the landing hero. */
export const FadeUp = ({ delay = 0, className = '', children }) => {
    const reduce = useReducedMotion();
    return (
        <Motion.div
            className={className}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: 'easeOut' }}
        >
            {children}
        </Motion.div>
    );
};

export const Skeleton = ({ className = '' }) => <div className={`rounded-xl bg-slate-100 animate-pulse ${className}`} aria-hidden="true" />;
