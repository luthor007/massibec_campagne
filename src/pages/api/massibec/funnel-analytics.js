import dbConnect from '../../../lib/mongodb';
import FunnelEvent from '../../../models/FunnelEvent';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import mongoose from 'mongoose';

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

        const { startDate, endDate } = req.query;

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

        // Define student funnel steps in order
        const studentFunnelSteps = [
            'home_visit',
            'registration_page_visit',
            'registration_started',
            'registration_step_completed',
            'registration_completed',
            'email_verification_clicked',
            'email_verified',
            'campaign_joined',
            'onboarding_step_completed',
            'onboarding_completed',
            'store_created',
            'store_personalized',
            'first_add_to_cart',
            'first_order_placed'
        ];

        // Define school funnel steps in order
        const schoolFunnelSteps = [
            'home_visit',
            'school_registration_page_visit',
            'school_registration_started',
            'school_registration_step_completed',
            'school_registration_completed',
            'email_verification_clicked',
            'school_email_verified',
            'school_profile_completed',
            'school_campaign_created'
        ];

        // Use student funnel as default for backward compatibility
        const funnelSteps = studentFunnelSteps;

        // Get all funnel events within date range
        const allEvents = await FunnelEvent.find(dateFilter)
            .sort({ createdAt: 1 })
            .lean();

        // Calculate metrics for each step
        const stepMetrics = {};
        const stepMetricsByUserType = {
            student: {},
            school: {},
            anonymous: {}
        };

        // Initialize step metrics
        funnelSteps.forEach(step => {
            stepMetrics[step] = {
                total: 0,
                uniqueUsers: new Set(),
                uniqueSessions: new Set()
            };
            stepMetricsByUserType.student[step] = { total: 0, uniqueUsers: new Set(), uniqueSessions: new Set() };
            stepMetricsByUserType.school[step] = { total: 0, uniqueUsers: new Set(), uniqueSessions: new Set() };
            stepMetricsByUserType.anonymous[step] = { total: 0, uniqueUsers: new Set(), uniqueSessions: new Set() };
        });

        // Process events
        allEvents.forEach(event => {
            const step = event.eventType;
            if (stepMetrics[step]) {
                stepMetrics[step].total++;
                if (event.sessionId) stepMetrics[step].uniqueSessions.add(event.sessionId);
                if (event.userId) stepMetrics[step].uniqueUsers.add(event.userId.toString());
            }

            const userType = event.userType || 'anonymous';
            if (stepMetricsByUserType[userType] && stepMetricsByUserType[userType][step]) {
                stepMetricsByUserType[userType][step].total++;
                if (event.sessionId) stepMetricsByUserType[userType][step].uniqueSessions.add(event.sessionId);
                if (event.userId) stepMetricsByUserType[userType][step].uniqueUsers.add(event.userId.toString());
            }
        });

        // Calculate average time between steps
        const calculateAverageTimeBetweenSteps = async (fromStep, toStep) => {
            try {
                const fromEvents = await FunnelEvent.find({
                    ...dateFilter,
                    eventType: fromStep
                }).sort({ createdAt: 1 }).lean();

                const timeDiffs = [];
                for (const fromEvent of fromEvents) {
                    const toEvent = await FunnelEvent.findOne({
                        ...dateFilter,
                        userId: fromEvent.userId,
                        eventType: toStep,
                        createdAt: { $gt: fromEvent.createdAt }
                    }).sort({ createdAt: 1 }).lean();

                    if (toEvent && toEvent.metadata?.timeSincePreviousEvent) {
                        timeDiffs.push(toEvent.metadata.timeSincePreviousEvent);
                    }
                }

                if (timeDiffs.length === 0) return null;
                const avgTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
                return avgTime;
            } catch (error) {
                console.error('Error calculating average time:', error);
                return null;
            }
        };

        // Convert Sets to counts and calculate conversion rates
        const funnelData = await Promise.all(funnelSteps.map(async (step, index) => {
            const metrics = stepMetrics[step];
            const previousStep = index > 0 ? funnelSteps[index - 1] : null;
            const previousMetrics = previousStep ? stepMetrics[previousStep] : null;

            // Calculate conversion rate from previous step
            let conversionRate = null;
            if (previousMetrics && previousMetrics.uniqueSessions.size > 0) {
                conversionRate = (metrics.uniqueSessions.size / previousMetrics.uniqueSessions.size) * 100;
            }

            // Calculate average time from previous step
            let avgTimeFromPrevious = null;
            if (previousStep) {
                avgTimeFromPrevious = await calculateAverageTimeBetweenSteps(previousStep, step);
            }

            return {
                step,
                stepName: getStepDisplayName(step),
                total: metrics.total,
                uniqueSessions: metrics.uniqueSessions.size,
                uniqueUsers: metrics.uniqueUsers.size,
                conversionRate: conversionRate !== null ? parseFloat(conversionRate.toFixed(2)) : null,
                avgTimeFromPrevious: avgTimeFromPrevious !== null ? parseFloat((avgTimeFromPrevious / 1000 / 60).toFixed(1)) : null, // Convert to minutes
                previousStep
            };
        }));

        // Initialize school funnel metrics
        const schoolStepMetrics = {};
        schoolFunnelSteps.forEach(step => {
            schoolStepMetrics[step] = {
                total: 0,
                uniqueUsers: new Set(),
                uniqueSessions: new Set()
            };
        });

        // Process school events
        allEvents.forEach(event => {
            const step = event.eventType;
            if (schoolStepMetrics[step]) {
                schoolStepMetrics[step].total++;
                if (event.sessionId) schoolStepMetrics[step].uniqueSessions.add(event.sessionId);
                if (event.userId) schoolStepMetrics[step].uniqueUsers.add(event.userId.toString());
            }
        });

        // Calculate school funnel data
        const schoolFunnelData = await Promise.all(schoolFunnelSteps.map(async (step, index) => {
            const metrics = schoolStepMetrics[step];
            const previousStep = index > 0 ? schoolFunnelSteps[index - 1] : null;
            const previousMetrics = previousStep ? schoolStepMetrics[previousStep] : null;

            let conversionRate = null;
            if (previousMetrics && previousMetrics.uniqueSessions.size > 0) {
                conversionRate = (metrics.uniqueSessions.size / previousMetrics.uniqueSessions.size) * 100;
            }

            let avgTimeFromPrevious = null;
            if (previousStep) {
                avgTimeFromPrevious = await calculateAverageTimeBetweenSteps(previousStep, step);
            }

            return {
                step,
                stepName: getStepDisplayName(step),
                total: metrics.total,
                uniqueSessions: metrics.uniqueSessions.size,
                uniqueUsers: metrics.uniqueUsers.size,
                conversionRate: conversionRate !== null ? parseFloat(conversionRate.toFixed(2)) : null,
                avgTimeFromPrevious: avgTimeFromPrevious !== null ? parseFloat((avgTimeFromPrevious / 1000 / 60).toFixed(1)) : null
            };
        }));

        // Calculate breakdown by user type (student funnel)
        const funnelDataByUserType = {
            student: await Promise.all(studentFunnelSteps.map(async (step, index) => {
                const metrics = stepMetricsByUserType.student[step];
                const previousStep = index > 0 ? studentFunnelSteps[index - 1] : null;
                const previousMetrics = previousStep ? stepMetricsByUserType.student[previousStep] : null;

                let conversionRate = null;
                if (previousMetrics && previousMetrics.uniqueSessions.size > 0) {
                    conversionRate = (metrics.uniqueSessions.size / previousMetrics.uniqueSessions.size) * 100;
                }

                let avgTimeFromPrevious = null;
                if (previousStep) {
                    avgTimeFromPrevious = await calculateAverageTimeBetweenSteps(previousStep, step);
                }

                return {
                    step,
                    stepName: getStepDisplayName(step),
                    total: metrics.total,
                    uniqueSessions: metrics.uniqueSessions.size,
                    uniqueUsers: metrics.uniqueUsers.size,
                    conversionRate: conversionRate !== null ? parseFloat(conversionRate.toFixed(2)) : null,
                    avgTimeFromPrevious: avgTimeFromPrevious !== null ? parseFloat((avgTimeFromPrevious / 1000 / 60).toFixed(1)) : null
                };
            }))
        };

        // Calculate key conversion rates (student funnel)
        const keyConversions = {
            homeToRegistration: calculateConversionRate(
                stepMetrics['home_visit']?.uniqueSessions.size || 0,
                stepMetrics['registration_page_visit']?.uniqueSessions.size || 0
            ),
            registrationPageToStarted: calculateConversionRate(
                stepMetrics['registration_page_visit']?.uniqueSessions.size || 0,
                stepMetrics['registration_started']?.uniqueSessions.size || 0
            ),
            startedToCompleted: calculateConversionRate(
                stepMetrics['registration_started']?.uniqueSessions.size || 0,
                stepMetrics['registration_completed']?.uniqueSessions.size || 0
            ),
            completedToVerified: calculateConversionRate(
                stepMetrics['registration_completed']?.uniqueSessions.size || 0,
                stepMetrics['email_verified']?.uniqueSessions.size || 0
            ),
            verifiedToCampaignJoin: calculateConversionRate(
                stepMetrics['email_verified']?.uniqueSessions.size || 0,
                stepMetrics['campaign_joined']?.uniqueSessions.size || 0
            ),
            campaignJoinToOnboardingComplete: calculateConversionRate(
                stepMetrics['campaign_joined']?.uniqueSessions.size || 0,
                stepMetrics['onboarding_completed']?.uniqueSessions.size || 0
            ),
            onboardingToStore: calculateConversionRate(
                stepMetrics['onboarding_completed']?.uniqueSessions.size || 0,
                stepMetrics['store_created']?.uniqueSessions.size || 0
            ),
            storeToPersonalized: calculateConversionRate(
                stepMetrics['store_created']?.uniqueSessions.size || 0,
                stepMetrics['store_personalized']?.uniqueSessions.size || 0
            ),
            personalizedToAddToCart: calculateConversionRate(
                stepMetrics['store_personalized']?.uniqueSessions.size || 0,
                stepMetrics['first_add_to_cart']?.uniqueSessions.size || 0
            ),
            addToCartToFirstOrder: calculateConversionRate(
                stepMetrics['first_add_to_cart']?.uniqueSessions.size || 0,
                stepMetrics['first_order_placed']?.uniqueSessions.size || 0
            ),
            storeToFirstOrder: calculateConversionRate(
                stepMetrics['store_created']?.uniqueSessions.size || 0,
                stepMetrics['first_order_placed']?.uniqueSessions.size || 0
            ),
            overallConversion: calculateConversionRate(
                stepMetrics['home_visit']?.uniqueSessions.size || 0,
                stepMetrics['first_order_placed']?.uniqueSessions.size || 0
            )
        };

        // Calculate school funnel key conversions
        const schoolKeyConversions = {
            homeToRegistration: calculateConversionRate(
                schoolStepMetrics['home_visit']?.uniqueSessions.size || 0,
                schoolStepMetrics['school_registration_page_visit']?.uniqueSessions.size || 0
            ),
            registrationPageToStarted: calculateConversionRate(
                schoolStepMetrics['school_registration_page_visit']?.uniqueSessions.size || 0,
                schoolStepMetrics['school_registration_started']?.uniqueSessions.size || 0
            ),
            startedToCompleted: calculateConversionRate(
                schoolStepMetrics['school_registration_started']?.uniqueSessions.size || 0,
                schoolStepMetrics['school_registration_completed']?.uniqueSessions.size || 0
            ),
            completedToVerified: calculateConversionRate(
                schoolStepMetrics['school_registration_completed']?.uniqueSessions.size || 0,
                schoolStepMetrics['school_email_verified']?.uniqueSessions.size || 0
            ),
            verifiedToProfileComplete: calculateConversionRate(
                schoolStepMetrics['school_email_verified']?.uniqueSessions.size || 0,
                schoolStepMetrics['school_profile_completed']?.uniqueSessions.size || 0
            ),
            profileToCampaignCreated: calculateConversionRate(
                schoolStepMetrics['school_profile_completed']?.uniqueSessions.size || 0,
                schoolStepMetrics['school_campaign_created']?.uniqueSessions.size || 0
            ),
            overallConversion: calculateConversionRate(
                schoolStepMetrics['home_visit']?.uniqueSessions.size || 0,
                schoolStepMetrics['school_campaign_created']?.uniqueSessions.size || 0
            )
        };

        // Calculate drop-off points (steps with highest drop-off rates)
        const dropOffs = [];
        for (let i = 1; i < funnelData.length; i++) {
            const current = funnelData[i];
            const previous = funnelData[i - 1];
            if (current.conversionRate !== null) {
                const dropOffRate = 100 - current.conversionRate;
                dropOffs.push({
                    from: previous.stepName,
                    to: current.stepName,
                    dropOffRate: parseFloat(dropOffRate.toFixed(2)),
                    lostUsers: previous.uniqueSessions - current.uniqueSessions
                });
            }
        }
        dropOffs.sort((a, b) => b.dropOffRate - a.dropOffRate);

        res.status(200).json({
            // Student funnel
            funnelData,
            funnelDataByUserType,
            keyConversions,
            dropOffs: dropOffs.slice(0, 10), // Top 10 drop-off points
            summary: {
                totalHomeVisits: stepMetrics['home_visit']?.uniqueSessions.size || 0,
                totalRegistrations: stepMetrics['registration_completed']?.uniqueSessions.size || 0,
                totalVerified: stepMetrics['email_verified']?.uniqueSessions.size || 0,
                totalCampaignJoins: stepMetrics['campaign_joined']?.uniqueSessions.size || 0,
                totalOnboarded: stepMetrics['onboarding_completed']?.uniqueSessions.size || 0,
                totalStoresCreated: stepMetrics['store_created']?.uniqueSessions.size || 0,
                totalStoresPersonalized: stepMetrics['store_personalized']?.uniqueSessions.size || 0,
                totalFirstAddToCart: stepMetrics['first_add_to_cart']?.uniqueSessions.size || 0,
                totalFirstOrders: stepMetrics['first_order_placed']?.uniqueSessions.size || 0,
                overallConversionRate: keyConversions.overallConversion
            },
            // School funnel
            schoolFunnelData,
            schoolKeyConversions,
            schoolSummary: {
                totalHomeVisits: schoolStepMetrics['home_visit']?.uniqueSessions.size || 0,
                totalRegistrations: schoolStepMetrics['school_registration_completed']?.uniqueSessions.size || 0,
                totalVerified: schoolStepMetrics['school_email_verified']?.uniqueSessions.size || 0,
                totalProfilesCompleted: schoolStepMetrics['school_profile_completed']?.uniqueSessions.size || 0,
                totalCampaignsCreated: schoolStepMetrics['school_campaign_created']?.uniqueSessions.size || 0,
                overallConversionRate: schoolKeyConversions.overallConversion
            }
        });

    } catch (error) {
        console.error('Error fetching funnel analytics:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
}

function getStepDisplayName(step) {
    const names = {
        'home_visit': 'Visite Page d\'Accueil',
        'registration_page_visit': 'Visite Page Inscription',
        'registration_started': 'Inscription Commencée',
        'registration_step_completed': 'Étape Inscription Complétée',
        'registration_completed': 'Inscription Complétée',
        'email_verification_clicked': 'Email Vérification Cliqué',
        'email_verified': 'Email Vérifié',
        'campaign_joined': 'Campagne Rejointe',
        'onboarding_step_completed': 'Étape Onboarding Complétée',
        'onboarding_completed': 'Onboarding Complété',
        'store_created': 'Boutique Créée',
        'store_personalized': 'Boutique Personnalisée',
        'first_add_to_cart': 'Premier Ajout au Panier',
        'first_order_placed': 'Première Commande',
        'login': 'Connexion',
        // School-specific
        'school_registration_page_visit': 'Visite Page Inscription École',
        'school_registration_started': 'Inscription École Commencée',
        'school_registration_step_completed': 'Étape Inscription École Complétée',
        'school_registration_completed': 'Inscription École Complétée',
        'school_email_verified': 'Email École Vérifié',
        'school_profile_completed': 'Profil École Complété',
        'school_campaign_created': 'Campagne École Créée'
    };
    return names[step] || step;
}

function calculateConversionRate(from, to) {
    if (!from || from === 0) return null;
    return parseFloat(((to / from) * 100).toFixed(2));
}

