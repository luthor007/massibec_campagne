import dbConnect from '@/lib/mongodb';
import ManagerInvitation from '@/models/ManagerInvitation';
import SchoolManager from '@/models/SchoolManager';
import School from '@/models/School';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    const { token } = req.query;
    const { name, password, acceptWithExistingAccount } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token requis' });
    }

    // Find invitation
    const invitation = await ManagerInvitation.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('school').populate('invitedBy');

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation non trouvée ou expirée' });
    }

    let user;

    if (acceptWithExistingAccount) {
      // User wants to accept with existing account
      if (!password) {
        return res.status(400).json({ message: 'Mot de passe requis pour accepter avec un compte existant' });
      }

      // Find existing user
      user = await User.findOne({ email: invitation.email });
      if (!user) {
        return res.status(404).json({ message: 'Aucun compte trouvé avec cette adresse email' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Mot de passe incorrect' });
      }

      // If user is a student, convert to school_manager
      if (user.role === 'student') {
        console.log(`Converting student account ${user._id} to school_manager for school ${invitation.school._id}`);
        
        // Initialize schoolManagerInfo FIRST (before changing role) to ensure all required fields are set
        // If it already exists (shouldn't happen for students, but be safe), preserve it
        if (!user.schoolManagerInfo || !user.schoolManagerInfo.organisme) {
          user.schoolManagerInfo = {
            titreOuFonction: user.schoolManagerInfo?.titreOuFonction || 'À compléter',
            organisme: invitation.school._id,
            ville: user.schoolManagerInfo?.ville || invitation.school.ville || 'À compléter',
            codePostal: user.schoolManagerInfo?.codePostal || invitation.school.codePostal || 'À compléter',
            telephone: user.schoolManagerInfo?.telephone || user.parentInfo?.telephone || 'À compléter',
            cellulaire: user.schoolManagerInfo?.cellulaire || 'À compléter',
            momentPourJoindre: user.schoolManagerInfo?.momentPourJoindre || 'À compléter'
          };
        } else {
          // If schoolManagerInfo exists, we're adding them to another school
          // Keep existing info but ensure organisme is set (use the invitation school if not set)
          if (!user.schoolManagerInfo.organisme) {
            user.schoolManagerInfo.organisme = invitation.school._id;
          }
        }
        
        // Verify all required fields are set before changing role
        if (!user.schoolManagerInfo.titreOuFonction || !user.schoolManagerInfo.organisme) {
          console.error('Failed to initialize required schoolManagerInfo fields');
          return res.status(500).json({ message: 'Erreur lors de la conversion du compte' });
        }
        
        // Now convert role to school_manager (after schoolManagerInfo is set)
        user.role = 'school_manager';
        
        // Mark email as verified since they already had an account
        user.emailVerified = true;
        
        // Save the updated user
        try {
          await user.save();
          console.log(`Successfully converted student account to school_manager`);
        } catch (saveError) {
          console.error('Error saving converted user:', saveError);
          // If validation fails, revert the role change
          user.role = 'student';
          throw saveError;
        }
      } else if (user.role === 'school_manager') {
        // User is already a school_manager, they're just being added to another school
        // Ensure schoolManagerInfo.organisme is set (use invitation school if not set)
        if (!user.schoolManagerInfo || !user.schoolManagerInfo.organisme) {
          user.schoolManagerInfo = {
            titreOuFonction: user.schoolManagerInfo?.titreOuFonction || 'À compléter',
            organisme: invitation.school._id,
            ville: user.schoolManagerInfo?.ville || invitation.school.ville || 'À compléter',
            codePostal: user.schoolManagerInfo?.codePostal || invitation.school.codePostal || 'À compléter',
            telephone: user.schoolManagerInfo?.telephone || 'À compléter',
            cellulaire: user.schoolManagerInfo?.cellulaire || 'À compléter',
            momentPourJoindre: user.schoolManagerInfo?.momentPourJoindre || 'À compléter'
          };
          await user.save();
        }
        // If they already have a complete schoolManagerInfo, we don't need to modify it
        // They can manage multiple schools
      }
    } else {
      // Create new user account
      if (!name || !password) {
        return res.status(400).json({ message: 'Nom et mot de passe requis pour créer un compte' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: invitation.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Un compte existe déjà avec cette adresse email' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      user = new User({
        name: name.trim(),
        email: invitation.email.toLowerCase(),
        password: hashedPassword,
        role: 'school_manager',
        emailVerified: true, // Skip email verification for invited users
        schoolManagerInfo: {
          titreOuFonction: 'À compléter',
          organisme: invitation.school._id,
          ville: 'À compléter',
          codePostal: 'À compléter',
          telephone: 'À compléter',
          momentPourJoindre: 'À compléter'
        }
      });

      await user.save();
    }

    // Check if user is already a manager of this school
    const existingManager = await SchoolManager.findOne({
      school: invitation.school._id,
      user: user._id,
      status: 'active'
    });

    if (existingManager) {
      return res.status(400).json({ message: 'Vous êtes déjà gestionnaire de cette école' });
    }

    // Create SchoolManager relationship
    const schoolManager = new SchoolManager({
      school: invitation.school._id,
      user: user._id,
      role: invitation.role,
      invitedBy: invitation.invitedBy._id,
      invitedAt: invitation.createdAt,
      joinedAt: new Date(),
      status: 'active'
    });

    await schoolManager.save();

    // Mark invitation as accepted
    invitation.status = 'accepted';
    await invitation.save();

    // Generate temporary login token for auto-login
    const loginToken = crypto.randomBytes(32).toString('hex');
    const loginTokenExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

    user.loginToken = loginToken;
    user.loginTokenExpires = loginTokenExpires;
    user.loginTokenUsed = 0;
    await user.save();

    res.status(200).json({
      message: 'Invitation acceptée avec succès',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      school: {
        id: invitation.school._id,
        name: invitation.school.name
      },
      loginToken,
      loginTokenExpires
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
