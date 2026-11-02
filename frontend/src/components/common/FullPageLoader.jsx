import { Shield } from 'lucide-react';

const FullPageLoader = ({ message = 'Loading CityShield…' }) => (
    <div
        className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center"
        role="status"
        aria-live="polite"
    >
        <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-600 rounded-full flex items-center justify-center relative">
                <Shield className="w-10 h-10 text-white" aria-hidden="true" />
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-4">{message}</p>
            <div className="flex justify-center space-x-2" aria-hidden="true">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
        </div>
    </div>
);

export default FullPageLoader;
