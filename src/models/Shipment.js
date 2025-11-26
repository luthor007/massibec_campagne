import mongoose from 'mongoose';

const ShipmentSchema = new mongoose.Schema({
    // Reference to the campaign that generated this shipment
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    // Reference to the supplier
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    // Reference to the school
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    // Supplier address (pickup location)
    pickupAddress: {
        type: String,
        required: true,
        trim: true
    },
    pickupCity: {
        type: String,
        trim: true
    },
    pickupPostalCode: {
        type: String,
        trim: true
    },
    // School address (delivery location)
    deliveryAddress: {
        type: String,
        required: true,
        trim: true
    },
    deliveryCity: {
        type: String,
        trim: true
    },
    deliveryPostalCode: {
        type: String,
        trim: true
    },
    // Products to be shipped
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        productName: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        weight: {
            type: Number, // in kg
            default: 0
        },
        dimensions: {
            length: { type: Number, default: 0 }, // in cm
            width: { type: Number, default: 0 },
            height: { type: Number, default: 0 }
        }
    }],
    // Total weight and volume for shipping calculation
    totalWeight: {
        type: Number, // in kg
        default: 0
    },
    totalVolume: {
        type: Number, // in cubic cm
        default: 0
    },
    // Status of the shipment
    status: {
        type: String,
        enum: ['pending', 'bidding', 'awarded', 'in_transit', 'delivered', 'cancelled'],
        default: 'pending'
    },
    // Bidding information
    biddingStartDate: {
        type: Date,
        default: Date.now
    },
    biddingEndDate: {
        type: Date,
        required: true
    },
    // Selected distributor (winner of the bid)
    selectedDistributorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Selected bid
    selectedBidId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bid'
    },
    // Delivery date requested by school
    requestedDeliveryDate: {
        type: Date,
        required: true
    },
    // Actual delivery date
    actualDeliveryDate: {
        type: Date
    },
    // Special instructions
    pickupInstructions: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    deliveryInstructions: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    // Contact information
    supplierContact: {
        name: { type: String },
        phone: { type: String },
        email: { type: String }
    },
    schoolContact: {
        name: { type: String },
        phone: { type: String },
        email: { type: String }
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
ShipmentSchema.index({ campaignId: 1 });
ShipmentSchema.index({ supplierId: 1 });
ShipmentSchema.index({ schoolId: 1 });
ShipmentSchema.index({ status: 1 });
ShipmentSchema.index({ biddingEndDate: 1 });
ShipmentSchema.index({ selectedDistributorId: 1 });

// Pre-save hook to sanitize string fields to ensure valid UTF-8
ShipmentSchema.pre('save', function (next) {
    // Sanitize top-level string fields
    const topLevelFields = [
        'pickupAddress', 'pickupCity', 'pickupPostalCode',
        'deliveryAddress', 'deliveryCity', 'deliveryPostalCode',
        'status', 'pickupInstructions', 'deliveryInstructions'
    ];

    for (const field of topLevelFields) {
        if (this[field] && typeof this[field] === 'string') {
            try {
                this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
            } catch (e) {
                console.error(`Error encoding Shipment.${field}:`, e);
                this[field] = '';
            }
        }
    }

    // Sanitize products array
    if (this.products && Array.isArray(this.products)) {
        for (const product of this.products) {
            if (product.productName && typeof product.productName === 'string') {
                try {
                    product.productName = Buffer.from(product.productName, 'utf8').toString('utf8');
                } catch (e) {
                    console.error(`Error encoding Shipment.products.productName:`, e);
                    product.productName = '';
                }
            }
        }
    }

    // Sanitize supplierContact nested fields
    if (this.supplierContact) {
        const contactFields = ['name', 'phone', 'email'];
        for (const field of contactFields) {
            if (this.supplierContact[field] && typeof this.supplierContact[field] === 'string') {
                try {
                    this.supplierContact[field] = Buffer.from(this.supplierContact[field], 'utf8').toString('utf8');
                } catch (e) {
                    console.error(`Error encoding Shipment.supplierContact.${field}:`, e);
                    this.supplierContact[field] = '';
                }
            }
        }
    }

    // Sanitize schoolContact nested fields
    if (this.schoolContact) {
        const contactFields = ['name', 'phone', 'email'];
        for (const field of contactFields) {
            if (this.schoolContact[field] && typeof this.schoolContact[field] === 'string') {
                try {
                    this.schoolContact[field] = Buffer.from(this.schoolContact[field], 'utf8').toString('utf8');
                } catch (e) {
                    console.error(`Error encoding Shipment.schoolContact.${field}:`, e);
                    this.schoolContact[field] = '';
                }
            }
        }
    }

    next();
});

export default mongoose.models.Shipment || mongoose.model('Shipment', ShipmentSchema);

