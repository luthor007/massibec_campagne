// Script to mark joinedCampaign as completed for testing
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function markJoinedCampaignComplete(email) {
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

    // Mark joinedCampaign as completed
    if (!user.onboardingProgress) {
      user.onboardingProgress = {
        joinedCampaign: false,
        personalizedStore: false,
        visitedStore: false,
        viewedOrders: false,
        viewedStats: false,
        viewedTools: false
      };
    }

    user.onboardingProgress.joinedCampaign = true;

    await user.save();

    console.log('✅ Marked joinedCampaign as completed!');
    console.log('📊 User can now test the personalizedStore step with tooltips for switches.');
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    process.exit(0);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'alexis.massicotte@icloud.com';

console.log(`🔄 Marking joinedCampaign as completed for: ${email}`);
markJoinedCampaignComplete(email);

