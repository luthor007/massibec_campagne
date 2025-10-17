import dbConnect from '../../../lib/mongodb';
import Store from '../../../models/Store';

import User from '../../../models/User';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    await dbConnect();
    
    // Special case for example store with ID "1"
    if (id === '1') {
      const exampleStore = {
        _id: '1',
        name: 'Boutique d\'exemple Massibec',
        description: '🎉 Découvrez les pâtés exclusifs de la campagne de financement Massibec (viande et poulet) ainsi qu\'un délicieux choix de tartes parfaites pour les fêtes qui approchent ! Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et, si vous ne le savez pas encore, contactez-moi pour connaître les modalités de récupération de vos produits le 18 décembre 2025. 🙏 Merci pour votre soutien et bon appétit !',
        autoDeposit: true,
        discountEnabled: true,
        user: '000000000000000000000001'
      };
      
      const exampleOwner = {
        _id: '000000000000000000000001',
        name: 'Élève Exemple',
        email: 'exemple@massibec.com',
        school: '671eea6a50059d84409666fa', // Chavigny school ID
        parentInfo: {
          telephone: '(819) 123-4567'
        }
      };
      
      return res.status(200).json({ 
        owner: exampleOwner, 
        autoDeposit: exampleStore.autoDeposit, 
        discountEnabled: exampleStore.discountEnabled,
        name: exampleStore.name, 
        description: exampleStore.description, 
        ownerId: exampleStore.user, 
        ownerEmail: exampleOwner.email, 
        ownerName: exampleOwner.name, 
        ownerSchool: exampleOwner.school 
      });
    }
    
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



    res.status(200).json({ owner: owner, autoDeposit: store.autoDeposit, discountEnabled: store.discountEnabled, name: store.name, description: store.description, ownerId: store.user, ownerEmail: owner.email, ownerName: owner.name, ownerSchool: owner.school });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de la boutique' });
  }
}