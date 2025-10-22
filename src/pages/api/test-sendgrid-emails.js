// src/pages/api/test-sendgrid-emails.js
// Endpoint de test pour tous les types d'emails SendGrid

import { 
  sendSchoolConfirmationEmail,
  sendStudentConfirmationEmail,
  sendOrderConfirmationEmail,
  sendMassibecConfirmationEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
} from '../../utils/sendgridMailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { testType } = req.body;

    if (!testType) {
      return res.status(400).json({ 
        error: 'Paramètre testType requis. Valeurs possibles: school, student, order, massibec, verification, password' 
      });
    }

    let result;

    switch (testType) {
      case 'school':
        result = await sendSchoolConfirmationEmail({
          schoolEmail: 'test@example.com',
          schoolName: 'École Test',
          schoolAddress: '123 Rue Test, Montréal, QC',
          schoolPhone: '514-123-4567',
          schoolContactName: 'Jean Test'
        });
        break;

      case 'student':
        result = await sendStudentConfirmationEmail({
          parentEmail: 'parent@example.com',
          parentName: 'Marie Test',
          studentName: 'Pierre Test',
          schoolName: 'École Test'
        });
        break;

      case 'order':
        result = await sendOrderConfirmationEmail({
          customerEmail: 'customer@example.com',
          customerName: 'Client Test',
          sellerEmail: 'seller@example.com',
          sellerName: 'Vendeur Test',
          orderId: 'TEST-001',
          orderAmount: 25.50,
          schoolName: 'École Test',
          deliveryDate: '2025-01-15',
          schoolAddress: '123 Rue Test, Montréal, QC'
        });
        break;

      case 'massibec':
        result = await sendMassibecConfirmationEmail({
          sellerEmail: 'seller@example.com',
          sellerName: 'Vendeur Test',
          orderId: 'TEST-001',
          orderAmount: 25.50,
          schoolName: 'École Test',
          deliveryDate: '2025-01-15',
          schoolAddress: '123 Rue Test, Montréal, QC'
        });
        break;

      case 'verification':
        result = await sendVerificationEmail({
          to: 'test@example.com',
          subject: 'Test de vérification',
          firstName: 'Test',
          verificationUrl: 'https://example.com/verify?token=test123'
        });
        break;

      case 'password':
        result = await sendPasswordResetEmail({
          to: 'test@example.com',
          subject: 'Test de réinitialisation',
          resetLink: 'https://example.com/reset?token=test123'
        });
        break;

      default:
        return res.status(400).json({ 
          error: 'Type de test invalide. Valeurs possibles: school, student, order, massibec, verification, password' 
        });
    }

    console.log(`✅ Test email ${testType} envoyé avec succès`);
    return res.status(200).json({ 
      success: true, 
      message: `Test email ${testType} envoyé avec succès`,
      testType,
      result: result
    });

  } catch (error) {
    console.error('❌ Erreur lors du test email:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du test email',
      details: error.message 
    });
  }
}
