import dbConnect from '@/lib/mongodb';
import ManagerInvitation from '@/models/ManagerInvitation';
import School from '@/models/School';
import User from '@/models/User';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Token requis' });
    }

    // Find invitation
    const invitation = await ManagerInvitation.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('school', 'name').populate('invitedBy', 'name');

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation non trouvée ou expirée' });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: invitation.email });

    res.status(200).json({
      invitation: {
        id: invitation._id,
        schoolName: invitation.school.name,
        inviterName: invitation.invitedBy.name,
        role: invitation.role,
        email: invitation.email,
        expiresAt: invitation.expiresAt
      },
      userExists: !!existingUser
    });

  } catch (error) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
