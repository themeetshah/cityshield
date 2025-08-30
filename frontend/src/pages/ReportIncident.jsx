import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin, Camera, AlertTriangle, Shield, Construction,
    Users, HelpCircle, Send, ArrowLeft, CheckCircle, X,
    Loader2, Upload, Video, Map, Edit3
} from 'lucide-react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useAuth } from '../context/AuthContext';
import { reverse_geocode } from '../services/location'
import { create_report } from '../services/reports';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getUserById } from '../services/auth';

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});


const incidentIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const ReportIncident = () => {
    const { user } = useAuth();
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        report_type: '',
        latitude: null,
        longitude: null,
    });
    const [media, setMedia] = useState([]);
    const [location, setLocation] = useState({
        loading: false,
        error: null,
        address: null,
        city: null,
        state: null,
        country: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default to New Delhi
    const [mapKey, setMapKey] = useState(0); // Key to force map re-render

    // Report types configuration (keeping the same as before)
    const reportTypes = [
        {
            value: 'infrastructure',
            label: 'Infrastructure Issue',
            icon: Construction,
            color: 'from-orange-500 to-amber-600',
            description: 'Roads, lights, water, electricity issues'
        },
        {
            value: 'harassment',
            label: 'Harassment',
            icon: AlertTriangle,
            color: 'from-red-500 to-red-600',
            description: 'Verbal, physical, or online harassment'
        },
        {
            value: 'crime',
            label: 'Crime',
            icon: Shield,
            color: 'from-red-600 to-red-700',
            description: 'Theft, violence, or criminal activity'
        },
        {
            value: 'safety',
            label: 'Safety Concern',
            icon: AlertTriangle,
            color: 'from-yellow-500 to-orange-500',
            description: 'Unsafe conditions or areas'
        },
        {
            value: 'other',
            label: 'Other',
            icon: HelpCircle,
            color: 'from-purple-500 to-indigo-600',
            description: 'Any other community concern'
        }
    ];

    // Enhanced reverse geocoding using Nominatim API
    const reverseGeocode = async (latitude, longitude) => {
        try {
            const data = await reverse_geocode(latitude, longitude)
            // const data = await response.json();

            if (data && data.display_name) {
                const address = data.address || {};
                return {
                    address: data.display_name,
                    city: address.city || address.town || address.village || address.suburb,
                    state: address.state,
                    country: address.country,
                    postcode: address.postcode
                };
            }

            return {
                address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                city: null,
                state: null,
                country: null
            };
        } catch (error) {
            console.error('Geocoding error:', error);
            return {
                address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                city: null,
                state: null,
                country: null
            };
        }
    };

    // Updated location handler that properly updates map preview
    const updateLocation = async (latitude, longitude) => {
        setFormData(prev => ({ ...prev, latitude, longitude }));
        setMapCenter([latitude, longitude]);
        setMapKey(prev => prev + 1); // Force map re-render

        const addressData = await reverseGeocode(latitude, longitude);
        // console.log(addressData)
        setLocation(prev => ({
            ...prev,
            ...addressData
        }));
    };

    // Get current location using Geolocation API
    const getCurrentLocation = () => {
        setLocation(prev => ({ ...prev, loading: true, error: null }));

        if (!navigator.geolocation) {
            setLocation({
                loading: false,
                error: 'Geolocation is not supported by this browser.',
                address: null,
                city: null,
                state: null,
                country: null
            });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await updateLocation(latitude, longitude);
                setLocation(prev => ({ ...prev, loading: false }));
            },
            (error) => {
                let errorMessage = 'Unable to get location.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied by user.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }

                setLocation({
                    loading: false,
                    error: errorMessage,
                    address: null,
                    city: null,
                    state: null,
                    country: null
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    // Location Marker Component for interactive map
    const LocationMarker = ({ position, setPosition }) => {
        useMapEvents({
            click: async (e) => {
                const { lat, lng } = e.latlng;
                setPosition([lat, lng]);
                await updateLocation(lat, lng);
            },
        });

        return position === null ? null : (
            <Marker
                position={position}
                icon={incidentIcon}
                draggable={true}
                eventHandlers={{
                    dragend: async (e) => {
                        const marker = e.target;
                        const position = marker.getLatLng();
                        const { lat, lng } = position;
                        setPosition([lat, lng]);
                        await updateLocation(lat, lng);
                    },
                }}
            />
        );
    };

    // Map Component with Auto-Location
    const MapWithGeolocation = () => {
        const [position, setPosition] = useState(
            formData.latitude && formData.longitude
                ? [formData.latitude, formData.longitude]
                : null
        );

        const map = useMap();

        useEffect(() => {
            if (formData.latitude && formData.longitude) {
                const newPosition = [formData.latitude, formData.longitude];
                setPosition(newPosition);
                map.setView(newPosition, 15);
            }
        }, [formData.latitude, formData.longitude, map]);

        return <LocationMarker position={position} setPosition={setPosition} />;
    };

    // Handle media upload (keeping the same)
    const handleMediaUpload = (event) => {
        const files = Array.from(event.target.files);
        const newMedia = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            id: Math.random().toString(36).substr(2, 9),
            type: file.type.startsWith('image/') ? 'image' : 'video',
            name: file.name,
            size: file.size,
            duration: null
        }));
        setMedia(prev => [...prev, ...newMedia].slice(0, 5));
    };

    // Remove media (keeping the same)
    const removeMedia = (id) => {
        setMedia(prev => {
            const updated = prev.filter(item => item.id !== id);
            const mediaToRemove = prev.find(item => item.id === id);
            if (mediaToRemove) {
                URL.revokeObjectURL(mediaToRemove.preview);
            }
            return updated;
        });
    };

    // Format file size (keeping the same)
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Updated handleSubmit function in your React component
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const loadingToast = toast.loading('Submitting your report...');

        try {
            // const user2 = await getUserById();
            const addressData = await reverseGeocode(formData.latitude, formData.longitude);
            // addressData
            const submitData = new FormData();
            console.log(user)
            console.log(user['name'])
            console.log(submitData)
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('report_type', formData.report_type);
            submitData.append('latitude', formData.latitude);
            submitData.append('longitude', formData.longitude);
            submitData.append('location', addressData.address);
            submitData.append('reported_by_name', user['name']);
            submitData.append('is_anonymous', 'false');

            // Add all media files with the same key 'media'
            media.forEach((item) => {
                submitData.append('media', item.file);
            });

            const response = await create_report(submitData);
            console.log(response)
            // Axios uses response.status instead of response.ok
            if (response) {
                toast.dismiss(loadingToast);
                console.log('323')
                // Fixed: Use response.data instead of result.data
                toast.success(
                    <div className="flex flex-col">
                        <span className="font-semibold">Report submitted successfully!</span>
                        <span className="text-sm text-gray-300">Report ID: {response.id}</span>
                    </div>,
                    {
                        duration: 5000,
                        icon: '✅',
                    }
                );

                console.log('Report created:', response);

                // Reset form after success
                setFormData({
                    title: '',
                    description: '',
                    report_type: '',
                    latitude: null,
                    longitude: null,
                });
                setMedia([]);
                setLocation({
                    loading: false,
                    error: null,
                    address: null,
                    city: null,
                    state: null,
                    country: null
                });

                console.log(response)
                // Navigate to report detail page
                setTimeout(() => {
                    navigate(`/reports/${response.id}`); // Fixed: Use response.data.id
                }, 1500);

            } else {
                toast.dismiss(loadingToast);
                console.log(response)
                // Show error toast
                toast.error(
                    <div className="flex flex-col">
                        <span className="font-semibold">Failed to submit report</span>
                        <span className="text-sm text-gray-300">
                            Please try again or contact support
                        </span>
                    </div>,
                    {
                        duration: 6000,
                        icon: '❌',
                    }
                );
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error submitting report:', error);

            // Enhanced error handling with toast
            if (error.response) {
                // Server responded with error status
                const errorMessage = error.response.data.message ||
                    (typeof error.response.data === 'object'
                        ? Object.values(error.response.data).flat().join(', ')
                        : 'Server error');

                toast.error(
                    <div className="flex flex-col">
                        <span className="font-semibold">Failed to submit report</span>
                        <span className="text-sm text-gray-300">{errorMessage}</span>
                    </div>,
                    {
                        duration: 6000,
                        icon: '❌',
                    }
                );
            } else if (error.request) {
                // Request was made but no response received
                toast.error(
                    <div className="flex flex-col">
                        <span className="font-semibold">Network Error</span>
                        <span className="text-sm text-gray-300">Please check your connection</span>
                    </div>,
                    {
                        duration: 6000,
                        icon: '🌐',
                    }
                );
            } else {
                // Something else happened
                toast.error(
                    <div className="flex flex-col">
                        <span className="font-semibold">Unexpected Error</span>
                        <span className="text-sm text-gray-300">Please try again</span>
                    </div>,
                    {
                        duration: 6000,
                        icon: '⚠️',
                    }
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-get location on component mount
    useEffect(() => {
        getCurrentLocation();
        return () => {
            media.forEach(item => URL.revokeObjectURL(item.preview));
        };
    }, []);

    const isFormValid = formData.title && formData.description && formData.report_type &&
        formData.latitude && formData.longitude;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header (keeping the same) */}
                <div className="mb-8">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back to Dashboard</span>
                    </button>

                    <div className="text-center">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                            Report Incident
                        </h1>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Help make your community safer by reporting incidents, issues, or concerns.
                            Your report will be reviewed and addressed by relevant authorities.
                        </p>
                    </div>
                </div>

                {/* Success Message (keeping the same) */}
                {showSuccess && (
                    <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div>
                            <h3 className="font-bold text-green-800">Report Submitted Successfully!</h3>
                            <p className="text-green-700 text-sm">Your incident report has been received and will be reviewed shortly.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* **FIXED** Location Section with Proper Map Preview Update */}
                    <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Location</h2>
                                <p className="text-gray-600 text-sm">Where did this incident occur?</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Updated Map Preview with Key for Re-rendering */}
                            {formData.latitude && formData.longitude && (
                                <div className="relative">
                                    <div className="h-48 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                                        <MapContainer
                                            key={mapKey} // This forces re-render when location changes
                                            center={mapCenter}
                                            zoom={15}
                                            style={{ height: '100%', width: '100%' }}
                                            scrollWheelZoom={false}
                                            className='z-0'
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <Marker
                                                position={[formData.latitude, formData.longitude]}
                                                icon={incidentIcon}
                                            />
                                        </MapContainer>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowMapModal(true)}
                                        className="absolute top-3 right-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 p-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        <span className="text-sm font-medium">Edit Location</span>
                                    </button>
                                </div>
                            )}

                            {/* Rest of location section (keeping the same) */}
                            {location.loading && (
                                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                    <span className="text-blue-800">Getting your location...</span>
                                </div>
                            )}

                            {location.error && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <span className="text-red-800">{location.error}</span>
                                </div>
                            )}

                            {location.address && (
                                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-green-800 mb-1">Selected Location</p>
                                            <p className="text-green-700 text-sm leading-relaxed">{location.address}</p>
                                            {location.city && location.state && (
                                                <p className="text-green-600 text-xs mt-1">
                                                    {location.city}, {location.state}
                                                    {location.postcode && ` - ${location.postcode}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="sm:flex gap-3">
                                <button
                                    type="button"
                                    onClick={getCurrentLocation}
                                    disabled={location.loading}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {location.loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <MapPin className="w-5 h-5" />
                                    )}
                                    {location.loading ? 'Getting Location...' : 'Use Current Location'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowMapModal(true)}
                                    className="bg-white mt-3 sm:mt-0 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl border border-gray-200 transition-all duration-300 flex items-center gap-2"
                                >
                                    <Map className="w-5 h-5" />
                                    Select on Map
                                </button>
                            </div>
                        </div>
                        {/* </div> */}
                        {/* </div> */}
                    </div>

                    {/* Incident Type Selection */}
                    <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Incident Type</h2>
                            <p className="text-gray-600 text-sm">Select the category that best describes your report</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {reportTypes.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, report_type: type.value }))}
                                        className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left ${formData.report_type === type.value
                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br ${type.color}`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-1">{type.label}</h3>
                                        <p className="text-sm text-gray-600">{type.description}</p>

                                        {formData.report_type === type.value && (
                                            <div className="absolute top-3 right-3">
                                                <CheckCircle className="w-6 h-6 text-blue-600" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Report Details */}
                    <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Report Details</h2>
                            <p className="text-gray-600 text-sm">Provide clear and detailed information about the incident</p>
                        </div>

                        <div className="space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Brief summary of the incident (e.g., 'Broken streetlight on Main Road')"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                                    maxLength={200}
                                    required
                                />
                                <div className="text-right text-sm text-gray-500 mt-1">
                                    {formData.title.length}/200
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Provide detailed information about what happened, when it occurred, and any other relevant details..."
                                    rows={6}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Media Evidence (Images & Videos) */}
                    <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-20 sm:w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Media Evidence</h2>
                                <p className="text-gray-600 text-sm">Upload photos or videos to support your report (optional, max 5 files)</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Upload Button */}
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors px-2">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Upload className="w-6 h-6 text-gray-500" />
                                        <Video className="w-6 h-6 text-gray-500" />
                                    </div>
                                    <p className="mb-2 text-sm text-gray-500">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">Images: PNG, JPG, GIF | Videos: MP4, MOV, AVI (MAX. 50MB each)</p>
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    onChange={handleMediaUpload}
                                    className="hidden"
                                    disabled={media.length >= 5}
                                />
                            </label>

                            {/* Media Preview Grid */}
                            {/* // Updated media preview grid with inline video playback */}
                            {media.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {media.map((item) => (
                                        <div key={item.id} className="relative group bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                                            {item.type === 'image' ? (
                                                <img
                                                    src={item.preview}
                                                    alt="Preview"
                                                    className="w-full h-32 object-cover"
                                                />
                                            ) : (
                                                <div className="relative w-full h-32 bg-gray-900 rounded-t-lg overflow-hidden">
                                                    <video
                                                        src={item.preview}
                                                        className="w-full h-full object-cover cursor-pointer"
                                                        muted
                                                        preload="metadata"
                                                        controls // Enable video controls directly
                                                        playsInline
                                                        onLoadedMetadata={(e) => {
                                                            // Update duration when video metadata loads
                                                            const duration = Math.round(e.target.duration);
                                                            setMedia(prev => prev.map(media =>
                                                                media.id === item.id
                                                                    ? { ...media, duration }
                                                                    : media
                                                            ));
                                                        }}
                                                    />

                                                    {/* Duration Badge - only show when not playing */}
                                                    {item.duration && (
                                                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded pointer-events-none">
                                                            {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="p-3">
                                                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                    <span>{formatFileSize(item.size)}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="capitalize">{item.type}</span>
                                                        {item.type === 'video' && item.duration && (
                                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                                {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                type="button"
                                                onClick={() => removeMedia(item.id)}
                                                className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg transform hover:scale-110"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                type="button"
                                onClick={() => window.history.back()}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-all duration-300"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={!isFormValid || isSubmitting}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Submit Report
                                    </>
                                )}
                            </button>
                        </div>

                        {!isFormValid && (
                            <p className="text-sm text-gray-500 mt-3 text-center">
                                Please fill in all required fields and enable location to submit your report.
                            </p>
                        )}
                    </div>
                </form>
            </main>

            {/* Interactive Leaflet Map Modal */}
            {showMapModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">Select Incident Location</h3>
                            <button
                                onClick={() => setShowMapModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 relative">
                            <MapContainer
                                center={mapCenter}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom={true}
                                className='z-0'
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MapWithGeolocation />
                            </MapContainer>

                            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-sm z-10">
                                <p className="text-sm text-gray-600 mb-2">Click on the map or drag the marker to select the incident location</p>
                                {location.address && (
                                    <p className="text-xs text-blue-600 font-medium">{location.address}</p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex gap-4">
                            <button
                                onClick={() => setShowMapModal(false)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowMapModal(false)}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                            >
                                Confirm Location
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default ReportIncident;
