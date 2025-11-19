import mongoose from 'mongoose';

const StoreVisitSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be null for anonymous visitors
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: false
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: false
  },
  sessionId: {
    type: String,
    required: true
  },
  deviceType: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet', 'unknown'],
    default: 'unknown'
  },
  location: {
    country: { type: String },
    region: { type: String },
    city: { type: String }
  },
  userAgent: {
    type: String
  },
  ip: {
    type: String
  },
  source: {
    type: String,
    enum: ['qr', 'facebook', 'instagram', 'twitter', 'email', 'direct', 'link', 'other', 'unknown'],
    default: 'unknown'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
StoreVisitSchema.index({ storeId: 1, createdAt: -1 });
StoreVisitSchema.index({ campaignId: 1, createdAt: -1 });
StoreVisitSchema.index({ userId: 1, createdAt: -1 });
StoreVisitSchema.index({ sessionId: 1 });
StoreVisitSchema.index({ createdAt: -1 });
StoreVisitSchema.index({ source: 1 });

export default mongoose.models.StoreVisit || mongoose.model('StoreVisit', StoreVisitSchema);

