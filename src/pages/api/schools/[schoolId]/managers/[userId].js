import dbConnect from '@/lib/mongodb';
import SchoolManager from '@/models/SchoolManager';
import School from '@/models/School';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { schoolId, userId } = req.query;

    // Check if requester is owner of this school
    const requesterManager = await SchoolManager.findOne({
      school: schoolId,
      user: token.sub,
      status: 'active'
    });

    if (!requesterManager || requesterManager.role !== 'owner') {
      return res.status(403).json({ message: 'Seuls les propriétaires peuvent supprimer des gestionnaires' });
    }

    // Check if trying to remove self
    if (userId === token.sub) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous supprimer vous-même' });
    }

    // Find the manager to remove
    const managerToRemove = await SchoolManager.findOne({
      school: schoolId,
      user: userId,
      status: 'active'
    });

    if (!managerToRemove) {
      return res.status(404).json({ message: 'Gestionnaire non trouvé' });
    }

    // Check if this is the last owner
    if (managerToRemove.role === 'owner') {
      const ownerCount = await SchoolManager.countDocuments({
        school: schoolId,
        role: 'owner',
        status: 'active'
      });

      if (ownerCount <= 1) {
        return res.status(400).json({ message: 'Impossible de supprimer le dernier propriétaire' });
      }
    }

    // Update status to removed instead of deleting
    managerToRemove.status = 'removed';
    await managerToRemove.save();

    // Get user details for response
    const user = await User.findById(userId);

    res.status(200).json({
      message: 'Gestionnaire supprimé avec succès',
      removedManager: {
        id: managerToRemove._id,
        name: user.name,
        email: user.email,
        role: managerToRemove.role
      }
    });

  } catch (error) {
    console.error('Error removing manager:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
