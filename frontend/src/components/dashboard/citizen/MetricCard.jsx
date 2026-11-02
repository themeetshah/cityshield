const MetricCard = ({ title, value, subtitle, icon: Icon, color, loaded }) => (
    <div className="relative bg-white rounded-3xl p-6 shadow-lg border border-gray-100 overflow-hidden">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg mb-5`}>
            <Icon className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <h3 className="text-gray-600 text-xs sm:text-sm font-bold uppercase tracking-wider">{title}</h3>
        <div className="text-3xl sm:text-4xl font-black text-gray-900 mt-2" aria-live="polite">
            {loaded ? (
                value.toLocaleString()
            ) : (
                <span className="block h-9 w-16 bg-gray-200 rounded-xl animate-pulse" aria-label="Loading" />
            )}
        </div>
        {subtitle && <p className="text-gray-500 text-xs sm:text-sm font-medium mt-2">{subtitle}</p>}
    </div>
);

export default MetricCard;
