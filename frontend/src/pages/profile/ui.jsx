import { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export const Card = ({ children, className = '', ...rest }) => (
    <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 ${className}`} {...rest}>
        {children}
    </div>
);

const VARIANTS = {
    primary: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow',
    secondary: 'bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50',
    danger: 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow',
    success: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow',
};

const SIZES = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-5 py-2.5 sm:py-3 text-sm sm:text-base',
};

export const Button = ({ variant = 'primary', size = 'md', className = '', type = 'button', children, ...rest }) => (
    <button
        type={type}
        className={`${VARIANTS[variant]} ${SIZES[size]} inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...rest}
    >
        {children}
    </button>
);

export const SectionHeading = ({ icon: Icon, gradient, title, description, children }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" aria-hidden="true" />
        </div>
        <div className="flex-1">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">{title}</h2>
            {description && <p className="text-gray-600 text-sm sm:text-base">{description}</p>}
        </div>
        {children}
    </div>
);

export const FieldError = ({ id, children }) =>
    children ? (
        <p id={id} className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {children}
        </p>
    ) : null;

const inputClass = (disabled, error) =>
    `w-full px-4 py-3 rounded-xl border-2 font-medium text-gray-900 text-sm sm:text-base transition-colors focus:outline-none focus:ring-4 focus:ring-blue-100 ${
        disabled ? 'border-gray-200 bg-gray-50 text-gray-600' : 'border-gray-300 focus:border-blue-500 bg-white'
    } ${error ? 'border-red-300 focus:border-red-500' : ''}`;

/** Labelled text/select input. `options` turns it into a <select>. */
export const Field = ({ id, label, required, error, options, disabled, hint, ...inputProps }) => {
    const errorId = error ? `${id}-error` : undefined;
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-sm sm:text-base font-bold text-gray-700">
                {label}
                {required && (
                    <span className="text-red-500 ml-1" aria-hidden="true">
                        *
                    </span>
                )}
            </label>
            {options ? (
                <select
                    id={id}
                    disabled={disabled}
                    required={required}
                    aria-invalid={!!error}
                    aria-describedby={errorId}
                    className={inputClass(disabled, error)}
                    {...inputProps}
                >
                    <option value="">Not specified</option>
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    id={id}
                    disabled={disabled}
                    required={required}
                    aria-invalid={!!error}
                    aria-describedby={errorId}
                    className={inputClass(disabled, error)}
                    {...inputProps}
                />
            )}
            {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
            <FieldError id={errorId}>{error}</FieldError>
        </div>
    );
};

export const PasswordField = ({ id, label, error, ...inputProps }) => {
    const [visible, setVisible] = useState(false);
    const errorId = error ? `${id}-error` : undefined;
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-sm sm:text-base font-bold text-gray-700">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    aria-invalid={!!error}
                    aria-describedby={errorId}
                    className={`${inputClass(false, error)} pr-12`}
                    {...inputProps}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                    aria-pressed={visible}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-500 hover:text-gray-700"
                >
                    {visible ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                </button>
            </div>
            <FieldError id={errorId}>{error}</FieldError>
        </div>
    );
};
