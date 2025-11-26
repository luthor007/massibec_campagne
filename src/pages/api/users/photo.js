// src/pages/api/users/photo.js
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return res.status(401).json({ message: 'Non autorisé' });
    }

    const userId = token.sub;

    if (req.method === 'GET') {
        try {
            const user = await User.findById(userId).select('studentPhoto').lean();

            if (!user) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }

            res.status(200).json({ studentPhoto: user.studentPhoto || null });
        } catch (error) {
            console.error('[users/photo] Error fetching photo:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    } else if (req.method === 'PUT') {
        try {
            const { studentPhoto } = req.body;

            const user = await User.findByIdAndUpdate(
                userId,
                { studentPhoto: studentPhoto || null },
                { new: true }
            ).select('studentPhoto');

            if (!user) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }

            res.status(200).json({
                message: 'Photo mise à jour avec succès',
                studentPhoto: user.studentPhoto
            });
        } catch (error) {
            console.error('[users/photo] Error updating photo:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
    }
}

