import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
import Store from '../../models/Store';
import Order from '../../models/Order';
import OrderStudent from '../../models/OrderStudent';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ message: 'Cette fonctionnalité n\'est disponible qu\'en mode développement' });
  }

  try {
    await dbConnect();

    // Get the token to authenticate the user
    const token = await getToken({ req });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const userId = token.id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Check if user is a school manager
    if (user.role !== 'school_manager') {
      return res.status(403).json({ message: 'Seuls les gestionnaires d\'école peuvent supprimer leur compte' });
    }

    const schoolId = user.schoolManagerInfo?.organisme;

    // Delete all related data
    const deletePromises = [];

    // Delete all orders from students in this school
    if (schoolId) {
      const students = await User.find({ school: schoolId, role: 'student' });
      const studentIds = students.map(student => student._id);
      
      if (studentIds.length > 0) {
        deletePromises.push(
          Order.deleteMany({ user: { $in: studentIds } }),
          OrderStudent.deleteMany({ user: { $in: studentIds } })
        );
      }

      // Delete all stores from students in this school
      deletePromises.push(
        Store.deleteMany({ user: { $in: studentIds } })
      );

      // Delete all students in this school
      deletePromises.push(
        User.deleteMany({ school: schoolId, role: 'student' })
      );

      // Delete the school
      deletePromises.push(
        School.findByIdAndDelete(schoolId)
      );
    }

    // Delete the school manager user
    deletePromises.push(
      User.findByIdAndDelete(userId)
    );

    // Execute all deletions
    await Promise.all(deletePromises);

    res.status(200).json({ message: 'Compte et toutes les données associées supprimés avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
