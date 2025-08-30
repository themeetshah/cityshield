import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const RegisterPage = () => {
    const { register, googleSignup } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await register({ email: form.email, password: form.password });
            toast.success('Account created successfully');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
            toast.error('Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async (credentialResponse) => {
        try {
            const token = credentialResponse.credential;
            const decoded = JSON.parse(atob(token.split('.')[1]));
            await googleSignup({ email: decoded.email, name: decoded.name });
            toast.success('Signed up with Google successfully');
            navigate('/login');
        } catch {
            toast.error('Google signup failed');
        }
    };

    const handleGoogleError = () => toast.error('Google signup failed');

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 relative">
                {/* Animated Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200 rounded-full opacity-20 animate-pulse" />
                    <div className="absolute bottom-20 right-10 w-24 h-24 bg-indigo-200 rounded-full opacity-30 float-animation" />
                    <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-emerald-200 rounded-full opacity-20 animate-bounce" />
                </div>

                <div className="relative z-10 w-full max-w-xs">
                    {/* Header */}
                    <div className="text-center mb-5">
                        <Link to="/" className="inline-block mb-5">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-md emergency-pulse inline-block">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                    />
                                </svg>
                            </div>
                        </Link>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Join CityShield</h1>
                        <p className="text-gray-600 text-sm">Create your account and start making a difference</p>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-5 border border-white/50">
                        {/* Google Registration */}
                        <div className="mb-4">
                            <GoogleLogin
                                onSuccess={handleGoogleSignup}
                                onError={handleGoogleError}
                                theme="outline"
                                size="medium"
                                width="100%"
                                text="signup_with"
                                shape="rectangular"
                            />
                        </div>

                        {/* Divider */}
                        <div className="relative mb-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white px-2 text-gray-400 text-xs">or create account with email</span>
                            </div>
                        </div>

                        {/* Registration Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="email">
                                    📧 Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-900 placeholder:text-xs placeholder-gray-400 bg-white shadow-sm text-sm"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="password">
                                    🔒 Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-900 placeholder:text-xs placeholder-gray-400 bg-white shadow-sm text-sm"
                                    placeholder="Create a strong password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold py-2.5 rounded-md transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {loading ? 'Creating Account...' : (
                                    <span><span className="mr-1">🛡️</span> Create Account</span>
                                )}
                            </button>

                            {error && (
                                <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded-md text-xs flex items-center mt-1">
                                    <span className="text-lg mr-2">⚠️</span>
                                    <p className="text-red-800 font-medium">{error}</p>
                                </div>
                            )}
                        </form>

                        {/* Switch to Login + Back to Home inline */}
                        <div className="mt-5 text-center text-xs text-gray-500 space-x-2">
                            <div>
                                Already have an account?{' '}
                                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                                    Sign in
                                </Link>
                            </div>
                            <div className='mt-3'>
                                <Link to="/" className="text-gray-600 hover:text-gray-800 font-medium hover:underline">
                                    ← Back to Home
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes float-animation {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        .float-animation { animation: float-animation 6s ease-in-out infinite; }
        @keyframes emergency-pulse {
          0%, 100% { box-shadow: 0 0 0 0 #6366f140; }
          50% { box-shadow: 0 0 32px 16px #6366f140; }
        }
        .emergency-pulse { animation: emergency-pulse 2.5s infinite; }
      `}</style>
        </>
    );
};

export default RegisterPage;
