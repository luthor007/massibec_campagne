# Migration vers SendGrid - Guide Complet

## 🎯 Objectif

Migration complète du système d'email vers SendGrid Web API avec gestion dynamique des expéditeurs selon les spécifications exactes.

## 📋 Spécifications Implémentées

### 1. Confirmation d'inscription de l'école

- **À:** responsablecampagne@xyz.com, **CC:** commande@massibec.com
- **De:** (Campagne Massibec) commande@massibec.com
- **Objet:** Inscription (École xyz) Campagne Massibec

### 2. Confirmation d'inscription du vendeur (étudiant)

- **À:** parent@xyz.com
- **De:** (Campagne école-Massibec) commande@massibec.com
- **Objet:** Inscription (nom du parent) - Campagne (nom école) - Massibec

### 3. Confirmation de commande au client

- **À:** Client@xyz.com, **CC:** vendeur@xyz.com
- **De:** (Nom du parent - Campagne (nom école)) commande@massibec.com
- **Objet:** (Commande #1)(Montant), pour (Nom du client), de (Nom du Parent) - Campagne (Nom école)

### 4. Courriel de confirmation d'une commande à Massibec

- **À:** vendeur@xyz.com
- **CC:** facturation@massibec.com
- **De:** (Campagne Massibec) commande@massibec.com
- **Objet:** (Commande #1) -(Montant)- de: (Nom du parent) - nom école - Pour: Massibec
- **Texte:** La distribution se fera à (Adresse de l'école) le (date de livraison).

## 🔧 Configuration

### Variables d'environnement (.env.local)

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=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
```

### Sender Management dans SendGrid

- **Sender vérifié:** commande@massibec.com
- **Nom dynamique:** Géré programmatiquement selon les spécifications
- **Reply-to:** Configuré dynamiquement selon le type d'email

## 📁 Fichiers Créés/Modifiés

### Nouveaux fichiers

- `src/utils/sendgridMailer.tsx` - Service SendGrid principal
- `src/pages/api/send-school-confirmation.js` - API confirmation école
- `src/pages/api/send-student-confirmation.js` - API confirmation étudiant
- `src/pages/api/send-order-confirmation.js` - API confirmation commande
- `src/pages/api/send-massibec-confirmation.js` - API confirmation Massibec
- `src/pages/api/test-sendgrid-emails.js` - API de test
- `scripts/test-sendgrid.js` - Script de test

### Fichiers modifiés

- `src/utils/gmailMailer.tsx` - Router mis à jour pour SendGrid
- `.env.local` - Configuration SendGrid ajoutée

## 🚀 Utilisation

### 1. Configuration SendGrid

```bash
# Installer SendGrid
npm install @sendgrid/mail

# Configurer l'API key dans .env.local
echo "EMAIL_PROVIDER=sendgrid" >> .env.local
echo "SENDGRID_API_KEY=your_api_key_here" >> .env.local
```

### 2. Utilisation dans le code

```javascript
import {
  sendSchoolConfirmationEmail,
  sendStudentConfirmationEmail,
  sendOrderConfirmationEmail,
  sendMassibecConfirmationEmail,
} from "../utils/sendgridMailer";

// Confirmation école
await sendSchoolConfirmationEmail({
  schoolEmail: "ecole@example.com",
  schoolName: "École Test",
  schoolAddress: "123 Rue Test",
  schoolPhone: "514-123-4567",
  schoolContactName: "Jean Test",
});

// Confirmation étudiant
await sendStudentConfirmationEmail({
  parentEmail: "parent@example.com",
  parentName: "Marie Test",
  studentName: "Pierre Test",
  schoolName: "École Test",
});

// Confirmation commande client
await sendOrderConfirmationEmail({
  customerEmail: "client@example.com",
  customerName: "Client Test",
  sellerEmail: "vendeur@example.com",
  sellerName: "Vendeur Test",
  orderId: "CMD-001",
  orderAmount: 25.5,
  schoolName: "École Test",
  deliveryDate: "2025-01-15",
  schoolAddress: "123 Rue Test",
});

// Confirmation Massibec
await sendMassibecConfirmationEmail({
  sellerEmail: "vendeur@example.com",
  sellerName: "Vendeur Test",
  orderId: "CMD-001",
  orderAmount: 25.5,
  schoolName: "École Test",
  deliveryDate: "2025-01-15",
  schoolAddress: "123 Rue Test",
});
```

### 3. Tests

```bash
# Démarrer le serveur
npm run dev

# Dans un autre terminal, exécuter les tests
node scripts/test-sendgrid.js
```

## 🔍 Fonctionnalités Clés

### Gestion Dynamique des Expéditeurs

- **Nom d'expéditeur dynamique** selon le type d'email
- **Reply-to personnalisé** selon le contexte
- **CC automatique** selon les spécifications
- **Objets dynamiques** avec variables contextuelles

### Compatibilité

- **Router intelligent** qui choisit le provider selon `EMAIL_PROVIDER`
- **Rétrocompatibilité** avec Gmail/Resend existants
- **Interfaces identiques** pour faciliter la migration

### Monitoring

- **Logs détaillés** pour chaque envoi
- **Gestion d'erreurs** robuste
- **Tests automatisés** pour validation

## 📊 Avantages SendGrid

### Performance

- ✅ **Délivrabilité élevée** (98%+)
- ✅ **Latence faible** (< 100ms)
- ✅ **Limites élevées** (100k emails/jour)

### Fonctionnalités

- ✅ **Gestion dynamique** des expéditeurs
- ✅ **Templates avancés** avec variables
- ✅ **Analytics détaillés** (ouvertures, clics)
- ✅ **Gestion des bounces** automatique

### Sécurité

- ✅ **API Key sécurisée** (pas de mots de passe)
- ✅ **Authentification DKIM** automatique
- ✅ **Conformité CAN-SPAM** intégrée

## 🚨 Points d'Attention

### Sender Management

- Le sender `commande@massibec.com` doit être vérifié dans SendGrid
- Les noms dynamiques sont gérés programmatiquement
- Les reply-to sont configurés selon le contexte

### Migration

- L'ancien système Gmail/Resend reste fonctionnel
- Migration progressive possible par type d'email
- Tests recommandés avant déploiement production

### Monitoring

- Surveiller les logs SendGrid pour les erreurs
- Configurer les webhooks pour le suivi des événements
- Monitorer les taux de délivrabilité

## 🔄 Prochaines Étapes

1. **Tester** tous les types d'emails en développement
2. **Vérifier** la configuration SendGrid (sender, domain)
3. **Migrer** progressivement les endpoints existants
4. **Monitorer** les performances en production
5. **Configurer** les webhooks SendGrid pour analytics

## 📞 Support

- **Documentation SendGrid:** https://docs.sendgrid.com/
- **API Reference:** https://docs.sendgrid.com/api-reference/
- **Sender Management:** https://app.sendgrid.com/settings/sender_auth
