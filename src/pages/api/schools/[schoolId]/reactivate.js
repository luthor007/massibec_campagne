import dbConnect from '../../../../lib/mongodb';
import School from '../../../../models/School';
import User from '../../../../models/User';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }

  try {
    const { schoolId } = req.query;

    if (!schoolId) {
      return res.status(400).json({ message: 'ID de l\'école requis' });
    }

    // Vérifier que l'école existe
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    // Vérifier que l'école peut être réactivée
    if (school.status === 'approved') {
      return res.status(400).json({ 
        message: 'Cette école est déjà approuvée' 
      });
    }

    if (school.status === 'pending') {
      return res.status(400).json({ 
        message: 'Cette école est déjà en attente d\'approbation' 
      });
    }

    // Réactiver l'école (remettre en attente d'approbation)
    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      { 
        status: 'pending',
        approved: false,
        reactivatedAt: new Date(),
        // Nettoyer les anciens champs de rejet/désactivation
        rejectionReason: undefined,
        rejectedAt: undefined,
        deactivationReason: undefined,
        deactivatedAt: undefined
      },
      { new: true }
    );

    // Optionnel: Mettre à jour le statut du school manager
    await User.updateMany(
      { 
        role: 'school_manager',
        'schoolManagerInfo.organisme': schoolId 
      },
      { 
        $set: { 
          'schoolManagerInfo.status': 'pending',
          'schoolManagerInfo.reactivatedAt': new Date()
        },
        $unset: {
          'schoolManagerInfo.rejectionReason': 1,
          'schoolManagerInfo.rejectedAt': 1,
          'schoolManagerInfo.deactivationReason': 1,
          'schoolManagerInfo.deactivatedAt': 1
        }
      }
    );

    res.status(200).json({ 
      message: 'École réactivée avec succès',
      school: updatedSchool
    });

  } catch (error) {
    console.error('Erreur lors de la réactivation de l\'école:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la réactivation.' });
  }
}
