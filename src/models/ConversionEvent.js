import mongoose from 'mongoose';

const ConversionEventSchema = new mongoose.Schema({
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
  eventType: {
    type: String,
    enum: ['visit', 'add_to_cart', 'checkout_reached', 'payment_completed'],
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
ConversionEventSchema.index({ storeId: 1, createdAt: -1 });
ConversionEventSchema.index({ campaignId: 1, createdAt: -1 });
ConversionEventSchema.index({ sessionId: 1, eventType: 1 });
ConversionEventSchema.index({ eventType: 1, createdAt: -1 });
ConversionEventSchema.index({ createdAt: -1 });

export default mongoose.models.ConversionEvent || mongoose.model('ConversionEvent', ConversionEventSchema);

