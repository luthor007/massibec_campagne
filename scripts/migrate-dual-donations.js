require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

async function migrateDualDonations() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');

    const db = mongoose.connection.db;
    const campaignsCollection = db.collection('campaigns');
    const ordersCollection = db.collection('orders');

    // Step 1: Migrate campaigns to add default donation structure if not exists
    console.log('Step 1: Migrating campaigns...');
    const campaigns = await campaignsCollection.find({}).toArray();
    console.log(`Found ${campaigns.length} campaigns to process`);

    let campaignsUpdated = 0;
    for (const campaign of campaigns) {
      try {
        const hasNewStructure = campaign.donationsForStudents && campaign.donationsForSchool;
        
        if (!hasNewStructure) {
          const update = {
            $set: {
              donationsForStudents: {
                enabled: true,
                presets: campaign.donationPresets || [0, 2, 5],
                splitConfig: {
                  studentAccount: 60.0,
                  studentCash: 40.0
                }
              },
              donationsForSchool: {
                enabled: true,
                presets: campaign.donationPresets || [0, 2, 5]
              }
            }
          };
          
          await campaignsCollection.updateOne(
            { _id: campaign._id },
            update
          );
          campaignsUpdated++;
          console.log(`  ✅ Updated campaign: ${campaign.campaignCode || campaign._id}`);
        }
      } catch (e) {
        console.error(`  ❌ Error updating campaign ${campaign._id}:`, e.message);
      }
    }
    console.log(`✅ Updated ${campaignsUpdated} campaigns\n`);

    // Step 2: Migrate orders to add new donation fields
    console.log('Step 2: Migrating orders...');
    const orders = await ordersCollection.find({}).toArray();
    console.log(`Found ${orders.length} orders to process`);

    let ordersUpdated = 0;
    let ordersSkipped = 0;

    for (const order of orders) {
      try {
        // Check if already migrated
        if (order.studentDonation !== undefined && order.schoolDonation !== undefined) {
          ordersSkipped++;
          continue;
        }

        const update = {
          $set: {}
        };

        // Get campaign to determine donation split
        let campaign = null;
        if (order.campaignId) {
          campaign = await campaignsCollection.findOne({ _id: order.campaignId });
        }

        // Migrate tip to studentDonation and schoolDonation
        const legacyTip = order.tip || 0;
        
        if (legacyTip > 0) {
          // Convert tip to studentDonation (backward compatibility)
          update.$set.studentDonation = legacyTip;
          update.$set.schoolDonation = 0;

          // Calculate studentDonationSplit based on campaign config
          let splitConfig = {
            studentAccount: 60.0,
            studentCash: 40.0
          };

          if (campaign?.donationsForStudents?.splitConfig) {
            splitConfig = campaign.donationsForStudents.splitConfig;
          }

          const studentDonationSplit = {
            studentAccount: Math.round((legacyTip * splitConfig.studentAccount / 100) * 100) / 100,
            studentCash: Math.round((legacyTip * splitConfig.studentCash / 100) * 100) / 100
          };

          update.$set.studentDonationSplit = studentDonationSplit;
        } else {
          // No tip/donation, set to 0
          update.$set.studentDonation = 0;
          update.$set.schoolDonation = 0;
          update.$set.studentDonationSplit = { studentAccount: 0, studentCash: 0 };
        }

        await ordersCollection.updateOne(
          { _id: order._id },
          update
        );
        
        ordersUpdated++;
        if (ordersUpdated % 100 === 0) {
          console.log(`  ... Updated ${ordersUpdated} orders...`);
        }
      } catch (e) {
        console.error(`  ❌ Error updating order ${order._id}:`, e.message);
      }
    }

    console.log(`✅ Updated ${ordersUpdated} orders`);
    console.log(`⚠️  Skipped ${ordersSkipped} orders (already migrated)\n`);

    console.log('✅ Migration completed successfully!');
    console.log(`   - ${campaignsUpdated} campaigns migrated`);
    console.log(`   - ${ordersUpdated} orders migrated`);
    console.log(`   - ${ordersSkipped} orders skipped (already migrated)`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    console.log('\n📦 Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

migrateDualDonations();

