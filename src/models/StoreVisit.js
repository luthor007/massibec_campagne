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

// Pre-save hook to sanitize string fields to ensure valid UTF-8
StoreVisitSchema.pre('save', function (next) {
  const stringFields = ['sessionId', 'deviceType', 'userAgent', 'ip', 'source'];

  // Sanitize top-level string fields
  for (const field of stringFields) {
    if (this[field] && typeof this[field] === 'string') {
      try {
        this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
      } catch (e) {
        console.error(`Error encoding StoreVisit.${field}:`, e);
        this[field] = '';
      }
    }
  }

  // Sanitize location nested fields
  if (this.location) {
    const locationFields = ['country', 'region', 'city'];
    for (const field of locationFields) {
      if (this.location[field] && typeof this.location[field] === 'string') {
        try {
          this.location[field] = Buffer.from(this.location[field], 'utf8').toString('utf8');
        } catch (e) {
          console.error(`Error encoding StoreVisit.location.${field}:`, e);
          this.location[field] = '';
        }
      }
    }
  }

  next();
});

export default mongoose.models.StoreVisit || mongoose.model('StoreVisit', StoreVisitSchema);

