import dbConnect from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import Order from '../../../../../models/Order';
import School from '../../../../../models/School';
import mongoose from 'mongoose';
import { calculateStudentEarnings, getCampaignDataWithFallback } from '../../../../../utils/campaignHelpers';

const profitRewards = {
  level1: {
    minimum: 1,
    max: 10,
    badge: "Petit vendeur 💰",
    category: "Débutant",
    description: "Tu as gagné tes premiers dollars. C'est un bon début !",
  },
  level2: {
    minimum: 11,
    max: 50,
    badge: "Vendeur en herbe 💵",
    category: "Apprenti",
    description: "Tes profits augmentent, tu progresses bien !",
  },
  level3: {
    minimum: 51,
    max: 100,
    badge: "Vendeur prometteur 💼",
    category: "Intermédiaire",
    description: "Tu maîtrises l'art de vendre. Continue comme ça !",
  },
  level4: {
    minimum: 101,
    max: 200,
    badge: "Vendeur expérimenté 💳",
    category: "Avancé",
    description: "Tes compétences en ventes se confirment avec de beaux profits.",
  },
  level5: {
    minimum: 201,
    max: 300,
    badge: "Pro des profits 🏆",
    category: "Avancé",
    description: "Tu es reconnu pour tes résultats impressionnants en ventes.",
  },
  level6: {
    minimum: 301,
    max: 500,
    badge: "Champion des profits 💎",
    category: "Pro",
    description: "Tu es une star de la vente. Tes profits parlent pour toi.",
  },
  level7: {
    minimum: 501,
    max: 1000,
    badge: "Maître des profits 🏅",
    category: "Expert",
    description: "Tu as atteint un niveau de profit exceptionnel.",
  },
  level8: {
    minimum: 1001,
    max: 2000,
    badge: "Légende des profits 🔥",
    category: "Légende",
    description: "Tu fais partie des meilleurs. Les profits ne cessent de croître.",
  },
  level9: {
    minimum: 2001,
    max: 3000,
    badge: "Titan des profits 🌟",
    category: "Élite",
    description: "Tu fais partie d'une élite de vendeurs, dominant le marché.",
  },
  level10: {
    minimum: 3001,
    max: Infinity,
    badge: "Empereur des profits 👑",
    category: "Ultime",
    description: "Ton succès est incomparable. Tu es une légende vivante.",
  }
};

const calculateTotalEarnings = async (orders, school) => {
  try {
    // Get campaign data with fallback to school data
    const { campaign, fallbackSplit } = await getCampaignDataWithFallback(school._id, school);

    // Calculate earnings using campaign-specific per-product profit splits
    const totalEarnings = calculateStudentEarnings(orders, campaign, fallbackSplit);

    return totalEarnings;
  } catch (error) {
    console.error('Error calculating total earnings:', error);
    // Fallback to old calculation if campaign helpers fail
    let totalEarnings = 0;
    orders.forEach(order => {
      const { products, tip } = order;
      const totalCost = products.reduce((acc, product) => acc + (product.productCost * product.quantity), 0);
      const profitBeforeTips = order.totalAmount - totalCost;
      const studentEarnings = (profitBeforeTips * (school.split.studentBenefit / 100)) + (tip || 0);
      totalEarnings += studentEarnings;
    });
    return totalEarnings;
  }
};

// Function to determine the user's category based on total earnings
const determineUserCategory = (totalEarnings) => {
  for (const level in profitRewards) {
    const reward = profitRewards[level];
    if (totalEarnings >= reward.minimum && totalEarnings <= reward.max) {
      return reward.category;
    }
  }
  return "Noob";
};

// School year definitions
const schoolYears = {
  '2024-2025': { startDate: '2024-08-01', endDate: '2025-07-31' },
  '2025-2026': { startDate: '2025-08-01', endDate: '2026-07-31' },
  '2026-2027': { startDate: '2026-08-01', endDate: '2027-07-31' }
};

const buildCampaignMatchConditions = (campaignId) => {
  if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
    return [];
  }

  const campaignObjectId = new mongoose.Types.ObjectId(campaignId);
  const idAsString = campaignObjectId.toString();

  return [
    { campaignId: campaignObjectId },
    { campaignId: idAsString },
    { campaignId },
    { campaignId: null },
    { campaignId: { $exists: false } }
  ];
};

const buildSchoolFilter = (schoolId) => {
  if (!schoolId) return null;
  const values = [schoolId.toString()];
  if (mongoose.Types.ObjectId.isValid(schoolId)) {
    values.push(new mongoose.Types.ObjectId(schoolId));
  }
  return values.length > 1 ? { $in: values } : values[0];
};

export default async function handler(req, res) {
  const { schoolId, userId: userIdFromQuery } = req.query;
  const { schoolYear = '2025-2026', campaignId } = req.body;

  try {
    await dbConnect();

    // IMPORTANT: If userId is undefined, try to get it from session
    // This handles cases where the userId parameter is not properly passed in the URL
    let userId = userIdFromQuery;
    if (!userId) {
      try {
        const { getToken } = await import('next-auth/jwt');
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (token && token.sub) {
          userId = token.sub;
          console.log(`[TopSellers] userId was undefined, using session userId: ${userId}`);
        }
      } catch (error) {
        console.error('[TopSellers] Error getting userId from session:', error);
      }
    }

    // If still no userId, return error
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // IMPORTANT: When campaignId is provided, get school from campaign, not from schoolId parameter
    // The schoolId parameter may be the user's school (deprecated), but we need the campaign's school
    let finalSchoolId = schoolId;
    let school = null;

    if (campaignId) {
      // Get school from campaign
      const Campaign = (await import('../../../../../models/Campaign')).default;
      const campaign = await Campaign.findById(campaignId).lean();
      if (campaign && campaign.school) {
        finalSchoolId = campaign.school.toString();
        school = await School.findById(finalSchoolId);
      }
    }

    // Fallback to schoolId parameter if campaign not found or no campaignId provided
    if (!school) {
      school = await School.findById(schoolId);
    }

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // If campaignId is provided, use campaign dates instead of school year dates
    let startDate, endDate;
    if (campaignId) {
      const Campaign = (await import('../../../../../models/Campaign')).default;
      const campaign = await Campaign.findById(campaignId).lean();
      if (campaign) {
        // Use campaign dates if available, otherwise use a wide range
        if (campaign.startDate) {
          startDate = new Date(campaign.startDate);
          // Set to start of day in UTC (00:00:00 UTC) to include all orders from the start date
          // This handles timezone issues where orders might be created before the exact start time
          // Use UTC methods to avoid timezone conversion issues
          startDate = new Date(Date.UTC(
            startDate.getUTCFullYear(),
            startDate.getUTCMonth(),
            startDate.getUTCDate(),
            0, 0, 0, 0
          ));
        } else {
          startDate = new Date('2020-01-01');
        }
        // For end date, use campaign endDate or deliveryDate, or extend far into future
        if (campaign.endDate) {
          endDate = new Date(campaign.endDate);
        } else if (campaign.deliveryDate) {
          endDate = new Date(campaign.deliveryDate);
        } else {
          endDate = new Date('2099-12-31');
        }
        // Set to end of day in UTC (23:59:59.999 UTC) to include all orders from the end date
        if (endDate) {
          endDate = new Date(Date.UTC(
            endDate.getUTCFullYear(),
            endDate.getUTCMonth(),
            endDate.getUTCDate(),
            23, 59, 59, 999
          ));
          // Add some buffer after campaign end to include all orders
          endDate.setUTCDate(endDate.getUTCDate() + 30); // 30 days buffer
        }
      } else {
        // Campaign not found, fall back to school year
        const yearData = schoolYears[schoolYear];
        if (!yearData) {
          return res.status(400).json({ message: 'Invalid school year' });
        }
        startDate = new Date(yearData.startDate);
        endDate = new Date(yearData.endDate);
      }
    } else {
      // No campaignId, use school year dates
      const yearData = schoolYears[schoolYear];
      if (!yearData) {
        return res.status(400).json({ message: 'Invalid school year' });
      }
      startDate = new Date(yearData.startDate);
      endDate = new Date(yearData.endDate);
    }

    // Fetch all participants in the campaign (students AND school_managers who joined as sellers)
    // IMPORTANT: When campaignId is provided, we should find participants by campaignId, not by schoolId
    // This allows school_managers who joined campaigns from other schools to see the correct leaderboard
    let participants = [];
    if (campaignId) {
      // Find all users (students AND school_managers) who have joined this specific campaign
      const campaignObjectId = mongoose.Types.ObjectId.isValid(campaignId)
        ? new mongoose.Types.ObjectId(campaignId)
        : campaignId;

      participants = await User.find({
        // Include both students and school_managers who joined the campaign
        $or: [
          { 'campaigns.campaignId': campaignObjectId },
          { 'campaigns.campaignId': campaignId },
          { activeCampaignId: campaignObjectId },
          { activeCampaignId: campaignId }
        ]
      });

      console.log(`[TopSellers] Found ${participants.length} participants for campaign ${campaignId}:`,
        participants.map(p => ({ id: p._id.toString(), name: p.name, role: p.role }))
      );
    } else {
      // Fallback: find students by schoolId (legacy behavior)
      participants = await User.find({
        $or: [
          { school: schoolId, role: 'student' },
          { 'campaigns.schoolId': schoolId, role: 'student' }
        ]
      });
    }

    // Rename for clarity - these are participants, not just students
    const students = participants;
    if (!students || students.length === 0) {
      return res.status(200).json({
        topPerformers: [],
        userRank: null,
        userTotalEarnings: '0.00',
        userTotalProductsSold: 0,
        userCategory: 'Noob'
      });
    }

    // Verify the current user is in the participants list
    const currentUserInList = students.find(s => s._id.toString() === userId);
    if (!currentUserInList) {
      console.warn(`[TopSellers] User ${userId} not found in campaign ${campaignId || 'N/A'} participants list`);
    } else {
      console.log(`[TopSellers] User ${userId} (${currentUserInList.name}, role: ${currentUserInList.role}) found in participants list`);
    }

    // Calculate total earnings for each participant (filtered by campaign dates and campaignId)
    const studentData = await Promise.all(students.map(async student => {
      const baseQuery = {
        user: student._id,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

      let orderQuery = baseQuery;

      // IMPORTANT: Don't filter by school when campaignId is provided
      // Orders belong to the campaign's school, not the user's school
      // This allows school_managers to see their orders from campaigns of other schools
      if (!campaignId) {
        // Only filter by school if no campaignId (legacy behavior)
        const schoolFilter = buildSchoolFilter(school?._id?.toString() || schoolId);
        if (schoolFilter) {
          orderQuery.school = schoolFilter;
        }
      }

      // Filter by campaignId - convert to ObjectId if needed
      // IMPORTANT: Also include orders without campaignId if they belong to the user and school
      // This handles legacy orders or orders created before campaign system was fully implemented
      if (campaignId) {
        const campaignObjectId = mongoose.Types.ObjectId.isValid(campaignId)
          ? new mongoose.Types.ObjectId(campaignId)
          : campaignId;

        // Build school filter for legacy orders (orders without campaignId)
        const schoolFilterForLegacy = buildSchoolFilter(school?._id?.toString() || finalSchoolId);

        // Include orders with matching campaignId OR orders without campaignId that belong to this school
        const campaignConditions = [
          { campaignId: campaignObjectId }
        ];

        // Add legacy order condition (orders without campaignId for this school)
        if (schoolFilterForLegacy) {
          campaignConditions.push({
            $and: [
              { $or: [{ campaignId: null }, { campaignId: { $exists: false } }] },
              { school: schoolFilterForLegacy }
            ]
          });
        }

        // Use $or for campaignId conditions, but keep other conditions (user, dates) separate
        orderQuery = {
          user: student._id,
          createdAt: {
            $gte: startDate,
            $lte: endDate
          },
          $or: campaignConditions
        };
      }

      const orders = await Order.find(orderQuery);

      // Debug logging for the current user
      if (student._id.toString() === userId) {
        console.log(`[TopSellers] User ${userId} (${student.name}, role: ${student.role}) orders:`, {
          orderCount: orders.length,
          dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
          campaignId,
          orderQuery,
          orderDates: orders.map(o => ({
            date: o.createdAt,
            campaignId: o.campaignId,
            campaignIdMatch: campaignId ? o.campaignId?.toString() === campaignId.toString() : 'N/A',
            totalAmount: o.totalAmount,
            productsCount: o.products?.length || 0,
            products: o.products?.map(p => ({ name: p.productName, quantity: p.quantity, cost: p.productCost, price: p.productPrice })) || []
          }))
        });

        // Also check orders without campaignId filter to see if there are orders that should be included
        if (campaignId) {
          const allUserOrders = await Order.find({ user: student._id });
          const ordersWithoutCampaignId = allUserOrders.filter(o => !o.campaignId);
          const ordersWithDifferentCampaignId = allUserOrders.filter(o =>
            o.campaignId && o.campaignId.toString() !== campaignId.toString()
          );
          const ordersWithMatchingCampaignId = allUserOrders.filter(o =>
            o.campaignId && o.campaignId.toString() === campaignId.toString()
          );
          const ordersInDateRange = allUserOrders.filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate >= startDate && orderDate <= endDate;
          });
          const matchingOrdersInDateRange = ordersWithMatchingCampaignId.filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate >= startDate && orderDate <= endDate;
          });
          console.log(`[TopSellers] User ${userId} additional order info:`, {
            totalOrdersForUser: allUserOrders.length,
            ordersWithoutCampaignId: ordersWithoutCampaignId.length,
            ordersWithDifferentCampaignId: ordersWithDifferentCampaignId.length,
            ordersWithMatchingCampaignId: ordersWithMatchingCampaignId.length,
            ordersInDateRange: ordersInDateRange.length,
            matchingOrdersInDateRange: matchingOrdersInDateRange.length,
            dateRange: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              startDateUTC: startDate.getTime(),
              endDateUTC: endDate.getTime()
            },
            differentCampaignIds: [...new Set(ordersWithDifferentCampaignId.map(o => o.campaignId?.toString()))],
            matchingCampaignOrders: ordersWithMatchingCampaignId.map(o => ({
              _id: o._id,
              createdAt: o.createdAt,
              createdAtUTC: new Date(o.createdAt).getTime(),
              inDateRange: new Date(o.createdAt) >= startDate && new Date(o.createdAt) <= endDate,
              totalAmount: o.totalAmount,
              productsCount: o.products?.length || 0
            }))
          });
        }
      }

      const totalEarnings = await calculateTotalEarnings(orders, school);
      const totalProductsSold = orders.reduce((acc, order) => {
        const products = Array.isArray(order.products) ? order.products : [];
        return acc + products.reduce((sum, p) => sum + (p.quantity || 0), 0);
      }, 0);

      // Calculate total sales including donations (products before discount + all donations)
      const totalSales = orders.reduce((sum, order) => {
        // Calculate original subtotal from products (before discount)
        const originalSubtotal = order.products?.reduce((productSum, product) => {
          const price = product.productPrice || product.price || 0;
          const quantity = product.quantity || 0;
          return productSum + (price * quantity);
        }, 0) || 0;

        // Add donations (student and school donations)
        const studentDonation = order.studentDonation || order.tip || 0;
        const schoolDonation = order.schoolDonation || 0;
        const totalDonations = studentDonation + schoolDonation;

        return sum + originalSubtotal + totalDonations;
      }, 0);

      const category = determineUserCategory(totalEarnings);
      return { student, totalEarnings, totalProductsSold, totalSales, category };
    }));

    // Ensure all students are included, even those with 0 orders
    // This ensures the current user is always in the list
    const studentDataIds = new Set(studentData.map(s => s.student._id.toString()));
    const missingStudents = students.filter(s => !studentDataIds.has(s._id.toString()));

    // Add missing students with 0 earnings
    missingStudents.forEach(student => {
      studentData.push({
        student,
        totalEarnings: 0,
        totalProductsSold: 0,
        totalSales: 0,
        category: 'Noob'
      });
    });

    // Sort by total earnings (descending), then alphabetically by name (ascending)
    const sortedStudentData = studentData.sort((a, b) => {
      // First sort by total earnings (descending)
      if (b.totalEarnings !== a.totalEarnings) {
        return b.totalEarnings - a.totalEarnings;
      }
      // If earnings are equal, sort alphabetically by name (ascending)
      return a.student.name.localeCompare(b.student.name, 'fr', { sensitivity: 'base' });
    });

    // Get top performers (all students with their rank)
    const topPerformers = sortedStudentData.map(({ student, totalEarnings, totalProductsSold, totalSales, category }, index) => ({
      _id: student._id.toString(),
      userId: student._id.toString(),
      name: student.name,
      rank: index + 1,
      totalEarnings: totalEarnings.toFixed(2),
      totalProductsSold,
      totalSales: totalSales || 0,
      category
    }));

    // Find the current user's rank and earnings
    const currentUserData = sortedStudentData.find(data => data.student._id.toString() === userId);
    const userRankIndex = sortedStudentData.findIndex(data => data.student._id.toString() === userId);
    const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;

    console.log(`[TopSellers] Results for user ${userId}:`, {
      totalStudents: sortedStudentData.length,
      userInList: !!currentUserData,
      userRank,
      topPerformersCount: topPerformers.length,
      dateRange: { startDate, endDate },
      campaignId
    });

    // If user has no orders, they won't be in sortedStudentData
    // But we should still return the leaderboard with other students
    if (!currentUserData) {
      // User not found in sorted data - they might have no orders
      // Return leaderboard anyway, but with null rank
      console.warn(`[TopSellers] User ${userId} not found in sorted data - no orders found`);
      return res.status(200).json({
        topPerformers,
        userRank: null,
        userTotalEarnings: '0.00',
        userTotalProductsSold: 0,
        userCategory: 'Noob'
      });
    }

    // Calculate group aggregations if groups are enabled
    let groupsData = [];
    let userGroup = null;
    let userGroupRank = null;

    if (campaignId) {
      const Campaign = (await import('../../../../../models/Campaign')).default;
      const campaign = await Campaign.findById(campaignId).lean();

      if (campaign && campaign.groups && campaign.groups.enabled && campaign.groups.list && campaign.groups.list.length > 0) {
        // Get user's group - need to fetch user with campaigns populated
        const User = (await import('../../../../../models/User')).default;
        const userWithCampaigns = await User.findById(userId).lean();
        if (userWithCampaigns && userWithCampaigns.campaigns) {
          const userCampaignEntry = userWithCampaigns.campaigns.find(
            c => c.campaignId?.toString() === campaignId
          );
          userGroup = userCampaignEntry?.groupId || null;
        }

        // Aggregate by group
        const groupStats = {};

        // Fetch all students with campaigns to get their groupIds
        const studentsWithCampaigns = await User.find({
          _id: { $in: sortedStudentData.map(d => d.student._id) }
        }).select('campaigns').lean();

        const studentGroupMap = {};
        studentsWithCampaigns.forEach(student => {
          if (student.campaigns) {
            const campaignEntry = student.campaigns.find(
              c => c.campaignId?.toString() === campaignId
            );
            if (campaignEntry) {
              studentGroupMap[student._id.toString()] = campaignEntry.groupId;
            }
          }
        });

        // Debug logging
        console.log(`[TopSellers] Group mapping for campaign ${campaignId}:`, {
          totalStudents: sortedStudentData.length,
          studentsWithGroups: Object.keys(studentGroupMap).length,
          groupMap: Object.entries(studentGroupMap).slice(0, 5), // First 5 for debugging
          groupNames: campaign.groups.list.map(g => g.name)
        });

        for (const group of campaign.groups.list) {
          const groupName = group.name;
          const studentsInGroup = sortedStudentData.filter(data => {
            const studentId = data.student._id.toString();
            const studentGroupId = studentGroupMap[studentId];
            // Match if groupId matches group name, or if both are null/undefined (default group)
            return studentGroupId === groupName || (studentGroupId == null && groupName === 'Autre');
          });

          if (studentsInGroup.length > 0) {
            const totalProductsSold = studentsInGroup.reduce((sum, data) => sum + data.totalProductsSold, 0);
            const totalSales = studentsInGroup.reduce((sum, data) => sum + data.totalSales, 0);

            // Get individual rankings within group
            const groupStudents = studentsInGroup.map((data, index) => {
              const studentId = data.student._id.toString();
              return {
                _id: studentId,
                userId: studentId,
                name: data.student.name,
                rank: index + 1,
                totalEarnings: data.totalEarnings.toFixed(2),
                totalProductsSold: data.totalProductsSold,
                totalSales: data.totalSales || 0,
                category: data.category,
                groupId: studentGroupMap[studentId] || null
              };
            });

            groupStats[groupName] = {
              name: groupName,
              totalProductsSold,
              totalSales,
              participants: studentsInGroup.length,
              students: groupStudents
            };
          } else {
            // Empty group
            groupStats[groupName] = {
              name: groupName,
              totalProductsSold: 0,
              totalSales: 0,
              participants: 0,
              students: []
            };
          }
        }

        // Sort groups by total products sold (descending)
        groupsData = Object.values(groupStats)
          .sort((a, b) => b.totalProductsSold - a.totalProductsSold)
          .map((group, index) => ({
            ...group,
            rank: index + 1
          }));

        // Find user's group rank (the rank of the group itself, not individual rank within group)
        if (userGroup) {
          const userGroupData = groupsData.find(g => g.name === userGroup);
          if (userGroupData) {
            // Return the group's rank in the overall group ranking
            userGroupRank = userGroupData.rank || null;
          }
        }
      }
    }

    // Respond with the top performers, the user's rank/earnings, and their category
    res.status(200).json({
      topPerformers,
      groups: groupsData,
      userRank,
      userGroup,
      userGroupRank,
      userTotalEarnings: currentUserData.totalEarnings.toFixed(2),
      userTotalProductsSold: currentUserData.totalProductsSold,
      userCategory: currentUserData.category
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data.', error: error.message });
  }
}
