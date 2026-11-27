import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// eslint-disable-next-line react-refresh/only-export-components
export const googleEnabled = !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'GOOGLE_CLIENT_ID';

export const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100';

export const Field = ({ id, label, type = 'text', ...props }) => {
    const [visible, setVisible] = useState(false);
    const isPassword = type === 'password';
    return (
        <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor={id}>
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    name={id}
                    type={isPassword && visible ? 'text' : type}
                    className={`${inputClass} ${isPassword ? 'pr-12' : ''}`}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setVisible((v) => !v)}
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:text-blue-600"
                        aria-label={visible ? 'Hide password' : 'Show password'}
                        aria-pressed={visible}
                    >
                        {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                    </button>
                )}
            </div>
        </div>
    );
};

export const SubmitButton = ({ loading, children, loadingText }) => (
    <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
    >
        {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        {loading ? loadingText : children}
    </button>
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
                    size="large"
                    text={text}
                    shape="rectangular"
                    width="320"
                />
            </div>
            <div className="relative mb-4" aria-hidden="true">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-slate-400">or continue with email</span>
                </div>
            </div>
        </>
    );
};

export const FormError = ({ message }) =>
    message ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-800">
            {message}
        </div>
    ) : null;

const AuthLayout = ({ title, subtitle, children, footer }) => (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-teal-50 px-4 py-4">
        <div className="w-full max-w-md">
            <div className="mb-5 text-center">
                <Link to="/" className="mb-2 inline-flex items-center gap-2.5" aria-label="CityShield home">
                    <span className="rounded-xl bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 p-2 shadow">
                        <Shield className="h-5 w-5 text-white" aria-hidden="true" />
                    </span>
                    <span className="text-xl font-black text-slate-900">CityShield</span>
                </Link>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
                <p className="mt-1 text-slate-600">{subtitle}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200/80 sm:p-6">{children}</div>
            <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>
        </div>
    </main>
);

export default AuthLayout;