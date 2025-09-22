import dbConnect from '../../lib/mongodb';
import Store from '../../models/Store';
import { getToken } from 'next-auth/jwt';  // Import getToken

export default async function handler(req, res) {
  try {
    await dbConnect();  // Ensure the database connection

    // Extract the token from the request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas logged in' });
    }

    const userId = token.sub;  // Extract the user ID from the token

    if (req.method === 'POST') {
      const { name, description, autoDeposit } = req.body;

      try {
        let store = await Store.findOne({ user: userId });

        if (store) {
          store.name = name;
          store.description = description;
          store.autoDeposit = autoDeposit;
          //store.hoursAvailable = hoursAvailable
          //store.colorPalette = colorPalette;
        } else {
          console.log(description)
          console.log(name)
          store = new Store({ user: userId, name: name, description: description, autoDeposit: autoDeposit });
        }

        await store.save();
        res.status(200).json({ message: 'Boutique personnalisée avec succès', storeUrl: `/boutique/${store._id}` });
      } catch (error) {
        res.status(400).json({ message: `Erreur lors de la personnalisation: ${error.message}` });
      }

    } else if (req.method === 'GET') {
      try {
        let store = await Store.findOne({ user: userId });

        if (!store) {
          store = { name: '', description: '', colorPalette: '#000000', autoDeposit: false };
        }

        res.status(200).json({
          name: store.name,
          description: store.description,
          colorPalette: store.colorPalette,
          autoDeposit: store.autoDeposit,
        });

      } catch (error) {
        res.status(400).json({ message: `Erreur lors de la récupération de la boutique: ${error.message}` });
      }

    } else {
      res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}