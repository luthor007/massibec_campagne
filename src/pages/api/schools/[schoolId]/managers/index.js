import dbConnect from '@/lib/mongodb';
import SchoolManager from '@/models/SchoolManager';
import School from '@/models/School';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { schoolId } = req.query;

    // Check if user is a manager of this school
    const userManager = await SchoolManager.findOne({
      school: schoolId,
      user: token.sub,
      status: 'active'
    });

    if (!userManager) {
      // If no SchoolManager record exists, check if user is the original school manager
      const user = await User.findById(token.sub);
      if (!user || user.role !== 'school_manager') {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à voir les gestionnaires de cette école' });
      }
      
      // Check if this user is associated with this school
      const schoolIdFromUser = user.schoolManagerInfo?.organisme;
      if (schoolIdFromUser?.toString() !== schoolId) {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à voir les gestionnaires de cette école' });
      }
      
      // Create a temporary SchoolManager record for backward compatibility
      const tempManager = {
        role: 'owner', // Default to owner for existing managers
        _id: user._id
      };
      
      // Get all managers for this school
      const managers = await SchoolManager.find({
        school: schoolId,
        status: 'active'
      })
      .populate('user', 'name email')
      .populate('invitedBy', 'name')
      .sort({ joinedAt: 1 });

      // Format response
      const formattedManagers = managers.map(manager => ({
        id: manager._id,
        userId: manager.user._id,
        name: manager.user.name,
        email: manager.user.email,
        role: manager.role,
        invitedBy: manager.invitedBy.name,
        joinedAt: manager.joinedAt,
        isCurrentUser: manager.user._id.toString() === token.sub
      }));

      res.status(200).json({
        managers: formattedManagers,
        currentUserRole: 'owner'
      });
      return;
    }

    // Get all managers for this school
    const managers = await SchoolManager.find({
      school: schoolId,
      status: 'active'
    })
    .populate('user', 'name email')
    .populate('invitedBy', 'name')
    .sort({ joinedAt: 1 });

    // Format response
    const formattedManagers = managers.map(manager => ({
      id: manager._id,
      userId: manager.user._id,
      name: manager.user.name,
      email: manager.user.email,
      role: manager.role,
      invitedBy: manager.invitedBy.name,
      joinedAt: manager.joinedAt,
      isCurrentUser: manager.user._id.toString() === token.sub
    }));

    res.status(200).json({
      managers: formattedManagers,
      currentUserRole: userManager.role
    });

  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
