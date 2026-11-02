import { Phone } from 'lucide-react';
import EMERGENCY_NUMBERS from './emergencyNumberList';

const EmergencyNumbers = () => (
    <section aria-labelledby="emergency-numbers-title" className="mb-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100 text-center">
            <h2 id="emergency-numbers-title" className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Emergency numbers
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-2xl mx-auto">
                In an emergency, call the relevant service directly or use the SOS button to alert responders with your
                location.
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {EMERGENCY_NUMBERS.map((c) => (
                    <li key={c.number}>
                        <a
                            href={`tel:${c.number}`}
                            aria-label={`Call ${c.label}: ${c.number}`}
                            className="flex flex-col items-center gap-1 p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        >
                            <Phone className="w-5 h-5 text-blue-600" aria-hidden="true" />
                            <span className="text-2xl font-black text-gray-900">{c.number}</span>
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{c.label}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    </section>
);

export default EmergencyNumbers;
