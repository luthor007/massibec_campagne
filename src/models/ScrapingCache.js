// src/models/ScrapingCache.js
import mongoose from 'mongoose';

const ScrapingCacheSchema = new mongoose.Schema({
    websiteUrl: {
        type: String,
        required: true
    },
    companyInfo: {
        name: String,
        description: String,
        email: String,
        phone: String,
        address: String,
        logo: String,
        certifications: [String],
        storageType: String
    },
    scrapedAt: {
        type: Date,
        default: Date.now
    },
    // Store a sample of products (first 5) for preview
    sampleProducts: [{
        name: String,
        description: String,
        pricePickup: Number,
        priceStudent: Number,
        priceFinal: Number,
        image: String,
        category: String
    }],
    // Store ALL products for reuse during registration
    allProducts: [{
        name: String,
        description: String,
        pricePickup: Number,
        priceStudent: Number,
        priceFinal: Number,
        image: String,
        category: String,
        ingredientsImage: String,
        nutritionImage: String,
        unitSize: String,
        casePack: String,
        pallet: {
            ti: Number,
            hi: Number
        },
        refrigerated: Boolean,
        ingredientsText: String,
        nutritionText: String,
        sourceUrl: String,
        attributes: {
            freezable: Boolean,
            glutenFree: Boolean,
            vegetarian: Boolean,
            vegan: Boolean,
            nutFree: Boolean,
            halal: Boolean,
            kosher: Boolean,
            organic: Boolean,
            quebecProduct: Boolean,
            allergens: String
        }
    }],
    totalProductsFound: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for faster lookups (unique index for websiteUrl)
ScrapingCacheSchema.index({ websiteUrl: 1 }, { unique: true });
ScrapingCacheSchema.index({ scrapedAt: -1 });

// Auto-delete cache entries older than 30 days
ScrapingCacheSchema.index({ scrapedAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

const ScrapingCache = mongoose.models.ScrapingCache || mongoose.model('ScrapingCache', ScrapingCacheSchema);

export default ScrapingCache;


