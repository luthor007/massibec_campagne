// src/pages/api/school-info.js

import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas connecté' });
    }

    const userId = token.sub;
    const user = await User.findById(userId).lean();

    if (!user || user.role !== 'school_manager') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const schoolId = user.schoolManagerInfo.organisme;

    if (req.method === 'GET') {
      const school = await School.findById(schoolId).lean();
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      const schoolInfo = {
        id: school._id,
        name: school.name,
        objectifFinancier: school.objectifFinancier,
        totalRaised: school.totalRaised || 0,
        code: school.code,
        debutCampagne: school.debutCampagne,
        finCampagne: school.finCampagne,
        dateDeLivraison: school.dateDeLivraison,
        currentCampaignNumber: school.currentCampaignNumber,
        address: school.address,
        email: school.email,
        telephone: school.telephone,
        // Coordonnées bancaires pour versement Massibec → École
        paymentMethod: school.paymentMethod || 'cheque',
        bankInstitution: school.bankInstitution || '',
        bankTransit: school.bankTransit || '',
        bankAccount: school.bankAccount || '',
        bankInteracEmail: school.bankInteracEmail || '',
        bankPayableTo: school.bankPayableTo || '',
      };

      return res.status(200).json(schoolInfo);

    } else if (req.method === 'PATCH') {
      const school = await School.findById(schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      const allowedFields = ['paymentMethod', 'bankInstitution', 'bankTransit', 'bankAccount', 'bankInteracEmail', 'bankPayableTo'];
      const updates = req.body;

      allowedFields.forEach((field) => {
        if (field in updates) {
          school[field] = (updates[field] || '').toString().trim();
        }
      });

      await school.save();

      return res.status(200).json({
        message: 'Coordonnées bancaires mises à jour.',
        paymentMethod: school.paymentMethod,
        bankInstitution: school.bankInstitution,
        bankTransit: school.bankTransit,
        bankAccount: school.bankAccount,
        bankInteracEmail: school.bankInteracEmail,
        bankPayableTo: school.bankPayableTo,
      });

    } else {
      res.setHeader('Allow', ['GET', 'PATCH']);
      return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('Error in school-info:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}