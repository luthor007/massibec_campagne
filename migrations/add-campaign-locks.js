// Migration script to add lock fields and customPrices to existing campaigns
// Run with: node migrations/add-campaign-locks.js

const mongoose = require('mongoose');
require('dotenv').config();

// Import the School model
const SchoolSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  address: { type: String, required: true, unique: true },
  objectifFinancier: { type: String, required: true },
  debutCampagne: { type: Date, required: true },
  orderCounter: { type: Number, default: 0 },
  finCampagne: { type: Date, required: true },
  dateDeLivraison: { type: Date, required: true },
  currentCampaignNumber: { type: Number, default: 1 },
  campaigns: [{
    campaignNumber: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    deliveryDate: { type: Date },
    isActive: { type: Boolean, default: false },
    notes: { type: String },
    status: { 
      type: String, 
      enum: ['pending_approval', 'approved', 'rejected', 'active', 'completed', 'pending_school_approval'],
      default: 'pending_approval'
    },
    profitSplitType: {
      type: String,
      enum: ['percentage', 'absolute'],
      default: 'percentage'
    },
    profitSplit: {
      studentBenefit: { type: Number, default: 85.6 },
      organizationBenefit: { type: Number, default: 9.4 },
      raffleBenefit: { type: Number, default: 5.0 }
    },
    financialGoal: { type: Number, required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    // New fields to be added
    profitSplitLocked: { type: Boolean, default: false },
    datesLocked: { type: Boolean, default: false },
    customPrices: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      price: { type: Number }
    }]
  }],
  activeCampaignId: { type: mongoose.Schema.Types.ObjectId, default: null },
  telephone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  approved: { type: Boolean, required: true, default: false },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'deactivated'],
    default: 'pending'
  },
  rejectionReason: { type: String },
  rejectedAt: { type: Date },
  deactivationReason: { type: String },
  deactivatedAt: { type: Date },
  reactivatedAt: { type: Date },
  split: {
    studentBenefit: { type: Number, default: 85.6 },
    organizationBenefit: { type: Number, default: 9.4 },
    raffleBenefit: { type: Number, default: 5.0 },
  },
  isBonus: { type: Boolean, default: false },
  bonuses: [{
    salesRange: { type: String, required: true },
    bonusPerTart: { type: Number, required: true },
    totalBonusRange: { type: String, required: true },
  }],
  accumba: { type: String },
  expNum: { type: String },
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

const School = mongoose.models.School || mongoose.model('School', SchoolSchema);

async function migrateCampaigns() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all schools with campaigns
    const schools = await School.find({ campaigns: { $exists: true, $not: { $size: 0 } } });
    console.log(`Found ${schools.length} schools with campaigns`);

    let totalCampaignsUpdated = 0;

    for (const school of schools) {
      let schoolUpdated = false;
      
      for (const campaign of school.campaigns) {
        // Check if campaign needs migration
        if (campaign.profitSplitLocked === undefined || 
            campaign.datesLocked === undefined || 
            campaign.customPrices === undefined) {
          
          // Set default values for new fields
          if (campaign.profitSplitLocked === undefined) {
            campaign.profitSplitLocked = false;
          }
          if (campaign.datesLocked === undefined) {
            campaign.datesLocked = false;
          }
          if (campaign.customPrices === undefined) {
            campaign.customPrices = [];
          }
          
          schoolUpdated = true;
          totalCampaignsUpdated++;
        }
      }
      
      if (schoolUpdated) {
        await school.save();
        console.log(`Updated school: ${school.name} (${school.campaigns.length} campaigns)`);
      }
    }

    console.log(`Migration completed successfully!`);
    console.log(`Total campaigns updated: ${totalCampaignsUpdated}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateCampaigns();










