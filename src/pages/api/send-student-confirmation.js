// src/pages/api/send-student-confirmation.js
// Endpoint pour envoyer l'email de confirmation d'inscription d'étudiant

import { sendStudentConfirmationEmail } from '../../utils/sendgridMailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      parentEmail,
      parentName,
      studentName,
      schoolName
    } = req.body;

    // Validation des paramètres requis
    if (!parentEmail || !parentName || !studentName || !schoolName) {
      return res.status(400).json({ 
        error: 'Paramètres manquants: parentEmail, parentName, studentName, schoolName sont requis' 
      });
    }

    // Envoi de l'email de confirmation d'étudiant
    const result = await sendStudentConfirmationEmail({
      parentEmail,
      parentName,
      studentName,
      schoolName
    });

    console.log('✅ Email de confirmation étudiant envoyé avec succès');
    return res.status(200).json({ 
      success: true, 
      message: 'Email de confirmation étudiant envoyé avec succès',
      result: result
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de confirmation étudiant:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de l\'envoi de l\'email de confirmation étudiant',
      details: error.message 
    });
  }
}
