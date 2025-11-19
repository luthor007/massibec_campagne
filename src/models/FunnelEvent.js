import mongoose from 'mongoose';

const FunnelEventSchema = new mongoose.Schema({
    eventType: {
        type: String,
        enum: [
            'home_visit',
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
            'first_add_to_cart',
            'first_order_placed',
            'login',
            // School-specific events
            'school_registration_page_visit',
            'school_registration_started',
            'school_registration_step_completed',
            'school_registration_completed',
            'school_email_verified',
            'school_profile_completed',
            'school_campaign_created'
        ],
        required: true
    },
    userType: {
        type: String,
        enum: ['student', 'school', 'anonymous'],
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

export default mongoose.models.FunnelEvent || mongoose.model('FunnelEvent', FunnelEventSchema);

