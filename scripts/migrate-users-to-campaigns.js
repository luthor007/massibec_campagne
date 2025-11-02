// scripts/migrate-users-to-campaigns.js
// This script migrates existing users to the new multi-campaign system
// Run this AFTER the school migration script

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import School from '../src/models/School.js';
import Campaign from '../src/models/Campaign.js';

dotenv.config({ path: '.env.local' });

async function migrateUsersToCampaigns() {
  try {
    console.log('🚀 Starting user to campaigns migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users with school field but no campaigns array
    const usersToMigrate = await User.find({
      role: 'student',
      school: { $exists: true, $ne: null },
      $or: [
        { campaigns: { $exists: false } },
        { campaigns: { $size: 0 } }
      ]
    }).populate('school');

    console.log(`📊 Found ${usersToMigrate.length} users to migrate`);

    let migratedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const user of usersToMigrate) {
      try {
        console.log(`\n👤 Processing user: ${user.name} (${user.email})`);

        // Check if user already has campaigns
        if (user.campaigns && user.campaigns.length > 0) {
          console.log(`   ⏭️  User already has ${user.campaigns.length} campaign(s), skipping`);
          skippedCount++;
          continue;
        }

        // Find the school's Campaign #1
        const schoolCampaign = await Campaign.findOne({
          school: user.school._id,
          campaignNumber: 1
        });

        if (!schoolCampaign) {
          console.log(`   ⚠️  No Campaign #1 found for school ${user.school.name}, skipping`);
          skippedCount++;
          continue;
        }

        console.log(`   🎯 Found Campaign #1: ${schoolCampaign.campaignCode}`);

        // Create campaign entry for user
        const campaignEntry = {
          campaignId: schoolCampaign._id,
          schoolId: user.school._id,
          joinedAt: user.createdAt || new Date(),
          objectifPersonnel: user.objectifPersonnel || 1000, // Use existing or default
          isActive: true
        };

        // Update user with campaigns array
        user.campaigns = [campaignEntry];
        user.activeCampaignId = schoolCampaign._id;

        // Keep the old school field for backward compatibility
        // Don't remove it, just add the new fields

        await user.save();
        console.log(`   ✅ Added user to Campaign #1 with objective: ${campaignEntry.objectifPersonnel}`);

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
    console.log(`   📊 Total processed: ${usersToMigrate.length} users`);

    // Verify migration
    const usersWithCampaigns = await User.find({
      role: 'student',
      campaigns: { $exists: true, $not: { $size: 0 } }
    });
    console.log(`\n🔍 Verification: ${usersWithCampaigns.length} users now have campaigns`);

    const usersInLegacyMode = await User.find({
      role: 'student',
      school: { $exists: true, $ne: null },
      $or: [
        { campaigns: { $exists: false } },
        { campaigns: { $size: 0 } }
      ]
    });
    console.log(`🔍 Users still in legacy mode: ${usersInLegacyMode.length}`);

    // Show some examples of migrated users
    console.log(`\n📋 Sample migrated users:`);
    const sampleUsers = await User.find({
      role: 'student',
      campaigns: { $exists: true, $not: { $size: 0 } }
    }).limit(3).populate('campaigns.campaignId', 'campaignCode campaignNumber').populate('campaigns.schoolId', 'name');

    sampleUsers.forEach((user, index) => {
      const campaign = user.campaigns[0];
      console.log(`   ${index + 1}. ${user.name} → ${campaign.schoolId.name} (${campaign.campaignId.campaignCode})`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if called directly
migrateUsersToCampaigns()
  .then(() => {
    console.log('🎉 User migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
