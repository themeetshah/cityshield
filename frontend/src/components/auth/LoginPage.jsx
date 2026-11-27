import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/api';
import AuthLayout, { Field, FormError, GoogleButton, SubmitButton } from './AuthLayout';

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
                    <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
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
            <form onSubmit={handleSubmit} className="space-y-3.5">
                <Field id="email" label="Email address" type="email" autoComplete="email" required
                    value={form.email} onChange={handleChange} placeholder="you@example.com" />
                <Field id="password" label="Password" type="password" autoComplete="current-password" required
                    value={form.password} onChange={handleChange} placeholder="Your password" />
                <SubmitButton loading={loading} loadingText="Signing in…">Sign in</SubmitButton>
                <FormError message={error} />
            </form>
        </AuthLayout>
    );
};

export default LoginPage;
