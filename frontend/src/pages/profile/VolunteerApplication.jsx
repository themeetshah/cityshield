import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircle, Clock, HandHeart, XCircle } from 'lucide-react';
import { errorMessage } from '../../services/api';
import { profileAPI } from '../../services/profile';
import { formatDateTime } from '../community/format';
import { SectionError } from '../community/StateViews';
import { Button, Card, Field } from './ui';

/** Citizens only: apply to become a volunteer (reviewed by the police department). */
const VolunteerApplication = ({ defaultPhone, onApproved }) => {
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [phone, setPhone] = useState(defaultPhone || '');
    const [phoneError, setPhoneError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await profileAPI.getVolunteerApplicationStatus();
            setApplication(data);
            setLoadError(null);
            // Approved since this session started: reload the user so the volunteer role takes effect.
            if (data?.status === 'approved' && onApproved) onApproved();
        } catch (err) {
            setLoadError(errorMessage(err, 'Could not load your volunteer application.'));
        } finally {
            setLoading(false);
        }
    }, [onApproved]);

    useEffect(() => {
        load();
    }, [load]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!phone.trim()) {
            setPhoneError('A phone number is required so the police can contact you.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await profileAPI.applyForVolunteer(phone.trim());
            toast.success(res?.message || 'Application submitted');
            setFormOpen(false);
            await load();
        } catch (err) {
            const msg = errorMessage(err, 'Could not submit your application.');
            setPhoneError(err?.response?.data?.details?.phone_number?.[0] || msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    const status = application?.status;
    const canApply = !status || status === 'rejected';

    return (
        <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <HandHeart className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Volunteer</h2>
            </div>

            {loadError ? (
                <SectionError message={loadError} onRetry={load} />
            ) : (
                <div className="space-y-4 text-sm">
                    {status === 'pending' && (
                        <p className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 text-yellow-800 border border-yellow-200">
                            <Clock className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                            <span>
                                Your application is pending review
                                {application.applied_at ? ` (submitted ${formatDateTime(application.applied_at)})` : ''}.
                            </span>
                        </p>
                    )}
                    {status === 'approved' && (
                        <p className="flex items-start gap-2 p-3 rounded-xl bg-green-50 text-green-800 border border-green-200">
                            <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                            <span>Your application was approved. Your volunteer tools are being enabled.</span>
                        </p>
                    )}
                    {status === 'rejected' && (
                        <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 space-y-1">
                            <p className="flex items-start gap-2">
                                <XCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                                <span>Your previous application was not approved.</span>
                            </p>
                            {application.notes && <p className="pl-7">Reviewer notes: {application.notes}</p>}
                        </div>
                    )}
                    {!status && (
                        <p className="text-gray-600">
                            Volunteers are alerted to SOS emergencies near them and can respond. Applications are reviewed
                            by the police department.
                        </p>
                    )}

                    {canApply &&
                        (formOpen ? (
                            <form onSubmit={onSubmit} noValidate className="space-y-3" aria-label="Volunteer application">
                                <Field
                                    id="volunteer-phone"
                                    label="Phone number"
                                    type="tel"
                                    required
                                    autoComplete="tel"
                                    placeholder="+919876543210"
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        setPhoneError(null);
                                    }}
                                    error={phoneError}
                                />
                                <div className="flex gap-2">
                                    <Button type="submit" size="sm" variant="success" disabled={submitting} className="flex-1">
                                        {submitting ? 'Submitting…' : 'Submit application'}
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <Button size="sm" variant="success" onClick={() => setFormOpen(true)} className="w-full">
                                <HandHeart className="w-4 h-4" aria-hidden="true" />
                                {status === 'rejected' ? 'Apply again' : 'Become a volunteer'}
                            </Button>
                        ))}
                </div>
            )}
        </Card>
    );
};

export default VolunteerApplication;
