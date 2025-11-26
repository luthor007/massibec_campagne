import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import FunnelEvent from '../../../models/FunnelEvent';
import crypto from 'crypto';

// Helper function to track funnel events server-side
async function trackFunnelEventServer(eventType, userType, userId, metadata = {}) {
  try {
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
  }
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  await dbConnect();

  try {
    const user = await User.findById(session.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (req.method === 'GET') {
      const type = req.query.type; // 'supplier' or undefined (default to student/school)

      // Handle supplier onboarding
      if (type === 'supplier' && (user.role === 'supplier' || user.role === 'fournisseur')) {
        const rawProgress = user.supplierOnboardingProgress || {};
        const validSteps = ['productCatalog', 'settings'];

        // Filter progress to only include valid steps (ignore old fields like companyInfo, paymentSetup)
        const progress = {};
        let needsAutoFix = false;
        validSteps.forEach(step => {
          const isStepComplete = rawProgress[step] === true;
          progress[step] = isStepComplete;
          if (rawProgress.completedAt && !isStepComplete) {
            needsAutoFix = true;
          }
        });
        // Keep completedAt if it exists
        if (rawProgress.completedAt) {
          progress.completedAt = rawProgress.completedAt;
        }

        const totalSteps = validSteps.length;
        let completedSteps = validSteps.filter(step => progress[step] === true).length;
        let isCompleted = completedSteps === totalSteps;

        // Auto-heal inconsistent states where completedAt exists but some steps are false
        if (needsAutoFix) {
          console.warn(`[Onboarding API GET] Detected completedAt with incomplete steps for ${user.email}. Auto-fixing progress.`);
          const updatePayload = {
            'supplierOnboardingProgress.completedAt': rawProgress.completedAt || new Date()
          };

          validSteps.forEach(step => {
            if (progress[step] !== true) {
              progress[step] = true;
              updatePayload[`supplierOnboardingProgress.${step}`] = true;
            }
          });

          try {
            await User.updateOne(
              { _id: user._id },
              { $set: updatePayload }
            );
          } catch (error) {
            console.error('[Onboarding API GET] Failed to auto-fix supplier onboarding progress:', error);
          }

          completedSteps = totalSteps;
          isCompleted = true;
        }

        console.log(`[Onboarding API GET] User: ${user.email}`);
        console.log(`[Onboarding API GET] Raw progress:`, JSON.stringify(rawProgress));
        console.log(`[Onboarding API GET] Filtered progress:`, JSON.stringify(progress));
        console.log(`[Onboarding API GET] Completed steps: ${completedSteps}/${totalSteps}, isCompleted: ${isCompleted}`);

        return res.status(200).json({
          progress,
          completedSteps,
          totalSteps,
          isCompleted,
          completionPercentage: Math.round((completedSteps / totalSteps) * 100)
        });
      }

      // Handle student/school onboarding (default)
      const progress = user.onboardingProgress || {};
      const totalSteps = 6;
      const completedSteps = Object.values(progress).filter(step => step === true).length;

      return res.status(200).json({
        progress,
        totalSteps,
        isCompleted: completedSteps === totalSteps,
        completionPercentage: Math.round((completedSteps / totalSteps) * 100)
      });
    }

    if (req.method === 'POST') {
      const { step, completed, type } = req.body;

      if (!step || typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'Étape et statut requis' });
      }

      // Handle supplier onboarding
      if (type === 'supplier' && (user.role === 'supplier' || user.role === 'fournisseur')) {
        const validSteps = ['productCatalog', 'settings'];

        if (!validSteps.includes(step)) {
          return res.status(400).json({ message: 'Étape invalide pour supplier' });
        }

        // Initialiser supplierOnboardingProgress si nécessaire
        if (!user.supplierOnboardingProgress) {
          user.supplierOnboardingProgress = {
            productCatalog: false,
            settings: false
          };
        }

        // Track onboarding step completion
        if (completed) {
          await trackFunnelEventServer('onboarding_step_completed', 'supplier', user._id.toString(), {
            step,
            userId: user._id.toString()
          });
        }

        // Mettre à jour l'étape - utiliser updateOne directement pour éviter les problèmes de Mongoose
        const mongoose = (await import('mongoose')).default;
        const db = mongoose.connection.db;

        console.log(`[Onboarding API] Updating step '${step}' to ${completed} for user ${user.email}`);

        // Récupérer le progress actuel
        const currentProgress = user.supplierOnboardingProgress || {};
        const updatedProgress = {
          ...currentProgress,
          [step]: completed
        };

        // Si toutes les étapes sont complétées, marquer la date de completion
        const allStepsCompleted = validSteps.every(s => updatedProgress[s] === true);
        console.log(`[Onboarding API] All steps completed: ${allStepsCompleted}`, validSteps.map(s => `${s}=${updatedProgress[s]}`));

        if (allStepsCompleted && !updatedProgress.completedAt) {
          updatedProgress.completedAt = new Date();

          // Track onboarding completion
          await trackFunnelEventServer('onboarding_completed', 'supplier', user._id.toString(), {
            userId: user._id.toString()
          });
        }

        // Utiliser updateOne directement pour forcer la sauvegarde
        const updateResult = await db.collection('users').updateOne(
          { _id: new mongoose.Types.ObjectId(user._id) },
          { $set: { supplierOnboardingProgress: updatedProgress } }
        );

        console.log(`[Onboarding API] Update result:`, {
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount
        });

        // Récupérer le document mis à jour pour vérifier
        const updatedUser = await db.collection('users').findOne(
          { _id: new mongoose.Types.ObjectId(user._id) }
        );

        console.log(`[Onboarding API] Progress after save:`, JSON.stringify(updatedUser.supplierOnboardingProgress));

        // Mettre à jour l'objet user pour la suite
        user.supplierOnboardingProgress = updatedProgress;

        const totalSteps = validSteps.length;
        const completedSteps = validSteps.filter(s => updatedProgress[s] === true).length;

        // Re-verify isCompleted after save
        const finalIsCompleted = validSteps.every(s => updatedProgress[s] === true);

        console.log(`[Onboarding API] Final response - isCompleted: ${finalIsCompleted}, completedSteps: ${completedSteps}/${totalSteps}, progress:`, JSON.stringify(updatedProgress));

        return res.status(200).json({
          message: 'Progression mise à jour',
          progress: updatedProgress,
          completedSteps,
          totalSteps,
          isCompleted: finalIsCompleted,
          completionPercentage: Math.round((completedSteps / totalSteps) * 100)
        });
      }

      // Handle student/school onboarding (default)
      const validSteps = [
        'joinedCampaign',
        'personalizedStore',
        'visitedStore',
        'viewedOrders',
        'viewedStats',
        'viewedTools'
      ];

      if (!validSteps.includes(step)) {
        return res.status(400).json({ message: 'Étape invalide' });
      }

      // Initialiser onboardingProgress si nécessaire
      if (!user.onboardingProgress) {
        user.onboardingProgress = {
          joinedCampaign: false,
          personalizedStore: false,
          visitedStore: false,
          viewedOrders: false,
          viewedStats: false,
          viewedTools: false
        };
      }

      // Track onboarding step completion
      if (completed) {
        const userType = user.role === 'student' ? 'student' : 'school';
        await trackFunnelEventServer('onboarding_step_completed', userType, user._id.toString(), {
          step,
          userId: user._id.toString()
        });
      }

      // Mettre à jour l'étape
      user.onboardingProgress[step] = completed;

      // Si toutes les étapes sont complétées, marquer la date de completion
      const allStepsCompleted = Object.values(user.onboardingProgress).every(
        (value, index) => index < validSteps.length ? value === true : true
      );

      if (allStepsCompleted && !user.onboardingProgress.completedAt) {
        user.onboardingProgress.completedAt = new Date();

        // Track onboarding completion
        const userType = user.role === 'student' ? 'student' : 'school';
        await trackFunnelEventServer('onboarding_completed', userType, user._id.toString(), {
          userId: user._id.toString()
        });
      }

      await user.save();

      const totalSteps = validSteps.length;
      const completedSteps = Object.values(user.onboardingProgress).filter(
        (value, index) => index < validSteps.length ? value === true : false
      ).length;

      return res.status(200).json({
        message: 'Progression mise à jour',
        progress: user.onboardingProgress,
        completedSteps,
        totalSteps,
        isCompleted: allStepsCompleted,
        completionPercentage: Math.round((completedSteps / totalSteps) * 100)
      });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Erreur API onboarding:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}
