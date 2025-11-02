// Script to reset onboarding progress and unlink campaigns for a specific user
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function resetUserOnboarding(email) {
  try {
    // Dynamic imports after environment variables are loaded
    const { default: dbConnect } = await import('../src/lib/mongodb.js');
    const { default: User } = await import('../src/models/User.js');
    
    await dbConnect();
    console.log('Connected to MongoDB');

    // Find the user by email
    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Current campaigns: ${user.campaigns?.length || 0}`);
    console.log(`   Active campaign: ${user.activeCampaignId || 'None'}`);

    // Reset onboarding progress
    const onboardingReset = {
      joinedCampaign: false,
      personalizedStore: false,
      visitedStore: false,
      viewedOrders: false,
      viewedStats: false,
      viewedTools: false,
      completedAt: null
    };

    // Unlink all campaigns
    const campaignReset = {
      campaigns: [],
      activeCampaignId: null,
      // Keep legacy fields for backward compatibility
      school: null,
      objectifPersonnel: null
    };

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          onboardingProgress: onboardingReset,
          ...campaignReset
        }
      },
      { new: true }
    );

    console.log('✅ User reset completed successfully!');
    console.log('📊 Updated user data:');
    console.log(`   - Onboarding progress: All steps reset to false`);
    console.log(`   - Campaigns: ${updatedUser.campaigns.length} (cleared)`);
    console.log(`   - Active campaign: ${updatedUser.activeCampaignId || 'None'}`);
    console.log(`   - School: ${updatedUser.school || 'None'}`);
    console.log(`   - Objectif personnel: ${updatedUser.objectifPersonnel || 'None'}`);

    console.log('\n🎯 The user can now test the complete onboarding flow from the beginning!');
    
  } catch (error) {
    console.error('❌ Error resetting user:', error);
  } finally {
    process.exit(0);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'alexis.massicotte@icloud.com';

console.log(`🔄 Resetting onboarding and campaigns for: ${email}`);
resetUserOnboarding(email);
