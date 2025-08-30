import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';

import {
    Activity, CheckCircle, Users, Clock, TrendingUp, TrendingDown,
    BarChart3, Calendar, Database, MapPin, Zap, Shield, Heart,
    MessageSquare, Plus, ExternalLink, ArrowRight, Target, Award,
    Globe, Settings, Bell, Bookmark, FileText, Map, Phone,
    Search, Filter, Eye, PieChart, LineChart, AlertCircle,
    Lightbulb, Star, Building, Construction, Download,
    BarChart, Headphones, Info, Camera, Users2, Megaphone,
    MessageCircle, BookOpen, HelpCircle, Newspaper, Briefcase,
    TrendingUpIcon, Siren, HandHeart, UserCheck, Clock4,
    Calendar1, ThumbsUp, CircleCheck, Medal, Trophy, Crown,
    CircleAlert, Volume2, Sparkles, Flame, TrendingUpIcon as TrendUp,
    ChevronRight, Hexagon, Zap as Lightning
} from 'lucide-react';
import { Link } from 'react-router-dom';

import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import EmergencyButton from '../sos/EmergencyButton';
import { useAuth } from '../../context/AuthContext';
import { listReports } from '../../services/reports';
import { getUserById } from '../../services/auth';
import sosService from '../../services/sos';

/* ---------------- Helper Functions ---------------- */
const formatDate = (date) =>
    date.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

const formatTime = (date) =>
    date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

// Get start of month
const getMonthStart = (date, monthsBack = 0) => {
    const monthStart = new Date(date.getFullYear(), date.getMonth() - monthsBack, 1);
    monthStart.setHours(0, 0, 0, 0);
    return monthStart;
};

// Get start of week
const getWeekStart = (date, weeksBack = 0) => {
    const monday = new Date(date);
    monday.setDate(date.getDate() - date.getDay() + 1 - (weeksBack * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
};

// Get weeks in current month - handles months with 4, 5, or 6 weeks
const getWeeksInCurrentMonth = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const weeks = [];
    let weekStart = new Date(monthStart);
    // Set to Monday of the week containing the month start
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

    // Only include weeks that have days in the current month
    while (weekStart <= monthEnd) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Check if this week has any days in the current month
        if (weekEnd >= monthStart && weekStart <= monthEnd) {
            weeks.push(new Date(weekStart));
        }

        weekStart.setDate(weekStart.getDate() + 7);
    }

    return weeks;
};

// Generate weekly sparkline data for weeks within current month
const generateMonthWeekSparklineData = (reports, type = 'all') => {
    const weeks = getWeeksInCurrentMonth();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const sparklineData = [];
    // console.log('Weeks:', weeks)
    // console.log('M Start:', monthStart)
    // console.log('M End:', monthEnd)

    for (let i = 0; i < weeks.length; i++) {
        const weekStart = weeks[i];
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        // console.log('W Start:', weekStart)
        // console.log('W End:', weekEnd)

        // Limit to current month boundaries
        const effectiveStart = weekStart < monthStart ? monthStart : weekStart;
        const effectiveEnd = weekEnd > monthEnd ? monthEnd : weekEnd;
        // console.log('Effective Start:', effectiveStart)
        // console.log('Effective End:', effectiveEnd)

        let weekReports = reports.filter(report => {
            const reportDate = new Date(report.created_at);
            return reportDate >= effectiveStart && reportDate <= effectiveEnd;
        });

        // console.log('Week Reports:', weekReports)

        if (type === 'resolved') {
            weekReports = weekReports.filter(r => r.status === 'resolved');
        } else if (type === 'pending') {
            weekReports = weekReports.filter(r => r.status === 'pending' || r.status === 'investigating');
        }

        sparklineData.push(weekReports.length);
    }

    // console.log(sparklineData)
    return sparklineData;
};

const generateMonthWeekSparklineDataForSOSResponses = (responseArray) => {
    const weeks = getWeeksInCurrentMonth();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const sparklineData = [];
    for (let i = 0; i < weeks.length; i++) {
        const weekStart = weeks[i];
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const effectiveStart = weekStart < monthStart ? monthStart : weekStart;
        const effectiveEnd = weekEnd > monthEnd ? monthEnd : weekEnd;

        const weekResponses = responseArray.filter(item => {
            const d = new Date(item.response_time);
            return d >= effectiveStart && d <= effectiveEnd;
        });
        sparklineData.push(weekResponses.length);
    }
    return sparklineData;
};

/* ---------------- UserAvatar Component ---------------- */
const UserAvatar = ({ user }) => {
    const getInitials = () => {
        if (user?.name) {
            const names = user.name.split(' ');
            return names.length > 1
                ? `${names[0][0]}${names[1][0]}`.toUpperCase()
                : `${names[0][0]}${names[0][names[0].length - 1]}`.toUpperCase();
        }
        if (user?.email) return user.email.charAt(0).toUpperCase();
        return 'C';
    };

    return (
        <div className="w-16 h-16 sm:w-20 mx-auto sm:mx-0 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-xl sm:text-3xl shadow-xl border-4 border-white z-5">
            {getInitials()}
        </div>
    );
};

/* ---------------- Enhanced Metric Card (Updated) ---------------- */
const EnhancedMetricCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    isLoaded,
    animationDelay = 0,
    sparklineData = []
}) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (isLoaded && value >= 0) {
            const duration = 2000;
            const steps = 60;
            const increment = value / steps;
            let current = 0;

            const timer = setInterval(() => {
                current += increment;
                if (current >= value) {
                    setDisplayValue(value);
                    clearInterval(timer);
                } else {
                    setDisplayValue(Math.floor(current));
                }
            }, duration / steps);

            return () => clearInterval(timer);
        }
    }, [isLoaded, value]);

    const getWeekLabel = (index, totalWeeks) => {
        if (totalWeeks === 4) {
            return ['W1', 'W2', 'W3', 'W4'][index];
        } else if (totalWeeks === 5) {
            return ['W1', 'W2', 'W3', 'W4', 'W5'][index];
        } else if (totalWeeks === 6) {
            return ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'][index];
        }
        return `W${index + 1}`;
    };

    const getCurrentWeek = () => {
        const today = new Date();
        const weeks = getWeeksInCurrentMonth();
        for (let i = 0; i < weeks.length; i++) {
            const weekStart = weeks[i];
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            if (today >= weekStart && today <= weekEnd) {
                return i;
            }
        }
    }

    return (
        <div
            className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-700 border border-gray-100 overflow-hidden group transform hover:scale-105"
            data-aos="fade-up"
            data-aos-delay={animationDelay}
        >
            {/* Enhanced Animated Background */}
            <div className="absolute inset-0 opacity-5">
                <div className={`absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br ${color} rounded-full transform translate-x-8 sm:translate-x-12 -translate-y-8 sm:-translate-y-12 group-hover:scale-150 transition-all duration-1000 ease-in-out`} />
                <div className={`absolute bottom-0 left-0 w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-tr ${color} rounded-full transform -translate-x-6 sm:-translate-x-8 translate-y-6 sm:translate-y-8 group-hover:scale-125 transition-all duration-700 ease-in-out`} />
            </div>

            {/* Header - Responsive */}
            <div className="relative flex items-center justify-between mb-6 sm:mb-8">
                <div className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${color} flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-500 ease-in-out`}>
                    <Icon className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
                </div>
            </div>

            {/* Value Display - Responsive */}
            <div className="relative space-y-3 sm:space-y-4">
                <h3 className="text-gray-600 text-xs sm:text-sm font-bold uppercase tracking-wider">{title}</h3>
                <div className="flex items-baseline gap-2 sm:gap-3">
                    <div className="text-2xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                        {isLoaded ? (
                            displayValue.toLocaleString()
                        ) : (
                            <div className="h-8 sm:h-14 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl sm:rounded-2xl animate-pulse w-16 sm:w-24" />
                        )}
                    </div>
                </div>
                <p className="text-gray-500 text-xs sm:text-sm font-medium">{subtitle}</p>
            </div>

            {/* Weekly Sparkline - Dynamic width based on number of weeks */}
            {sparklineData.length > 0 && (
                <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl sm:rounded-2xl border border-gray-200">
                    <div className="text-xs text-gray-600 mb-2 sm:mb-3 font-semibold flex items-center justify-between">
                        <span>Monthly Weeks</span>
                        <span className="text-gray-400">{sparklineData.length} weeks</span>
                    </div>
                    <div className="flex items-end justify-between gap-1 sm:gap-2 h-14 sm:h-18 mt-5 sm:mt-2">
                        {sparklineData.map((value, index) => {
                            // { console.log(sparklineData) }
                            const maxValue = Math.max(...sparklineData, 1);
                            const height = Math.max(4, (value / maxValue) * 45);
                            // console.log(index)
                            // console.log(sparklineData)
                            const isCurrentWeek = index === getCurrentWeek(); // Last week is current
                            const barWidth = `calc(${100 / sparklineData.length}% - 6px)`;

                            return (
                                <div key={index} className="flex flex-col items-center gap-1 sm:gap-2" style={{ width: barWidth }}>
                                    <div
                                        className={`w-full bg-gradient-to-t ${color} rounded-md sm:rounded-lg transition-all duration-500 hover:opacity-100 shadow-sm group-hover:shadow-md transform hover:scale-110`}
                                        style={{ height: `${height}px` }}
                                        title={`${getWeekLabel(index, sparklineData.length)}: ${value} reports`}
                                    />
                                    <span className={`text-xs font-medium transition-colors duration-300 ${isCurrentWeek ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                                        {getWeekLabel(index, sparklineData.length)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ---------------- Enhanced Action Card ---------------- */
const EnhancedActionCard = ({ icon, title, description, color, onClick, link }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (link) {
            if (link.startsWith('http')) {
                window.open(link, '_blank');
            } else {
                navigate(link);
            }
        } else if (onClick) {
            onClick();
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`group relative text-left p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${color} text-white shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 overflow-hidden`}
        >
            <div className="relative z-10">
                <div className="flex items-start justify-between mb-4 sm:mb-6">
                    <span className="text-3xl sm:text-5xl block group-hover:scale-110 transition-transform duration-500 ease-in-out">
                        {icon}
                    </span>
                    <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-full border border-white/30 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                    <h3 className="font-bold text-lg sm:text-xl lg:text-2xl group-hover:text-yellow-200 transition-colors duration-300">
                        {title}
                    </h3>
                    <p className="text-sm sm:text-base opacity-90 leading-relaxed group-hover:opacity-100 transition-opacity duration-300">
                        {description}
                    </p>
                </div>
            </div>
        </button>
    );
};

/* ---------------- UPDATED: Impact Journey Redesign ---------------- */
const ImpactJourneyShowcase = ({ activities }) => {
    const [activeCard, setActiveCard] = useState(0);

    // UPDATED: Only show Reports Submitted and Emergency Responses
    const getImpactStats = () => {
        let totalReports = 0;
        let sosResponses = 0;

        activities.forEach(activity => {
            if (activity.type === 'report') totalReports++;
            if (activity.type === 'sos_response') sosResponses++;
        });

        return { totalReports, sosResponses };
    };

    const stats = getImpactStats();

    // UPDATED: Only 2 impact metrics (removed People Helped and Achievements)
    const impactMetrics = [
        {
            label: 'Reports Submitted',
            value: stats.totalReports,
            icon: FileText,
            color: 'from-green-700 to-blue-500',
            description: 'Issues identified and reported'
        },
        {
            label: 'Emergency Responses',
            value: stats.sosResponses,
            icon: Siren,
            color: 'from-red-500 to-pink-500',
            description: 'Lives potentially saved'
        }
    ];

    return (
        <section className="mb-12 sm:mb-16" data-aos="fade-up">
            <div className="text-center mb-8 sm:mb-12">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 px-6 sm:px-8 py-3 sm:py-4 rounded-full mb-6 sm:mb-8 shadow-lg border border-indigo-200">
                    <Lightning className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                    <span className="text-indigo-800 font-bold text-base sm:text-lg">Your Impact Story</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 sm:mb-3 pb-2">
                    Making a Real Difference
                </h2>
                <p className="text-gray-600 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
                    Every action you take creates ripples of positive change in your community. Here's your impact at a glance.
                </p>
            </div>

            {/* UPDATED: Impact Metrics Grid - Only 2 columns now */}
            {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto mb-12">
                {impactMetrics.map((metric, index) => {
                    const MetricIcon = metric.icon;
                    return (
                        <div
                            key={metric.label}
                            className={`relative group bg-white rounded-3xl py-6 sm:py-10 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden transform hover:scale-105`}
                        // data-aos="zoom-in"
                        // data-aos-delay={index * 100}
                        >
                            {/* Background Gradient 
                            <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-8 group-hover:opacity-10 transition-opacity duration-500`}></div>

                            <div className="relative z-10 text-center">
                                <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${metric.color} flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all duration-500`}>
                                    <MetricIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                                </div>

                                <div className="space-y-3">
                                    <div className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                        {metric.value}
                                    </div>
                                    <h3 className="text-gray-900 font-bold text-lg sm:text-xl">
                                        {metric.label}
                                    </h3>
                                    <p className="text-gray-500 text-sm sm:text-base">
                                        {metric.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div> */}

            {/* Activity Timeline - UPDATED: Only shows top 3 activities */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Activities</h3>
                        <p className="text-gray-600 text-sm sm:text-base">Your latest contributions to community safety (Top 3)</p>
                    </div>
                </div>

                {/* Activity Cards Slider */}
                <div className="relative">
                    {/* Responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {activities.slice(0, 3).map((activity, index) => {
                            const getActivityConfig = (type) => {
                                switch (type) {
                                    case 'report':
                                        return {
                                            icon: FileText,
                                            gradient: 'from-blue-500 to-cyan-500',
                                            bgGradient: 'from-blue-50 to-cyan-50',
                                            borderColor: 'border-blue-200'
                                        };
                                    case 'sos_response':
                                        return {
                                            icon: Siren,
                                            gradient: 'from-red-500 to-pink-500',
                                            bgGradient: 'from-red-50 to-pink-50',
                                            borderColor: 'border-red-200'
                                        };
                                    case 'volunteer':
                                        return {
                                            icon: HandHeart,
                                            gradient: 'from-green-500 to-emerald-500',
                                            bgGradient: 'from-green-50 to-emerald-50',
                                            borderColor: 'border-green-200'
                                        };
                                    case 'achievement':
                                        return {
                                            icon: Award,
                                            gradient: 'from-purple-500 to-indigo-500',
                                            bgGradient: 'from-purple-50 to-indigo-50',
                                            borderColor: 'border-purple-200'
                                        };
                                    default:
                                        return {
                                            icon: Activity,
                                            gradient: 'from-gray-500 to-slate-500',
                                            bgGradient: 'from-gray-50 to-slate-50',
                                            borderColor: 'border-gray-200'
                                        };
                                }
                            };

                            const config = getActivityConfig(activity.type);
                            const ActivityIcon = config.icon;

                            return (
                                <div
                                    key={activity.id}
                                    className={`
                        bg-gradient-to-br ${config.bgGradient} 
                        border-2 ${config.borderColor} 
                        rounded-2xl p-4 sm:p-6 
                        hover:shadow-lg transition-all duration-300 
                        cursor-pointer transform hover:scale-[1.02]
                        relative h-auto
                        flex flex-col
                    `}
                                    onMouseEnter={() => setActiveCard(index)}
                                >
                                    {/* Header with icon and title */}
                                    <div className="flex items-start gap-3 sm:gap-4 mb-4">
                                        <div className={`
                            w-10 h-10 sm:w-12 sm:h-12 
                            rounded-xl bg-gradient-to-br ${config.gradient} 
                            flex items-center justify-center shadow-md
                            flex-shrink-0
                        `}>
                                            <ActivityIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-tight mb-2 break-words">
                                                {activity.title}
                                            </h4>
                                            <div className={`
                                inline-block px-2 py-1 rounded-lg 
                                text-xs font-bold bg-gradient-to-r ${config.gradient} 
                                text-white break-words
                            `}>
                                                {activity.badge}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description - grows to fill available space */}
                                    <div className="flex-1 mb-4">
                                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed break-words">
                                            {activity.description}
                                        </p>
                                    </div>

                                    {/* Metadata tags - always at bottom */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-auto">
                                        <div className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-md">
                                            <Clock4 className="w-3 h-3 flex-shrink-0" />
                                            <span className="break-words">{activity.time}</span>
                                        </div>
                                        {activity.impact && (
                                            <div className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-md">
                                                <Heart className="w-3 h-3 flex-shrink-0" />
                                                <span className="break-words">{activity.impact}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Link overlay */}
                                    {activity.link && (
                                        <Link
                                            to={activity.link}
                                            className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {activities.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                            <Sparkles className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-600 mb-2">Your Journey Begins</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Start making a difference in your community. Submit your first report or volunteer to help others.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
};

/* ---------------- Safety Tips Section ---------------- */
// const SafetyTipsSection = () => (
//     <section className="mb-12">
//         <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-6 sm:p-8 border border-green-200">
//             <div className="flex items-center gap-4 mb-6 sm:mb-8">
//                 <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
//                     <Lightbulb className="w-6 h-6 text-white" />
//                 </div>
//                 <div>
//                     <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Safety Tips</h2>
//                     <p className="text-gray-600 text-sm sm:text-base">Essential safety information for your community</p>
//                 </div>
//             </div>

//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
//                 {[
//                     { icon: "🚶", title: "Walking Safety", tips: ["Stay in well-lit areas", "Be aware of surroundings", "Use designated crosswalks"] },
//                     { icon: "🏠", title: "Home Security", tips: ["Lock all doors and windows", "Install motion sensors", "Know your neighbors"] },
//                     { icon: "🚗", title: "Vehicle Safety", tips: ["Check tire pressure regularly", "Keep emergency kit", "Don't text while driving"] },
//                     { icon: "📱", title: "Digital Safety", tips: ["Use strong passwords", "Don't share personal info", "Report suspicious activities"] }
//                 ].map((category, index) => (
//                     <div key={index} className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-green-100">
//                         <div className="flex items-center gap-3 mb-4">
//                             <span className="text-2xl">{category.icon}</span>
//                             <h4 className="font-bold text-gray-900">{category.title}</h4>
//                         </div>
//                         <ul className="space-y-2">
//                             {category.tips.map((tip, tipIndex) => (
//                                 <li key={tipIndex} className="text-gray-600 text-sm flex items-start gap-2">
//                                     <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
//                                     <span>{tip}</span>
//                                 </li>
//                             ))}
//                         </ul>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     </section>
// );

/* ---------------- Emergency Section ---------------- */
const EmergencySection = () => (
    <section className="mb-12">
        <div className="relative bg-gradient-to-br from-white via-blue-50 to-pink-50 rounded-3xl p-6 sm:p-8 lg:p-12 text-gray-900 shadow-2xl overflow-hidden border border-gray-200">
            <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-gradient-to-br from-rose-300/20 to-orange-300/10 rounded-full transform translate-x-24 sm:translate-x-32 -translate-y-24 sm:-translate-y-32 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 sm:w-48 h-32 sm:h-48 bg-gradient-to-tr from-blue-400/10 to-green-300/10 rounded-full transform -translate-x-16 sm:-translate-x-24 translate-y-16 sm:translate-y-24 blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gray-50/70 to-transparent pointer-events-none" />

            <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-gradient-to-br from-orange-100/80 to-orange-200/80 mb-6 sm:mb-8 border-2 border-orange-200 shadow">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-orange-200/50 to-red-100/40 flex items-center justify-center">
                        <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400" />
                    </div>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 leading-tight text-gray-900">
                    Emergency Support Available
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
                    Our response team is ready to help. Contact emergency services or use our SOS feature for immediate assistance.
                </p>

                {/* Emergency Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto mb-8 sm:mb-12">
                    {[{
                        number: '112', label: 'Emergency', icon: '🚨',
                        bg: 'bg-rose-100 hover:bg-rose-200 text-rose-600 border-rose-200'
                    }, {
                        number: '100', label: 'Police', icon: '👮',
                        bg: 'bg-blue-100 hover:bg-blue-200 text-blue-600 border-blue-200'
                    }, {
                        number: '108', label: 'Ambulance', icon: '🚑',
                        bg: 'bg-green-100 hover:bg-green-200 text-green-600 border-green-200'
                    }, {
                        number: '101', label: 'Fire', icon: '🔥',
                        bg: 'bg-orange-100 hover:bg-orange-200 text-orange-600 border-orange-200'
                    }].map((contact, index) => (
                        <a
                            key={index}
                            href={`tel:${contact.number}`}
                            className={`group relative ${contact.bg} backdrop-blur-md border rounded-2xl p-4 sm:p-6 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-xl overflow-hidden`}
                        >
                            <div className="relative z-10">
                                <div className="text-2xl sm:text-3xl mb-3">{contact.icon}</div>
                                <div className="text-xl sm:text-2xl font-black mb-2">
                                    {contact.number}
                                </div>
                                <div className="text-xs sm:text-sm font-semibold uppercase tracking-wide opacity-80">{contact.label}</div>
                            </div>
                        </a>
                    ))}
                </div>

                {/* Features */}
                {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
                    {[{
                        icon: <MapPin className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />,
                        title: "Instant Location Sharing",
                        desc: "GPS coordinates automatically sent to responders"
                    }, {
                        icon: <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" />,
                        title: "Rapid Response Time",
                        desc: "Average emergency response in under 3 minutes"
                    }, {
                        icon: <Headphones className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400" />,
                        title: "Round-the-Clock Support",
                        desc: "Professional assistance available 24/7"
                    }].map((feature, index) => (
                        <div
                            key={index}
                            className="relative bg-white/75 hover:bg-white shadow hover:shadow-lg transition-all duration-300 rounded-2xl p-6 sm:p-8 border border-gray-100 flex flex-col items-center text-center"
                        >
                            <div className="mb-4 sm:mb-6">{feature.icon}</div>
                            <h4 className="font-bold text-base sm:text-lg mb-3 text-gray-800">{feature.title}</h4>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div> */}

                {/* Trust Indicators */}
                <div className="mt-10 sm:mt-12 flex flex-wrap justify-center items-center gap-6 sm:gap-8 text-gray-400">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>Service Active</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span>Verified</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
                        <span>Secure</span>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

/* ---------------- Main Dashboard Component ---------------- */
const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [stats, setStats] = useState({
        reports: 0,
        resolved: 0,
        pending: 0,
        investigating: 0,
        community_impact: 0,
        this_month_total: 0,
        sos_responses: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [sparklineData, setSparklineData] = useState({
        reports: [],
        resolved: [],
        pending: [],
        community: []
    });
    const [isLoaded, setIsLoaded] = useState(false);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        AOS.init({ duration: 800, once: true });
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                // Load reports data
                const reports = (await listReports()).reports;
                // const sosResponseEvents = await sosService.getVolunteerResponseEvents();
                const allSosResponses = await sosService.listAllSosResponses();
                // console.log(allSosResponses)

                // Load SOS volunteer data
                let sosResponses = 0;
                let isVolunteer = false;

                try {
                    sosResponses = allSosResponses.length || 0;
                    const volunteerStatus = await sosService.getVolunteerStatus();
                    // console.log('Volunteer Status:', volunteerStatus);

                    if (volunteerStatus.is_volunteer) {
                        isVolunteer = true;
                    }
                } catch (error) {
                    console.log('User is not a volunteer or error fetching SOS data:', error);
                }

                // Calculate monthly stats
                const now = new Date();
                const thisMonthStart = getMonthStart(now);
                const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                thisMonthEnd.setHours(23, 59, 59, 999);

                const thisMonthReports = reports.filter(report => {
                    const reportDate = new Date(report.created_at);
                    return reportDate >= thisMonthStart && reportDate <= thisMonthEnd;
                });

                const thisMonthResolved = thisMonthReports.filter(r => r.status === 'resolved').length;
                const thisMonthPending = thisMonthReports.filter(r => r.status === 'pending').length;
                const thisMonthInvestigating = thisMonthReports.filter(r => r.status === 'investigating').length;
                const thisMonthTotal = thisMonthReports.length;
                const totalResolvedEver = reports.filter(r => r.status === 'resolved').length;

                const currentStats = {
                    reports: thisMonthTotal,
                    resolved: thisMonthResolved,
                    pending: thisMonthPending + thisMonthInvestigating,
                    investigating: thisMonthInvestigating,
                    community_impact: sosResponses,
                    this_month_total: thisMonthTotal,
                    sos_responses: sosResponses
                };

                // console.log(sosResponses)
                // console.log(currentStats)

                // Generate month-week sparkline data (weeks within current month)
                const reportsSparkline = generateMonthWeekSparklineData(reports, 'all');
                const resolvedSparkline = generateMonthWeekSparklineData(reports, 'resolved');
                const pendingSparkline = generateMonthWeekSparklineData(reports, 'pending');
                const communitySparkline = generateMonthWeekSparklineDataForSOSResponses(allSosResponses);;
                // const communitySparkline = sosResponses > 0 ?
                //     Array(reportsSparkline.length).fill(0).map((_, i) => i === reportsSparkline.length - 1 ? sosResponses : Math.floor(sosResponses / reportsSparkline.length)) :
                //     Array(reportsSparkline.length).fill(0);

                // UPDATED: Enhanced recent activity - mix reports and SOS responses, show top 3
                const allActivities = [];

                // Add all reports with timestamp for sorting
                const recentReports = reports
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 5); // Get top 5 reports

                recentReports.forEach(report => {
                    allActivities.push({
                        id: report.id,
                        type: 'report',
                        title: `Submitted Report: ${report.title}`,
                        description: report.description.substring(0, 120) + '...',
                        time: getTimeAgo(report.created_at),
                        location: report.location || `${report.latitude?.toFixed(3)}, ${report.longitude?.toFixed(3)}`,
                        badge: report.status.charAt(0).toUpperCase() + report.status.slice(1),
                        link: `/reports/${report.id}`,
                        timestamp: new Date(report.created_at)
                    });
                });

                // Add SOS responses with recent timestamp
                // if (sosResponses > 0 && isVolunteer) {
                //     allActivities.push({
                //         id: 'sos-volunteer',
                //         type: 'sos_response',
                //         title: 'Emergency Response Hero',
                //         description: `Responded to ${sosResponses} emergency SOS alert${sosResponses > 1 ? 's' : ''} and helped community members in need.`,
                //         time: 'This period',
                //         // impact: `${sosResponses * 3} people helped`,
                //         badge: `${sosResponses} Response${sosResponses > 1 ? 's' : ''}`,
                //         timestamp: new Date(Date.now() - (1000 * 60 * 60 * 24)) // Yesterday for sorting
                //     });
                // }

                // Add achievements (will be included in mix but only top 3 will show)
                if (totalResolvedEver > 5) {
                    allActivities.push({
                        id: 'achievement-reporter',
                        type: 'achievement',
                        title: 'Community Champion',
                        description: `Contributed to resolving ${totalResolvedEver} community issues, making your area safer for everyone.`,
                        time: 'All time',
                        impact: `${totalResolvedEver * 8} people benefited`,
                        badge: '⭐ Champion',
                        timestamp: new Date(Date.now() - (1000 * 60 * 60 * 48)) // 2 days ago for sorting
                    });
                }

                // Add volunteer status
                if (isVolunteer && sosResponses === 0) {
                    allActivities.push({
                        id: 'volunteer-ready',
                        type: 'volunteer',
                        title: 'Ready to Help',
                        description: 'Registered as a community volunteer. Ready to respond to emergency situations when needed.',
                        time: 'Active status',
                        badge: 'Volunteer',
                        timestamp: new Date(Date.now() - (1000 * 60 * 60 * 72)) // 3 days ago for sorting
                    });
                }

                // UPDATED: Sort all activities by timestamp and take top 3
                allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                // Load user profile
                if (user && user.id) {
                    try {
                        const profile = await getUserById(user.id);
                        setUserProfile(profile);
                    } catch (error) {
                        console.log('Could not fetch user profile:', error);
                    }
                }

                setStats(currentStats);
                setRecentActivity(allActivities); // Pass all activities, component will slice to 3
                setSparklineData({
                    reports: reportsSparkline,
                    resolved: resolvedSparkline,
                    pending: pendingSparkline,
                    community: communitySparkline
                });
                setIsLoaded(true);

            } catch (error) {
                console.error("Error loading dashboard data:", error);
                setIsLoaded(true);
            }
        };

        loadDashboardData();
    }, [user]);

    const getTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);

        const timeUnits = [
            { unit: 'day', seconds: 86400 },
            { unit: 'hour', seconds: 3600 },
            { unit: 'minute', seconds: 60 }
        ];

        for (const { unit, seconds } of timeUnits) {
            const count = Math.floor(diffInSeconds / seconds);
            if (count >= 1) {
                return `${count} ${unit}${count !== 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now';
    };

    const getGreeting = useCallback(() => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, [currentTime]);

    const enhancedMetrics = useMemo(() => {
        const metrics = [
            {
                title: "Total Reports",
                value: stats.reports,
                subtitle: "This month",
                icon: Database,
                color: "from-blue-500 to-blue-600",
                sparklineData: sparklineData.reports
            },
            {
                title: "Resolved Issues",
                value: stats.resolved,
                subtitle: "This month's resolutions",
                icon: CheckCircle,
                color: "from-green-500 to-green-600",
                sparklineData: sparklineData.resolved
            },
            {
                title: "Active Cases",
                value: stats.pending,
                subtitle: "This month's active cases",
                icon: Activity,
                color: "from-amber-500 to-orange-600",
                sparklineData: sparklineData.pending
            },
            {
                title: "SOS Responses",
                value: stats.community_impact,
                subtitle: stats.sos_responses > 0 ? `Volunteers responded ${stats.sos_responses} SOS calls` : 'Volunteers response',
                icon: HandHeart,
                color: "from-purple-500 to-purple-600",
                sparklineData: sparklineData.community
            }
        ];

        return metrics;
    }, [stats, sparklineData]);

    const quickActions = [
        {
            icon: '🚨',
            title: 'Emergency Report',
            description: 'Submit urgent safety concerns requiring immediate attention',
            color: 'from-red-500 to-red-600',
            link: '/report-incident?type=emergency'
        },
        {
            icon: '📝',
            title: 'General Report',
            description: 'Report infrastructure issues or community concerns',
            color: 'from-blue-500 to-blue-600',
            link: '/report'
        },
        {
            icon: '🗺️',
            title: 'Safety Map',
            description: 'View incident locations and safety hotspots',
            color: 'from-green-500 to-green-600',
            link: '/safety-map'
        },
        {
            icon: '👥',
            title: 'Community',
            description: 'Connect with volunteers and local groups',
            color: 'from-teal-500 to-teal-600',
            link: '/community'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Enhanced Header */}
                <header className="mb-8 sm:mb-12">
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-xl border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-full transform translate-x-32 sm:translate-x-48 -translate-y-32 sm:-translate-y-48 opacity-40 z-0" />
                        <div className="absolute bottom-0 left-0 w-48 sm:w-64 h-48 sm:h-64 bg-gradient-to-tr from-indigo-100 to-blue-100 rounded-full transform -translate-x-24 sm:-translate-x-32 translate-y-24 sm:translate-y-32 opacity-30 z-0" />

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
                            {/* {console.log(user)}
                            {console.log(userProfile)} */}
                            <UserAvatar user={userProfile || user} />
                            <div className="space-y-2 sm:space-y-3">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent p-1">
                                    {getGreeting()}, {userProfile?.name || user?.name || user?.email?.split('@')[0] || 'Citizen'}!
                                </h1>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-gray-600">
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="font-medium text-sm sm:text-base">{formatDate(currentTime)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="font-medium text-sm sm:text-base">{formatTime(currentTime)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Enhanced Metrics - Monthly Performance */}
                <section className="mb-12 sm:mb-20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-10 gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
                                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent pb-2">
                                    CityShield Monthly Stats
                                </h2>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8">
                        {enhancedMetrics.map((metric, index) => (
                            <EnhancedMetricCard
                                key={index}
                                title={metric.title}
                                value={metric.value}
                                subtitle={metric.subtitle}
                                icon={metric.icon}
                                color={metric.color}
                                isLoaded={isLoaded}
                                animationDelay={index * 150}
                                sparklineData={metric.sparklineData}
                            />
                        ))}
                    </div>
                </section>

                {/* Enhanced Quick Actions */}
                <section className="mb-12 sm:mb-20">
                    <div className="text-center mb-8 sm:mb-10">
                        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 px-6 sm:px-8 py-3 sm:py-4 rounded-full mb-6 sm:mb-8 shadow-lg border border-white/50">
                            <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                            <span className="text-blue-800 font-bold text-base sm:text-lg">Quick Actions</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent pb-2">
                            Take Action in Your Community
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {quickActions.map((action, index) => (
                            <EnhancedActionCard
                                key={index}
                                icon={action.icon}
                                title={action.title}
                                description={action.description}
                                color={action.color}
                                link={action.link}
                            />
                        ))}
                    </div>
                </section>

                {/* UPDATED: Impact Journey Showcase */}
                {recentActivity.length > 0 && (
                    <ImpactJourneyShowcase activities={recentActivity} />
                )}

                {/* Safety Tips Section */}
                {/* <SafetyTipsSection /> */}

                {/* Emergency Support Section */}
                <EmergencySection />
            </main>

            <Footer />
            <EmergencyButton />
        </div>
    );
};

export default Dashboard;
