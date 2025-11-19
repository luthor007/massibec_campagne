// Analytics utility functions for tracking user events

/**
 * Generate or retrieve a session ID
 * Uses localStorage to persist session across page reloads
 */
export function getSessionId() {
  if (typeof window === 'undefined') return null;

  const STORAGE_KEY = 'analytics_session_id';
  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const { sessionId, timestamp } = JSON.parse(stored);
    const now = Date.now();

    // If session is still valid (within 30 minutes), return existing session
    if (now - timestamp < SESSION_DURATION) {
      return sessionId;
    }
  }

  // Generate new session ID
  const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    sessionId: newSessionId,
    timestamp: Date.now()
  }));

  return newSessionId;
}

/**
 * Detect device type from user agent
 */
export function detectDeviceType() {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return 'tablet';
  }

  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Extract source from URL query parameters
 * Priority: Referrer detection > URL parameter > Direct visit detection
 */
function getSourceFromUrl() {
  if (typeof window === 'undefined') return 'unknown';

  // FIRST: Check referrer to detect social media redirects
  // This handles cases where a link with ?source=link is shared on Facebook/Instagram/etc
  if (document.referrer) {
    const referrer = document.referrer.toLowerCase();
    if (referrer.includes('facebook.com') || referrer.includes('fb.com') || referrer.includes('m.facebook.com')) {
      return 'facebook';
    }
    if (referrer.includes('instagram.com')) {
      return 'instagram';
    }
    if (referrer.includes('twitter.com') || referrer.includes('x.com') || referrer.includes('t.co')) {
      return 'twitter';
    }
    // Other social media platforms can be added here
  }

  // SECOND: Check URL parameter (for QR codes, email links, direct shares)
  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('source');

  // Validate source against known values
  const validSources = ['qr', 'facebook', 'instagram', 'twitter', 'email', 'direct', 'link', 'other'];
  if (source && validSources.includes(source)) {
    return source;
  }

  // THIRD: Check if it's a direct visit (no referrer and no source param)
  if (!document.referrer && !source) {
    return 'direct';
  }

  return 'unknown';
}

/**
 * Track a visit event
 */
export async function trackVisit({ storeId, campaignId, schoolId, userId = null }) {
  if (typeof window === 'undefined') return;

  const sessionId = getSessionId();
  const deviceType = detectDeviceType();
  const source = getSourceFromUrl();

  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType: 'visit',
        storeId,
        campaignId,
        schoolId,
        userId,
        sessionId,
        deviceType,
        source,
        metadata: {}
      })
    });
  } catch (error) {
    console.error('Error tracking visit:', error);
  }
}

/**
 * Track add to cart event
 */
export async function trackAddToCart({ storeId, campaignId, schoolId, userId = null, productId, quantity, price }) {
  if (typeof window === 'undefined') return;

  const sessionId = getSessionId();
  const deviceType = detectDeviceType();

  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType: 'add_to_cart',
        storeId,
        campaignId,
        schoolId,
        userId,
        sessionId,
        deviceType,
        metadata: {
          productId,
          quantity,
          price
        }
      })
    });
  } catch (error) {
    console.error('Error tracking add to cart:', error);
  }
}

/**
 * Track checkout reached event
 */
export async function trackCheckoutReached({ storeId, campaignId, schoolId, userId = null }) {
  if (typeof window === 'undefined') return;

  const sessionId = getSessionId();
  const deviceType = detectDeviceType();

  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType: 'checkout_reached',
        storeId,
        campaignId,
        schoolId,
        userId,
        sessionId,
        deviceType,
        metadata: {}
      })
    });
  } catch (error) {
    console.error('Error tracking checkout reached:', error);
  }
}

/**
 * Track payment completed event
 */
export async function trackPaymentCompleted({ storeId, campaignId, schoolId, userId = null, orderId, totalAmount }) {
  if (typeof window === 'undefined') return;

  const sessionId = getSessionId();
  const deviceType = detectDeviceType();

  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType: 'payment_completed',
        storeId,
        campaignId,
        schoolId,
        userId,
        sessionId,
        deviceType,
        metadata: {
          orderId,
          totalAmount
        }
      })
    });
  } catch (error) {
    console.error('Error tracking payment completed:', error);
  }
}

