/**
 * Get the price label based on supplier shipping settings
 * @param {Object} supplier - Supplier object with pricingSettings
 * @returns {string} - "Prix livrée" if handlesShipping is true, "Prix pickup" otherwise
 */
export function getPriceLabel(supplier) {
    if (!supplier) return 'Prix pickup';

    const handlesShipping = supplier.pricingSettings?.handlesShipping ?? false;
    return handlesShipping ? 'Prix livrée' : 'Prix pickup';
}

/**
 * Get the price label description based on supplier shipping settings
 * @param {Object} supplier - Supplier object with pricingSettings
 * @returns {string} - Description text
 */
export function getPriceLabelDescription(supplier) {
    if (!supplier) return 'Prix à l\'usine (sans frais de livraison)';

    const handlesShipping = supplier.pricingSettings?.handlesShipping ?? false;
    return handlesShipping
        ? 'Prix livré (expédition incluse)'
        : 'Prix à l\'usine (sans frais de livraison)';
}

/**
 * Get markup multiplier from supplier
 * @param {Object} supplier - Supplier object with pricingSettings
 * @returns {number} - Markup multiplier (e.g., 1.05 for 5%)
 */
export function getMarkupMultiplier(supplier) {
    if (!supplier) return 1.05; // Default 5%

    const markup = supplier.pricingSettings?.markup ?? 5;
    return 1 + (markup / 100);
}

/**
 * Round down to nearest 5 cents (lowest multiple of 0.05)
 * @param {number} value - Price value to round
 * @returns {number} - Rounded down to nearest 5 cents
 * @example roundDownToFiveCents(6.63) => 6.60
 * @example roundDownToFiveCents(6.67) => 6.65
 */
export function roundDownToFiveCents(value) {
    return Math.floor(value * 20) / 20;
}
