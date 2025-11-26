// utils/inventoryHelpers.js

/**
 * Calculate the suggested addition to reach the next multiple of productsPerBox
 * @param {number} soldQuantity - The quantity already sold
 * @param {number} productsPerBox - The number of products per box (default: 6 for backward compatibility)
 * @returns {number} - The suggested addition to reach next multiple
 * @example
 * calculateMultipleOfBoxSuggestion(10, 6) // returns 2 (to reach 12)
 * calculateMultipleOfBoxSuggestion(13, 6) // returns 5 (to reach 18)
 * calculateMultipleOfBoxSuggestion(6, 6) // returns 0 (already a multiple)
 * calculateMultipleOfBoxSuggestion(10, 12) // returns 2 (to reach 12)
 */
export function calculateMultipleOfBoxSuggestion(soldQuantity, productsPerBox = 6) {
    const boxSize = parseInt(productsPerBox) || 6; // Default to 6 for backward compatibility
    if (!soldQuantity || soldQuantity <= 0) {
        return boxSize; // If nothing sold, suggest ordering one box
    }

    // Calculate next multiple of boxSize
    const nextMultiple = Math.ceil(soldQuantity / boxSize) * boxSize;

    // Return the difference
    return nextMultiple - soldQuantity;
}

/**
 * Legacy function for backward compatibility - uses 6 as default
 * @deprecated Use calculateMultipleOfBoxSuggestion instead
 */
export function calculateMultipleOf6Suggestion(soldQuantity) {
    return calculateMultipleOfBoxSuggestion(soldQuantity, 6);
}

/**
 * Calculate the next multiple of productsPerBox for a given quantity
 * @param {number} quantity - The quantity
 * @param {number} productsPerBox - The number of products per box (default: 6 for backward compatibility)
 * @returns {number} - The next multiple
 */
export function getNextMultipleOfBox(quantity, productsPerBox = 6) {
    const boxSize = parseInt(productsPerBox) || 6; // Default to 6 for backward compatibility
    if (!quantity || quantity <= 0) {
        return boxSize;
    }
    return Math.ceil(quantity / boxSize) * boxSize;
}

/**
 * Legacy function for backward compatibility - uses 6 as default
 * @deprecated Use getNextMultipleOfBox instead
 */
export function getNextMultipleOf6(quantity) {
    return getNextMultipleOfBox(quantity, 6);
}

/**
 * Check if a quantity is a multiple of productsPerBox
 * @param {number} quantity - The quantity to check
 * @param {number} productsPerBox - The number of products per box (default: 6 for backward compatibility)
 * @returns {boolean} - True if quantity is a multiple
 */
export function isMultipleOfBox(quantity, productsPerBox = 6) {
    const boxSize = parseInt(productsPerBox) || 6; // Default to 6 for backward compatibility
    return quantity > 0 && quantity % boxSize === 0;
}

/**
 * Legacy function for backward compatibility - uses 6 as default
 * @deprecated Use isMultipleOfBox instead
 */
export function isMultipleOf6(quantity) {
    return isMultipleOfBox(quantity, 6);
}

/**
 * Aggregate products from orders and calculate suggestions
 * @param {Array} orders - Array of order objects with products
 * @param {Object} productsMap - Optional map of productName to product object with casePack info
 * @returns {Object} - Object mapping productName to aggregated data
 */
export function aggregateProductsWithSuggestions(orders, productsMap = {}) {
    const productMap = {};

    orders.forEach(order => {
        if (order.products && Array.isArray(order.products)) {
            order.products.forEach(product => {
                const productName = product.productName || product.name;
                if (!productName) return;

                const quantity = product.quantity || 0;
                const price = product.productPrice || product.price || 0;
                const cost = product.productCost || product.cost || 0;

                if (!productMap[productName]) {
                    // Get productsPerBox from productsMap or default to 6
                    const productInfo = productsMap[productName] || {};
                    const productsPerBox = parseInt(productInfo.casePack) || 6;

                    productMap[productName] = {
                        productName,
                        soldQuantity: 0,
                        price,
                        cost,
                        suggestedAddition: 0,
                        nextMultiple: 0,
                        productsPerBox // Store for later use
                    };
                }

                productMap[productName].soldQuantity += quantity;
            });
        }
    });

    // Calculate suggestions for each product using their specific productsPerBox
    Object.values(productMap).forEach(product => {
        const productsPerBox = product.productsPerBox || 6;
        product.suggestedAddition = calculateMultipleOfBoxSuggestion(product.soldQuantity, productsPerBox);
        product.nextMultiple = getNextMultipleOfBox(product.soldQuantity, productsPerBox);
    });

    return productMap;
}

