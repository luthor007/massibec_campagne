// src/lib/deliveryCalculator.js
// Calculate delivery cost based on DMB quote and product pallet information

/**
 * DMB Delivery Rate Structure (from quote):
 * - Less than 10 pallets: FCA rates + 5% fuel surcharge
 * - 10+ pallets or 9999+ lbs: FTL rates + 5% fuel surcharge
 * - Additional fees: Tailgate service $50, Limited access $100
 */

// DMB rates for less than 10 pallets (example from Shawinigan to Cornwall, 273km)
const DMB_RATES_LESS_THAN_10 = {
    1: 85,
    2: 118,
    3: 165,
    4: 205,
    5: 260,
    6: 265,
    7: 320,
    8: 350,
    9: 375
};

// DMB rates for 10+ pallets
const DMB_RATES_10_PLUS = {
    10: 420,
    11: 450,
    12: 475,
    13: 510,
    14: 540,
    15: 550,
    16: 585 // 15+ pallets
};

const FUEL_SURCHARGE_PERCENT = 0.50; // 5%
const TAILGATE_SERVICE_FEE = 50;
const LIMITED_ACCESS_FEE = 100;

/**
 * Calculate distance between two addresses (simplified - in production, use Google Maps API)
 * For now, returns a default distance. In production, this should use geocoding and distance calculation.
 */
function calculateDistance(originAddress, destinationAddress) {
    // TODO: Implement actual distance calculation using Google Maps Distance Matrix API
    // For now, return a default distance (e.g., 273km as in the example)
    // This should be replaced with actual geocoding and distance calculation
    return 273; // km (default example)
}

/**
 * Calculate number of pallets needed for a quantity of products
 * @param {number} quantity - Number of products
 * @param {number} productsPerPallet - Number of products per pallet (from pallet.ti * pallet.hi)
 * @returns {number} Number of pallets needed (rounded up)
 */
function calculatePallets(quantity, productsPerPallet) {
    if (!productsPerPallet || productsPerPallet <= 0) {
        return 1; // Default to 1 pallet if not specified
    }
    return Math.ceil(quantity / productsPerPallet);
}

/**
 * Get DMB rate for a given number of pallets
 * @param {number} numPallets - Number of pallets
 * @returns {number} Base rate in CAD
 */
function getDMBRate(numPallets) {
    if (numPallets < 10) {
        // Use rates for less than 10 pallets
        const rate = DMB_RATES_LESS_THAN_10[numPallets] || DMB_RATES_LESS_THAN_10[9];
        return rate;
    } else {
        // Use rates for 10+ pallets
        if (numPallets >= 16) {
            return DMB_RATES_10_PLUS[16]; // 15+ pallets
        }
        return DMB_RATES_10_PLUS[numPallets] || DMB_RATES_10_PLUS[15];
    }
}

/**
 * Calculate delivery cost per product for school delivery
 * @param {Object} params
 * @param {Object} params.product - Product object with pallet information
 * @param {string} params.supplierAddress - Supplier address
 * @param {string} params.schoolAddress - School address
 * @param {number} params.totalQuantity - Total quantity of this product in the order
 * @param {boolean} params.requiresTailgate - Whether tailgate service is required
 * @param {boolean} params.isLimitedAccess - Whether location has limited access
 * @returns {number} Delivery cost per product in CAD
 */
export function calculateDeliveryCostPerProduct({
    product,
    supplierAddress,
    schoolAddress,
    totalQuantity = 1,
    requiresTailgate = false,
    isLimitedAccess = false
}) {
    // Calculate number of boxes per pallet (ti = tiers/layers, hi = boxes per layer)
    const boxesPerPallet = (product.pallet?.ti || 0) * (product.pallet?.hi || 0);

    // Get number of products per box from casePack
    // casePack is a string like "12" or "24", need to parse it
    const productsPerBox = parseInt(product.casePack) || 1;

    // Calculate number of products per pallet: boxes × products per box
    const productsPerPallet = boxesPerPallet * productsPerBox;

    // If no pallet info, default to 1 product per pallet (worst case)
    const effectiveProductsPerPallet = productsPerPallet > 0 ? productsPerPallet : 1;

    // Calculate number of pallets needed for this product
    const numPallets = calculatePallets(totalQuantity, effectiveProductsPerPallet);

    // Get base rate from DMB
    const baseRate = getDMBRate(numPallets);

    // Calculate distance (simplified - should use actual geocoding in production)
    const distance = calculateDistance(supplierAddress, schoolAddress);

    // TODO: Adjust rate based on distance (for now, using fixed rates from quote)
    // In production, you might want to interpolate or use a distance-based formula

    // Add fuel surcharge (5%)
    const fuelSurcharge = baseRate * FUEL_SURCHARGE_PERCENT;

    // Add additional fees
    let additionalFees = 0;
    if (requiresTailgate) {
        additionalFees += TAILGATE_SERVICE_FEE;
    }
    if (isLimitedAccess) {
        additionalFees += LIMITED_ACCESS_FEE;
    }

    // Total delivery cost for this product's pallets
    const totalDeliveryCost = baseRate + fuelSurcharge + additionalFees;

    // Calculate cost per product (distribute delivery cost across all products)
    const costPerProduct = totalDeliveryCost / totalQuantity;

    return Math.round(costPerProduct * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate delivery cost for an entire order
 * @param {Array} orderItems - Array of { product, quantity }
 * @param {string} supplierAddress - Supplier address
 * @param {string} schoolAddress - School address
 * @param {boolean} requiresTailgate - Whether tailgate service is required
 * @param {boolean} isLimitedAccess - Whether location has limited access
 * @returns {Object} { totalDeliveryCost, costPerProduct: { productId: cost } }
 */
export function calculateOrderDeliveryCost({
    orderItems,
    supplierAddress,
    schoolAddress,
    requiresTailgate = false,
    isLimitedAccess = false
}) {
    let totalDeliveryCost = 0;
    const costPerProduct = {};

    // Group products by pallet configuration to optimize pallet usage
    // For now, calculate separately for each product type
    // In production, you might want to optimize pallet loading

    orderItems.forEach(({ product, quantity }) => {
        const productDeliveryCost = calculateDeliveryCostPerProduct({
            product,
            supplierAddress,
            schoolAddress,
            totalQuantity: quantity,
            requiresTailgate,
            isLimitedAccess
        });

        costPerProduct[product._id || product.id] = productDeliveryCost;
        totalDeliveryCost += productDeliveryCost * quantity;
    });

    return {
        totalDeliveryCost: Math.round(totalDeliveryCost * 100) / 100,
        costPerProduct
    };
}

/**
 * Calculate school price for a product
 * Formula: pricePickup * 1.05 + deliveryCostToSchool
 * @param {number} pricePickup - Pickup price at factory
 * @param {number} deliveryCostToSchool - Delivery cost to school (per product)
 * @returns {number} School price
 */
export function calculateSchoolPrice(pricePickup, deliveryCostToSchool = 0) {
    const basePrice = pricePickup * 1.05; // 5% base markup
    return Math.round((basePrice + deliveryCostToSchool) * 100) / 100;
}

