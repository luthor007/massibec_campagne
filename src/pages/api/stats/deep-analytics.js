import dbConnect from '../../../lib/mongodb';
import Order from '../../../models/Order';
import StoreVisit from '../../../models/StoreVisit';
import ConversionEvent from '../../../models/ConversionEvent';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getQuebecDateString, getTodayDateString, addDaysToDateString, formatDateString } from '../../../utils/dateHelpers';

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

    const userId = session.user.id;
    const { storeId, campaignId, schoolId } = req.query;

    // Get store ID from user's store if not provided
    let finalStoreId = storeId;
    if (!finalStoreId) {
      const User = (await import('../../../models/User')).default;
      const user = await User.findById(userId);
      if (user && user.store) {
        finalStoreId = user.store.toString();
      }
    }

    if (!finalStoreId && !campaignId && !schoolId) {
      return res.status(400).json({ message: 'storeId, campaignId, or schoolId required' });
    }

    // Build query for orders
    const orderQuery = {};
    if (finalStoreId) orderQuery.store = finalStoreId;
    if (campaignId) orderQuery.campaignId = campaignId;
    if (schoolId) orderQuery.school = schoolId;

    // Build query for visits and events
    // Match visits/events for the store, regardless of campaignId
    // This ensures we capture all visits even if they were tracked before campaignId was available
    const visitQuery = {};
    const eventQuery = {};

    if (finalStoreId) {
      // Always match by storeId first (most important filter)
      visitQuery.storeId = finalStoreId;
      eventQuery.storeId = finalStoreId;

      // If campaignId is provided, prefer visits/events with that campaignId
      // but also include visits/events without campaignId (tracked before campaignId was available)
      if (campaignId) {
        // Use $or to match visits with this campaignId OR without campaignId (null or missing)
        visitQuery.$or = [
          { campaignId: campaignId },
          { campaignId: null },
          { campaignId: { $exists: false } }
        ];
        eventQuery.$or = [
          { campaignId: campaignId },
          { campaignId: null },
          { campaignId: { $exists: false } }
        ];
      }
      // If no campaignId, match all visits/events for this store
    } else if (campaignId) {
      // StoreId not provided but campaignId is, match by campaignId
      visitQuery.campaignId = campaignId;
      eventQuery.campaignId = campaignId;
    } else if (schoolId) {
      // Fallback: match by schoolId if no storeId or campaignId
      visitQuery.schoolId = schoolId;
      eventQuery.schoolId = schoolId;
    }

    // Fetch all data
    // Note: Using lean() returns plain JavaScript objects, but createdAt dates are still Date objects
    // We need to ensure they're properly converted to Quebec timezone
    const [orders, visits, events] = await Promise.all([
      Order.find(orderQuery).lean(),
      StoreVisit.find(visitQuery).lean(),
      ConversionEvent.find(eventQuery).lean()
    ]);

    // Calculate metrics
    // For gross sales, calculate original subtotal before discount (products sum) + donations
    // This gives a true picture of gross revenue including donations
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

    const totalOrders = orders.length;

    // Calculate returning customer rate (clients with 2+ orders in campaign)
    const customerOrders = {};
    orders.forEach(order => {
      const email = order.customerEmail?.toLowerCase();
      if (email) {
        if (!customerOrders[email]) {
          customerOrders[email] = [];
        }
        customerOrders[email].push(order);
      }
    });

    const totalCustomers = Object.keys(customerOrders).length;
    const returningCustomers = Object.values(customerOrders).filter(orders => orders.length >= 2).length;
    const returningCustomerRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    // Calculate average order value (using gross sales before discount)
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Generate time series data for sales (using original subtotals, not totalAmount)
    const salesOverTime = generateTimeSeriesData(orders, null, 'sales');

    // Generate time series data for average order value (using original subtotals)
    const avgOrderValueOverTime = generateTimeSeriesData(orders, null, 'avgOrderValue');

    // Generate time series data for visits
    const visitsOverTime = generateTimeSeriesData(visits, null, 'visits');

    // Calculate conversion funnel
    const conversionFunnel = calculateConversionFunnel(events, visits);

    // Aggregate sales by product
    const salesByProduct = aggregateSalesByProduct(orders);

    // Get device type breakdown
    const deviceTypeBreakdown = getDeviceTypeBreakdown(visits);

    // Get location breakdown (simplified - can be enhanced with IP geolocation)
    const locationBreakdown = getLocationBreakdown(visits);

    // Calculate conversion rate over time
    const conversionRateOverTime = calculateConversionRateOverTime(events, visits);

    // Calculate overall conversion rate (total orders / total visits)
    const totalVisits = visits.length;
    const overallConversionRate = totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0;

    res.status(200).json({
      totalSales,
      returningCustomerRate,
      totalOrders,
      averageOrderValue,
      salesOverTime,
      avgOrderValueOverTime,
      visitsOverTime,
      conversionFunnel,
      salesByProduct,
      deviceTypeBreakdown,
      locationBreakdown,
      conversionRateOverTime,
      overallConversionRate
    });

  } catch (error) {
    console.error('Error fetching deep analytics:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

// Generate time series data for charts
function generateTimeSeriesData(data, amountField, type) {
  // Get today's date in Quebec timezone
  const todayKey = getTodayDateString();

  const timeMap = {};

  // Find the earliest date in the data (converted to Quebec timezone)
  let earliestDate = null;
  if (data && data.length > 0) {
    data.forEach(item => {
      const dateKey = getQuebecDateString(item.createdAt);
      if (dateKey && (!earliestDate || dateKey < earliestDate)) {
        earliestDate = dateKey;
      }
    });
  }

  // Determine start date: 3 days before earliest data OR today if no data
  const startDateString = earliestDate ? addDaysToDateString(earliestDate, -3) : addDaysToDateString(todayKey, -3);

  // Initialize map with zero values for all dates from startDate to today (inclusive)
  // Work with date strings directly to avoid timezone issues
  let currentDateString = startDateString;
  while (currentDateString <= todayKey) {
    timeMap[currentDateString] = {
      date: currentDateString,
      value: 0,
      count: 0
    };
    currentDateString = addDaysToDateString(currentDateString, 1);
  }

  // Process actual data
  if (data && data.length > 0) {
    data.forEach(item => {
      // Convert UTC date from MongoDB to Quebec timezone date string
      const dateKey = getQuebecDateString(item.createdAt);

      if (!dateKey) return; // Skip if date conversion failed

      if (!timeMap[dateKey]) {
        // If date not in map, initialize it (shouldn't happen but handle it)
        timeMap[dateKey] = {
          date: dateKey,
          value: 0,
          count: 0,
          previousValue: 0,
          previousCount: 0
        };
      }

      if (type === 'sales' && amountField) {
        timeMap[dateKey].value += item[amountField] || 0;
      } else if (type === 'sales' && !amountField) {
        // Calculate original subtotal from products (before discount) + donations
        const originalSubtotal = item.products?.reduce((productSum, product) => {
          const price = product.productPrice || product.price || 0;
          const quantity = product.quantity || 0;
          return productSum + (price * quantity);
        }, 0) || 0;

        // Add donations
        const studentDonation = item.studentDonation || item.tip || 0;
        const schoolDonation = item.schoolDonation || 0;
        const totalDonations = studentDonation + schoolDonation;

        timeMap[dateKey].value += originalSubtotal + totalDonations;
      } else if (type === 'avgOrderValue' && amountField) {
        timeMap[dateKey].value += item[amountField] || 0;
        timeMap[dateKey].count += 1;
      } else if (type === 'avgOrderValue' && !amountField) {
        // Calculate original subtotal from products (before discount) + donations
        const originalSubtotal = item.products?.reduce((productSum, product) => {
          const price = product.productPrice || product.price || 0;
          const quantity = product.quantity || 0;
          return productSum + (price * quantity);
        }, 0) || 0;

        // Add donations
        const studentDonation = item.studentDonation || item.tip || 0;
        const schoolDonation = item.schoolDonation || 0;
        const totalDonations = studentDonation + schoolDonation;

        timeMap[dateKey].value += originalSubtotal + totalDonations;
        timeMap[dateKey].count += 1;
      } else if (type === 'visits') {
        timeMap[dateKey].value += 1;
      }
    });
  }

  // Convert to array and calculate averages for avgOrderValue
  const result = Object.values(timeMap).map(item => {
    if (type === 'avgOrderValue' && item.count > 0) {
      return {
        date: item.date,
        value: item.value / item.count
      };
    }
    return {
      date: item.date,
      value: item.value
    };
  });

  // Sort by date
  return result.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Calculate conversion funnel
function calculateConversionFunnel(events, visits) {
  const visitCount = visits.length;

  // Count unique sessions that have each event type (not total events)
  const addToCartSessions = new Set(events.filter(e => e.eventType === 'add_to_cart').map(e => e.sessionId));
  const checkoutReachedSessions = new Set(events.filter(e => e.eventType === 'checkout_reached').map(e => e.sessionId));
  const paymentCompletedSessions = new Set(events.filter(e => e.eventType === 'payment_completed').map(e => e.sessionId));

  const addToCartCount = addToCartSessions.size;
  const checkoutReachedCount = checkoutReachedSessions.size;
  const paymentCompletedCount = paymentCompletedSessions.size;

  return {
    visits: visitCount,
    addToCart: addToCartCount,
    checkoutReached: checkoutReachedCount,
    paymentCompleted: paymentCompletedCount,
    visitToCartRate: visitCount > 0 ? (addToCartCount / visitCount) * 100 : 0,
    cartToCheckoutRate: addToCartCount > 0 ? (checkoutReachedCount / addToCartCount) * 100 : 0,
    checkoutToPaymentRate: checkoutReachedCount > 0 ? (paymentCompletedCount / checkoutReachedCount) * 100 : 0,
    overallConversionRate: visitCount > 0 ? (paymentCompletedCount / visitCount) * 100 : 0
  };
}

// Aggregate sales by product
function aggregateSalesByProduct(orders) {
  const productMap = {};

  orders.forEach(order => {
    if (order.products && Array.isArray(order.products)) {
      order.products.forEach(product => {
        const productName = product.productName || product.name || 'Unknown';
        const quantity = product.quantity || 0;
        // Use productPrice (before discount) for gross sales calculation
        const price = product.productPrice || product.price || 0;
        const sales = quantity * price;

        if (!productMap[productName]) {
          productMap[productName] = {
            name: productName,
            quantity: 0,
            sales: 0,
            orders: 0
          };
        }

        productMap[productName].quantity += quantity;
        productMap[productName].sales += sales;
        productMap[productName].orders += 1;
      });
    }
  });

  return Object.values(productMap).sort((a, b) => b.sales - a.sales);
}

// Get device type breakdown
function getDeviceTypeBreakdown(visits) {
  const breakdown = {
    mobile: 0,
    desktop: 0,
    tablet: 0,
    unknown: 0
  };

  visits.forEach(visit => {
    const deviceType = visit.deviceType || 'unknown';
    if (breakdown[deviceType] !== undefined) {
      breakdown[deviceType]++;
    } else {
      breakdown.unknown++;
    }
  });

  return breakdown;
}

// Get location breakdown (simplified)
function getLocationBreakdown(visits) {
  const breakdown = {};

  visits.forEach(visit => {
    const location = visit.location?.country || visit.location?.region || 'Unknown';
    if (!breakdown[location]) {
      breakdown[location] = 0;
    }
    breakdown[location]++;
  });

  return breakdown;
}

// Calculate conversion rate over time
function calculateConversionRateOverTime(events, visits) {
  // Get today's date in Quebec timezone
  const todayKey = getTodayDateString();

  const timeMap = {};

  // Find the earliest date in the data (converted to Quebec timezone)
  let earliestDate = null;

  visits.forEach(visit => {
    const dateKey = getQuebecDateString(visit.createdAt);
    if (dateKey && (!earliestDate || dateKey < earliestDate)) {
      earliestDate = dateKey;
    }
  });

  events.forEach(event => {
    if (event.eventType === 'payment_completed') {
      const dateKey = getQuebecDateString(event.createdAt);
      if (dateKey && (!earliestDate || dateKey < earliestDate)) {
        earliestDate = dateKey;
      }
    }
  });

  // Determine start date: 3 days before earliest data OR today if no data
  const startDateString = earliestDate ? addDaysToDateString(earliestDate, -3) : addDaysToDateString(todayKey, -3);

  // Initialize map with zero values for all dates from startDate to today (inclusive)
  // Work with date strings directly to avoid timezone issues
  let currentDateString = startDateString;
  while (currentDateString <= todayKey) {
    timeMap[currentDateString] = { visits: 0, conversions: 0 };
    currentDateString = addDaysToDateString(currentDateString, 1);
  }

  // Group visits by date (Quebec timezone)
  visits.forEach(visit => {
    const dateKey = getQuebecDateString(visit.createdAt);
    if (!dateKey) return;

    if (!timeMap[dateKey]) {
      timeMap[dateKey] = { visits: 0, conversions: 0 };
    }
    timeMap[dateKey].visits++;
  });

  // Group conversions by date (Quebec timezone)
  events.forEach(event => {
    if (event.eventType === 'payment_completed') {
      const dateKey = getQuebecDateString(event.createdAt);
      if (!dateKey) return;

      if (!timeMap[dateKey]) {
        timeMap[dateKey] = { visits: 0, conversions: 0 };
      }
      timeMap[dateKey].conversions++;
    }
  });

  // Calculate conversion rates
  return Object.entries(timeMap).map(([date, data]) => ({
    date,
    value: data.visits > 0 ? (data.conversions / data.visits) * 100 : 0,
    visits: data.visits,
    conversions: data.conversions
  })).sort((a, b) => new Date(a.date) - new Date(b.date));
}

