import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import Order from '../../../models/Order';
import OrderStudent from '../../../models/OrderStudent';
import Product from '../../../models/Product';
import SupplierManager from '../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }

  try {
    // Authentification et récupération du fournisseur
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'supplier') {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Get supplier for this user
    const supplierManager = await SupplierManager.findOne({
      user: token.sub,
      status: 'active'
    }).populate('supplier');

    if (!supplierManager || !supplierManager.supplier) {
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }

    const supplierId = supplierManager.supplier._id;

    // Récupérer toutes les campagnes de ce fournisseur
    const supplierCampaigns = await Campaign.find({ supplier: supplierId })
      .populate('school', 'name nomEcole')
      .select('_id name campaignNumber school status')
      .lean();

    const campaignIds = supplierCampaigns.map(c => c._id);
    const supplierSchoolIds = [...new Set(supplierCampaigns.map(c => {
      const schoolId = c.school?._id?.toString() || c.school?.toString();
      return schoolId;
    }).filter(Boolean))];

    // Si le fournisseur n'a pas de campagnes, retourner des stats vides
    if (campaignIds.length === 0) {
      return res.status(200).json({
        totalVentes: 0,
        nombreCommandes: 0,
        ecolesActives: 0,
        revenus: 0,
        topEcoles: [],
        topProduits: [],
        campagnesParMode: {},
        tendances: [],
        alertes: []
      });
    }

    // Créer un map pour vérifier rapidement si une commande appartient à ce fournisseur
    const campaignMap = new Map();
    supplierCampaigns.forEach(campaign => {
      const schoolId = campaign.school?._id?.toString() || campaign.school?.toString();
      const key = `${schoolId}-${campaign.campaignNumber}`;
      campaignMap.set(key, true);
    });

    const { periode = 'mois' } = req.query;

    // Calculer les dates selon la période
    const now = new Date();
    let startDate;

    switch (periode) {
      case 'semaine':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mois':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'annee':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        startDate = null; // Pas de filtre de date pour "tout le temps"
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Construire le filtre pour OrderStudent (par school et campaignNumber)
    const orderStudentMatch = [];
    if (startDate) {
      orderStudentMatch.push({ createdAt: { $gte: startDate } });
    }
    // Filtrer par les écoles du fournisseur
    if (supplierSchoolIds.length > 0) {
      const schoolObjectIds = supplierSchoolIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      if (schoolObjectIds.length > 0) {
        orderStudentMatch.push({ school: { $in: schoolObjectIds } });
      }
    }

    // Récupérer tous les OrderStudent correspondants et filtrer par campaignNumber
    // Toujours filtrer par les écoles du fournisseur si on a des écoles
    const query = {};
    if (orderStudentMatch.length > 0) {
      query.$and = orderStudentMatch;
    } else if (supplierSchoolIds.length > 0) {
      const schoolObjectIds = supplierSchoolIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
      if (schoolObjectIds.length > 0) {
        query.school = { $in: schoolObjectIds };
      }
    }

    const allOrderStudents = await OrderStudent.find(query).lean();

    // Filtrer les OrderStudent par les campagnes du fournisseur
    const filteredOrderStudents = allOrderStudents.filter(order => {
      if (!order.campaignNumber) return false;
      const schoolId = order.school?.toString() || order.school;
      const key = `${schoolId}-${order.campaignNumber}`;
      return campaignMap.has(key);
    });

    // Agrégation des statistiques principales
    const [
      totalVentes,
      nombreCommandes,
      ecolesActives,
      topEcoles,
      topProduits,
      campagnesParMode,
      alertes
    ] = await Promise.all([
      // Total des ventes (calculé depuis les OrderStudent filtrés)
      Promise.resolve([{
        total: filteredOrderStudents.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      }]),

      // Nombre de commandes (depuis les OrderStudent filtrés)
      Promise.resolve(filteredOrderStudents.length),

      // Écoles actives (avec campagnes actives du fournisseur)
      (async () => {
        if (supplierSchoolIds.length === 0) return 0;
        const schoolObjectIds = supplierSchoolIds
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id));
        if (schoolObjectIds.length === 0) return 0;
        return School.countDocuments({
          _id: { $in: schoolObjectIds },
          status: 'approved'
        });
      })(),

      // Top écoles par ventes (calculé depuis les OrderStudent filtrés)
      (async () => {
        const schoolStats = filteredOrderStudents.reduce((acc, order) => {
          const schoolId = order.school?.toString() || order.school;
          if (!acc[schoolId]) {
            acc[schoolId] = {
              _id: schoolId,
              totalVentes: 0,
              nombreCommandes: 0
            };
          }
          acc[schoolId].totalVentes += order.totalAmount || 0;
          acc[schoolId].nombreCommandes += 1;
          return acc;
        }, {});

        const schoolStatsArray = Object.values(schoolStats);
        const topEcolesWithNames = await Promise.all(
          schoolStatsArray.map(async (item) => {
            const school = await School.findById(item._id).lean();
            return {
              nomEcole: school?.name || 'École inconnue',
              totalVentes: item.totalVentes,
              nombreCommandes: item.nombreCommandes
            };
          })
        );

        return topEcolesWithNames
          .sort((a, b) => b.totalVentes - a.totalVentes)
          .slice(0, 10);
      })(),

      // Top produits vendus (calculé depuis les OrderStudent filtrés)
      Promise.resolve(
        Object.values(
          filteredOrderStudents.reduce((acc, order) => {
            if (order.products && Array.isArray(order.products)) {
              order.products.forEach(product => {
                const productName = product.productName;
                if (!acc[productName]) {
                  acc[productName] = {
                    nomProduit: productName,
                    quantiteVendue: 0,
                    revenus: 0
                  };
                }
                acc[productName].quantiteVendue += product.quantity || 0;
                acc[productName].revenus += (product.quantity || 0) * (product.price || 0);
              });
            }
            return acc;
          }, {})
        )
          .sort((a, b) => b.quantiteVendue - a.quantiteVendue)
          .slice(0, 10)
      ),

      // Campagnes par mode (Test/Production) - filtrées par fournisseur
      Campaign.aggregate([
        { $match: { supplier: supplierId } },
        { $group: { _id: { $ifNull: ['$mode', 'test'] }, count: { $sum: 1 } } }
      ]),

      // Alertes et actions requises - filtrées par fournisseur
      Promise.all([
        Campaign.countDocuments({
          supplier: supplierId,
          status: 'active',
          finCampagne: { $lt: now }
        })
      ])
    ]);

    // Calculer les revenus totaux
    const revenus = totalVentes[0]?.total || 0;
    const totalVentesFormate = totalVentes[0]?.total || 0;

    // Formater les alertes
    const [campagnesExpirees] = alertes;
    const alertesFormatees = [];

    if (campagnesExpirees > 0) {
      alertesFormatees.push({
        type: 'error',
        message: `${campagnesExpirees} campagne(s) expirée(s)`,
        action: 'Voir les campagnes expirées'
      });
    }

    // Formater les campagnes par mode
    const campagnesParModeFormatees = {};
    campagnesParMode.forEach(item => {
      const mode = item._id || 'test';
      campagnesParModeFormatees[mode] = item.count;
    });

    // Générer des tendances (mock pour l'instant)
    const tendances = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      tendances.push({
        date: date.toISOString().split('T')[0],
        ventes: Math.floor(Math.random() * 1000) + 500,
        commandes: Math.floor(Math.random() * 50) + 20
      });
    }

    const stats = {
      totalVentes: totalVentesFormate,
      nombreCommandes,
      ecolesActives,
      revenus,
      topEcoles,
      topProduits,
      campagnesParMode: campagnesParModeFormatees,
      tendances,
      alertes: alertesFormatees
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques fournisseur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques.' });
  }
}