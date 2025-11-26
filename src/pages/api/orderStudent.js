// pages/api/orderStudent.js

import dbConnect from '../../lib/mongodb';
import OrderStudent from '../../models/OrderStudent';
import School from '../../models/School';
import StudentInventory from '../../models/StudentInventory';
import FunnelEvent from '../../models/FunnelEvent';
import User from '../../models/User';
import { getNextSequence } from '../../utils/getNextSequence';
import { calculateOrderProfits, getCampaignDataWithFallback, isTestCampaign } from '../../utils/campaignHelpers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import mongoose from 'mongoose';
import crypto from 'crypto';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const {
        schoolId,
        schoolIds,
        page = 1,
        limit = 1000,
        sortBy = 'timestamp',
        sortOrder = 'desc',
        startDate,
        endDate,
        campaignNumber,
        campaignNumbers,
      } = req.query;

      const toObjectId = (value) => {
        if (!value || !mongoose.Types.ObjectId.isValid(value)) {
          return null;
        }
        return new mongoose.Types.ObjectId(value);
      };

      const parseObjectIdList = (value) => {
        if (!value) return [];
        const rawValues = Array.isArray(value) ? value : String(value).split(',');
        return rawValues
          .map((item) => item.trim())
          .filter(Boolean)
          .map(toObjectId)
          .filter(Boolean);
      };

      const parseNumberList = (value) => {
        if (!value) return [];
        const rawValues = Array.isArray(value) ? value : String(value).split(',');
        return rawValues
          .map((item) => Number(item))
          .filter((num) => !Number.isNaN(num));
      };

      // Build query based on filters
      const query = {};
      const schoolFilters = parseObjectIdList(schoolIds || schoolId);
      if (schoolFilters.length === 1) {
        query.school = schoolFilters[0];
      } else if (schoolFilters.length > 1) {
        query.school = { $in: schoolFilters };
      }

      const campaignFilterValues = parseNumberList(campaignNumbers || campaignNumber);
      if (campaignFilterValues.length === 1) {
        query.campaignNumber = campaignFilterValues[0];
      } else if (campaignFilterValues.length > 1) {
        query.campaignNumber = { $in: campaignFilterValues };
      }

      if (startDate || endDate) {
        const dateFilter = {};

        // Helper function to convert a date string (YYYY-MM-DD) to UTC Date object
        // representing that date at the specified time in America/Toronto timezone
        const torontoDateToUTC = (dateStr, isEndOfDay = false) => {
          const [year, month, day] = dateStr.split('-').map(Number);

          // Create the target time in Toronto timezone
          // For start of day: 00:00:00.000
          // For end of day: 23:59:59.999 (last millisecond of the day - includes ALL orders until 23:59:59.999)
          const targetHour = isEndOfDay ? 23 : 0;
          const targetMinute = isEndOfDay ? 59 : 0;
          const targetSecond = isEndOfDay ? 59 : 0;
          const targetMs = isEndOfDay ? 999 : 0;

          // Create an ISO string for the target time and interpret it as Toronto time
          // Format: "2025-11-21T23:59:59.999" - we'll treat this as Toronto time
          const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')}:${String(targetSecond).padStart(2, '0')}.${String(targetMs).padStart(3, '0')}`;

          // Create a date object and use toLocaleString to convert from Toronto to UTC
          // First, create a date that represents the time in Toronto
          const tempDate = new Date(isoString);

          // Get what this time represents in Toronto vs UTC
          // We'll create a date at a known time and calculate the offset
          const testDate = new Date(year, month - 1, day, 12, 0, 0, 0); // Noon to avoid DST edge cases
          const torontoNoon = testDate.toLocaleString('en-US', { timeZone: 'America/Toronto' });
          const utcNoon = testDate.toLocaleString('en-US', { timeZone: 'UTC' });
          const offsetMs = new Date(torontoNoon).getTime() - new Date(utcNoon).getTime();

          // Create the target date in local timezone
          const targetLocal = new Date(year, month - 1, day, targetHour, targetMinute, targetSecond, targetMs);

          // Convert to UTC by adjusting for the timezone offset
          // If Toronto is UTC-5 (EST), then 23:59:59.999 Toronto = 04:59:59.999 next day UTC
          // If Toronto is UTC-4 (EDT), then 23:59:59.999 Toronto = 03:59:59.999 next day UTC
          const targetUTC = new Date(targetLocal.getTime() - offsetMs);

          return targetUTC;
        };

        if (startDate) {
          const startUTC = torontoDateToUTC(startDate, false);
          if (Number.isNaN(startUTC.getTime())) {
            return res.status(400).json({ message: 'Paramètre startDate invalide' });
          }
          dateFilter.$gte = startUTC;
        }

        if (endDate) {
          const endUTC = torontoDateToUTC(endDate, true);
          if (Number.isNaN(endUTC.getTime())) {
            return res.status(400).json({ message: 'Paramètre endDate invalide' });
          }

          if (dateFilter.$gte && endUTC < dateFilter.$gte) {
            return res.status(400).json({ message: 'La date de fin doit être postérieure à la date de début' });
          }
          dateFilter.$lte = endUTC;
        }

        query.timestamp = dateFilter;
      }

      // Calculate skip value for pagination
      const safeLimit = Math.min(parseInt(limit, 10) || 1000, 5000);
      const currentPage = Math.max(parseInt(page, 10) || 1, 1);
      const skip = (currentPage - 1) * safeLimit;

      // Build sort object
      const allowedSortFields = ['timestamp', 'createdAt', 'totalAmount', 'totalUnits'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'timestamp';
      const sort = {
        [safeSortBy]: sortOrder === 'asc' ? 1 : -1
      };

      const matchQuery = { ...query };

      // Fetch orders with pagination and sorting
      const orders = await OrderStudent
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .populate('school', 'name nomEcole code ville status email telephone')
        .lean({ getters: true, virtuals: true }) // Return plain objects for easier manipulation
        .then((results) =>
          results.map((order) => {
            if (order?.school && !order.school.nomEcole) {
              order.school.nomEcole = order.school.name;
            }
            return order;
          })
        );

      // Get total count for pagination
      const totalOrders = await OrderStudent.countDocuments(query);

      // Aggregate summary stats
      const summaryAggregation = await OrderStudent.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalSales: { $sum: { $ifNull: ['$totalAmount', 0] } },
            totalUnits: { $sum: { $ifNull: ['$totalUnits', 0] } },
            totalStudentCashBenefit: {
              $sum: {
                $cond: [
                  { $ne: [{ $ifNull: ['$studentCashBenefit', null] }, null] },
                  { $ifNull: ['$studentCashBenefit', 0] },
                  {
                    $cond: [
                      { $ne: [{ $ifNull: ['$studentBenefit', null] }, null] },
                      { $ifNull: ['$studentBenefit', 0] },
                      0
                    ]
                  }
                ]
              }
            },
            totalStudentSchoolAccountBenefit: {
              $sum: { $ifNull: ['$studentSchoolAccountBenefit', 0] }
            },
            totalStudentBenefit: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      {
                        $add: [
                          { $ifNull: ['$studentCashBenefit', 0] },
                          { $ifNull: ['$studentSchoolAccountBenefit', 0] }
                        ]
                      },
                      0
                    ]
                  },
                  {
                    $add: [
                      { $ifNull: ['$studentCashBenefit', 0] },
                      { $ifNull: ['$studentSchoolAccountBenefit', 0] }
                    ]
                  },
                  { $ifNull: ['$studentBenefit', 0] }
                ]
              }
            },
            totalSchoolProjectBenefit: {
              $sum: {
                $cond: [
                  { $ne: [{ $ifNull: ['$schoolProjectBenefit', null] }, null] },
                  { $ifNull: ['$schoolProjectBenefit', 0] },
                  { $ifNull: ['$organizationBenefit', 0] }
                ]
              }
            },
            totalRaffleBenefit: { $sum: { $ifNull: ['$raffleBenefit', 0] } },
            totalBonusOrganization: { $sum: { $ifNull: ['$bonusOrganization', 0] } },
            totalTips: { $sum: { $ifNull: ['$tip', 0] } },
            orderCount: { $sum: 1 },
            firstOrderAt: { $min: '$timestamp' },
            lastOrderAt: { $max: '$timestamp' },
          }
        }
      ]);

      const summary = summaryAggregation[0]
        ? {
          ...summaryAggregation[0],
          totalSales: summaryAggregation[0].totalSales || 0,
          totalUnits: summaryAggregation[0].totalUnits || 0,
          totalStudentCashBenefit: summaryAggregation[0].totalStudentCashBenefit || 0,
          totalStudentSchoolAccountBenefit: summaryAggregation[0].totalStudentSchoolAccountBenefit || 0,
          totalStudentBenefit: summaryAggregation[0].totalStudentBenefit || 0,
          totalSchoolProjectBenefit: summaryAggregation[0].totalSchoolProjectBenefit || 0,
          totalRaffleBenefit: summaryAggregation[0].totalRaffleBenefit || 0,
          totalBonusOrganization: summaryAggregation[0].totalBonusOrganization || 0,
          totalTips: summaryAggregation[0].totalTips || 0,
          orderCount: summaryAggregation[0].orderCount || 0,
          firstOrderAt: summaryAggregation[0].firstOrderAt || null,
          lastOrderAt: summaryAggregation[0].lastOrderAt || null,
        }
        : {
          totalSales: 0,
          totalUnits: 0,
          totalStudentCashBenefit: 0,
          totalStudentSchoolAccountBenefit: 0,
          totalStudentBenefit: 0,
          totalSchoolProjectBenefit: 0,
          totalRaffleBenefit: 0,
          totalBonusOrganization: 0,
          totalTips: 0,
          orderCount: 0,
          firstOrderAt: null,
          lastOrderAt: null,
        };
      summary.averageOrderValue = summary.orderCount > 0 ? summary.totalSales / summary.orderCount : 0;
      summary.totalOrganizationBenefit = summary.totalSchoolProjectBenefit;

      // Aggregate breakdowns (top schools & top campaigns)
      const schoolBreakdownPromise = OrderStudent.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$school',
            totalSales: { $sum: { $ifNull: ['$totalAmount', 0] } },
            totalUnits: { $sum: { $ifNull: ['$totalUnits', 0] } },
            orderCount: { $sum: 1 },
            lastOrderAt: { $max: '$timestamp' }
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 5 }
      ]);

      const campaignBreakdownPromise = OrderStudent.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { school: '$school', campaignNumber: '$campaignNumber' },
            totalSales: { $sum: { $ifNull: ['$totalAmount', 0] } },
            totalUnits: { $sum: { $ifNull: ['$totalUnits', 0] } },
            orderCount: { $sum: 1 },
            lastOrderAt: { $max: '$timestamp' }
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 8 }
      ]);

      const [schoolBreakdownRaw, campaignBreakdownRaw] = await Promise.all([
        schoolBreakdownPromise,
        campaignBreakdownPromise
      ]);

      const schoolIdsForMetadata = new Set();
      schoolBreakdownRaw.forEach((item) => {
        if (item?._id) {
          schoolIdsForMetadata.add(item._id.toString());
        }
      });
      campaignBreakdownRaw.forEach((item) => {
        if (item?._id?.school) {
          schoolIdsForMetadata.add(item._id.school.toString());
        }
      });

      let schoolMetadataMap = {};
      if (schoolIdsForMetadata.size > 0) {
        const schoolsMetadata = await School.find({
          _id: { $in: Array.from(schoolIdsForMetadata) }
        })
          .select('name nomEcole code')
          .lean();

        schoolMetadataMap = schoolsMetadata.reduce((acc, school) => {
          acc[school._id.toString()] = {
            ...school,
            displayName: school.nomEcole || school.name
          };
          return acc;
        }, {});
      }

      const schoolBreakdown = schoolBreakdownRaw.map((item) => ({
        schoolId: item._id?.toString(),
        schoolName: schoolMetadataMap[item._id?.toString()]?.displayName || 'École inconnue',
        totalSales: item.totalSales,
        totalUnits: item.totalUnits,
        orderCount: item.orderCount,
        lastOrderAt: item.lastOrderAt,
      }));

      const campaignBreakdown = campaignBreakdownRaw.map((item) => {
        const key = item._id?.school?.toString();
        const meta = schoolMetadataMap[key];
        return {
          schoolId: key,
          schoolName: meta?.displayName || 'École inconnue',
          campaignNumber: item._id?.campaignNumber ?? null,
          totalSales: item.totalSales,
          totalUnits: item.totalUnits,
          orderCount: item.orderCount,
          lastOrderAt: item.lastOrderAt,
        };
      });

      res.status(200).json({
        orders,
        pagination: {
          currentPage,
          totalPages: Math.ceil(totalOrders / safeLimit),
          totalOrders,
          hasMore: skip + orders.length < totalOrders
        },
        summary,
        breakdowns: {
          schools: schoolBreakdown,
          campaigns: campaignBreakdown,
        },
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
      campaignId: campaignIdFromRequest,
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

      // Pre-fetch all products by name to avoid N+1 queries
      const Product = (await import('../../models/Product')).default;
      const productNames = [...new Set(products.map(p => p.productName).filter(Boolean))];
      const productsByName = productNames.length > 0
        ? await Product.find({ name: { $in: productNames } })
          .select('_id name')
          .lean()
        : [];
      const productNameToIdMap = new Map(
        productsByName.map(p => [p.name, p._id.toString()])
      );

      for (const product of products) {
        const { productName, quantity, price, cost, isAdditional, productId } = product;

        // Try to find product-specific profit split in campaign
        // First try productId from request, then try to find product by name
        let profitSplit = null;
        let actualProductId = productId;

        // If productId not provided, try to find it by name
        if (!actualProductId && productName) {
          actualProductId = productNameToIdMap.get(productName);
        }

        if (actualProductId && campaign?.profitSplits) {
          profitSplit = campaign.profitSplits.find(ps => {
            const psProductId = ps.productId?._id?.toString() || ps.productId?.toString();
            return psProductId === actualProductId.toString();
          });
        }

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
          // If any part is additional, mark the whole product as additional
          if (isAdditional) {
            existing.isAdditional = true;
          }
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
            isAdditional: isAdditional || false,
            // Legacy fields for backward compatibility
            studentBenefit: studentCashBenefit + studentSchoolAccountBenefit,
            organizationBenefit: schoolProjectBenefit,
          });
        }

        totalStudentCashBenefit += studentCashBenefit;
        totalStudentSchoolAccountBenefit += studentSchoolAccountBenefit;
        totalSchoolProjectBenefit += schoolProjectBenefit;
        totalRaffleBenefit += raffleBenefit;
      }

      const calculatedProducts = Array.from(productMap.values());

      // Générer le nouvel orderId unique par campagne
      // Compter les commandes existantes pour cette campagne spécifique
      const existingOrdersCount = await OrderStudent.countDocuments({
        school: schoolId,
        campaignNumber: campaignNumber
      });
      const newOrderId = existingOrdersCount + 1;

      // Get current date - MongoDB will store in UTC but we preserve the exact moment
      // The timestamp represents the exact moment the order was created
      // When displayed, it should be converted to local timezone on the frontend
      const timestamp = new Date();

      // Créer la nouvelle commande étudiante
      const orderStudent = new OrderStudent({
        timestamp: timestamp,
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

      // Check if this is the first order for the user
      const session = await getServerSession(req, res, authOptions);
      if (session?.user?.id) {
        const userId = session.user.id;
        const existingOrders = await OrderStudent.find({
          email: email,
          isTest: { $ne: true }
        });
        const isFirstOrder = existingOrders.length === 1;

        // Track first order
        if (isFirstOrder) {
          const user = await User.findById(userId);
          if (user) {
            const userType = user.role === 'student' ? 'student' : 'school';
            const sessionId = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

            const funnelEvent = new FunnelEvent({
              eventType: 'first_order_placed',
              userType,
              userId: userId,
              sessionId,
              metadata: {
                orderId: orderStudent.orderId?.toString() || orderStudent._id.toString(),
                schoolId: schoolId?.toString() || null,
                totalAmount: totalAmount
              }
            });

            await funnelEvent.save().catch(err => console.error('Error tracking first order:', err));
          }
        }
      }

      // Initialize inventory for each product
      try {
        // Get userId from session
        const session = await getServerSession(req, res, authOptions);
        const userId = session?.user?.id;

        // Get campaignId - prioritize the one from request (from frontend campaignContext)
        let campaignId = null;

        // First priority: use campaignId from request (matches store's campaignId)
        if (campaignIdFromRequest) {
          campaignId = campaignIdFromRequest.toString();
          console.log('[OrderStudent] Using campaignId from request (campaignContext):', campaignId);
        }
        // Second priority: use campaignId from campaign object
        else if (campaign?._id) {
          campaignId = campaign._id.toString();
          console.log('[OrderStudent] Using campaignId from campaign object:', campaignId);
        }
        // Third priority: use campaignId from activeCampaign
        else if (activeCampaign?._id) {
          campaignId = activeCampaign._id.toString();
          console.log('[OrderStudent] Using campaignId from activeCampaign:', campaignId);
        }
        // Fourth priority: try to get campaignId from school's active campaign
        else if (school) {
          const schoolDoc = await School.findById(schoolId);
          if (schoolDoc) {
            const activeCampaignFromSchool = schoolDoc.campaigns?.find((c) => c.isActive);
            if (activeCampaignFromSchool?._id) {
              campaignId = activeCampaignFromSchool._id.toString();
              console.log('[OrderStudent] Using campaignId from school active campaign:', campaignId);
            }
          }
        }

        // Last resort: try to get from Campaign collection using schoolId
        if (!campaignId) {
          try {
            const Campaign = (await import('../../models/Campaign')).default;
            const campaignFromDb = await Campaign.findOne({
              school: schoolId,
              status: { $in: ['active', 'pending_approval'] }
            }).sort({ createdAt: -1 }).lean();
            if (campaignFromDb?._id) {
              campaignId = campaignFromDb._id.toString();
              console.log('[OrderStudent] Using campaignId from Campaign collection (last resort):', campaignId);
            }
          } catch (err) {
            console.warn('[OrderStudent] Could not fetch campaign from Campaign collection:', err.message);
          }
        }

        console.log('[OrderStudent] Initializing inventory:', {
          userId,
          campaignId,
          schoolId,
          productsCount: calculatedProducts.length,
          isTest,
          hasCampaign: !!campaign,
          hasActiveCampaign: !!activeCampaign,
          campaignIdFromCampaign: campaign?._id?.toString(),
          campaignIdFromActiveCampaign: activeCampaign?._id?.toString()
        });

        if (userId && campaignId) {
          // First, calculate how many products have already been sold
          // Get all orders for this user in this campaign that have been paid or ordered
          const Order = (await import('../../models/Order')).default;
          const mongoose = (await import('mongoose')).default;

          // Convert campaignId to ObjectId if it's a valid ObjectId string
          let campaignIdObjectId = campaignId;
          if (mongoose.Types.ObjectId.isValid(campaignId)) {
            campaignIdObjectId = new mongoose.Types.ObjectId(campaignId);
          }

          // Only count orders with status 'Payé' - these are orders that haven't been included in a previous OrderStudent
          // Orders with status 'Commandé' or 'Complété' have already been included in a previous OrderStudent
          const soldOrders = await Order.find({
            user: userId,
            campaignId: campaignIdObjectId,
            status: 'Payé' // Only count paid orders that haven't been ordered yet
          }).lean();

          // Aggregate sold quantities by product name
          const soldQuantities = {};
          soldOrders.forEach(order => {
            if (order.products && Array.isArray(order.products)) {
              order.products.forEach(item => {
                const productName = item.productName || item.name;
                if (productName) {
                  soldQuantities[productName] = (soldQuantities[productName] || 0) + (item.quantity || 0);
                }
              });
            }
          });

          console.log('[OrderStudent] Sold quantities from existing orders:', soldQuantities);

          // Initialize/update inventory for each product
          for (const product of calculatedProducts) {
            // Get existing inventory to add to orderedQuantity
            const existingInventory = await StudentInventory.findOne({
              userId,
              campaignId,
              productName: product.productName
            });

            const previousOrdered = existingInventory?.orderedQuantity || 0;
            const newOrderedQuantity = existingInventory
              ? existingInventory.orderedQuantity + product.quantity
              : product.quantity;

            // Get sold quantity from existing orders (don't count products marked as isAdditional)
            // Only count products that were actually sold to customers
            const alreadySold = soldQuantities[product.productName] || 0;
            const currentSold = existingInventory?.soldQuantity || 0;

            // Use the maximum of already sold (from orders) and current sold (from inventory)
            // This ensures we don't lose track of sold items
            const finalSoldQuantity = Math.max(alreadySold, currentSold);

            console.log(`[OrderStudent] Updating inventory for ${product.productName}:`, {
              previousOrdered,
              adding: product.quantity,
              newOrderedQuantity,
              alreadySoldFromOrders: alreadySold,
              currentSoldInInventory: currentSold,
              finalSoldQuantity,
              existingInventory: !!existingInventory
            });

            const updatedInventory = await StudentInventory.updateInventory(
              userId,
              campaignId,
              product.productName,
              newOrderedQuantity,
              finalSoldQuantity // Set soldQuantity to reflect already sold items
            );

            console.log(`[OrderStudent] Inventory updated for ${product.productName}:`, {
              orderedQuantity: updatedInventory.orderedQuantity,
              soldQuantity: updatedInventory.soldQuantity,
              availableQuantity: updatedInventory.availableQuantity
            });
          }

          // Verify inventory was created
          const allInventory = await StudentInventory.find({ userId, campaignId }).lean();
          console.log(`[OrderStudent] Total inventory records created: ${allInventory.length}`);
        } else {
          console.warn('[OrderStudent] Could not initialize inventory: userId or campaignId missing', {
            userId,
            campaignId,
            hasCampaign: !!campaign,
            hasActiveCampaign: !!activeCampaign
          });
        }
      } catch (inventoryError) {
        // Log error but don't fail the order creation
        console.error('[OrderStudent] Error initializing inventory:', inventoryError);
        console.error('[OrderStudent] Stack:', inventoryError.stack);
      }

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
