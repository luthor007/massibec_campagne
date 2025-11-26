import mongoose from 'mongoose';

const AdminInvitationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'member'],
        required: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'expired', 'cancelled'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Index for efficient queries
AdminInvitationSchema.index({ token: 1 }, { unique: true });
AdminInvitationSchema.index({ email: 1, status: 1 });
AdminInvitationSchema.index({ expiresAt: 1 });

// Pre-save hook to sanitize string fields to ensure valid UTF-8
AdminInvitationSchema.pre('save', function (next) {
    const stringFields = ['email', 'role', 'token', 'status'];

    for (const field of stringFields) {
        if (this[field] && typeof this[field] === 'string') {
            try {
                this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
            } catch (e) {
                console.error(`Error encoding AdminInvitation.${field}:`, e);
                this[field] = '';
            }
        }
    }

    next();
});

export default mongoose.models.AdminInvitation || mongoose.model('AdminInvitation', AdminInvitationSchema);

