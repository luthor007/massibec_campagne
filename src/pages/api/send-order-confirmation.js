// src/pages/api/send-order-confirmation.js
// Endpoint pour envoyer l'email de confirmation de commande au client

import { sendOrderConfirmationEmail } from '../../utils/sendgridMailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      customerEmail,
      customerName,
      sellerEmail,
      sellerName,
      orderId,
      orderAmount,
      schoolName,
      deliveryDate,
      schoolAddress
    } = req.body;

    // Validation des paramètres requis
    if (!customerEmail || !customerName || !sellerEmail || !sellerName || 
        !orderId || !orderAmount || !schoolName || !deliveryDate || !schoolAddress) {
      return res.status(400).json({ 
        error: 'Paramètres manquants: customerEmail, customerName, sellerEmail, sellerName, orderId, orderAmount, schoolName, deliveryDate, schoolAddress sont requis' 
      });
    }

    // Envoi de l'email de confirmation de commande
    const result = await sendOrderConfirmationEmail({
      customerEmail,
      customerName,
      sellerEmail,
      sellerName,
      orderId,
      orderAmount,
      schoolName,
      deliveryDate,
      schoolAddress
    });

    console.log('✅ Email de confirmation commande envoyé avec succès');
    return res.status(200).json({ 
      success: true, 
      message: 'Email de confirmation commande envoyé avec succès',
      result: result
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de confirmation commande:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de l\'envoi de l\'email de confirmation commande',
      details: error.message 
    });
  }
}
