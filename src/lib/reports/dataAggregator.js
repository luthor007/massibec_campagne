import dbConnect from '../mongodb';
import Order from '../../models/Order';
import OrderStudent from '../../models/OrderStudent';
import Campaign from '../../models/Campaign';
import School from '../../models/School';
import Product from '../../models/Product';
import User from '../../models/User';
import mongoose from 'mongoose';

/**
 * Get supplier ID from token
 */
export async function getSupplierIdFromToken(token) {
    const SupplierManager = mongoose.models.SupplierManager || (await import('../../models/SupplierManager')).default;

    const supplierManager = await SupplierManager.findOne({
        user: token.sub,
        status: 'active'
    }).populate('supplier');

    if (!supplierManager || !supplierManager.supplier) {
        return null;
    }

    return supplierManager.supplier._id;
}

/**
 * Build filters from query parameters
 */
export function buildFilters(query, supplierCampaignIds, supplierSchoolIds) {
    const filters = {
        dateFilter: {},
        schoolFilter: {},
        campaignFilter: {},
        statusFilter: {}
    };

    // Date filter
    if (query.startDate || query.endDate) {
        filters.dateFilter.createdAt = {};
        if (query.startDate) {
            filters.dateFilter.createdAt.$gte = new Date(query.startDate);
        }
        if (query.endDate) {
            const end = new Date(query.endDate);
            end.setHours(23, 59, 59, 999);
            filters.dateFilter.createdAt.$lte = end;
        }
    }

    // School filter
    if (query.schoolIds) {
        const schoolIdArray = query.schoolIds.split(',').map(id => id.trim()).filter(Boolean);
        const filteredSchoolIds = schoolIdArray.filter(id => supplierSchoolIds.includes(id));
        if (filteredSchoolIds.length > 0) {
            const schoolObjectIds = filteredSchoolIds
                .filter(id => mongoose.Types.ObjectId.isValid(id))
                .map(id => new mongoose.Types.ObjectId(id));
            const schoolStrings = filteredSchoolIds.filter(id => !mongoose.Types.ObjectId.isValid(id));

            if (schoolObjectIds.length > 0 && schoolStrings.length > 0) {
                filters.schoolFilter.school = { $in: [...schoolObjectIds, ...schoolStrings] };
            } else if (schoolObjectIds.length > 0) {
                filters.schoolFilter.school = { $in: schoolObjectIds };
            } else {
                filters.schoolFilter.school = { $in: schoolStrings };
            }
        }
    } else if (supplierSchoolIds.length > 0) {
        const schoolObjectIds = supplierSchoolIds
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));
        const schoolStrings = supplierSchoolIds.filter(id => !mongoose.Types.ObjectId.isValid(id));

        if (schoolObjectIds.length > 0 && schoolStrings.length > 0) {
            filters.schoolFilter.school = { $in: [...schoolObjectIds, ...schoolStrings] };
        } else if (schoolObjectIds.length > 0) {
            filters.schoolFilter.school = { $in: schoolObjectIds };
        } else {
            filters.schoolFilter.school = { $in: schoolStrings };
        }
    }

    // Campaign filter
    if (query.campaignIds) {
        const campaignIdArray = query.campaignIds.split(',').map(id => id.trim()).filter(Boolean);
        const filteredCampaignIds = campaignIdArray.filter(id => supplierCampaignIds.includes(id));
        if (filteredCampaignIds.length > 0) {
            filters.campaignFilter.campaignId = { $in: filteredCampaignIds.map(id => new mongoose.Types.ObjectId(id)) };
        }
    }

    // Status filter
    if (query.status) {
        filters.statusFilter.status = query.status;
    }

    return filters;
}

/**
 * Aggregate all data for reports
 */
export async function aggregateReportData(supplierId, filters = {}) {
    await dbConnect();

    // Get all campaigns for this supplier
    const campaigns = await Campaign.find({ supplier: supplierId })
        .populate('school', 'name nomEcole code address ville codePostal telephone email')
        .lean();

    const campaignIds = campaigns.map(c => c._id);
    const schoolIds = [...new Set(campaigns.map(c => {
        const schoolId = c.school?._id?.toString() || c.school?.toString();
        return schoolId;
    }).filter(Boolean))];

    // Build query filters
    const dateFilter = filters.dateFilter || {};
    const schoolFilter = filters.schoolFilter || {};
    const campaignFilter = filters.campaignFilter || {};
    const statusFilter = filters.statusFilter || {};

    // Fetch student orders
    const studentOrdersQuery = {
        ...dateFilter,
        ...schoolFilter,
        ...statusFilter,
        isTest: { $ne: true }
    };

    const studentOrders = await OrderStudent.find(studentOrdersQuery)
        .populate('school', 'name nomEcole code address ville codePostal telephone email')
        .lean();

    // Filter student orders to match supplier's campaigns
    const filteredStudentOrders = studentOrders.filter(order => {
        if (!order.campaignNumber) return false;
        const schoolId = order.school?._id?.toString() || order.school?.toString();
        return campaigns.some(c => {
            const campaignSchoolId = c.school?._id?.toString() || c.school?.toString();
            return campaignSchoolId === schoolId && c.campaignNumber === order.campaignNumber;
        });
    });

    // Fetch store orders
    const storeOrdersQuery = {
        ...dateFilter,
        ...schoolFilter,
        ...campaignFilter,
        ...statusFilter,
        campaignId: { $in: campaignIds },
        isTest: { $ne: true }
    };

    const storeOrders = await Order.find(storeOrdersQuery)
        .populate('user', 'name email')
        .populate('campaignId', 'name campaignNumber campaignCode')
        .lean();

    // Fetch products
    const products = await Product.find({ supplier: supplierId })
        .select('name price cost deliveryCostToSchool image description casePack pallet')
        .lean();

    // Fetch bundles
    const Bundle = mongoose.models.Bundle || (await import('../../models/Bundle')).default;
    const bundles = await Bundle.find({ supplier: supplierId })
        .populate('includedProducts.product')
        .select('name price cost image description includedProducts')
        .lean();

    // Fetch schools
    const schoolObjectIds = schoolIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
    const schoolStrings = schoolIds.filter(id => !mongoose.Types.ObjectId.isValid(id));

    const schoolsQuery = {};
    if (schoolObjectIds.length > 0 && schoolStrings.length > 0) {
        schoolsQuery._id = { $in: [...schoolObjectIds, ...schoolStrings] };
    } else if (schoolObjectIds.length > 0) {
        schoolsQuery._id = { $in: schoolObjectIds };
    } else if (schoolStrings.length > 0) {
        schoolsQuery._id = { $in: schoolStrings };
    }

    const schools = Object.keys(schoolsQuery).length > 0
        ? await School.find(schoolsQuery)
            .select('name nomEcole code address ville codePostal telephone email status createdAt')
            .lean()
        : [];

    return {
        campaigns,
        studentOrders: filteredStudentOrders,
        storeOrders,
        products,
        bundles,
        schools
    };
}

/**
 * Flatten data for export (combines orders, products, schools, campaigns)
 */
export function flattenDataForExport(data, selectedFields = []) {
    const { campaigns, studentOrders, storeOrders, products, bundles, schools } = data;

    // Create maps for quick lookup
    const campaignMap = new Map();
    campaigns.forEach(c => {
        campaignMap.set(c._id.toString(), c);
        const schoolId = c.school?._id?.toString() || c.school?.toString();
        if (schoolId && c.campaignNumber !== null && c.campaignNumber !== undefined) {
            campaignMap.set(`${schoolId}-${c.campaignNumber}`, c);
        }
    });

    const schoolMap = new Map();
    schools.forEach(s => {
        schoolMap.set(s._id.toString(), s);
    });

    const productMap = new Map();
    [...products, ...bundles].forEach(p => {
        productMap.set(p._id.toString(), p);
    });

    const flattened = [];

    // Process student orders
    studentOrders.forEach(order => {
        const school = order.school || schoolMap.get(order.school?.toString());
        const schoolId = school?._id?.toString() || order.school?.toString();
        const campaign = campaignMap.get(`${schoolId}-${order.campaignNumber}`) ||
            campaigns.find(c => c.campaignNumber === order.campaignNumber);

        order.products?.forEach(product => {
            const row = {
                // Order info
                orderId: order.orderId,
                orderNumber: order.orderId,
                orderDate: order.createdAt || order.timestamp,
                orderStatus: order.status || 'Complété',
                orderType: 'Étudiant',

                // School info
                schoolName: school?.name || school?.nomEcole || '',
                schoolCode: school?.code || '',
                schoolAddress: [school?.address, school?.ville, school?.codePostal].filter(Boolean).join(', '),
                schoolPhone: school?.telephone || '',
                schoolEmail: school?.email || '',

                // Campaign info
                campaignName: campaign?.name || `Campagne #${order.campaignNumber}`,
                campaignNumber: order.campaignNumber || campaign?.campaignNumber,
                campaignCode: campaign?.campaignCode || '',
                campaignStartDate: campaign?.startDate,
                campaignEndDate: campaign?.endDate,
                campaignDeliveryDate: campaign?.deliveryDate,
                campaignStatus: campaign?.status || '',
                campaignMode: campaign?.mode || '',
                campaignFinancialGoal: campaign?.financialGoal || 0,

                // Customer info
                customerName: order.studentName || '',
                customerEmail: order.email || '',
                customerPhone: order.phoneNumber || '',

                // Product info
                productName: product.productName || '',
                productQuantity: product.quantity || 0,
                productPrice: product.price || 0,
                productCost: product.cost || 0,
                productProfit: product.profit || 0,

                // Financial info
                totalAmount: order.totalAmount || 0,
                amountPaid: order.amountPaid || 0,
                transferAmount: order.transferAmount || 0,
                studentCashBenefit: product.studentCashBenefit || order.studentCashBenefit || 0,
                studentSchoolAccountBenefit: product.studentSchoolAccountBenefit || order.studentSchoolAccountBenefit || 0,
                schoolProjectBenefit: product.schoolProjectBenefit || order.schoolProjectBenefit || 0,
                raffleBenefit: product.raffleBenefit || order.raffleBenefit || 0,
                tip: order.tip || 0,
                tipStudentCash: order.tipBreakdown?.studentCash || 0,
                tipStudentAccount: order.tipBreakdown?.studentSchoolAccount || 0,
                tipSchoolProject: order.tipBreakdown?.schoolProject || 0,

                // Totals
                totalUnits: order.totalUnits || product.quantity || 0
            };

            // Only include selected fields if specified
            if (selectedFields.length > 0) {
                const filteredRow = {};
                selectedFields.forEach(field => {
                    if (row.hasOwnProperty(field)) {
                        filteredRow[field] = row[field];
                    }
                });
                flattened.push(filteredRow);
            } else {
                flattened.push(row);
            }
        });
    });

    // Process store orders
    storeOrders.forEach(order => {
        const campaign = campaignMap.get(order.campaignId?._id?.toString());
        const schoolId = order.school?.toString();
        const school = schoolMap.get(schoolId);

        order.products?.forEach(product => {
            const row = {
                // Order info
                orderId: order.orderId || order._id.toString(),
                orderNumber: order.orderId || order._id.toString(),
                orderDate: order.createdAt,
                orderStatus: order.status || 'En attente',
                orderType: 'Boutique',

                // School info
                schoolName: school?.name || order.school || '',
                schoolCode: school?.code || '',
                schoolAddress: school ? [school.address, school.ville, school.codePostal].filter(Boolean).join(', ') : '',
                schoolPhone: school?.telephone || '',
                schoolEmail: school?.email || '',

                // Campaign info
                campaignName: campaign?.name || `Campagne #${order.campaignNumber}`,
                campaignNumber: order.campaignNumber || campaign?.campaignNumber,
                campaignCode: campaign?.campaignCode || order.campaignId?.campaignCode || '',
                campaignStartDate: campaign?.startDate,
                campaignEndDate: campaign?.endDate,
                campaignDeliveryDate: campaign?.deliveryDate,
                campaignStatus: campaign?.status || '',
                campaignMode: campaign?.mode || '',
                campaignFinancialGoal: campaign?.financialGoal || 0,

                // Customer info
                customerName: order.customerName || order.user?.name || '',
                customerEmail: order.customerEmail || order.user?.email || '',
                customerPhone: order.phoneNumber || '',

                // Product info
                productName: product.productName || '',
                productQuantity: product.quantity || 0,
                productPrice: product.productPrice || product.price || 0,
                productCost: product.productCost || 0,
                productProfit: (product.productPrice || product.price || 0) - (product.productCost || 0),

                // Financial info
                totalAmount: order.totalAmount || 0,
                amountPaid: order.totalAmount || 0,
                transferAmount: 0,
                studentCashBenefit: order.tipBreakdown?.studentCash || order.studentDonationSplit?.studentCash || 0,
                studentSchoolAccountBenefit: order.tipBreakdown?.studentSchoolAccount || order.studentDonationSplit?.studentAccount || 0,
                schoolProjectBenefit: order.tipBreakdown?.schoolProject || order.schoolDonation || 0,
                raffleBenefit: 0,
                tip: order.tip || order.studentDonation || 0,
                tipStudentCash: order.tipBreakdown?.studentCash || 0,
                tipStudentAccount: order.tipBreakdown?.studentSchoolAccount || 0,
                tipSchoolProject: order.tipBreakdown?.schoolProject || 0,

                // Totals
                totalUnits: product.quantity || 0
            };

            if (selectedFields.length > 0) {
                const filteredRow = {};
                selectedFields.forEach(field => {
                    if (row.hasOwnProperty(field)) {
                        filteredRow[field] = row[field];
                    }
                });
                flattened.push(filteredRow);
            } else {
                flattened.push(row);
            }
        });
    });

    return flattened;
}

