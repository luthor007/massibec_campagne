// pages/api/admin/find-corrupted-users.js
// Finds corrupted user documents in the database

import connectDB from '../../../lib/mongodb';
import mongoose from 'mongoose';
import User from '../../../models/User';

export default async function handler(req, res) {
  // Only allow in development or with a secret key
  if (process.env.NODE_ENV === 'production' && req.query.secret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.setHeader('Allow', ['GET', 'POST']).status(405).end(`Méthode ${req.method} non autorisée.`);
  }

  try {
    await connectDB();

    // Get the raw MongoDB collection to access documents directly
    const collection = mongoose.connection.db.collection('users');
    
    // Try to find all school_manager users using raw MongoDB queries
    // This will help us identify corrupted documents
    let allUsers = [];
    let corruptedUsers = [];
    let validUsers = [];

    // First, try to get all IDs that match the role filter
    let candidateIds = [];
    try {
      // Use aggregation pipeline to safely get IDs
      const idPipeline = [
        { $match: { role: 'school_manager' } },
        { $project: { _id: 1 } }
      ];
      
      const idResults = await collection.aggregate(idPipeline).toArray();
      candidateIds = idResults.map(r => r._id);
    } catch (error) {
      console.log('Aggregation failed, trying direct find...');
      // If aggregation fails, try to get IDs using find
      try {
        const ids = await collection.find({ role: 'school_manager' }, { projection: { _id: 1 } }).toArray();
        candidateIds = ids.map(i => i._id);
      } catch (e) {
        return res.status(500).json({
          message: 'Cannot query users collection - database may be severely corrupted',
          error: error.message,
          suggestion: 'Try using MongoDB repairDatabase command or restore from backup'
        });
      }
    }

    // Now try to access each document individually
    for (const id of candidateIds) {
      try {
        // Try to get the document using findOne
        const doc = await collection.findOne({ _id: id });
        
        if (!doc) {
          corruptedUsers.push({
            _id: id.toString(),
            error: 'Document not found but ID exists in index'
          });
          continue;
        }
        
        // Try to convert to User model to validate
        const user = new User(doc);
        await user.validate();
        
        // If validation passes, try to access fields
        const userData = {
          _id: doc._id.toString(),
          email: doc.email || 'N/A',
          name: doc.name || 'N/A',
          role: doc.role || 'N/A',
          schoolManagerInfo: doc.schoolManagerInfo || null,
          createdAt: doc.createdAt || null,
          isValid: true
        };
        
        // Try to get organisme ID safely
        try {
          if (doc.schoolManagerInfo?.organisme) {
            userData.organismeId = doc.schoolManagerInfo.organisme.toString();
          }
        } catch (e) {
          userData.organismeId = 'CORRUPTED';
        }
        
        validUsers.push(userData);
        allUsers.push(userData);
      } catch (error) {
        // This document is corrupted
        console.error('Corrupted user found:', id, error.message);
        
        // Try to get raw document bytes if possible
        let rawDoc = null;
        try {
          rawDoc = await collection.findOne({ _id: id }, { raw: true });
        } catch (e) {
          // Can't even read the raw document
        }
        
        // Try to extract what we can safely
        const corruptedData = {
          _id: id.toString(),
          error: error.message,
          errorType: error.name,
          rawFields: {}
        };
        
        // Try to safely extract string fields one by one
        try {
          const doc = await collection.findOne({ _id: id });
          if (doc) {
            try {
              corruptedData.email = String(doc.email || '');
            } catch (e) {
              corruptedData.email = 'CORRUPTED_STRING';
            }
            
            try {
              corruptedData.name = String(doc.name || '');
            } catch (e) {
              corruptedData.name = 'CORRUPTED_STRING';
            }
            
            try {
              corruptedData.role = String(doc.role || '');
            } catch (e) {
              corruptedData.role = 'CORRUPTED_STRING';
            }
            
            // Try to get organisme ID
            try {
              if (doc.schoolManagerInfo?.organisme) {
                corruptedData.organismeId = doc.schoolManagerInfo.organisme.toString();
              }
            } catch (e) {
              corruptedData.organismeId = 'CORRUPTED';
            }
            
            // Try to get creation date
            try {
              corruptedData.createdAt = doc.createdAt;
            } catch (e) {
              corruptedData.createdAt = null;
            }
          }
        } catch (readError) {
          corruptedData.readError = readError.message;
        }
        
        corruptedUsers.push(corruptedData);
        allUsers.push(corruptedData);
      }
    }

    // Additional check: try to find documents with invalid UTF-8 by attempting JSON stringify
    let utf8Errors = [];
    for (const id of candidateIds) {
      try {
        const doc = await collection.findOne({ _id: id });
        if (doc) {
          // Try to JSON stringify - this will fail on invalid UTF-8
          try {
            JSON.stringify(doc);
          } catch (error) {
            if (error.message.includes('UTF') || error.message.includes('Invalid')) {
              utf8Errors.push({
                _id: id.toString(),
                error: error.message,
                email: doc.email || 'N/A',
                name: doc.name || 'N/A'
              });
            }
          }
        }
      } catch (error) {
        // Already handled above
      }
    }

    return res.status(200).json({
      summary: {
        totalFound: allUsers.length,
        validUsers: validUsers.length,
        corruptedUsers: corruptedUsers.length,
        utf8Errors: utf8Errors.length
      },
      corruptedUsers,
      utf8Errors,
      validUsers: validUsers.slice(0, 10), // Show first 10 valid users as sample
      message: corruptedUsers.length > 0 
        ? `Found ${corruptedUsers.length} corrupted user(s) with role school_manager.`
        : 'No corrupted users found, but UTF-8 errors may exist.'
    });
  } catch (error) {
    console.error('Error finding corrupted users:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la recherche d\'utilisateurs corrompus.',
      error: error.message 
    });
  }
}
