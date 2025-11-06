import dbConnect from '../../../lib/mongodb';
import StoreVisit from '../../../models/StoreVisit';
import ConversionEvent from '../../../models/ConversionEvent';
import Store from '../../../models/Store';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const {
      eventType,
      storeId,
      campaignId: providedCampaignId,
      schoolId: providedSchoolId,
      userId,
      sessionId,
      deviceType,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!eventType || !storeId || !sessionId) {
      return res.status(400).json({ message: 'Missing required fields: eventType, storeId, sessionId' });
    }

    // Validate eventType
    const validEventTypes = ['visit', 'add_to_cart', 'checkout_reached', 'payment_completed'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({ message: 'Invalid eventType' });
    }

    // Convert storeId from slug to ObjectId if necessary
    let finalStoreId = storeId;
    let campaignId = providedCampaignId;
    let schoolId = providedSchoolId;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(storeId);

    if (!isObjectId) {
      // Try to find store by slug
      const store = await Store.findOne({ slug: storeId });
      if (store) {
        finalStoreId = store._id.toString();

        // If campaignId is not provided, try to get it from the store
        if (!campaignId && store.campaignId) {
          campaignId = store.campaignId.toString();
        }

        // If schoolId is not provided, try to get it from the campaign
        if (!schoolId && store.campaignId) {
          const Campaign = (await import('../../../models/Campaign')).default;
          const campaign = await Campaign.findById(store.campaignId).populate('school');
          if (campaign?.school) {
            schoolId = campaign.school._id.toString();
          }
        }
      } else {
        // If still not found and it's a valid ObjectId format, try it
        if (mongoose.Types.ObjectId.isValid(storeId)) {
          finalStoreId = storeId;
        } else {
          return res.status(400).json({ message: 'Invalid storeId: store not found' });
        }
      }
    } else {
      // If storeId is already an ObjectId, ensure we have campaignId and schoolId
      if (!campaignId || !schoolId) {
        const store = await Store.findById(storeId);
        if (store) {
          if (!campaignId && store.campaignId) {
            campaignId = store.campaignId.toString();
          }

          if (!schoolId && store.campaignId) {
            const Campaign = (await import('../../../models/Campaign')).default;
            const campaign = await Campaign.findById(store.campaignId).populate('school');
            if (campaign?.school) {
              schoolId = campaign.school._id.toString();
            }
          }
        }
      }
    }

    // Get user from session if not provided
    let finalUserId = userId;
    if (!finalUserId) {
      const session = await getServerSession(req, res, authOptions);
      if (session?.user?.id) {
        finalUserId = session.user.id;
      }
    }

    // Extract headers for device/location info
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      '';

    // Detect device type from user agent if not provided
    let finalDeviceType = deviceType;
    if (!finalDeviceType || finalDeviceType === 'unknown') {
      if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
        finalDeviceType = 'tablet';
      } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
        finalDeviceType = 'mobile';
      } else {
        finalDeviceType = 'desktop';
      }
    }

    // For location, try to extract from headers or use IP geolocation
    // Note: In production, you might want to use a service like MaxMind GeoIP2 or ipapi.co
    let location = {
      country: null,
      region: null,
      city: null
    };

    // Try to extract location from Accept-Language header (very basic)
    const acceptLanguage = req.headers['accept-language'] || '';
    // This is a simplified approach - in production, use IP geolocation
    // For now, we'll try to detect country from language code
    if (acceptLanguage.includes('fr')) {
      location.country = 'Canada'; // Default assumption for French
    } else if (acceptLanguage.includes('en')) {
      location.country = 'Unknown'; // Could be US, UK, etc.
    }

    // TODO: Integrate IP geolocation service in production
    // Example: const geoData = await fetch(`https://ipapi.co/${ip}/json/`);
    // if (geoData.ok) { const data = await geoData.json(); location = { country: data.country_name, region: data.region, city: data.city }; }

    // Create conversion event
    const conversionEvent = new ConversionEvent({
      storeId: finalStoreId,
      userId: finalUserId || null,
      campaignId: campaignId || null,
      schoolId: schoolId || null,
      sessionId,
      eventType,
      metadata
    });

    await conversionEvent.save();

    // Also create/store visit if it's a visit event
    if (eventType === 'visit') {
      // Check if visit already exists for this session (avoid duplicates)
      const existingVisit = await StoreVisit.findOne({
        storeId: finalStoreId,
        sessionId,
        createdAt: {
          $gte: new Date(Date.now() - 30 * 60 * 1000) // Within last 30 minutes
        }
      });

      if (!existingVisit) {
        const storeVisit = new StoreVisit({
          storeId: finalStoreId,
          userId: finalUserId || null,
          campaignId: campaignId || null,
          schoolId: schoolId || null,
          sessionId,
          deviceType: finalDeviceType,
          location,
          userAgent,
          ip
        });

        await storeVisit.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Event tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

