import dbConnect from '@/lib/mongodb';
import { checkAdminAccess } from '@/lib/adminAuth';
import User from '@/models/User';
import School from '@/models/School';
import Supplier from '@/models/Supplier';
import Order from '@/models/Order';
import OrderStudent from '@/models/OrderStudent';
import Campaign from '@/models/Campaign';
import FunnelEvent from '@/models/FunnelEvent';
import StoreVisit from '@/models/StoreVisit';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();

        // Check admin access
        const { authorized, message } = await checkAdminAccess(req);
        if (!authorized) {
            return res.status(403).json({ message });
        }

        // Get all data
        const [
            users,
            schools,
            suppliers,
            orders,
            studentOrders,
            campaigns,
            funnelEvents,
            storeVisits
        ] = await Promise.all([
            User.find({}),
            School.find({}),
            Supplier.find({}),
            Order.find({}),
            OrderStudent.find({}),
            Campaign.find({}),
            FunnelEvent.find({}),
            StoreVisit.find({})
        ]);

        // Calculate metrics by user type
        const students = users.filter(u => u.role === 'student');
        const schoolManagers = users.filter(u => u.role === 'school_manager');
        const supplierManagers = users.filter(u => u.role === 'supplier');

        // Calculate conversion rates
        const conversionRates = calculateConversionRates(funnelEvents, users, campaigns);

        // Calculate Lifetime Value (LTV) and Gross Profit
        const ltvMetrics = await calculateLTVMetrics(students, schoolManagers, suppliers, orders, studentOrders);

        // Calculate funnel analytics
        const funnelAnalytics = calculateFunnelAnalytics(funnelEvents, users);

        // Calculate overall platform metrics
        const platformMetrics = calculatePlatformMetrics(
            users,
            schools,
            suppliers,
            campaigns,
            orders,
            studentOrders
        );

        res.status(200).json({
            conversionRates,
            ltvMetrics,
            funnelAnalytics,
            platformMetrics
        });
    } catch (error) {
        console.error('Error fetching admin analytics:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

function calculateConversionRates(funnelEvents, users, campaigns) {
    // Group events by user type
    const studentEvents = funnelEvents.filter(e => {
        const user = users.find(u => u._id.toString() === e.userId?.toString());
        return user?.role === 'student';
    });

    const schoolEvents = funnelEvents.filter(e => {
        const user = users.find(u => u._id.toString() === e.userId?.toString());
        return user?.role === 'school_manager';
    });

    const supplierEvents = funnelEvents.filter(e => {
        const user = users.find(u => u._id.toString() === e.userId?.toString());
        return user?.role === 'supplier';
    });

    // Calculate conversion rates for each user type
    const calculateForType = (events, totalUsers, userType) => {
        const uniqueSessions = new Set(events.map(e => e.sessionId));

        // Get landing page visits (home_visit or landing_page_visit)
        const landingVisits = events.filter(e => {
            if (e.eventType === 'home_visit') return true;
            if (e.eventType === 'landing_page_visit') {
                // Check if the audience matches the user type
                const audience = e.metadata?.audience || '';
                if (userType === 'student' && (audience === 'student' || audience === 'eleve')) return true;
                if (userType === 'school' && (audience === 'ecole' || audience === 'school')) return true;
                if (userType === 'supplier' && (audience === 'fournisseur' || audience === 'supplier')) return true;
            }
            // Legacy event types
            if (userType === 'student' && e.eventType === 'landing_eleve') return true;
            if (userType === 'school' && e.eventType === 'landing_ecole') return true;
            if (userType === 'supplier' && e.eventType === 'landing_fournisseur') return true;
            return false;
        }).length;

        // Get registration events (generic or type-specific)
        const registrationPageVisits = events.filter(e =>
            e.eventType === 'registration_page_visit' ||
            (userType === 'student' && e.eventType === 'registration_page_visit') ||
            (userType === 'school' && e.eventType === 'school_registration_page_visit') ||
            (userType === 'supplier' && e.eventType === 'supplier_registration_page_visit')
        ).length;

        const registrationsStarted = events.filter(e =>
            e.eventType === 'registration_started' ||
            (userType === 'school' && e.eventType === 'school_registration_started') ||
            (userType === 'supplier' && e.eventType === 'supplier_registration_started')
        ).length;

        const registrations = events.filter(e =>
            e.eventType === 'registration_completed' ||
            (userType === 'school' && e.eventType === 'school_registration_completed') ||
            (userType === 'supplier' && e.eventType === 'supplier_registration_completed')
        ).length;

        const verified = events.filter(e =>
            e.eventType === 'email_verified' ||
            (userType === 'school' && e.eventType === 'school_email_verified') ||
            (userType === 'supplier' && e.eventType === 'supplier_email_verified')
        ).length;

        const joinedCampaign = events.filter(e => e.eventType === 'campaign_joined').length;
        const onboardingComplete = events.filter(e => e.eventType === 'onboarding_completed').length;
        const checkoutReached = events.filter(e => e.eventType === 'checkout_reached').length;
        const paymentCompleted = events.filter(e => e.eventType === 'payment_completed').length;

        return {
            totalUsers,
            uniqueSessions: uniqueSessions.size,
            landingVisits,
            registrationPageVisits,
            registrationsStarted,
            registrations,
            verified,
            joinedCampaign,
            onboardingComplete,
            checkoutReached,
            paymentCompleted,
            landingToRegistration: landingVisits > 0 ? (registrations / landingVisits) * 100 : 0,
            registrationPageToStarted: registrationPageVisits > 0 ? (registrationsStarted / registrationPageVisits) * 100 : 0,
            startedToCompleted: registrationsStarted > 0 ? (registrations / registrationsStarted) * 100 : 0,
            registrationToVerified: registrations > 0 ? (verified / registrations) * 100 : 0,
            verifiedToCampaign: verified > 0 ? (joinedCampaign / verified) * 100 : 0,
            campaignToOnboarding: joinedCampaign > 0 ? (onboardingComplete / joinedCampaign) * 100 : 0,
            onboardingToCheckout: onboardingComplete > 0 ? (checkoutReached / onboardingComplete) * 100 : 0,
            checkoutToPayment: checkoutReached > 0 ? (paymentCompleted / checkoutReached) * 100 : 0,
            overallConversion: landingVisits > 0 ? (paymentCompleted / landingVisits) * 100 : 0
        };
    };

    return {
        students: calculateForType(studentEvents, users.filter(u => u.role === 'student').length, 'student'),
        schools: calculateForType(schoolEvents, users.filter(u => u.role === 'school_manager').length, 'school'),
        suppliers: calculateForType(supplierEvents, users.filter(u => u.role === 'supplier').length, 'supplier')
    };
}

async function calculateLTVMetrics(students, schoolManagers, suppliers, orders, studentOrders) {
    // Calculate for students
    const studentLTV = calculateUserTypeLTV(students, orders, studentOrders, 'student');

    // Calculate for schools (aggregate all students in their campaigns)
    const schoolLTV = await calculateSchoolLTV(schoolManagers, students, orders, studentOrders);

    // Calculate for suppliers
    const supplierLTV = calculateSupplierLTV(suppliers, orders, studentOrders);

    return {
        students: studentLTV,
        schools: schoolLTV,
        suppliers: supplierLTV
    };
}

function calculateUserTypeLTV(users, orders, studentOrders, userType) {
    const userMetrics = users.map(user => {
        // Get orders for this user
        const userOrders = orders.filter(o =>
            o.user?.toString() === user._id.toString()
        );

        const userStudentOrders = studentOrders.filter(o =>
            o.email?.toLowerCase() === user.email?.toLowerCase()
        );

        // Calculate total revenue
        let totalRevenue = 0;
        userOrders.forEach(order => {
            order.products?.forEach(product => {
                totalRevenue += (product.productPrice || product.price || 0) * (product.quantity || 0);
            });
            totalRevenue += (order.studentDonation || 0) + (order.schoolDonation || 0);
        });
        userStudentOrders.forEach(order => {
            totalRevenue += order.totalAmount || 0;
        });

        // Calculate gross profit (revenue - cost)
        let totalCost = 0;
        userOrders.forEach(order => {
            order.products?.forEach(product => {
                totalCost += (product.productCost || 0) * (product.quantity || 0);
            });
        });
        userStudentOrders.forEach(order => {
            order.products?.forEach(product => {
                totalCost += (product.cost || 0) * (product.quantity || 0);
            });
        });

        const grossProfit = totalRevenue - totalCost;

        return {
            userId: user._id,
            email: user.email,
            totalRevenue,
            totalCost,
            grossProfit,
            orderCount: userOrders.length + userStudentOrders.length
        };
    });

    const totalRevenue = userMetrics.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalGrossProfit = userMetrics.reduce((sum, m) => sum + m.grossProfit, 0);
    const totalUsers = users.length;

    return {
        averageLTV: totalUsers > 0 ? totalRevenue / totalUsers : 0,
        averageGrossProfit: totalUsers > 0 ? totalGrossProfit / totalUsers : 0,
        totalRevenue,
        totalGrossProfit,
        totalUsers,
        userDetails: userMetrics
    };
}

async function calculateSchoolLTV(schoolManagers, students, orders, studentOrders) {
    // Populate school references
    const schoolManagersWithSchools = await Promise.all(
        schoolManagers.map(async (manager) => {
            const schoolId = manager.schoolManagerInfo?.organisme;
            if (!schoolId) return { manager, school: null };

            const school = await School.findById(schoolId);
            return { manager, school };
        })
    );

    // Group students by school
    const schoolMetrics = schoolManagersWithSchools
        .filter(({ school }) => school !== null)
        .map(({ manager, school }) => {
            const schoolId = school._id;

            // Find all students associated with this school
            const schoolStudents = students.filter(s =>
                s.school?.toString() === schoolId.toString() ||
                s.campaigns?.some(c => c.schoolId?.toString() === schoolId.toString())
            );

            // Calculate aggregated metrics
            const studentMetrics = schoolStudents.map(student => {
                const userOrders = orders.filter(o =>
                    o.user?.toString() === student._id.toString()
                );
                const userStudentOrders = studentOrders.filter(o =>
                    o.email?.toLowerCase() === student.email?.toLowerCase()
                );

                let revenue = 0;
                let cost = 0;

                userOrders.forEach(order => {
                    order.products?.forEach(product => {
                        revenue += (product.productPrice || product.price || 0) * (product.quantity || 0);
                        cost += (product.productCost || 0) * (product.quantity || 0);
                    });
                    revenue += (order.studentDonation || 0) + (order.schoolDonation || 0);
                });
                userStudentOrders.forEach(order => {
                    revenue += order.totalAmount || 0;
                    order.products?.forEach(product => {
                        cost += (product.cost || 0) * (product.quantity || 0);
                    });
                });

                return { revenue, cost, grossProfit: revenue - cost };
            });

            const totalRevenue = studentMetrics.reduce((sum, m) => sum + m.revenue, 0);
            const totalGrossProfit = studentMetrics.reduce((sum, m) => sum + m.grossProfit, 0);

            return {
                schoolId: schoolId.toString(),
                schoolName: school.name || 'Unknown',
                totalRevenue,
                totalGrossProfit,
                studentCount: schoolStudents.length
            };
        });

    const totalRevenue = schoolMetrics.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalGrossProfit = schoolMetrics.reduce((sum, m) => sum + m.totalGrossProfit, 0);
    const totalSchools = schoolMetrics.length;

    return {
        averageLTV: totalSchools > 0 ? totalRevenue / totalSchools : 0,
        averageGrossProfit: totalSchools > 0 ? totalGrossProfit / totalSchools : 0,
        totalRevenue,
        totalGrossProfit,
        totalSchools,
        schoolDetails: schoolMetrics
    };
}

function calculateSupplierLTV(suppliers, orders, studentOrders) {
    const supplierMetrics = suppliers.map(supplier => {
        // Get all orders for products from this supplier
        const supplierOrders = orders.filter(o =>
            o.products?.some(p => p.product?.supplier?.toString() === supplier._id.toString())
        );
        const supplierStudentOrders = studentOrders.filter(o =>
            o.products?.some(p => p.productName && supplier.products?.some(sp => sp.name === p.productName))
        );

        let revenue = 0;
        let cost = 0;

        supplierOrders.forEach(order => {
            order.products?.forEach(product => {
                if (product.product?.supplier?.toString() === supplier._id.toString()) {
                    revenue += (product.productPrice || product.price || 0) * (product.quantity || 0);
                    cost += (product.productCost || 0) * (product.quantity || 0);
                }
            });
        });
        supplierStudentOrders.forEach(order => {
            order.products?.forEach(product => {
                if (supplier.products?.some(sp => sp.name === product.productName)) {
                    revenue += (product.price || 0) * (product.quantity || 0);
                    cost += (product.cost || 0) * (product.quantity || 0);
                }
            });
        });

        const grossProfit = revenue - cost;

        return {
            supplierId: supplier._id.toString(),
            supplierName: supplier.name,
            totalRevenue: revenue,
            totalGrossProfit: grossProfit,
            orderCount: supplierOrders.length + supplierStudentOrders.length
        };
    });

    const totalRevenue = supplierMetrics.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalGrossProfit = supplierMetrics.reduce((sum, m) => sum + m.totalGrossProfit, 0);
    const totalSuppliers = supplierMetrics.length;

    return {
        averageLTV: totalSuppliers > 0 ? totalRevenue / totalSuppliers : 0,
        averageGrossProfit: totalSuppliers > 0 ? totalGrossProfit / totalSuppliers : 0,
        totalRevenue,
        totalGrossProfit,
        totalSuppliers,
        supplierDetails: supplierMetrics
    };
}

function calculateFunnelAnalytics(funnelEvents, users) {
    const steps = [
        'home_visit',
        'landing_page_visit',
        'registration_page_visit',
        'registration_started',
        'registration_completed',
        'email_verified',
        'campaign_joined',
        'onboarding_completed',
        'store_created',
        'store_personalized',
        'add_to_cart',
        'checkout_reached',
        'payment_completed'
    ];

    const stepCounts = {};
    const uniqueSessions = new Set();

    steps.forEach(step => {
        const events = funnelEvents.filter(e => e.eventType === step);
        stepCounts[step] = {
            total: events.length,
            uniqueSessions: new Set(events.map(e => e.sessionId)).size
        };
        events.forEach(e => uniqueSessions.add(e.sessionId));
    });

    return {
        steps: stepCounts,
        totalUniqueSessions: uniqueSessions.size,
        totalEvents: funnelEvents.length
    };
}

function calculatePlatformMetrics(users, schools, suppliers, campaigns, orders, studentOrders) {
    const totalUsers = users.length;
    const totalSchools = schools.length;
    const totalSuppliers = suppliers.length;
    const totalCampaigns = campaigns.length;
    const totalOrders = orders.length + studentOrders.length;

    // Calculate total revenue
    let totalRevenue = 0;
    orders.forEach(order => {
        order.products?.forEach(product => {
            totalRevenue += (product.productPrice || product.price || 0) * (product.quantity || 0);
        });
        totalRevenue += (order.studentDonation || 0) + (order.schoolDonation || 0);
    });
    studentOrders.forEach(order => {
        totalRevenue += order.totalAmount || 0;
    });

    return {
        totalUsers,
        totalSchools,
        totalSuppliers,
        totalCampaigns,
        totalOrders,
        totalRevenue
    };
}

