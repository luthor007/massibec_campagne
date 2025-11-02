// scripts/migrate-chavigny-legacy-users.js
// This script migrates Chavigny users from the legacy system to the new multi-campaign system
// Chavigny school represents a single campaign in the legacy system

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import School from '../src/models/School.js';
import Campaign from '../src/models/Campaign.js';

dotenv.config({ path: '.env.local' });

async function migrateChavignyLegacyUsers() {
  try {
    console.log('🚀 Starting Chavigny legacy users migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find Chavigny school
    const chavignySchool = await School.findOne({ name: /chavigny/i });
    if (!chavignySchool) {
      console.log('❌ Chavigny school not found!');
      return;
    }
    
    console.log(`🏫 Found Chavigny school: ${chavignySchool.name} (ID: ${chavignySchool._id})`);
    console.log(`📊 School code: ${chavignySchool.code}`);
    console.log(`📊 Current campaign number: ${chavignySchool.currentCampaignNumber || 1}`);
    
    // Find all users from Chavigny
    const chavignyUsers = await User.find({ school: chavignySchool._id });
    console.log(`👥 Found ${chavignyUsers.length} users from Chavigny`);
    
    if (chavignyUsers.length === 0) {
      console.log('⚠️  No users found for Chavigny school');
      return;
    }
    
    // Create or find the campaign for Chavigny
    const campaignNumber = chavignySchool.currentCampaignNumber || 1;
    const campaignCode = `${chavignySchool.code}-C${campaignNumber}`;
    
    let campaignDoc = await Campaign.findOne({ 
      school: chavignySchool._id, 
      campaignNumber: campaignNumber 
    });
    
    if (!campaignDoc) {
      console.log(`📋 Creating campaign document: ${campaignCode}`);
      
      // Create campaign from school's legacy data
      campaignDoc = new Campaign({
        campaignNumber: campaignNumber,
        school: chavignySchool._id,
        campaignCode: campaignCode,
        startDate: chavignySchool.debutCampagne || new Date('2024-09-01'),
        endDate: chavignySchool.finCampagne || new Date('2024-11-30'),
        deliveryDate: chavignySchool.dateDeLivraison || new Date('2024-12-15'),
        isActive: true,
        financialGoal: parseInt(chavignySchool.objectifFinancier) || 100000,
        notes: `Legacy campaign migrated from school ${chavignySchool.name}`,
        profitSplitType: 'percentage',
        datesLocked: true,
        profitSplitLocked: false,
        profitSplit: chavignySchool.split || { studentBenefit: 100, organizationBenefit: 0, raffleBenefit: 0 },
        status: chavignySchool.status === 'approved' ? 'approved' : 'pending',
        customPrices: [],
        profitSplits: []
      });
      
      await campaignDoc.save();
      console.log(`✅ Created campaign document: ${campaignCode}`);
    } else {
      console.log(`✅ Campaign document already exists: ${campaignDoc.campaignCode}`);
    }
    
    // Update school to reference the campaign
    if (!chavignySchool.activeCampaignId) {
      chavignySchool.activeCampaignId = campaignDoc._id;
      chavignySchool.currentCampaignNumber = campaignNumber;
      await chavignySchool.save();
      console.log(`✅ Updated school with active campaign reference`);
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each user
    for (const user of chavignyUsers) {
      try {
        console.log(`👤 Processing user: ${user.name} (${user.email})`);
        
        // Check if user already has campaigns in the new structure
        if (user.campaigns && user.campaigns.length > 0) {
          console.log(`   ⏭️  User already has campaigns in new structure, skipping`);
          skippedCount++;
          continue;
        }
        
        // Add campaign to user's campaigns array
        user.campaigns = [{
          campaignId: campaignDoc._id,
          schoolId: chavignySchool._id,
          joinedAt: user.createdAt || new Date(),
          objectifPersonnel: user.objectifPersonnel || 20, // Default objective if not set
          isActive: true
        }];
        
        // Set active campaign
        user.activeCampaignId = campaignDoc._id;
        
        // Keep legacy fields for backward compatibility
        // This ensures existing functionality continues to work
        
        await user.save();
        console.log(`   ✅ Migrated user ${user.name} to campaign ${campaignDoc.campaignCode}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`   ❌ Error processing user ${user.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migratedCount} users`);
    console.log(`   ⏭️  Skipped: ${skippedCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log(`   📊 Total processed: ${chavignyUsers.length} users`);
    
    // Verify migration
    const migratedUsers = await User.find({ 
      school: chavignySchool._id,
      campaigns: { $exists: true, $not: { $size: 0 } }
    });
    console.log(`🔍 Verification: ${migratedUsers.length} users now have campaigns`);
    
    // Show sample migrated user
    if (migratedUsers.length > 0) {
      const sampleUser = migratedUsers[0];
      console.log(`📋 Sample migrated user: ${sampleUser.name}`);
      console.log(`   - Campaign: ${sampleUser.campaigns[0].campaignId}`);
      console.log(`   - School: ${sampleUser.campaigns[0].schoolId}`);
      console.log(`   - Objective: ${sampleUser.campaigns[0].objectifPersonnel}`);
      console.log(`   - Active Campaign: ${sampleUser.activeCampaignId}`);
    }
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateChavignyLegacyUsers()
  .then(() => {
    console.log('🎉 Chavigny legacy migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
