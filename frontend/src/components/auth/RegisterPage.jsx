import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/api';
import AuthLayout, { Field, FormError, GoogleButton, SubmitButton } from './AuthLayout';

const RegisterPage = () => {
    const { register, googleAuth } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (form.password !== form.confirm) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            // Registration always creates a citizen account; roles are assigned by administrators.
            await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
            toast.success('Account created');
            navigate('/', { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Registration failed. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async (credential) => {
        setError(null);
        try {
            await googleAuth(credential);
            toast.success('Signed in with Google');
            navigate('/', { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Google sign-up failed.'));
        }
    };

    return (
        <AuthLayout
            title="Join CityShield"
            subtitle="Create a citizen account"
            footer={
                <div>
                    Already have an account?{' '}
                    <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
                        Sign in
                    </Link>
                </div>
            }
        >
            <GoogleButton
                text="signup_with"
                onCredential={handleGoogle}
                onError={() => setError('Google sign-up failed.')}
            />
            <form onSubmit={handleSubmit} className="space-y-2.5">
                <Field id="name" label="Full name" autoComplete="name" maxLength={100}
                    value={form.name} onChange={handleChange} placeholder="Your name" />
                <Field id="email" label="Email address" type="email" autoComplete="email" required
                    value={form.email} onChange={handleChange} placeholder="you@example.com" />
                <div className="grid gap-3.5 sm:grid-cols-2">
                    <Field id="password" label="Password" type="password" autoComplete="new-password" required minLength={8}
                        value={form.password} onChange={handleChange} placeholder="Min. 8 characters" />
                    <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" required
                        value={form.confirm} onChange={handleChange} placeholder="Repeat password" />
                </div>
                <SubmitButton loading={loading} loadingText="Creating account…">Create account</SubmitButton>
                <FormError message={error} />
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
