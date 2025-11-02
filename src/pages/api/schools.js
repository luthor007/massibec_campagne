// pages/api/schools.js

import dbConnect from '../../lib/mongodb';
import School from '../../models/School';
import Campaign from '../../models/Campaign';
import User from '../../models/User';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      // Migration automatique des écoles existantes
      try {
        await School.updateMany(
          { status: { $exists: false } },
          [
            {
              $set: {
                status: {
                  $cond: {
                    if: { $eq: ['$approved', true] },
                    then: 'approved',
                    else: 'pending'
                  }
                }
              }
            }
          ]
        );
      } catch (migrationError) {
        console.error('Migration error (non-critical):', migrationError);
        // Continue even if migration fails
      }

      // Récupérer écoles et leurs campagnes séparément - handle corruption
      const allSchools = await School.find({}).lean().catch(error => {
        console.error('Error fetching schools:', error);
        // Return empty array if there's corruption
        return [];
      });
      
      // Filter out any corrupted schools
      const validSchools = (allSchools || []).filter(school => {
        try {
          return school && school._id && school.name && typeof school.name === 'string';
        } catch (e) {
          console.error('Corrupted school detected:', school?._id);
          return false;
        }
      });
      
      const schoolIds = validSchools.map(s => s._id);
      
      // Récupérer toutes les campagnes pour ces écoles - WITH populate for products
      let allCampaigns = [];
      try {
        // Fetch campaigns WITH populate to show products
        const campaignDocs = await Campaign.find({ school: { $in: schoolIds } })
          .populate('customPrices.productId', 'name price cost image description')
          .populate('profitSplits.productId', 'name price cost image description')
          .lean();
        
        // Process campaigns - keep product data
        allCampaigns = campaignDocs.map(campaign => {
          try {
            // Keep customPrices and profitSplits with populated products
            return campaign;
          } catch (e) {
            console.error('Error processing campaign:', e);
            return null;
          }
        }).filter(Boolean);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        allCampaigns = [];
      }

      // Récupérer les school managers pour chaque école
      const schoolManagers = await User.find({
        role: 'school_manager',
        'schoolManagerInfo.organisme': { $in: schoolIds }
      }).lean();

      // Enrichir chaque école avec ses campagnes et informations de contact
      const schoolsWithCampaigns = validSchools.map(school => {
        try {
          const schoolId = school._id.toString();
          
          // Match campaigns - school ID can be ObjectId or string
          const schoolCampaigns = allCampaigns.filter(campaign => {
            if (!campaign.school) return false;
            
            // Handle both ObjectId and string formats
            const campaignSchoolId = campaign.school._id ? 
              campaign.school._id.toString() : 
              (campaign.school.toString ? campaign.school.toString() : String(campaign.school));
            
            return campaignSchoolId === schoolId;
          });
          
          // Trouver le school manager pour cette école
          const schoolManager = schoolManagers.find(
            sm => {
              if (!sm.schoolManagerInfo || !sm.schoolManagerInfo.organisme) return false;
              const managerSchoolId = sm.schoolManagerInfo.organisme.toString ? 
                sm.schoolManagerInfo.organisme.toString() : 
                String(sm.schoolManagerInfo.organisme);
              return managerSchoolId === schoolId;
            }
          );

          return {
            ...school,
            campaigns: schoolCampaigns,
            activeCampaign: schoolCampaigns.find(c => {
              if (!c._id) return false;
              const campaignId = c._id.toString ? c._id.toString() : String(c._id);
              const activeId = school.activeCampaignId ? 
                (school.activeCampaignId.toString ? school.activeCampaignId.toString() : String(school.activeCampaignId)) : 
                null;
              return activeId && campaignId === activeId;
            }),
            // Ajouter les informations de contact du school manager
            email: schoolManager?.email || null,
            telephone: schoolManager?.schoolManagerInfo?.telephone || null,
            cellulaire: schoolManager?.schoolManagerInfo?.cellulaire || null
          };
        } catch (error) {
          console.error('Error processing school:', school._id, error);
          return null;
        }
      }).filter(Boolean);

      res.status(200).json(schoolsWithCampaigns);
    } catch (error) {
      console.error('Erreur lors de la récupération des écoles:', error);
      // Return empty array instead of error to prevent dashboard crashes
      res.status(200).json([]);
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }
}