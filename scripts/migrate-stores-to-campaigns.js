// scripts/migrate-stores-to-campaigns.js
// Migration script to create stores for existing campaigns
// This creates a store for each user-campaign combination that doesn't have one yet

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Define models inline to avoid import issues
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    campaigns: [{
        campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
        schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
        joinedAt: Date,
        objectifPersonnel: Number,
        isActive: Boolean
    }]
}, { collection: 'users' });

const StoreSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    name: String,
    slug: String,
    description: String,
    autoDeposit: Boolean,
    discountEnabled: Boolean
}, { collection: 'stores' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Store = mongoose.models.Store || mongoose.model('Store', StoreSchema);

// Slug generation function
function generateSlug(name) {
    if (!name) return '';

    return name
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function migrateStoresToCampaigns() {
    try {
        console.log('🚀 Starting stores migration to campaigns...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all users with campaigns
        const users = await User.find({
            campaigns: { $exists: true, $ne: [] }
        }).lean();

        console.log(`Found ${users.length} users with campaigns`);

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            if (!user.campaigns || user.campaigns.length === 0) {
                continue;
            }

            for (const campaignEntry of user.campaigns) {
                const campaignId = campaignEntry.campaignId;

                if (!campaignId) {
                    console.warn(`⚠️  User ${user._id} has campaign entry without campaignId`);
                    continue;
                }

                try {
                    // Check if store already exists for this user-campaign combination
                    const existingStore = await Store.findOne({
                        user: user._id,
                        campaignId: campaignId
                    });

                    if (existingStore) {
                        console.log(`✓ Store already exists for user ${user._id} and campaign ${campaignId}`);
                        skippedCount++;
                        continue;
                    }

                    // Generate slug from user name
                    const baseSlug = generateSlug(user.name || 'user');
                    let slug = baseSlug;
                    let counter = 1;

                    // Ensure slug is unique
                    while (await Store.findOne({ slug, _id: { $ne: null } })) {
                        slug = `${baseSlug}-${counter}`;
                        counter++;
                    }

                    // Create new store
                    const newStore = new Store({
                        user: user._id,
                        campaignId: campaignId,
                        name: `Campagne de ${user.name || 'Utilisateur'}`,
                        description: "🎉 Profitez des pâtés exclusifs de Massibec (viande et poulet) ainsi que d'un choix de délicieuses tartes pour les fêtes ! Économisez plus en achetant plus : 5 % de rabais dès 6 produits. Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et récupérez facilement vos produits. 🙏 Merci pour votre générosité !",
                        autoDeposit: false,
                        discountEnabled: true,
                        slug: slug
                    });

                    await newStore.save();

                    console.log(`✓ Created store "${slug}" for user ${user._id} (${user.email || user.name}) and campaign ${campaignId}`);
                    successCount++;
                } catch (error) {
                    console.error(`✗ Error creating store for user ${user._id} and campaign ${campaignId}:`, error.message);
                    errorCount++;
                }
            }
        }

        console.log('\n=== Migration Summary ===');
        console.log(`Successfully created: ${successCount}`);
        console.log(`Skipped (already exists): ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Total users processed: ${users.length}`);

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

migrateStoresToCampaigns();

