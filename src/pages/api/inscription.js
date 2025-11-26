import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
import Campaign from '../../models/Campaign';
import Store from '../../models/Store';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '../../utils/gmailMailer';
import crypto from 'crypto';
import { generateSlug } from '../../utils/slugHelpers';


// Sanitize function to handle special characters
const sanitizeString = (str) => {
  return str ? str.normalize('NFC').trim() : str;
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await dbConnect();

      // Destructure and sanitize the fields from the request body
      // Simplified registration: only name (prénom), email, password required
      const { name, email, password, parentInfo, campaignId, token } = req.body;

      // Validate required fields (simplified: only email, name, password)
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Email, prénom et mot de passe sont requis' });
      }

      const sanitizedName = sanitizeString(name);
      const sanitizedEmail = sanitizeString(email).toLowerCase();

      // Hash the password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Generate a verification token (for optional/deferred verification)
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // Token valid for 7 days (longer for deferred verification)

      // Create the new user object with sanitized data
      // parentInfo is now optional - will be completed later if needed
      const user = new User({
        name: sanitizedName,
        email: sanitizedEmail,
        password: hashedPassword,
        role: 'student',
        verificationToken: verificationToken,
        verificationTokenExpires: verificationTokenExpires,
        emailVerified: false, // Will be verified later (deferred)
        // parentInfo is optional - only include if provided
        ...(parentInfo ? {
          parentInfo: {
            nomParent: parentInfo.nomParent ? sanitizeString(parentInfo.nomParent) : undefined,
            prenomParent: parentInfo.prenomParent ? sanitizeString(parentInfo.prenomParent) : undefined,
            telephone: parentInfo.telephone ? sanitizeString(parentInfo.telephone) : undefined,
            adresse: parentInfo.adresse ? sanitizeString(parentInfo.adresse) : undefined,
            app: parentInfo.app ? sanitizeString(parentInfo.app) : undefined,
            ville: parentInfo.ville ? sanitizeString(parentInfo.ville) : undefined,
            province: parentInfo.province ? sanitizeString(parentInfo.province) : undefined,
            codePostal: parentInfo.codePostal ? sanitizeString(parentInfo.codePostal) : undefined,
          }
        } : {})
      });

      // Save the user in the database
      await user.save();

      // Auto-join campaign if campaignId and token are provided
      let joinedCampaign = null;
      if (campaignId && token) {
        try {
          // Validate token
          const campaign = await Campaign.findById(campaignId);
          if (campaign) {
            const joinToken = campaign.joinTokens?.find(
              t => t.token === token && new Date(t.expiresAt) > new Date()
            );

            if (joinToken && ['pending_approval', 'approved', 'active'].includes(campaign.status)) {
              // Determine groupId - use provided groupId from request body, or default to "Autre" if groups enabled
              let finalGroupId = null;
              if (campaign.groups && campaign.groups.enabled) {
                const validGroups = campaign.groups.list.map(g => g.name);
                // Check if groupId was provided in request body (from sessionStorage)
                const providedGroupId = req.body.groupId;
                if (providedGroupId && validGroups.includes(providedGroupId)) {
                  finalGroupId = providedGroupId;
                } else {
                  // Default to "Autre" if groups enabled but invalid/no groupId provided
                  finalGroupId = validGroups.includes('Autre') ? 'Autre' : (validGroups[0] || null);
                }
              }

              // Add campaign to user's campaigns array
              const campaignEntry = {
                campaignId: campaign._id,
                schoolId: campaign.school,
                groupId: finalGroupId,
                joinedAt: new Date(),
                objectifPersonnel: 1000, // Default objective
                isActive: true
              };

              user.campaigns = user.campaigns || [];
              user.campaigns.push(campaignEntry);
              user.activeCampaignId = campaign._id;

              // Mark token as used - find the token in the array and update it
              const tokenIndex = campaign.joinTokens.findIndex(t => t.token === token);
              if (tokenIndex !== -1) {
                if (!campaign.joinTokens[tokenIndex].usedBy) {
                  campaign.joinTokens[tokenIndex].usedBy = [];
                }
                campaign.joinTokens[tokenIndex].usedBy.push(user._id);
                await campaign.save();
              }

              await user.save();

              // Create a store for this user and campaign
              let store = await Store.findOne({ user: user._id, campaignId: campaign._id });
              if (!store) {
                const baseSlug = generateSlug(user.name);
                let slug = baseSlug;
                let counter = 1;

                while (await Store.findOne({ slug, _id: { $ne: store?._id } })) {
                  slug = `${baseSlug}-${counter}`;
                  counter++;
                }

                store = new Store({
                  user: user._id,
                  campaignId: campaign._id,
                  name: `Campagne de ${user.name}`,
                  description: "🎉 Profitez de nos produits exclusifs ainsi que d'un choix de délicieuses tartes pour les fêtes ! Économisez plus en achetant plus : 5 % de rabais dès 6 produits. Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et récupérez facilement vos produits. 🙏 Merci pour votre générosité !",
                  autoDeposit: false,
                  discountEnabled: true,
                  slug: slug
                });

                await store.save();
              }

              joinedCampaign = {
                _id: campaign._id.toString(),
                campaignCode: campaign.campaignCode,
                name: campaign.name
              };
            }
          }
        } catch (error) {
          console.error('Error auto-joining campaign:', error);
          // Don't fail registration if campaign join fails
        }
      }

      // Deferred email verification: send a welcome email with verification link
      // but don't block the user from logging in immediately
      const verificationUrl = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${verificationToken}`;

      // Send welcome email asynchronously (non-blocking)
      // Use the user's name since parentInfo may not be provided
      sendVerificationEmail({
        to: sanitizedEmail,
        subject: `Bienvenue ${sanitizedName} - Jappuie`,
        firstName: sanitizedName,
        verificationUrl,
      }).catch(err => {
        // Log error but don't fail registration
        console.error('Failed to send welcome email:', err);
      });

      // Respond with a success message and campaign info if joined
      // User can now login immediately without waiting for email verification
      res.status(201).json({
        message: 'Utilisateur créé avec succès',
        joinedCampaign: joinedCampaign,
        canLoginImmediately: true // Flag to indicate immediate login is allowed
      });
    } catch (error) {
      console.error('Error during registration:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);

      // Check if it's a duplicate email error
      if (error.code === 11000 && error.keyPattern?.email) {
        res.status(400).json({
          message: 'Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter ou utiliser une autre adresse e-mail.',
          code: 'DUPLICATE_EMAIL'
        });
      } else {
        res.status(400).json({
          message: 'Erreur lors de l\'inscription',
          error: error.message,
          details: error.errors || 'No additional details'
        });
      }
    }
  } else {
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}


