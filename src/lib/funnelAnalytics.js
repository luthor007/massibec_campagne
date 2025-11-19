// Funnel analytics utility functions for tracking user journey

import { getSessionId } from './analytics';

/**
 * Track a funnel event
 * @param {string} eventType - The type of funnel event
 * @param {object} metadata - Additional metadata about the event
 * @param {string} userType - Optional user type (student, school, anonymous)
 */
export async function trackFunnelEvent(eventType, metadata = {}, userType = null) {
    if (typeof window === 'undefined') return;

    const sessionId = getSessionId();
    if (!sessionId) {
        console.warn('No session ID available for funnel tracking');
        return;
    }

    try {
        await fetch('/api/analytics/funnel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                eventType,
                userType,
                sessionId,
                metadata
            })
        });
    } catch (error) {
        console.error('Error tracking funnel event:', error);
    }
}

/**
 * Track a page visit
 * @param {string} pageType - Type of page (home, registration_student, registration_school)
 */
export async function trackPageVisit(pageType) {
    const metadata = {
        pageType,
        url: typeof window !== 'undefined' ? window.location.href : '',
        referrer: typeof document !== 'undefined' ? document.referrer : ''
    };

    let eventType = 'home_visit';
    if (pageType === 'registration_student' || pageType === 'registration_school') {
        eventType = 'registration_page_visit';
        metadata.userType = pageType === 'registration_student' ? 'student' : 'school';
    }

    await trackFunnelEvent(eventType, metadata);
}

/**
 * Track registration started
 * @param {string} userType - 'student' or 'school'
 */
export async function trackRegistrationStarted(userType) {
    await trackFunnelEvent('registration_started', {
        userType
    }, userType);
}

/**
 * Track registration step completion
 * @param {number} step - Step number (1-indexed)
 * @param {string} userType - 'student' or 'school'
 * @param {object} additionalMetadata - Additional metadata
 */
export async function trackRegistrationStep(step, userType, additionalMetadata = {}) {
    await trackFunnelEvent('registration_step_completed', {
        step,
        userType,
        ...additionalMetadata
    }, userType);
}

/**
 * Track registration completion
 * @param {string} userType - 'student' or 'school'
 * @param {object} additionalMetadata - Additional metadata (userId, email, etc.)
 */
export async function trackRegistrationCompleted(userType, additionalMetadata = {}) {
    await trackFunnelEvent('registration_completed', {
        userType,
        ...additionalMetadata
    }, userType);
}

/**
 * Track email verification clicked
 * @param {string} userType - 'student' or 'school'
 */
export async function trackEmailVerificationClicked(userType) {
    await trackFunnelEvent('email_verification_clicked', {
        userType
    }, userType);
}

/**
 * Track email verified
 * @param {string} userType - 'student' or 'school'
 * @param {string} userId - User ID
 */
export async function trackEmailVerified(userType, userId) {
    await trackFunnelEvent('email_verified', {
        userType,
        userId
    }, userType);
}

/**
 * Track onboarding step completion
 * @param {string} step - Step key (joinedCampaign, personalizedStore, etc.)
 * @param {string} userId - User ID
 */
export async function trackOnboardingStep(step, userId) {
    await trackFunnelEvent('onboarding_step_completed', {
        step,
        userId
    });
}

/**
 * Track onboarding completion
 * @param {string} userId - User ID
 */
export async function trackOnboardingCompleted(userId) {
    await trackFunnelEvent('onboarding_completed', {
        userId
    });
}

/**
 * Track store creation
 * @param {string} userId - User ID
 * @param {string} storeId - Store ID
 * @param {string} campaignId - Campaign ID
 */
export async function trackStoreCreated(userId, storeId, campaignId) {
    await trackFunnelEvent('store_created', {
        userId,
        storeId,
        campaignId
    });
}

/**
 * Track first order placed
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @param {string} storeId - Store ID
 * @param {number} totalAmount - Total order amount
 */
export async function trackFirstOrder(userId, orderId, storeId, totalAmount) {
    await trackFunnelEvent('first_order_placed', {
        userId,
        orderId,
        storeId,
        totalAmount
    });
}

/**
 * Track campaign join
 * @param {string} userId - User ID
 * @param {string} campaignId - Campaign ID
 * @param {string} campaignCode - Campaign code
 */
export async function trackCampaignJoined(userId, campaignId, campaignCode) {
    await trackFunnelEvent('campaign_joined', {
        userId,
        campaignId,
        campaignCode
    });
}

/**
 * Track store personalization
 * @param {string} userId - User ID
 * @param {string} storeId - Store ID
 * @param {string} campaignId - Campaign ID
 */
export async function trackStorePersonalized(userId, storeId, campaignId) {
    await trackFunnelEvent('store_personalized', {
        userId,
        storeId,
        campaignId
    });
}

/**
 * Track login/returning user
 * @param {string} userId - User ID
 * @param {string} userType - 'student' or 'school'
 * @param {boolean} isReturning - Whether this is a returning user
 */
export async function trackLogin(userId, userType, isReturning = false) {
    await trackFunnelEvent('login', {
        userId,
        userType,
        isReturning
    }, userType);
}

/**
 * Track first add to cart
 * @param {string} userId - User ID
 * @param {string} storeId - Store ID
 * @param {string} productId - Product ID
 */
export async function trackFirstAddToCart(userId, storeId, productId) {
    await trackFunnelEvent('first_add_to_cart', {
        userId,
        storeId,
        productId
    });
}

/**
 * Track school registration page visit
 */
export async function trackSchoolRegistrationPageVisit() {
    await trackFunnelEvent('school_registration_page_visit', {}, 'school');
}

/**
 * Track school registration started
 */
export async function trackSchoolRegistrationStarted() {
    await trackFunnelEvent('school_registration_started', {}, 'school');
}

/**
 * Track school registration step completion
 * @param {number} step - Step number
 */
export async function trackSchoolRegistrationStep(step) {
    await trackFunnelEvent('school_registration_step_completed', {
        step
    }, 'school');
}

/**
 * Track school registration completed
 * @param {string} email - Email address
 */
export async function trackSchoolRegistrationCompleted(email) {
    await trackFunnelEvent('school_registration_completed', {
        email
    }, 'school');
}

/**
 * Track school email verified
 * @param {string} userId - User ID
 */
export async function trackSchoolEmailVerified(userId) {
    await trackFunnelEvent('school_email_verified', {
        userId
    }, 'school');
}

/**
 * Track school profile completed
 * @param {string} userId - User ID
 */
export async function trackSchoolProfileCompleted(userId) {
    await trackFunnelEvent('school_profile_completed', {
        userId
    }, 'school');
}

/**
 * Track school campaign created
 * @param {string} userId - User ID
 * @param {string} campaignId - Campaign ID
 */
export async function trackSchoolCampaignCreated(userId, campaignId) {
    await trackFunnelEvent('school_campaign_created', {
        userId,
        campaignId
    }, 'school');
}

