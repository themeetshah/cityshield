import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Lock, X } from 'lucide-react';
import { errorMessage } from '../../services/api';
import { profileAPI } from '../../services/profile';
import { SectionError } from '../community/StateViews';
import { Button, Card, PasswordField, SectionHeading } from './ui';

const EMPTY = { current_password: '', new_password: '', confirm_password: '' };

const validate = (data, hasPassword) => {
    const errors = {};
    if (hasPassword && !data.current_password) errors.current_password = 'Enter your current password.';
    if (!data.new_password) errors.new_password = 'Enter a new password.';
    else if (data.new_password.length < 8) errors.new_password = 'Use at least 8 characters.';
    else if (hasPassword && data.new_password === data.current_password)
        errors.new_password = 'The new password must be different from the current one.';
    if (!data.confirm_password) errors.confirm_password = 'Confirm your new password.';
    else if (data.new_password !== data.confirm_password) errors.confirm_password = 'Passwords do not match.';
    return errors;
};

/** Change password, or set one for Google-only accounts (`hasPassword` false). */
const SecuritySettings = ({ userId, hasPassword, onPasswordSet }) => {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);

    const close = () => {
        setOpen(false);
        setData(EMPTY);
        setErrors({});
        setFormError(null);
    };

    const onChange = (e) => {
        const { name, value } = e.target;
        setData((d) => ({ ...d, [name]: value }));
        if (errors[name]) setErrors((errs) => ({ ...errs, [name]: undefined }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const found = validate(data, hasPassword);
        setErrors(found);
        if (Object.keys(found).length) return;

        setSaving(true);
        setFormError(null);
        try {
            const payload = hasPassword
                ? data
                : { new_password: data.new_password, confirm_password: data.confirm_password };
            const res = await profileAPI.changePassword(userId, payload);
            toast.success(res?.message || 'Password updated');
            close();
            if (!hasPassword) await onPasswordSet();
        } catch (err) {
            setFormError(errorMessage(err, 'Could not update your password.'));
        } finally {
            setSaving(false);
        }
    };

    const title = hasPassword ? 'Change password' : 'Set a password';

    return (
        <Card className="p-4 sm:p-6 lg:p-8">
            <SectionHeading
                icon={Lock}
                gradient="from-purple-500 to-pink-600"
                title="Security"
                description={
                    hasPassword
                        ? 'Update the password you use to sign in.'
                        : 'You sign in with Google. Set a password to also sign in with your email address.'
                }
            >
                {!open && (
                    <Button size="sm" variant={hasPassword ? 'primary' : 'warning'} onClick={() => setOpen(true)}>
                        <Lock className="w-4 h-4" aria-hidden="true" />
                        {title}
                    </Button>
                )}
            </SectionHeading>

            {open && (
                <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label={title}>
                    {formError && <SectionError message={formError} />}
                    {hasPassword && (
                        <PasswordField
                            id="current-password"
                            name="current_password"
                            label="Current password"
                            autoComplete="current-password"
                            value={data.current_password}
                            onChange={onChange}
                            error={errors.current_password}
                        />
                    )}
                    <PasswordField
                        id="new-password"
                        name="new_password"
                        label="New password"
                        autoComplete="new-password"
                        value={data.new_password}
                        onChange={onChange}
                        error={errors.new_password}
                    />
                    <PasswordField
                        id="confirm-password"
                        name="confirm_password"
                        label="Confirm new password"
                        autoComplete="new-password"
                        value={data.confirm_password}
                        onChange={onChange}
                        error={errors.confirm_password}
                    />
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button type="submit" variant="success" disabled={saving} className="flex-1">
                            {saving ? 'Saving…' : title}
                        </Button>
                        <Button variant="secondary" onClick={close} disabled={saving} className="flex-1">
                            <X className="w-4 h-4" aria-hidden="true" />
                            Cancel
                        </Button>
                    </div>
                </form>
            )}
        </Card>
    );
};

export default SecuritySettings;
