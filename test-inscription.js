// Test script pour vérifier le formulaire d'inscription
console.log('Test du formulaire d\'inscription manager');

// Simuler les données du formulaire
const formData = {
  nomComplet: 'Test Manager Final',
  email: 'testfinal@example.com',
  motDePasse: 'password123',
  telephone: '(819) 123-4567',
  cellulaire: '(819) 987-6543',
  organisme: 'École Test Final',
  titreOuFonction: 'Directeur',
  ville: 'Montréal',
  codePostal: 'H1A 1A1',
  adresse: '999 rue Test Final',
  momentPourJoindre: 'matin'
};

console.log('Données du formulaire:', formData);

// Test de l'API
fetch('/api/inscription-manager', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(formData),
})
.then(response => response.json())
.then(data => {
  console.log('Réponse de l\'API:', data);
  if (data.message && data.message.includes('success')) {
    console.log('✅ Inscription réussie !');
  } else {
    console.log('❌ Erreur:', data.message);
  }
})
.catch(error => {
  console.error('❌ Erreur de connexion:', error);
});
