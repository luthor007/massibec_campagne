// Script to delete a user and all associated data by email
// Usage: node scripts/delete-user-by-email.js <email>

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function deleteUserByEmail(email) {
    try {
        // Dynamic imports after environment variables are loaded
        const { default: dbConnect } = await import('../src/lib/mongodb.js');
        const mongoose = (await import('mongoose')).default;
        const { default: User } = await import('../src/models/User.js');
        const { default: School } = await import('../src/models/School.js');
        const { default: Store } = await import('../src/models/Store.js');
        const { default: Order } = await import('../src/models/Order.js');
        const { default: OrderStudent } = await import('../src/models/OrderStudent.js');
        const { default: Campaign } = await import('../src/models/Campaign.js');
        const { default: SchoolManager } = await import('../src/models/SchoolManager.js');
        const { default: SupplierManager } = await import('../src/models/SupplierManager.js');
        const { default: Conversation } = await import('../src/models/Conversation.js');
        const { default: Message } = await import('../src/models/Message.js');
        const { default: Review } = await import('../src/models/Review.js');

        await dbConnect();
        console.log('✅ Connected to MongoDB');

        // Find the user
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            console.log(`❌ User with email ${email} not found`);
            await mongoose.disconnect();
            return;
        }

        console.log(`📋 Found user: ${user.name} (${user.email}) - Role: ${user.role}`);
        const userId = user._id;

        // Track what we're deleting
        const deletionSummary = {
            user: 0,
            orders: 0,
            orderStudents: 0,
            stores: 0,
            campaigns: 0,
            schools: 0,
            schoolManagers: 0,
            supplierManagers: 0,
            conversations: 0,
            messages: 0,
            reviews: 0,
        };

        // 1. Delete all orders
        const ordersResult = await Order.deleteMany({ user: userId });
        deletionSummary.orders = ordersResult.deletedCount;
        console.log(`🗑️  Deleted ${deletionSummary.orders} orders`);

        // 2. Delete all order students
        const orderStudentsResult = await OrderStudent.deleteMany({ user: userId });
        deletionSummary.orderStudents = orderStudentsResult.deletedCount;
        console.log(`🗑️  Deleted ${deletionSummary.orderStudents} order students`);

        // 3. Delete all stores
        const storesResult = await Store.deleteMany({ user: userId });
        deletionSummary.stores = storesResult.deletedCount;
        console.log(`🗑️  Deleted ${deletionSummary.stores} stores`);

        // 4. Delete conversations and messages
        const conversations = await Conversation.find({
            $or: [
                { school: userId },
                { supplier: userId }
            ]
        });

        for (const conv of conversations) {
            // Delete all messages in this conversation
            const messagesResult = await Message.deleteMany({ conversation: conv._id });
            deletionSummary.messages += messagesResult.deletedCount;

            // Delete the conversation
            await Conversation.findByIdAndDelete(conv._id);
            deletionSummary.conversations++;
        }
        console.log(`🗑️  Deleted ${deletionSummary.conversations} conversations and ${deletionSummary.messages} messages`);

        // 5. Delete reviews
        const reviewsResult = await Review.deleteMany({
            $or: [
                { school: userId },
                { supplier: userId }
            ]
        });
        deletionSummary.reviews = reviewsResult.deletedCount;
        console.log(`🗑️  Deleted ${deletionSummary.reviews} reviews`);

        // 6. Handle school manager
        if (user.role === 'school_manager') {
            const schoolManagers = await SchoolManager.find({ user: userId });
            deletionSummary.schoolManagers = schoolManagers.length;

            // Get all schools managed by this user
            const schoolIds = schoolManagers.map(sm => sm.school);

            // Delete school manager entries
            await SchoolManager.deleteMany({ user: userId });
            console.log(`🗑️  Deleted ${deletionSummary.schoolManagers} school manager entries`);

            // Delete campaigns associated with these schools
            const campaignsResult = await Campaign.deleteMany({ school: { $in: schoolIds } });
            deletionSummary.campaigns = campaignsResult.deletedCount;
            console.log(`🗑️  Deleted ${deletionSummary.campaigns} campaigns`);

            // Delete schools (only if no other managers)
            for (const schoolId of schoolIds) {
                const otherManagers = await SchoolManager.find({
                    school: schoolId,
                    user: { $ne: userId }
                });

                if (otherManagers.length === 0) {
                    // No other managers, safe to delete school
                    await School.findByIdAndDelete(schoolId);
                    deletionSummary.schools++;
                }
            }
            console.log(`🗑️  Deleted ${deletionSummary.schools} schools`);
        }

        // 7. Handle supplier manager
        if (user.role === 'supplier' || user.role === 'fournisseur') {
            const supplierManagers = await SupplierManager.find({ user: userId });
            deletionSummary.supplierManagers = supplierManagers.length;

            // Get supplier ID
            const supplierId = supplierManagers[0]?.supplier;

            if (supplierId) {
                // Delete campaigns associated with this supplier
                const campaignsResult = await Campaign.deleteMany({ supplier: supplierId });
                deletionSummary.campaigns = campaignsResult.deletedCount;
                console.log(`🗑️  Deleted ${deletionSummary.campaigns} campaigns`);
            }

            // Delete supplier manager entries
            await SupplierManager.deleteMany({ user: userId });
            console.log(`🗑️  Deleted ${deletionSummary.supplierManagers} supplier manager entries`);
        }

        // 8. Delete the user
        await User.findByIdAndDelete(userId);
        deletionSummary.user = 1;
        console.log(`🗑️  Deleted user account`);

        // Summary
        console.log('\n📊 Deletion Summary:');
        console.log(JSON.stringify(deletionSummary, null, 2));
        console.log('\n✅ User and all associated data deleted successfully!');

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error deleting user:', error);
        // Try to disconnect even on error
        try {
            await mongoose.disconnect();
        } catch (disconnectError) {
            // Ignore disconnect errors
        }
        throw error;
    }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node scripts/delete-user-by-email.js <email>');
    process.exit(1);
}

// Run the script
deleteUserByEmail(email)
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
