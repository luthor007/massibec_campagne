// src/pages/api/verify-email.js

import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import FunnelEvent from '../../models/FunnelEvent';
import crypto from 'crypto';

// Helper function to track funnel events server-side
async function trackFunnelEventServer(eventType, userType, userId, metadata = {}) {
  try {
    // Generate a session ID from timestamp and random string
    const sessionId = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    const funnelEvent = new FunnelEvent({
      eventType,
      userType,
      userId: userId || null,
      sessionId,
      metadata
    });

    await funnelEvent.save();
  } catch (error) {
    console.error('Error tracking funnel event server-side:', error);
    // Don't throw - tracking failures shouldn't break the main flow
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();

      const { token } = req.query;

      if (!token) {
        return res.redirect(`${process.env.NEXTAUTH_URL}/email-verification-error`);
      }

      // Track email verification clicked
      // We'll track this before finding the user to capture all clicks
      await trackFunnelEventServer('email_verification_clicked', 'anonymous', null, { token });

      // Find the user with the matching verification token and ensure the token hasn't expired
      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.redirect(`${process.env.NEXTAUTH_URL}/email-verification-error`);
      }

      // Determine user type
      const userType = user.role === 'student' ? 'student' : 'school';

      // Update the user's emailVerified status and remove the verification token
      user.emailVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();

      // Track email verified (use school-specific event for school managers)
      const eventType = user.role === 'school_manager' ? 'school_email_verified' : 'email_verified';
      await trackFunnelEventServer(eventType, userType, user._id.toString(), {
        email: user.email
      });

      // Generate a temporary login token for automatic sign-in
      const loginToken = crypto.randomBytes(32).toString('hex');
      const loginTokenExpires = Date.now() + 5 * 60 * 1000; // Valid for 5 minutes

      // Store the login token in the user record temporarily
      user.loginToken = loginToken;
      user.loginTokenExpires = loginTokenExpires;
      user.loginTokenUsed = 0; // Initialize use counter
      await user.save();

      // Redirect to email-verified page with the login token and user name
      const userName = encodeURIComponent(user.name);
      res.redirect(`${process.env.NEXTAUTH_URL}/email-verified?token=${loginToken}&userId=${user._id}&name=${userName}`);
    } catch (error) {
      console.error('Error during email verification:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  } else {
    res.status(405).json({ message: 'Méthode non autorisée.' });
  }
}