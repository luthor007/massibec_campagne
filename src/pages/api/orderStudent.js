// pages/api/orderStudent.js

import dbConnect from '../../lib/mongodb';
import OrderStudent from '../../models/OrderStudent';
import School from '../../models/School';
import { getNextSequence } from '../../utils/getNextSequence';
import { sendStudentOrderEmail } from '../../utils/gmailMailer'; // Import de la nouvelle fonction

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


      const { studentBenefit, organizationBenefit, raffleBenefit } = school.split;

      // Calculer le profit par produit et les bénéfices
      let totalStudentBenefit = 0;
      let totalOrganizationBenefit = 0;
      let totalRaffleBenefit = 0;

      const productMap = new Map();

      products.forEach(product => {
        const { productName, quantity, price, cost } = product;
        
        if (productMap.has(productName)) {
          // Add quantity to existing product
          const existing = productMap.get(productName);
          existing.quantity += quantity;
          existing.profit = (price - cost) * existing.quantity;
          existing.studentBenefit = existing.profit * (studentBenefit / 100);
          existing.organizationBenefit = existing.profit * (organizationBenefit / 100);
          existing.raffleBenefit = existing.profit * (raffleBenefit / 100);
        } else {
          // Create new product entry
          const profit = (price - cost) * quantity;
          productMap.set(productName, {
            productName,
            quantity,
            price,
            cost,
            profit,
            studentBenefit: profit * (studentBenefit / 100),
            organizationBenefit: profit * (organizationBenefit / 100),
            raffleBenefit: profit * (raffleBenefit / 100),
          });
        }
      });

      const calculatedProducts = Array.from(productMap.values());

      // Générer le nouvel orderId
      const newOrderId = school.orderCounter + 1;
      school.orderCounter = newOrderId;
      await school.save();

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
        studentBenefit: totalStudentBenefit,
        organizationBenefit: totalOrganizationBenefit,
        raffleBenefit: totalRaffleBenefit,
        orderId: newOrderId,
      });

      await orderStudent.save();

      // Générer les instructions de paiement
      const paymentInstructions = `
        <h3 style="color: #4A90E2; font-weight: bold;">Transfert Interac</h3>
        <p>Pour finaliser votre commande, merci d'effectuer le transfert Interac à :</p>
        <strong>Destinataire : </strong>Massibec<br/>
        <strong>Adresse courriel : </strong> <a href="mailto:facturation@massibec.com">facturation@massibec.com</a><br/>
        <strong>Montant : </strong><strong>${totalAmount.toFixed(2)}$</strong><br/>
        <strong>Message : </strong>@#&*-${school.code}-${newOrderId}-${studentName}<br/>
        <strong>IMPORTANT :</strong> Assurez-vous d'effectuer le virement dans les plus brefs délais pour que votre commande soit traitée.
      `;

      // Envoyer l'e-mail à l'étudiant
      await sendStudentOrderEmail({
        studentPercentage: studentBenefit,
        orderId: newOrderId,
        studentName,
        email,
        phoneNumber,
        schoolName: school.name,
        products: calculatedProducts,
        totalUnits,
        totalAmount,
        amountPaid,
        paymentInstructions,
      });

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
