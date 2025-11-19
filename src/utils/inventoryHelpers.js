// utils/inventoryHelpers.js

/**
 * Calculate the suggested addition to reach the next multiple of 6
 * @param {number} soldQuantity - The quantity already sold
 * @returns {number} - The suggested addition to reach next multiple of 6
 * @example
 * calculateMultipleOf6Suggestion(10) // returns 2 (to reach 12)
 * calculateMultipleOf6Suggestion(13) // returns 5 (to reach 18)
 * calculateMultipleOf6Suggestion(6) // returns 0 (already a multiple of 6)
 */
export function calculateMultipleOf6Suggestion(soldQuantity) {
    if (!soldQuantity || soldQuantity <= 0) {
        return 6; // If nothing sold, suggest ordering 6
    }

    // Calculate next multiple of 6
    const nextMultiple = Math.ceil(soldQuantity / 6) * 6;

    // Return the difference
    return nextMultiple - soldQuantity;
}

/**
 * Calculate the next multiple of 6 for a given quantity
 * @param {number} quantity - The quantity
 * @returns {number} - The next multiple of 6
 */
export function getNextMultipleOf6(quantity) {
    if (!quantity || quantity <= 0) {
        return 6;
    }
    return Math.ceil(quantity / 6) * 6;
}

/**
 * Check if a quantity is a multiple of 6
 * @param {number} quantity - The quantity to check
 * @returns {boolean} - True if quantity is a multiple of 6
 */
export function isMultipleOf6(quantity) {
    return quantity > 0 && quantity % 6 === 0;
}

/**
 * Aggregate products from orders and calculate suggestions
 * @param {Array} orders - Array of order objects with products
 * @returns {Object} - Object mapping productName to aggregated data
 */
export function aggregateProductsWithSuggestions(orders) {
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
                    productMap[productName] = {
                        productName,
                        soldQuantity: 0,
                        price,
                        cost,
                        suggestedAddition: 0,
                        nextMultiple: 0
                    };
                }

                productMap[productName].soldQuantity += quantity;
            });
        }
    });

    // Calculate suggestions for each product
    Object.values(productMap).forEach(product => {
        product.suggestedAddition = calculateMultipleOf6Suggestion(product.soldQuantity);
        product.nextMultiple = getNextMultipleOf6(product.soldQuantity);
    });

    return productMap;
}


