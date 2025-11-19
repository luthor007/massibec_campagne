import dbConnect from '../../../lib/mongodb';
import FunnelEvent from '../../../models/FunnelEvent';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();

        const {
            eventType,
            userType,
            sessionId,
            metadata = {}
        } = req.body;

        // Validate required fields
        if (!eventType || !sessionId) {
            return res.status(400).json({ message: 'Missing required fields: eventType, sessionId' });
        }

        // Validate eventType
        const validEventTypes = [
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
            'first_order_placed',
            'login',
            // School-specific events
            'school_registration_page_visit',
            'school_registration_started',
            'school_registration_step_completed',
            'school_registration_completed',
            'school_email_verified',
            'school_profile_completed',
            'school_campaign_created'
        ];
        if (!validEventTypes.includes(eventType)) {
            return res.status(400).json({ message: 'Invalid eventType' });
        }

        // Get user from session if available
        let userId = null;
        let finalUserType = userType || 'anonymous';

        try {
            const session = await getServerSession(req, res, authOptions);
            if (session?.user?.id) {
                userId = session.user.id;
                // Determine user type from session if not provided
                if (!userType && session.user.role) {
                    if (session.user.role === 'student') {
                        finalUserType = 'student';
                    } else if (session.user.role === 'school_manager') {
                        finalUserType = 'school';
                    }
                }
            }
        } catch (error) {
            // Session check failed, continue with anonymous tracking
            console.log('Session check failed, tracking as anonymous:', error.message);
        }

        // Extract headers for additional context
        const userAgent = req.headers['user-agent'] || '';
        const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
            req.headers['x-real-ip'] ||
            req.connection?.remoteAddress ||
            '';

        // For first_add_to_cart, check if user already has this event
        if (eventType === 'first_add_to_cart' && userId) {
            const existingFirstAddToCart = await FunnelEvent.findOne({
                userId,
                eventType: 'first_add_to_cart'
            }).lean();

            if (existingFirstAddToCart) {
                // User already has a first_add_to_cart event, don't track again
                return res.status(200).json({
                    success: true,
                    message: 'First add to cart already tracked for this user',
                    skipped: true
                });
            }
        }

        // Calculate time since previous event for this user/session
        let timeSincePreviousEvent = null;
        if (userId || sessionId) {
            try {
                const previousEvent = await FunnelEvent.findOne({
                    $or: [
                        userId ? { userId } : {},
                        { sessionId }
                    ]
                })
                    .sort({ createdAt: -1 })
                    .lean();

                if (previousEvent) {
                    timeSincePreviousEvent = Date.now() - new Date(previousEvent.createdAt).getTime();
                }
            } catch (error) {
                console.error('Error calculating time since previous event:', error);
            }
        }

        // Add additional metadata
        const enrichedMetadata = {
            ...metadata,
            userAgent,
            ip,
            timeSincePreviousEvent: timeSincePreviousEvent !== null ? timeSincePreviousEvent : undefined
        };

        // Create funnel event
        const funnelEvent = new FunnelEvent({
            eventType,
            userType: finalUserType,
            userId: userId || null,
            sessionId,
            metadata: enrichedMetadata
        });

        await funnelEvent.save();

        res.status(200).json({
            success: true,
            message: 'Funnel event tracked successfully',
            eventId: funnelEvent._id
        });

    } catch (error) {
        console.error('Error tracking funnel event:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
}

