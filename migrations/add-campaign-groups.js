// Migration script to add groups configuration to existing campaigns
// Sets groups.enabled: false for all existing campaigns

require('dotenv').config();
const mongoose = require('mongoose');

// Import the Campaign model
const CampaignSchema = new mongoose.Schema({
    name: { type: String, trim: true, maxlength: 200 },
    campaignNumber: { type: Number, required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    campaignCode: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    deliveryDate: { type: Date },
    distributionStartHour: { type: String, trim: true },
    distributionEndHour: { type: String, trim: true },
    truckArrivalHour: { type: String, trim: true },
    isActive: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['pending_approval', 'approved', 'rejected', 'active', 'completed', 'pending_school_approval'],
        default: 'approved'
    },
    mode: {
        type: String,
        enum: ['test', 'production'],
        default: 'test'
    },
    financialGoal: { type: Number, required: true },
    profitSplitType: {
        type: String,
        enum: ['percentage', 'absolute'],
        default: 'absolute'
    },
    customPrices: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        price: { type: Number }
    }],
    profitSplits: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        studentCash: { type: Number, default: 1.00 },
        studentSchoolAccount: { type: Number, default: 1.00 },
        schoolProject: { type: Number, default: 0.75 },
        raffle: { type: Number, default: 0.25 }
    }],
    donationsForStudents: {
        enabled: { type: Boolean, default: true },
        presets: { type: [Number], default: [0, 2, 5] },
        splitConfig: {
            studentAccount: { type: Number, default: 60.0 },
            studentCash: { type: Number, default: 40.0 }
        }
    },
    donationsForSchool: {
        enabled: { type: Boolean, default: true },
        presets: { type: [Number], default: [0, 2, 5] }
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    profitSplitLocked: { type: Boolean, default: false },
    datesLocked: { type: Boolean, default: false },
    notes: { type: String },
    totalSales: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalParticipants: { type: Number, default: 0 },
    joinTokens: [{
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        createdAt: { type: Date, default: Date.now }
    }],
    groups: {
        enabled: { type: Boolean, default: false },
        list: [{
            name: { type: String, required: true, trim: true, maxlength: 50 },
            order: { type: Number, default: 0 }
        }]
    }
}, { timestamps: true });

const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);

async function addCampaignGroups() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('MONGODB_URI environment variable is not set');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Find all campaigns that don't have groups.enabled set
        const campaigns = await Campaign.find({
            $or: [
                { 'groups.enabled': { $exists: false } },
                { 'groups': { $exists: false } }
            ]
        });

        console.log(`Found ${campaigns.length} campaigns to update`);

        let updated = 0;
        for (const campaign of campaigns) {
            // Set groups.enabled to false if not already set
            if (!campaign.groups || campaign.groups.enabled === undefined) {
                campaign.groups = {
                    enabled: false,
                    list: []
                };
                await campaign.save();
                updated++;
                console.log(`Updated campaign ${campaign.campaignCode} (${campaign._id})`);
            }
        }

        console.log(`\nMigration completed: ${updated} campaigns updated`);
        console.log('All existing campaigns now have groups.enabled: false by default');

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Error during migration:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run the migration
addCampaignGroups();

