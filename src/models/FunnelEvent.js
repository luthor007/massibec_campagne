import mongoose from 'mongoose';

const FunnelEventSchema = new mongoose.Schema({
    eventType: {
        type: String,
        enum: [
            'home_visit',
            'landing_page_visit',
            'hero_cta_click',
            'registration_page_visit',
            'registration_started',
            'registration_step_completed',
            'registration_completed',
            'email_verification_clicked',
            'email_verified',
            'campaign_joined',
            'onboarding_step_completed',
            'onboarding_completed',
            'store_created',
            'store_personalized',
            'visit',
            'add_to_cart',
            'first_add_to_cart',
            'checkout_reached',
            'payment_completed',
            'first_order_placed',
            'login',
            // School-specific events
            'school_registration_page_visit',
            'school_registration_started',
            'school_registration_step_completed',
            'school_registration_completed',
            'school_email_verified',
            'school_profile_completed',
            'school_campaign_created',
            // Supplier-specific events
            'supplier_email_verified',
            'supplier_registration_page_visit',
            'supplier_registration_started',
            'supplier_registration_step_completed',
            'supplier_registration_completed'
        ],
        required: true
    },
    userType: {
        type: String,
        enum: ['student', 'school', 'supplier', 'fournisseur', 'anonymous'],
        default: 'anonymous'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Can be null for anonymous visitors
    },
    sessionId: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
        // Can include: step, formType, campaignId, schoolId, timeToComplete, etc.
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
FunnelEventSchema.index({ eventType: 1, createdAt: -1 });
FunnelEventSchema.index({ sessionId: 1, eventType: 1 });
FunnelEventSchema.index({ userId: 1, eventType: 1, createdAt: -1 });
FunnelEventSchema.index({ userType: 1, eventType: 1, createdAt: -1 });
FunnelEventSchema.index({ createdAt: -1 });
FunnelEventSchema.index({ 'metadata.campaignId': 1 });
FunnelEventSchema.index({ 'metadata.schoolId': 1 });

// Pre-save hook to sanitize string fields to ensure valid UTF-8
FunnelEventSchema.pre('save', function (next) {
    const stringFields = ['eventType', 'userType', 'sessionId'];

    for (const field of stringFields) {
        if (this[field] && typeof this[field] === 'string') {
            try {
                this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
            } catch (e) {
                console.error(`Error encoding FunnelEvent.${field}:`, e);
                this[field] = '';
            }
        }
    }

    // Sanitize metadata object if it contains string values
    if (this.metadata && typeof this.metadata === 'object') {
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'string') {
                        try {
                            obj[key] = Buffer.from(obj[key], 'utf8').toString('utf8');
                        } catch (e) {
                            console.error(`Error encoding FunnelEvent.metadata.${key}:`, e);
                            obj[key] = '';
                        }
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        sanitizeObject(obj[key]);
                    }
                }
            }
        };
        sanitizeObject(this.metadata);
    }

    next();
});

export default mongoose.models.FunnelEvent || mongoose.model('FunnelEvent', FunnelEventSchema);

