import mongoose from 'mongoose';

const SchoolManagerSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
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

// Compound index to ensure unique user-school combinations
SchoolManagerSchema.index({ school: 1, user: 1 }, { unique: true });

// Index for efficient queries
SchoolManagerSchema.index({ school: 1, status: 1 });
SchoolManagerSchema.index({ user: 1, status: 1 });

export default mongoose.models.SchoolManager || mongoose.model('SchoolManager', SchoolManagerSchema);

