import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema({
  // Basic campaign info
  name: { type: String, trim: true, maxlength: 200 }, // Nom de la campagne (ex: "École Primaire - Janvier 2025")
  campaignNumber: { type: Number, required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  campaignCode: { type: String, required: true, unique: true }, // Format: {SCHOOL_CODE}-C{CAMPAIGN_NUMBER}
  
  // Campaign dates
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  deliveryDate: { type: Date },
  
  // Distribution hours
  distributionStartHour: { type: String, trim: true }, // Hour when distribution starts (e.g., "10h00")
  distributionEndHour: { type: String, trim: true }, // Hour when distribution ends (e.g., "15h00")
  
  // Campaign status
  isActive: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['pending_approval', 'approved', 'rejected', 'active', 'completed', 'pending_school_approval'],
    default: 'pending_approval'
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
  
  // Lock fields for supplier control
  profitSplitLocked: { type: Boolean, default: false },
  datesLocked: { type: Boolean, default: false },
  
  // Additional info
  notes: { type: String },
  
  // Campaign statistics (computed fields)
  totalSales: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalParticipants: { type: Number, default: 0 },
  
}, { timestamps: true });

// Indexes for better performance
CampaignSchema.index({ school: 1, campaignNumber: 1 }, { unique: true });
CampaignSchema.index({ school: 1, isActive: 1 });
CampaignSchema.index({ status: 1 });
CampaignSchema.index({ startDate: 1, endDate: 1 });
CampaignSchema.index({ campaignCode: 1 }, { unique: true }); // Fast lookup for campaign codes

// Virtual for campaign duration
CampaignSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for days remaining
CampaignSchema.virtual('daysRemaining').get(function() {
  if (this.isActive && this.endDate) {
    const now = new Date();
    const remaining = Math.ceil((this.endDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, remaining);
  }
  return 0;
});

// Virtual for progress percentage
CampaignSchema.virtual('progressPercentage').get(function() {
  if (this.financialGoal > 0) {
    return Math.min(100, (this.totalSales / this.financialGoal) * 100);
  }
  return 0;
});

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
