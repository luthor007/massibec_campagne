// scripts/migrate-store-slugs.js
// Migration script to add slugs to existing stores
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Define models inline to avoid import issues
const UserSchema = new mongoose.Schema({
    name: String,
    email: String
}, { collection: 'users' });

const StoreSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: String,
    slug: String
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

async function migrateStoreSlugs() {
    try {
        console.log('🚀 Starting store slugs migration...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all stores without slugs
        const stores = await Store.find({ slug: { $exists: false } });
        console.log(`Found ${stores.length} stores without slugs`);

        let successCount = 0;
        let errorCount = 0;

        for (const store of stores) {
            try {
                // Get the user associated with the store
                const user = await User.findById(store.user);

                if (!user) {
                    console.error(`User not found for store ${store._id}`);
                    errorCount++;
                    continue;
                }

                // Generate base slug from user name
                const baseSlug = generateSlug(user.name);

                if (!baseSlug) {
                    console.error(`Could not generate slug for store ${store._id} (user: ${user.name})`);
                    errorCount++;
                    continue;
                }

                // Check if slug already exists
                let slug = baseSlug;
                let counter = 1;

                while (await Store.findOne({ slug, _id: { $ne: store._id } })) {
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }

                // Update store with slug directly using updateOne to avoid pre-save hooks
                await Store.updateOne({ _id: store._id }, { $set: { slug } });

                console.log(`✓ Added slug "${slug}" to store ${store._id} (user: ${user.name})`);
                successCount++;
            } catch (error) {
                console.error(`✗ Error processing store ${store._id}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n=== Migration Summary ===');
        console.log(`Successfully migrated: ${successCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Total stores processed: ${stores.length}`);

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

migrateStoreSlugs();

