/**
 * Script to fix a specific campaign entry for a user
 * Run with: node scripts/fix-campaign-entry.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function fixCampaignEntry() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', new mongoose.Schema({}, { strict: false }));
        const School = mongoose.models.School || mongoose.model('School', new mongoose.Schema({}, { strict: false }));

        const userEmail = 'alexis.massicotte@icloud.com';
        const campaignCode = '255129-C1';

        console.log(`🔧 Fixing campaign entry for:`);
        console.log(`   User: ${userEmail}`);
        console.log(`   Campaign Code: ${campaignCode}\n`);

        // Find user
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            console.log('❌ User not found!');
            process.exit(1);
        }

        // Find campaign
        const campaign = await Campaign.findOne({ campaignCode });
        if (!campaign) {
            console.log('❌ Campaign not found!');
            process.exit(1);
        }

        // Find school
        const school = await School.findById(campaign.school);
        if (!school) {
            console.log('❌ School not found for campaign!');
            process.exit(1);
        }

        console.log(`✅ Found:`);
        console.log(`   User: ${user.name} (${user._id})`);
        console.log(`   Campaign: ${campaignCode} (${campaign._id})`);
        console.log(`   School: ${school.name} (${school._id})\n`);

        // Find the entry
        const entryIndex = user.campaigns?.findIndex(c => {
            const cId = c.campaignId?.toString ? c.campaignId.toString() : String(c.campaignId);
            return cId === campaign._id.toString();
        });

        if (entryIndex === -1 || entryIndex === undefined) {
            console.log('❌ Campaign entry not found in user\'s campaigns array!');
            process.exit(1);
        }

        const entry = user.campaigns[entryIndex];
        console.log(`📋 Current entry at index ${entryIndex}:`);
        console.log(`   campaignId: ${entry.campaignId}`);
        console.log(`   schoolId: ${entry.schoolId}`);
        console.log(`   joinedAt: ${entry.joinedAt}`);
        console.log(`   objectifPersonnel: ${entry.objectifPersonnel}\n`);

        // Verify the campaignId and schoolId are correct
        const campaignIdStr = entry.campaignId?.toString ? entry.campaignId.toString() : String(entry.campaignId);
        const schoolIdStr = entry.schoolId?.toString ? entry.schoolId.toString() : String(entry.schoolId);
        const expectedCampaignId = campaign._id.toString();
        const expectedSchoolId = school._id.toString();

        let needsFix = false;

        if (campaignIdStr !== expectedCampaignId) {
            console.log(`⚠️  Campaign ID mismatch!`);
            console.log(`   Current: ${campaignIdStr}`);
            console.log(`   Expected: ${expectedCampaignId}`);
            needsFix = true;
        }

        if (schoolIdStr !== expectedSchoolId) {
            console.log(`⚠️  School ID mismatch!`);
            console.log(`   Current: ${schoolIdStr}`);
            console.log(`   Expected: ${expectedSchoolId}`);
            needsFix = true;
        }

        if (!needsFix) {
            console.log('✅ Entry looks correct. Checking if it populates correctly...\n');

            // Try to populate
            const populatedUser = await User.findById(user._id)
                .populate('campaigns.campaignId')
                .populate('campaigns.schoolId', 'name code');

            const populatedEntry = populatedUser.campaigns[entryIndex];

            if (!populatedEntry.campaignId || !populatedEntry.schoolId) {
                console.log('❌ Population failed!');
                console.log(`   campaignId populated: ${!!populatedEntry.campaignId}`);
                console.log(`   schoolId populated: ${!!populatedEntry.schoolId}`);
                needsFix = true;
            } else {
                console.log('✅ Entry populates correctly!');
                console.log(`   Campaign: ${populatedEntry.campaignId.campaignCode}`);
                console.log(`   School: ${populatedEntry.schoolId.name}`);
                console.log('\n✅ No fix needed - entry is valid.');
                process.exit(0);
            }
        }

        if (needsFix) {
            console.log('\n🔧 Fixing entry...');

            // Update the entry
            user.campaigns[entryIndex] = {
                campaignId: campaign._id,
                schoolId: school._id,
                joinedAt: entry.joinedAt || new Date(),
                objectifPersonnel: entry.objectifPersonnel || 70,
                isActive: entry.isActive !== undefined ? entry.isActive : true
            };

            await user.save();

            console.log('✅ Entry fixed!');
            console.log(`   Updated campaignId: ${campaign._id}`);
            console.log(`   Updated schoolId: ${school._id}`);

            // Verify it works now
            console.log('\n🔍 Verifying fix...');
            const verifyUser = await User.findById(user._id)
                .populate('campaigns.campaignId')
                .populate('campaigns.schoolId', 'name code');

            const verifyEntry = verifyUser.campaigns[entryIndex];
            if (verifyEntry.campaignId && verifyEntry.schoolId) {
                console.log('✅ Verification successful!');
                console.log(`   Campaign: ${verifyEntry.campaignId.campaignCode}`);
                console.log(`   School: ${verifyEntry.schoolId.name}`);
            } else {
                console.log('⚠️  Verification failed - entry still has issues');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
        console.error(error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    }
}

// Run the script
console.log('🔧 Campaign Entry Fix Tool');
console.log('════════════════════════════════════════\n');
fixCampaignEntry();

