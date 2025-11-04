// pages/api/commandes/[orderId].ts (consolidated into this route)
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Order from '../../../models/Order';
import User from '../../../models/User';
import Store from '../../../models/Store';
import { getToken } from 'next-auth/jwt';
import { sendDeletionEmail } from '../../../utils/gmailMailer';
import { IOrder } from '../../../types/order';
import mongoose from 'mongoose';

// Importer le modèle Product pour s'assurer qu'il est enregistré
import '../../../models/Product';

interface MessageData {
  message: string;
}

type ResponseData = MessageData | IOrder[];

// Interface pour la requête DELETE
interface DeleteCommandeRequestBody {
  reason: string; // Raison de la suppression, par exemple "Non-paiement"
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  await dbConnect();

  const { id } = req.query;
  console.log('Received _id:', id);

  if (req.method === 'PUT') {
    try {
      // Validate that id is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id as string)) {
        return res.status(400).json({ message: 'ID de commande invalide.' });
      }

      // Find the order by _id instead of orderId
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ message: 'Commande non trouvée' });
      }

      // Update order status and/or distributionNotes
      const { status, distributionNotes } = req.body;
      
      if (status !== undefined) {
        const validStatuses = ['En attente', 'Payé', 'Commander', 'Complété'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            message: `Statut invalide. Les statuts valides sont : ${validStatuses.join(', ')}.`,
          });
        }
        order.status = status;
      }
      
      if (distributionNotes !== undefined) {
        order.distributionNotes = distributionNotes || '';
      }
      
      await order.save();

      res.status(200).json({ message: 'Statut de la commande mis à jour avec succès' });
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de la commande:', error);
      res.status(400).json({ 
        message: `Erreur lors de la mise à jour de la commande: ${error.message}` 
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verify authentication
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Non autorisé, pas connecté' });
      }

      const userId = token.sub;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(401).json({ message: 'Utilisateur non trouvé.' });
      }

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id as string)) {
        return res.status(400).json({ message: 'ID de commande invalide.' });
      }

      // Find order by _id and populate necessary fields
      const order = await Order.findById(id).populate('user');
      if (!order) {
        return res.status(404).json({ message: 'Commande non trouvée' });
      }

      const store = await Store.findById(order.store);
      if (!store) {
        return res.status(404).json({ message: 'Boutique non trouvée' });
      }

      // Delete the order using _id
      await Order.findByIdAndDelete(id);

      // Send deletion email (don't fail if email sending fails)
      try {
        await sendDeletionEmail({
          to: order.customerEmail,
          subject: `Suppression de votre commande - Commande #${order.orderId}`,
          firstName: order.customerName,
          storeName: store.name,
          orderId: order.orderId,
          deletionDate: new Date().toLocaleDateString('fr-FR'),
          sellerName: user.name,
          sellerPhone: user.parentInfo?.telephone || 'Non fourni',
          sellerEmail: user.email,
        });
      } catch (emailError: any) {
        // Log the email error but don't fail the request
        console.error('Erreur lors de l\'envoi de l\'email de suppression:', emailError);
      }

      res.status(200).json({ message: 'Commande supprimée avec succès.' });
    } catch (error: any) {
      console.error('Erreur lors de la suppression de la commande:', error);
      res.status(500).json({ 
        message: `Erreur lors de la suppression de la commande: ${error.message}` 
      });
    }
  } else if (req.method === 'GET') {
    try {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return res.status(401).json({ message: 'Non autorisé, pas connecté' });
      }

      const userId = token.sub;
      const orders: IOrder[] = await Order.find({ user: userId })
        .populate('products.product')
        .lean<IOrder[]>();

      res.status(200).json(orders);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des commandes:', error);
      res.status(400).json({ 
        message: `Erreur lors de la récupération des commandes: ${error.message}` 
      });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'GET', 'DELETE']);
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}