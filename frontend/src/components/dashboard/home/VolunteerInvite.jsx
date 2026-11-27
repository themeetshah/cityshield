import { Link } from 'react-router-dom';
import { HandHeart } from 'lucide-react';
import { IconChip } from './ui';
import { primaryButton } from './styles';

const COPY = {
    pending: {
        title: 'Your volunteer application is being reviewed',
        text: "The police department reviews every application. You'll get a notification with their decision.",
        cta: null,
    },
    rejected: {
        title: 'Your volunteer application was not approved',
        text: "Read the reviewer's notes on your profile. You can apply again.",
        cta: 'Read the notes',
    },
    none: {
        title: 'Help people near you',
        text: 'Approved volunteers get an alert when someone within 2 km raises an SOS, and can go to help or guide them to safety.',
        cta: 'Apply to volunteer',
    },
};

/** Citizens only. applicationStatus: null | 'pending' | 'rejected' | 'approved' */
const VolunteerInvite = ({ applicationStatus }) => {
    if (applicationStatus === 'approved') return null;
    const copy = COPY[applicationStatus] || COPY.none;
    return (
        <section aria-labelledby="invite-title" className="flex flex-col gap-4 rounded-3xl bg-amber-50 px-5 py-5 ring-1 ring-amber-100 sm:flex-row sm:items-center sm:px-6">
            <span className="self-start sm:self-center"><IconChip icon={HandHeart} tone="bg-white text-amber-600 ring-amber-100" /></span>
            <div className="min-w-0 flex-1">
                <h2 id="invite-title" className="text-lg font-black tracking-tight text-slate-900">{copy.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{copy.text}</p>
            </div>
            {copy.cta && <Link to="/profile" className={`${primaryButton} w-full sm:w-auto`}>{copy.cta}</Link>}
        </section>
    );
};

export default VolunteerInvite;
