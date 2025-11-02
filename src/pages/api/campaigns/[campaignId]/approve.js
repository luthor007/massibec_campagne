import dbConnect from '../../../../lib/mongodb';
import Campaign from '../../../../models/Campaign';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    try {
      const { campaignId } = req.query;
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        return res.status(404).json({ message: 'Campagne non trouvée.' });
      }

      if (campaign.status !== 'pending_approval') {
        return res.status(400).json({ message: 'Seules les campagnes en attente d\'approbation peuvent être approuvées.' });
      }

      campaign.status = 'approved';
      campaign.approvedAt = new Date();
      await campaign.save();

      res.status(200).json({ message: 'Campagne approuvée avec succès', campaign });
    } catch (error) {
      console.error('Erreur lors de l\'approbation de la campagne:', error);
      res.status(500).json({ message: 'Erreur serveur lors de l\'approbation de la campagne.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }
}
