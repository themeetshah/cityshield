/** First message per field from a DRF validation error body ({field: [msg]}). */
export const fieldErrorsFrom = (err) => {
    const data = err?.response?.data;
    if (!data || typeof data !== 'object' || data.error || data.detail) return {};
    return Object.fromEntries(
        Object.entries(data).map(([field, msg]) => [field, Array.isArray(msg) ? String(msg[0]) : String(msg)])
    );
};
