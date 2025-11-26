// src/pages/api/clients.js
import dbConnect from '../../lib/mongodb';
import Client from '../../models/Client';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await dbConnect();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  if (req.method === 'GET') {
    try {
      const { storeId, campaignId, autoSync, allCampaigns } = req.query;

      if (!storeId) {
        console.log('[clients API] No storeId provided');
        return res.status(400).json({ message: 'storeId requis' });
      }

      console.log('[clients API] Fetching clients for storeId:', storeId, 'campaignId:', campaignId, 'allCampaigns:', allCampaigns);

      // Convert storeId to ObjectId if it's a valid MongoDB ObjectId string
      const storeIdQuery = mongoose.Types.ObjectId.isValid(storeId)
        ? new mongoose.Types.ObjectId(storeId)
        : storeId;

      const Store = (await import('../../models/Store')).default;

      // If allCampaigns is true, get clients from all user's stores, otherwise just this store
      let clients;
      if (allCampaigns === 'true') {
        // Get all stores for this user
        const userStores = await Store.find({ user: token.sub }).lean();
        const userStoreIds = userStores.map(store => store._id);
        console.log('[clients API] Fetching clients from all', userStoreIds.length, 'stores');
        clients = await Client.find({ storeId: { $in: userStoreIds } }).sort({ createdAt: -1 }).lean();
      } else {
        clients = await Client.find({ storeId: storeIdQuery }).sort({ createdAt: -1 }).lean();
      }

      console.log('[clients API] Found', clients.length, 'clients');

      // Auto-sync from orders if no clients exist and autoSync is enabled
      if (clients.length === 0 && autoSync === 'true') {
        console.log('[clients API] No clients found, attempting to sync from orders...');
        try {
          const Order = (await import('../../models/Order')).default;
          const Store = (await import('../../models/Store')).default;

          // Build query - get orders from all user's stores (all campaigns)
          const userStores = await Store.find({ user: token.sub }).lean();
          const storeIds = userStores.map(store => store._id);

          const orConditions = [
            { user: token.sub },
          ];

          if (storeIds.length > 0) {
            orConditions.push({ store: { $in: storeIds } });
          }

          // Don't filter by campaignId - get orders from ALL campaigns
          const queryConditions = { $or: orConditions };
          console.log('[clients API] Syncing clients from ALL campaigns (no campaignId filter)');

          const orders = await Order.find(queryConditions).lean();
          console.log('[clients API] Found', orders.length, 'orders for user (all campaigns)');

          if (orders.length > 0) {
            console.log('[clients API] Sample order:', {
              customerEmail: orders[0].customerEmail,
              customerName: orders[0].customerName,
              phoneNumber: orders[0].phoneNumber
            });
            // Extract unique clients from orders
            const clientMap = new Map();

            orders.forEach(order => {
              const email = order.customerEmail?.toLowerCase()?.trim();
              const name = order.customerName?.trim();
              const phone = order.phoneNumber?.trim();

              if (!email || !name) {
                console.log('[clients API] Skipping order - missing email or name:', { email, name });
                return;
              }

              if (!clientMap.has(email)) {
                clientMap.set(email, {
                  email,
                  name,
                  phone: phone || '',
                  totalSpent: 0,
                  orderCount: 0,
                  lastOrderDate: null
                });
              }

              const client = clientMap.get(email);
              client.totalSpent += order.totalAmount || 0;
              client.orderCount += 1;

              const orderDate = order.createdAt ? new Date(order.createdAt) : null;
              if (orderDate && (!client.lastOrderDate || orderDate > client.lastOrderDate)) {
                client.lastOrderDate = orderDate;
              }
            });

            // Create clients - associate each client with the storeId from their orders
            console.log('[clients API] Creating', clientMap.size, 'clients from orders');
            for (const [email, clientData] of clientMap.entries()) {
              try {
                // Find the most recent order for this client to get the storeId
                const clientOrders = orders.filter(o =>
                  o.customerEmail?.toLowerCase()?.trim() === email
                );
                const mostRecentOrder = clientOrders.sort((a, b) =>
                  new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
                )[0];

                // Use the storeId from the order, or fallback to current storeId
                const clientStoreId = mostRecentOrder?.store || storeIdQuery;

                // Check if client already exists for this store
                const existingClient = await Client.findOne({
                  email: email.toLowerCase(),
                  storeId: clientStoreId
                });

                if (existingClient) {
                  // Update existing client
                  existingClient.totalSpent = clientData.totalSpent;
                  existingClient.lastOrderDate = clientData.lastOrderDate;
                  await existingClient.save();
                  console.log('[clients API] Updated existing client:', email, 'for store:', clientStoreId);
                } else {
                  const newClient = new Client({
                    name: clientData.name,
                    email: email.toLowerCase(),
                    phone: clientData.phone || '',
                    storeId: clientStoreId,
                    userId: token.sub,
                    totalSpent: clientData.totalSpent,
                    lastOrderDate: clientData.lastOrderDate,
                    isActive: true
                  });
                  await newClient.save();
                  console.log('[clients API] Created client:', email, 'for store:', clientStoreId);
                }
              } catch (error) {
                console.error('[clients API] Error creating client', email, ':', error);
              }
            }

            // Re-fetch clients (from all stores if allCampaigns is true)
            if (allCampaigns === 'true') {
              const userStoresAfterSync = await Store.find({ user: token.sub }).lean();
              const userStoreIdsAfterSync = userStoresAfterSync.map(store => store._id);
              clients = await Client.find({ storeId: { $in: userStoreIdsAfterSync } }).sort({ createdAt: -1 }).lean();
            } else {
              clients = await Client.find({ storeId: storeIdQuery }).sort({ createdAt: -1 }).lean();
            }
            console.log('[clients API] Synced', clients.length, 'clients from orders');
          }
        } catch (syncError) {
          console.error('[clients API] Error auto-syncing:', syncError);
          // Continue with empty clients array
        }
      }

      // Ensure _id is serialized and totalSpent has a default value
      const clientsWithTotals = clients.map(client => ({
        ...client,
        _id: client._id.toString(),
        totalSpent: client.totalSpent || 0
      }));

      res.status(200).json(clientsWithTotals);
    } catch (error) {
      console.error('[clients API] Error fetching clients:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, email, phone, notes, storeId } = req.body;

      const client = new Client({
        name,
        email,
        phone,
        notes,
        storeId,
        userId: token.sub
      });

      await client.save();
      res.status(201).json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;
      const client = await Client.findByIdAndUpdate(id, updateData, { new: true });
      res.status(200).json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await Client.findByIdAndDelete(id);
      res.status(200).json({ message: 'Client supprimé' });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }
}



