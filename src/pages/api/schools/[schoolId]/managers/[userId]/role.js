import dbConnect from '@/lib/mongodb';
import SchoolManager from '@/models/SchoolManager';
import School from '@/models/School';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { schoolId, userId } = req.query;
    const { role } = req.body;

    console.log('Role update request:', { schoolId, userId, role, body: req.body });

    // Validate role
    if (!role || !['owner', 'admin', 'member'].includes(role)) {
      console.error('Invalid role:', role);
      return res.status(400).json({ message: `Rôle invalide: ${role}. Les rôles valides sont: owner, admin, member` });
    }

    // Check if requester is owner of this school
    let requesterManager = await SchoolManager.findOne({
      school: schoolId,
      user: token.sub,
      status: 'active'
    });

    // If no SchoolManager record exists, check if user is the original school manager (backward compatibility)
    if (!requesterManager) {
      const user = await User.findById(token.sub);
      if (!user || user.role !== 'school_manager') {
        return res.status(403).json({ message: 'Seuls les propriétaires peuvent modifier les rôles' });
      }
      
      // Check if this user is associated with this school
      const schoolIdFromUser = user.schoolManagerInfo?.organisme;
      if (schoolIdFromUser?.toString() !== schoolId) {
        return res.status(403).json({ message: 'Seuls les propriétaires peuvent modifier les rôles' });
      }
      
      // For backward compatibility, treat original school managers as owners
      requesterManager = { role: 'owner' };
    }

    if (requesterManager.role !== 'owner') {
      return res.status(403).json({ message: 'Seuls les propriétaires peuvent modifier les rôles' });
    }

    // Find the manager to update
    let managerToUpdate = await SchoolManager.findOne({
      school: schoolId,
      user: userId,
      status: 'active'
    });

    // If no SchoolManager record exists, check if user is the original school manager (backward compatibility)
    if (!managerToUpdate) {
      const userToUpdate = await User.findById(userId);
      if (!userToUpdate || userToUpdate.role !== 'school_manager') {
        return res.status(404).json({ message: 'Gestionnaire non trouvé' });
      }
      
      // Check if this user is associated with this school
      const schoolIdFromUser = userToUpdate.schoolManagerInfo?.organisme;
      if (schoolIdFromUser?.toString() !== schoolId) {
        return res.status(404).json({ message: 'Gestionnaire non trouvé pour cette école' });
      }
      
      // Create a SchoolManager record for backward compatibility
      managerToUpdate = new SchoolManager({
        school: schoolId,
        user: userId,
        role: 'owner', // Default original managers to owner
        invitedBy: userId,
        status: 'active',
        joinedAt: new Date()
      });
      await managerToUpdate.save();
    }

    // Check if trying to demote the last owner
    if (managerToUpdate.role === 'owner' && role !== 'owner') {
      const ownerCount = await SchoolManager.countDocuments({
        school: schoolId,
        role: 'owner',
        status: 'active'
      });

      console.log('Owner count check:', { ownerCount, currentRole: managerToUpdate.role, newRole: role });

      if (ownerCount <= 1) {
        console.error('Cannot demote last owner');
        return res.status(400).json({ message: 'Impossible de rétrograder le dernier propriétaire. Veuillez promouvoir un autre utilisateur au rôle de propriétaire d\'abord.' });
      }
    }

    // Update the role
    const oldRole = managerToUpdate.role;
    managerToUpdate.role = role;
    await managerToUpdate.save();

    // Get user details for response
    const user = await User.findById(userId);

    res.status(200).json({
      message: 'Rôle modifié avec succès',
      updatedManager: {
        id: managerToUpdate._id,
        name: user.name,
        email: user.email,
        oldRole,
        newRole: role
      }
    });

  } catch (error) {
    console.error('Error updating manager role:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
