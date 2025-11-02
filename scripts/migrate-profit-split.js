import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Campaign from '../src/models/Campaign.js';

dotenv.config({ path: '.env.local' });

async function migrateProfitSplit() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all campaigns
    const campaigns = await Campaign.find({});
    console.log(`Found ${campaigns.length} campaigns to migrate`);

    let migratedCount = 0;

    for (const campaign of campaigns) {
      console.log(`Migrating campaign: ${campaign.campaignCode}`);
      
      // Check if campaign has old profit split structure
      const hasOldStructure = campaign.profitSplits.some(split => 
        split.student !== undefined || split.school !== undefined
      );

      if (hasOldStructure) {
        // Migrate old structure to new structure
        const newProfitSplits = campaign.profitSplits.map(split => {
          const oldStudent = split.student || 2.00;
          const oldSchool = split.school || 0.75;
          const oldRaffle = split.raffle || 0.25;

          return {
            productId: split.productId,
            studentCash: oldStudent, // Keep existing student profit as cash
            studentSchoolAccount: 0, // Default to 0 for existing campaigns
            schoolProject: oldSchool,
            raffle: oldRaffle
          };
        });

        await Campaign.findByIdAndUpdate(campaign._id, {
          $set: { profitSplits: newProfitSplits }
        });

        console.log(`  - Migrated ${newProfitSplits.length} product profit splits`);
        migratedCount++;
      } else if (campaign.profitSplits.length === 0) {
        // Campaign has no profit splits, set defaults
        console.log(`  - Setting default profit splits`);
        
        await Campaign.findByIdAndUpdate(campaign._id, {
          $set: {
            profitSplits: [{
              studentCash: 1.00,
              studentSchoolAccount: 1.00,
              schoolProject: 0.75,
              raffle: 0.25
            }]
          }
        });

        migratedCount++;
      }
    }

    console.log(`\nMigration completed! ${migratedCount} campaigns migrated.`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
migrateProfitSplit();
