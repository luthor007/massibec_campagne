import mongoose from 'mongoose';

const BidSchema = new mongoose.Schema({
    // Reference to the shipment
    shipmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shipment',
        required: true
    },
    // Reference to the distributor (user with role 'distributor')
    distributorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Bid amount (price for the delivery) - required if palletPrices is not provided
    amount: {
        type: Number,
        required: function () {
            return !this.palletPrices || this.palletPrices.size === 0;
        },
        min: 0
    },
    // Number of pallets for this bid
    palletCount: {
        type: Number,
        min: 1,
        max: 11
    },
    // Prices for different pallet counts (1-11 pallets)
    palletPrices: {
        type: Map,
        of: Number,
        default: {}
    },
    // Currency (default to CAD)
    currency: {
        type: String,
        default: 'CAD',
        enum: ['CAD', 'USD']
    },
    // Estimated delivery date
    estimatedDeliveryDate: {
        type: Date,
        required: true
    },
    // Additional notes from distributor
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    // Status of the bid
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
        default: 'pending'
    },
    // Whether this bid was selected (winner)
    isSelected: {
        type: Boolean,
        default: false
    },
    // Date when bid was selected
    selectedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
BidSchema.index({ shipmentId: 1, distributorId: 1 }, { unique: true }); // One bid per distributor per shipment
BidSchema.index({ shipmentId: 1, status: 1 });
BidSchema.index({ distributorId: 1, status: 1 });
BidSchema.index({ isSelected: 1 });

// Pre-save hook to sanitize string fields to ensure valid UTF-8
BidSchema.pre('save', function (next) {
    const stringFields = ['currency', 'status', 'notes'];

    for (const field of stringFields) {
        if (this[field] && typeof this[field] === 'string') {
            try {
                this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
            } catch (e) {
                console.error(`Error encoding Bid.${field}:`, e);
                this[field] = '';
            }
        }
    }

    next();
});

export default mongoose.models.Bid || mongoose.model('Bid', BidSchema);

