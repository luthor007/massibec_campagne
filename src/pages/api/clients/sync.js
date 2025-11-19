// src/pages/api/clients/sync.js
import dbConnect from '../../../lib/mongodb';
import Client from '../../../models/Client';
import Order from '../../../models/Order';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

export default async function handler(req, res) {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return res.status(401).json({ message: 'Non autorisé' });
    }

    if (req.method === 'POST') {
        try {
            const { storeId, campaignId } = req.body;

            if (!storeId) {
                return res.status(400).json({ message: 'storeId requis' });
            }

            // Convert storeId to ObjectId for proper querying
            const storeIdQuery = mongoose.Types.ObjectId.isValid(storeId)
                ? new mongoose.Types.ObjectId(storeId)
                : storeId;

            console.log('[clients/sync] Syncing clients for storeId:', storeId, 'campaignId:', campaignId);

            // Build query - get orders from all user's stores (all campaigns)
            const Store = (await import('../../../models/Store')).default;
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
            console.log('[clients/sync] Syncing clients from ALL campaigns (no campaignId filter)');

            const orders = await Order.find(queryConditions).lean();
            console.log(`[clients/sync] Found ${orders.length} orders for user (all campaigns)`);

            // Extract unique clients from orders
            const clientMap = new Map();

            orders.forEach(order => {
                const email = order.customerEmail?.toLowerCase()?.trim();
                const name = order.customerName?.trim();
                const phone = order.phoneNumber?.trim();

                if (!email || !name) {
                    return; // Skip orders without email or name
                }

                // Use email as unique key
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

                // Update totals
                const client = clientMap.get(email);
                client.totalSpent += order.totalAmount || 0;
                client.orderCount += 1;

                // Update last order date
                const orderDate = order.createdAt ? new Date(order.createdAt) : null;
                if (orderDate && (!client.lastOrderDate || orderDate > client.lastOrderDate)) {
                    client.lastOrderDate = orderDate;
                }
            });

            console.log(`[clients/sync] Extracted ${clientMap.size} unique clients from orders`);

            // Sync clients to database
            const syncedClients = [];
            const skippedClients = [];

            for (const [email, clientData] of clientMap.entries()) {
                try {
                    // Check if client already exists
                    const existingClient = await Client.findOne({
                        storeId: storeIdQuery,
                        email: email.toLowerCase()
                    });

                    if (existingClient) {
                        // Update existing client with latest data
                        existingClient.name = clientData.name;
                        existingClient.phone = clientData.phone || existingClient.phone;
                        existingClient.totalSpent = clientData.totalSpent;
                        existingClient.lastOrderDate = clientData.lastOrderDate;
                        await existingClient.save();
                        syncedClients.push(existingClient);
                    } else {
                        // Create new client
                        const newClient = new Client({
                            name: clientData.name,
                            email: email.toLowerCase(),
                            phone: clientData.phone || '',
                            storeId: storeIdQuery,
                            userId: token.sub,
                            totalSpent: clientData.totalSpent,
                            lastOrderDate: clientData.lastOrderDate,
                            isActive: true
                        });
                        await newClient.save();
                        syncedClients.push(newClient);
                    }
                } catch (error) {
                    console.error(`[clients/sync] Error syncing client ${email}:`, error);
                    skippedClients.push({ email, error: error.message });
                }
            }

            res.status(200).json({
                message: `${syncedClients.length} client(s) synchronisé(s)`,
                synced: syncedClients.length,
                skipped: skippedClients.length,
                skippedClients
            });
        } catch (error) {
            console.error('[clients/sync] Error:', error);
            res.status(500).json({ message: 'Erreur serveur', error: error.message });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
    }
}

