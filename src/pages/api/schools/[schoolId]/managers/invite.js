import dbConnect from '@/lib/mongodb';
import SchoolManager from '@/models/SchoolManager';
import ManagerInvitation from '@/models/ManagerInvitation';
import School from '@/models/School';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';
import { sendManagerInvitationEmail } from '@/utils/emails/managerInvitationEmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { schoolId } = req.query;
    const { email, role } = req.body;

    // Validate input
    if (!email || !role) {
      return res.status(400).json({ message: 'Email et rôle requis' });
    }

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Format d\'email invalide' });
    }

    // Get the inviting user
    const invitingUser = await User.findById(token.sub);
    if (!invitingUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Check if user is a manager of this school
    let schoolManager = await SchoolManager.findOne({
      school: schoolId,
      user: token.sub,
      status: 'active'
    });

    if (!schoolManager) {
      // If no SchoolManager record exists, check if user is the original school manager
      const user = await User.findById(token.sub);
      if (!user || user.role !== 'school_manager') {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à gérer cette école' });
      }
      
      // Check if this user is associated with this school
      const schoolIdFromUser = user.schoolManagerInfo?.organisme;
      if (schoolIdFromUser?.toString() !== schoolId) {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à gérer cette école' });
      }
      
      // For backward compatibility, treat as owner
      schoolManager = { role: 'owner' };
    }

    // Check if user can invite managers
    if (!['owner', 'admin'].includes(schoolManager.role)) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à inviter des gestionnaires' });
    }

    // Get school details
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    // Check if email is already a manager
    const existingManager = await SchoolManager.findOne({
      school: schoolId,
      user: { $in: await User.find({ email: email.toLowerCase() }).select('_id') },
      status: 'active'
    });

    if (existingManager) {
      return res.status(400).json({ message: 'Cette personne est déjà gestionnaire de cette école' });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await ManagerInvitation.findOne({
      school: schoolId,
      email: email.toLowerCase(),
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvitation) {
      return res.status(400).json({ message: 'Une invitation est déjà en attente pour cette adresse email' });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Create invitation
    const invitation = new ManagerInvitation({
      school: schoolId,
      email: email.toLowerCase(),
      role,
      invitedBy: token.sub,
      token: invitationToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await invitation.save();

    // Send invitation email
    const invitationUrl = `${process.env.NEXTAUTH_URL}/managers/accept-invitation?token=${invitationToken}`;
    
    try {
      await sendManagerInvitationEmail({
        to: email,
        schoolName: school.name,
        inviterName: invitingUser.name,
        role: role === 'admin' ? 'Administrateur' : 'Membre',
        invitationUrl,
        expiresIn: '7 jours'
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    res.status(201).json({
      message: 'Invitation envoyée avec succès',
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      }
    });

  } catch (error) {
    console.error('Error creating manager invitation:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
