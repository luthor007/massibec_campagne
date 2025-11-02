// scripts/migrate-chavigny-users.js
// This script specifically migrates Chavigny school users to the new multi-campaign system
// Chavigny has embedded campaigns in the school document, not separate Campaign documents

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import School from '../src/models/School.js';

dotenv.config({ path: '.env.local' });

async function migrateChavignyUsers() {
  try {
    console.log('🚀 Starting Chavigny users migration...');
    
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
    console.log(`📊 School has ${chavignySchool.campaigns?.length || 0} campaigns`);
    console.log(`🎯 Active campaign ID: ${chavignySchool.activeCampaignId}`);
    
    // Find all users from Chavigny
    const chavignyUsers = await User.find({ school: chavignySchool._id });
    console.log(`👥 Found ${chavignyUsers.length} users from Chavigny`);
    
    if (chavignyUsers.length === 0) {
      console.log('⚠️  No users found for Chavigny school');
      return;
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
        
        // Find the active campaign for this school
        const activeCampaign = chavignySchool.campaigns?.find(c => c._id.toString() === chavignySchool.activeCampaignId.toString());
        
        if (!activeCampaign) {
          console.log(`   ⚠️  No active campaign found for Chavigny, skipping user`);
          skippedCount++;
          continue;
        }
        
        console.log(`   📋 Found active campaign: Campaign #${activeCampaign.campaignNumber}`);
        
        // Create a new Campaign document for this embedded campaign
        const Campaign = mongoose.model('Campaign', new mongoose.Schema({
          campaignNumber: Number,
          school: mongoose.Schema.Types.ObjectId,
          campaignCode: String,
          startDate: Date,
          endDate: Date,
          deliveryDate: Date,
          isActive: Boolean,
          financialGoal: Number,
          notes: String,
          profitSplitType: String,
          datesLocked: Boolean,
          profitSplitLocked: Boolean,
          profitSplit: mongoose.Schema.Types.Mixed,
          status: String,
          customPrices: [mongoose.Schema.Types.Mixed],
          profitSplits: [mongoose.Schema.Types.Mixed]
        }));
        
        // Check if campaign document already exists
        let campaignDoc = await Campaign.findOne({ 
          school: chavignySchool._id, 
          campaignNumber: activeCampaign.campaignNumber 
        });
        
        if (!campaignDoc) {
          // Create campaign document from embedded campaign
          const campaignCode = `${chavignySchool.code}-C${activeCampaign.campaignNumber}`;
          
          campaignDoc = new Campaign({
            campaignNumber: activeCampaign.campaignNumber,
            school: chavignySchool._id,
            campaignCode: campaignCode,
            startDate: activeCampaign.startDate,
            endDate: activeCampaign.endDate,
            deliveryDate: activeCampaign.deliveryDate,
            isActive: activeCampaign.isActive,
            financialGoal: activeCampaign.financialGoal,
            notes: activeCampaign.notes || '',
            profitSplitType: activeCampaign.profitSplitType || 'percentage',
            datesLocked: activeCampaign.datesLocked || false,
            profitSplitLocked: activeCampaign.profitSplitLocked || false,
            profitSplit: activeCampaign.profitSplit || [],
            status: activeCampaign.status || 'approved',
            customPrices: activeCampaign.customPrices || [],
            profitSplits: activeCampaign.profitSplits || []
          });
          
          await campaignDoc.save();
          console.log(`   ✅ Created campaign document: ${campaignCode}`);
        } else {
          console.log(`   ✅ Campaign document already exists: ${campaignDoc.campaignCode}`);
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
        
        // Keep legacy fields for backward compatibility (don't clear them)
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
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateChavignyUsers()
  .then(() => {
    console.log('🎉 Chavigny migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
