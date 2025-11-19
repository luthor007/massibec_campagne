# Scripts Utilitaires

## verify-email.js

Script pour vérifier manuellement les adresses email pendant le développement, sans avoir besoin d'envoyer de vrais emails.

### Utilisation

```bash
node scripts/verify-email.js <email_address>
```

### Exemple

```bash
node scripts/verify-email.js test@example.com
```

### Fonctionnalités

- Trouve l'utilisateur par email
- Marque l'email comme vérifié (`emailVerified = true`)
- Supprime le token de vérification
- Génère un token de login temporaire (valide 5 minutes)
- Affiche les informations pour se connecter

### Workflow de test

1. Créez un compte avec n'importe quel email (ex: `test@test.com`)
2. Sur la page de vérification email, gardez la page ouverte
3. Exécutez le script :
   ```bash
   node scripts/verify-email.js test@test.com
   ```
4. La page devrait détecter la vérification et se connecter automatiquement

### Notes

- Le script fonctionne pour les étudiants et les gestionnaires d'école
- Le token de login expire après 5 minutes
- Assurez-vous que votre fichier `.env.local` contient `MONGODB_URI`



