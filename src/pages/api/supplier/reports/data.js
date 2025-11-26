import { getToken } from 'next-auth/jwt';
import { getSupplierIdFromToken, aggregateReportData, buildFilters } from '../../../../lib/reports/dataAggregator';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'supplier') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const supplierId = await getSupplierIdFromToken(token);
        if (!supplierId) {
            return res.status(404).json({ message: 'Fournisseur non trouvé' });
        }

        // Get campaigns to build filters
        const Campaign = (await import('../../../../models/Campaign')).default;
        const campaigns = await Campaign.find({ supplier: supplierId })
            .select('_id school campaignNumber')
            .lean();

        const campaignIds = campaigns.map(c => c._id.toString());
        const schoolIds = [...new Set(campaigns.map(c => {
            const schoolId = c.school?._id?.toString() || c.school?.toString();
            return schoolId;
        }).filter(Boolean))];

        // Build filters from query
        const filters = buildFilters(req.query, campaignIds, schoolIds);

        // Aggregate data
        const data = await aggregateReportData(supplierId, filters);

        // Return available fields and data summary
        res.status(200).json({
            summary: {
                totalOrders: data.studentOrders.length + data.storeOrders.length,
                totalStudentOrders: data.studentOrders.length,
                totalStoreOrders: data.storeOrders.length,
                totalCampaigns: data.campaigns.length,
                totalSchools: data.schools.length,
                totalProducts: data.products.length + data.bundles.length
            },
            filters: {
                dateRange: {
                    startDate: req.query.startDate || null,
                    endDate: req.query.endDate || null
                },
                schoolIds: req.query.schoolIds ? req.query.schoolIds.split(',') : [],
                campaignIds: req.query.campaignIds ? req.query.campaignIds.split(',') : [],
                status: req.query.status || null
            }
        });
    } catch (error) {
        console.error('Error fetching report data:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des données',
            error: error.message
        });
    }
}


