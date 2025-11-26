import mongoose from 'mongoose';

const AdminManagerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // Only one admin manager record per user
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'member'],
        required: true,
        default: 'admin'
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    invitedAt: {
        type: Date,
        default: Date.now
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'invited', 'removed'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Index for efficient queries
AdminManagerSchema.index({ user: 1, status: 1 });
AdminManagerSchema.index({ status: 1 });

export default mongoose.models.AdminManager || mongoose.model('AdminManager', AdminManagerSchema);

