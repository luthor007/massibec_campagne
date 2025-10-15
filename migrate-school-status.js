// Script de migration pour ajouter le champ status aux écoles existantes
import dbConnect from './src/lib/mongodb.js';
import School from './src/models/School.js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

async function migrateSchoolStatus() {
  try {
    await dbConnect();
    console.log('Connexion à la base de données établie');

    // Mettre à jour toutes les écoles qui n'ont pas de champ status
    const result = await School.updateMany(
      { status: { $exists: false } },
      [
        {
          $set: {
            status: {
              $cond: {
                if: { $eq: ['$approved', true] },
                then: 'approved',
                else: 'pending'
              }
            }
          }
        }
      ]
    );

    console.log(`Migration terminée: ${result.modifiedCount} écoles mises à jour`);
    
    // Vérifier le résultat
    const schools = await School.find({});
    console.log('Statistiques des écoles après migration:');
    const stats = schools.reduce((acc, school) => {
      const status = school.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    console.log(stats);
    
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  } finally {
    process.exit(0);
  }
}

migrateSchoolStatus();