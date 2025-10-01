// src/pages/api/paiement.js
import dbConnect from '../../lib/mongodb';
import Order from '../../models/Order';

const extractOrderIds = (payload) => {
  if (!payload) return [];

  const textFragments = Array.isArray(payload)
    ? payload
    : typeof payload === 'object'
      ? Object.values(payload)
      : [payload];

  const combinedText = textFragments
    .map((value) => (typeof value === 'string' ? value : ''))
    .join(' ')
    .trim();

  if (!combinedText) {
    return [];
  }

  const identifiers = new Set();

  const hashMatches = combinedText.match(/#(\d{1,10})/g);
  if (hashMatches) {
    hashMatches.forEach((match) => {
      const [, orderId] = /#(\d{1,10})/.exec(match) || [];
      if (orderId) {
        identifiers.add(orderId.replace(/^0+/, '') || '0');
      }
    });
  }

  const patternMatches = combinedText.match(/@#&*-[^-]+-(\d+)-/g);
  if (patternMatches) {
    patternMatches.forEach((match) => {
      const [, orderId] = /@#&*-[^-]+-(\d+)-/.exec(match) || [];
      if (orderId) {
        identifiers.add(orderId.replace(/^0+/, '') || '0');
      }
    });
  }

  const commandeMatches = combinedText.match(/commande\s*(?:numéro|#)?\s*(\d{1,10})/gi);
  if (commandeMatches) {
    commandeMatches.forEach((match) => {
      const [, orderId] = /commande\s*(?:numéro|#)?\s*(\d{1,10})/i.exec(match) || [];
      if (orderId) {
        identifiers.add(orderId.replace(/^0+/, '') || '0');
      }
    });
  }

  return Array.from(identifiers);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }

  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (webhookSecret) {
    const providedSecret = req.headers['x-webhook-secret'];
    if (providedSecret !== webhookSecret) {
      return res.status(401).json({ message: 'Signature du webhook invalide.' });
    }
  }

  await dbConnect();

  const orderIds = extractOrderIds(req.body);

  if (!orderIds.length) {
    return res.status(400).json({ message: 'Aucun numéro de commande valide trouvé dans le message.' });
  }

  const results = [];

  for (const rawOrderId of orderIds) {
    const candidates = await Order.find({ orderId: rawOrderId });

    if (!candidates.length) {
      results.push({ orderId: rawOrderId, status: 'not_found' });
      continue;
    }

    await Promise.all(
      candidates.map(async (order) => {
        if (order.status === 'Payé') {
          results.push({ orderId: order.orderId, status: 'already_paid' });
          return;
        }

        order.status = 'Payé';
        await order.save();
        results.push({ orderId: order.orderId, status: 'updated' });
      })
    );
  }

  return res.status(200).json({
    message: 'Statut des commandes mis à jour.',
    processed: results,
  });
}
