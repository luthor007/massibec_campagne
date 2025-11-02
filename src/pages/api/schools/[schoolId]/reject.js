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

    // Vérifier que l'école peut être rejetée
    if (school.status === 'rejected') {
      return res.status(400).json({ 
        message: 'Cette école a déjà été rejetée' 
      });
    }

    // Rejeter l'école
    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      { 
        status: 'rejected',
        approved: false,
        rejectionReason: reason || 'Aucune raison spécifiée',
        rejectedAt: new Date()
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
          'schoolManagerInfo.status': 'rejected',
          'schoolManagerInfo.rejectionReason': reason || 'Aucune raison spécifiée',
          'schoolManagerInfo.rejectedAt': new Date()
        } 
      }
    );

    res.status(200).json({ 
      message: 'École rejetée avec succès',
      school: updatedSchool
    });

  } catch (error) {
    console.error('Erreur lors du rejet de l\'école:', error);
    res.status(500).json({ message: 'Erreur serveur lors du rejet.' });
  }
}
