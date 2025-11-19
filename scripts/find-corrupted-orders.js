/**
 * Script to find and identify corrupted Order documents with invalid UTF-8
 * Run with: node scripts/find-corrupted-orders.js
 * 
 * This will:
 * 1. Scan all orders in the database
 * 2. Identify which ones have invalid UTF-8 encoding
 * 3. Show details about corrupted documents
 * 4. Allow you to delete them (with confirmation)
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function findCorruptedOrders() {
    try {
        // Connect to MongoDB using raw driver to handle corrupted data
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;
        const collection = db.collection('orders');

        console.log('🔍 Scanning orders for corrupted data...\n');

        // Get all document IDs without trying to parse the full documents
        const orderIds = [];
        const corruptedOrders = [];

        try {
            // Use raw cursor to scan documents - only get _id to avoid deserialization errors
            const cursor = collection.find({}, { projection: { _id: 1 } });

            for await (const doc of cursor) {
                if (doc && doc._id) {
                    orderIds.push(doc._id);
                }
            }
        } catch (error) {
            console.error('❌ Error scanning orders:', error.message);
            process.exit(1);
        }

        console.log(`📊 Found ${orderIds.length} order IDs in collection\n`);

        // Now try to access each order individually to find corrupted ones
        console.log('🔍 Checking each order for corruption...\n');

        let checked = 0;
        for (const id of orderIds) {
            checked++;
            if (checked % 100 === 0) {
                console.log(`   Checked ${checked}/${orderIds.length} orders...`);
            }

            try {
                // Try to find the document using Mongoose model (this will fail on corrupted UTF-8)
                const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

                try {
                    const order = await Order.findById(id).lean();

                    if (!order) {
                        continue; // Document doesn't exist
                    }

                    // Try to access all string fields to detect corruption
                    const stringFields = [
                        'customerName', 'customerEmail', 'phoneNumber', 'school',
                        'status', 'orderId', 'deliveryOption', 'customDeliveryOption',
                        'customerDeliveryAddress', 'distributionNotes'
                    ];

                    for (const field of stringFields) {
                        if (order[field] !== undefined && order[field] !== null) {
                            // Try to JSON stringify - this will fail on invalid UTF-8
                            try {
                                JSON.stringify(order[field]);
                                // Try to convert to string
                                String(order[field]);
                            } catch (fieldError) {
                                if (fieldError.message && (fieldError.message.includes('UTF') || fieldError.message.includes('Invalid'))) {
                                    throw new Error(`Invalid UTF-8 in field ${field}: ${fieldError.message}`);
                                }
                            }
                        }
                    }

                    // Check product names in products array
                    if (order.products && Array.isArray(order.products)) {
                        for (const product of order.products) {
                            if (product.productName) {
                                try {
                                    JSON.stringify(product.productName);
                                    String(product.productName);
                                } catch (fieldError) {
                                    if (fieldError.message && (fieldError.message.includes('UTF') || fieldError.message.includes('Invalid'))) {
                                        throw new Error(`Invalid UTF-8 in product.productName: ${fieldError.message}`);
                                    }
                                }
                            }
                        }
                    }

                } catch (modelError) {
                    // If Mongoose fails, try raw MongoDB
                    try {
                        const rawDoc = await collection.findOne({ _id: id });

                        if (!rawDoc) {
                            continue;
                        }

                        // Try to JSON stringify the whole document
                        try {
                            JSON.stringify(rawDoc);
                        } catch (jsonError) {
                            if (jsonError.message && (jsonError.message.includes('UTF') || jsonError.message.includes('Invalid'))) {
                                // This is corrupted - try to extract owner information
                                const corruptedInfo = {
                                    _id: id.toString(),
                                    error: jsonError.message,
                                    errorType: 'BSON_UTF8_ERROR',
                                    // Try to extract what we can safely
                                    orderId: rawDoc.orderId || 'N/A',
                                    customerName: 'N/A (corrupted)',
                                    customerEmail: 'N/A (corrupted)',
                                    createdAt: rawDoc.createdAt || 'N/A',
                                    userId: null,
                                    storeId: null,
                                    schoolId: null,
                                    campaignId: null,
                                    userName: 'N/A',
                                    storeName: 'N/A',
                                    schoolName: 'N/A'
                                };

                                // Extract ObjectId fields (these are usually safe even with corruption)
                                try {
                                    if (rawDoc.user) {
                                        corruptedInfo.userId = rawDoc.user.toString ? rawDoc.user.toString() : String(rawDoc.user);
                                    }
                                } catch { }

                                try {
                                    if (rawDoc.store) {
                                        corruptedInfo.storeId = rawDoc.store.toString ? rawDoc.store.toString() : String(rawDoc.store);
                                    }
                                } catch { }

                                try {
                                    if (rawDoc.school) {
                                        corruptedInfo.schoolId = typeof rawDoc.school === 'string' ? rawDoc.school : (rawDoc.school.toString ? rawDoc.school.toString() : String(rawDoc.school));
                                    }
                                } catch { }

                                try {
                                    if (rawDoc.campaignId) {
                                        corruptedInfo.campaignId = rawDoc.campaignId.toString ? rawDoc.campaignId.toString() : String(rawDoc.campaignId);
                                    }
                                } catch { }

                                // Try to extract some string fields if possible
                                try {
                                    if (rawDoc.customerName) {
                                        corruptedInfo.customerName = String(rawDoc.customerName).substring(0, 50);
                                    }
                                } catch { }

                                try {
                                    if (rawDoc.customerEmail) {
                                        corruptedInfo.customerEmail = String(rawDoc.customerEmail).substring(0, 50);
                                    }
                                } catch { }

                                corruptedOrders.push(corruptedInfo);
                                console.log(`❌ Corrupted order found: ${id}`);
                            }
                        }
                    } catch (rawError) {
                        // Even raw access failed - definitely corrupted
                        // Try multiple approaches to extract owner information
                        let userId = null;
                        let storeId = null;
                        let schoolId = null;
                        let campaignId = null;
                        let orderId = null;
                        let createdAt = null;

                        // Approach 1: Try minimal projection (only ObjectIds and dates)
                        try {
                            const minimalDoc = await collection.findOne(
                                { _id: id },
                                { projection: { user: 1, store: 1, school: 1, campaignId: 1, orderId: 1, createdAt: 1 } }
                            );

                            if (minimalDoc) {
                                if (minimalDoc.user) {
                                    userId = minimalDoc.user.toString ? minimalDoc.user.toString() : String(minimalDoc.user);
                                }
                                if (minimalDoc.store) {
                                    storeId = minimalDoc.store.toString ? minimalDoc.store.toString() : String(minimalDoc.store);
                                }
                                if (minimalDoc.school) {
                                    schoolId = typeof minimalDoc.school === 'string' ? minimalDoc.school : (minimalDoc.school.toString ? minimalDoc.school.toString() : String(minimalDoc.school));
                                }
                                if (minimalDoc.campaignId) {
                                    campaignId = minimalDoc.campaignId.toString ? minimalDoc.campaignId.toString() : String(minimalDoc.campaignId);
                                }
                                if (minimalDoc.orderId) {
                                    try {
                                        orderId = String(minimalDoc.orderId);
                                    } catch { }
                                }
                                if (minimalDoc.createdAt) {
                                    createdAt = minimalDoc.createdAt;
                                }
                            }
                        } catch { }

                        // Approach 2: If minimal projection also fails, try using MongoDB aggregation with $project
                        if (!userId && !storeId) {
                            try {
                                const aggResult = await collection.aggregate([
                                    { $match: { _id: id } },
                                    {
                                        $project: {
                                            user: { $ifNull: ['$user', null] },
                                            store: { $ifNull: ['$store', null] },
                                            school: { $ifNull: ['$school', null] },
                                            campaignId: { $ifNull: ['$campaignId', null] }
                                        }
                                    }
                                ]).toArray();

                                if (aggResult && aggResult.length > 0) {
                                    const doc = aggResult[0];
                                    if (doc.user) {
                                        userId = doc.user.toString ? doc.user.toString() : String(doc.user);
                                    }
                                    if (doc.store) {
                                        storeId = doc.store.toString ? doc.store.toString() : String(doc.store);
                                    }
                                    if (doc.school) {
                                        schoolId = typeof doc.school === 'string' ? doc.school : (doc.school.toString ? doc.school.toString() : String(doc.school));
                                    }
                                    if (doc.campaignId) {
                                        campaignId = doc.campaignId.toString ? doc.campaignId.toString() : String(doc.campaignId);
                                    }
                                }
                            } catch { }
                        }

                        corruptedOrders.push({
                            _id: id.toString(),
                            error: rawError.message || modelError.message,
                            errorType: 'RAW_ACCESS_FAILED',
                            orderId: orderId || 'N/A',
                            customerName: 'N/A (cannot access)',
                            customerEmail: 'N/A (cannot access)',
                            createdAt: createdAt || 'N/A',
                            userId: userId,
                            storeId: storeId,
                            schoolId: schoolId,
                            campaignId: campaignId,
                            userName: 'N/A',
                            storeName: 'N/A',
                            schoolName: 'N/A'
                        });
                        console.log(`❌ Severely corrupted order found: ${id}`);
                    }
                }
            } catch (error) {
                // Check if it's a UTF-8 error
                if (error.message && (error.message.includes('UTF-8') || error.message.includes('Invalid') || error.message.includes('BSON'))) {
                    // Try to get minimal info before marking as corrupted
                    let userId = null;
                    let storeId = null;
                    let schoolId = null;

                    try {
                        const minimalDoc = await collection.findOne(
                            { _id: id },
                            { projection: { user: 1, store: 1, school: 1, campaignId: 1, orderId: 1, createdAt: 1 } }
                        );

                        if (minimalDoc) {
                            if (minimalDoc.user) {
                                userId = minimalDoc.user.toString ? minimalDoc.user.toString() : String(minimalDoc.user);
                            }
                            if (minimalDoc.store) {
                                storeId = minimalDoc.store.toString ? minimalDoc.store.toString() : String(minimalDoc.store);
                            }
                            if (minimalDoc.school) {
                                schoolId = typeof minimalDoc.school === 'string' ? minimalDoc.school : (minimalDoc.school.toString ? minimalDoc.school.toString() : String(minimalDoc.school));
                            }
                        }
                    } catch { }

                    corruptedOrders.push({
                        _id: id.toString(),
                        error: error.message,
                        errorType: 'UTF8_DETECTED',
                        orderId: 'N/A',
                        customerName: 'N/A (corrupted)',
                        customerEmail: 'N/A (corrupted)',
                        createdAt: 'N/A',
                        userId: userId,
                        storeId: storeId,
                        schoolId: schoolId,
                        userName: 'N/A',
                        storeName: 'N/A',
                        schoolName: 'N/A'
                    });
                    console.log(`❌ Corrupted order detected: ${id}`);
                }
            }
        }

        console.log(`\n\n📋 SUMMARY`);
        console.log(`════════════════════════════════════════`);
        console.log(`Total orders scanned: ${orderIds.length}`);
        console.log(`Corrupted orders found: ${corruptedOrders.length}`);
        console.log(`Valid orders: ${orderIds.length - corruptedOrders.length}`);

        if (corruptedOrders.length > 0) {
            // Try to fetch user/store/school names for corrupted orders
            console.log(`\n🔍 Fetching owner information for corrupted orders...\n`);

            const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
            const Store = mongoose.models.Store || mongoose.model('Store', new mongoose.Schema({}, { strict: false }));
            const School = mongoose.models.School || mongoose.model('School', new mongoose.Schema({}, { strict: false }));

            for (const order of corruptedOrders) {
                // Try to get user name
                if (order.userId && mongoose.Types.ObjectId.isValid(order.userId)) {
                    try {
                        const user = await User.findById(order.userId).select('name email').lean();
                        if (user) {
                            order.userName = user.name || user.email || 'Unknown';
                        }
                    } catch { }
                }

                // Try to get store name
                if (order.storeId && mongoose.Types.ObjectId.isValid(order.storeId)) {
                    try {
                        const store = await Store.findById(order.storeId).select('name slug').lean();
                        if (store) {
                            order.storeName = store.name || store.slug || 'Unknown';
                        }
                    } catch { }
                }

                // Try to get school name
                if (order.schoolId) {
                    try {
                        let school = null;
                        if (mongoose.Types.ObjectId.isValid(order.schoolId)) {
                            school = await School.findById(order.schoolId).select('name nomEcole code').lean();
                        } else {
                            // Try to find by name/code
                            school = await School.findOne({
                                $or: [
                                    { name: order.schoolId },
                                    { nomEcole: order.schoolId },
                                    { code: order.schoolId }
                                ]
                            }).select('name nomEcole code').lean();
                        }
                        if (school) {
                            order.schoolName = school.name || school.nomEcole || school.code || 'Unknown';
                        }
                    } catch { }
                }
            }

            console.log(`\n\n❌ CORRUPTED ORDERS DETAILS:`);
            console.log(`════════════════════════════════════════`);

            corruptedOrders.forEach((order, index) => {
                console.log(`\n${index + 1}. Order ID: ${order._id}`);
                console.log(`   Order Number: ${order.orderId}`);
                console.log(`   Customer Name: ${order.customerName}`);
                console.log(`   Customer Email: ${order.customerEmail}`);
                console.log(`   Created At: ${order.createdAt}`);
                console.log(`   ──────────────────────────────────────`);
                console.log(`   👤 Owner (User): ${order.userName} (ID: ${order.userId || 'N/A'})`);
                console.log(`   🏪 Store: ${order.storeName} (ID: ${order.storeId || 'N/A'})`);
                console.log(`   🏫 School: ${order.schoolName} (ID: ${order.schoolId || 'N/A'})`);
                if (order.campaignId) {
                    console.log(`   📅 Campaign ID: ${order.campaignId}`);
                }
                console.log(`   ──────────────────────────────────────`);
                console.log(`   Error Type: ${order.errorType}`);
                console.log(`   Error: ${order.error ? order.error.substring(0, 100) : 'Unknown error'}...`);
            });

            console.log(`\n\n🗑️  DELETION OPTIONS`);
            console.log(`════════════════════════════════════════`);
            console.log(`Would you like to delete these corrupted orders?`);
            console.log(`⚠️  WARNING: This action cannot be undone!`);

            const answer = await question('\nDelete corrupted orders? (yes/no): ');

            if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                console.log('\n🗑️  Deleting corrupted orders...\n');
                console.log('⚠️  SAFETY CHECK: Verifying each order is corrupted before deletion...\n');

                let deletedCount = 0;
                let failedCount = 0;
                let skippedCount = 0;

                for (const corruptedOrder of corruptedOrders) {
                    try {
                        const orderId = new mongoose.Types.ObjectId(corruptedOrder._id);

                        // SAFETY CHECK: Verify the order is actually corrupted before deleting
                        let isCorrupted = false;

                        try {
                            // Try to read it with Mongoose - if this succeeds, it's NOT corrupted
                            const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
                            const testOrder = await Order.findById(orderId).lean();

                            if (testOrder) {
                                // Order can be read - verify it's actually corrupted by trying JSON.stringify
                                try {
                                    JSON.stringify(testOrder);
                                    // If we get here, the order is NOT corrupted - skip it
                                    console.log(`⚠️  SKIPPED: Order ${corruptedOrder._id} can be read normally - NOT corrupted!`);
                                    skippedCount++;
                                    continue;
                                } catch (jsonError) {
                                    if (jsonError.message && (jsonError.message.includes('UTF') || jsonError.message.includes('Invalid'))) {
                                        isCorrupted = true;
                                    } else {
                                        // Different error - skip to be safe
                                        console.log(`⚠️  SKIPPED: Order ${corruptedOrder._id} has different error - skipping for safety`);
                                        skippedCount++;
                                        continue;
                                    }
                                }
                            }
                        } catch (readError) {
                            // Can't read with Mongoose - verify it's a UTF-8 error
                            if (readError.message && (readError.message.includes('UTF-8') || readError.message.includes('Invalid') || readError.message.includes('BSON'))) {
                                isCorrupted = true;
                            } else {
                                // Different error - skip to be safe
                                console.log(`⚠️  SKIPPED: Order ${corruptedOrder._id} has unexpected error: ${readError.message}`);
                                skippedCount++;
                                continue;
                            }
                        }

                        // Additional verification: Try raw MongoDB access
                        if (isCorrupted) {
                            try {
                                const rawDoc = await collection.findOne({ _id: orderId });
                                if (rawDoc) {
                                    try {
                                        JSON.stringify(rawDoc);
                                        // If we can stringify it, it's not corrupted
                                        console.log(`⚠️  SKIPPED: Order ${corruptedOrder._id} can be stringified - NOT corrupted!`);
                                        skippedCount++;
                                        continue;
                                    } catch (jsonError) {
                                        if (!jsonError.message || (!jsonError.message.includes('UTF') && !jsonError.message.includes('Invalid'))) {
                                            // Not a UTF-8 error - skip
                                            console.log(`⚠️  SKIPPED: Order ${corruptedOrder._id} has non-UTF-8 error - skipping for safety`);
                                            skippedCount++;
                                            continue;
                                        }
                                        // Confirmed: it's a UTF-8 error
                                    }
                                }
                            } catch { }
                        }

                        // Only delete if we've confirmed it's corrupted
                        if (isCorrupted) {
                            // Final safety check: verify the _id matches what we found
                            if (corruptedOrder._id !== orderId.toString()) {
                                console.log(`⚠️  SKIPPED: Order ID mismatch - skipping for safety`);
                                skippedCount++;
                                continue;
                            }

                            const result = await collection.deleteOne({ _id: orderId });
                            if (result.deletedCount > 0) {
                                console.log(`✅ Deleted corrupted order: ${corruptedOrder._id}`);
                                deletedCount++;
                            } else {
                                console.log(`⚠️  Order not found (may have been already deleted): ${corruptedOrder._id}`);
                            }
                        } else {
                            console.log(`⚠️  SKIPPED: Could not confirm corruption for ${corruptedOrder._id} - skipping for safety`);
                            skippedCount++;
                        }
                    } catch (error) {
                        console.error(`❌ Failed to delete ${corruptedOrder._id}:`, error.message);
                        failedCount++;
                    }
                }

                console.log(`\n\n✅ DELETION COMPLETE`);
                console.log(`════════════════════════════════════════`);
                console.log(`Successfully deleted: ${deletedCount}`);
                console.log(`Skipped (safety check): ${skippedCount}`);
                console.log(`Failed to delete: ${failedCount}`);
                console.log(`Total corrupted found: ${corruptedOrders.length}`);
                console.log(`Remaining to investigate: ${corruptedOrders.length - deletedCount - skippedCount}`);

                if (skippedCount > 0) {
                    console.log(`\n⚠️  NOTE: ${skippedCount} order(s) were skipped because they could be read normally.`);
                    console.log(`   These may have been false positives or were fixed during the scan.`);
                }
            } else {
                console.log('\n❌ Deletion cancelled. Corrupted orders remain in database.');
                console.log('You can run this script again later to delete them.');
            }
        } else {
            console.log('\n✅ No corrupted orders found! All orders are valid.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        console.error(error.stack);
    } finally {
        rl.close();
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    }
}

// Run the script
console.log('🔍 Order Corruption Scanner');
console.log('════════════════════════════════════════\n');
findCorruptedOrders();

