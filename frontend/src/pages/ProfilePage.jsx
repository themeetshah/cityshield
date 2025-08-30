import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Shield,
    User,
    Mail,
    Calendar,
    MapPin,
    Phone,
    Edit,
    Camera,
    BarChart3,
    CheckCircle,
    Clock,
    Activity,
    Settings,
    Bell,
    Lock,
    Download,
    Save,
    X,
    FileText,
    AlertTriangle,
    Users,
    TrendingUp,
    Plus,
    Trash2,
    RefreshCw,
    AlertCircle,
    Eye,
    EyeOff,
    ChevronRight,
    Star,
    Award,
    Zap,
    Heart,
    HandHeart
} from 'lucide-react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { profileAPI } from '../services/profile';
import toast from 'react-hot-toast';

// Enhanced Responsive Components
const GradientCard = ({ children, className = "" }) => (
    <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden ${className}`}>
        {children}
    </div>
);

const AnimatedButton = ({ children, onClick, variant = "primary", size = "md", disabled = false, className = "", type = "button" }) => {
    const variants = {
        primary: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl",
        secondary: "bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50",
        danger: "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl",
        success: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl",
        warning: "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl"
    };

    const sizes = {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base",
        lg: "px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`
                ${variants[variant]} ${sizes[size]} 
                rounded-xl font-semibold transition-all duration-300 
                transform hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${className}
            `}
        >
            {children}
        </button>
    );
};

const StatCard = ({ icon: Icon, value, label, color = "blue" }) => {
    const colorClasses = {
        blue: "from-blue-50 to-blue-100 text-blue-600 border-blue-200",
        emerald: "from-emerald-50 to-emerald-100 text-emerald-600 border-emerald-200",
        orange: "from-orange-50 to-orange-100 text-orange-600 border-orange-200",
        purple: "from-purple-50 to-purple-100 text-purple-600 border-purple-200",
        teal: "from-teal-50 to-teal-100 text-teal-600 border-teal-200",
        pink: "from-pink-50 to-pink-100 text-pink-600 border-pink-200"
    };

    return (
        <div className={`
            bg-gradient-to-br ${colorClasses[color]} 
            p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl border-2 
            hover:scale-105 hover:shadow-lg 
            transition-all duration-300 
            relative overflow-hidden group cursor-pointer
        `}>
            <div className="relative z-10">
                <div className="flex items-center mb-2 sm:mb-3">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                    <div className="text-xs sm:text-sm font-semibold opacity-80 text-right ml-2">{label}</div>
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black mb-1">{value}</div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-full group-hover:scale-150 transition-transform duration-500" />
        </div>
    );
};

const ActivityItem = ({ activity, index }) => {
    const navigate = useNavigate();

    const getStatusConfig = (status) => {
        const configs = {
            completed: {
                color: 'bg-emerald-500',
                badge: 'bg-emerald-100 text-emerald-700',
                icon: CheckCircle
            },
            pending: {
                color: 'bg-yellow-500',
                badge: 'bg-yellow-100 text-yellow-700',
                icon: Clock
            },
            investigating: {
                color: 'bg-blue-500',
                badge: 'bg-blue-100 text-blue-700',
                icon: Activity
            },
            resolved: {
                color: 'bg-emerald-500',
                badge: 'bg-emerald-100 text-emerald-700',
                icon: CheckCircle
            },
            dismissed: {
                color: 'bg-red-500',
                badge: 'bg-red-100 text-red-700',
                icon: X
            },
        };
        return configs[status] || configs.pending;
    };

    const config = getStatusConfig(activity.status);
    const StatusIcon = config.icon;

    // Animation delay classes
    const delayClasses = [
        'animate-delay-0',
        'animate-delay-100',
        'animate-delay-200',
        'animate-delay-300',
        'animate-delay-400',
        'animate-delay-500',
        'animate-delay-600',
        'animate-delay-700',
        'animate-delay-800',
        'animate-delay-900'
    ];
    const delayClass = delayClasses[index % delayClasses.length] || 'animate-delay-0';

    return (
        <div
            className={`group p-4 sm:p-5 lg:p-6 bg-gradient-to-r from-gray-50 to-white hover:from-white hover:to-blue-50 rounded-xl sm:rounded-2xl border-2 border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg cursor-pointer animate-fade-in-up ${delayClass}`}
            onClick={() => navigate(`/reports/${activity.id}`)}
        >
            <div className="flex items-start gap-3 sm:gap-4">
                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${config.color} mt-1 sm:mt-2 group-hover:scale-125 transition-transform duration-300 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
                        <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors text-sm sm:text-base lg:text-lg">
                            {activity.action}
                        </p>
                        <StatusIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="text-xs sm:text-sm text-gray-500">{activity.created_at}</span>
                        <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-bold ${config.badge}`}>
                            {activity.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {activity.location && (
                            <span className="text-xs sm:text-sm text-gray-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                {activity.location}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NotificationItem = ({ notification, onMarkRead, index }) => {
    // Animation delay classes
    const delayClasses = [
        'animate-delay-0',
        'animate-delay-100',
        'animate-delay-200',
        'animate-delay-300',
        'animate-delay-400',
        'animate-delay-500',
        'animate-delay-600',
        'animate-delay-700',
        'animate-delay-800',
        'animate-delay-900'
    ];
    const delayClass = delayClasses[index % delayClasses.length] || 'animate-delay-0';

    return (
        <div
            className={`
                p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 hover:shadow-lg animate-fade-in-up ${delayClass}
                ${notification.read
                    ? 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:border-blue-300 shadow-sm'
                }
            `}
        >
            <div className="flex items-start gap-3 sm:gap-4">
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mt-2 flex-shrink-0 ${notification.read ? 'bg-gray-400' : 'bg-blue-500 animate-pulse'}`} />
                <div className="flex-1 min-w-0">
                    <p className={`font-semibold mb-2 sm:mb-3 text-sm sm:text-base lg:text-lg ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {notification.message}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                        <span className="text-xs sm:text-sm text-gray-500">{notification.created_at}</span>
                        {!notification.read && (
                            <AnimatedButton
                                onClick={() => onMarkRead(notification.id)}
                                variant="primary"
                                size="sm"
                            >
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>Mark Read</span>
                                </div>
                            </AnimatedButton>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EmergencyContactCard = ({ contact, onDelete, index }) => {
    // Animation delay classes
    const delayClasses = [
        'animate-delay-0',
        'animate-delay-100',
        'animate-delay-200',
        'animate-delay-300',
        'animate-delay-400',
        'animate-delay-500',
        'animate-delay-600',
        'animate-delay-700',
        'animate-delay-800',
        'animate-delay-900'
    ];
    const delayClass = delayClasses[index % delayClasses.length] || 'animate-delay-0';

    return (
        <div className={`group p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl sm:rounded-2xl hover:shadow-lg hover:border-red-300 transition-all duration-300 animate-fade-in-up ${delayClass}`}>
            <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                        <Phone className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                <span>{contact.name}</span>
                            </div>
                        </h4>
                        <div className="flex items-center gap-2">
                            <p className="text-sm sm:text-base text-gray-700 mb-1 sm:mb-2 flex items-center gap-2">
                                <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span>{contact.phone}</span>
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1 bg-red-100 text-red-600 text-xs sm:text-sm font-semibold rounded-lg">
                            <Heart className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span>{contact.relationship}</span>
                        </span>
                    </div>
                </div>
                <AnimatedButton
                    onClick={() => onDelete(contact.id)}
                    variant="danger"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-shrink-0"
                >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </AnimatedButton>
            </div>
        </div>
    );
};

const FormField = ({ field, value, onChange, disabled, error }) => {
    const IconComponent = field.icon;

    return (
        <div className="space-y-2 sm:space-y-3">
            <label className="block text-sm sm:text-base font-bold text-gray-700">
                <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span>{field.label}</span>
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                </div>
            </label>
            <div className="relative group">
                <IconComponent className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors flex-shrink-0" />
                {field.type === 'select' ? (
                    <select
                        name={field.name}
                        value={value || ''}
                        onChange={onChange}
                        disabled={disabled}
                        className={`
                            w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 
                            ${disabled ? 'border-gray-200 bg-gray-50' : 'border-gray-300 focus:border-blue-500 bg-white'}
                            ${error ? 'border-red-300 focus:border-red-500' : ''}
                            focus:ring-4 focus:ring-blue-100 transition-all duration-300
                            font-medium text-gray-900 text-sm sm:text-base
                        `}
                    >
                        <option value="">Select {field.label}</option>
                        {field.options?.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        type={field.type}
                        name={field.name}
                        value={value || ''}
                        onChange={onChange}
                        disabled={disabled}
                        className={`
                            w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 
                            ${disabled ? 'border-gray-200 bg-gray-50' : 'border-gray-300 focus:border-blue-500 bg-white'}
                            ${error ? 'border-red-300 focus:border-red-500' : ''}
                            focus:ring-4 focus:ring-blue-100 transition-all duration-300
                            font-medium text-gray-900 text-sm sm:text-base
                        `}
                        placeholder={field.placeholder || `Enter your ${field.label.toLowerCase()}`}
                    />
                )}
            </div>
            {error && (
                <p className="text-red-600 text-sm font-medium">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                </p>
            )}
        </div>
    );
};

const PasswordField = ({ label, name, value, onChange, error, showPassword, onTogglePassword, required = false }) => (
    <div className="space-y-2 sm:space-y-3">
        <style>
            {`
                input[type="password"]::-ms-reveal,
                input[type="password"]::-webkit-contacts-auto-fill-button {
                    display: none !important;
                }
            `}
        </style>
        <label className="block text-sm sm:text-base font-bold text-gray-700">
            <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>{label}</span>
                {required && <span className="text-red-500 ml-1">*</span>}
            </div>
        </label>
        <div className="relative group">
            <Lock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors flex-shrink-0" />
            <input
                type={showPassword ? 'text' : 'password'}
                name={name}
                value={value}
                onChange={onChange}
                className={`
                    w-full pl-10 sm:pl-12 pr-12 sm:pr-14 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 
                    ${error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
                    focus:ring-4 focus:ring-blue-100 transition-all duration-300
                    font-medium text-gray-900 bg-white text-sm sm:text-base
                `}
                placeholder={`Enter ${label.toLowerCase()}`}
            />
            <button
                type="button"
                onClick={onTogglePassword}
                className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
            >
                {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
        </div>
        {error && (
            <p className="text-red-600 text-sm font-medium">
                <div className="flex items-center gap-1 sm:gap-2">
                    <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            </p>
        )}
    </div>
);

// Main Component
const ProfilePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // All your existing state variables remain the same...
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [userHasPassword, setUserHasPassword] = useState(true);

    // Password change states
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // Data states
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        location: '',
        date_of_birth: null,
        gender: '',
        blood_group: ''
    });

    const [originalProfileData, setOriginalProfileData] = useState({});
    const [userStats, setUserStats] = useState({
        reports_submitted: 0,
        reports_resolved: 0,
        reports_in_progress: 0,
        reports_dismissed: 0,
        volunteered_hours: 0,
        helped_citizens: 0,
        join_date: '',
        last_active: ''
    });

    const [activities, setActivities] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [emergencyContacts, setEmergencyContacts] = useState([]);

    // Emergency contact form state
    const [showAddContact, setShowAddContact] = useState(false);
    const [newContact, setNewContact] = useState({
        name: '',
        phone: '',
        relationship: ''
    });

    const [applyingForVolunteer, setApplyingForVolunteer] = useState(false);
    const [volunteerApplicationStatus, setVolunteerApplicationStatus] = useState(null);

    // Form field definitions
    const profileFields = [
        {
            name: 'name',
            label: 'Full Name',
            icon: User,
            type: 'text',
            required: true
        },
        {
            name: 'email',
            label: 'Email Address',
            icon: Mail,
            type: 'email',
            disabled: true
        },
        {
            name: 'phone',
            label: 'Phone Number',
            icon: Phone,
            type: 'tel'
        },
        {
            name: 'location',
            label: 'Location',
            icon: MapPin,
            type: 'text'
        },
        {
            name: 'date_of_birth',
            label: 'Date of Birth',
            icon: Calendar,
            type: 'date'
        },
        {
            name: 'gender',
            label: 'Gender',
            icon: User,
            type: 'select',
            options: [
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' }
            ]
        },
        {
            name: 'blood_group',
            label: 'Blood Group',
            icon: Activity,
            type: 'select',
            options: [
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' }
            ]
        }
    ];

    // All your existing functions remain the same...
    const fetchAllData = async () => {
        if (!user?.id) return;
        setError(null);

        try {
            const [profileRes, statsRes, activitiesRes, notificationsRes, contactsRes] = await Promise.allSettled([
                profileAPI.getProfile(user.id),
                profileAPI.getStats(user.id),
                profileAPI.getActivities(user.id),
                profileAPI.getNotifications(user.id),
                profileAPI.getEmergencyContacts(user.id)
            ]);

            if (profileRes.status === 'fulfilled') {
                const profile = {
                    name: profileRes.value.name || user.name || '',
                    email: profileRes.value.email || user.email || '',
                    phone: profileRes.value.phone || '',
                    location: profileRes.value.location || '',
                    date_of_birth: profileRes.value.date_of_birth || null,
                    gender: profileRes.value.gender || '',
                    blood_group: profileRes.value.blood_group || '',
                    password_set: profileRes.value.password_set !== undefined ? profileRes.value.password_set : true
                };
                setProfileData(profile);
                setOriginalProfileData(profile);
                setUserHasPassword(profile.password_set);
            } else {
                const fallback = {
                    name: user.name || '',
                    email: user.email || '',
                    phone: '',
                    location: '',
                    date_of_birth: null,
                    gender: '',
                    blood_group: '',
                    password_set: user.password_set !== undefined ? user.password_set : true
                };
                setProfileData(fallback);
                setOriginalProfileData(fallback);
                setUserHasPassword(fallback.password_set);
            }

            if (statsRes.status === 'fulfilled') setUserStats(statsRes.value);
            if (activitiesRes.status === 'fulfilled') setActivities(Array.isArray(activitiesRes.value) ? activitiesRes.value : []);
            if (notificationsRes.status === 'fulfilled') setNotifications(Array.isArray(notificationsRes.value) ? notificationsRes.value : []);
            if (contactsRes.status === 'fulfilled') setEmergencyContacts(Array.isArray(contactsRes.value) ? contactsRes.value : []);

        } catch (err) {
            setError('Failed to load profile data');
            console.error('Profile data fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [user?.id]);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        const checkVolunteerStatus = async () => {
            if (user.role === 'Citizen') {
                try {
                    const statusData = await profileAPI.volunteerApplicationStatus();
                    setVolunteerApplicationStatus(statusData.status);
                } catch (error) {
                    console.error('Failed to check volunteer status:', error);
                    setVolunteerApplicationStatus(null);
                }
            }
        };

        checkVolunteerStatus();
    }, [user]);

    // Handle volunteer application
    const handleBecomeVolunteer = async () => {
        setApplyingForVolunteer(true);

        const loadingToast = toast.loading('Submitting application...');
        try {
            const applicationData = {
                phone_number: profileData.phone || '',
            };

            const data = await profileAPI.applyForVolunteer(applicationData);

            toast.dismiss(loadingToast);

            if (data.message) {
                setVolunteerApplicationStatus('pending');
                // Show success message
                toast.success('Volunteer application submitted successfully! Police will review your application.');
            } else {
                toast.error(`Application failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error('Phone number required. Please try again.');
        } finally {
            setApplyingForVolunteer(false);
        }
    };

    // All your existing handlers remain the same...
    const handleSave = async () => {
        setSaving(true);
        try {
            await profileAPI.updateProfile(user.id, profileData);
            setOriginalProfileData({ ...profileData });
            setIsEditing(false);
            setError(null);
            setSuccess('Profile updated successfully!');
            toast.success('Profile updated successfully')
        } catch (err) {
            setError('Failed to update profile');
            toast.error('All fields are required')
            console.error('Profile update error:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setProfileData({ ...originalProfileData });
        setIsEditing(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        if (passwordErrors[name]) {
            setPasswordErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const validatePasswordForm = () => {
        const errors = {};

        if (userHasPassword && !passwordData.current_password) {
            errors.current_password = 'Current password is required';
        }

        if (!passwordData.new_password) {
            errors.new_password = 'New password is required';
        } else if (passwordData.new_password.length < 8) {
            errors.new_password = 'Password must be at least 8 characters long';
        }

        if (!passwordData.confirm_password) {
            errors.confirm_password = 'Please confirm your new password';
        } else if (passwordData.new_password !== passwordData.confirm_password) {
            errors.confirm_password = 'Passwords do not match';
        }

        if (userHasPassword && passwordData.current_password && passwordData.current_password === passwordData.new_password) {
            errors.new_password = 'New password must be different from current password';
        }

        setPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (!validatePasswordForm()) return;

        setPasswordLoading(true);
        try {
            const passwordPayload = userHasPassword
                ? passwordData
                : {
                    new_password: passwordData.new_password,
                    confirm_password: passwordData.confirm_password
                };

            await profileAPI.changePassword(user.id, passwordPayload);
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
            setPasswordErrors({});
            setShowPasswordChange(false);
            setUserHasPassword(true);
            setSuccess(userHasPassword ? 'Password changed successfully!' : 'Password set successfully! You can now use email/password login.');
        } catch (error) {
            console.error('Password change error:', error);
            if (error.response?.data?.error) {
                setPasswordErrors({ general: error.response.data.error });
            } else {
                setPasswordErrors({ general: 'Failed to change password. Please try again.' });
            }
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleMarkNotificationRead = async (notificationId) => {
        try {
            await profileAPI.markNotificationRead(user.id, notificationId);
            setNotifications(prev =>
                prev.map(notif =>
                    notif.id === notificationId ? { ...notif, read: true } : notif
                )
            );
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const handleAddEmergencyContact = async (e) => {
        e.preventDefault();
        try {
            const contact = await profileAPI.addEmergencyContact(user.id, newContact);
            setEmergencyContacts(prev => [...prev, contact]);
            setNewContact({ name: '', phone: '', relationship: '' });
            setShowAddContact(false);
            setSuccess('Emergency contact added successfully!');
        } catch (err) {
            setError('Failed to add emergency contact');
            console.error('Add emergency contact error:', err);
        }
    };

    const handleDeleteEmergencyContact = async (contactId) => {
        if (!window.confirm('Are you sure you want to delete this contact?')) return;

        try {
            await profileAPI.deleteEmergencyContact(user.id, contactId);
            setEmergencyContacts(prev => prev.filter(contact => contact.id !== contactId));
            setSuccess('Emergency contact deleted successfully!');
        } catch (err) {
            setError('Failed to delete emergency contact');
            console.error('Delete emergency contact error:', err);
        }
    };

    // Helper functions
    const getUserInitials = () => {
        if (profileData.name) {
            const names = profileData.name.split(' ');
            return names.length > 1
                ? `${names[0][0]}${names[1][0]}`.toUpperCase()
                : names[0][0].toUpperCase();
        }
        return user?.email?.[0]?.toUpperCase() || 'U';
    };

    const getRoleConfig = (role) => {
        const roles = {
            'citizen': {
                label: 'Citizen',
                color: 'bg-blue-100 text-blue-700 border-blue-200',
                icon: <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            },
            'volunteer': {
                label: 'Safety Volunteer',
                color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                icon: <Shield className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            },
            'police': {
                label: 'Police Officer',
                color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                icon: <Shield className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            },
            'municipality': {
                label: 'Municipality Officer',
                color: 'bg-purple-100 text-purple-700 border-purple-200',
                icon: <Settings className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            },
            'city admin': {
                label: 'City Administrator',
                color: 'bg-orange-100 text-orange-700 border-orange-200',
                icon: <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            },
            'state admin': {
                label: 'State Administrator',
                color: 'bg-red-100 text-red-700 border-red-200',
                icon: <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            },
            'admin': {
                label: 'Site Administrator',
                color: 'bg-red-100 text-red-700 border-red-200',
                icon: <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            }
        };
        return roles[user?.role] || roles['citizen'];
    };

    const roleConfig = getRoleConfig(user?.role);

    const tabs = [
        {
            id: 'profile',
            label: 'Profile',
            icon: User,
            gradient: 'from-blue-500 to-purple-600'
        },
        {
            id: 'activity',
            label: 'Activity',
            icon: Activity,
            gradient: 'from-emerald-500 to-teal-600'
        },
        {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            gradient: 'from-yellow-500 to-orange-600'
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            gradient: 'from-purple-500 to-pink-600'
        },
    ];

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-pink-50">
                {/* Animated Background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-20 left-20 w-32 h-32 sm:w-64 sm:h-64 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-40 right-20 w-40 h-40 sm:w-80 sm:h-80 bg-purple-200/30 rounded-full blur-3xl animate-pulse animate-delay-2000" />
                    <div className="absolute top-1/2 left-10 w-24 h-24 sm:w-48 sm:h-48 bg-pink-200/30 rounded-full blur-3xl animate-pulse animate-delay-4000" />
                    <div className="absolute top-1/3 right-1/3 w-16 h-16 sm:w-32 sm:h-32 bg-teal-200/30 rounded-full blur-3xl animate-pulse animate-delay-6000" />
                </div>

                <div className="relative z-10 py-4 sm:py-8 lg:py-12">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">

                        {/* Enhanced Alert Messages */}
                        {error && (
                            <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-700 rounded-xl sm:rounded-2xl animate-slide-down">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                                    <span className="flex-1 font-medium text-sm sm:text-base">{error}</span>
                                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0">
                                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {success && (
                            <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 text-emerald-700 rounded-xl sm:rounded-2xl animate-slide-down">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                                    <span className="flex-1 font-medium text-sm sm:text-base">{success}</span>
                                    <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700 transition-colors flex-shrink-0">
                                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Enhanced Responsive Profile Header */}
                        <GradientCard className="mb-4 lg:mb-6 p-3 sm:p-4 lg:p-6">
                            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 sm:gap-6 lg:gap-8">
                                {/* Smaller Avatar */}
                                <div className="flex flex-col items-center justify-center">
                                    <div className="relative group flex-shrink-0 flex justify-center">
                                        <div className="w-15 h-15 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold shadow-lg group-hover:scale-105 transition-transform duration-300">
                                            {getUserInitials()}
                                        </div>
                                    </div>

                                    {/* Smaller Role Badge */}
                                    <div className="mt-3 flex justify-center">
                                        <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border-2 ${roleConfig.color} shadow-sm`}>
                                            {roleConfig.icon}
                                            <span className="whitespace-nowrap">{roleConfig.label}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Compact User Info */}
                                <div className="flex-1 text-center lg:text-left w-full min-w-0">
                                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 lg:gap-6 mb-4 sm:mb-6">
                                        <div className="space-y-3 sm:space-y-4 flex-1 min-w-0">
                                            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-gray-900 leading-tight break-words">
                                                {profileData.name || 'User Name'}
                                            </h1>

                                            {/* Compact Additional Info */}
                                            <div className="flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-2.5 text-gray-600 text-xs sm:text-sm">
                                                <div className="flex items-center gap-1.5 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-sm min-w-0 flex-shrink-0">
                                                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                                                    <span className="font-medium truncate max-w-[140px] sm:max-w-[180px] lg:max-w-none">{profileData.email}</span>
                                                </div>
                                                {profileData.location && (
                                                    <div className="flex items-center gap-1.5 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-sm flex-shrink-0">
                                                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">{profileData.location}</span>
                                                    </div>
                                                )}
                                                {userStats.join_date && (
                                                    <div className="flex items-center gap-1.5 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-sm flex-shrink-0">
                                                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">Joined {userStats.join_date}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Compact Action Buttons */}
                                        <div className="flex flex-row justify-center lg:justify-start xl:justify-end gap-2 sm:gap-3 flex-shrink-0 text-center mx-auto">
                                            {/* Become Volunteer Button - Only for Citizens */}
                                            {user.role === 'Citizen' && !volunteerApplicationStatus && (
                                                <AnimatedButton
                                                    onClick={handleBecomeVolunteer}
                                                    variant="success"
                                                    size="sm"
                                                    className="w-full sm:w-auto"
                                                    disabled={applyingForVolunteer}
                                                >
                                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                                        <HandHeart className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                                        <span className="whitespace-nowrap text-sm">
                                                            {applyingForVolunteer ? 'Applying...' : 'Become Volunteer'}
                                                        </span>
                                                    </div>
                                                </AnimatedButton>
                                            )}

                                            {/* Volunteer Application Status */}
                                            {user.role === 'Citizen' && volunteerApplicationStatus && (
                                                <div className={`text-center inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border-2 ${volunteerApplicationStatus === 'pending'
                                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                    : volunteerApplicationStatus === 'approved'
                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                    {volunteerApplicationStatus === 'pending' && <Clock className="w-4 h-4" />}
                                                    {volunteerApplicationStatus === 'approved' && <CheckCircle className="w-4 h-4" />}
                                                    {volunteerApplicationStatus === 'rejected' && <XCircle className="w-4 h-4" />}
                                                    <span>
                                                        {volunteerApplicationStatus === 'pending' && 'Application Pending'}
                                                        {volunteerApplicationStatus === 'approved' && 'Volunteer Approved'}
                                                        {volunteerApplicationStatus === 'rejected' && 'Application Rejected'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Edit Profile Button */}
                                            <AnimatedButton
                                                onClick={() => setIsEditing(!isEditing)}
                                                variant="primary"
                                                size="sm"
                                                className="w-full sm:w-auto"
                                            >
                                                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                                    <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                                    <span className="whitespace-nowrap text-sm">
                                                        {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                                                    </span>
                                                </div>
                                            </AnimatedButton>
                                        </div>
                                    </div>

                                    {/* Compact Stats Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                                        <StatCard
                                            icon={FileText}
                                            value={userStats.reports_submitted || 0}
                                            label="Reports"
                                            color="blue"
                                        />
                                        <StatCard
                                            icon={CheckCircle}
                                            value={userStats.reports_resolved || 0}
                                            label="Resolved"
                                            color="emerald"
                                        />
                                        <StatCard
                                            icon={Clock}
                                            value={userStats.reports_in_progress || 0}
                                            label="In Progress"
                                            color="orange"
                                        />
                                        <StatCard
                                            icon={Users}
                                            value={userStats.helped_citizens || 0}
                                            label="Helped"
                                            color="purple"
                                        />
                                    </div>
                                </div>
                            </div>
                        </GradientCard>

                        {/* Enhanced Responsive Tabs */}
                        <div className="mb-6 lg:mb-8">
                            <GradientCard className="p-2 sm:p-3">
                                <div className="flex overflow-x-auto scrollbar-hide gap-2 sm:gap-3">
                                    {tabs.map((tab) => {
                                        const IconComponent = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`
                                                    flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap
                                                    ${isActive
                                                        ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg scale-105`
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                                    }
                                                `}
                                            >
                                                <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                                                <span className="hidden sm:inline text-sm sm:text-base">{tab.label}</span>
                                                {isActive && <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </GradientCard>
                        </div>

                        {/* Enhanced Tab Content */}
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8">

                            {/* Main Content */}
                            <div className="xl:col-span-3 space-y-6 lg:space-y-8">

                                {/* Profile Tab */}
                                {activeTab === 'profile' && (
                                    <GradientCard className="p-4 sm:p-6 lg:p-8">
                                        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                                <User className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">Personal Information</h2>
                                                <p className="text-gray-600 text-sm sm:text-base">Manage your personal details and preferences</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                                            {profileFields.map((field) => (
                                                <FormField
                                                    key={field.name}
                                                    field={field}
                                                    value={profileData[field.name]}
                                                    onChange={handleChange}
                                                    disabled={!isEditing || field.disabled}
                                                />
                                            ))}
                                        </div>

                                        {/* Action Buttons */}
                                        {isEditing && (
                                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
                                                <AnimatedButton
                                                    onClick={handleSave}
                                                    disabled={saving}
                                                    variant="success"
                                                    size="md"
                                                    className="flex-1"
                                                >
                                                    {saving ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                            <span>Saving Changes...</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            <span>Save Changes</span>
                                                        </div>
                                                    )}
                                                </AnimatedButton>
                                                <AnimatedButton
                                                    onClick={handleCancel}
                                                    disabled={saving}
                                                    variant="secondary"
                                                    size="md"
                                                    className="flex-1"
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                                        <span>Cancel</span>
                                                    </div>
                                                </AnimatedButton>
                                            </div>
                                        )}
                                    </GradientCard>
                                )}

                                {/* Activity Tab */}
                                {activeTab === 'activity' && (
                                    <GradientCard className="p-4 sm:p-6 lg:p-8">
                                        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                                <Activity className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">Recent Activity</h2>
                                                <p className="text-gray-600 text-sm sm:text-base">Track your contributions and engagement</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 sm:space-y-6">
                                            {activities.length > 0 ? (
                                                activities.map((activity, index) => (
                                                    <ActivityItem key={activity.id} activity={activity} index={index} />
                                                ))
                                            ) : (
                                                <div className="text-center py-12 sm:py-16 lg:py-20">
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                                                        <Activity className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-emerald-500" />
                                                    </div>
                                                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">No Activities Yet</h3>
                                                    <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">Start using the platform to see your activities here</p>
                                                    <AnimatedButton onClick={() => navigate('/dashboard')} variant="primary" size="md">
                                                        <div className="flex items-center gap-2">
                                                            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            <span>Go to Dashboard</span>
                                                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                                        </div>
                                                    </AnimatedButton>
                                                </div>
                                            )}
                                        </div>
                                    </GradientCard>
                                )}

                                {/* Notifications Tab */}
                                {activeTab === 'notifications' && (
                                    <GradientCard className="p-4 sm:p-6 lg:p-8">
                                        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                                <Bell className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">Notifications</h2>
                                                <p className="text-gray-600 text-sm sm:text-base">Stay updated with important alerts and messages</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 sm:space-y-6">
                                            {notifications.length > 0 ? (
                                                notifications.map((notification, index) => (
                                                    <NotificationItem
                                                        key={notification.id}
                                                        notification={notification}
                                                        onMarkRead={handleMarkNotificationRead}
                                                        index={index}
                                                    />
                                                ))
                                            ) : (
                                                <div className="text-center py-12 sm:py-16 lg:py-20">
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                                                        <Bell className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-yellow-500" />
                                                    </div>
                                                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">All Caught Up!</h3>
                                                    <p className="text-gray-600 text-sm sm:text-base">No new notifications at the moment</p>
                                                </div>
                                            )}
                                        </div>
                                    </GradientCard>
                                )}

                                {/* Enhanced Settings Tab */}
                                {activeTab === 'settings' && (
                                    <div className="space-y-6 lg:space-y-8">
                                        {/* Account Settings */}
                                        <GradientCard className="p-4 sm:p-6 lg:p-8">
                                            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                                    <Settings className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">Account Settings</h2>
                                                    <p className="text-gray-600 text-sm sm:text-base">Manage your account security and preferences</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4 sm:space-y-6">
                                                {/* Enhanced Security Section */}
                                                <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl sm:rounded-2xl border-2 border-gray-200">
                                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                                                        <div className="flex items-center gap-2 sm:gap-3">
                                                            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                                                            <span>Security Settings</span>
                                                        </div>
                                                    </h3>

                                                    <div className="space-y-3 sm:space-y-4">
                                                        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-colors ${!userHasPassword ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                                                            <div className="flex items-start gap-3 sm:gap-4 flex-1">
                                                                {/* <div className={`w-7 h-7 sm:w-12 sm:h-12 ${userHasPassword ? 'bg-blue-100' : 'bg-yellow-100'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                                                    <Lock className={`w-3 h-3 sm:w-6 sm:h-6 ${userHasPassword ? 'text-blue-600' : 'text-yellow-600'}`} />
                                                                </div> */}
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">
                                                                        <div className="flex items-center gap-2">
                                                                            {/* {userHasPassword ? (
                                                                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                                                                            ) : (
                                                                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                                                                            )} */}
                                                                            <span>{userHasPassword ? 'Change Password' : 'Set Password'}</span>
                                                                        </div>
                                                                    </h4>
                                                                    <p className="text-sm sm:text-base text-gray-600">
                                                                        {userHasPassword
                                                                            ? 'Update your account password for better security'
                                                                            : 'Create a password to enable email/password login'
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <AnimatedButton
                                                                onClick={() => setShowPasswordChange(!showPasswordChange)}
                                                                variant={showPasswordChange ? "secondary" : (userHasPassword ? "primary" : "warning")}
                                                                size="sm"
                                                                className="w-fit sm:w-auto flex-shrink-0 mx-auto"
                                                            >
                                                                {showPasswordChange ? (
                                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                                        <X className="w-4 h-4" />
                                                                        <span>Cancel</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                                        <Lock className="w-4 h-4" />
                                                                        <span>{userHasPassword ? 'Change' : 'Set Password'}</span>
                                                                    </div>
                                                                )}
                                                            </AnimatedButton>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Enhanced Data Management Section */}
                                                {/* <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl sm:rounded-2xl border-2 border-gray-200">
                                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                                                        <div className="flex items-center gap-2 sm:gap-3">
                                                            <Download className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                                                            <span>Data Management</span>
                                                        </div>
                                                    </h3>

                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 bg-white rounded-xl border border-gray-200 hover:border-green-300 transition-colors">
                                                        <div className="flex items-start gap-3 sm:gap-4 flex-1">
                                                            {/* <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                                <Download className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg">Export My Data</h4>
                                                                <p className="text-sm sm:text-base text-gray-600">Download all your account data and reports</p>
                                                            </div>
                                                        </div>
                                                        <AnimatedButton variant="success" size="sm" className="w-fit sm:w-auto flex-shrink-0 mx-auto">
                                                            <div className="flex items-center gap-1 sm:gap-2">
                                                                <Download className="w-4 h-4" />
                                                                <span>Export</span>
                                                            </div>
                                                        </AnimatedButton>
                                                    </div>
                                                </div> */}
                                            </div>
                                        </GradientCard>

                                        {/* Enhanced Password Change Form */}
                                        {showPasswordChange && (
                                            <GradientCard className="p-4 sm:p-6 lg:p-8 animate-fade-in-up">
                                                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                                                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-r from-red-500 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                                        <Lock className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">
                                                            {userHasPassword ? 'Change Password' : 'Set Password'}
                                                        </h2>
                                                        <p className="text-gray-600 text-sm sm:text-base">
                                                            {userHasPassword
                                                                ? 'Update your password to keep your account secure'
                                                                : 'Create a password to enable email/password login'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>

                                                {passwordErrors.general && (
                                                    <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-red-50 border-2 border-red-200 rounded-xl sm:rounded-2xl">
                                                        <div className="flex items-center gap-3 sm:gap-4">
                                                            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0" />
                                                            <span className="text-red-700 font-medium text-sm sm:text-base">{passwordErrors.general}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <form onSubmit={handlePasswordSubmit} className="space-y-4 sm:space-y-6">
                                                    {/* Only show current password field if user has existing password */}
                                                    {userHasPassword && (
                                                        <PasswordField
                                                            label="Current Password"
                                                            name="current_password"
                                                            value={passwordData.current_password}
                                                            onChange={handlePasswordChange}
                                                            error={passwordErrors.current_password}
                                                            showPassword={showPasswords.current}
                                                            onTogglePassword={() => togglePasswordVisibility('current')}
                                                            required={userHasPassword}
                                                        />
                                                    )}

                                                    <PasswordField
                                                        label="New Password"
                                                        name="new_password"
                                                        value={passwordData.new_password}
                                                        onChange={handlePasswordChange}
                                                        error={passwordErrors.new_password}
                                                        showPassword={showPasswords.new}
                                                        onTogglePassword={() => togglePasswordVisibility('new')}
                                                        required
                                                    />

                                                    <PasswordField
                                                        label="Confirm New Password"
                                                        name="confirm_password"
                                                        value={passwordData.confirm_password}
                                                        onChange={handlePasswordChange}
                                                        error={passwordErrors.confirm_password}
                                                        showPassword={showPasswords.confirm}
                                                        onTogglePassword={() => togglePasswordVisibility('confirm')}
                                                        required
                                                    />

                                                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
                                                        <AnimatedButton
                                                            type="submit"
                                                            disabled={passwordLoading}
                                                            variant="success"
                                                            size="md"
                                                            className="flex-1"
                                                        >
                                                            {passwordLoading ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                    <span>{userHasPassword ? 'Changing Password...' : 'Setting Password...'}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                                                                    <span>{userHasPassword ? 'Change Password' : 'Set Password'}</span>
                                                                </div>
                                                            )}
                                                        </AnimatedButton>
                                                        <AnimatedButton
                                                            type="button"
                                                            onClick={() => {
                                                                setShowPasswordChange(false);
                                                                setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                                                                setPasswordErrors({});
                                                            }}
                                                            variant="secondary"
                                                            size="md"
                                                            className="flex-1"
                                                        >
                                                            <div className="flex items-center justify-center gap-2">
                                                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                                                <span>Cancel</span>
                                                            </div>
                                                        </AnimatedButton>
                                                    </div>
                                                </form>
                                            </GradientCard>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Enhanced Sidebar */}
                            <div className="xl:col-span-1 space-y-6 lg:space-y-8">

                                {/* Enhanced Emergency Contacts */}
                                <GradientCard className="p-4 sm:p-5 lg:p-6">
                                    {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6"> */}
                                    <div className="flex items-center gap-2 sm:gap-3 mb-5">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                            <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mr-auto">Emergency Contacts</h3>
                                        <AnimatedButton
                                            onClick={() => setShowAddContact(!showAddContact)}
                                            variant={showAddContact ? "secondary" : "danger"}
                                            size="sm"
                                            className="w-fit sm:w-auto flex-shrink-0"
                                        >
                                            {showAddContact ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        </AnimatedButton>
                                    </div>
                                    {/* </div> */}

                                    {/* Enhanced Add Contact Form */}
                                    {showAddContact && (
                                        <div className="mb-4 sm:mb-6 p-4 sm:p-5 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl sm:rounded-2xl animate-fade-in-up">
                                            <form onSubmit={handleAddEmergencyContact} className="space-y-3 sm:space-y-4">
                                                <div className="relative">
                                                    <User className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                                                    <input
                                                        type="text"
                                                        placeholder="Contact Name"
                                                        value={newContact.name}
                                                        onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                                                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 border-2 border-red-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-400 font-medium text-sm sm:text-base"
                                                        required
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                                                    <input
                                                        type="tel"
                                                        placeholder="Phone Number"
                                                        value={newContact.phone}
                                                        onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                                                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 border-2 border-red-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-400 font-medium text-sm sm:text-base"
                                                        required
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <Heart className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                                                    <input
                                                        type="text"
                                                        placeholder="Relationship"
                                                        value={newContact.relationship}
                                                        onChange={(e) => setNewContact(prev => ({ ...prev, relationship: e.target.value }))}
                                                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 border-2 border-red-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-400 font-medium text-sm sm:text-base"
                                                        required
                                                    />
                                                </div>
                                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                                    <AnimatedButton type="submit" variant="danger" size="sm" className="flex-1">
                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                            <Plus className="w-4 h-4" />
                                                            <span>Add Contact</span>
                                                        </div>
                                                    </AnimatedButton>
                                                    <AnimatedButton
                                                        type="button"
                                                        onClick={() => {
                                                            setShowAddContact(false);
                                                            setNewContact({ name: '', phone: '', relationship: '' });
                                                        }}
                                                        variant="secondary"
                                                        size="sm"
                                                        className="flex-1 sm:flex-initial"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </AnimatedButton>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Enhanced Contacts List */}
                                    <div className="space-y-3 sm:space-y-4">
                                        {emergencyContacts.length > 0 ? (
                                            emergencyContacts.map((contact, index) => (
                                                <EmergencyContactCard
                                                    key={contact.id}
                                                    contact={contact}
                                                    onDelete={handleDeleteEmergencyContact}
                                                    index={index}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-8 sm:py-12">
                                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                                    <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
                                                </div>
                                                <h4 className="font-bold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base lg:text-lg">No Emergency Contacts</h4>
                                                <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">Add contacts for quick emergency access</p>
                                                <AnimatedButton
                                                    onClick={() => setShowAddContact(true)}
                                                    variant="danger"
                                                    size="sm"
                                                    className="w-fit sm:w-auto"
                                                >
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <Plus className="w-4 h-4" />
                                                        <span>Add First Contact</span>
                                                    </div>
                                                </AnimatedButton>
                                            </div>
                                        )}
                                    </div>
                                </GradientCard>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default ProfilePage;
