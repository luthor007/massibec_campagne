// Migration script to update OrderStudent index
// Run this once to fix the index issue: GET /api/migrate-orderStudent-index

import dbConnect from '../../lib/mongodb';
import OrderStudent from '../../models/OrderStudent';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const collection = OrderStudent.collection;
    
    // Get all current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);
    
    // Try to drop the old unique index on orderId
    try {
      await collection.dropIndex('orderId_1');
      console.log('✅ Dropped old index: orderId_1');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  Index orderId_1 does not exist (already removed)');
      } else {
        throw error;
      }
    }
    
    // Ensure the new composite index exists
    try {
      await collection.createIndex(
        { campaignNumber: 1, orderId: 1 }, 
        { unique: true, name: 'campaignNumber_1_orderId_1' }
      );
      console.log('✅ Created new composite index: campaignNumber_1_orderId_1');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️  Index already exists');
      } else {
        throw error;
      }
    }
    
    // Get final indexes
    const finalIndexes = await collection.indexes();
    
    return res.status(200).json({
      message: 'Migration completed successfully',
      indexes: finalIndexes
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ 
      message: 'Migration failed',
      error: error.message,
      code: error.code
    });
  }
}

