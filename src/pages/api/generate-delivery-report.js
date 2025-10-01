// src/pages/api/generate-delivery-report.js
import dbConnect from '../../lib/mongodb';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import Order from '../../models/Order';
import OrderStudent from '../../models/OrderStudent';
import School from '../../models/School';
import User from '../../models/User';
import { Parser } from 'json2csv';

const formatDatePart = (value) => {
  if (!value) return 'date_inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'date_inconnue';
  }
  return date.toISOString().split('T')[0];
};

const normalizeFileName = (value) => {
  if (!value) return 'rapport';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }

  try {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas connecté' });
    }

    const user = await User.findById(token.sub);
    if (!user || user.role !== 'fournisseur') {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { schoolId } = req.query;

    if (!schoolId) {
      return res.status(400).json({ message: 'Le paramètre schoolId est requis.' });
    }

    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ message: 'Identifiant d’école invalide.' });
    }

    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(404).json({ message: 'École introuvable.' });
    }

    const activeCampaign = school.campaigns?.find((campaign) => campaign.isActive) || null;
    const campaignStart = activeCampaign?.startDate || school.debutCampagne;
    const campaignEnd = activeCampaign?.endDate || school.finCampagne;
    const currentDate = new Date();
    const isCampaignInProgress = campaignEnd ? new Date(campaignEnd) > currentDate : false;

    const dateFilter = {};
    if (campaignStart) {
      dateFilter.$gte = new Date(campaignStart);
    }
    if (!isCampaignInProgress && campaignEnd) {
      dateFilter.$lte = new Date(campaignEnd);
    }

    const reportData = [];

    if (isCampaignInProgress) {
      const orderFilter = { school: school._id };
      if (campaignStart || campaignEnd) {
        orderFilter.createdAt = dateFilter;
      }

      const orders = await Order.find(orderFilter).lean();

      const studentProductMap = new Map();

      orders.forEach((order) => {
        const studentKey = `${order.studentName || order.customerName} (${order.email || order.customerEmail})`;
        if (!studentProductMap.has(studentKey)) {
          studentProductMap.set(studentKey, {
            schoolName: school.name,
            studentName: order.studentName || order.customerName,
            email: order.email || order.customerEmail,
            phoneNumber: order.phoneNumber,
            totalUnits: order.totalUnits,
            totalAmount: order.totalAmount,
            beneficesEstimes: 0,
            products: {},
          });
        }

        const studentData = studentProductMap.get(studentKey);

        order.products.forEach((productItem) => {
          const quantity = productItem.quantity || 0;
          const profit = (productItem.productPrice - productItem.productCost) * quantity;

          studentData.products[productItem.productName] =
            (studentData.products[productItem.productName] || 0) + quantity;

          studentData.beneficesEstimes += profit;
        });
      });

      studentProductMap.forEach((studentData) => {
        reportData.push({
          Type: 'Campagne en cours',
          École: studentData.schoolName,
          'Nom de l\'étudiant': studentData.studentName,
          Email: studentData.email,
          'Numéro de téléphone': studentData.phoneNumber,
          'Total d\'unités': studentData.totalUnits,
          'Montant total': Number(studentData.totalAmount || 0).toFixed(2),
          'Bénéfices estimés': studentData.beneficesEstimes.toFixed(2),
          'Produits vendus': Object.entries(studentData.products)
            .map(([name, qty]) => `${name}: ${qty}`)
            .join('; '),
        });
      });
    } else {
      const orderStudentFilter = { school: school._id };
      if (campaignStart || campaignEnd) {
        orderStudentFilter.timestamp = dateFilter;
      }

      const orderStudents = await OrderStudent.find(orderStudentFilter).lean();

      orderStudents.forEach((orderStudent) => {
        reportData.push({
          Type: 'Campagne terminée',
          École: school.name,
          Timestamp: orderStudent.timestamp?.toISOString() ?? '',
          Email: orderStudent.email,
          'Nom de l\'étudiant': orderStudent.studentName,
          'Numéro de téléphone': orderStudent.phoneNumber,
          Produits: orderStudent.products
            .map((product) => `${product.productName} (Quantité: ${product.quantity}, Prix unitaire: ${product.price.toFixed(2)}$)`)
            .join('; '),
          'Total d\'unités': orderStudent.totalUnits,
          'Montant total': orderStudent.totalAmount.toFixed(2),
          'Montant payé': orderStudent.amountPaid.toFixed(2),
          'ID de commande': orderStudent.orderId,
          'Montant du transfert': orderStudent.transferAmount ? orderStudent.transferAmount.toFixed(2) : 'N/A',
          'Bénéfice pour l\'élève': orderStudent.studentBenefit.toFixed(2),
          'Bénéfice pour le tirage': orderStudent.raffleBenefit.toFixed(2),
          'Bénéfice pour l\'organisation': orderStudent.organizationBenefit.toFixed(2),
          'Bonus pour l\'organisation': orderStudent.bonusOrganization ? orderStudent.bonusOrganization.toFixed(2) : 'N/A',
          'Créé le': orderStudent.createdAt?.toISOString() ?? '',
        });
      });
    }

    if (!reportData.length) {
      return res.status(404).json({ message: 'Aucune donnée disponible pour générer le rapport.' });
    }

    const fields = [
      'Type',
      'École',
      'Timestamp',
      'Email',
      'Nom de l\'étudiant',
      'Numéro de téléphone',
      'Produits',
      'Total d\'unités',
      'Montant total',
      'Montant payé',
      'ID de commande',
      'Montant du transfert',
      'Bénéfice pour l\'élève',
      'Bénéfice pour le tirage',
      'Bénéfice pour l\'organisation',
      'Bonus pour l\'organisation',
      'Créé le',
    ];

    const parser = new Parser({ fields, defaultValue: 'N/A' });
    const csv = parser.parse(reportData);

    const safeSchoolName = normalizeFileName(school.name);
    const startPart = formatDatePart(campaignStart);
    const endPart = formatDatePart(campaignEnd);
    const fileName = `${safeSchoolName || 'rapport'}_du_${startPart}_au_${endPart}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Erreur lors de la génération du rapport de livraison:', error);
    return res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
  }
}
