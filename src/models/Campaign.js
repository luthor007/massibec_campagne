import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema({
  // Basic campaign info
  name: { type: String, trim: true, maxlength: 200 }, // Nom de la campagne (ex: "École Primaire - Janvier 2025")
  campaignNumber: { type: Number, required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true }, // Campaign is tied to one supplier
  campaignCode: { type: String, required: true }, // Format: {SCHOOL_CODE}-C{CAMPAIGN_NUMBER}

  // Campaign dates
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  deliveryDate: { type: Date },

  // Distribution hours
  distributionStartHour: { type: String, trim: true }, // Hour when distribution starts (e.g., "10h00")
  distributionEndHour: { type: String, trim: true }, // Hour when distribution ends (e.g., "15h00")
  truckArrivalHour: { type: String, trim: true }, // Hour when delivery truck arrives for unloading (e.g., "08h00")

  // Campaign status
  isActive: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'active', 'completed', 'pending_school_approval'],
    default: 'approved' // Auto-approved by default
  },
  // Campaign mode: test (can modify) or production (locked)
  mode: {
    type: String,
    enum: ['test', 'production'],
    default: 'test'
  },

  // Financial info
  financialGoal: { type: Number, required: true },

  // Profit split configuration
  profitSplitType: {
    type: String,
    enum: ['percentage', 'absolute'],
    default: 'absolute'
  },

  // Custom pricing per product for this campaign
  customPrices: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    price: { type: Number }
  }],

  // Profit splits per product for this campaign
  profitSplits: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    studentCash: { type: Number, default: 1.00 }, // Profit étudiant comptant ($)
    studentSchoolAccount: { type: Number, default: 1.00 }, // Profit étudiant via compte scolaire ($)
    schoolProject: { type: Number, default: 0.75 }, // Profit projet école ($)
    raffle: { type: Number, default: 0.25 } // Profit tirage ($)
  }],

  // Donation configuration for students
  donationsForStudents: {
    enabled: { type: Boolean, default: true },
    presets: { type: [Number], default: [0, 2, 5] },
    splitConfig: {
      studentAccount: { type: Number, default: 60.0 }, // %
      studentCash: { type: Number, default: 40.0 }     // %
    }
  },
  // Donation configuration for school
  donationsForSchool: {
    enabled: { type: Boolean, default: true },
    presets: { type: [Number], default: [0, 2, 5] }
  },

  // Approval workflow
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },

  // Supplier change proposals
  supplierProposals: {
    startDate: { type: Date },
    endDate: { type: Date },
    deliveryDate: { type: Date },
    distributionStartHour: { type: String },
    distributionEndHour: { type: String },
    truckArrivalHour: { type: String },
    notes: { type: String },
    proposedAt: { type: Date },
    proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    respondedAt: { type: Date },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Lock fields for supplier control
  profitSplitLocked: { type: Boolean, default: false },
  datesLocked: { type: Boolean, default: false },

  // Additional info
  notes: { type: String },

  // Campaign statistics (computed fields)
  totalSales: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalParticipants: { type: Number, default: 0 },

  // QR Code join tokens for parent letters
  joinTokens: [{
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now }
  }],

  // Groups configuration for organizing students
  groups: {
    enabled: { type: Boolean, default: false },
    list: [{
      name: { type: String, required: true, trim: true, maxlength: 50 },
      order: { type: Number, default: 0 }
    }]
  },

}, { timestamps: true });

// Indexes for better performance
CampaignSchema.index({ school: 1, campaignNumber: 1 }, { unique: true });
CampaignSchema.index({ school: 1, isActive: 1 });
CampaignSchema.index({ supplier: 1, status: 1 }); // Index for supplier-based queries
CampaignSchema.index({ status: 1 });
CampaignSchema.index({ startDate: 1, endDate: 1 });
CampaignSchema.index({ campaignCode: 1 }, { unique: true }); // Fast lookup for campaign codes
CampaignSchema.index({ 'joinTokens.token': 1 }); // Index for join token lookups

// Virtual for campaign duration
CampaignSchema.virtual('duration').get(function () {
  if (this.startDate && this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for days remaining
CampaignSchema.virtual('daysRemaining').get(function () {
  if (this.isActive && this.endDate) {
    const now = new Date();
    const remaining = Math.ceil((this.endDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, remaining);
  }
  return 0;
});

// Virtual for progress percentage
CampaignSchema.virtual('progressPercentage').get(function () {
  if (this.financialGoal > 0) {
    return Math.min(100, (this.totalSales / this.financialGoal) * 100);
  }
  return 0;
});

// Pre-save hook to sanitize string fields to ensure valid UTF-8
CampaignSchema.pre('save', function (next) {
  const stringFields = [
    'name', 'campaignCode', 'status', 'mode', 'profitSplitType',
    'distributionStartHour', 'distributionEndHour', 'truckArrivalHour',
    'rejectionReason', 'notes',
    'supplierProposals.startDate', 'supplierProposals.endDate',
    'supplierProposals.distributionStartHour', 'supplierProposals.distributionEndHour',
    'supplierProposals.truckArrivalHour', 'supplierProposals.notes'
  ];

  // Sanitize top-level string fields
  for (const field of ['name', 'campaignCode', 'status', 'mode', 'profitSplitType',
    'distributionStartHour', 'distributionEndHour', 'truckArrivalHour',
    'rejectionReason', 'notes']) {
    if (this[field] && typeof this[field] === 'string') {
      try {
        this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
      } catch (e) {
        console.error(`Error encoding Campaign.${field}:`, e);
        this[field] = '';
      }
    }
  }

  // Sanitize supplierProposals nested fields
  if (this.supplierProposals) {
    const proposalFields = ['distributionStartHour', 'distributionEndHour', 'truckArrivalHour', 'notes'];
    for (const field of proposalFields) {
      if (this.supplierProposals[field] && typeof this.supplierProposals[field] === 'string') {
        try {
          this.supplierProposals[field] = Buffer.from(this.supplierProposals[field], 'utf8').toString('utf8');
        } catch (e) {
          console.error(`Error encoding Campaign.supplierProposals.${field}:`, e);
          this.supplierProposals[field] = '';
        }
      }
    }
  }

  // Sanitize groups.list names
  if (this.groups && this.groups.list && Array.isArray(this.groups.list)) {
    for (const group of this.groups.list) {
      if (group.name && typeof group.name === 'string') {
        try {
          group.name = Buffer.from(group.name, 'utf8').toString('utf8');
        } catch (e) {
          console.error(`Error encoding Campaign.groups.list.name:`, e);
          group.name = '';
        }
      }
    }
  }

  // Sanitize joinTokens
  if (this.joinTokens && Array.isArray(this.joinTokens)) {
    for (const token of this.joinTokens) {
      if (token.token && typeof token.token === 'string') {
        try {
          token.token = Buffer.from(token.token, 'utf8').toString('utf8');
        } catch (e) {
          console.error(`Error encoding Campaign.joinTokens.token:`, e);
          token.token = '';
        }
      }
    }
  }

  next();
});

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
