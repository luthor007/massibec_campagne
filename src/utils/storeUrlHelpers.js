// Utility function to get store URL (slug or ID fallback)
export function getStoreUrl(storeInfo) {
    if (!storeInfo) return '';

    // If slug is available, use it (root URL)
    if (storeInfo.slug) {
        return `/${storeInfo.slug}`;
    }

    // Otherwise, fallback to ID-based URL
    if (storeInfo.storeId) {
        return `/boutique/${storeInfo.storeId}`;
    }

    return '';
}

// Get full store URL with origin
export function getFullStoreUrl(storeInfo) {
    if (typeof window === 'undefined') return '';

    const path = getStoreUrl(storeInfo);
    return path ? `${window.location.origin}${path}` : '';
}

