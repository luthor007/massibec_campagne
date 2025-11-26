import dbConnect from '../../../lib/mongodb';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import User from '../../../models/User';
import Product from '../../../models/Product';
import SupplierManager from '../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();

      // Extract the token from the request
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Non autorisé, pas connecté' });
      }

      const userId = token.sub;

      // Get user info to find the school
      const user = await User.findById(userId).lean();

      if (!user) {
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }

      // Check if schoolId is provided in query params (for school_managers in preview mode)
      const querySchoolId = req.query.schoolId;

      let schoolId;
      if (querySchoolId) {
        // Use the provided schoolId if available
        schoolId = querySchoolId;
      } else {
        // Otherwise, determine schoolId based on user role
        if (user.role === 'school_manager') {
          schoolId = user.schoolManagerInfo?.organisme?._id || user.schoolManagerInfo?.organisme;
        } else if (user.role === 'student') {
          // Check if user has campaigns (new campaign-based system)
          if (user.campaigns && user.campaigns.length > 0) {
            // Get the active campaign from the campaigns array
            const activeCampaignEntry = user.campaigns.find(c => c.isActive) || user.campaigns[0];
            schoolId = activeCampaignEntry?.schoolId?._id || activeCampaignEntry?.schoolId;
          } else {
            // Fall back to legacy school field
            schoolId = user.school?._id || user.school;
          }
        } else if (user.role === 'supplier') {
          // For suppliers, we'll handle this separately after getting the supplier
          // Don't set schoolId here, we'll find it from the campaign
        } else {
          return res.status(401).json({ message: 'Rôle non autorisé' });
        }
      }

      // Handle suppliers separately
      let campaignId = null;
      let school = null;

      if (user.role === 'supplier') {
        // Get supplier for this user
        const supplierManager = await SupplierManager.findOne({
          user: userId,
          status: 'active'
        }).populate('supplier').lean();

        if (!supplierManager || !supplierManager.supplier) {
          return res.status(404).json({ message: 'Fournisseur non trouvé pour cet utilisateur' });
        }

        const supplierId = supplierManager.supplier._id;

        // If querySchoolId is provided, use it to find a specific campaign
        if (querySchoolId) {
          schoolId = querySchoolId;
          school = await School.findById(schoolId).lean();
          if (!school) {
            return res.status(404).json({ message: 'École non trouvée' });
          }
        }

        // Find a campaign for this supplier (prefer active one, or most recent)
        const supplierCampaigns = await Campaign.find({ supplier: supplierId })
          .populate('school', 'name address ville codePostal logo')
          .sort({ isActive: -1, createdAt: -1 })
          .limit(1)
          .lean();

        if (supplierCampaigns.length > 0) {
          campaignId = supplierCampaigns[0]._id;
          if (!school && supplierCampaigns[0].school) {
            school = supplierCampaigns[0].school;
            schoolId = school._id.toString();
          }
        } else {
          return res.status(404).json({ message: 'Aucune campagne trouvée pour ce fournisseur' });
        }
      } else {
        // Original logic for students and school_managers
        if (!schoolId) {
          return res.status(404).json({ message: 'Aucune école associée à cet utilisateur' });
        }

        // Find the school
        school = await School.findById(schoolId).lean();
        if (!school) {
          return res.status(404).json({ message: 'École non trouvée' });
        }

        // Get campaign ID from user's campaigns array if available (works for both students and school_managers who joined campaigns)
        // First, check if user has joined any campaigns
        if (user.campaigns && user.campaigns.length > 0) {
          // For both students and school_managers, prioritize their activeCampaignId if set
          if (user.activeCampaignId) {
            // Check if the activeCampaignId corresponds to a joined campaign
            const activeCampaignEntry = user.campaigns.find(c => {
              const entryCampaignId = c.campaignId?._id || c.campaignId;
              return entryCampaignId?.toString() === user.activeCampaignId.toString();
            });
            if (activeCampaignEntry) {
              campaignId = user.activeCampaignId;
              if (user.role === 'school_manager') {
                console.log(`[campaigns/current] School manager in preview mode: Using user.activeCampaignId: ${campaignId}`);
              }
            }
          }

          // If no activeCampaignId or not found in joined campaigns, use the first active campaign or first campaign
          if (!campaignId) {
            const activeCampaignEntry = user.campaigns.find(c => c.isActive) || user.campaigns[0];
            campaignId = activeCampaignEntry?.campaignId?._id || activeCampaignEntry?.campaignId;
            if (user.role === 'school_manager') {
              console.log(`[campaigns/current] School manager in preview mode: Using joined campaign (fallback): ${campaignId}`);
            }
          }
        } else if (user.role === 'school_manager') {
          // Only use school's activeCampaignId if the school_manager hasn't joined any campaigns
          // This is the normal manager view, not preview mode
          campaignId = school.activeCampaignId;
          if (campaignId) {
            console.log(`[campaigns/current] School manager: Using school.activeCampaignId: ${campaignId}`);
          } else {
            console.log(`[campaigns/current] School manager: No activeCampaignId found for school ${schoolId}`);
          }
        }
      }

      // Get active campaign from Campaign collection
      let activeCampaign;
      if (campaignId) {
        // If we have a specific campaign ID, use that
        activeCampaign = await Campaign.findById(campaignId)
          .populate('supplier', 'name logo email phone pricingSettings')
          .populate('customPrices.productId', 'name price cost image')
          .populate('profitSplits.productId', 'name')
          .lean();
      } else {
        // Otherwise, find any active campaign for the school (including test campaigns)
        // For school managers, also check campaigns that might not be marked as isActive
        activeCampaign = await Campaign.findOne({
          school: schoolId,
          status: { $in: ['active', 'approved', 'pending_approval', 'pending_school_approval'] }
        })
          .sort({ createdAt: -1 }) // Get the most recent one
          .populate('supplier', 'name logo email phone pricingSettings')
          .populate('customPrices.productId', 'name price cost image')
          .populate('profitSplits.productId', 'name')
          .lean();

        // If still not found and user is school_manager, try without status filter
        if (!activeCampaign && user.role === 'school_manager') {
          activeCampaign = await Campaign.findOne({
            school: schoolId
          })
            .sort({ createdAt: -1 }) // Get the most recent one
            .populate('supplier', 'name logo email phone pricingSettings')
            .populate('customPrices.productId', 'name price cost image')
            .populate('profitSplits.productId', 'name')
            .lean();
        }
      }

      // If no active campaign in Campaign collection, check school's campaigns (legacy)
      let campaign = activeCampaign;
      if (!campaign && school.campaigns && school.campaigns.length > 0) {
        const schoolActiveCampaign = school.campaigns.find(c => c.isActive);
        if (schoolActiveCampaign) {
          campaign = {
            _id: schoolActiveCampaign._id,
            campaignNumber: schoolActiveCampaign.campaignNumber,
            startDate: schoolActiveCampaign.startDate,
            endDate: schoolActiveCampaign.endDate,
            deliveryDate: schoolActiveCampaign.deliveryDate,
            isActive: schoolActiveCampaign.isActive,
            status: schoolActiveCampaign.status,
            financialGoal: schoolActiveCampaign.financialGoal,
            profitSplitType: schoolActiveCampaign.profitSplitType,
            customPrices: schoolActiveCampaign.customPrices || [],
            profitSplits: schoolActiveCampaign.profitSplits || [],
            notes: schoolActiveCampaign.notes,
            school: {
              _id: school._id,
              name: school.name,
              address: school.address,
              ville: school.ville,
              codePostal: school.codePostal,
              logo: school.logo
            }
          };
        }
      }

      if (!campaign) {
        return res.status(404).json({ message: 'Aucune campagne active trouvée' });
      }

      res.status(200).json({
        campaign,
        school: {
          _id: school._id,
          name: school.name,
          address: school.address,
          ville: school.ville,
          codePostal: school.codePostal,
          logo: school.logo,
          split: school.split || {
            studentBenefit: 85.6,
            organizationBenefit: 9.4,
            raffleBenefit: 5.0
          },
          isBonus: school.isBonus || false,
          bonuses: school.bonuses || []
        }
      });

    } catch (error) {
      console.error('Error fetching current campaign:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération de la campagne', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
