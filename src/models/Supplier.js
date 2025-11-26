import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 200,
        validate: {
            validator: function (v) {
                return v && typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 200;
            },
            message: 'Supplier name must be a non-empty string between 1 and 200 characters'
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: 100,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    companyEmail: {
        type: String,
        required: false,
        trim: true,
        lowercase: true,
        maxlength: 100,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    address: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    ville: {
        type: String,
        trim: true,
        maxlength: 100
    },
    codePostal: {
        type: String,
        trim: true,
        maxlength: 20
    },
    logo: {
        type: String,
        maxlength: 500
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    website: {
        type: String,
        trim: true,
        maxlength: 500
    },
    scrapedAt: {
        type: Date
    },
    scrapingStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    certifications: [{
        type: String,
        trim: true
    }],
    storageType: {
        type: String,
        enum: ['ambient', 'chilled', 'frozen'],
        default: 'ambient'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    approved: {
        type: Boolean,
        default: true // Auto-approved if all required fields provided
    },
    visibleInList: {
        type: Boolean,
        default: false // Not visible by default until supplier opts in
    },
    approvedAt: {
        type: Date,
        default: Date.now
    },
    companyInfo: {
        taxId: { type: String, trim: true, maxlength: 100 },
        businessNumber: { type: String, trim: true, maxlength: 100 },
        legalName: { type: String, trim: true, maxlength: 200 }
    },
    paymentInfo: {
        preferredMethod: { type: String, enum: ['cheque', 'virement', 'other'], default: 'virement' },
        bankName: { type: String, trim: true, maxlength: 100 },
        accountNumber: { type: String, trim: true, maxlength: 100 },
        transitNumber: { type: String, trim: true, maxlength: 100 },
        notes: { type: String, trim: true, maxlength: 500 },
        chequeSpecimen: { type: String, maxlength: 500 } // URL to uploaded cheque specimen image
    },
    // Delivery settings for school delivery
    deliverySettings: {
        // Instructions for the delivery driver picking up products at the factory
        pickupInstructions: { type: String, trim: true, maxlength: 1000 },
        // Direct to consumer delivery (bypasses school)
        directToConsumerEnabled: { type: Boolean, default: false },
        // Delivery fee per order for direct to consumer (not per product)
        directToConsumerFee: { type: Number, default: 0, min: 0 },
        // Region covered by direct to consumer delivery
        directToConsumerRegion: { type: String, trim: true, maxlength: 200 },
        // Minimum days between campaign end date and delivery date
        minimumDeliveryDays: { type: Number, default: 21, min: 1, max: 365 }
    },
    // Pricing and shipping configuration
    pricingSettings: {
        // Markup percentage applied to supplier prices (default 5% = 1.05 multiplier)
        markup: { type: Number, default: 5, min: 0, max: 100 },
        // Whether supplier handles shipping (if true, "Prix pickup" becomes "Prix livrée")
        handlesShipping: { type: Boolean, default: false }
    },
    invitations: [{
        email: { type: String, required: true, lowercase: true },
        token: { type: String, required: true },
        role: { type: String, enum: ['admin', 'member'], required: true },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        expiresAt: { type: Date, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    // Reference to products catalog (products will reference this supplier)
    // This is a virtual relationship - products have supplier field
}, {
    versionKey: false,
    timestamps: true
});

// Indexes for better performance
// Note: email and name indexes are automatically created by unique: true
SupplierSchema.index({ status: 1, approved: 1 });

// Pre-save hook to sanitize string fields
SupplierSchema.pre('save', function (next) {
    const stringFields = ['name', 'email', 'phone', 'address', 'ville', 'codePostal', 'logo', 'description', 'website'];

    for (const field of stringFields) {
        if (this[field] && typeof this[field] === 'string') {
            try {
                this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
            } catch (e) {
                console.error(`Error encoding ${field}:`, e);
                this[field] = '';
            }
        }
    }

    next();
});

export default mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);

