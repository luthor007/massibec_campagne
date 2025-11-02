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
    const { reason } = req.body;

    if (!schoolId) {
      return res.status(400).json({ message: 'ID de l\'école requis' });
    }

    // Vérifier que l'école existe
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'École non trouvée' });
    }

    // Vérifier que l'école peut être désactivée
    if (school.status === 'deactivated') {
      return res.status(400).json({ 
        message: 'Cette école est déjà désactivée' 
      });
    }

    if (school.status === 'rejected') {
      return res.status(400).json({ 
        message: 'Cette école est rejetée, utilisez la réactivation' 
      });
    }

    // Désactiver l'école
    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      { 
        status: 'deactivated',
        deactivationReason: reason || 'Désactivation temporaire',
        deactivatedAt: new Date()
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
          'schoolManagerInfo.status': 'deactivated',
          'schoolManagerInfo.deactivationReason': reason || 'Désactivation temporaire',
          'schoolManagerInfo.deactivatedAt': new Date()
        } 
      }
    );

    res.status(200).json({ 
      message: 'École désactivée avec succès',
      school: updatedSchool
    });

  } catch (error) {
    console.error('Erreur lors de la désactivation de l\'école:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la désactivation.' });
  }
}
