// pages/api/schools/[schoolId].js

import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await dbConnect();

  const { schoolId } = req.query;

  // Validate the MongoDB ObjectId
  if (!validator.isMongoId(schoolId)) {
    return res.status(400).json({ message: 'Invalid school ID.' });
  }

  try {
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found.' });
    }

    if ((!school.campaigns || school.campaigns.length === 0) && school.debutCampagne && school.finCampagne) {
      school.campaigns = [{
        campaignNumber: school.currentCampaignNumber || 1,
        startDate: school.debutCampagne,
        endDate: school.finCampagne,
        deliveryDate: school.dateDeLivraison,
        isActive: true,
      }];
      school.activeCampaignId = school.campaigns[0]._id;
      await school.save();
    } else if (school.campaigns?.length && !school.activeCampaignId) {
      const activeCampaign = school.campaigns.find((campaign) => campaign.isActive) || school.campaigns[0];
      if (activeCampaign) {
        activeCampaign.isActive = true;
        school.activeCampaignId = activeCampaign._id;
        await school.save();
      }
    }

    switch (req.method) {
      case 'GET':
        res.status(200).json(school);
        break;

      case 'PUT':
        const {
          name,
          address,
          split,
          customFields,
          campaigns,
          isBonus,
          debutCampagne: ignoredStart,
          finCampagne: ignoredEnd,
          dateDeLivraison: ignoredDelivery,
          ...otherFields
        } = req.body;

        // Validate required fields
        if (!name || !address || !split) {
          return res.status(400).json({ message: 'Tous les champs sont requis.' });
        }

        school.name = name;
        school.address = address;
        school.split = {
          studentBenefit: Number(split.studentBenefit),
          organizationBenefit: Number(split.organizationBenefit),
          raffleBenefit: Number(split.raffleBenefit),
        };
        school.customFields = customFields || {};

        Object.entries(otherFields).forEach(([key, value]) => {
          if (typeof value === 'string') {
            school[key] = sanitizeHtml(value);
          } else if (value !== undefined) {
            school[key] = value;
          }
        });

        if (typeof isBonus !== 'undefined') {
          school.isBonus = Boolean(isBonus);
        }

        if (Array.isArray(campaigns)) {
          const normalizedCampaigns = campaigns.map((campaign) => {
            const normalized = {
              campaignNumber: Number(campaign.campaignNumber),
              startDate: campaign.startDate ? new Date(campaign.startDate) : null,
              endDate: campaign.endDate ? new Date(campaign.endDate) : null,
              deliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate) : undefined,
              isActive: Boolean(campaign.isActive),
              notes: campaign.notes || undefined,
            };

            if (campaign._id && mongoose.Types.ObjectId.isValid(campaign._id)) {
              normalized._id = new mongoose.Types.ObjectId(campaign._id);
            }

            if (!normalized.startDate || Number.isNaN(normalized.startDate.getTime())) {
              throw new Error('La date de début de campagne est invalide.');
            }

            if (!normalized.endDate || Number.isNaN(normalized.endDate.getTime())) {
              throw new Error('La date de fin de campagne est invalide.');
            }

            if (normalized.deliveryDate && Number.isNaN(normalized.deliveryDate.getTime())) {
              normalized.deliveryDate = undefined;
            }

            return normalized;
          });

          let activeFound = false;
          normalizedCampaigns.forEach((campaign) => {
            if (campaign.isActive) {
              if (!activeFound) {
                activeFound = true;
              } else {
                campaign.isActive = false;
              }
            }
          });

          if (!activeFound && normalizedCampaigns.length > 0) {
            normalizedCampaigns[0].isActive = true;
          }

          school.set('campaigns', normalizedCampaigns);
          school.markModified('campaigns');
        }

        const updatedSchool = await school.save();
        res.status(200).json(updatedSchool);
        break;

      case 'PATCH':
        const updates = req.body;
        const allowedUpdates = ['expNum', 'accumba', 'paymentMethod', 'bankInstitution', 'bankTransit', 'bankAccount', 'bankInteracEmail', 'bankPayableTo'];

        // Validate and sanitize updates
        Object.keys(updates).forEach(key => {
          if (allowedUpdates.includes(key)) {
            school[key] = sanitizeHtml((updates[key] || '').toString().trim());
          }
        });

        // Save the updated school
        await school.save();

        res.status(200).json({
          id: school._id.toString(),
          name: school.name,
          expNum: school.expNum,
          accumba: school.accumba,
          bankInstitution: school.bankInstitution,
          bankTransit: school.bankTransit,
          bankAccount: school.bankAccount,
          bankInteracEmail: school.bankInteracEmail,
          bankPayableTo: school.bankPayableTo,
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH']);
        res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling school:', error);
    
    if (error.message && /campagne/i.test(error.message)) {
      return res.status(400).json({ message: error.message });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error.',
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: 'Internal server error.' });
  }
}
