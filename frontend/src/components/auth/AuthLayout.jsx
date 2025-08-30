import React from 'react';

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-3 sm:p-4 lg:p-6 relative overflow-hidden">
            {/* Safety-themed Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="hidden sm:block">
                    <div className="absolute top-20 left-20 text-red-400 text-4xl sm:text-6xl opacity-10 animate-pulse">
                        🚨
                    </div>
                    <div className="absolute top-1/4 right-20 text-orange-400 text-3xl sm:text-4xl opacity-10 float-animation">
                        🏥
                    </div>
                    <div className="absolute bottom-32 left-1/4 text-blue-400 text-4xl sm:text-5xl opacity-10">
                        🚔
                    </div>
                </div>

                <div className="absolute w-20 h-20 sm:w-32 sm:h-32 bg-red-300 rounded-full top-16 right-8 sm:right-16 opacity-20 animate-bounce"></div>
                <div className="absolute w-16 h-16 sm:w-24 sm:h-24 bg-orange-300 rounded-full bottom-24 left-8 sm:left-16 opacity-20 animate-pulse"></div>
            </div>

            <div className="w-full max-w-sm sm:max-w-md relative z-10">
                {/* Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <div className="flex justify-center mb-4 sm:mb-6">
                        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xl emergency-pulse">
                            <svg className="w-8 h-8 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent mb-2 sm:mb-3">
                        CityShield
                    </h1>
                    <p className="text-sm sm:text-lg text-gray-600 mb-2">
                        🛡️ Your Safety, Your City, Your Voice 🛡️
                    </p>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-1 sm:mb-2">
                        {title}
                    </h2>
                    <p className="text-sm sm:text-lg text-gray-600">{subtitle}</p>
                </div>

                {/* Form Card */}
                <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/30 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5">
                        <div className="text-4xl sm:text-6xl text-red-500 absolute top-4 right-4">🚨</div>
                        <div className="text-2xl sm:text-4xl text-blue-500 absolute bottom-4 left-4">🛡️</div>
                    </div>

                    <div className="relative z-10">
                        {children}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-4 sm:mt-6 space-y-2">
                    <p className="text-gray-600 text-xs sm:text-sm">
                        🚨 <span className="font-bold text-red-600">Emergency? Use SOS button</span> 🚨
                    </p>
                    <p className="text-gray-500 text-xs">
                        © 2025 CityShield - Making Cities Safer Together
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
