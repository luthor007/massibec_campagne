// scripts/migrate-schools-to-campaigns.js
// This script creates Campaign #1 for all schools that don't have any campaigns
// Run this BEFORE the user migration script

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import School from '../src/models/School.js';
import Campaign from '../src/models/Campaign.js';

dotenv.config({ path: '.env.local' });

const generateCampaignCode = (schoolCode, campaignNumber) => {
  return `${schoolCode}-C${campaignNumber}`;
};

async function migrateSchoolsToCampaigns() {
  try {
    console.log('🚀 Starting school to campaigns migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all schools without campaigns
    const schoolsWithoutCampaigns = await School.find({
      $or: [
        { campaigns: { $exists: false } },
        { campaigns: { $size: 0 } }
      ]
    });

    console.log(`📊 Found ${schoolsWithoutCampaigns.length} schools without campaigns`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const school of schoolsWithoutCampaigns) {
      try {
        console.log(`\n🏫 Processing school: ${school.name} (${school.code})`);

        // Check if school already has campaigns
        const existingCampaigns = await Campaign.find({ school: school._id });
        if (existingCampaigns.length > 0) {
          console.log(`   ⏭️  School already has ${existingCampaigns.length} campaign(s), skipping`);
          continue;
        }

        // Create Campaign #1
        const campaignNumber = 1;
        const campaignCode = generateCampaignCode(school.code, campaignNumber);
        
        // Set default dates
        const startDate = school.createdAt || new Date('2024-01-01');
        const endDate = new Date('2025-12-31');
        const deliveryDate = new Date('2026-01-15');

        const campaign = new Campaign({
          campaignNumber: campaignNumber,
          school: school._id,
          campaignCode: campaignCode,
          startDate: startDate,
          endDate: endDate,
          deliveryDate: deliveryDate,
          isActive: true,
          status: 'approved', // Mark as approved for legacy schools
          financialGoal: 10000, // Default goal
          notes: `Campagne #1 créée automatiquement lors de la migration - ${new Date().toLocaleDateString('fr-CA')}`,
          profitSplitType: 'absolute',
          customPrices: [], // Will be populated later if needed
          profitSplits: []
        });

        await campaign.save();
        console.log(`   ✅ Created Campaign #${campaignNumber} with code: ${campaignCode}`);

        // Update school with campaign info
        school.currentCampaignNumber = campaignNumber;
        school.activeCampaignId = campaign._id;
        
        // Initialize campaigns array if it doesn't exist
        if (!school.campaigns) {
          school.campaigns = [];
        }
        school.campaigns.push(campaign._id);
        
        await school.save();
        console.log(`   ✅ Updated school with campaign info`);

        migratedCount++;

      } catch (error) {
        console.error(`   ❌ Error processing school ${school.name}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migratedCount} schools`);
    console.log(`   ❌ Errors: ${errorCount} schools`);
    console.log(`   📊 Total processed: ${schoolsWithoutCampaigns.length} schools`);

    // Verify migration
    const schoolsWithCampaigns = await School.find({
      campaigns: { $exists: true, $not: { $size: 0 } }
    });
    console.log(`\n🔍 Verification: ${schoolsWithCampaigns.length} schools now have campaigns`);

    const totalCampaigns = await Campaign.countDocuments();
    console.log(`🔍 Total campaigns in database: ${totalCampaigns}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if called directly
migrateSchoolsToCampaigns()
  .then(() => {
    console.log('🎉 School migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
