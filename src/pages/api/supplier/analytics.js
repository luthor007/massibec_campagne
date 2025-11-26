import dbConnect from '../../../lib/mongodb';
import mongoose from 'mongoose';
import Order from '../../../models/Order';
import OrderStudent from '../../../models/OrderStudent';
import StoreVisit from '../../../models/StoreVisit';
import User from '../../../models/User';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import SupplierManager from '../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();

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

        // Get all campaigns for this supplier
        const supplierCampaigns = await Campaign.find({ supplier: supplierId })
            .populate('school', 'name nomEcole code')
            .select('_id name campaignNumber school startDate endDate status')
            .lean();

        const campaignIds = supplierCampaigns.map(c => c._id);

        if (campaignIds.length === 0) {
            // Return empty analytics if no campaigns
            return res.status(200).json({
                overallMetrics: {
                    totalStudents: 0,
                    activeStudents: 0,
                    totalRevenue: 0,
                    totalUnits: 0,
                    totalOrders: 0,
                    averageOrderValue: 0,
                    averageProductsPerStudent: 0,
                    averageProductsPerActiveStudent: 0,
                    totalVisits: 0,
                    uniqueVisitors: 0,
                    conversionRate: 0
                },
                studentPerformance: [],
                salesDistribution: [],
                recurringCustomers: {
                    totalCustomers: 0,
                    returningCustomers: 0,
                    oneTimeCustomers: 0,
                    returningCustomerRate: 0,
                    topCustomers: []
                },
                productPerformance: [],
                campaignPerformance: [],
                timeSeries: [],
                enrollmentDiagnostics: {
                    studentsWithOrdersButNotEnrolled: [],
                    campaignsWithLowEnrollment: []
                }
            });
        }

        // Build school filter (only for supplier's schools)
        const supplierSchoolIds = [...new Set(supplierCampaigns.map(c => {
            const schoolId = c.school?._id?.toString() || c.school?.toString();
            return schoolId;
        }).filter(Boolean))];

        const schoolFilter = {};
        if (schoolIds) {
            const schoolIdArray = schoolIds.split(',').map(id => id.trim()).filter(Boolean);
            // Filter to only include supplier's schools
            const filteredSchoolIds = schoolIdArray.filter(id => supplierSchoolIds.includes(id));
            if (filteredSchoolIds.length > 0) {
                const schoolObjectIds = filteredSchoolIds
                    .filter(id => mongoose.Types.ObjectId.isValid(id))
                    .map(id => new mongoose.Types.ObjectId(id));
                const schoolStrings = filteredSchoolIds.filter(id => !mongoose.Types.ObjectId.isValid(id));

                if (schoolObjectIds.length > 0 && schoolStrings.length > 0) {
                    schoolFilter.school = { $in: [...schoolObjectIds, ...schoolStrings] };
                } else if (schoolObjectIds.length > 0) {
                    schoolFilter.school = { $in: schoolObjectIds };
                } else {
                    schoolFilter.school = { $in: schoolStrings };
                }
            }
        } else {
            // If no school filter, use all supplier's schools
            if (supplierSchoolIds.length > 0) {
                const schoolObjectIds = supplierSchoolIds
                    .filter(id => mongoose.Types.ObjectId.isValid(id))
                    .map(id => new mongoose.Types.ObjectId(id));
                const schoolStrings = supplierSchoolIds.filter(id => !mongoose.Types.ObjectId.isValid(id));

                if (schoolObjectIds.length > 0 && schoolStrings.length > 0) {
                    schoolFilter.school = { $in: [...schoolObjectIds, ...schoolStrings] };
                } else if (schoolObjectIds.length > 0) {
                    schoolFilter.school = { $in: schoolObjectIds };
                } else {
                    schoolFilter.school = { $in: schoolStrings };
                }
            }
        }

        // Fetch students from supplier's schools only
        const studentsQuery = {};
        if (Object.keys(schoolFilter).length > 0 && schoolFilter.school) {
            studentsQuery.school = schoolFilter.school;
        }
        const students = await User.find({ role: 'student', ...studentsQuery })
            .populate('school', 'name nomEcole')
            .lean();

        // Fetch store orders for supplier's campaigns only
        const storeOrdersQuery = {
            ...dateFilter,
            campaignId: { $in: campaignIds },
            isTest: { $ne: true }
        };
        if (Object.keys(schoolFilter).length > 0) {
            storeOrdersQuery.school = schoolFilter.school;
        }
        const storeOrders = await Order.find(storeOrdersQuery)
            .populate('user', 'name email')
            .lean();

        // Fetch student orders for supplier's schools
        const studentOrdersQuery = { ...dateFilter, isTest: { $ne: true } };
        if (Object.keys(schoolFilter).length > 0) {
            studentOrdersQuery.school = schoolFilter.school;
        }
        const studentOrders = await OrderStudent.find(studentOrdersQuery)
            .populate('school', 'name nomEcole')
            .lean();

        // Filter student orders to only include those matching supplier's campaigns
        const filteredStudentOrders = studentOrders.filter(order => {
            if (!order.campaignNumber) return false;
            const schoolId = order.school?._id?.toString() || order.school?.toString();
            return supplierCampaigns.some(c => {
                const campaignSchoolId = c.school?._id?.toString() || c.school?.toString();
                return campaignSchoolId === schoolId && c.campaignNumber === order.campaignNumber;
            });
        });

        // Fetch store visits for supplier's schools
        const visitQuery = { ...dateFilter };
        if (Object.keys(schoolFilter).length > 0) {
            visitQuery.schoolId = schoolFilter.school;
        }
        const storeVisits = await StoreVisit.find(visitQuery).lean();

        // Calculate student performance metrics
        const studentPerformance = await calculateStudentPerformance(
            students,
            storeOrders,
            filteredStudentOrders,
            dateFilter
        );

        // Calculate overall metrics
        const overallMetrics = calculateOverallMetrics(
            students,
            storeOrders,
            filteredStudentOrders,
            storeVisits
        );

        // Calculate sales distribution by percentile tranches
        const salesDistribution = calculateSalesDistribution(studentPerformance);

        // Calculate recurring customers
        const recurringCustomers = calculateRecurringCustomers(storeOrders);

        // Calculate product performance
        const productPerformance = calculateProductPerformance(storeOrders, filteredStudentOrders);

        // Build campaign map for supplier's campaigns
        const campaignMap = {};
        supplierCampaigns.forEach(campaign => {
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

            const key = `${schoolId}-${campaign.campaignNumber}`;
            campaignMap[key] = campaignMap[campaignId];
        });

        // Count students enrolled in each campaign
        const campaignStudentCounts = {};
        for (const campaign of supplierCampaigns) {
            const campaignId = campaign._id.toString();
            const enrolledCount = await User.countDocuments({
                'campaigns.campaignId': campaign._id
            });
            campaignStudentCounts[campaignId] = enrolledCount;

            const schoolId = campaign.school?._id?.toString() || campaign.school?.toString();
            if (schoolId && campaign.campaignNumber !== null && campaign.campaignNumber !== undefined) {
                const key = `${schoolId}-${campaign.campaignNumber}`;
                campaignStudentCounts[key] = enrolledCount;
            }
        }

        // Calculate campaign performance
        const campaignPerformance = calculateCampaignPerformance(
            storeOrders,
            filteredStudentOrders,
            students,
            campaignMap,
            campaignStudentCounts
        );

        // Enrollment diagnostics
        const enrollmentDiagnostics = calculateEnrollmentDiagnostics(
            supplierCampaigns,
            students,
            storeOrders,
            filteredStudentOrders
        );

        // Calculate unique students with sales
        const totalStudentsWithSales = new Set();
        storeOrders.forEach(order => {
            if (order.user?._id) {
                totalStudentsWithSales.add(order.user._id.toString());
            }
        });
        filteredStudentOrders.forEach(order => {
            if (order.email) {
                const student = students.find(s => s.email?.toLowerCase() === order.email?.toLowerCase());
                if (student) {
                    totalStudentsWithSales.add(student._id.toString());
                }
            }
        });

        const totalStudentsInCampaigns = campaignPerformance.reduce((sum, c) => sum + c.studentCount, 0);
        overallMetrics.totalStudentsWithSales = totalStudentsWithSales.size;
        overallMetrics.totalStudentsInCampaigns = totalStudentsInCampaigns;

        // Calculate time series data
        const timeSeries = calculateTimeSeries(storeOrders, filteredStudentOrders, storeVisits, dateFilter);

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

// Reuse helper functions from massibec analytics
async function calculateStudentPerformance(students, storeOrders, studentOrders, dateFilter) {
    const performance = [];

    for (const student of students) {
        const studentId = student._id.toString();

        const studentStoreOrders = storeOrders.filter(
            order => order.user?._id?.toString() === studentId || order.user?.toString() === studentId
        );

        const studentOrderStudents = studentOrders.filter(
            order => order.email?.toLowerCase() === student.email?.toLowerCase()
        );

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

    return performance.sort((a, b) => b.totalSales - a.totalSales);
}

function calculateOverallMetrics(students, storeOrders, studentOrders, storeVisits) {
    const totalStudents = students.length;

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

    let totalRevenue = 0;
    storeOrders.forEach(order => {
        if (order.products && Array.isArray(order.products)) {
            order.products.forEach(product => {
                const quantity = product.quantity || 0;
                const price = product.productPrice || product.price || 0;
                totalRevenue += quantity * price;
            });
        }
        totalRevenue += (order.studentDonation || 0) + (order.schoolDonation || 0);
    });
    studentOrders.forEach(order => {
        totalRevenue += order.totalAmount || 0;
    });

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

    const totalOrders = storeOrders.length + studentOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageProductsPerStudent = totalStudents > 0 ? totalUnits / totalStudents : 0;
    const averageProductsPerActiveStudent = activeStudents.size > 0
        ? totalUnits / activeStudents.size
        : 0;

    const totalVisits = storeVisits.length;
    const uniqueVisitors = new Set(storeVisits.map(v => v.sessionId)).size;
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

function calculateSalesDistribution(studentPerformance) {
    if (studentPerformance.length === 0) {
        return [];
    }

    const totalStudents = studentPerformance.length;
    const tranches = [];

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
                percentageOfTotalUnits: 0,
                percentageOfTotalSales: 0
            });
        }
    }

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

function calculateProductPerformance(storeOrders, studentOrders) {
    const productMap = {};

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
        .slice(0, 20);
}

function calculateCampaignPerformance(storeOrders, studentOrders, students = [], campaignMap = {}, campaignStudentCounts = {}) {
    const campaignDataMap = {};

    const getCampaignKey = (order) => {
        if (order.campaignId) {
            const campaignId = order.campaignId.toString();
            if (campaignMap[campaignId]) {
                return campaignId;
            }
        }

        if (order.campaignNumber !== null && order.campaignNumber !== undefined) {
            const schoolId = order.school?._id?.toString() || order.school?.toString() || 'unknown';
            const key = `${schoolId}-${order.campaignNumber}`;
            if (campaignMap[key]) {
                return key;
            }
        }

        const schoolId = order.school?._id?.toString() || order.school?.toString() || 'unknown';
        return `legacy-${schoolId}`;
    };

    const getCampaignInfo = (order) => {
        const key = getCampaignKey(order);
        if (campaignMap[key]) {
            return campaignMap[key];
        }

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

    Object.keys(campaignDataMap).forEach(key => {
        const campaign = campaignDataMap[key];

        if (campaignStudentCounts[campaign.campaignId]) {
            campaignDataMap[key].studentCount = campaignStudentCounts[campaign.campaignId];
        } else if (campaign.schoolId && campaign.campaignNumber !== null && campaign.campaignNumber !== undefined) {
            const schoolCampaignKey = `${campaign.schoolId}-${campaign.campaignNumber}`;
            if (campaignStudentCounts[schoolCampaignKey]) {
                campaignDataMap[key].studentCount = campaignStudentCounts[schoolCampaignKey];
            }
        }
    });

    return Object.values(campaignDataMap)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

function calculateTimeSeries(storeOrders, studentOrders, storeVisits, dateFilter) {
    const timeMap = {};

    const allOrders = [
        ...storeOrders.map(o => ({ ...o, type: 'store' })),
        ...studentOrders.map(o => ({ ...o, type: 'student', createdAt: o.timestamp || o.createdAt }))
    ];

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

    return Object.values(timeMap).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function calculateEnrollmentDiagnostics(allCampaigns, students, storeOrders, studentOrders) {
    const diagnostics = {
        studentsWithOrdersButNotEnrolled: [],
        campaignsWithLowEnrollment: []
    };

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

    studentsWithOrders.forEach(userId => {
        const student = students.find(s => s._id.toString() === userId);
        if (!student) return;

        const studentStoreOrders = storeOrders.filter(
            o => o.user?._id?.toString() === userId || o.user?.toString() === userId
        );
        const studentOrderStudents = studentOrders.filter(
            o => o.email?.toLowerCase() === student.email?.toLowerCase()
        );

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

    allCampaigns.forEach(campaign => {
        const campaignId = campaign._id.toString();
        const schoolId = campaign.school?._id?.toString() || campaign.school?.toString();

        const studentsFromSchool = students.filter(s => {
            const studentSchoolId = s.school?._id?.toString() || s.school?.toString();
            return studentSchoolId === schoolId;
        });

        const enrolledCount = students.filter(s => {
            return s.campaigns?.some(c => {
                const cId = c.campaignId?.toString() || c.campaignId?._id?.toString();
                return cId === campaignId;
            });
        }).length;

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
