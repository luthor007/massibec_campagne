// pages/api/commandes.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb';
import Order from '../../models/Order';
import User from '../../models/User';
import School from '../../models/School';
import Store from '../../models/Store';
import Campaign from '../../models/Campaign';
import { sendEmail, sendSaleNotificationEmail } from '../../utils/gmailMailer';
import getNextOrderId from '../../utils/getNextOrderId';
import { calculateDonationProfits, isTestCampaign } from '../../utils/campaignHelpers';
import { getToken } from 'next-auth/jwt'; // Add this import
import { IOrder} from '../../types/order'
import mongoose from 'mongoose';

interface ProductItem {
  product: string;
  quantity: number;
  name: string;
  price: number;
  cost: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    await dbConnect();

    //const newOrderId = (await getNextOrderId()).toString();

    const {
      products,
      totalAmount,
      customerEmail,
      customerName,
      storeId,
      school,
      campaignId, // Campaign-based: campaignId from checkout
      owner,
      phoneNumber,
      tip, // Legacy field
      studentDonation,
      schoolDonation,
      autoDeposit,
    } = req.body;

    // Ensure tip and donations are numbers (default to 0 if undefined)
    const tipValue = tip ? Number(tip) : 0;
    const studentDonationValue = studentDonation ? Number(studentDonation) : 0;
    const schoolDonationValue = schoolDonation ? Number(schoolDonation) : 0;

    // Find the user by ID or email (or any unique identifier available)
    const user = await User.findById(owner._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Increment the order counter by 1
    user.orderCounter = user.orderCounter + 1;
    const newOrderId = user.orderCounter;

    // Save the updated user
    await user.save();


    // Validation des champs requis
    console.log(newOrderId)
    console.log(products)
    console.log(totalAmount)
    console.log(customerEmail)
    console.log(customerName)
    console.log(storeId)
    console.log(school)
    // Note: We use school address for delivery, not personal address
    // Personal addresses are only needed for student records
    if (
      !newOrderId ||
      !products ||
      !Array.isArray(products) ||
      products.length === 0 ||
      !totalAmount ||
      !customerEmail ||
      !customerName ||
      !storeId ||
      !school ||
      !owner ||
      !phoneNumber
    ) {
      return res.status(400).json({ message: 'Certains champs requis sont manquants.' });
    }

    try {
      // Récupérer les informations de l'école
      // school can be either a string ID or an object with _id
      const schoolId = typeof school === 'string' ? school : (school?._id || school);
      
      if (!schoolId) {
        console.error('School ID is missing from request. Owner:', owner);
        return res.status(400).json({ 
          message: 'École non trouvée. Veuillez vous assurer que vous êtes bien associé à une campagne active.' 
        });
      }
      
      const schoolData = await School.findById(schoolId);
      if (!schoolData) {
        console.error('School not found in database. School ID:', schoolId);
        return res.status(400).json({ 
          message: 'École non trouvée. Veuillez contacter le support si le problème persiste.' 
        });
      }

      // Campaign-based approach: Use campaignId from request if provided, otherwise get from user/school
      let finalCampaignId: string | null = campaignId ? campaignId.toString() : null;
      let campaignNumber = 1;
      let activeCampaign: any = null;
      
      console.log('Order creation - campaignId from request:', campaignId);
      console.log('Order creation - finalCampaignId:', finalCampaignId);
      
      if (finalCampaignId) {
        // CampaignId provided directly from checkout - use it
        console.log('Using campaignId from checkout:', finalCampaignId);
        activeCampaign = await Campaign.findById(finalCampaignId);
        if (activeCampaign) {
          campaignNumber = activeCampaign.campaignNumber || 1;
          console.log('Found campaign in Campaign collection, campaignNumber:', campaignNumber);
        } else {
          // Campaign not found in Campaign collection - check if it's in school's embedded campaigns
          console.log('Campaign not found in Campaign collection, checking school embedded campaigns');
          const schoolCampaign = schoolData.campaigns?.find((camp: any) => 
            camp._id?.toString() === finalCampaignId || 
            camp._id?._id?.toString() === finalCampaignId
          );
          if (schoolCampaign) {
            // Use embedded campaign - ensure it has status field
            activeCampaign = {
              ...schoolCampaign,
              status: schoolCampaign.status || 'pending_approval' // Default to pending if status missing
            };
            campaignNumber = schoolCampaign.campaignNumber || 1;
            console.log('Found campaign in school embedded campaigns, campaignNumber:', campaignNumber);
          } else {
            console.error('Campaign not found for campaignId:', finalCampaignId);
            console.log('Available school campaigns:', schoolData.campaigns?.map((c: any) => c._id));
            // Keep finalCampaignId even if not found - order should still be associated with it
            // This ensures orders can be filtered properly later
          }
        }
      }
      
      // If no campaignId from request, try to get from user's active campaign
      if (!finalCampaignId && owner._id) {
        const userData = await User.findById(owner._id);
        if (userData && userData.activeCampaignId) {
          finalCampaignId = userData.activeCampaignId.toString();
          // Find the campaign in user's campaigns array to get campaignNumber
          const userCampaign = userData.campaigns?.find((c: any) => {
            const cId = c.campaignId?.toString() || c.campaignId;
            return cId === finalCampaignId;
          });
          campaignNumber = userCampaign?.campaignNumber || 1;
          
          // Fetch the campaign data directly
          if (finalCampaignId) {
            activeCampaign = await Campaign.findById(finalCampaignId);
          }
        }
      }
      
      // Fallback to school's active campaign if user doesn't have one
      if (!finalCampaignId) {
        const schoolActiveCampaign = schoolData.campaigns?.find((campaign: any) => campaign.isActive);
        campaignNumber = schoolActiveCampaign?.campaignNumber || schoolData.currentCampaignNumber || 1;
        finalCampaignId = schoolActiveCampaign?._id?.toString() || null;
        
        // Fetch campaign from Campaign collection if we have an ID
        if (finalCampaignId) {
          activeCampaign = await Campaign.findById(finalCampaignId);
        }
      }

      const storeData = await Store.findById(storeId);
      if (!storeData) {
        return res.status(400).json({ message: 'Store non trouvée.' });
      }

      // Récupérer les informations du vendeur (propriétaire de l'école)
      //const seller = await User.findOne({ school: schoolData._id, role: 'student' });
      //if (!seller) {
      //  return res.status(400).json({ message: 'Vendeur non trouvé.' });
      //}

      // Générer les données pour l'e-mail
      console.log(`Here is customer email: ${customerEmail}`)
      const parentFullName = owner.name; // Le nom du parent/vendeur
      
      // Confirmation de commande au client
      // À: Client, CC: vendeur
      // De: (Nom du parent - Campagne (nom école)) <commande@massibec.com>
      // Objet: (Commande #X)(Montant), pour (Nom du client), de (Nom du Parent) - Campagne (Nom école)
      // Use campaign data we already fetched
      const campaignData = activeCampaign;

      // Calculate donation breakdown
      let tipBreakdown = { studentCash: 0, studentSchoolAccount: 0, schoolProject: 0 };
      let studentDonationSplit = { studentAccount: 0, studentCash: 0 };
      
      // Legacy: Calculate old tip breakdown if tip is provided
      if (tip && tip > 0 && campaignData) {
        tipBreakdown = calculateDonationProfits(tip, campaignData);
      }
      
      // New: Calculate student donation split
      const studentDonationAmount = studentDonation || 0;
      if (studentDonationAmount > 0 && campaignData?.donationsForStudents?.splitConfig) {
        const splitConfig = campaignData.donationsForStudents.splitConfig;
        studentDonationSplit = {
          studentAccount: Math.round((studentDonationAmount * splitConfig.studentAccount / 100) * 100) / 100,
          studentCash: Math.round((studentDonationAmount * splitConfig.studentCash / 100) * 100) / 100
        };
      }

      // Check if campaign is in test mode
      const isTest = activeCampaign ? isTestCampaign(activeCampaign) : false;

      // Get owner contact info based on role
      // For delivery location, always use school address (makes more sense than personal address)
      // For phone, use owner's phone if available, otherwise school phone
      const deliveryAddress = schoolData.address || '';
      const deliveryCity = schoolData.ville || owner.schoolManagerInfo?.ville || '';
      const ownerPhone = owner.parentInfo?.telephone || owner.schoolManagerInfo?.telephone || owner.schoolManagerInfo?.cellulaire || schoolData.telephone || '';

      // Créer une nouvelle commande
      console.log('Creating order with campaignId:', finalCampaignId, 'campaignNumber:', campaignNumber, 'isTest:', isTest);
      const newCommande = new Order({
        user: owner._id,
        products: products.map((item: any) => ({
          product: item.product,
          quantity: item.quantity,
          productName: item.name,
          productPrice: item.price,
          productCost: item.cost
        })),
        totalAmount: totalAmount,
        customerEmail: customerEmail,
        customerName: customerName,
        store: storeId,
        orderId: newOrderId,
        school: schoolData._id,
        campaignId: finalCampaignId, // Always set campaignId if available, even if campaign not found in DB
        campaignNumber,
        phoneNumber: phoneNumber,
        // New donation fields
        studentDonation: studentDonation || 0,
        schoolDonation: schoolDonation || 0,
        studentDonationSplit: studentDonationSplit,
        // Legacy fields for backward compatibility
        tip: tip || studentDonation,
        tipBreakdown: tipBreakdown,
        isTest: isTest // Mark order as test if campaign is in test mode
        //orderDate: new Date(),
        //orderDeadline: schoolData.finCampagne,
        //deliveryDate: schoolData.dateDeLivraison,
        //deliveryLocation: owner.parentInfo.address,
      });

      await newCommande.save();
      console.log('Order created successfully with _id:', newCommande._id, 'campaignId:', newCommande.campaignId);

      // Calculate profit splits and benefits using campaign data
      const totalUnits = products.reduce((sum: number, item: any) => sum + item.quantity, 0);
      let totalStudentCashBenefit = 0;
      let totalStudentSchoolAccountBenefit = 0;
      let totalSchoolProjectBenefit = 0;
      let totalRaffleBenefit = 0;
      let studentPercentage = 0;

      if (campaignData && campaignData.profitSplits && campaignData.customPrices) {
        // Use campaign-specific profit splits
        products.forEach((item: any) => {
          const customPrice = campaignData.customPrices.find((cp: any) => 
            cp.productId.toString() === item.product.toString()
          );
          const profitSplit = campaignData.profitSplits.find((ps: any) => 
            ps.productId.toString() === item.product.toString()
          );
          
          if (customPrice && profitSplit) {
            // Use new fields if available, otherwise fallback to old fields
            const studentCash = Number(profitSplit.studentCash) || Number(profitSplit.student) || 0;
            const studentSchoolAccount = Number(profitSplit.studentSchoolAccount) || 0;
            const schoolProject = Number(profitSplit.schoolProject) || Number(profitSplit.school) || 0;
            const raffle = Number(profitSplit.raffle) || 0;
            
            totalStudentCashBenefit += studentCash * item.quantity;
            totalStudentSchoolAccountBenefit += studentSchoolAccount * item.quantity;
            totalSchoolProjectBenefit += schoolProject * item.quantity;
            totalRaffleBenefit += raffle * item.quantity;
          }
        });
        
        // Calculate percentage for legacy compatibility
        const totalStudentBenefit = totalStudentCashBenefit + totalStudentSchoolAccountBenefit;
        const totalBenefits = totalStudentBenefit + totalSchoolProjectBenefit + totalRaffleBenefit;
        studentPercentage = totalBenefits > 0 ? (totalStudentBenefit / totalBenefits) * 100 : 0;
      } else {
        // Fallback to old school-based calculation
        const totalProfit = products.reduce((sum: number, item: any) => sum + ((item.price - item.cost) * item.quantity), 0);
        const schoolStudentPercentage = schoolData.split?.studentBenefit || 85.6;
        const schoolOrganizationPercentage = schoolData.split?.organizationBenefit || 9.4;
        const schoolRafflePercentage = schoolData.split?.raffleBenefit || 5.0;
        
        // Assume all student benefit goes to cash for percentage fallback
        totalStudentCashBenefit = (totalProfit * schoolStudentPercentage / 100);
        totalStudentSchoolAccountBenefit = 0;
        totalSchoolProjectBenefit = (totalProfit * schoolOrganizationPercentage / 100);
        totalRaffleBenefit = (totalProfit * schoolRafflePercentage / 100);
        studentPercentage = schoolStudentPercentage;
      }

      // Calculate total donations for email
      const totalDonations = studentDonationValue + schoolDonationValue + tipValue;

      const emailParams = {
        to: customerEmail,
        cc: owner.email,
        from: `${parentFullName} - Campagne ${schoolData.name} <commande@massibec.com>`,
        subject: `(Commande #${newOrderId})($${(totalAmount + totalDonations).toFixed(2)}), pour (${customerName}), de (${parentFullName}) - Campagne (${schoolData.name})`,
        firstName: customerName,
        customerEmail: customerEmail,
        hoursAvailable: storeData.hoursAvailable,
        storeName: schoolData.name,
        products: products.map((item: any) => ({
          productId: item.product,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          amount: (item.price * item.quantity).toFixed(2),
        })),
        totalAmount: totalAmount,
        tip: tipValue, // Legacy field
        studentDonation: studentDonationValue,
        schoolDonation: schoolDonationValue,
        studentDonationSplit: studentDonationSplit,
        autoDeposit: autoDeposit,
        orderId: newOrderId,
        orderDate: new Date().toLocaleDateString('fr-FR'),
        orderDeadline: activeCampaign?.endDate ? new Date(activeCampaign.endDate).toLocaleDateString('fr-FR') : '',
        deliveryDate: activeCampaign?.deliveryDate ? new Date(activeCampaign.deliveryDate).toLocaleDateString('fr-FR') : '',
        deliveryLocation: deliveryAddress,
        deliveryCity: deliveryCity,
        sellerName: owner.name,
        sellerPhone: ownerPhone,
        sellerEmail: owner.email,
        // Campaign-specific data
        campaignId: campaignId || undefined,
        campaignNumber: campaignNumber,
        profitSplits: campaignData?.profitSplits || [],
        customPrices: campaignData?.customPrices || [],
        // New profit fields
        studentCashBenefit: totalStudentCashBenefit + (tipBreakdown?.studentCash || 0),
        studentSchoolAccountBenefit: totalStudentSchoolAccountBenefit + (tipBreakdown?.studentSchoolAccount || 0),
        schoolProjectBenefit: totalSchoolProjectBenefit + (tipBreakdown?.schoolProject || 0),
        raffleBenefit: totalRaffleBenefit,
        totalUnits: totalUnits,
        // Legacy fields for backward compatibility
        studentPercentage: studentPercentage,
        studentBenefit: totalStudentCashBenefit + totalStudentSchoolAccountBenefit + (tipBreakdown?.studentCash || 0) + (tipBreakdown?.studentSchoolAccount || 0),
        organizationBenefit: totalSchoolProjectBenefit + (tipBreakdown?.schoolProject || 0),
        totalStudentBenefit: totalStudentCashBenefit + totalStudentSchoolAccountBenefit + (tipBreakdown?.studentCash || 0) + (tipBreakdown?.studentSchoolAccount || 0),
        totalOrganizationBenefit: totalSchoolProjectBenefit + (tipBreakdown?.schoolProject || 0),
        totalRaffleBenefit: totalRaffleBenefit,
        email: owner.email,
        organizationType: schoolData.organizationType || 'school', // Pass organization type for dynamic terminology
      };

      // Envoyer l'e-mail de confirmation au client (avec vendeur en CC)
      await sendEmail(emailParams);

      // Confirmation d'une commande au vendeur (copie interne supprimée)
      // Ne pas envoyer l'email "Félicitations!" si le client est l'étudiant lui-même
      // L'étudiant recevra seulement la confirmation de commande en CC
      //if (customerEmail.toLowerCase() !== owner.email.toLowerCase()) {
      if (false) {
        // À: vendeur
        // De: Campagne Massibec <commande@massibec.com>
        // Objet: (Commande #X) -(Montant)- de: (Nom du parent) - nom école - Pour: Massibec
        // Texte: La distribution se fera à (Adresse de l'école) le (date de livraison)
        const emailParams2 = {
          to: owner.email,
          subject: `(Commande #${newOrderId}) -($${(totalAmount + tipValue).toFixed(2)})- de: (${parentFullName}) - ${schoolData.name} - Pour: Massibec`,
          studentName: owner.name,
          firstName: customerName,
          customerEmail: customerEmail,
          customerPhone: phoneNumber,
          schoolName: schoolData.name,
          schoolAddress: deliveryAddress,
          deliveryDate: activeCampaign?.deliveryDate ? new Date(activeCampaign.deliveryDate).toLocaleDateString('fr-FR') : '',
          products: products.map((item: any) => ({
            productId: item.product,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
            amount: (item.price * item.quantity).toFixed(2),
          })),
          totalAmount: totalAmount + tipValue,
          tip: tipValue,
          autoDeposit: autoDeposit,
          orderId: newOrderId,
          orderDate: new Date().toLocaleDateString('fr-FR'),

        };

        // Envoyer l'e-mail de confirmation à Massibec (vendeur avec facturation en CC)
        await sendSaleNotificationEmail(emailParams2);
      } else {
        console.log(`Skipping sale notification email - student ${owner.email} is ordering for themselves. They will receive the order confirmation in CC only.`);
      }

      res.status(201).json({ 
        message: 'Commande créée avec succès.',
        orderId: newOrderId,
        order: {
          _id: newCommande._id,
          orderId: newOrderId
        }
      });
    } catch (error: any) {
      console.error('Erreur lors de la création de la commande:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  }  else if (req.method === 'GET') {
    // Vérifier le token d'authentification
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas connecté' });
    }

    const userId = token.sub as string; // Extraire l'ID utilisateur depuis le token
    try {
      await dbConnect();

      const orConditions: any[] = [
        { user: userId },
        { store: userId }, // certains documents ont store == userId
      ];
      if (mongoose.Types.ObjectId.isValid(userId)) {
        orConditions.push({ user: new mongoose.Types.ObjectId(userId) });
        orConditions.push({ store: new mongoose.Types.ObjectId(userId) });
      }

      console.log('Fetching orders for user:', userId);
      console.log('OR conditions:', JSON.stringify(orConditions));

      // Check if campaignId is provided in query params
      const campaignId = req.query.campaignId as string;
      
      // Build query conditions
      const queryConditions: any = { $or: orConditions };
      
      // Add campaign filter if campaignId is provided
      // ONLY show orders from the active campaign (exclude legacy orders)
      if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
        queryConditions.$and = [
          { $or: orConditions },
          { campaignId: new mongoose.Types.ObjectId(campaignId) }
        ];
        delete queryConditions.$or; // Remove the simple $or since we're using $and now
        console.log('Filtering by campaignId:', campaignId, 'ONLY showing orders from this campaign');
      }

      // Use Mongoose model directly
      const orders = await Order.find(queryConditions)
        .sort({ createdAt: -1 })
        .lean();

      console.log('Found orders:', orders.length);

      return res.status(200).json(orders);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des commandes:', error);
      return res.status(400).json({ message: `Erreur lors de la récupération des commandes: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}
