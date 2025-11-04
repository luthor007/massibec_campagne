// pages/api/orderStudent.js

import dbConnect from '../../lib/mongodb';
import OrderStudent from '../../models/OrderStudent';
import School from '../../models/School';
import { getNextSequence } from '../../utils/getNextSequence';
import { calculateOrderProfits, getCampaignDataWithFallback, isTestCampaign } from '../../utils/campaignHelpers';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const { schoolId, page = 1, limit = 1000, sortBy = 'timestamp', sortOrder = 'asc' } = req.query;
      
      // Build query based on filters
      const query = {};
      if (schoolId) {
        query.school = schoolId;
      }

      // Calculate skip value for pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build sort object
      const sort = {
        [sortBy]: sortOrder === 'desc' ? -1 : 1
      };

      // Fetch orders with pagination and sorting
      const orders = await OrderStudent
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('school', 'name code'); // Populate school details if needed

      // Get total count for pagination
      const totalOrders = await OrderStudent.countDocuments(query);

      // Calculate totals
      const aggregatedData = await OrderStudent.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
            totalUnits: { $sum: '$totalUnits' },
            totalStudentBenefit: { $sum: '$studentBenefit' },
            totalOrganizationBenefit: { $sum: '$organizationBenefit' },
            totalRaffleBenefit: { $sum: '$raffleBenefit' }
          }
        }
      ]);

      res.status(200).json({
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / parseInt(limit)),
          totalOrders,
          hasMore: skip + orders.length < totalOrders
        },
        summary: aggregatedData[0] || {
          totalSales: 0,
          totalUnits: 0,
          totalStudentBenefit: 0,
          totalOrganizationBenefit: 0,
          totalRaffleBenefit: 0
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des commandes.' });
    }
  } else if (req.method === 'POST') {
    const {
      email,
      studentName,
      phoneNumber,
      schoolId,
      products,
      totalUnits,
      totalAmount,
      amountPaid,
      transferAmount,
      bonusOrganization,
    } = req.body;

    // Validation des champs requis
    if (
      !email ||
      !studentName ||
      !phoneNumber ||
      !schoolId ||
      !products || products.length === 0 ||
      typeof totalUnits === 'undefined' ||
      typeof totalAmount === 'undefined' ||
      typeof amountPaid === 'undefined'
    ) {
      return res.status(400).json({ message: 'Certains champs requis sont manquants.' });
    }



    try {
      // Récupérer l'école pour obtenir les splits
      const school = await School.findById(schoolId);
      if (!school) {
        return res.status(404).json({ message: 'École non trouvée.' });
      }

      // Verify that the school is approved
      if (school.status !== 'approved') {
        return res.status(403).json({ 
          message: 'Cette école n\'est pas approuvée. Les commandes ne peuvent pas être passées.' 
        });
      }

      const activeCampaign = school.campaigns?.find((campaign) => campaign.isActive);
      const campaignNumber = activeCampaign?.campaignNumber || school.currentCampaignNumber || 1;

      // Get campaign data with fallback to school data
      const { campaign, fallbackSplit } = await getCampaignDataWithFallback(schoolId, school);

      // Check if campaign is in test mode - also check Campaign collection if needed
      let isTest = false;
      if (campaign) {
        isTest = isTestCampaign(campaign);
      } else if (activeCampaign?._id) {
        // Try to fetch from Campaign collection
        const Campaign = (await import('../../models/Campaign')).default;
        const campaignFromDb = await Campaign.findById(activeCampaign._id).lean();
        if (campaignFromDb) {
          isTest = isTestCampaign(campaignFromDb);
        }
      }

      // Calculer le profit par produit et les bénéfices using campaign data
      let totalStudentCashBenefit = 0;
      let totalStudentSchoolAccountBenefit = 0;
      let totalSchoolProjectBenefit = 0;
      let totalRaffleBenefit = 0;

      const productMap = new Map();

      products.forEach(product => {
        const { productName, quantity, price, cost } = product;
        
        // Try to find product-specific profit split in campaign
        const profitSplit = campaign?.profitSplits?.find(ps => 
          ps.productId?.toString() === product.productId?.toString()
        );
        
        let studentCashBenefit, studentSchoolAccountBenefit, schoolProjectBenefit, raffleBenefit;
        
        if (profitSplit && campaign.profitSplitType === 'absolute') {
          // Use absolute per-unit values from campaign
          const studentCash = Number(profitSplit.studentCash) || Number(profitSplit.student) || 0;
          const studentSchoolAccount = Number(profitSplit.studentSchoolAccount) || 0;
          const schoolProject = Number(profitSplit.schoolProject) || Number(profitSplit.school) || 0;
          const raffle = Number(profitSplit.raffle) || 0;
          
          studentCashBenefit = studentCash * quantity;
          studentSchoolAccountBenefit = studentSchoolAccount * quantity;
          schoolProjectBenefit = schoolProject * quantity;
          raffleBenefit = raffle * quantity;
        } else {
          // Fallback to percentage calculation using school.split
          const profit = (price - cost) * quantity;
          const studentPercentage = fallbackSplit?.studentBenefit || 85.6;
          const organizationPercentage = fallbackSplit?.organizationBenefit || 9.4;
          const rafflePercentage = fallbackSplit?.raffleBenefit || 5.0;
          
          // Assume all student benefit goes to cash for percentage fallback
          studentCashBenefit = profit * (studentPercentage / 100);
          studentSchoolAccountBenefit = 0;
          schoolProjectBenefit = profit * (organizationPercentage / 100);
          raffleBenefit = profit * (rafflePercentage / 100);
        }
        
        if (productMap.has(productName)) {
          // Add quantity to existing product
          const existing = productMap.get(productName);
          existing.quantity += quantity;
          existing.studentCashBenefit += studentCashBenefit;
          existing.studentSchoolAccountBenefit += studentSchoolAccountBenefit;
          existing.schoolProjectBenefit += schoolProjectBenefit;
          existing.raffleBenefit += raffleBenefit;
        } else {
          // Create new product entry
          const profit = (price - cost) * quantity;
          productMap.set(productName, {
            productName,
            quantity,
            price,
            cost,
            profit,
            studentCashBenefit,
            studentSchoolAccountBenefit,
            schoolProjectBenefit,
            raffleBenefit,
            // Legacy fields for backward compatibility
            studentBenefit: studentCashBenefit + studentSchoolAccountBenefit,
            organizationBenefit: schoolProjectBenefit,
          });
        }
        
        totalStudentCashBenefit += studentCashBenefit;
        totalStudentSchoolAccountBenefit += studentSchoolAccountBenefit;
        totalSchoolProjectBenefit += schoolProjectBenefit;
        totalRaffleBenefit += raffleBenefit;
      });

      const calculatedProducts = Array.from(productMap.values());

      // Générer le nouvel orderId unique par campagne
      // Compter les commandes existantes pour cette campagne spécifique
      const existingOrdersCount = await OrderStudent.countDocuments({ 
        school: schoolId, 
        campaignNumber: campaignNumber 
      });
      const newOrderId = existingOrdersCount + 1;

      // Créer la nouvelle commande étudiante
      const orderStudent = new OrderStudent({
        timestamp: new Date(),
        email,
        studentName,
        phoneNumber,
        school: schoolId,
        campaignNumber,
        products: calculatedProducts,
        totalUnits,
        totalAmount,
        amountPaid,
        transferAmount,
        bonusOrganization,
        studentCashBenefit: totalStudentCashBenefit,
        studentSchoolAccountBenefit: totalStudentSchoolAccountBenefit,
        schoolProjectBenefit: totalSchoolProjectBenefit,
        raffleBenefit: totalRaffleBenefit,
        orderId: newOrderId,
        isTest: isTest, // Mark order as test if campaign is in test mode
        // Legacy fields for backward compatibility
        studentBenefit: totalStudentCashBenefit + totalStudentSchoolAccountBenefit,
        organizationBenefit: totalSchoolProjectBenefit,
      });

      await orderStudent.save();

      // Note: L'étudiant reçoit déjà les confirmations de commande en CC dans les emails envoyés aux clients
      // donc pas besoin d'envoyer un email de félicitation supplémentaire ici

      res.status(201).json(orderStudent);
    } catch (error) {
      console.error('Erreur lors de la création de la commande étudiante:', error);
      res.status(500).json({ message: `Erreur lors de la création de la commande étudiante: ${error.message}` });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      console.log(id)

      if (!id) {
        return res.status(400).json({ message: 'Order ID is required' });
      }

      // Find the order first to get the school ID
      const order = await OrderStudent.findById(id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Delete the order
      await OrderStudent.findByIdAndDelete(id);

      // Optionally: Update the school's order counter or other related data
      // const school = await School.findById(order.school);
      // ... update school if needed ...

      res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ message: 'Error deleting order' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).json({ message: 'Method not allowed' });
  }
}
