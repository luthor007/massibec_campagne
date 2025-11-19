// Script to completely delete a test user and all associated data
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function deleteTestUser(email) {
    try {
        // Dynamic imports after environment variables are loaded
        const { default: dbConnect } = await import('../src/lib/mongodb.js');
        const mongoose = (await import('mongoose')).default;
        const { default: User } = await import('../src/models/User.js');
        const { default: Order } = await import('../src/models/Order.js');
        const { default: OrderStudent } = await import('../src/models/OrderStudent.js');
        const { default: StoreVisit } = await import('../src/models/StoreVisit.js');
        const { default: ConversionEvent } = await import('../src/models/ConversionEvent.js');
        const { default: StudentInventory } = await import('../src/models/StudentInventory.js');

        await dbConnect();
        console.log('✅ Connected to MongoDB\n');

        // Find the user by email
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            console.log(`❌ User with email ${email} not found`);
            return;
        }

        console.log(`📋 Found user: ${user.name} (${user.email})`);
        console.log(`   User ID: ${user._id}`);
        console.log(`   Role: ${user.role}\n`);

        const userId = user._id;
        let totalDeleted = 0;

        // 1. Delete all orders (Order) for this user
        const ordersDeleted = await Order.deleteMany({ user: userId });
        console.log(`📦 Orders (Order):`);
        console.log(`   - Deleted ${ordersDeleted.deletedCount} orders`);
        totalDeleted += ordersDeleted.deletedCount;

        // 2. Delete all student orders (OrderStudent) for this user
        // OrderStudent might reference by email or user ID
        const orderStudentsDeleted = await OrderStudent.deleteMany({
            $or: [
                { email: user.email },
                { user: userId }
            ]
        });
        console.log(`📦 Student Orders (OrderStudent):`);
        console.log(`   - Deleted ${orderStudentsDeleted.deletedCount} student orders`);
        totalDeleted += orderStudentsDeleted.deletedCount;

        // 3. Get store IDs before deleting stores (using mongoose directly to avoid import issues)
        const Store = mongoose.connection.db.collection('stores');
        const userStores = await Store.find({ user: userId }).toArray();
        const storeIdStrings = userStores.map(s => s._id.toString());

        // 4. Delete all stores for this user
        const storesDeleted = await Store.deleteMany({ user: userId });
        console.log(`🏪 Stores:`);
        console.log(`   - Deleted ${storesDeleted.deletedCount} stores`);
        totalDeleted += storesDeleted.deletedCount;

        // 5. Delete all store visits for stores owned by this user
        if (storeIdStrings.length > 0) {
            const visitsDeleted = await StoreVisit.deleteMany({
                storeId: { $in: storeIdStrings }
            });
            console.log(`👁️  Store Visits (by storeId):`);
            console.log(`   - Deleted ${visitsDeleted.deletedCount} store visits`);
            totalDeleted += visitsDeleted.deletedCount;
        }

        // Also delete visits by userId
        const visitsByUserDeleted = await StoreVisit.deleteMany({ userId: userId });
        if (visitsByUserDeleted.deletedCount > 0) {
            console.log(`👁️  Store Visits (by userId):`);
            console.log(`   - Deleted ${visitsByUserDeleted.deletedCount} additional visits`);
            totalDeleted += visitsByUserDeleted.deletedCount;
        }

        // 6. Delete all conversion events for stores owned by this user
        if (storeIdStrings.length > 0) {
            const eventsDeleted = await ConversionEvent.deleteMany({
                storeId: { $in: storeIdStrings }
            });
            console.log(`📊 Conversion Events:`);
            console.log(`   - Deleted ${eventsDeleted.deletedCount} conversion events`);
            totalDeleted += eventsDeleted.deletedCount;
        }

        // 6. Delete all student inventory records
        const inventoryDeleted = await StudentInventory.deleteMany({ userId: userId });
        console.log(`📦 Student Inventory:`);
        console.log(`   - Deleted ${inventoryDeleted.deletedCount} inventory records`);
        totalDeleted += inventoryDeleted.deletedCount;

        // 7. Remove user from any campaigns (clean up campaigns array)
        if (user.campaigns && user.campaigns.length > 0) {
            console.log(`\n🎯 Campaigns:`);
            console.log(`   - User was enrolled in ${user.campaigns.length} campaign(s)`);
            console.log(`   - Campaign references will be removed when user is deleted`);
        }

        // 8. Finally, delete the user
        await User.findByIdAndDelete(userId);
        console.log(`\n👤 User:`);
        console.log(`   - Deleted user account: ${user.name} (${user.email})`);
        totalDeleted += 1;

        console.log(`\n✅ Cleanup complete!`);
        console.log(`   Total records deleted: ${totalDeleted}`);
        console.log(`   User ${email} and all associated data have been removed.\n`);

    } catch (error) {
        console.error('❌ Error deleting test user:', error);
        throw error;
    }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node scripts/delete-test-user.js <email>');
    console.log('Example: node scripts/delete-test-user.js testuser4@gmail.com');
    process.exit(1);
}

// Run the script
deleteTestUser(email)
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

