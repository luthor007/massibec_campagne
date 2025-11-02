// API de test pour vérifier l'envoi d'email via Outlook/Microsoft 365
import { sendVerificationEmail } from '../../utils/gmailMailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email requis' });
    }

    console.log(`📧 Test d'envoi d'email à: ${email}`);
    console.log(`📧 Provider configuré: ${process.env.EMAIL_PROVIDER || 'gmail'}`);
    console.log(`📧 Email expéditeur: commande@massibec.com`);

    // Envoyer un email de test
    await sendVerificationEmail({
      to: email,
      subject: '🧪 Test Email - Campagne Massibec',
      firstName: 'Test',
      verificationUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/email-verified`
    });

    console.log(`✅ Email de test envoyé avec succès à ${email}`);

    return res.status(200).json({ 
      success: true,
      message: `Email de test envoyé avec succès à ${email}`,
      provider: process.env.EMAIL_PROVIDER || 'gmail',
      from: 'commande@massibec.com'
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de test:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erreur lors de l\'envoi de l\'email',
      error: error.message 
    });
  }
}








