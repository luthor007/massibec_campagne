// pages/api/admin/fix-corrupted-users.js
// Fixes corrupted user documents in the database

import connectDB from '../../../lib/mongodb';
import mongoose from 'mongoose';
import User from '../../../models/User';

export default async function handler(req, res) {
  // Only allow in development or with a secret key
  if (process.env.NODE_ENV === 'production' && req.query.secret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (req.method !== 'POST') {
    return res.setHeader('Allow', ['POST']).status(405).end(`Méthode ${req.method} non autorisée.`);
  }

  const { userId, fixAll, dryRun } = req.body;

  try {
    await connectDB();

    const collection = mongoose.connection.db.collection('users');
    const results = {
      fixed: [],
      failed: [],
      deleted: []
    };

    // If userId is provided, fix only that user
    // If fixAll is true, fix all corrupted users
    let userIdsToFix = [];

    if (userId) {
      userIdsToFix = [new mongoose.Types.ObjectId(userId)];
    } else if (fixAll) {
      // Get all corrupted user IDs
      const allIds = await collection.distinct('_id', { role: 'school_manager' });
      
      // Test each one to see if it's corrupted
      for (const id of allIds) {
        try {
          const doc = await collection.findOne({ _id: id });
          if (doc) {
            const user = new User(doc);
            await user.validate();
            // This one is valid, skip it
          }
        } catch (error) {
          // This one is corrupted, add it to the list
          userIdsToFix.push(id);
        }
      }
    } else {
      return res.status(400).json({ 
        message: 'Either userId or fixAll must be provided.' 
      });
    }

    // Fix each user
    for (const id of userIdsToFix) {
      try {
        const doc = await collection.findOne({ _id: id });
        
        if (!doc) {
          results.failed.push({
            _id: id.toString(),
            error: 'Document not found'
          });
          continue;
        }

        // Try to validate to see what's wrong
        let validationError = null;
        try {
          const user = new User(doc);
          await user.validate();
          // If validation passes, this user is not corrupted (anymore)
          continue;
        } catch (error) {
          validationError = error;
        }

        // Check if it's a UTF-8 error
        if (validationError?.message?.includes('UTF') || validationError?.name === 'BSONError') {
          // This is a UTF-8 corruption - try to extract what we can
          console.log(`Attempting to fix UTF-8 corrupted user: ${id}`);
          
          if (dryRun) {
            results.failed.push({
              _id: id.toString(),
              error: 'UTF-8 corruption detected - would need manual deletion',
              type: 'utf8_corruption'
            });
            continue;
          }

          // For UTF-8 corruption, we can't safely fix it
          // We need to delete it (but we can try to extract some info first)
          let extractedInfo = {};
          try {
            // Try to extract basic fields using raw MongoDB operations
            const rawDoc = await collection.findOne({ _id: id }, { 
              projection: { 
                email: 1, 
                name: 1, 
                role: 1,
                'schoolManagerInfo.organisme': 1
              } 
            });
            
            if (rawDoc) {
              extractedInfo = {
                email: rawDoc.email || 'unknown',
                name: rawDoc.name || 'unknown',
                organismeId: rawDoc.schoolManagerInfo?.organisme?.toString() || 'unknown'
              };
            }
          } catch (e) {
            // Can't extract anything
          }

          // Delete the corrupted document
          await collection.deleteOne({ _id: id });
          
          results.deleted.push({
            _id: id.toString(),
            extractedInfo,
            reason: 'UTF-8 corruption - document deleted'
          });
          
          continue;
        }

        // It's a validation error - fix missing fields
        const updates = {};
        let needsUpdate = false;

        // Check and fix schoolManagerInfo fields
        if (!doc.schoolManagerInfo) {
          doc.schoolManagerInfo = {};
          needsUpdate = true;
        }

        // Fix missing codePostal
        if (!doc.schoolManagerInfo.codePostal || doc.schoolManagerInfo.codePostal === '') {
          doc.schoolManagerInfo.codePostal = 'À compléter';
          needsUpdate = true;
        }

        // Fix missing momentPourJoindre
        if (!doc.schoolManagerInfo.momentPourJoindre || doc.schoolManagerInfo.momentPourJoindre === '') {
          doc.schoolManagerInfo.momentPourJoindre = 'À compléter';
          needsUpdate = true;
        }

        // Ensure other required fields exist
        if (!doc.schoolManagerInfo.titreOuFonction) {
          doc.schoolManagerInfo.titreOuFonction = doc.schoolManagerInfo.titreOuFonction || 'À compléter';
          needsUpdate = true;
        }

        if (!doc.schoolManagerInfo.ville) {
          doc.schoolManagerInfo.ville = doc.schoolManagerInfo.ville || 'À compléter';
          needsUpdate = true;
        }

        if (!doc.schoolManagerInfo.telephone) {
          doc.schoolManagerInfo.telephone = doc.schoolManagerInfo.telephone || 'À compléter';
          needsUpdate = true;
        }

        if (needsUpdate) {
          if (dryRun) {
            results.fixed.push({
              _id: id.toString(),
              email: doc.email || 'N/A',
              name: doc.name || 'N/A',
              wouldFix: {
                codePostal: doc.schoolManagerInfo.codePostal,
                momentPourJoindre: doc.schoolManagerInfo.momentPourJoindre
              },
              dryRun: true
            });
          } else {
            // Use MongoDB update directly (bypass Mongoose validation)
            // This ensures we can update even if Mongoose validation fails
            const updateResult = await collection.updateOne(
              { _id: id },
              { 
                $set: { 
                  'schoolManagerInfo.codePostal': doc.schoolManagerInfo.codePostal,
                  'schoolManagerInfo.momentPourJoindre': doc.schoolManagerInfo.momentPourJoindre,
                  // Ensure other required fields exist too
                  'schoolManagerInfo.titreOuFonction': doc.schoolManagerInfo.titreOuFonction || 'À compléter',
                  'schoolManagerInfo.ville': doc.schoolManagerInfo.ville || 'À compléter',
                  'schoolManagerInfo.telephone': doc.schoolManagerInfo.telephone || 'À compléter'
                } 
              }
            );

            if (updateResult.modifiedCount === 0) {
              results.failed.push({
                _id: id.toString(),
                error: 'Update did not modify any documents',
                updateResult
              });
              continue;
            }

            // Verify it's fixed by trying to validate
            try {
              const fixedDoc = await collection.findOne({ _id: id });
              if (!fixedDoc) {
                throw new Error('Document not found after update');
              }
              
              const fixedUser = new User(fixedDoc);
              await fixedUser.validate();

              results.fixed.push({
                _id: id.toString(),
                email: fixedDoc.email || 'N/A',
                name: fixedDoc.name || 'N/A',
                fixed: {
                  codePostal: fixedDoc.schoolManagerInfo.codePostal,
                  momentPourJoindre: fixedDoc.schoolManagerInfo.momentPourJoindre
                },
                verified: true
              });
            } catch (verifyError) {
              // Update succeeded but validation still fails
              results.fixed.push({
                _id: id.toString(),
                email: doc.email || 'N/A',
                name: doc.name || 'N/A',
                fixed: {
                  codePostal: doc.schoolManagerInfo.codePostal,
                  momentPourJoindre: doc.schoolManagerInfo.momentPourJoindre
                },
                verified: false,
                warning: 'Update succeeded but validation still fails: ' + verifyError.message
              });
            }
          }
        } else {
          results.failed.push({
            _id: id.toString(),
            error: 'No fixes needed but validation still fails',
            validationError: validationError.message
          });
        }
      } catch (error) {
        results.failed.push({
          _id: id.toString(),
          error: error.message,
          errorType: error.name
        });
      }
    }

    return res.status(200).json({
      message: dryRun 
        ? 'Dry run completed. No changes made.' 
        : 'Fix operation completed.',
      summary: {
        total: userIdsToFix.length,
        fixed: results.fixed.length,
        deleted: results.deleted.length,
        failed: results.failed.length
      },
      results,
      dryRun
    });
  } catch (error) {
    console.error('Error fixing corrupted users:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la réparation des utilisateurs corrompus.',
      error: error.message 
    });
  }
}
