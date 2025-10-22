// src/pages/api/send-school-confirmation.js
// Endpoint pour envoyer l'email de confirmation d'inscription d'école

import { sendSchoolConfirmationEmail } from '../../utils/sendgridMailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      schoolEmail,
      schoolName,
      schoolAddress,
      schoolPhone,
      schoolContactName
    } = req.body;

    // Validation des paramètres requis
    if (!schoolEmail || !schoolName || !schoolAddress || !schoolPhone || !schoolContactName) {
      return res.status(400).json({ 
        error: 'Paramètres manquants: schoolEmail, schoolName, schoolAddress, schoolPhone, schoolContactName sont requis' 
      });
    }

    // Envoi de l'email de confirmation d'école
    const result = await sendSchoolConfirmationEmail({
      schoolEmail,
      schoolName,
      schoolAddress,
      schoolPhone,
      schoolContactName
    });

    console.log('✅ Email de confirmation école envoyé avec succès');
    return res.status(200).json({ 
      success: true, 
      message: 'Email de confirmation école envoyé avec succès',
      result: result
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de confirmation école:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de l\'envoi de l\'email de confirmation école',
      details: error.message 
    });
  }
}
