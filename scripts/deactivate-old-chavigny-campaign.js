// scripts/deactivate-old-chavigny-campaign.js
// This script deactivates the old Chavigny campaign from last year
// and ensures users cannot sell until they join a new active campaign

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import School from '../src/models/School.js';
import Campaign from '../src/models/Campaign.js';

dotenv.config({ path: '.env.local' });

async function deactivateOldChavignyCampaign() {
  try {
    console.log('🚀 Starting Chavigny campaign deactivation...');
    
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
    
    // Find the old campaign
    const oldCampaign = await Campaign.findOne({ 
      school: chavignySchool._id,
      campaignCode: '673019-C2'
    });
    
    if (!oldCampaign) {
      console.log('❌ Old Chavigny campaign not found!');
      return;
    }
    
    console.log(`📋 Found old campaign: ${oldCampaign.campaignCode}`);
    console.log(`📅 Campaign dates: ${oldCampaign.startDate} to ${oldCampaign.endDate}`);
    
    // Deactivate the campaign
    oldCampaign.isActive = false;
    oldCampaign.status = 'completed'; // Mark as completed since it's from last year
    oldCampaign.notes = 'Legacy campaign from previous year - deactivated';
    await oldCampaign.save();
    
    console.log(`✅ Deactivated campaign: ${oldCampaign.campaignCode}`);
    
    // Find all users from this campaign
    const chavignyUsers = await User.find({ 
      'campaigns.campaignId': oldCampaign._id 
    });
    
    console.log(`👥 Found ${chavignyUsers.length} users in old Chavigny campaign`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Update each user to deactivate their campaign participation
    for (const user of chavignyUsers) {
      try {
        console.log(`👤 Processing user: ${user.name} (${user.email})`);
        
        // Find the campaign entry in user's campaigns array
        const campaignEntry = user.campaigns.find(c => 
          c.campaignId.toString() === oldCampaign._id.toString()
        );
        
        if (campaignEntry) {
          // Deactivate this campaign for the user
          campaignEntry.isActive = false;
          
          // Clear the active campaign if it's this one
          if (user.activeCampaignId && 
              user.activeCampaignId.toString() === oldCampaign._id.toString()) {
            user.activeCampaignId = null;
            console.log(`   🔄 Cleared active campaign for ${user.name}`);
          }
          
          await user.save();
          console.log(`   ✅ Deactivated campaign participation for ${user.name}`);
          updatedCount++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing user ${user.name}:`, error.message);
        errorCount++;
      }
    }
    
    // Update school to remove active campaign reference
    if (chavignySchool.activeCampaignId && 
        chavignySchool.activeCampaignId.toString() === oldCampaign._id.toString()) {
      chavignySchool.activeCampaignId = null;
      await chavignySchool.save();
      console.log(`✅ Cleared school's active campaign reference`);
    }
    
    console.log(`\n📈 Deactivation Summary:`);
    console.log(`   ✅ Campaign deactivated: ${oldCampaign.campaignCode}`);
    console.log(`   ✅ Users updated: ${updatedCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log(`   📊 Total processed: ${chavignyUsers.length} users`);
    
    // Verify deactivation
    const activeUsers = await User.find({ 
      'campaigns.campaignId': oldCampaign._id,
      'campaigns.isActive': true
    });
    
    console.log(`🔍 Verification: ${activeUsers.length} users still have active participation`);
    
    if (activeUsers.length === 0) {
      console.log(`✅ All users successfully deactivated from old campaign`);
    } else {
      console.log(`⚠️  Some users still have active participation - manual review needed`);
    }
    
    // Show sample deactivated user
    const sampleUser = await User.findOne({ 
      'campaigns.campaignId': oldCampaign._id 
    });
    
    if (sampleUser) {
      const campaignEntry = sampleUser.campaigns.find(c => 
        c.campaignId.toString() === oldCampaign._id.toString()
      );
      
      console.log(`\n📋 Sample deactivated user: ${sampleUser.name}`);
      console.log(`   - Campaign Active: ${campaignEntry?.isActive}`);
      console.log(`   - Active Campaign ID: ${sampleUser.activeCampaignId}`);
      console.log(`   - Can sell: ${sampleUser.activeCampaignId ? 'NO (no active campaign)' : 'NO (no active campaign)'}`);
    }
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('💥 Deactivation failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run deactivation
deactivateOldChavignyCampaign()
  .then(() => {
    console.log('🎉 Chavigny campaign deactivation completed!');
    console.log('📝 Users must now join a new active campaign to sell');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Deactivation failed:', error);
    process.exit(1);
  });
