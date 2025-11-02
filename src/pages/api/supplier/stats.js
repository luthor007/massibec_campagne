import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import Order from '../../../models/Order';
import OrderStudent from '../../../models/OrderStudent';
import Product from '../../../models/Product';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }

  try {
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

    // Agrégation des statistiques principales
    const [
      totalVentes,
      nombreCommandes,
      ecolesActives,
      topEcoles,
      topProduits,
      campagnesParStatut,
      alertes
    ] = await Promise.all([
      // Total des ventes (utiliser OrderStudent qui contient les vraies commandes)
      OrderStudent.aggregate([
        ...(startDate ? [{ $match: { createdAt: { $gte: startDate } } }] : []),
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      
      // Nombre de commandes (utiliser OrderStudent)
      OrderStudent.countDocuments(startDate ? { createdAt: { $gte: startDate } } : {}),
      
      // Écoles actives (avec campagnes actives)
      School.countDocuments({ 
        status: 'approved'
      }),
      
      // Top écoles par ventes (utiliser OrderStudent)
      OrderStudent.aggregate([
        ...(startDate ? [{ $match: { createdAt: { $gte: startDate } } }] : []),
        { $group: { 
          _id: '$school', 
          totalVentes: { $sum: '$totalAmount' }, 
          nombreCommandes: { $sum: 1 } 
        } },
        { $lookup: { from: 'schools', localField: '_id', foreignField: '_id', as: 'school' } },
        { $unwind: '$school' },
        { $project: { 
          nomEcole: '$school.name', 
          totalVentes: 1, 
          nombreCommandes: 1 
        } },
        { $sort: { totalVentes: -1 } },
        { $limit: 10 }
      ]),
      
      // Top produits vendus (utiliser OrderStudent)
      OrderStudent.aggregate([
        ...(startDate ? [{ $match: { createdAt: { $gte: startDate } } }] : []),
        { $unwind: '$products' },
        { $group: { 
          _id: '$products.productName', 
          quantiteVendue: { $sum: '$products.quantity' },
          revenus: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
        } },
        { $project: { 
          nomProduit: '$_id', 
          quantiteVendue: 1, 
          revenus: 1 
        } },
        { $sort: { quantiteVendue: -1 } },
        { $limit: 10 }
      ]),
      
      // Campagnes par statut
      Campaign.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // Alertes et actions requises
      Promise.all([
        School.countDocuments({ status: 'pending' }),
        Campaign.countDocuments({ status: 'pending' }),
        Campaign.countDocuments({ 
          status: 'active',
          finCampagne: { $lt: now }
        })
      ])
    ]);

    // Calculer les revenus totaux
    const revenus = totalVentes[0]?.total || 0;
    const totalVentesFormate = totalVentes[0]?.total || 0;

    // Formater les alertes
    const [ecolesEnAttente, campagnesEnAttente, campagnesExpirees] = alertes;
    const alertesFormatees = [];
    
    if (ecolesEnAttente > 0) {
      alertesFormatees.push({
        type: 'warning',
        message: `${ecolesEnAttente} école(s) en attente d'approbation`,
        action: 'Voir les écoles en attente'
      });
    }
    
    if (campagnesEnAttente > 0) {
      alertesFormatees.push({
        type: 'info',
        message: `${campagnesEnAttente} campagne(s) en attente d'approbation`,
        action: 'Voir les campagnes en attente'
      });
    }
    
    if (campagnesExpirees > 0) {
      alertesFormatees.push({
        type: 'error',
        message: `${campagnesExpirees} campagne(s) expirée(s)`,
        action: 'Voir les campagnes expirées'
      });
    }

    // Formater les campagnes par statut
    const campagnesParStatutFormatees = {};
    campagnesParStatut.forEach(item => {
      campagnesParStatutFormatees[item._id] = item.count;
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
      campagnesParStatut: campagnesParStatutFormatees,
      tendances,
      alertes: alertesFormatees
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques fournisseur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques.' });
  }
}