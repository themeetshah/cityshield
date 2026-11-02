import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Edit, Save, User, X } from 'lucide-react';
import { errorMessage } from '../../services/api';
import { profileAPI } from '../../services/profile';
import { Button, Card, Field, SectionHeading } from './ui';
import { fieldErrorsFrom } from './fieldErrors';

const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((v) => ({ value: v, label: v }));

const EDITABLE = ['name', 'phone', 'location', 'date_of_birth', 'gender', 'blood_group'];

const toForm = (profile) =>
    Object.fromEntries(EDITABLE.map((key) => [key, profile?.[key] ?? '']));

const ProfileForm = ({ profile, onSaved }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(() => toForm(profile));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const startEdit = () => {
        setForm(toForm(profile));
        setErrors({});
        setEditing(true);
    };

    const cancel = () => {
        setForm(toForm(profile));
        setErrors({});
        setEditing(false);
    };

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        if (errors[name]) setErrors((errs) => ({ ...errs, [name]: undefined }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setErrors({ name: 'Please enter your name.' });
            return;
        }
        setSaving(true);
        try {
            const payload = { ...form, name: form.name.trim(), date_of_birth: form.date_of_birth || null };
            const updated = await profileAPI.updateProfile(payload);
            setEditing(false);
            setErrors({});
            toast.success('Profile updated');
            await onSaved(updated);
        } catch (err) {
            setErrors(fieldErrorsFrom(err));
            toast.error(errorMessage(err, 'Could not update your profile.'));
        } finally {
            setSaving(false);
        }
    };

    const values = editing ? form : toForm(profile);
    const fieldProps = (name) => ({
        id: `profile-${name}`,
        name,
        value: values[name] || '',
        onChange,
        disabled: !editing,
        error: errors[name],
    });

    return (
        <Card className="p-4 sm:p-6 lg:p-8">
            <SectionHeading
                icon={User}
                gradient="from-blue-500 to-purple-600"
                title="Personal information"
                description="Keep your contact details up to date so responders can reach you."
            >
                {!editing && (
                    <Button onClick={startEdit} size="sm">
                        <Edit className="w-4 h-4" aria-hidden="true" />
                        Edit profile
                    </Button>
                )}
            </SectionHeading>

            <form onSubmit={onSubmit} noValidate>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                    <Field label="Full name" required autoComplete="name" {...fieldProps('name')} />
                    <Field
                        id="profile-email"
                        label="Email address"
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        readOnly
                        hint="Your email address cannot be changed."
                    />
                    <Field label="Phone number" type="tel" autoComplete="tel" placeholder="+919876543210" {...fieldProps('phone')} />
                    <Field label="Location" autoComplete="address-level2" placeholder="City or area" {...fieldProps('location')} />
                    <Field label="Date of birth" type="date" {...fieldProps('date_of_birth')} />
                    <Field label="Gender" options={GENDER_OPTIONS} {...fieldProps('gender')} />
                    <Field label="Blood group" options={BLOOD_GROUPS} {...fieldProps('blood_group')} />
                </div>

                {editing && (
                    <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200">
                        <Button type="submit" variant="success" disabled={saving} className="flex-1">
                            {saving ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                            ) : (
                                <Save className="w-4 h-4" aria-hidden="true" />
                            )}
                            {saving ? 'Saving…' : 'Save changes'}
                        </Button>
                        <Button variant="secondary" onClick={cancel} disabled={saving} className="flex-1">
                            <X className="w-4 h-4" aria-hidden="true" />
                            Cancel
                        </Button>
                    </div>
                )}
            </form>
        </Card>
    );
};

export default ProfileForm;
