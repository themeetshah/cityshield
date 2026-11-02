import { toast } from 'react-hot-toast';

/** Share via the Web Share API, falling back to copying the link. Never throws. */
const shareItem = async ({ title, text, url }) => {
    try {
        if (navigator.share) {
            await navigator.share({ title, text, url });
            return;
        }
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url || text || title);
            toast.success('Link copied to clipboard');
            return;
        }
        toast.error('Sharing is not supported in this browser');
    } catch (err) {
        // The user closing the share sheet is not an error.
        if (err?.name !== 'AbortError') toast.error('Could not share this item');
    }
};

export default shareItem;
