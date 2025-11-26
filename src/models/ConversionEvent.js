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

// Pre-save hook to sanitize string fields to ensure valid UTF-8
ConversionEventSchema.pre('save', function (next) {
  const stringFields = ['sessionId', 'eventType'];

  for (const field of stringFields) {
    if (this[field] && typeof this[field] === 'string') {
      try {
        this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
      } catch (e) {
        console.error(`Error encoding ConversionEvent.${field}:`, e);
        this[field] = '';
      }
    }
  }

  // Sanitize metadata object if it contains string values
  if (this.metadata && typeof this.metadata === 'object') {
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'string') {
            try {
              obj[key] = Buffer.from(obj[key], 'utf8').toString('utf8');
            } catch (e) {
              console.error(`Error encoding ConversionEvent.metadata.${key}:`, e);
              obj[key] = '';
            }
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
        }
      }
    };
    sanitizeObject(this.metadata);
  }

  next();
});

export default mongoose.models.ConversionEvent || mongoose.model('ConversionEvent', ConversionEventSchema);

