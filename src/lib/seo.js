// SEO configuration and utilities
export const SEO_CONFIG = {
    siteName: 'Jappuie',
    siteUrl: process.env.NEXTAUTH_URL || 'https://jappuie.ca',
    defaultTitle: 'Jappuie - La révolution du financement scolaire commence ici',
    defaultDescription: 'Plateforme de financement scolaire qui connecte les écoles, les fournisseurs et les étudiants. Doublez vos profits avec 20x moins de gestion. Lancez votre campagne en 2 minutes.',
    defaultImage: '/images/jappuie_logo.png',
    locale: 'fr_CA',
    twitterHandle: '@jappuie', // Update with actual Twitter handle if available
    facebookAppId: '', // Add if available
};

export const generateSEOMetaTags = ({
    title,
    description,
    image,
    url,
    type = 'website',
    noindex = false,
    keywords = '',
}) => {
    const fullTitle = title ? `${title} | ${SEO_CONFIG.siteName}` : SEO_CONFIG.defaultTitle;
    const fullDescription = description || SEO_CONFIG.defaultDescription;
    const fullImage = image ? `${SEO_CONFIG.siteUrl}${image}` : `${SEO_CONFIG.siteUrl}${SEO_CONFIG.defaultImage}`;
    const fullUrl = url ? `${SEO_CONFIG.siteUrl}${url}` : SEO_CONFIG.siteUrl;

    return {
        title: fullTitle,
        description: fullDescription,
        image: fullImage,
        url: fullUrl,
        type,
        noindex,
        keywords,
    };
};

export const generateStructuredData = ({
    type = 'WebPage',
    title,
    description,
    url,
    image,
    breadcrumbs = [],
    additionalData = {},
}) => {
    const baseUrl = SEO_CONFIG.siteUrl;
    const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
    const fullImage = image ? `${baseUrl}${image}` : `${baseUrl}${SEO_CONFIG.defaultImage}`;

    const baseStructure = {
        "@context": "https://schema.org",
        "@type": type,
        "name": title || SEO_CONFIG.defaultTitle,
        "description": description || SEO_CONFIG.defaultDescription,
        "url": fullUrl,
        "inLanguage": SEO_CONFIG.locale,
        "isPartOf": {
            "@type": "WebSite",
            "name": SEO_CONFIG.siteName,
            "url": baseUrl
        },
        "primaryImageOfPage": {
            "@type": "ImageObject",
            "url": fullImage
        },
        ...additionalData
    };

    if (breadcrumbs.length > 0) {
        baseStructure.breadcrumb = {
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbs.map((crumb, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": crumb.name,
                "item": `${baseUrl}${crumb.url}`
            }))
        };
    }

    return baseStructure;
};

export const generateOrganizationSchema = () => {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": SEO_CONFIG.siteName,
        "url": SEO_CONFIG.siteUrl,
        "logo": `${SEO_CONFIG.siteUrl}${SEO_CONFIG.defaultImage}`,
        "description": SEO_CONFIG.defaultDescription,
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "Customer Service",
            "availableLanguage": ["French", "English"]
        },
        "sameAs": [
            // Add social media URLs here when available
        ]
    };
};

export const generateBreadcrumbSchema = (items) => {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": `${SEO_CONFIG.siteUrl}${item.url}`
        }))
    };
};

