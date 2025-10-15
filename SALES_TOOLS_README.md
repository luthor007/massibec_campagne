# Outils de Vente - Guide de Configuration

## 🚀 Fonctionnalités Implémentées

### 1. **Générateur PDF Marketing**

- Affiche professionnelle avec logo et produits
- QR code intégré vers la boutique
- Design attractif et prêt à imprimer
- Téléchargement automatique en PDF

### 2. **Générateur QR Code**

- QR code haute résolution
- Téléchargement en PNG
- Copie rapide du lien
- Partage natif sur mobile

### 3. **Gestion des Clients**

- CRUD complet (Créer, Lire, Modifier, Supprimer)
- Export CSV des clients
- Sélection multiple pour campagnes
- Historique des commandes

### 4. **Campagnes Email avec Resend**

- Templates prêts à l'emploi
- Personnalisation automatique
- HTML responsive et professionnel
- Suivi des envois et échecs

### 5. **Templates Réseaux Sociaux**

- Facebook: Posts et événements
- Instagram: Stories et carrousels
- TikTok: Vidéos virales
- Conseils d'utilisation inclus

### 6. **Analytiques et Statistiques**

- Ventes totales et mensuelles
- Taux de croissance
- Nombre de clients
- Visualisation des données

## 📋 Configuration Requise

### Variables d'Environnement (.env.local)

```env
# Resend API (pour les emails)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@votredomaine.com

# MongoDB (déjà configuré)
MONGODB_URI=mongodb+srv://...

# NextAuth (déjà configuré)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

### Configuration Resend

1. **Créer un compte Resend**
   - Allez sur https://resend.com
   - Créez un compte gratuit (100 emails/jour)

2. **Obtenir votre API Key**
   - Dashboard → API Keys
   - Créez une nouvelle clé
   - Copiez-la dans `.env.local`

3. **Configurer votre domaine (Optionnel mais recommandé)**
   - Dashboard → Domains
   - Ajoutez votre domaine
   - Configurez les enregistrements DNS
   - Vérifiez le domaine

4. **Email d'expéditeur**
   - Sans domaine: utilisez `onboarding@resend.dev` (limite: 100/jour)
   - Avec domaine: utilisez `noreply@votredomaine.com` (limite: 3000/jour)

## 🎯 Utilisation

### Accès à la Page

- Dashboard Étudiant → Outils de Vente
- URL: `/dashboard/vendre`

### Génération PDF

1. Cliquez sur "Générer et Télécharger PDF"
2. Le PDF se télécharge automatiquement
3. Imprimez en couleur pour meilleur résultat

### QR Code

1. Le QR code se génère automatiquement
2. Cliquez "Télécharger QR Code" pour sauvegarder
3. Utilisez "Copier le lien" pour partager

### Gestion Clients

1. Ajoutez des clients avec nom et email
2. Sélectionnez-les pour les campagnes
3. Exportez en CSV pour backup

### Campagnes Email

1. Sélectionnez des clients
2. Choisissez un template ou écrivez le vôtre
3. Personnalisez avec {nom}, {boutique}, {lien}
4. Cliquez "Envoyer"

### Réseaux Sociaux

1. Choisissez votre plateforme
2. Copiez le template
3. Collez sur votre réseau
4. Suivez les conseils d'utilisation

## 📦 Dépendances Installées

```json
{
  "jspdf": "^2.5.1",
  "html2canvas": "^1.4.1",
  "qrcode": "^1.5.3",
  "resend": "^3.0.0",
  "recharts": "^2.10.0",
  "react-to-print": "^2.15.0"
}
```

## 🔧 Structure des Fichiers

```
src/
├── pages/
│   ├── dashboard/
│   │   └── vendre.jsx                 # Page principale
│   └── api/
│       ├── clients.js                 # CRUD clients
│       ├── sales-stats.js             # Statistiques
│       └── send-email-campaign.js     # Envoi emails
├── components/
│   └── SalesTools/
│       ├── PDFGenerator.jsx           # Générateur PDF
│       ├── QRCodeGenerator.jsx        # Générateur QR
│       ├── ClientManager.jsx          # Gestion clients
│       └── EmailCampaign.jsx          # Campagnes email
└── models/
    └── Client.js                      # Modèle MongoDB

```

## 🎨 Personnalisation

### Modifier les Templates Email

Éditez `/src/pages/api/send-email-campaign.js`:

- Ligne 59-126: Template HTML
- Modifiez les couleurs, textes, structure

### Ajouter des Templates Sociaux

Éditez `/src/pages/dashboard/vendre.jsx`:

- Ligne 95-160: Templates par plateforme
- Ajoutez vos propres messages

### Personnaliser le PDF

Éditez `/src/components/SalesTools/PDFGenerator.jsx`:

- Ligne 15-95: Structure du PDF
- Modifiez couleurs, polices, layout

## 🚨 Limites et Quotas

### Resend (Gratuit)

- 100 emails/jour sans domaine
- 3000 emails/mois avec domaine vérifié
- Upgrade disponible pour plus

### QR Code API

- Illimité (service gratuit)
- Génération côté client

### PDF

- Génération côté client
- Pas de limite

## 📈 Prochaines Améliorations

- [ ] Statistiques avancées avec graphiques
- [ ] A/B testing des emails
- [ ] Automatisation des campagnes
- [ ] Intégration SMS
- [ ] Templates d'images pour réseaux sociaux
- [ ] Calendrier de publication
- [ ] Suivi des conversions

## 🆘 Support

Pour toute question ou problème:

1. Vérifiez les logs de la console
2. Consultez la documentation Resend
3. Vérifiez vos variables d'environnement

## 📝 Notes Importantes

- **Emails**: Testez d'abord avec votre propre email
- **RGPD**: Obtenez le consentement avant d'envoyer des emails
- **Spam**: N'envoyez pas trop d'emails d'un coup
- **Backup**: Exportez régulièrement vos clients en CSV

---

**Version**: 1.0.0  
**Dernière mise à jour**: Octobre 2025  
**Statut**: Production Ready ✅



