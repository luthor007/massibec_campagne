// lib/supplierDashboardSSR.js
import dbConnect from './mongodb';
import School from '../models/School';
import Campaign from '../models/Campaign';
import Order from '../models/Order';
import OrderStudent from '../models/OrderStudent';
import Product from '../models/Product';
import SupplierManager from '../models/SupplierManager';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

// Helper function to get supplier ID from token
async function getSupplierIdFromToken(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'supplier') {
        return null;
    }

    const supplierManager = await SupplierManager.findOne({
        user: token.sub,
        status: 'active'
    }).populate('supplier');

    if (!supplierManager || !supplierManager.supplier) {
        return null;
    }

    return supplierManager.supplier._id;
}

// Fetch supplier schools (similar to /api/supplier/schools)
export async function getSupplierSchoolsSSR(req) {
    try {
        await dbConnect();
        const supplierId = await getSupplierIdFromToken(req);
        if (!supplierId) {
            return { schools: [], error: 'Supplier not found' };
        }

        // This is a simplified version - you may need to include more logic from the API
        const campaigns = await Campaign.find({ supplier: supplierId })
            .populate('school')
            .lean();

        const schoolIds = [...new Set(campaigns.map(c => {
            const schoolId = c.school?._id?.toString() || c.school?.toString();
            return schoolId;
        }).filter(Boolean))];

        if (schoolIds.length === 0) {
            return { schools: [] };
        }

        const schools = await School.find({ _id: { $in: schoolIds } })
            .select('name email telephone address ville codePostal logo status createdAt')
            .lean();

        // Add active campaign info to each school
        const schoolsWithCampaigns = schools.map(school => {
            const schoolCampaigns = campaigns.filter(c => {
                const campaignSchoolId = c.school?._id?.toString() || c.school?.toString();
                return campaignSchoolId === school._id.toString();
            });

            const activeCampaign = schoolCampaigns.find(c => c.status === 'active' || c.isActive);

            // Serialize activeCampaign properly - only include JSON-serializable fields
            let serializedActiveCampaign = null;
            if (activeCampaign) {
                serializedActiveCampaign = {
                    _id: activeCampaign._id?.toString() || activeCampaign._id,
                    name: activeCampaign.name || null,
                    nomCampagne: activeCampaign.name || `Campagne #${activeCampaign.campaignNumber || ''}`,
                    campaignNumber: activeCampaign.campaignNumber || null,
                    status: activeCampaign.status || null,
                    mode: activeCampaign.mode || 'test',
                    startDate: activeCampaign.startDate ? (activeCampaign.startDate instanceof Date ? activeCampaign.startDate.toISOString() : activeCampaign.startDate) : null,
                    endDate: activeCampaign.endDate ? (activeCampaign.endDate instanceof Date ? activeCampaign.endDate.toISOString() : activeCampaign.endDate) : null,
                    deliveryDate: activeCampaign.deliveryDate ? (activeCampaign.deliveryDate instanceof Date ? activeCampaign.deliveryDate.toISOString() : activeCampaign.deliveryDate) : null,
                    financialGoal: activeCampaign.financialGoal || null,
                    objectifFinancier: activeCampaign.financialGoal || null,
                    school: activeCampaign.school?._id?.toString() || activeCampaign.school?.toString() || null,
                    supplier: activeCampaign.supplier?.toString() || activeCampaign.supplier || null,
                    createdAt: activeCampaign.createdAt ? (activeCampaign.createdAt instanceof Date ? activeCampaign.createdAt.toISOString() : activeCampaign.createdAt) : null,
                    updatedAt: activeCampaign.updatedAt ? (activeCampaign.updatedAt instanceof Date ? activeCampaign.updatedAt.toISOString() : activeCampaign.updatedAt) : null
                };
            }

            return {
                ...school,
                _id: school._id.toString(),
                activeCampaign: serializedActiveCampaign,
                firstCampaignDate: schoolCampaigns.length > 0 && schoolCampaigns[0].createdAt
                    ? (schoolCampaigns[0].createdAt instanceof Date ? schoolCampaigns[0].createdAt.toISOString() : schoolCampaigns[0].createdAt)
                    : null
            };
        });

        return { schools: schoolsWithCampaigns };
    } catch (error) {
        console.error('Error fetching supplier schools SSR:', error);
        return { schools: [], error: error.message };
    }
}

// Fetch supplier stats (similar to /api/supplier/stats)
export async function getSupplierStatsSSR(req, periode = 'mois') {
    try {
        await dbConnect();
        const supplierId = await getSupplierIdFromToken(req);
        if (!supplierId) {
            return { stats: null, error: 'Supplier not found' };
        }

        // Get campaigns
        const supplierCampaigns = await Campaign.find({ supplier: supplierId })
            .populate('school', 'name nomEcole')
            .select('_id name campaignNumber school status mode')
            .lean();

        const campaignIds = supplierCampaigns.map(c => c._id);
        const supplierSchoolIds = [...new Set(supplierCampaigns.map(c => {
            const schoolId = c.school?._id?.toString() || c.school?.toString();
            return schoolId;
        }).filter(Boolean))];

        if (campaignIds.length === 0) {
            return {
                stats: {
                    totalVentes: 0,
                    nombreCommandes: 0,
                    ecolesActives: 0,
                    revenus: 0,
                    topEcoles: [],
                    topProduits: [],
                    campagnesParMode: {},
                    tendances: [],
                    alertes: []
                }
            };
        }

        // Calculate date range
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
                startDate = null;
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Build query for OrderStudent
        const orderStudentMatch = [];
        if (startDate) {
            orderStudentMatch.push({ createdAt: { $gte: startDate } });
        }
        if (supplierSchoolIds.length > 0) {
            const schoolObjectIds = supplierSchoolIds
                .filter(id => mongoose.Types.ObjectId.isValid(id))
                .map(id => new mongoose.Types.ObjectId(id));
            if (schoolObjectIds.length > 0) {
                orderStudentMatch.push({ school: { $in: schoolObjectIds } });
            }
        }

        const query = orderStudentMatch.length > 0 ? { $and: orderStudentMatch } : {};
        const allOrderStudents = await OrderStudent.find(query).lean();

        // Filter by supplier campaigns
        const campaignMap = new Map();
        supplierCampaigns.forEach(campaign => {
            const schoolId = campaign.school?._id?.toString() || campaign.school?.toString();
            const key = `${schoolId}-${campaign.campaignNumber}`;
            campaignMap.set(key, true);
        });

        const filteredOrderStudents = allOrderStudents.filter(order => {
            if (!order.campaignNumber) return false;
            const schoolId = order.school?.toString() || order.school;
            const key = `${schoolId}-${order.campaignNumber}`;
            return campaignMap.has(key);
        });

        // Calculate stats
        const totalVentes = filteredOrderStudents.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const nombreCommandes = filteredOrderStudents.length;

        const ecolesActives = supplierSchoolIds.length > 0
            ? await School.countDocuments({
                _id: { $in: supplierSchoolIds.map(id => new mongoose.Types.ObjectId(id)) },
                status: 'approved'
            })
            : 0;

        // Top écoles
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

        const topEcoles = await Promise.all(
            Object.values(schoolStats).slice(0, 10).map(async (item) => {
                const school = await School.findById(item._id).lean();
                return {
                    nomEcole: school?.name || 'École inconnue',
                    totalVentes: item.totalVentes,
                    nombreCommandes: item.nombreCommandes
                };
            })
        );
        topEcoles.sort((a, b) => b.totalVentes - a.totalVentes);

        // Top produits
        const productStats = filteredOrderStudents.reduce((acc, order) => {
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
        }, {});

        const topProduits = Object.values(productStats)
            .sort((a, b) => b.quantiteVendue - a.quantiteVendue)
            .slice(0, 10);

        // Campagnes par mode
        const campagnesParModeResult = await Campaign.aggregate([
            { $match: { supplier: supplierId } },
            { $group: { _id: { $ifNull: ['$mode', 'test'] }, count: { $sum: 1 } } }
        ]);

        const campagnesParMode = {};
        campagnesParModeResult.forEach(item => {
            const mode = item._id || 'test';
            campagnesParMode[mode] = item.count;
        });

        // Alertes (reuse 'now' from line 126)
        const campagnesExpirees = await Campaign.countDocuments({
            supplier: supplierId,
            status: 'active',
            endDate: { $lt: now }
        });

        const alertes = [];
        if (campagnesExpirees > 0) {
            alertes.push({
                type: 'error',
                message: `${campagnesExpirees} campagne(s) expirée(s)`,
                action: 'Voir les campagnes expirées'
            });
        }

        // Tendances (simplified - 7 days)
        const tendances = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date.setHours(0, 0, 0, 0));
            const dayEnd = new Date(date.setHours(23, 59, 59, 999));

            const dayOrders = filteredOrderStudents.filter(order => {
                const orderDate = new Date(order.createdAt);
                return orderDate >= dayStart && orderDate <= dayEnd;
            });

            tendances.push({
                date: dayStart.toISOString().split('T')[0],
                ventes: dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
                commandes: dayOrders.length
            });
        }

        // Calculate revenues (10% of total sales as a simplified calculation)
        const revenus = totalVentes * 0.1;

        const stats = {
            totalVentes,
            nombreCommandes,
            ecolesActives,
            revenus,
            topEcoles,
            topProduits,
            campagnesParMode,
            tendances,
            alertes
        };

        return { stats };
    } catch (error) {
        console.error('Error fetching supplier stats SSR:', error);
        return {
            stats: {
                totalVentes: 0,
                nombreCommandes: 0,
                ecolesActives: 0,
                revenus: 0,
                topEcoles: [],
                topProduits: [],
                campagnesParMode: {},
                tendances: [],
                alertes: []
            },
            error: error.message
        };
    }
}

// Get supplier ID
export async function getSupplierIdSSR(req) {
    try {
        await dbConnect();
        const supplierId = await getSupplierIdFromToken(req);
        if (!supplierId) {
            return { supplierId: null };
        }
        return { supplierId: supplierId.toString() };
    } catch (error) {
        console.error('Error fetching supplier ID SSR:', error);
        return { supplierId: null };
    }
}

