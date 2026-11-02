import { AlertCircle, MapPinOff, RefreshCw } from 'lucide-react';

export const EmptyState = ({ icon: Icon, title, children, action }) => (
    <div className="text-center py-14 px-4 bg-white rounded-2xl border border-gray-200">
        {Icon && (
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Icon className="w-8 h-8 text-gray-400" aria-hidden="true" />
            </div>
        )}
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        {children && <div className="text-gray-600 max-w-md mx-auto">{children}</div>}
        {action && <div className="mt-6">{action}</div>}
    </div>
);

export const SectionError = ({ message, onRetry }) => (
    <div role="alert" className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
        <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1 text-sm">{message}</span>
        {onRetry && (
            <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-sm font-medium hover:bg-red-100"
            >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Try again
            </button>
        )}
    </div>
);

export const SectionLoading = ({ label = 'Loading…' }) => (
    <div role="status" className="flex items-center justify-center gap-3 py-14 text-gray-500">
        <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <span>{label}</span>
    </div>
);

/** Shown instead of location-based sections when the device location is unknown. */
export const LocationNeeded = ({ error, loading, onRetry }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
        <MapPinOff className="w-8 h-8 text-amber-600 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1">
            <p className="font-semibold text-amber-900">
                {loading ? 'Getting your location…' : 'Your location is needed for nearby information'}
            </p>
            {!loading && (
                <p className="text-sm text-amber-800 mt-1">
                    {error || 'Location is unavailable.'} Nearby reports and emergencies are hidden until your
                    location is available. Official alerts below are still shown.
                </p>
            )}
        </div>
        {!loading && onRetry && (
            <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700"
            >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Retry location
            </button>
        )}
    </div>
);
