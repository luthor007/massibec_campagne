import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    try {
      const { campaignId } = req.query;
      const { reason } = req.body;
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        return res.status(404).json({ message: 'Campagne non trouvée.' });
      }

      if (campaign.status === 'rejected') {
        return res.status(400).json({ message: 'La campagne est déjà rejetée.' });
      }

      campaign.status = 'rejected';
      campaign.rejectionReason = reason || 'Rejetée par le fournisseur';
      campaign.rejectedAt = new Date();
      await campaign.save();

      res.status(200).json({ message: 'Campagne rejetée avec succès', campaign });
    } catch (error) {
      console.error('Erreur lors du rejet de la campagne:', error);
      res.status(500).json({ message: 'Erreur serveur lors du rejet de la campagne.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }
}
