// pages/api/admin/delete-corrupted-user.js
// Deletes a corrupted user document that cannot be read

import connectDB from '../../../lib/mongodb';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  // Only allow in development or with a secret key
  if (process.env.NODE_ENV === 'production' && req.query.secret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (req.method !== 'POST') {
    return res.setHeader('Allow', ['POST']).status(405).end(`Méthode ${req.method} non autorisée.`);
  }

  const { userId, confirm } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID requis.' });
  }

  try {
    await connectDB();

    const collection = mongoose.connection.db.collection('users');
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // If not confirmed, just check if the ID exists
    if (!confirm) {
      // Try to check if the ID exists in the collection
      try {
        const count = await collection.countDocuments({ _id: userObjectId });
        return res.status(200).json({
          message: 'Vérification terminée. Envoyez confirm: true pour supprimer.',
          userId: userId,
          exists: count > 0,
          warning: '⚠️ Cette action est irréversible. Le document sera supprimé même s\'il est corrompu.'
        });
      } catch (error) {
        return res.status(500).json({
          message: 'Erreur lors de la vérification',
          error: error.message
        });
      }
    }

    // Try to delete directly using MongoDB driver (bypasses Mongoose validation)
    console.log(`🗑️ Attempting to delete corrupted user: ${userId}`);

    // First, try to get any info we can before deletion
    let extractedInfo = {};
    try {
      // Try to get just the _id to confirm it exists
      const exists = await collection.findOne(
        { _id: userObjectId },
        { projection: { _id: 1 } }
      );
      if (exists) {
        extractedInfo.exists = true;
      }
    } catch (e) {
      // Can't read it, but we'll still try to delete
      extractedInfo.exists = 'unknown';
      extractedInfo.readError = e.message;
    }

    // Delete the document directly
    const deleteResult = await collection.deleteOne({ _id: userObjectId });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        message: 'Document non trouvé ou déjà supprimé.',
        userId: userId,
        deleteResult
      });
    }

    console.log(`✅ Deleted corrupted user: ${userId}`);

    // Also check and clean up related data
    const cleanupResults = {
      schoolManagers: 0,
      managerInvitations: 0,
      campaigns: 0
    };

    try {
      // Clean up SchoolManager records
      const SchoolManager = mongoose.connection.db.collection('schoolmanagers');
      const schoolManagerResult = await SchoolManager.deleteMany({ user: userObjectId });
      cleanupResults.schoolManagers = schoolManagerResult.deletedCount;

      // Clean up ManagerInvitation records
      const ManagerInvitation = mongoose.connection.db.collection('managerinvitations');
      const invitationResult = await ManagerInvitation.deleteMany({ 
        $or: [
          { invitedBy: userObjectId },
          { email: extractedInfo.email } // If we have email
        ]
      });
      cleanupResults.managerInvitations = invitationResult.deletedCount;
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
      // Continue - the main deletion succeeded
    }

    return res.status(200).json({
      message: 'Utilisateur corrompu supprimé avec succès.',
      userId: userId,
      deleted: true,
      extractedInfo,
      cleanupResults,
      deleteResult
    });
  } catch (error) {
    console.error('Error deleting corrupted user:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la suppression de l\'utilisateur corrompu.',
      error: error.message 
    });
  }
}
