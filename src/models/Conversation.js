import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
    // Participants: school and supplier
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
    // Optional: related campaign
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: false
    },
    // Last message info for quick access
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        required: false
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    // Unread counts for each participant
    unreadCountSchool: {
        type: Number,
        default: 0
    },
    unreadCountSupplier: {
        type: Number,
        default: 0
    },
    // Status
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for efficient queries
ConversationSchema.index({ school: 1, supplier: 1 });
ConversationSchema.index({ supplier: 1, school: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ campaign: 1 });

// Ensure unique conversation per school-supplier pair
ConversationSchema.index({ school: 1, supplier: 1 }, { unique: true });

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);


