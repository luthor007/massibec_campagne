// Utility functions for generating URL-friendly slugs

/**
 * Generate a URL-friendly slug from a name
 * @param {string} name - The name to convert to a slug
 * @returns {string} - The slug (e.g., "marie-tremblay")
 */
export function generateSlug(name) {
    if (!name) return '';

    return name
        .toLowerCase()
        .trim()
        // Replace accented characters with their non-accented equivalents
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // Replace spaces and special characters with hyphens
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        // Remove multiple consecutive hyphens
        .replace(/-+/g, '-')
        // Remove leading and trailing hyphens
        .replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique slug by appending a number if needed
 * @param {string} baseSlug - The base slug
 * @param {Function} checkExists - Async function that checks if slug exists, returns true if exists
 * @returns {Promise<string>} - A unique slug
 */
export async function generateUniqueSlug(baseSlug, checkExists) {
    let slug = baseSlug;
    let counter = 1;

    while (await checkExists(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
}

