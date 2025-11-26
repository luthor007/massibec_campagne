// Script to delete supplier accounts and all associated data
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

// Import after env is loaded
const mongoose = (await import('mongoose')).default;
const { default: User } = await import('../src/models/User.js');
const { default: Supplier } = await import('../src/models/Supplier.js');
const { default: SupplierManager } = await import('../src/models/SupplierManager.js');
const { default: Product } = await import('../src/models/Product.js');
const { default: Campaign } = await import('../src/models/Campaign.js');
// ManagerInvitation only supports schools, not suppliers
const { default: Order } = await import('../src/models/Order.js');
// Store import might fail due to User import issue, try to import it dynamically
let Store;
try {
    Store = (await import('../src/models/Store.js')).default;
} catch (e) {
    // If Store import fails, we'll use mongoose directly
    Store = null;
}
const { default: dbConnect } = await import('../src/lib/mongodb.js');

const emailsToDelete = [
    'alexis.massicotte@icloud.com',
    'alexis.massicotte09@gmail.com',
    'louis.massicotte78@gmail.com'
];

async function deleteSupplierAccounts() {
    try {
        // Connect to MongoDB using the project's connection utility
        // Check if MONGODB_URI is set
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in environment variables');
            console.log('   Make sure .env.local exists and contains MONGODB_URI');
            process.exit(1);
        }

        await dbConnect();
        console.log('✅ Connected to MongoDB');

        for (const email of emailsToDelete) {
            console.log(`\n🔍 Processing: ${email}`);

            // Find user by email
            const user = await User.findOne({ email: email.toLowerCase() });

            if (!user) {
                console.log(`   ⚠️ User not found: ${email}`);
                continue;
            }

            console.log(`   👤 User found: ${user._id} (${user.name})`);

            // Find supplier linked to this user
            const supplierManager = await SupplierManager.findOne({ user: user._id });

            if (supplierManager) {
                const supplierId = supplierManager.supplier;
                console.log(`   🏢 Supplier found: ${supplierId}`);

                // Delete all products for this supplier
                const productsResult = await Product.deleteMany({ supplier: supplierId });
                console.log(`   📦 Deleted ${productsResult.deletedCount} products`);

                // Delete all campaigns linked to this supplier
                const campaignsResult = await Campaign.deleteMany({ supplier: supplierId });
                console.log(`   🎯 Deleted ${campaignsResult.deletedCount} campaigns`);

                // Get campaign IDs before deleting them (for related data cleanup)
                const campaigns = await Campaign.find({ supplier: supplierId });
                const campaignIds = campaigns.map(c => c._id);

                // Delete all orders linked to campaigns of this supplier
                if (campaignIds.length > 0) {
                    const ordersResult = await Order.deleteMany({ campaignId: { $in: campaignIds } });
                    console.log(`   🛒 Deleted ${ordersResult.deletedCount} orders`);
                }

                // Delete all stores linked to campaigns of this supplier
                if (campaignIds.length > 0) {
                    if (Store) {
                        const storesResult = await Store.deleteMany({ campaign: { $in: campaignIds } });
                        console.log(`   🏪 Deleted ${storesResult.deletedCount} stores`);
                    } else {
                        // Use mongoose directly if Store import failed
                        const StoreCollection = mongoose.connection.db.collection('stores');
                        const storesResult = await StoreCollection.deleteMany({ campaign: { $in: campaignIds.map(id => id.toString()) } });
                        console.log(`   🏪 Deleted ${storesResult.deletedCount} stores (via mongoose)`);
                    }
                }

                // Note: ManagerInvitation only supports schools, not suppliers
                // Supplier invitations are stored in Supplier.invitations array (will be deleted with supplier)

                // Delete all supplier managers for this supplier
                const managersResult = await SupplierManager.deleteMany({ supplier: supplierId });
                console.log(`   👥 Deleted ${managersResult.deletedCount} supplier managers`);

                // Delete the supplier
                await Supplier.findByIdAndDelete(supplierId);
                console.log(`   ✅ Supplier deleted`);
            } else {
                console.log(`   ⚠️ No supplier found for this user`);
            }

            // Delete the user
            await User.findByIdAndDelete(user._id);
            console.log(`   ✅ User deleted`);
        }

        console.log('\n✅ All accounts deleted successfully!');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

deleteSupplierAccounts();

