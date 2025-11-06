// Script to reset all statistics and analytics data for a specific user
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function resetUserStats(email) {
    try {
        // Dynamic imports after environment variables are loaded
        const { default: dbConnect } = await import('../src/lib/mongodb.js');
        const { default: User } = await import('../src/models/User.js');
        const { default: Order } = await import('../src/models/Order.js');
        const { default: StoreVisit } = await import('../src/models/StoreVisit.js');
        const { default: ConversionEvent } = await import('../src/models/ConversionEvent.js');

        await dbConnect();
        console.log('✅ Connected to MongoDB');

        // Find the user by email
        const user = await User.findOne({ email: email });

        if (!user) {
            console.log(`❌ User with email ${email} not found`);
            return;
        }

        console.log(`✅ Found user: ${user.name} (${user.email})`);
        console.log(`   User ID: ${user._id}`);
        console.log(`   Role: ${user.role}`);

        // 1. Delete all orders for this user
        const ordersDeleted = await Order.deleteMany({ user: user._id });
        console.log(`\n📦 Orders:`);
        console.log(`   - Deleted ${ordersDeleted.deletedCount} orders`);

        // 2. Delete all store visits for this user's store
        if (user.store) {
            const visitsDeleted = await StoreVisit.deleteMany({ storeId: user.store });
            console.log(`\n👁️  Store Visits:`);
            console.log(`   - Deleted ${visitsDeleted.deletedCount} store visits`);
        }

        // 3. Delete all conversion events for this user's store
        if (user.store) {
            const eventsDeleted = await ConversionEvent.deleteMany({ storeId: user.store });
            console.log(`\n📊 Conversion Events:`);
            console.log(`   - Deleted ${eventsDeleted.deletedCount} conversion events`);
        }

        // 4. Reset user order counter
        await User.findByIdAndUpdate(
            user._id,
            { $set: { orderCounter: 0 } },
            { new: true }
        );
        console.log(`\n🔢 Order Counter:`);
        console.log(`   - Reset to 0`);

        // 5. Verify no orders remain
        const remainingOrders = await Order.countDocuments({ user: user._id });
        console.log(`\n✅ Verification:`);
        console.log(`   - Remaining orders: ${remainingOrders}`);

        if (remainingOrders === 0) {
            console.log(`\n🎉 All statistics have been reset successfully!`);
            console.log(`   The stats page should now show all zeros.`);
        } else {
            console.log(`\n⚠️  Warning: ${remainingOrders} orders still exist for this user.`);
        }

    } catch (error) {
        console.error('❌ Error resetting user stats:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address as argument');
    console.log('Usage: node scripts/reset-user-stats.js <email>');
    process.exit(1);
}

console.log(`🔄 Resetting statistics for: ${email}`);
resetUserStats(email);

