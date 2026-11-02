import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, ImageIcon, Maximize2, VideoIcon, X } from 'lucide-react';
import { mediaUrl } from '../../services/api';
import { fileExtension, isVideoPath } from './reportConfig';

const Lightbox = ({ item, onClose }) => {
    const closeRef = useRef(null);

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        closeRef.current?.focus();
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Evidence image"
            onClick={onClose}
        >
            <div className="relative max-w-6xl w-full" onClick={(event) => event.stopPropagation()}>
                <div className="flex justify-end gap-2 mb-3">
                    <a
                        href={mediaUrl(item.file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-semibold"
                    >
                        <ExternalLink className="w-4 h-4" aria-hidden="true" /> Open original
                    </a>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-semibold"
                    >
                        <X className="w-4 h-4" aria-hidden="true" /> Close
                    </button>
                </div>
                <img src={mediaUrl(item.file)} alt="Evidence, full size" className="w-full max-h-[80vh] object-contain rounded-xl bg-black" />
            </div>
        </div>
    );
};

const ReportMediaGallery = ({ media }) => {
    const [selected, setSelected] = useState(null);
    const closeLightbox = useCallback(() => setSelected(null), []);
    if (!media?.length) return null;
    const videos = media.filter((item) => isVideoPath(item.file)).length;

    return (
        <section className="bg-white rounded-2xl lg:rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100" aria-labelledby="evidence-heading">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl">
                        <ImageIcon className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 id="evidence-heading" className="text-xl sm:text-2xl font-bold text-gray-900">Evidence</h2>
                        <p className="text-gray-600 text-sm">{media.length} file{media.length === 1 ? '' : 's'} attached</p>
                    </div>
                </div>
                <p className="text-xs text-gray-600">
                    {media.length - videos} image{media.length - videos === 1 ? '' : 's'} · {videos} video{videos === 1 ? '' : 's'}
                </p>
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {media.map((item, index) => {
                    const url = mediaUrl(item.file);
                    const video = isVideoPath(item.file);
                    return (
                        <li key={item.id} className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50">
                            {video ? (
                                <video src={url} className="w-full aspect-video bg-gray-900" preload="metadata" controls playsInline />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setSelected(item)}
                                    className="group relative block w-full aspect-video"
                                    aria-label={`Enlarge evidence ${index + 1}`}
                                >
                                    <img src={url} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                        <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100" aria-hidden="true" />
                                    </span>
                                </button>
                            )}
                            <div className="p-4 flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                    {video ? <VideoIcon className="w-4 h-4" aria-hidden="true" /> : <ImageIcon className="w-4 h-4" aria-hidden="true" />}
                                    Evidence {index + 1}
                                    <span className="text-xs text-gray-500 uppercase">.{fileExtension(item.file)}</span>
                                </span>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
                                    Open
                                </a>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {selected && <Lightbox item={selected} onClose={closeLightbox} />}
        </section>
    );
};

export default ReportMediaGallery;
