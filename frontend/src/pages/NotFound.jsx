import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';

const NotFound = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleGoBack = () => {
        navigate(-1);
    };

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center p-4">
                <div className="max-w-2xl mx-auto text-center">
                    {/* Main Error Container */}
                    <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-slate-200">
                        {/* Animated 404 */}
                        <div className="relative mb-8">
                            <h1 className="text-8xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-red-600 animate-pulse">
                                404
                            </h1>
                            <div className="absolute inset-0 text-8xl md:text-9xl font-extrabold text-red-100 -z-10 transform translate-x-1 translate-y-1">
                                404
                            </div>
                        </div>

                        {/* CityShield Branding */}
                        <div className="mb-6">
                            <div className="text-4xl md:text-5xl mb-4 animate-bounce">🛡️</div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
                                Page Not Found
                            </h2>
                            <p className="text-lg text-gray-600 mb-2">
                                This page seems to have gone off the safety grid
                            </p>
                            <p className="text-sm text-gray-500">
                                The page you're looking for doesn't exist or has been moved
                            </p>
                        </div>

                        {/* Safety Status */}
                        {/* <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-4 mb-8">
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-2xl">✅</span>
                                <div>
                                    <p className="text-emerald-700 font-semibold">CityShield Status: Online</p>
                                    <p className="text-emerald-600 text-sm">Safety systems are operational</p>
                                </div>
                            </div>
                        </div> */}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <button
                                onClick={handleGoHome}
                                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                <span className="text-xl">🏠</span>
                                {user ? 'Go to Dashboard' : 'Go to Home'}
                            </button>

                            <button
                                onClick={handleGoBack}
                                className="flex-1 bg-gradient-to-r from-slate-500 to-slate-600 text-white px-6 py-3 rounded-xl font-semibold hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                <span className="text-xl">←</span>
                                Go Back
                            </button>
                        </div>

                        {/* Quick Navigation */}
                        <div className="border-t border-gray-200 pt-6">
                            <p className="text-sm text-gray-600 mb-4">Quick Navigation:</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Link
                                    to="/safety-map"
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1"
                                >
                                    <span>🗺️</span>
                                    Safety Map
                                </Link>

                                <Link
                                    to="/reports"
                                    className="bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1"
                                >
                                    <span>📊</span>
                                    Reports
                                </Link>

                                {user ? (
                                    <>
                                        <Link
                                            to="/report"
                                            className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1"
                                        >
                                            <span>📝</span>
                                            Report
                                        </Link>

                                        <Link
                                            to="/profile"
                                            className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1"
                                        >
                                            <span>👤</span>
                                            Profile
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            to="/login"
                                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1"
                                        >
                                            <span>🔐</span>
                                            Login
                                        </Link>

                                        <Link
                                            to="/register"
                                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1"
                                        >
                                            <span>📝</span>
                                            Sign Up
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Contact Support */}
                        <div className="mt-8 p-4 bg-gray-50 rounded-xl">
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Need Help?</strong>
                            </p>
                            <p className="text-xs text-gray-500">
                                If this is an emergency, use the red SOS button in the bottom-right corner or call emergency services directly.
                            </p>
                        </div>
                    </div>

                    {/* Background Decorations */}
                    <div className="absolute inset-0 -z-10 overflow-hidden">
                        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-red-200 to-orange-200 rounded-full opacity-20 animate-pulse"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-gradient-to-r from-emerald-200 to-green-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default NotFound;
