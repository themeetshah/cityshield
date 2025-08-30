import React, { useState, useEffect } from 'react';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import EmergencyButton from '../sos/EmergencyButton';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate()
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const features = [
        {
            icon: "📝",
            title: "Reports",
            description: "Report safety concerns, infrastructure issues, or suspicious activities instantly",
            color: "from-blue-600 via-blue-500 to-indigo-600",
            hoverColor: "from-blue-700 via-blue-600 to-indigo-700",
            link: "/reports"
        },
        {
            icon: "🗺️",
            title: "Safety Map",
            description: "View real-time safety alerts and reports in your neighborhood",
            color: "from-emerald-600 via-teal-500 to-cyan-600",
            hoverColor: "from-emerald-700 via-teal-600 to-cyan-700",
            link: "/safety-map"
        },
        // {
        //     icon: "🚨",
        //     title: "Emergency SOS",
        //     description: "One-tap police emergency alert with precise location sharing",
        //     color: "from-red-600 via-rose-500 to-pink-600",
        //     hoverColor: "from-red-700 via-rose-600 to-pink-700",
        //     link: "/sos/emergency/"
        // }
    ];

    const testimonials = [
        {
            text: "CityShield helped me report a broken streetlight that was causing accidents. Fixed within 2 days!",
            author: "Priya S., Mumbai",
            rating: 5,
            avatar: "👩‍💼"
        },
        {
            text: "The emergency SOS feature saved my life during a late-night incident. Police arrived in minutes.",
            author: "Rajesh K., Delhi",
            rating: 5,
            avatar: "👨‍💻"
        },
        {
            text: "Being a volunteer on CityShield lets me help my community stay safe. It's incredibly rewarding.",
            author: "Anita M., Bangalore",
            rating: 5,
            avatar: "👩‍🔬"
        }
    ];

    useEffect(() => {
        setIsLoaded(true);
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 overflow-hidden">
                <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
                }
                @keyframes gradient-shift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .float-animation { animation: float 6s ease-in-out infinite; }
                .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
                .gradient-shift { 
                    background-size: 200% 200%;
                    animation: gradient-shift 3s ease infinite;
                }
                .slide-in { animation: slideIn 0.8s ease-out; }
                .parallax-element {
                    transform: translate3d(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px, 0);
                    transition: transform 0.1s ease-out;
                }
                .shimmer {
                    position: relative;
                    overflow: hidden;
                }
                .shimmer::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    animation: shimmer 3s infinite;
                }
            `}</style>


                {/* Hero Section */}
                <section className="relative overflow-hidden pt-20 pb-32">
                    {/* Enhanced Background Pattern */}
                    <div className="absolute inset-0">
                        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-20 float-animation"></div>
                        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full opacity-30 float-animation" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full opacity-20 float-animation" style={{ animationDelay: '2s' }}></div>
                        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full opacity-25 float-animation" style={{ animationDelay: '3s' }}></div>

                        {/* Animated mesh gradient */}
                        <div className="absolute inset-0 opacity-30">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 via-transparent to-teal-600/20 gradient-shift"></div>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="text-center max-w-6xl mx-auto">
                                <div className={`transition-all duration-1500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                                    {/* <div className="mb-8">
                                    <span className="inline-block bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-lg pulse-glow">
                                        🎉 Trusted by 100+ Cities Worldwide
                                    </span>
                                </div> */}

                                    <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-gray-900 mb-8 leading-tight">
                                        {/* <span className="block parallax-element">🛡️ Your Safety,</span>
                                    <span className="block parallax-element">Your City,</span> */}
                                        <span className="block">Your Safety,</span>
                                        <span className="block">Your City,</span>
                                        <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent gradient-shift">
                                            Your Voice
                                        </span>
                                    </h1>

                                    <p className="text-xl sm:text-2xl lg:text-3xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
                                        Report issues, access emergency help, and build safer communities together
                                    </p>

                                    {/* Enhanced CTA Buttons */}
                                    {/* <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                                        <button className="group relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 hover:from-blue-700 hover:via-purple-700 hover:to-teal-700 text-white px-12 py-6 rounded-2xl text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 gradient-shift">
                                            <span className="relative z-10 flex items-center gap-3">
                                                🚀 Start Your Journey
                                                <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                                            </span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        </button>

                                        <button className="group relative bg-white/90 backdrop-blur-sm text-blue-600 border-2 border-blue-600 hover:bg-blue-50 hover:border-blue-700 px-12 py-6 rounded-2xl text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                                            <span className="flex items-center gap-3">
                                                🎥 Watch Demo
                                                <span className="group-hover:rotate-12 transition-transform duration-300">▶️</span>
                                            </span>
                                        </button>
                                    </div> */}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-24 bg-white/90 backdrop-blur-sm relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-teal-50/50"></div>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-20">
                            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-6">
                                Why Choose
                                <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent"> CityShield?</span>
                            </h2>
                            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto">
                                Experience next-generation safety technology designed for modern communities
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className={`group relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br ${feature.color} text-white shadow-2xl hover:shadow-3xl transition-all duration-700 transform hover:scale-105 slide-in shimmer`}
                                    style={{ animationDelay: `${index * 0.2}s` }} onClick={() => navigate(feature.link)}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative z-10">
                                        <div className="text-7xl mb-6 transform group-hover:scale-110 transition-transform duration-500">{feature.icon}</div>
                                        <h3 className="text-2xl font-bold mb-4 group-hover:text-white transition-colors duration-300">{feature.title}</h3>
                                        <p className="text-lg opacity-90 leading-relaxed group-hover:opacity-100 transition-opacity duration-300">{feature.description}</p>
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/20 rounded-full group-hover:scale-150 group-hover:bg-white/30 transition-all duration-500"></div>
                                    <div className="absolute top-4 right-4 w-12 h-12 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500"></div>
                                </div>
                            ))}
                        </div>

                        {/* Enhanced Stats */}
                        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                            {[
                                { value: "50K+", label: "Reports Filed", color: "text-blue-600", icon: "📊" },
                                { value: "95%", label: "Response Rate", color: "text-emerald-600", icon: "✅" },
                                { value: "24/7", label: "Emergency Support", color: "text-red-600", icon: "🚨" },
                                { value: "100+", label: "Cities Protected", color: "text-purple-600", icon: "🏙️" }
                            ].map((stat, index) => (
                                <div key={index} className="group slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
                                    <div className={`text-4xl sm:text-5xl font-black ${stat.color} mb-3 group-hover:scale-105 transition-transform duration-300`}>{stat.value}</div>
                                    <div className="text-gray-600 font-medium">{stat.label}</div>
                                </div>
                            ))}
                        </div> */}
                    </div>
                </section>

                {/* Testimonials Section */}
                {/* <section className="py-24 bg-gradient-to-br from-slate-100 to-blue-100">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6">
                                What Our Heroes Say
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                Real stories from real people making their communities safer
                            </p>
                        </div>

                        <div className="relative max-w-4xl mx-auto">
                            <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-teal-600"></div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="text-6xl mb-6">{testimonials[currentSlide].avatar}</div>
                                    <div className="text-6xl text-blue-600 mb-6">"</div>
                                    <p className="text-xl sm:text-2xl text-gray-700 mb-8 leading-relaxed max-w-2xl">
                                        {testimonials[currentSlide].text}
                                    </p>
                                    <div className="flex mb-4">
                                        {[...Array(testimonials[currentSlide].rating)].map((_, i) => (
                                            <span key={i} className="text-2xl text-yellow-500">⭐</span>
                                        ))}
                                    </div>
                                    <p className="text-lg font-semibold text-gray-600">
                                        {testimonials[currentSlide].author}
                                    </p>
                                </div>
                            </div>

                            {/* Testimonial indicators 
                <div className="flex justify-center mt-8 gap-3">
                    {testimonials.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentSlide
                                ? 'bg-blue-600 scale-125'
                                : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div >
                </section > */}

                {/* Enhanced CTA Section */}
                <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-20 left-20 w-40 h-40 bg-blue-500 rounded-full opacity-10 float-animation"></div>
                        <div className="absolute bottom-20 right-20 w-32 h-32 bg-teal-500 rounded-full opacity-15 float-animation" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-purple-500 rounded-full opacity-5 float-animation" style={{ animationDelay: '2s' }}></div>
                    </div>

                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                        <div className="max-w-4xl mx-auto">
                            <div className="text-6xl mb-8">🚀</div>
                            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-8">
                                Ready to Transform Your City?
                            </h2>
                            <p className="text-xl sm:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed">
                                Join thousands of citizens who are already making a difference.
                                <span className="block mt-2 text-teal-300 font-semibold">
                                    Free registration • No credit card required • Takes 30 seconds
                                </span>
                            </p>

                            <div className="flex flex-col sm:flex-row gap-6 justify-center">
                                <button className="group inline-block bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white px-16 py-8 rounded-2xl text-2xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                                    onClick={() => navigate('/login')}
                                >
                                    <span className="flex items-center gap-4">
                                        🛡️ Join CityShield Now
                                        <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
                                    </span>
                                </button>
                            </div>

                            <div className="mt-12 flex flex-wrap justify-center gap-8 text-gray-300">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    <span>Instant Setup</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    <span>No Hidden Fees</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    <span>24/7 Support</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer />
                <EmergencyButton />
            </div >
        </>
    );
};

export default LandingPage;