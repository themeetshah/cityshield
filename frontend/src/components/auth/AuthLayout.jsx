import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { ShieldCheck } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// eslint-disable-next-line react-refresh/only-export-components
export const googleEnabled = !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'GOOGLE_CLIENT_ID';

export const inputClass =
    'w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-900 placeholder-gray-400 bg-white shadow-sm text-sm';

export const Field = ({ id, label, ...props }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor={id}>
            {label}
        </label>
        <input id={id} name={id} className={inputClass} {...props} />
    </div>
);

export const GoogleButton = ({ onCredential, onError, text }) => {
    if (!googleEnabled) return null;
    return (
        <>
            <div className="mb-4 flex justify-center">
                <GoogleLogin
                    onSuccess={(res) => onCredential(res.credential)}
                    onError={onError}
                    theme="outline"
                    size="medium"
                    text={text}
                    shape="rectangular"
                />
            </div>
            <div className="relative mb-4" aria-hidden="true">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-gray-400 text-xs">or continue with email</span>
                </div>
            </div>
        </>
    );
};

export const FormError = ({ message }) =>
    message ? (
        <div role="alert" className="p-3 bg-red-50 border-l-4 border-red-400 rounded-md text-xs text-red-800 font-medium">
            {message}
        </div>
    ) : null;

const AuthLayout = ({ title, subtitle, children, footer }) => (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
            <div className="text-center mb-5">
                <Link to="/" className="inline-block mb-5" aria-label="CityShield home">
                    <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-3 rounded-2xl shadow-md inline-block">
                        <ShieldCheck className="w-8 h-8 text-white" aria-hidden="true" />
                    </div>
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{title}</h1>
                <p className="text-gray-600 text-sm">{subtitle}</p>
            </div>
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-5 border border-white/50">
                {children}
                <div className="mt-5 text-center text-xs text-gray-500 space-y-3">
                    {footer}
                    <div>
                        <Link to="/" className="text-gray-600 hover:text-gray-800 font-medium hover:underline">
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    </main>
);

export default AuthLayout;
