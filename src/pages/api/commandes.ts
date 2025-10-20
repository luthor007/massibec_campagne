// pages/api/commandes.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb';
import Order from '../../models/Order';
import User from '../../models/User';
import School from '../../models/School';
import Store from '../../models/Store';
import { sendEmail, sendSaleNotificationEmail } from '../../utils/gmailMailer';
import getNextOrderId from '../../utils/getNextOrderId';
import { getToken } from 'next-auth/jwt'; // Add this import
import { IOrder} from '../../types/order'

interface ProductItem {
  product: string;
  quantity: number;
  name: string;
  price: number;
  cost: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    await dbConnect();

    //const newOrderId = (await getNextOrderId()).toString();

    const {
      products,
      totalAmount,
      customerEmail,
      customerName,
      storeId,
      school,
      owner,
      phoneNumber,
      tip,
      autoDeposit,
    } = req.body;

    // Find the user by ID or email (or any unique identifier available)
    const user = await User.findById(owner._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Increment the order counter by 1
    user.orderCounter = user.orderCounter + 1;
    const newOrderId = user.orderCounter;

    // Save the updated user
    await user.save();


    // Validation des champs requis
    console.log(newOrderId)
    console.log(products)
    console.log(totalAmount)
    console.log(customerEmail)
    console.log(customerName)
    console.log(storeId)
    console.log(school)
    console.log("addresse: ---------------")
    console.log(owner.parentInfo.adresse)
    console.log(owner)
    if (
      !newOrderId ||
      !products ||
      !Array.isArray(products) ||
      products.length === 0 ||
      !totalAmount ||
      !customerEmail ||
      !customerName ||
      !storeId ||
      !school ||
      !owner ||
      !phoneNumber
    ) {
      return res.status(400).json({ message: 'Certains champs requis sont manquants.' });
    }

    try {
      // Récupérer les informations de l'école
      const schoolData = await School.findById(school);
      if (!schoolData) {
        return res.status(400).json({ message: 'École non trouvée.' });
      }

      const activeCampaign = schoolData.campaigns?.find((campaign: any) => campaign.isActive);
      const campaignNumber = activeCampaign?.campaignNumber || schoolData.currentCampaignNumber || 1;
      const campaignId = activeCampaign?._id || null;

      const storeData = await Store.findById(storeId);
      if (!storeData) {
        return res.status(400).json({ message: 'Store non trouvée.' });
      }

      // Récupérer les informations du vendeur (propriétaire de l'école)
      //const seller = await User.findOne({ school: schoolData._id, role: 'student' });
      //if (!seller) {
      //  return res.status(400).json({ message: 'Vendeur non trouvé.' });
      //}

      // Créer une nouvelle commande
      const newCommande = new Order({
        user: owner._id,
        products: products.map((item: any) => ({
          product: item.product,
          quantity: item.quantity,
          productName: item.name,
          productPrice: item.price,
          productCost: item.cost
        })),
        totalAmount: totalAmount,
        customerEmail: customerEmail,
        customerName: customerName,
        store: storeId,
        orderId: newOrderId,
        school: schoolData._id,
        campaignId,
        campaignNumber,
        phoneNumber: phoneNumber,
        tip: tip
        //orderDate: new Date(),
        //orderDeadline: schoolData.finCampagne,
        //deliveryDate: schoolData.dateDeLivraison,
        //deliveryLocation: owner.parentInfo.address,
      });

      await newCommande.save();

      // Générer les données pour l'e-mail
      console.log(`Here is customer email: ${customerEmail}`)
      const parentFullName = owner.name; // Le nom du parent/vendeur
      
      // Confirmation de commande au client
      // À: Client, CC: vendeur
      // De: (Nom du parent - Campagne (nom école)) <commande@massibec.com>
      // Objet: (Commande #X)(Montant), pour (Nom du client), de (Nom du Parent) - Campagne (Nom école)
      const emailParams = {
        to: customerEmail,
        cc: owner.email,
        from: `${parentFullName} - Campagne ${schoolData.name} <commande@massibec.com>`,
        subject: `(Commande #${newOrderId})($${(totalAmount + tip).toFixed(2)}), pour (${customerName}), de (${parentFullName}) - Campagne (${schoolData.name})`,
        firstName: customerName,
        customerEmail: customerEmail,
        hoursAvailable: storeData.hoursAvailable,
        storeName: schoolData.name,
        products: products.map((item: any) => ({
          productId: item.product,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          amount: (item.price * item.quantity).toFixed(2),
        })),
        totalAmount: totalAmount + tip,
        tip: tip,
        autoDeposit: autoDeposit,
        orderId: newOrderId,
        orderDate: new Date().toLocaleDateString('fr-FR'),
        orderDeadline: new Date(schoolData.finCampagne).toLocaleDateString('fr-FR'),
        deliveryDate: new Date(schoolData.dateDeLivraison).toLocaleDateString('fr-FR'),
        deliveryLocation: owner.parentInfo.adresse,
        deliveryCity: owner.parentInfo.ville,
        sellerName: owner.name,
        sellerPhone: owner.parentInfo.telephone,
        sellerEmail: owner.email,
      };

      // Envoyer l'e-mail de confirmation au client (avec vendeur en CC)
      await sendEmail(emailParams);

      // Confirmation d'une commande à Massibec
      // À: vendeur, CC: facturation@massibec.com
      // De: Campagne Massibec <commande@massibec.com>
      // Objet: (Commande #X) -(Montant)- de: (Nom du parent) - nom école - Pour: Massibec
      // Texte: La distribution se fera à (Adresse de l'école) le (date de livraison)
      const emailParams2 = {
        to: owner.email,
        cc: 'facturation@massibec.com',
        subject: `(Commande #${newOrderId}) -($${(totalAmount + tip).toFixed(2)})- de: (${parentFullName}) - ${schoolData.name} - Pour: Massibec`,
        studentName: owner.name,
        firstName: customerName,
        customerEmail: customerEmail,
        customerPhone: phoneNumber,
        schoolName: schoolData.name,
        schoolAddress: owner.parentInfo.adresse,
        deliveryDate: new Date(schoolData.dateDeLivraison).toLocaleDateString('fr-FR'),
        products: products.map((item: any) => ({
          productId: item.product,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          amount: (item.price * item.quantity).toFixed(2),
        })),
        totalAmount: totalAmount + tip,
        tip: tip,
        autoDeposit: autoDeposit,
        orderId: newOrderId,
        orderDate: new Date().toLocaleDateString('fr-FR'),

      };

      // Envoyer l'e-mail de confirmation à Massibec (vendeur avec facturation en CC)
      await sendSaleNotificationEmail(emailParams2);

      res.status(201).json({ message: 'Commande créée avec succès.' });
    } catch (error: any) {
      console.error('Erreur lors de la création de la commande:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  }  else if (req.method === 'GET') {
    // Vérifier le token d'authentification
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas connecté' });
    }

    const userId = token.sub; // Extraire l'ID utilisateur depuis le token
    console.log(userId)
    try {
      const orders = await Order.find({ user: userId })
        .populate('products.product')
        //.lean<IOrder[]>(); // Utilisation de génériques pour typer les objets

      console.log(orders)
      res.status(200).json(orders);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des commandes:', error);
      res.status(400).json({ message: `Erreur lors de la récupération des commandes: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}
