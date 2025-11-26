import mongoose from 'mongoose';

const SupplierManagerSchema = new mongoose.Schema({
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'member'],
        required: true
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

// Compound index to ensure unique user-supplier combinations
SupplierManagerSchema.index({ supplier: 1, user: 1 }, { unique: true });

// Index for efficient queries
SupplierManagerSchema.index({ supplier: 1, status: 1 });
SupplierManagerSchema.index({ user: 1, status: 1 });

export default mongoose.models.SupplierManager || mongoose.model('SupplierManager', SupplierManagerSchema);



