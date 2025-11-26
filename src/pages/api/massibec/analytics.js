import dbConnect from '../../../lib/mongodb';
import mongoose from 'mongoose';
import Order from '../../../models/Order';
import OrderStudent from '../../../models/OrderStudent';
import StoreVisit from '../../../models/StoreVisit';
import User from '../../../models/User';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();

        const session = await getServerSession(req, res, authOptions);
        if (!session || !session.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Only allow supplier role
        if (session.user.role !== 'fournisseur') {
            return res.status(403).json({ message: 'Forbidden - Supplier access only' });
        }

        const { startDate, endDate, schoolIds } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) {
                dateFilter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.createdAt.$lte = end;
            }
        }

        // Build school filter
        const schoolFilter = {};
        if (schoolIds) {
            const schoolIdArray = schoolIds.split(',').map(id => id.trim()).filter(Boolean);
            if (schoolIdArray.length > 0) {
                // Handle both ObjectId and string formats
                const schoolObjectIds = schoolIdArray
                    .filter(id => mongoose.Types.ObjectId.isValid(id))
                    .map(id => new mongoose.Types.ObjectId(id));
                const schoolStrings = schoolIdArray.filter(id => !mongoose.Types.ObjectId.isValid(id));

                if (schoolObjectIds.length > 0 && schoolStrings.length > 0) {
                    schoolFilter.school = { $in: [...schoolObjectIds, ...schoolStrings] };
                } else if (schoolObjectIds.length > 0) {
                    schoolFilter.school = { $in: schoolObjectIds };
                } else {
                    schoolFilter.school = { $in: schoolStrings };
                }
            }
        }

        // Fetch all students (users with role 'student')
        const students = await User.find({ role: 'student' })
            .populate('school', 'name nomEcole')
            .lean();

        // Fetch all store orders (Order model)
        // Note: Order.school is a String field, not a reference, so we can't populate it
        const storeOrdersQuery = { ...dateFilter, ...schoolFilter, isTest: { $ne: true } };
        const storeOrders = await Order.find(storeOrdersQuery)
            .populate('user', 'name email')
            .lean();

        // Fetch all student orders (OrderStudent model)
        const studentOrdersQuery = { ...dateFilter, isTest: { $ne: true } };
        if (schoolIds) {
            const schoolIdArray = schoolIds.split(',').map(id => id.trim()).filter(Boolean);
            if (schoolIdArray.length > 0) {
                const schoolObjectIds = schoolIdArray
                    .filter(id => mongoose.Types.ObjectId.isValid(id))
                    .map(id => new mongoose.Types.ObjectId(id));
                const schoolStrings = schoolIdArray.filter(id => !mongoose.Types.ObjectId.isValid(id));

                if (schoolObjectIds.length > 0 && schoolStrings.length > 0) {
                    studentOrdersQuery.school = { $in: [...schoolObjectIds, ...schoolStrings] };
                } else if (schoolObjectIds.length > 0) {
                    studentOrdersQuery.school = { $in: schoolObjectIds };
                } else {
                    studentOrdersQuery.school = { $in: schoolStrings };
                }
            }
        }
        const studentOrders = await OrderStudent.find(studentOrdersQuery)
            .populate('school', 'name nomEcole')
            .lean();

        // Fetch store visits
        const visitQuery = { ...dateFilter };
        if (schoolIds) {
            const schoolIdArray = schoolIds.split(',').map(id => id.trim()).filter(Boolean);
            if (schoolIdArray.length > 0) {
                const schoolObjectIds = schoolIdArray
                    .filter(id => mongoose.Types.ObjectId.isValid(id))
                    .map(id => new mongoose.Types.ObjectId(id));
                const schoolStrings = schoolIdArray.filter(id => !mongoose.Types.ObjectId.isValid(id));

                if (schoolObjectIds.length > 0 && schoolStrings.length > 0) {
                    visitQuery.schoolId = { $in: [...schoolObjectIds, ...schoolStrings] };
                } else if (schoolObjectIds.length > 0) {
                    visitQuery.schoolId = { $in: schoolObjectIds };
                } else {
                    visitQuery.schoolId = { $in: schoolStrings };
                }
            }
        }
        const storeVisits = await StoreVisit.find(visitQuery).lean();

        // Calculate student performance metrics
        const studentPerformance = await calculateStudentPerformance(
            students,
            storeOrders,
            studentOrders,
            dateFilter
        );

        // Calculate overall metrics
        const overallMetrics = calculateOverallMetrics(
            students,
            storeOrders,
            studentOrders,
            storeVisits
        );

        // Calculate sales distribution by percentile tranches
        const salesDistribution = calculateSalesDistribution(studentPerformance);

        // Calculate recurring customers
        const recurringCustomers = calculateRecurringCustomers(storeOrders);

        // Calculate product performance
        const productPerformance = calculateProductPerformance(storeOrders, studentOrders);

        // Fetch all campaigns with their schools
        const allCampaigns = await Campaign.find({})
            .populate('school', 'name nomEcole code')
            .select('_id name campaignNumber school startDate endDate status')
            .lean();

        const campaignMap = {};
        allCampaigns.forEach(campaign => {
            const campaignId = campaign._id.toString();
            const school = campaign.school;
            const schoolName = school?.nomEcole || school?.name || 'Unknown';
            const schoolId = school?._id?.toString() || 'unknown';

            campaignMap[campaignId] = {
                campaignId,
                campaignName: campaign.name || `Campagne #${campaign.campaignNumber}`,
                campaignNumber: campaign.campaignNumber,
                schoolId,
                schoolName,
                schoolCode: school?.code || ''
            };

            // Also map by campaignNumber + schoolId for OrderStudent
            const key = `${schoolId}-${campaign.campaignNumber}`;
            campaignMap[key] = campaignMap[campaignId];
        });

        // Count students enrolled in each campaign directly from database
        // This is more accurate than iterating through all students
        const campaignStudentCounts = {};

        // For each campaign, count students enrolled
        for (const campaign of allCampaigns) {
            const campaignId = campaign._id.toString();
            const schoolId = campaign.school?._id?.toString() || campaign.school?.toString();

            // Count students enrolled in this campaign
            const enrolledCount = await User.countDocuments({
                'campaigns.campaignId': campaign._id
            });

            campaignStudentCounts[campaignId] = enrolledCount;

            // Also map by schoolId + campaignNumber for OrderStudent matching
            if (schoolId && campaign.campaignNumber !== null && campaign.campaignNumber !== undefined) {
                const key = `${schoolId}-${campaign.campaignNumber}`;
                campaignStudentCounts[key] = enrolledCount;
            }
        }

        // Calculate campaign performance (instead of school performance)
        const campaignPerformance = calculateCampaignPerformance(
            storeOrders,
            studentOrders,
            students,
            campaignMap,
            campaignStudentCounts
        );

        // Diagnostic: Find students who should be in campaigns but aren't
        // (students with orders but not enrolled, or students from schools with campaigns but not enrolled)
        const enrollmentDiagnostics = calculateEnrollmentDiagnostics(
            allCampaigns,
            students,
            storeOrders,
            studentOrders
        );

        // Calculate unique students with sales (across all campaigns, no duplicates)
        const totalStudentsWithSales = new Set();

        // Count unique students from all store orders
        storeOrders.forEach(order => {
            if (order.user?._id) {
                totalStudentsWithSales.add(order.user._id.toString());
            }
        });

        // Count unique students from student orders (by email)
        studentOrders.forEach(order => {
            if (order.email) {
                // Try to find matching student by email
                const student = students.find(s => s.email?.toLowerCase() === order.email?.toLowerCase());
                if (student) {
                    totalStudentsWithSales.add(student._id.toString());
                }
            }
        });

        // Calculate sum of students per campaign (may count same student multiple times if in multiple campaigns)
        const totalStudentsInCampaigns = campaignPerformance.reduce((sum, c) => sum + c.studentCount, 0);

        // Update overallMetrics with students with sales count
        overallMetrics.totalStudentsWithSales = totalStudentsWithSales.size;
        overallMetrics.totalStudentsInCampaigns = totalStudentsInCampaigns;
        overallMetrics.note = 'La somme des élèves par campagne peut être supérieure au total unique car un élève peut avoir des ventes dans plusieurs campagnes.';

        // Calculate time series data
        const timeSeries = calculateTimeSeries(storeOrders, studentOrders, storeVisits, dateFilter);

        res.status(200).json({
            overallMetrics,
            studentPerformance,
            salesDistribution,
            recurringCustomers,
            productPerformance,
            campaignPerformance,
            timeSeries,
            enrollmentDiagnostics
        });

    } catch (error) {
        console.error('Error fetching supplier analytics:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
}

/**
 * Calculate performance metrics for each student
 */
async function calculateStudentPerformance(students, storeOrders, studentOrders, dateFilter) {
    const performance = [];

    for (const student of students) {
        const studentId = student._id.toString();

        // Get store orders for this student
        const studentStoreOrders = storeOrders.filter(
            order => order.user?._id?.toString() === studentId || order.user?.toString() === studentId
        );

        // Get student orders (OrderStudent) for this student
        const studentOrderStudents = studentOrders.filter(
            order => order.email?.toLowerCase() === student.email?.toLowerCase()
        );

        // Calculate metrics from store orders
        let totalUnits = 0;
        let totalSales = 0;
        let totalOrders = studentStoreOrders.length;

        studentStoreOrders.forEach(order => {
            if (order.products && Array.isArray(order.products)) {
                order.products.forEach(product => {
                    const quantity = product.quantity || 0;
                    const price = product.productPrice || product.price || 0;
                    totalUnits += quantity;
                    totalSales += quantity * price;
                });
            }
        });

        // Add student orders (OrderStudent) metrics
        studentOrderStudents.forEach(order => {
            totalUnits += order.totalUnits || 0;
            totalSales += order.totalAmount || 0;
            totalOrders += 1;
        });

        if (totalOrders > 0) {
            performance.push({
                studentId: studentId,
                studentName: student.name || 'Unknown',
                studentEmail: student.email || '',
                schoolName: student.school?.name || student.school?.nomEcole || 'Unknown',
                schoolId: student.school?._id?.toString() || student.school?.toString() || null,
                totalUnits,
                totalSales,
                totalOrders,
                averageOrderValue: totalSales / totalOrders,
                averageUnitsPerOrder: totalUnits / totalOrders
            });
        }
    }

    // Sort by total sales descending
    return performance.sort((a, b) => b.totalSales - a.totalSales);
}

/**
 * Calculate overall metrics
 */
function calculateOverallMetrics(students, storeOrders, studentOrders, storeVisits) {
    // Total students
    const totalStudents = students.length;

    // Students with at least one order
    const activeStudents = new Set();
    storeOrders.forEach(order => {
        if (order.user?._id) {
            activeStudents.add(order.user._id.toString());
        }
    });
    studentOrders.forEach(order => {
        if (order.email) {
            const student = students.find(s => s.email?.toLowerCase() === order.email?.toLowerCase());
            if (student) {
                activeStudents.add(student._id.toString());
            }
        }
    });

    // Total revenue
    let totalRevenue = 0;
    storeOrders.forEach(order => {
        if (order.products && Array.isArray(order.products)) {
            order.products.forEach(product => {
                const quantity = product.quantity || 0;
                const price = product.productPrice || product.price || 0;
                totalRevenue += quantity * price;
            });
        }
        // Add donations
        totalRevenue += (order.studentDonation || 0) + (order.schoolDonation || 0);
    });
    studentOrders.forEach(order => {
        totalRevenue += order.totalAmount || 0;
    });

    // Total units sold
    let totalUnits = 0;
    storeOrders.forEach(order => {
        if (order.products && Array.isArray(order.products)) {
            order.products.forEach(product => {
                totalUnits += product.quantity || 0;
            });
        }
    });
    studentOrders.forEach(order => {
        totalUnits += order.totalUnits || 0;
    });

    // Total orders
    const totalOrders = storeOrders.length + studentOrders.length;

    // Average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Average products per student (all-time)
    const averageProductsPerStudent = totalStudents > 0 ? totalUnits / totalStudents : 0;

    // Average products per active student
    const averageProductsPerActiveStudent = activeStudents.size > 0
        ? totalUnits / activeStudents.size
        : 0;

    // Store visits
    const totalVisits = storeVisits.length;
    const uniqueVisitors = new Set(storeVisits.map(v => v.sessionId)).size;

    // Conversion rate (orders / visits)
    const conversionRate = totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0;

    return {
        totalStudents,
        activeStudents: activeStudents.size,
        totalRevenue,
        totalUnits,
        totalOrders,
        averageOrderValue,
        averageProductsPerStudent,
        averageProductsPerActiveStudent,
        totalVisits,
        uniqueVisitors,
        conversionRate
    };
}

/**
 * Calculate sales distribution by percentile tranches
 */
function calculateSalesDistribution(studentPerformance) {
    if (studentPerformance.length === 0) {
        return [];
    }

    const totalStudents = studentPerformance.length;
    const tranches = [];

    // Define tranches: 0-5%, 5-10%, 10-15%, etc.
    for (let i = 0; i < 20; i++) {
        const startPercent = i * 5;
        const endPercent = (i + 1) * 5;

        const startIndex = Math.floor((startPercent / 100) * totalStudents);
        const endIndex = Math.floor((endPercent / 100) * totalStudents);

        const trancheStudents = studentPerformance.slice(startIndex, endIndex);

        if (trancheStudents.length > 0) {
            const totalUnits = trancheStudents.reduce((sum, s) => sum + s.totalUnits, 0);
            const totalSales = trancheStudents.reduce((sum, s) => sum + s.totalSales, 0);
            const studentCount = trancheStudents.length;

            tranches.push({
                range: `${startPercent}% - ${endPercent}%`,
                startPercent,
                endPercent,
                studentCount,
                totalUnits,
                totalSales,
                averageUnitsPerStudent: totalUnits / studentCount,
                averageSalesPerStudent: totalSales / studentCount,
                percentageOfTotalUnits: 0, // Will be calculated after all tranches
                percentageOfTotalSales: 0 // Will be calculated after all tranches
            });
        }
    }

    // Calculate percentages
    const grandTotalUnits = studentPerformance.reduce((sum, s) => sum + s.totalUnits, 0);
    const grandTotalSales = studentPerformance.reduce((sum, s) => sum + s.totalSales, 0);

    tranches.forEach(tranche => {
        tranche.percentageOfTotalUnits = grandTotalUnits > 0
            ? (tranche.totalUnits / grandTotalUnits) * 100
            : 0;
        tranche.percentageOfTotalSales = grandTotalSales > 0
            ? (tranche.totalSales / grandTotalSales) * 100
            : 0;
    });

    return tranches;
}

/**
 * Calculate recurring customers metrics
 */
function calculateRecurringCustomers(storeOrders) {
    const customerOrders = {};

    storeOrders.forEach(order => {
        const email = order.customerEmail?.toLowerCase();
        if (email) {
            if (!customerOrders[email]) {
                customerOrders[email] = {
                    email,
                    customerName: order.customerName || 'Unknown',
                    orderCount: 0,
                    totalSpent: 0,
                    firstOrderDate: order.createdAt,
                    lastOrderDate: order.createdAt
                };
            }
            customerOrders[email].orderCount += 1;
            customerOrders[email].totalSpent += order.totalAmount || 0;
            if (order.createdAt < customerOrders[email].firstOrderDate) {
                customerOrders[email].firstOrderDate = order.createdAt;
            }
            if (order.createdAt > customerOrders[email].lastOrderDate) {
                customerOrders[email].lastOrderDate = order.createdAt;
            }
        }
    });

    const customers = Object.values(customerOrders);
    const totalCustomers = customers.length;
    const returningCustomers = customers.filter(c => c.orderCount >= 2).length;
    const oneTimeCustomers = totalCustomers - returningCustomers;

    return {
        totalCustomers,
        returningCustomers,
        oneTimeCustomers,
        returningCustomerRate: totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0,
        topCustomers: customers
            .sort((a, b) => b.orderCount - a.orderCount)
            .slice(0, 10)
    };
}

/**
 * Calculate product performance
 */
function calculateProductPerformance(storeOrders, studentOrders) {
    const productMap = {};

    // Process store orders
    storeOrders.forEach(order => {
        if (order.products && Array.isArray(order.products)) {
            order.products.forEach(product => {
                const productName = product.productName || 'Unknown';
                const quantity = product.quantity || 0;
                const price = product.productPrice || product.price || 0;

                if (!productMap[productName]) {
                    productMap[productName] = {
                        name: productName,
                        totalQuantity: 0,
                        totalRevenue: 0,
                        orderCount: 0
                    };
                }

                productMap[productName].totalQuantity += quantity;
                productMap[productName].totalRevenue += quantity * price;
                productMap[productName].orderCount += 1;
            });
        }
    });

    // Process student orders
    studentOrders.forEach(order => {
        if (order.products && Array.isArray(order.products)) {
            order.products.forEach(product => {
                const productName = product.productName || 'Unknown';
                const quantity = product.quantity || 0;
                const price = product.price || 0;

                if (!productMap[productName]) {
                    productMap[productName] = {
                        name: productName,
                        totalQuantity: 0,
                        totalRevenue: 0,
                        orderCount: 0
                    };
                }

                productMap[productName].totalQuantity += quantity;
                productMap[productName].totalRevenue += quantity * price;
                productMap[productName].orderCount += 1;
            });
        }
    });

    return Object.values(productMap)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 20); // Top 20 products
}

/**
 * Calculate campaign performance (campaign-based, not school-based)
 * Counts students based on enrollment (User.campaigns), not just orders
 */
function calculateCampaignPerformance(storeOrders, studentOrders, students = [], campaignMap = {}, campaignStudentCounts = {}) {
    const campaignDataMap = {};

    // Helper to get campaign key
    const getCampaignKey = (order) => {
        // Try campaignId first (from Order model)
        if (order.campaignId) {
            const campaignId = order.campaignId.toString();
            if (campaignMap[campaignId]) {
                return campaignId;
            }
        }

        // Fallback to campaignNumber + school (from OrderStudent)
        if (order.campaignNumber !== null && order.campaignNumber !== undefined) {
            const schoolId = order.school?._id?.toString() || order.school?.toString() || 'unknown';
            const key = `${schoolId}-${order.campaignNumber}`;
            if (campaignMap[key]) {
                return key;
            }
        }

        // Legacy: if no campaign info, use school as fallback
        const schoolId = order.school?._id?.toString() || order.school?.toString() || 'unknown';
        return `legacy-${schoolId}`;
    };

    // Helper to get campaign info
    const getCampaignInfo = (order) => {
        const key = getCampaignKey(order);
        if (campaignMap[key]) {
            return campaignMap[key];
        }

        // Legacy fallback - try to get school name
        const school = order.school;
        const schoolName = school?.nomEcole || school?.name || school?.toString() || 'Unknown';
        const schoolId = school?._id?.toString() || school?.toString() || 'unknown';

        return {
            campaignId: key,
            campaignName: `Campagne Legacy - ${schoolName}`,
            campaignNumber: order.campaignNumber || 0,
            schoolId,
            schoolName,
            schoolCode: ''
        };
    };

    // Process store orders
    storeOrders.forEach(order => {
        const campaignInfo = getCampaignInfo(order);
        const key = campaignInfo.campaignId;

        if (!campaignDataMap[key]) {
            campaignDataMap[key] = {
                campaignId: campaignInfo.campaignId,
                campaignName: campaignInfo.campaignName,
                campaignNumber: campaignInfo.campaignNumber,
                schoolId: campaignInfo.schoolId,
                schoolName: campaignInfo.schoolName,
                schoolCode: campaignInfo.schoolCode,
                totalRevenue: 0,
                totalUnits: 0,
                totalOrders: 0,
                studentCount: 0
            };
        }

        if (order.products && Array.isArray(order.products)) {
            order.products.forEach(product => {
                campaignDataMap[key].totalUnits += product.quantity || 0;
                campaignDataMap[key].totalRevenue += (product.productPrice || product.price || 0) * (product.quantity || 0);
            });
        }
        campaignDataMap[key].totalOrders += 1;
    });

    // Process student orders
    studentOrders.forEach(order => {
        const campaignInfo = getCampaignInfo(order);
        const key = campaignInfo.campaignId;

        if (!campaignDataMap[key]) {
            campaignDataMap[key] = {
                campaignId: campaignInfo.campaignId,
                campaignName: campaignInfo.campaignName,
                campaignNumber: campaignInfo.campaignNumber,
                schoolId: campaignInfo.schoolId,
                schoolName: campaignInfo.schoolName,
                schoolCode: campaignInfo.schoolCode,
                totalRevenue: 0,
                totalUnits: 0,
                totalOrders: 0,
                studentCount: 0
            };
        }

        campaignDataMap[key].totalUnits += order.totalUnits || 0;
        campaignDataMap[key].totalRevenue += order.totalAmount || 0;
        campaignDataMap[key].totalOrders += 1;
    });

    // Count students per campaign using pre-calculated counts from database
    // This is more accurate and efficient than iterating through all students
    Object.keys(campaignDataMap).forEach(key => {
        const campaign = campaignDataMap[key];

        // Use pre-calculated count if available
        if (campaignStudentCounts[campaign.campaignId]) {
            campaignDataMap[key].studentCount = campaignStudentCounts[campaign.campaignId];
        } else if (campaign.schoolId && campaign.campaignNumber !== null && campaign.campaignNumber !== undefined) {
            // Try to find by schoolId + campaignNumber
            const schoolCampaignKey = `${campaign.schoolId}-${campaign.campaignNumber}`;
            if (campaignStudentCounts[schoolCampaignKey]) {
                campaignDataMap[key].studentCount = campaignStudentCounts[schoolCampaignKey];
            }
        }

        // For legacy campaigns, count students with school reference but no campaigns
        if (campaign.campaignId.startsWith('legacy-') && campaignDataMap[key].studentCount === 0) {
            const legacySchoolId = campaign.schoolId;
            const legacyStudents = students.filter(s => {
                const studentSchoolId = s.school?._id?.toString() || s.school?.toString();
                return (!s.campaigns || s.campaigns.length === 0) && studentSchoolId === legacySchoolId;
            });
            campaignDataMap[key].studentCount = legacyStudents.length;
        }
    });

    // Also count students from orders who might not be in User.campaigns yet
    // (for cases where orders exist but enrollment hasn't been recorded)
    const studentsWithOrdersByCampaign = {};
    storeOrders.forEach(order => {
        const campaignInfo = getCampaignInfo(order);
        const key = campaignInfo.campaignId;
        const userId = order.user?._id?.toString() || order.user?.toString();

        if (userId && key) {
            if (!studentsWithOrdersByCampaign[key]) {
                studentsWithOrdersByCampaign[key] = new Set();
            }
            studentsWithOrdersByCampaign[key].add(userId);
        }
    });

    // Add students from orders who aren't already counted
    Object.keys(campaignDataMap).forEach(key => {
        const studentsWithOrders = studentsWithOrdersByCampaign[key] || new Set();
        studentsWithOrders.forEach(userId => {
            // Check if this student is already counted in this campaign
            const student = students.find(s => s._id.toString() === userId);
            if (student) {
                const isEnrolled = student.campaigns?.some(c => {
                    const cId = c.campaignId?.toString() || c.campaignId?.toString();
                    return cId === key;
                });
                // If not enrolled but has orders, count them (data inconsistency case)
                if (!isEnrolled && campaignDataMap[key]) {
                    campaignDataMap[key].studentCount += 1;
                }
            }
        });
    });

    return Object.values(campaignDataMap)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Calculate time series data for charts
 */
function calculateTimeSeries(storeOrders, studentOrders, storeVisits, dateFilter) {
    const timeMap = {};

    // Combine all orders
    const allOrders = [
        ...storeOrders.map(o => ({ ...o, type: 'store' })),
        ...studentOrders.map(o => ({ ...o, type: 'student', createdAt: o.timestamp || o.createdAt }))
    ];

    // Process orders
    allOrders.forEach(order => {
        if (!order.createdAt) return;
        const dateKey = order.createdAt.toISOString().split('T')[0];

        if (!timeMap[dateKey]) {
            timeMap[dateKey] = {
                date: dateKey,
                revenue: 0,
                units: 0,
                orders: 0,
                visits: 0
            };
        }

        if (order.type === 'store' && order.products) {
            order.products.forEach(product => {
                timeMap[dateKey].units += product.quantity || 0;
                timeMap[dateKey].revenue += (product.productPrice || product.price || 0) * (product.quantity || 0);
            });
        } else if (order.type === 'student') {
            timeMap[dateKey].units += order.totalUnits || 0;
            timeMap[dateKey].revenue += order.totalAmount || 0;
        }
        timeMap[dateKey].orders += 1;
    });

    // Process visits
    storeVisits.forEach(visit => {
        if (!visit.createdAt) return;
        const dateKey = visit.createdAt.toISOString().split('T')[0];

        if (!timeMap[dateKey]) {
            timeMap[dateKey] = {
                date: dateKey,
                revenue: 0,
                units: 0,
                orders: 0,
                visits: 0
            };
        }

        timeMap[dateKey].visits += 1;
    });

    // Convert to array and sort
    return Object.values(timeMap).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Calculate enrollment diagnostics - find students who should be enrolled but aren't
 */
function calculateEnrollmentDiagnostics(allCampaigns, students, storeOrders, studentOrders) {
    const diagnostics = {
        studentsWithOrdersButNotEnrolled: [],
        campaignsWithLowEnrollment: []
    };

    // Find students who have orders but aren't enrolled in the campaign
    const studentsWithOrders = new Set();
    storeOrders.forEach(order => {
        if (order.user?._id) {
            studentsWithOrders.add(order.user._id.toString());
        }
    });
    studentOrders.forEach(order => {
        if (order.email) {
            const student = students.find(s => s.email?.toLowerCase() === order.email?.toLowerCase());
            if (student) {
                studentsWithOrders.add(student._id.toString());
            }
        }
    });

    // Check each student with orders
    studentsWithOrders.forEach(userId => {
        const student = students.find(s => s._id.toString() === userId);
        if (!student) return;

        // Find orders for this student
        const studentStoreOrders = storeOrders.filter(
            o => o.user?._id?.toString() === userId || o.user?.toString() === userId
        );
        const studentOrderStudents = studentOrders.filter(
            o => o.email?.toLowerCase() === student.email?.toLowerCase()
        );

        // Check if student is enrolled in campaigns for these orders
        studentStoreOrders.forEach(order => {
            if (order.campaignId) {
                const campaignId = order.campaignId.toString();
                const isEnrolled = student.campaigns?.some(c => {
                    const cId = c.campaignId?.toString() || c.campaignId?._id?.toString();
                    return cId === campaignId;
                });
                if (!isEnrolled) {
                    diagnostics.studentsWithOrdersButNotEnrolled.push({
                        studentId: userId,
                        studentName: student.name,
                        studentEmail: student.email,
                        campaignId,
                        orderCount: studentStoreOrders.length + studentOrderStudents.length
                    });
                }
            }
        });
    });

    // Find campaigns with suspiciously low enrollment
    allCampaigns.forEach(campaign => {
        const campaignId = campaign._id.toString();
        const schoolId = campaign.school?._id?.toString() || campaign.school?.toString();

        // Count students from this school
        const studentsFromSchool = students.filter(s => {
            const studentSchoolId = s.school?._id?.toString() || s.school?.toString();
            return studentSchoolId === schoolId;
        });

        // Count students enrolled in this campaign
        const enrolledCount = students.filter(s => {
            return s.campaigns?.some(c => {
                const cId = c.campaignId?.toString() || c.campaignId?._id?.toString();
                return cId === campaignId;
            });
        }).length;

        // If there are many students from the school but few enrolled, flag it
        if (studentsFromSchool.length > 5 && enrolledCount < studentsFromSchool.length * 0.3) {
            diagnostics.campaignsWithLowEnrollment.push({
                campaignId,
                campaignName: campaign.name || `Campagne #${campaign.campaignNumber}`,
                campaignNumber: campaign.campaignNumber,
                schoolName: campaign.school?.nomEcole || campaign.school?.name || 'Unknown',
                schoolId,
                totalStudentsInSchool: studentsFromSchool.length,
                enrolledStudents: enrolledCount,
                enrollmentRate: (enrolledCount / studentsFromSchool.length) * 100
            });
        }
    });

    return diagnostics;
}

