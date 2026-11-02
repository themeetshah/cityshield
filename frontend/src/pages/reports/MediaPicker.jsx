import { Camera, Upload, X } from 'lucide-react';
import { MAX_MEDIA_BYTES, MAX_MEDIA_FILES, MEDIA_ACCEPT_ATTR, formatFileSize } from './reportConfig';

/** Evidence upload list. `items`: [{ id, file, preview, kind, name, size }]. */
const MediaPicker = ({ items, onAdd, onRemove, errors }) => {
    const full = items.length >= MAX_MEDIA_FILES;
    return (
        <section className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100" aria-labelledby="media-heading">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div>
                    <h2 id="media-heading" className="text-xl font-bold text-gray-900">Media evidence</h2>
                    <p className="text-gray-600 text-sm">
                        Optional. Up to {MAX_MEDIA_FILES} photos or videos, {MAX_MEDIA_BYTES / (1024 * 1024)} MB each.
                    </p>
                </div>
            </div>

            <label
                htmlFor="report-media"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl px-2 text-center ${full
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer'}`}
            >
                <Upload className="w-6 h-6 text-gray-500 mb-2" aria-hidden="true" />
                <span className="text-sm text-gray-600 font-semibold">
                    {full ? 'Maximum number of files reached' : 'Choose photos or videos'}
                </span>
                <span className="text-xs text-gray-500">JPEG, PNG, WebP, GIF · MP4, WebM, MOV</span>
            </label>
            <input
                id="report-media"
                type="file"
                multiple
                accept={MEDIA_ACCEPT_ATTR}
                onChange={(event) => {
                    onAdd(Array.from(event.target.files || []));
                    event.target.value = '';
                }}
                className="sr-only"
                disabled={full}
            />

            {errors.length > 0 && (
                <ul className="mt-3 text-sm text-red-700 list-disc list-inside" role="alert">
                    {errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
            )}

            {items.length > 0 && (
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                        <li key={item.id} className="relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                            {item.kind === 'image' ? (
                                <img src={item.preview} alt={`Preview of ${item.name}`} className="w-full h-32 object-cover" />
                            ) : (
                                <video src={item.preview} className="w-full h-32 object-cover bg-gray-900" muted controls playsInline preload="metadata" />
                            )}
                            <div className="p-3">
                                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(item.size)} · {item.kind}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemove(item.id)}
                                aria-label={`Remove ${item.name}`}
                                className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg"
                            >
                                <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export default MediaPicker;
