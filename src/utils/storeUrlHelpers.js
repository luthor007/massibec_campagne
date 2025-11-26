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
export function getFullStoreUrl(storeInfo, source = null) {
    if (typeof window === 'undefined') return '';

    const path = getStoreUrl(storeInfo);
    if (!path) return '';

    const baseUrl = `${window.location.origin}${path}`;

    // Add source parameter if provided
    if (source) {
        const separator = path.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}source=${source}`;
    }

    return baseUrl;
}

// Get store URL with source parameter (for server-side usage)
export function getFullStoreUrlWithSource(storeInfo, source, baseUrl) {
    const path = getStoreUrl(storeInfo);
    if (!path) return '';

    const fullPath = baseUrl ? `${baseUrl}${path}` : path;
    const separator = path.includes('?') ? '&' : '?';
    return source ? `${fullPath}${separator}source=${source}` : fullPath;
}

