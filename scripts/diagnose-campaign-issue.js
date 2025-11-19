/**
 * Script to diagnose campaign join issues for a specific user and campaign
 * Run with: node scripts/diagnose-campaign-issue.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function diagnoseCampaignIssue() {
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

        console.log(`🔍 Diagnosing campaign issue for:`);
        console.log(`   User: ${userEmail}`);
        console.log(`   Campaign Code: ${campaignCode}\n`);

        // Find user
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            console.log('❌ User not found!');
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.name} (${user._id})`);
        console.log(`   Role: ${user.role}`);
        console.log(`   School (legacy): ${user.school || 'None'}`);
        console.log(`   Active Campaign ID: ${user.activeCampaignId || 'None'}`);
        console.log(`   Campaigns array length: ${user.campaigns?.length || 0}\n`);

        // Find campaign
        const campaign = await Campaign.findOne({ campaignCode });
        if (!campaign) {
            console.log('❌ Campaign not found!');
            process.exit(1);
        }

        console.log(`✅ Found campaign: ${campaignCode} (${campaign._id})`);
        console.log(`   Campaign Number: ${campaign.campaignNumber}`);
        console.log(`   Status: ${campaign.status}`);
        console.log(`   Is Active: ${campaign.isActive}`);
        console.log(`   School ID: ${campaign.school || 'None'}\n`);

        // Check if school exists
        let school = null;
        if (campaign.school) {
            school = await School.findById(campaign.school);
            if (school) {
                console.log(`✅ School found: ${school.name} (${school._id})`);
                console.log(`   Code: ${school.code}`);
            } else {
                console.log(`❌ School not found for ID: ${campaign.school}`);
            }
        } else {
            console.log('❌ Campaign has no school reference!');
        }
        console.log('');

        // Check user's campaigns array
        if (user.campaigns && user.campaigns.length > 0) {
            console.log('📋 User\'s campaigns array:');
            for (let i = 0; i < user.campaigns.length; i++) {
                const entry = user.campaigns[i];
                console.log(`\n   Entry ${i + 1}:`);
                console.log(`     campaignId: ${entry.campaignId || 'MISSING'}`);
                console.log(`     schoolId: ${entry.schoolId || 'MISSING'}`);
                console.log(`     joinedAt: ${entry.joinedAt || 'MISSING'}`);
                console.log(`     objectifPersonnel: ${entry.objectifPersonnel || 'MISSING'}`);
                console.log(`     isActive: ${entry.isActive || false}`);

                // Check if this entry matches our campaign
                const campaignIdStr = entry.campaignId?.toString ? entry.campaignId.toString() : String(entry.campaignId);
                const targetCampaignIdStr = campaign._id.toString();

                if (campaignIdStr === targetCampaignIdStr) {
                    console.log(`     ⚠️  THIS ENTRY MATCHES THE TARGET CAMPAIGN!`);

                    // Try to populate and see what happens
                    try {
                        const populatedUser = await User.findById(user._id)
                            .populate('campaigns.campaignId')
                            .populate('campaigns.schoolId', 'name code');

                        const populatedEntry = populatedUser.campaigns[i];
                        console.log(`\n     After population:`);
                        console.log(`       campaignId populated: ${populatedEntry.campaignId ? 'YES' : 'NO'}`);
                        if (populatedEntry.campaignId) {
                            console.log(`       Campaign code: ${populatedEntry.campaignId.campaignCode || 'N/A'}`);
                        }
                        console.log(`       schoolId populated: ${populatedEntry.schoolId ? 'YES' : 'NO'}`);
                        if (populatedEntry.schoolId) {
                            console.log(`       School name: ${populatedEntry.schoolId.name || 'N/A'}`);
                        }
                    } catch (popError) {
                        console.log(`     ❌ Error populating: ${popError.message}`);
                    }
                }
            }
        } else {
            console.log('📋 User has no campaigns in array');
        }

        console.log('\n\n🔧 DIAGNOSIS:');
        console.log('════════════════════════════════════════');

        // Check if user is in campaign using the helper logic
        const isInCampaign = user.campaigns?.some(c => {
            const cId = c.campaignId?.toString ? c.campaignId.toString() : String(c.campaignId);
            return cId === campaign._id.toString();
        });

        if (isInCampaign) {
            console.log('✅ User IS in the campaign (according to campaigns array)');

            // Check if it would be filtered out
            const populatedUser = await User.findById(user._id)
                .populate('campaigns.campaignId')
                .populate('campaigns.schoolId', 'name code');

            const matchingEntry = populatedUser.campaigns.find(c => {
                const cId = c.campaignId?._id?.toString() || c.campaignId?.toString();
                return cId === campaign._id.toString();
            });

            if (!matchingEntry) {
                console.log('❌ But entry is NOT found after population - this is the problem!');
            } else if (!matchingEntry.campaignId || !matchingEntry.schoolId) {
                console.log('❌ Entry found but population failed:');
                console.log(`   campaignId populated: ${!!matchingEntry.campaignId}`);
                console.log(`   schoolId populated: ${!!matchingEntry.schoolId}`);
            } else {
                console.log('✅ Entry is valid after population');
            }
        } else {
            console.log('❌ User is NOT in the campaign (according to campaigns array)');
            console.log('   But join API says they are - this suggests a data inconsistency');
        }

        // Check for legacy mode
        if (user.school && (!user.campaigns || user.campaigns.length === 0)) {
            console.log('\n⚠️  User is in LEGACY mode (has school but no campaigns)');
        }

        console.log('\n\n💡 RECOMMENDED FIX:');
        console.log('════════════════════════════════════════');

        // Find the problematic entry
        const problematicEntryIndex = user.campaigns?.findIndex(c => {
            const cId = c.campaignId?.toString ? c.campaignId.toString() : String(c.campaignId);
            return cId === campaign._id.toString();
        });

        if (problematicEntryIndex !== undefined && problematicEntryIndex !== -1) {
            const entry = user.campaigns[problematicEntryIndex];
            console.log(`Found problematic entry at index ${problematicEntryIndex}`);

            // Check if schoolId is missing or invalid
            if (!entry.schoolId && school) {
                console.log('\n🔧 Fix: Entry is missing schoolId, but campaign has a school.');
                console.log('   We should update the entry to include the schoolId.');

                const answer = await new Promise((resolve) => {
                    const readline = require('readline').createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                    readline.question('\nFix this entry? (yes/no): ', (ans) => {
                        readline.close();
                        resolve(ans.toLowerCase());
                    });
                });

                if (answer === 'yes' || answer === 'y') {
                    // Update the entry
                    user.campaigns[problematicEntryIndex].schoolId = school._id;
                    await user.save();
                    console.log('✅ Fixed: Added schoolId to campaign entry');
                } else {
                    console.log('❌ Fix cancelled');
                }
            } else if (!entry.schoolId && !school) {
                console.log('\n❌ Cannot fix: Campaign has no school reference');
            } else {
                // Try to repopulate and see if it works
                const populatedUser = await User.findById(user._id)
                    .populate('campaigns.campaignId')
                    .populate('campaigns.schoolId', 'name code');

                const populatedEntry = populatedUser.campaigns[problematicEntryIndex];
                if (!populatedEntry.campaignId || !populatedEntry.schoolId) {
                    console.log('\n🔧 Fix: Entry exists but population fails.');
                    console.log('   This might be due to:');
                    console.log('   1. Campaign was deleted but reference remains');
                    console.log('   2. School was deleted but reference remains');
                    console.log('   3. Invalid ObjectId in the reference');

                    if (!populatedEntry.campaignId) {
                        console.log('\n   Removing invalid campaign entry...');
                        const answer = await new Promise((resolve) => {
                            const readline = require('readline').createInterface({
                                input: process.stdin,
                                output: process.stdout
                            });
                            readline.question('Remove this invalid entry? (yes/no): ', (ans) => {
                                readline.close();
                                resolve(ans.toLowerCase());
                            });
                        });

                        if (answer === 'yes' || answer === 'y') {
                            user.campaigns.splice(problematicEntryIndex, 1);
                            await user.save();
                            console.log('✅ Removed invalid campaign entry');
                        }
                    }
                }
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
console.log('🔍 Campaign Issue Diagnostic Tool');
console.log('════════════════════════════════════════\n');
diagnoseCampaignIssue();

