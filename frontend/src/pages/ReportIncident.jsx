import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, EyeOff, Loader2, MapPin, Send } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import useGeolocation from '../hooks/useGeolocation';
import { errorMessage } from '../services/api';
import { createReport, reverseGeocode } from '../services/reports';
import LocationPicker from './reports/LocationPicker';
import MediaPicker from './reports/MediaPicker';
import {
    ACCEPTED_MEDIA, DESCRIPTION_LIMITS, MAX_MEDIA_BYTES, MAX_MEDIA_FILES, REPORT_TYPE_OPTIONS, TITLE_LIMITS,
} from './reports/reportConfig';

const EMPTY_FORM = { title: '', description: '', report_type: '', is_anonymous: false };
let mediaCounter = 0;

const validate = (form, pin) => {
    const problems = {};
    const title = form.title.trim();
    const description = form.description.trim();
    if (!form.report_type) problems.report_type = 'Choose an incident type.';
    if (title.length < TITLE_LIMITS.min) problems.title = `Title must be at least ${TITLE_LIMITS.min} characters.`;
    if (description.length < DESCRIPTION_LIMITS.min) {
        problems.description = `Description must be at least ${DESCRIPTION_LIMITS.min} characters.`;
    }
    if (!pin) problems.location = 'Set the incident location on the map.';
    return problems;
};

/** Reverse-geocodes the current pin (stale lookups are aborted). */
const useAddress = (pin) => {
    const [address, setAddress] = useState({ status: 'idle', text: '' });
    const lat = pin?.latitude;
    const lng = pin?.longitude;

    useEffect(() => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
        const controller = new AbortController();
        setAddress({ status: 'loading', text: '' });
        reverseGeocode(lat, lng, { signal: controller.signal })
            .then((data) => setAddress({ status: 'done', text: data.display_name || '' }))
            .catch(() => {
                if (!controller.signal.aborted) setAddress({ status: 'error', text: '' });
            });
        return () => controller.abort();
    }, [lat, lng]);

    return address;
};

const ReportIncident = () => {
    const navigate = useNavigate();
    const geo = useGeolocation();
    const [form, setForm] = useState(EMPTY_FORM);
    const [manualPin, setManualPin] = useState(null);
    const [media, setMedia] = useState([]);
    const [mediaErrors, setMediaErrors] = useState([]);
    const [showErrors, setShowErrors] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const pin = manualPin || (geo.location ? { ...geo.location, source: 'device' } : null);
    const address = useAddress(pin);
    const problems = validate(form, pin);
    const isValid = Object.keys(problems).length === 0;

    // Revoke every preview URL still alive when the page unmounts.
    const mediaRef = useRef(media);
    useEffect(() => {
        mediaRef.current = media;
    }, [media]);
    useEffect(() => () => mediaRef.current.forEach((item) => URL.revokeObjectURL(item.preview)), []);

    const updateField = (field) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handlePick = useCallback((latitude, longitude) => {
        setManualPin({ latitude, longitude, source: 'manual' });
    }, []);

    const resetToDeviceLocation = () => {
        setManualPin(null);
        geo.refresh();
    };

    const addMedia = (files) => {
        const errors = [];
        const accepted = [];
        for (const file of files) {
            const kind = ACCEPTED_MEDIA[file.type];
            if (!kind) errors.push(`${file.name}: unsupported file type.`);
            else if (file.size > MAX_MEDIA_BYTES) errors.push(`${file.name}: larger than ${MAX_MEDIA_BYTES / (1024 * 1024)} MB.`);
            else if (media.length + accepted.length >= MAX_MEDIA_FILES) errors.push(`${file.name}: only ${MAX_MEDIA_FILES} files allowed.`);
            else {
                mediaCounter += 1;
                accepted.push({ id: mediaCounter, file, kind, name: file.name, size: file.size, preview: URL.createObjectURL(file) });
            }
        }
        setMediaErrors(errors);
        if (accepted.length) setMedia((prev) => [...prev, ...accepted]);
    };

    const removeMedia = (id) => {
        const item = media.find((m) => m.id === id);
        if (item) URL.revokeObjectURL(item.preview);
        setMedia((prev) => prev.filter((m) => m.id !== id));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!isValid) {
            setShowErrors(true);
            return;
        }
        setSubmitting(true);
        const payload = new FormData();
        payload.append('title', form.title.trim());
        payload.append('description', form.description.trim());
        payload.append('report_type', form.report_type);
        payload.append('latitude', pin.latitude.toFixed(6));
        payload.append('longitude', pin.longitude.toFixed(6));
        if (address.text) payload.append('location', address.text);
        payload.append('is_anonymous', form.is_anonymous ? 'true' : 'false');
        media.forEach((item) => payload.append('media', item.file));

        try {
            const report = await createReport(payload);
            media.forEach((item) => URL.revokeObjectURL(item.preview));
            setMedia([]);
            toast.success('Report submitted. Thank you for helping keep your community safe.');
            navigate(`/reports/${report.id}`);
        } catch (err) {
            toast.error(errorMessage(err, 'Could not submit your report. Please try again.'));
            setSubmitting(false);
        }
    };

    const fieldError = (name) => showErrors && problems[name] && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600">{problems[name]}</p>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
                        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                        <span>Back</span>
                    </button>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                            Report an incident
                        </h1>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Your report goes to the responsible department. For emergencies happening right now, use SOS or call 112.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                    <section className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100" aria-labelledby="location-heading">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-white" aria-hidden="true" />
                            </div>
                            <div>
                                <h2 id="location-heading" className="text-xl font-bold text-gray-900">Location</h2>
                                <p className="text-gray-600 text-sm">Tap the map or drag the marker to where it happened.</p>
                            </div>
                        </div>

                        <LocationPicker pin={pin} onPick={handlePick} />

                        <div className="mt-4 space-y-3 text-sm" aria-live="polite">
                            {!pin && geo.loading && (
                                <p className="flex items-center gap-2 text-blue-800"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Getting your location…</p>
                            )}
                            {!pin && !geo.loading && (
                                <p className="text-amber-800">
                                    {geo.error || 'Your location is not available.'} Tap the map to place the incident.
                                </p>
                            )}
                            {pin && (
                                <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-green-800">
                                    <p className="font-semibold flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" aria-hidden="true" />
                                        {pin.source === 'manual' ? 'Location chosen on the map' : 'Your current location'}
                                    </p>
                                    <p className="mt-1">
                                        {address.status === 'loading' && 'Looking up the address…'}
                                        {address.status === 'done' && (address.text || 'No address found for this point.')}
                                        {address.status === 'error' && 'Address lookup unavailable; the coordinates will still be sent.'}
                                    </p>
                                    <p className="text-xs font-mono mt-1">{pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</p>
                                </div>
                            )}
                            {fieldError('location')}
                            <button
                                type="button"
                                onClick={resetToDeviceLocation}
                                disabled={geo.loading}
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2.5 px-5 rounded-xl disabled:opacity-50"
                            >
                                {geo.loading ? 'Getting location…' : 'Use my current location'}
                            </button>
                        </div>
                    </section>

                    <fieldset className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
                        <legend className="sr-only">Incident type</legend>
                        <h2 className="text-xl font-bold text-gray-900 mb-1" aria-hidden="true">Incident type</h2>
                        <p className="text-gray-600 text-sm mb-6">Choose the category that best fits. It decides which department handles it.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {REPORT_TYPE_OPTIONS.map((type) => {
                                const Icon = type.icon;
                                const selected = form.report_type === type.value;
                                return (
                                    <label
                                        key={type.value}
                                        className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-colors ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="report_type"
                                            value={type.value}
                                            checked={selected}
                                            onChange={updateField('report_type')}
                                            className="sr-only"
                                        />
                                        <span className={`w-11 h-11 rounded-xl mb-3 flex items-center justify-center bg-gradient-to-br ${type.gradient}`}>
                                            <Icon className="w-5 h-5 text-white" aria-hidden="true" />
                                        </span>
                                        <span className="block font-bold text-gray-900">{type.label}</span>
                                        <span className="block text-sm text-gray-600">{type.description}</span>
                                        {selected && <CheckCircle className="absolute top-3 right-3 w-6 h-6 text-blue-600" aria-hidden="true" />}
                                    </label>
                                );
                            })}
                        </div>
                        {fieldError('report_type')}
                    </fieldset>

                    <section className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100 space-y-6" aria-labelledby="details-heading">
                        <h2 id="details-heading" className="text-xl font-bold text-gray-900">Details</h2>
                        <div>
                            <label htmlFor="report-title" className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                            <input
                                id="report-title"
                                type="text"
                                value={form.title}
                                onChange={updateField('title')}
                                placeholder="e.g. Broken street light on Main Road"
                                maxLength={TITLE_LIMITS.max}
                                aria-invalid={showErrors && !!problems.title}
                                aria-describedby="title-count title-error"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p id="title-count" className="text-right text-sm text-gray-500 mt-1">{form.title.length}/{TITLE_LIMITS.max}</p>
                            {fieldError('title')}
                        </div>
                        <div>
                            <label htmlFor="report-description" className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                            <textarea
                                id="report-description"
                                value={form.description}
                                onChange={updateField('description')}
                                placeholder="What happened, when, and anything that helps responders."
                                rows={6}
                                maxLength={DESCRIPTION_LIMITS.max}
                                aria-invalid={showErrors && !!problems.description}
                                aria-describedby="description-count description-error"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                            />
                            <p id="description-count" className="text-right text-sm text-gray-500 mt-1">{form.description.length}/{DESCRIPTION_LIMITS.max}</p>
                            {fieldError('description')}
                        </div>
                        <label htmlFor="report-anonymous" className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
                            <input
                                id="report-anonymous"
                                type="checkbox"
                                checked={form.is_anonymous}
                                onChange={updateField('is_anonymous')}
                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>
                                <span className="font-semibold text-gray-900 flex items-center gap-2">
                                    <EyeOff className="w-4 h-4" aria-hidden="true" /> Report anonymously
                                </span>
                                <span className="block text-sm text-gray-600">
                                    Your name is hidden from other users and responders. You can still see this report under your reports;
                                    platform administrators can see who filed it.
                                </span>
                            </span>
                        </label>
                    </section>

                    <MediaPicker items={media} onAdd={addMedia} onRemove={removeMedia} errors={mediaErrors} />

                    <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button type="button" onClick={() => navigate(-1)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Send className="w-5 h-5" aria-hidden="true" />}
                                {submitting ? 'Submitting…' : 'Submit report'}
                            </button>
                        </div>
                        {showErrors && !isValid && (
                            <p className="text-sm text-red-600 mt-3 text-center" role="alert">Please fix the highlighted fields.</p>
                        )}
                    </div>
                </form>
            </main>
            <Footer />
        </div>
    );
};

export default ReportIncident;
