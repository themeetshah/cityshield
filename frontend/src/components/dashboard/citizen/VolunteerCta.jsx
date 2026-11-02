import { Link } from 'react-router-dom';
import { HandHeart } from 'lucide-react';

const COPY = {
    pending: {
        title: 'Your volunteer application is under review',
        text: 'The police department will review your application. You will get a notification when it is decided.',
        cta: null,
    },
    rejected: {
        title: 'Your volunteer application was not approved',
        text: 'You can see the reviewer’s notes and apply again from your profile.',
        cta: 'View application',
    },
    none: {
        title: 'Want to help people near you?',
        text: 'Approved volunteers are alerted to nearby SOS emergencies and can respond to them.',
        cta: 'Apply to volunteer',
    },
};

/** Citizens only. `applicationStatus`: null | 'pending' | 'rejected' | 'approved' */
const VolunteerCta = ({ applicationStatus }) => {
    if (applicationStatus === 'approved') return null;
    const copy = COPY[applicationStatus] || COPY.none;

    return (
        <section aria-labelledby="volunteer-cta-title" className="mb-12 sm:mb-16">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-6 rounded-3xl bg-emerald-50 border border-emerald-200">
                <HandHeart className="w-10 h-10 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                    <h2 id="volunteer-cta-title" className="text-lg font-bold text-gray-900">
                        {copy.title}
                    </h2>
                    <p className="text-sm text-gray-700">{copy.text}</p>
                </div>
                {copy.cta && (
                    <Link
                        to="/profile"
                        className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700"
                    >
                        {copy.cta}
                    </Link>
                )}
            </div>
        </section>
    );
};

export default VolunteerCta;
