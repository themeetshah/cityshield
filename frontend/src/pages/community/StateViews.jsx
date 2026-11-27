import { AlertCircle, MapPinOff, RefreshCw } from 'lucide-react';

const retryButton =
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold ring-1 transition';

export const EmptyState = ({ icon: Icon, title, children, action }) => (
    <div className="mx-auto max-w-lg rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200">
        {Icon && (
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
        )}
        <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
        {children && <div className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-600">{children}</div>}
        {action && <div className="mt-6">{action}</div>}
    </div>
);

export const SectionError = ({ message, onRetry }) => (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-red-50 px-4 py-3 text-red-800 ring-1 ring-red-100 sm:flex-row sm:items-center">
        <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-sm">{message}</span>
        {onRetry && (
            <button type="button" onClick={onRetry} className={`${retryButton} text-red-700 ring-red-200 hover:bg-red-100`}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
            </button>
        )}
    </div>
);

export const SectionLoading = ({ label = 'Loading…' }) => (
    <div role="status" className="flex items-center justify-center gap-3 py-14 text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" aria-hidden="true" />
        <span>{label}</span>
    </div>
);

/** Shown instead of location-based sections when the device location is unknown. */
export const LocationNeeded = ({ error, loading, onRetry }) => (
    <div className="flex flex-col gap-4 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100 sm:flex-row sm:items-center">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 ring-1 ring-amber-200">
            <MapPinOff className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="flex-1">
            <p className="font-bold text-amber-900">
                {loading ? 'Getting your location…' : 'Your location is needed for nearby information'}
            </p>
            {!loading && (
                <p className="mt-1 text-sm text-amber-800">
                    {error || 'Location is unavailable.'} Nearby reports and emergencies are hidden until your location is
                    available. Official alerts are still shown.
                </p>
            )}
        </div>
        {!loading && onRetry && (
            <button type="button" onClick={onRetry} className={`${retryButton} text-amber-800 ring-amber-300 hover:bg-amber-100`}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry location
            </button>
        )}
    </div>
);
