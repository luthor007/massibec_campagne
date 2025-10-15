// src/pages/api/clients.js
import dbConnect from '../../lib/mongodb';
import Client from '../../models/Client';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  await dbConnect();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  if (req.method === 'GET') {
    try {
      const { storeId } = req.query;
      const clients = await Client.find({ storeId }).sort({ createdAt: -1 });
      res.status(200).json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
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



