// src/pages/api/send-massibec-confirmation.js
// Endpoint pour envoyer l'email de confirmation de commande à Massibec

import { sendJappuieConfirmationEmail } from '../../utils/sendgridMailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      sellerEmail,
      sellerName,
      orderId,
      orderAmount,
      schoolName,
      deliveryDate,
      schoolAddress
    } = req.body;

    // Validation des paramètres requis
    if (!sellerEmail || !sellerName || !orderId || !orderAmount ||
      !schoolName || !deliveryDate || !schoolAddress) {
      return res.status(400).json({
        error: 'Paramètres manquants: sellerEmail, sellerName, orderId, orderAmount, schoolName, deliveryDate, schoolAddress sont requis'
      });
    }

    // Envoi de l'email de confirmation Massibec
    // Construire l'objet orderData selon la nouvelle signature
    const orderData = {
      orderNumber: orderId,
      customerName: sellerName,
      customerEmail: sellerEmail,
      totalAmount: orderAmount,
      products: [], // Les produits ne sont pas fournis dans cette API
      deliveryDate: deliveryDate,
      schoolName: schoolName,
      studentName: sellerName, // Utiliser sellerName comme fallback
      studentEmail: sellerEmail // Utiliser sellerEmail comme fallback
    };

    const result = await sendJappuieConfirmationEmail({
      to: sellerEmail,
      subject: `Nouvelle commande #${orderId} - ${schoolName}`,
      orderData: orderData
    });

    console.log('✅ Email de confirmation Massibec envoyé avec succès');
    return res.status(200).json({
      success: true,
      message: 'Email de confirmation Massibec envoyé avec succès',
      result: result
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de confirmation Massibec:', error);
    return res.status(500).json({
      error: 'Erreur lors de l\'envoi de l\'email de confirmation Massibec',
      details: error.message
    });
  }
}
