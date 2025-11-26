import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import Order from '../../../models/Order';
import Campaign from '../../../models/Campaign';
import School from '../../../models/School';
import Store from '../../../models/Store';
import User from '../../../models/User';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const parseObjectIdList = (value) => {
  if (!value) return [];
  const rawValues = Array.isArray(value) ? value : String(value).split(',');
  return rawValues
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (mongoose.Types.ObjectId.isValid(item) ? new mongoose.Types.ObjectId(item) : null))
    .filter(Boolean);
};

const parseNumberList = (value) => {
  if (!value) return [];
  const rawValues = Array.isArray(value) ? value : String(value).split(',');
  return rawValues
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item));
};

const parseStringList = (value) => {
  if (!value) return [];
  const rawValues = Array.isArray(value) ? value : String(value).split(',');
  return rawValues.map((item) => item.trim()).filter(Boolean);
};

const formatCurrency = (value = 0) => {
  const amount = Number(value) || 0;
  return Number(amount.toFixed(2));
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }

  try {
    await dbConnect();

    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user?.role !== 'fournisseur') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const {
      startDate,
      endDate,
      schoolIds,
      campaignIds,
      campaignNumbers,
      statuses,
      customerEmail, // Add email search support
    } = req.query;

    const query = {};

    // Add email search if provided
    if (customerEmail) {
      query.customerEmail = { $regex: customerEmail, $options: 'i' };
      // When searching by email, don't apply date filters unless explicitly provided
      // This allows finding orders regardless of date
    }

    // Apply date filters if provided
    // Note: When searching by email, we still allow date filters to be applied if provided
    // But if no dates are provided and we're searching by email, we don't limit by date
    if (startDate || endDate) {
      const createdAt = {};
      if (startDate) {
        // Parse date string as local date (YYYY-MM-DD format)
        // Split to avoid timezone issues: "2025-11-06" -> treat as local date, not UTC
        const [year, month, day] = startDate.split('-').map(Number);
        const parsedStart = new Date(year, month - 1, day, 0, 0, 0, 0); // Local midnight
        if (Number.isNaN(parsedStart.getTime())) {
          return res.status(400).json({ message: 'Paramètre startDate invalide' });
        }
        // Convert to UTC for MongoDB query (MongoDB stores dates in UTC)
        // But we want to include all orders from the start of this day in local timezone
        createdAt.$gte = parsedStart;
      }
      if (endDate) {
        // Parse date string as local date (YYYY-MM-DD format)
        const [year, month, day] = endDate.split('-').map(Number);
        // Set to start of next day in local timezone, then subtract 1ms
        // This ensures we capture all orders from the end date, even if they're stored in UTC
        // and might appear as the next day due to timezone conversion
        const parsedEnd = new Date(year, month - 1, day + 1, 0, 0, 0, 0); // Start of next day
        parsedEnd.setMilliseconds(parsedEnd.getMilliseconds() - 1); // Subtract 1ms to get end of selected day
        if (Number.isNaN(parsedEnd.getTime())) {
          return res.status(400).json({ message: 'Paramètre endDate invalide' });
        }

        if (createdAt.$gte && parsedEnd < createdAt.$gte) {
          return res.status(400).json({ message: 'La date de fin doit être postérieure à la date de début' });
        }
        createdAt.$lte = parsedEnd;
      }
      query.createdAt = createdAt;
    }

    const statusList = parseStringList(statuses);
    if (statusList.length) {
      query.status = statusList.length === 1 ? statusList[0] : { $in: statusList };
    }

    const campaignNumberList = parseNumberList(campaignNumbers);
    if (campaignNumberList.length === 1) {
      query.campaignNumber = campaignNumberList[0];
    } else if (campaignNumberList.length > 1) {
      query.campaignNumber = { $in: campaignNumberList };
    }

    // Only add school/campaign filters if explicitly provided
    // If no filters, return ALL orders (both student and school manager orders)
    const orConditions = [];
    const schoolObjectIds = parseObjectIdList(schoolIds);
    const campaignObjectIds = parseObjectIdList(campaignIds);

    if (schoolObjectIds.length) {
      const [schoolDocs, campaignsForSchools] = await Promise.all([
        School.find({ _id: { $in: schoolObjectIds } }).select('name nomEcole _id').lean(),
        Campaign.find({ school: { $in: schoolObjectIds } }).select('_id').lean()
      ]);

      // Build school matching conditions - handle both formats:
      // 1. Orders saved with school ObjectId (as string) - current format
      // 2. Orders saved with school name - legacy format
      const schoolMatchConditions = [];

      // Match by school ObjectId strings (current format)
      const schoolIdStrings = schoolDocs.map((school) => school._id.toString()).filter(Boolean);
      if (schoolIdStrings.length) {
        schoolMatchConditions.push({ school: { $in: schoolIdStrings } });
      }

      // Match by school names (legacy format)
      const schoolNames = schoolDocs.map((school) => school.name || school.nomEcole).filter(Boolean);
      if (schoolNames.length) {
        schoolMatchConditions.push({ school: { $in: schoolNames } });
      }

      // Also match by nomEcole if different from name
      const schoolNomEcoles = schoolDocs
        .map((school) => school.nomEcole)
        .filter((nom) => nom && !schoolNames.includes(nom));
      if (schoolNomEcoles.length) {
        schoolMatchConditions.push({ school: { $in: schoolNomEcoles } });
      }

      if (schoolMatchConditions.length === 1) {
        orConditions.push(schoolMatchConditions[0]);
      } else if (schoolMatchConditions.length > 1) {
        orConditions.push({ $or: schoolMatchConditions });
      }

      if (campaignsForSchools.length) {
        orConditions.push({
          campaignId: { $in: campaignsForSchools.map((campaign) => campaign._id) }
        });
      }
    }

    if (campaignObjectIds.length) {
      orConditions.push({ campaignId: { $in: campaignObjectIds } });
    }

    // Only add school/campaign filters if we have conditions
    // Otherwise, query will return ALL orders (no filtering by school/campaign)
    if (orConditions.length === 1) {
      Object.assign(query, orConditions[0]);
    } else if (orConditions.length > 1) {
      query.$or = orConditions;
    }
    // If orConditions.length === 0, query remains as-is (only date/status filters if any)

    // Debug logging
    console.log('[massibec/student-orders] Query:', JSON.stringify(query, null, 2));
    console.log('[massibec/student-orders] Date range:', { startDate, endDate });
    console.log('[massibec/student-orders] School IDs:', schoolIds);
    console.log('[massibec/student-orders] Campaign IDs:', campaignIds);
    console.log('[massibec/student-orders] Customer email:', customerEmail);

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(10000).lean();

    console.log('[massibec/student-orders] Found orders:', orders.length);
    if (customerEmail) {
      const matchingOrders = orders.filter(o =>
        o.customerEmail && o.customerEmail.toLowerCase().includes(customerEmail.toLowerCase())
      );
      console.log('[massibec/student-orders] Orders matching email:', matchingOrders.length);
      if (matchingOrders.length > 0) {
        console.log('[massibec/student-orders] Sample matching order:', {
          orderId: matchingOrders[0].orderId,
          customerEmail: matchingOrders[0].customerEmail,
          school: matchingOrders[0].school,
          createdAt: matchingOrders[0].createdAt,
        });
      }
    }

    const userIds = new Set();
    const storeIds = new Set();
    const campaignIdsSet = new Set();
    const schoolIdsFromOrders = new Set(); // Track school IDs/names from orders

    orders.forEach((order) => {
      if (order.user) {
        userIds.add(order.user.toString());
      }
      if (order.store) {
        storeIds.add(order.store.toString());
      }
      if (order.campaignId) {
        campaignIdsSet.add(order.campaignId.toString());
      }
      // Collect school values from orders (could be ObjectId string or school name)
      if (order.school) {
        schoolIdsFromOrders.add(order.school);
      }
    });

    const [users, stores] = await Promise.all([
      userIds.size
        ? User.find({ _id: { $in: Array.from(userIds) } })
          .select('name email school campaigns activeCampaignId role')
          .lean()
        : [],
      storeIds.size
        ? Store.find({ _id: { $in: Array.from(storeIds) } })
          .select('name campaignId user slug')
          .lean()
        : [],
    ]);

    stores.forEach((store) => {
      if (store.campaignId) {
        campaignIdsSet.add(store.campaignId.toString());
      }
    });

    const campaignDocs = campaignIdsSet.size
      ? await Campaign.find({ _id: { $in: Array.from(campaignIdsSet) } })
        .select('campaignNumber name status school')
        .populate('school', 'name nomEcole code ville status')
        .lean()
      : [];

    // Initialize schoolMap first
    const schoolMap = {};

    // Populate schoolMap from campaigns first
    const campaignMap = campaignDocs.reduce((acc, campaign) => {
      const campaignId = campaign._id.toString();
      const schoolDoc = campaign.school && typeof campaign.school === 'object' ? campaign.school : null;
      const schoolId = schoolDoc?._id?.toString();

      if (schoolDoc && schoolId) {
        schoolMap[schoolId] = {
          _id: schoolDoc._id,
          name: schoolDoc.name,
          nomEcole: schoolDoc.nomEcole,
          code: schoolDoc.code,
          ville: schoolDoc.ville,
          displayName: schoolDoc.nomEcole || schoolDoc.name,
        };
      }

      acc[campaignId] = {
        _id: campaign._id,
        campaignNumber: campaign.campaignNumber,
        name: campaign.name,
        status: campaign.status,
        schoolId,
      };

      return acc;
    }, {});

    // Resolve school names from school IDs stored in orders
    // Handle both ObjectId strings and school names
    const schoolIdCandidates = Array.from(schoolIdsFromOrders).filter(Boolean);
    const schoolObjectIdCandidates = schoolIdCandidates.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    const schoolNameCandidates = schoolIdCandidates.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    const [schoolsById, schoolsByName] = await Promise.all([
      schoolObjectIdCandidates.length
        ? School.find({
          _id: { $in: schoolObjectIdCandidates.map((id) => new mongoose.Types.ObjectId(id)) },
        })
          .select('name nomEcole code ville status _id')
          .lean()
        : [],
      schoolNameCandidates.length
        ? School.find({
          $or: [
            { name: { $in: schoolNameCandidates } },
            { nomEcole: { $in: schoolNameCandidates } },
          ],
        })
          .select('name nomEcole code ville status _id')
          .lean()
        : [],
    ]);

    // Build comprehensive school map from all sources (add to existing schoolMap)
    const allSchoolDocs = [...schoolsById, ...schoolsByName];
    allSchoolDocs.forEach((school) => {
      const schoolId = school._id.toString();
      if (!schoolMap[schoolId]) {
        schoolMap[schoolId] = {
          _id: school._id,
          name: school.name,
          nomEcole: school.nomEcole,
          code: school.code,
          ville: school.ville,
          displayName: school.nomEcole || school.name,
        };
      }
    });

    // Also create a reverse lookup: school ObjectId string -> school info
    const schoolByOrderValue = {};
    allSchoolDocs.forEach((school) => {
      const schoolIdStr = school._id.toString();
      schoolByOrderValue[schoolIdStr] = schoolMap[schoolIdStr];
      if (school.name) schoolByOrderValue[school.name] = schoolMap[schoolIdStr];
      if (school.nomEcole) schoolByOrderValue[school.nomEcole] = schoolMap[schoolIdStr];
    });

    // Also add schools from campaigns to the lookup
    Object.values(schoolMap).forEach((school) => {
      if (school._id) {
        const schoolIdStr = school._id.toString();
        schoolByOrderValue[schoolIdStr] = school;
        if (school.name) schoolByOrderValue[school.name] = school;
        if (school.nomEcole) schoolByOrderValue[school.nomEcole] = school;
      }
    });

    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role || 'student',
      };
      return acc;
    }, {});

    const storeMap = stores.reduce((acc, store) => {
      acc[store._id.toString()] = {
        id: store._id.toString(),
        name: store.name,
        slug: store.slug || null,
        campaignId: store.campaignId ? store.campaignId.toString() : null,
        userId: store.user ? store.user.toString() : null,
      };
      return acc;
    }, {});

    const normalizedOrders = orders.map((order) => {
      const orderId = order._id.toString();
      const userId = order.user ? order.user.toString() : null;
      const storeId = order.store ? order.store.toString() : null;

      const storeInfo = storeId ? storeMap[storeId] : null;
      const campaignIdFromOrder = order.campaignId ? order.campaignId.toString() : null;
      const campaignIdFromStore = storeInfo?.campaignId || null;
      const campaign =
        (campaignIdFromOrder && campaignMap[campaignIdFromOrder]) ||
        (campaignIdFromStore && campaignMap[campaignIdFromStore]) ||
        null;

      // Resolve school info from multiple sources:
      // 1. From campaign (most reliable)
      // 2. From order.school field (could be ObjectId string or name)
      // 3. Fallback to order.school as-is
      let schoolId = campaign?.schoolId || null;
      let schoolInfo = schoolId ? schoolMap[schoolId] : null;

      // If no school from campaign, try to resolve from order.school field
      if (!schoolInfo && order.school) {
        schoolInfo = schoolByOrderValue[order.school];
        if (schoolInfo && schoolInfo._id) {
          schoolId = schoolInfo._id.toString();
        }
      }

      const schoolName =
        schoolInfo?.displayName ||
        (order.school && mongoose.Types.ObjectId.isValid(order.school)
          ? 'École inconnue'
          : order.school) ||
        'École inconnue';

      const totalUnits = Array.isArray(order.products)
        ? order.products.reduce((sum, product) => sum + (product.quantity || 0), 0)
        : 0;

      return {
        id: orderId,
        orderId: order.orderId || orderId.slice(-8),
        status: order.status || 'En attente',
        isTest: order.isTest || false,
        createdAt: order.createdAt || order.timestamp || null,
        totalAmount: formatCurrency(order.totalAmount || 0),
        totalUnits,
        tip: formatCurrency(order.tip || 0),
        studentDonation: formatCurrency(order.studentDonation || 0),
        schoolDonation: formatCurrency(order.schoolDonation || 0),
        discount: formatCurrency(order.discount || 0),
        customerName: order.customerName || 'Client',
        customerEmail: order.customerEmail || '',
        phoneNumber: order.phoneNumber || '',
        deliveryOption: order.deliveryOption || order.distributionNotes || '',
        customDeliveryOption: order.customDeliveryOption || '',
        customerDeliveryAddress: order.customerDeliveryAddress || '',
        campaign: campaign
          ? {
            id: campaign._id.toString(),
            campaignNumber: order.campaignNumber ?? campaign.campaignNumber ?? null,
            name: campaign.name || null,
            status: campaign.status || null,
          }
          : {
            id: campaignIdFromOrder || campaignIdFromStore || null,
            campaignNumber: order.campaignNumber ?? null,
            name: null,
            status: null,
          },
        school: {
          id: schoolId,
          name: schoolName,
          code: schoolInfo?.code || null,
          city: schoolInfo?.ville || null,
        },
        store: storeInfo
          ? {
            id: storeInfo.id,
            name: storeInfo.name,
            slug: storeInfo.slug,
            campaignId: storeInfo.campaignId,
          }
          : null,
        student: userId && userMap[userId]
          ? {
            id: userId,
            name: userMap[userId].name,
            email: userMap[userId].email,
            role: userMap[userId].role,
          }
          : null,
        products: Array.isArray(order.products)
          ? order.products.map((product) => ({
            productId: product.product ? product.product.toString() : null,
            productName: product.productName || 'Produit',
            quantity: product.quantity || 0,
            productPrice: formatCurrency(product.productPrice || 0),
            productCost: formatCurrency(product.productCost || 0),
            lineTotal: formatCurrency((product.quantity || 0) * (product.productPrice || 0)),
          }))
          : [],
      };
    });

    const summaryAccumulator = {
      totalOrders: 0,
      totalRevenue: 0,
      totalUnits: 0,
      totalTips: 0,
      totalStudentDonations: 0,
      totalSchoolDonations: 0,
      totalDiscounts: 0,
      firstOrderAt: null,
      lastOrderAt: null,
    };

    const uniqueCustomers = new Set();
    const statusCounts = {};
    const productTotals = new Map();
    const schoolProductMap = new Map();
    const studentMap = new Map();

    normalizedOrders.forEach((order) => {
      summaryAccumulator.totalOrders += 1;
      summaryAccumulator.totalRevenue += order.totalAmount || 0;
      summaryAccumulator.totalUnits += order.totalUnits || 0;
      summaryAccumulator.totalTips += order.tip || 0;
      summaryAccumulator.totalStudentDonations += order.studentDonation || 0;
      summaryAccumulator.totalSchoolDonations += order.schoolDonation || 0;
      summaryAccumulator.totalDiscounts += order.discount || 0;

      if (order.createdAt) {
        const orderDate = new Date(order.createdAt);
        if (!summaryAccumulator.firstOrderAt || orderDate < summaryAccumulator.firstOrderAt) {
          summaryAccumulator.firstOrderAt = orderDate;
        }
        if (!summaryAccumulator.lastOrderAt || orderDate > summaryAccumulator.lastOrderAt) {
          summaryAccumulator.lastOrderAt = orderDate;
        }
      }

      if (order.customerEmail) {
        uniqueCustomers.add(order.customerEmail.toLowerCase());
      }

      const statusKey = order.status || 'En attente';
      statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;

      order.products.forEach((product) => {
        const existingProduct = productTotals.get(product.productName) || {
          productName: product.productName,
          totalQuantity: 0,
          totalRevenue: 0,
        };
        existingProduct.totalQuantity += product.quantity || 0;
        existingProduct.totalRevenue += product.lineTotal || 0;
        productTotals.set(product.productName, existingProduct);
      });

      const schoolKey = order.school?.id || `legacy:${order.school?.name || 'École inconnue'}`;
      if (!schoolProductMap.has(schoolKey)) {
        schoolProductMap.set(schoolKey, {
          schoolId: order.school?.id || null,
          schoolName: order.school?.name || 'École inconnue',
          totalUnits: 0,
          totalRevenue: 0,
          products: new Map(),
        });
      }

      const schoolEntry = schoolProductMap.get(schoolKey);
      schoolEntry.totalUnits += order.totalUnits || 0;
      schoolEntry.totalRevenue += order.totalAmount || 0;
      order.products.forEach((product) => {
        const productEntry = schoolEntry.products.get(product.productName) || {
          productName: product.productName,
          totalQuantity: 0,
          totalRevenue: 0,
        };
        productEntry.totalQuantity += product.quantity || 0;
        productEntry.totalRevenue += product.lineTotal || 0;
        schoolEntry.products.set(product.productName, productEntry);
      });

      const studentKey = order.student?.id || `anonymous:${order.customerEmail || order.customerName || order.id}`;
      if (!studentMap.has(studentKey)) {
        studentMap.set(studentKey, {
          studentId: order.student?.id || null,
          studentName: order.student?.name || 'Étudiant inconnu',
          studentEmail: order.student?.email || null,
          schoolName: order.school?.name || 'École inconnue',
          orderCount: 0,
          totalRevenue: 0,
          totalUnits: 0,
          totalTips: 0,
        });
      }
      const studentEntry = studentMap.get(studentKey);
      studentEntry.orderCount += 1;
      studentEntry.totalRevenue += order.totalAmount || 0;
      studentEntry.totalUnits += order.totalUnits || 0;
      studentEntry.totalTips += order.tip || 0;
    });

    const summary = {
      totalOrders: summaryAccumulator.totalOrders,
      totalRevenue: formatCurrency(summaryAccumulator.totalRevenue),
      totalUnits: summaryAccumulator.totalUnits,
      totalTips: formatCurrency(summaryAccumulator.totalTips),
      totalStudentDonations: formatCurrency(summaryAccumulator.totalStudentDonations),
      totalSchoolDonations: formatCurrency(summaryAccumulator.totalSchoolDonations),
      totalDiscounts: formatCurrency(summaryAccumulator.totalDiscounts),
      uniqueCustomers: uniqueCustomers.size,
      averageOrderValue: summaryAccumulator.totalOrders
        ? formatCurrency(summaryAccumulator.totalRevenue / summaryAccumulator.totalOrders)
        : 0,
      firstOrderAt: summaryAccumulator.firstOrderAt,
      lastOrderAt: summaryAccumulator.lastOrderAt,
    };

    const productsBySchool = Array.from(schoolProductMap.values()).map((entry) => ({
      schoolId: entry.schoolId,
      schoolName: entry.schoolName,
      totalUnits: entry.totalUnits,
      totalRevenue: formatCurrency(entry.totalRevenue),
      products: Array.from(entry.products.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .map((product) => ({
          ...product,
          totalRevenue: formatCurrency(product.totalRevenue),
        })),
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const topProducts = Array.from(productTotals.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .map((product) => ({
        ...product,
        totalRevenue: formatCurrency(product.totalRevenue),
      }))
      .slice(0, 12);

    const topStudents = Array.from(studentMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 12)
      .map((student) => ({
        ...student,
        totalRevenue: formatCurrency(student.totalRevenue),
        totalTips: formatCurrency(student.totalTips),
      }));

    return res.status(200).json({
      orders: normalizedOrders,
      summary,
      statusCounts,
      breakdowns: {
        productsBySchool,
        topProducts,
        topStudents,
      },
    });
  } catch (error) {
    console.error('[massibec/student-orders] Error:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des commandes des boutiques.' });
  }
}
