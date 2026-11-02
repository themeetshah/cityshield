import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/api';
import AuthLayout, { Field, FormError, GoogleButton } from './AuthLayout';

const LoginPage = () => {
    const { login, googleAuth } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const redirectTo = location.state?.from?.pathname || '/';
    const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(form);
            toast.success('Signed in');
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Sign-in failed. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async (credential) => {
        setError(null);
        try {
            await googleAuth(credential);
            toast.success('Signed in with Google');
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Google sign-in failed.'));
        }
    };

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to CityShield"
            footer={
                <div>
                    New to CityShield?{' '}
                    <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                        Create an account
                    </Link>
                </div>
            }
        >
            <GoogleButton
                text="signin_with"
                onCredential={handleGoogle}
                onError={() => setError('Google sign-in failed.')}
            />
            <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
                <Field id="email" label="Email address" type="email" autoComplete="email" required
                    value={form.email} onChange={handleChange} placeholder="you@example.com" />
                <Field id="password" label="Password" type="password" autoComplete="current-password" required
                    value={form.password} onChange={handleChange} placeholder="Your password" />
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold py-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    {loading ? 'Signing in…' : 'Sign in'}
                </button>
                <FormError message={error} />
            </form>
            <p className="mt-4 text-[11px] text-gray-500 text-center">
                Department staff accounts are created by your department administrator.
            </p>
        </AuthLayout>
    );
};

export default LoginPage;
