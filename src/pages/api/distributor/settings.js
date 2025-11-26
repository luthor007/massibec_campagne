import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import { getToken } from 'next-auth/jwt';

// Helper function to sanitize strings
function sanitizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
}

export default async function handler(req, res) {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'distributor') {
        return res.status(401).json({ message: 'Non autorisé' });
    }

    if (req.method === 'GET') {
        try {
            const user = await User.findById(token.sub)
                .select('distributorInfo')
                .lean();

            if (!user) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }

            const distributorInfo = user.distributorInfo || {};

            res.status(200).json({
                distributorInfo: {
                    nomEntreprise: distributorInfo.nomEntreprise || '',
                    telephone: distributorInfo.telephone || '',
                    adresse: distributorInfo.adresse || '',
                    ville: distributorInfo.ville || '',
                    codePostal: distributorInfo.codePostal || ''
                }
            });
        } catch (error) {
            console.error('Error fetching distributor info:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des informations' });
        }
    } else if (req.method === 'PUT') {
        try {
            const {
                nomEntreprise,
                telephone,
                adresse,
                ville,
                codePostal
            } = req.body;

            // Validate required fields
            if (!telephone || !adresse) {
                return res.status(400).json({ message: 'Les champs téléphone et adresse sont requis' });
            }

            // Sanitize inputs
            const sanitizedNomEntreprise = nomEntreprise ? sanitizeString(nomEntreprise) : '';
            const sanitizedTelephone = sanitizeString(telephone);
            const sanitizedAdresse = sanitizeString(adresse);
            const sanitizedVille = ville ? sanitizeString(ville) : '';
            const sanitizedCodePostal = codePostal ? sanitizeString(codePostal) : '';

            // Update user's distributorInfo
            const user = await User.findById(token.sub);
            if (!user) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }

            user.distributorInfo = {
                nomEntreprise: sanitizedNomEntreprise,
                telephone: sanitizedTelephone,
                adresse: sanitizedAdresse,
                ville: sanitizedVille,
                codePostal: sanitizedCodePostal
            };

            await user.save();

            res.status(200).json({
                message: 'Informations mises à jour avec succès',
                distributorInfo: user.distributorInfo
            });
        } catch (error) {
            console.error('Error updating distributor info:', error);
            res.status(500).json({ message: 'Erreur lors de la mise à jour des informations' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ message: 'Method not allowed' });
    }
}
