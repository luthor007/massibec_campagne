import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: false // Optional, can review supplier in general
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // The school manager who left the review
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
            validator: function (v) {
                return Number.isInteger(v) && v >= 1 && v <= 5;
            },
            message: 'Rating must be an integer between 1 and 5'
        }
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    // Categories for detailed feedback
    categories: {
        productQuality: { type: Number, min: 1, max: 5 },
        deliveryTime: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },
        pricing: { type: Number, min: 1, max: 5 },
        support: { type: Number, min: 1, max: 5 }
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false // Can be verified if from a completed campaign
    }
}, {
    timestamps: true
});

// Ensure one review per school-supplier-campaign combination
ReviewSchema.index({ school: 1, supplier: 1, campaign: 1 }, { unique: true, sparse: true });
// Index for supplier reviews
ReviewSchema.index({ supplier: 1, createdAt: -1 });
// Index for school reviews
ReviewSchema.index({ school: 1, createdAt: -1 });

// Pre-save hook to sanitize string fields to ensure valid UTF-8
ReviewSchema.pre('save', function (next) {
    if (this.comment && typeof this.comment === 'string') {
        try {
            this.comment = Buffer.from(this.comment, 'utf8').toString('utf8');
        } catch (e) {
            console.error(`Error encoding Review.comment:`, e);
            this.comment = '';
        }
    }

    next();
});

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);


