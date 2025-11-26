import dbConnect from '../../../lib/mongodb';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import Supplier from '../../../models/Supplier';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        await dbConnect();

        const { search } = req.query;

        // Find all campaigns that are:
        // 1. In production mode (mode === 'production')
        // 2. Active (isActive === true)
        // 3. Not completed
        const query = {
            mode: 'production',
            isActive: true,
            status: { $ne: 'completed' }
        };

        // Get campaigns with populated school data
        let campaigns = await Campaign.find(query)
            .populate('school', 'name address ville codePostal logo')
            .populate('supplier', 'name logo')
            .sort({ startDate: -1 })
            .lean();

        // Filter by school name if search term provided
        if (search && search.trim()) {
            const searchLower = search.toLowerCase().trim();
            campaigns = campaigns.filter(campaign => {
                const schoolName = campaign.school?.name?.toLowerCase() || '';
                const schoolCity = campaign.school?.ville?.toLowerCase() || '';
                const campaignCode = campaign.campaignCode?.toLowerCase() || '';
                return schoolName.includes(searchLower) ||
                    schoolCity.includes(searchLower) ||
                    campaignCode.includes(searchLower);
            });
        }

        // Format campaigns for frontend
        const formattedCampaigns = campaigns.map(campaign => ({
            _id: campaign._id,
            campaignCode: campaign.campaignCode,
            campaignNumber: campaign.campaignNumber,
            name: campaign.name,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            deliveryDate: campaign.deliveryDate,
            financialGoal: campaign.financialGoal,
            mode: campaign.mode,
            status: campaign.status,
            groups: campaign.groups || { enabled: false, list: [] },
            school: {
                _id: campaign.school?._id,
                name: campaign.school?.name,
                address: campaign.school?.address,
                ville: campaign.school?.ville,
                codePostal: campaign.school?.codePostal,
                logo: campaign.school?.logo
            },
            supplier: {
                _id: campaign.supplier?._id,
                name: campaign.supplier?.name,
                logo: campaign.supplier?.logo
            }
        }));

        res.status(200).json({ campaigns: formattedCampaigns });
    } catch (error) {
        console.error('Error fetching available campaigns:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des campagnes', error: error.message });
    }
}


