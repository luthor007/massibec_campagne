import dbConnect from '../../../../lib/mongodb';
import School from '../../../../models/School';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await dbConnect();

    const token = await getToken({ req });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { campaignId } = req.query;
    const { 
      splitType, 
      studentBenefit, 
      organizationBenefit, 
      raffleBenefit, 
      reason 
    } = req.body;

    // Find the school that owns this campaign
    const school = await School.findOne({
      'campaigns._id': campaignId
    });

    if (!school) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Determine user role
    const isMassibec = token.role === 'fournisseur';
    const isSchoolManager = token.schoolManagerInfo?.organisme?.toString() === school._id.toString();

    if (!isMassibec && !isSchoolManager) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const userRole = isMassibec ? 'massibec' : 'school';

    // Find the campaign
    const campaign = school.campaigns.id(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Check if school can modify (not when campaign is active)
    if (userRole === 'school' && campaign.status === 'active') {
      return res.status(400).json({ 
        message: 'Vous ne pouvez pas modifier la répartition des profits une fois que la campagne est active. Contactez Massibec pour toute modification.' 
      });
    }

    // Validate split values
    if (splitType === 'percentage') {
      const total = parseFloat(studentBenefit) + parseFloat(organizationBenefit) + parseFloat(raffleBenefit);
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({ 
          message: `Les pourcentages doivent totaliser 100%. Total actuel: ${total.toFixed(1)}%` 
        });
      }
    } else {
      // For absolute values, check that all values are positive
      if (studentBenefit < 0 || organizationBenefit < 0 || raffleBenefit < 0) {
        return res.status(400).json({ 
          message: 'Les valeurs absolues doivent être positives' 
        });
      }
      
      // Check that total doesn't exceed $3.00 per product
      const total = parseFloat(studentBenefit) + parseFloat(organizationBenefit) + parseFloat(raffleBenefit);
      if (total > 3.00) {
        return res.status(400).json({ 
          message: `Le total ne peut pas dépasser 3.00$ par produit. Total actuel: ${total.toFixed(2)}$` 
        });
      }
    }

    // Store previous values for history
    const previousSplit = {
      studentBenefit: campaign.profitSplit.studentBenefit,
      organizationBenefit: campaign.profitSplit.organizationBenefit,
      raffleBenefit: campaign.profitSplit.raffleBenefit
    };

    // Update campaign split configuration
    campaign.profitSplit = {
      studentBenefit: parseFloat(studentBenefit),
      organizationBenefit: parseFloat(organizationBenefit),
      raffleBenefit: parseFloat(raffleBenefit)
    };
    campaign.profitSplitType = splitType;

    // Add to modification history if it doesn't exist
    if (!campaign.splitModificationHistory) {
      campaign.splitModificationHistory = [];
    }

    campaign.splitModificationHistory.push({
      modifiedBy: userRole,
      modifiedAt: new Date(),
      previousSplit,
      newSplit: campaign.profitSplit,
      splitType,
      reason: reason || 'Modification de la répartition des profits'
    });

    // Keep only last 10 modifications
    if (campaign.splitModificationHistory.length > 10) {
      campaign.splitModificationHistory = campaign.splitModificationHistory.slice(-10);
    }

    // If school modifies campaign, reset status to pending_approval
    if (userRole === 'school') {
      campaign.status = 'pending_approval';
    }

    await school.save();

    res.status(200).json({ 
      message: 'Répartition des profits de la campagne mise à jour avec succès',
      profitSplit: campaign.profitSplit,
      profitSplitType: campaign.profitSplitType,
      modifiedBy: userRole,
      status: campaign.status
    });

  } catch (error) {
    console.error('Error updating campaign split configuration:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
