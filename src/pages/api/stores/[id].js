import dbConnect from '../../../lib/mongodb';
import Store from '../../../models/Store';

import User from '../../../models/User';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    await dbConnect();
    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({ message: 'Boutique non trouvée' });
    }

        // Récupérer le propriétaire du magasin (l'utilisateur associé)
    const owner = await User.findById(store.user);

    if (!owner) {
        return res.status(404).json({ message: 'Propriétaire non trouvé' });
    }

    console.log('Owner from store api')
    console.log(owner)



    res.status(200).json({ owner: owner, autoDeposit: store.autoDeposit, name: store.name, description: store.description, ownerId: store.user, ownerEmail: owner.email, ownerName: owner.name, ownerSchool: owner.school });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de la boutique' });
  }
}