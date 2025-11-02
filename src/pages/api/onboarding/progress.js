import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';

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
      // Récupérer la progression actuelle
      const progress = user.onboardingProgress || {};
      const totalSteps = 6;
      const completedSteps = Object.values(progress).filter(step => step === true).length;
      
      return res.status(200).json({
        progress,
        completedSteps,
        totalSteps,
        isCompleted: completedSteps === totalSteps,
        completionPercentage: Math.round((completedSteps / totalSteps) * 100)
      });
    }

    if (req.method === 'POST') {
      const { step, completed } = req.body;
      
      if (!step || typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'Étape et statut requis' });
      }

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

      // Mettre à jour l'étape
      user.onboardingProgress[step] = completed;

      // Si toutes les étapes sont complétées, marquer la date de completion
      const allStepsCompleted = Object.values(user.onboardingProgress).every(
        (value, index) => index < validSteps.length ? value === true : true
      );

      if (allStepsCompleted && !user.onboardingProgress.completedAt) {
        user.onboardingProgress.completedAt = new Date();
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
