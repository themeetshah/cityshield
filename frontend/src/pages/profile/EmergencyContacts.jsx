import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Phone, Plus, Trash2, X } from 'lucide-react';
import { errorMessage } from '../../services/api';
import { profileAPI } from '../../services/profile';
import { SectionError, SectionLoading } from '../community/StateViews';
import { Button, Card, Field } from './ui';
import { fieldErrorsFrom } from './fieldErrors';

const EMPTY = { name: '', phone: '', relationship: '' };
const MAX_CONTACTS = 10;

const ContactRow = ({ contact, onDelete }) => {
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const remove = async () => {
        setDeleting(true);
        const ok = await onDelete(contact.id);
        if (!ok) {
            setDeleting(false);
            setConfirming(false);
        }
    };

    return (
        <li className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 break-words">{contact.name}</p>
                    <a href={`tel:${contact.phone}`} className="text-sm text-blue-700 hover:underline">
                        {contact.phone}
                    </a>
                    {contact.relationship && <p className="text-xs text-red-700 font-semibold mt-1">{contact.relationship}</p>}
                </div>
                {!confirming && (
                    <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        aria-label={`Delete emergency contact ${contact.name}`}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-100"
                    >
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                    </button>
                )}
            </div>
            {confirming && (
                <div className="flex items-center gap-2 mt-3" role="group" aria-label={`Confirm deleting ${contact.name}`}>
                    <span className="text-sm text-gray-700 flex-1">Delete this contact?</span>
                    <Button size="sm" variant="danger" onClick={remove} disabled={deleting}>
                        {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={deleting}>
                        Cancel
                    </Button>
                </div>
            )}
        </li>
    );
};

const EmergencyContacts = ({ userId }) => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await profileAPI.getEmergencyContacts(userId);
            setContacts(Array.isArray(data) ? data : []);
            setLoadError(null);
        } catch (err) {
            setLoadError(errorMessage(err, 'Could not load your emergency contacts.'));
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        load();
    }, [load]);

    const closeForm = () => {
        setAdding(false);
        setForm(EMPTY);
        setErrors({});
    };

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        if (errors[name]) setErrors((errs) => ({ ...errs, [name]: undefined }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const created = await profileAPI.addEmergencyContact(userId, {
                name: form.name.trim(),
                phone: form.phone.trim(),
                relationship: form.relationship.trim() || 'Family',
            });
            setContacts((list) => [...list, created]);
            toast.success('Emergency contact added');
            closeForm();
        } catch (err) {
            setErrors(fieldErrorsFrom(err));
            toast.error(errorMessage(err, 'Could not add the contact.'));
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (contactId) => {
        try {
            await profileAPI.deleteEmergencyContact(userId, contactId);
            setContacts((list) => list.filter((c) => c.id !== contactId));
            toast.success('Emergency contact deleted');
            return true;
        } catch (err) {
            toast.error(errorMessage(err, 'Could not delete the contact.'));
            return false;
        }
    };

    return (
        <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mr-auto">Emergency contacts</h2>
                {!adding && contacts.length < MAX_CONTACTS && !loading && !loadError && (
                    <button
                        type="button"
                        onClick={() => setAdding(true)}
                        aria-label="Add emergency contact"
                        className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600"
                    >
                        <Plus className="w-5 h-5" aria-hidden="true" />
                    </button>
                )}
            </div>

            {adding && (
                <form onSubmit={onSubmit} noValidate className="mb-5 p-4 bg-red-50 border-2 border-red-100 rounded-2xl space-y-4" aria-label="Add emergency contact">
                    <Field id="contact-name" name="name" label="Name" required autoComplete="off" value={form.name} onChange={onChange} error={errors.name} />
                    <Field id="contact-phone" name="phone" label="Phone number" type="tel" required placeholder="+919876543210" value={form.phone} onChange={onChange} error={errors.phone} />
                    <Field id="contact-relationship" name="relationship" label="Relationship" placeholder="Family" value={form.relationship} onChange={onChange} error={errors.relationship} />
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" variant="danger" disabled={saving || !form.name.trim() || !form.phone.trim()} className="flex-1">
                            <Plus className="w-4 h-4" aria-hidden="true" />
                            {saving ? 'Adding…' : 'Add contact'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={closeForm} disabled={saving}>
                            <X className="w-4 h-4" aria-hidden="true" />
                            Cancel
                        </Button>
                    </div>
                </form>
            )}

            {loading ? (
                <SectionLoading label="Loading contacts…" />
            ) : loadError ? (
                <SectionError message={loadError} onRetry={load} />
            ) : contacts.length === 0 ? (
                !adding && (
                    <div className="text-center py-8">
                        <p className="font-bold text-gray-900 mb-1">No emergency contacts</p>
                        <p className="text-gray-600 text-sm mb-4">Add the people who should be contacted in an emergency.</p>
                        <Button size="sm" variant="danger" onClick={() => setAdding(true)}>
                            <Plus className="w-4 h-4" aria-hidden="true" />
                            Add first contact
                        </Button>
                    </div>
                )
            ) : (
                <ul className="space-y-3">
                    {contacts.map((c) => (
                        <ContactRow key={c.id} contact={c} onDelete={onDelete} />
                    ))}
                </ul>
            )}
            {contacts.length >= MAX_CONTACTS && (
                <p className="text-xs text-gray-500 mt-3">You can store at most {MAX_CONTACTS} emergency contacts.</p>
            )}
        </Card>
    );
};

export default EmergencyContacts;
