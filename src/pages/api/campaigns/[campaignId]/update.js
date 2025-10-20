import dbConnect from '../../../../lib/mongodb';
import School from '../../../../models/School';
import User from '../../../../models/User';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await dbConnect();

    // Get the token to authenticate the user
    const token = await getToken({ req });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { campaignId } = req.query;
    const {
      startDate,
      endDate,
      deliveryDate,
      financialGoal,
      profitSplitType,
      studentBenefit,
      organizationBenefit,
      raffleBenefit,
      notes
    } = req.body;


    // Validate required fields
    if (!financialGoal || financialGoal === '' || isNaN(parseFloat(financialGoal))) {
      return res.status(400).json({ message: 'L\'objectif financier est requis et doit être un nombre valide' });
    }

    // Find the school that owns this campaign
    const school = await School.findOne({
      'campaigns._id': campaignId
    });

    if (!school) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Check if the user is the school manager or Massibec
    const user = await User.findById(token.sub);
    const isSchoolManager = school._id.toString() === token.schoolManagerInfo?.organisme?.toString();
    const isMassibec = user && user.role === 'fournisseur';
    
    if (!isSchoolManager && !isMassibec) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Find the campaign
    const campaign = school.campaigns.id(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Handle dates - use existing dates if locked, otherwise use provided dates
    let finalStartDate, finalEndDate, finalDeliveryDate;

    // If dates are locked, use existing campaign dates (for school managers)
    // OR if form dates are null/empty, use existing campaign dates (for Massibec when fields are disabled)
    if ((campaign.datesLocked && isSchoolManager && !isMassibec) || 
        (!startDate || !endDate || !deliveryDate)) {
      finalStartDate = campaign.startDate;
      finalEndDate = campaign.endDate;
      finalDeliveryDate = campaign.deliveryDate;
    } else {
      // Use provided dates from form
      finalStartDate = startDate;
      finalEndDate = endDate;
      finalDeliveryDate = deliveryDate;
    }

    // Validate dates
    if (!finalStartDate || !finalEndDate || !finalDeliveryDate) {
      return res.status(400).json({ message: 'Toutes les dates sont requises' });
    }

    // Additional validation for Date objects
    if (finalStartDate instanceof Date && isNaN(finalStartDate.getTime())) {
      return res.status(400).json({ message: 'Date de début invalide' });
    }
    if (finalEndDate instanceof Date && isNaN(finalEndDate.getTime())) {
      return res.status(400).json({ message: 'Date de fin invalide' });
    }
    if (finalDeliveryDate instanceof Date && isNaN(finalDeliveryDate.getTime())) {
      return res.status(400).json({ message: 'Date de livraison invalide' });
    }

    // Check if dates are valid and create Date objects
    let startDateObj, endDateObj, deliveryDateObj;
    
    // If dates are already Date objects (from existing campaign), use them directly
    if (finalStartDate instanceof Date) {
      startDateObj = finalStartDate;
      endDateObj = finalEndDate;
      deliveryDateObj = finalDeliveryDate;
    } else {
      // If dates are strings, create Date objects
      startDateObj = new Date(finalStartDate + 'T00:00:00');
      endDateObj = new Date(finalEndDate + 'T00:00:00');
      deliveryDateObj = new Date(finalDeliveryDate + 'T00:00:00');
    }

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || isNaN(deliveryDateObj.getTime())) {
      return res.status(400).json({ message: 'Format de date invalide' });
    }

    // Check locks for school managers (Massibec can override)
    if (isSchoolManager && !isMassibec) {
      // Only allow editing if campaign is not active
      if (campaign.status === 'active') {
        return res.status(400).json({ message: 'Les campagnes actives ne peuvent pas être modifiées' });
      }
      
      // Check if profit split is locked
      if (campaign.profitSplitLocked && (studentBenefit || organizationBenefit || raffleBenefit)) {
        return res.status(400).json({ message: 'La répartition des profits est verrouillée par le fournisseur' });
      }
      
      // Check if dates are locked
      if (campaign.datesLocked && (startDate || endDate || deliveryDate)) {
        return res.status(400).json({ message: 'Les dates sont verrouillées par le fournisseur' });
      }
    }

    // Validate profit split values
    if (profitSplitType === 'percentage') {
      const total = parseFloat(studentBenefit) + parseFloat(organizationBenefit) + parseFloat(raffleBenefit);
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({ message: `Les pourcentages doivent totaliser 100%. Total actuel: ${total.toFixed(1)}%` });
      }
    } else {
      // For absolute values, check that all values are positive
      if (studentBenefit < 0 || organizationBenefit < 0 || raffleBenefit < 0) {
        return res.status(400).json({ message: 'Les valeurs absolues doivent être positives' });
      }
      
      // Check that total doesn't exceed $3.00 per product
      const total = parseFloat(studentBenefit) + parseFloat(organizationBenefit) + parseFloat(raffleBenefit);
      if (total > 3.00) {
        return res.status(400).json({ 
          message: `Le total ne peut pas dépasser 3.00$ par produit. Total actuel: ${total.toFixed(2)}$` 
        });
      }
    }

    // Update campaign details - use validated Date objects
    campaign.startDate = startDateObj;
    campaign.endDate = endDateObj;
    campaign.deliveryDate = deliveryDateObj;
    campaign.financialGoal = parseFloat(financialGoal) || 0;
    campaign.profitSplitType = profitSplitType || 'percentage';
    
    // Parse values, but don't replace 0 with defaults
    const parsedStudentBenefit = parseFloat(studentBenefit);
    const parsedOrganizationBenefit = parseFloat(organizationBenefit);
    const parsedRaffleBenefit = parseFloat(raffleBenefit);
    
    campaign.profitSplit = {
      studentBenefit: isNaN(parsedStudentBenefit) ? (profitSplitType === 'percentage' ? 85.6 : 0) : parsedStudentBenefit,
      organizationBenefit: isNaN(parsedOrganizationBenefit) ? (profitSplitType === 'percentage' ? 9.4 : 0) : parsedOrganizationBenefit,
      raffleBenefit: isNaN(parsedRaffleBenefit) ? (profitSplitType === 'percentage' ? 5.0 : 0) : parsedRaffleBenefit
    };
    
    
    // Update notes if provided
    if (notes !== undefined) {
      campaign.notes = notes;
    }

    // Reset status to pending_approval when school modifies campaign
    if (campaign.status === 'approved') {
      campaign.status = 'pending_approval';
    }

    // Clear any Massibec modifications when school updates
    campaign.massibecModifications = undefined;

    // If this is the active campaign, also update the main school dates
    if (campaign.isActive) {
      school.debutCampagne = startDateObj;
      school.finCampagne = endDateObj;
      school.dateDeLivraison = deliveryDateObj;
      school.objectifFinancier = financialGoal;
    }

    await school.save();

    res.status(200).json({ 
      message: 'Campagne mise à jour avec succès',
      campaign: campaign.toObject()
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la campagne:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}