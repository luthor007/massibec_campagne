# Configuration des Emails

Ce projet supporte trois providers d'email : **Gmail**, **Outlook/Microsoft 365**, et **Resend**.

## 🔧 Configuration

### Option 1: Microsoft 365 / Outlook ⭐ (Recommandé pour `commande@massibec.com`)

Pour utiliser votre adresse email Outlook/Microsoft 365 `commande@massibec.com` :

**Dans votre fichier `.env` :**

```env
EMAIL_PROVIDER=outlook
OUTLOOK_USER=commande@massibec.com
OUTLOOK_PASS=votre-mot-de-passe
```

**Configuration SMTP utilisée :**

- **Serveur :** `smtp.office365.com`
- **Port :** `587` (TLS)
- **Authentification :** Votre email et mot de passe

**⚠️ Important :**

1. Si vous avez l'**authentification multifacteur (MFA)** activée, vous devrez créer un **mot de passe d'application** :
   - Allez sur https://account.microsoft.com/security
   - Créez un nouveau mot de passe d'application
   - Utilisez ce mot de passe dans `OUTLOOK_PASS`

2. Assurez-vous que **SMTP AUTH est activé** dans votre compte Microsoft 365 :
   - Admin center → Users → Active users
   - Sélectionnez l'utilisateur → Mail → Manage email apps
   - Activez "Authenticated SMTP"

---

### Option 2: Gmail

Pour utiliser Gmail :

**Dans votre fichier `.env` :**

```env
EMAIL_PROVIDER=gmail
GMAIL_USER=votre-email@gmail.com
GMAIL_PASS=votre-app-password
```

**⚠️ Important :**

- Vous devez créer un **mot de passe d'application** Gmail (pas votre mot de passe normal)
- Allez sur https://myaccount.google.com/apppasswords

---

### Option 3: Resend (Service tiers)

Pour utiliser Resend avec votre domaine vérifié :

**Dans votre fichier `.env` :**

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxx
RESEND_FROM_EMAIL=commande@massibec.com
```

**Avantages :**

- ✅ Pas de gestion de mots de passe
- ✅ Meilleure délivrabilité
- ✅ Analytics et logs détaillés
- ✅ Plus de limites d'envoi

**Configuration requise :**

1. Créer un compte sur https://resend.com
2. Vérifier votre domaine `massibec.com`
3. Configurer les DNS (SPF, DKIM, DMARC)

---

## 📧 Emails envoyés

Tous les emails sont envoyés depuis : **`Campagne Massibec <commande@massibec.com>`**

### Types d'emails :

1. **Confirmation d'inscription de l'école**
   - À: responsable de l'école
   - CC: commande@massibec.com

2. **Confirmation d'inscription du vendeur (étudiant)**
   - À: parent/étudiant

3. **Confirmation de commande au client**
   - À: client
   - CC: vendeur

4. **Confirmation de commande à Massibec**
   - À: vendeur
   - CC: facturation@massibec.com
   - Contient l'adresse et la date de livraison

5. **Réinitialisation de mot de passe**
6. **Vérification d'email**
7. **Suppression de commande**

---

## 🧪 Test de la configuration

Après avoir configuré votre `.env`, redémarrez votre serveur :

```bash
npm run dev
# ou
yarn dev
```

Dans les logs du serveur, vous devriez voir :

```
📧 Using Outlook/Microsoft 365 for verification email
```

---

## 🔍 Dépannage

### Erreur "Authentication failed"

**Outlook/Microsoft 365 :**

- Vérifiez que SMTP AUTH est activé
- Utilisez un mot de passe d'application si MFA est activé
- Vérifiez que l'adresse email est correcte

**Gmail :**

- Créez un nouveau mot de passe d'application
- Vérifiez que l'accès "moins sécurisé" est configuré

### Erreur "Connection timeout"

- Vérifiez que le port 587 n'est pas bloqué par votre firewall
- Vérifiez votre connexion internet

### Emails non reçus

- Vérifiez le dossier spam
- Vérifiez les logs du serveur pour les erreurs
- Vérifiez que l'adresse email de destination est correcte

---

## 📝 Notes

- Le fichier principal est `src/utils/gmailMailer.tsx` (nom historique, mais supporte tous les providers)
- La configuration est détectée automatiquement via `EMAIL_PROVIDER`
- Tous les templates d'email sont dans `src/components/`






