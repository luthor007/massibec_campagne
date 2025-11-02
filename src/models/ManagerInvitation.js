import mongoose from 'mongoose';

const ManagerInvitationSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
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
ManagerInvitationSchema.index({ token: 1 }, { unique: true });
ManagerInvitationSchema.index({ email: 1, school: 1 });
ManagerInvitationSchema.index({ expiresAt: 1 });

// Compound index to prevent duplicate invitations
ManagerInvitationSchema.index({ email: 1, school: 1, status: 1 });

export default mongoose.models.ManagerInvitation || mongoose.model('ManagerInvitation', ManagerInvitationSchema);

