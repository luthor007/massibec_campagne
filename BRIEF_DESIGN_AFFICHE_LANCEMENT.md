# Brief de Design - Affiche de Lancement de Campagne

## 🎯 Objectif Principal
Créer une affiche imprimable (format 8.5" x 11" / A4) pour le **LANCEMENT d'une NOUVELLE campagne** de financement. Cette affiche sera distribuée aux étudiants AVANT le début de la campagne pour les inciter à s'inscrire. C'est notre **meilleure chance de maximiser le nombre de participants** dès le départ.

**Contexte**: Aucun étudiant ne s'est encore inscrit. L'affiche doit créer l'envie, expliquer clairement le processus, et convertir le maximum d'étudiants en participants actifs.

---

## 📐 Spécifications Techniques

### Dimensions
- **Format principal**: 8.5" x 11" (US Letter) ou A4 (210mm x 297mm)
- **Résolution**: 300 DPI minimum pour impression
- **Modes de couleur**: CMYK pour impression, RGB pour prévisualisation
- **Marges d'impression**: 0.25" (6mm) de marge de sécurité de tous les côtés

### Zones de Contenu
L'affiche est divisée en 5 zones principales optimisées pour le lancement:

```
┌─────────────────────────────────────────┐
│  ZONE 1: EN-TÊTE (20% hauteur)          │
│  - Logo école + Titre accrocheur        │
│  - Badge campagne avec dates            │
├─────────────────────────────────────────┤
│  ZONE 2: PROPOSITION DE VALEUR (30%)   │
│  - Ce que tu gagnes (bénéfices clairs)  │
│  - Pourquoi participer MAINTENANT       │
├─────────────────────────────────────────┤
│  ZONE 3: AVANTAGES D'ÊTRE PREMIER (25%)│
│  - Pourquoi s'inscrire dès maintenant   │
│  - Exemples concrets de gains           │
├─────────────────────────────────────────┤
│  ZONE 4: PROCESSUS SIMPLE (15%)        │
│  - 3 étapes ultra-simples               │
│  - Réduction de friction maximale       │
├─────────────────────────────────────────┤
│  ZONE 5: CALL-TO-ACTION (10% hauteur)  │
│  - QR Code proéminent                   │
│  - Code campagne + message d'urgence    │
└─────────────────────────────────────────┘
```

---

## 🎨 ZONE 1: EN-TÊTE (20% de la hauteur)

### Éléments Requis

#### Logo de l'École
- **Position**: Coin supérieur gauche OU centré en haut
- **Taille**: Maximum 2" (5cm) de hauteur, proportion maintenue
- **Espacement**: 0.5" (12mm) depuis le haut et le côté gauche
- **Fond**: Transparent si PNG, ou fond blanc si JPG
- **Fallback**: Si pas de logo, utiliser le nom de l'école en grand texte stylisé avec icône école 🏫

#### Titre Principal - ACCROCHEUR
- **Texte Option 1**: "Rejoins la campagne de financement de [NOM_ÉCOLE]"
- **Texte Option 2**: "Lance-toi dans la campagne [NOM_ÉCOLE]!"
- **Texte Option 3**: "Campagne de financement [NOM_ÉCOLE] - Inscris-toi maintenant!"
- **Taille de police**: 48-60pt (selon longueur du nom)
- **Police**: Bold, moderne, énergique (ex: Montserrat Bold, Poppins Bold)
- **Couleur**: Contraste élevé avec le fond (noir ou couleur école)
- **Alignement**: Centré ou aligné à gauche selon position du logo
- **Style**: Peut avoir effet de dégradé ou ombre légère pour impact

#### Badge Campagne - URGENCE
- **Position**: En haut à droite OU sous le titre
- **Contenu**: 
  - "Campagne #[NUMÉRO_CAMPAGNE]"
  - "Début: [DATE_DÉBUT]"
  - "Inscris-toi MAINTENANT!"
- **Style**: Badge arrondi avec bordure épaisse (2-3pt), couleur accent vive (vert, orange, ou couleur école)
- **Taille**: Police 14-16pt pour le numéro, 10-12pt pour les dates
- **Effet**: Peut avoir ombre ou effet 3D pour se démarquer

### Design Notes
- Utiliser les couleurs de l'école si disponibles (renforce appartenance)
- Si pas de couleurs école, utiliser palette bleu/violet/vert (professionnel mais énergique)
- Fond peut être dégradé subtil ou uni avec texture légère
- **Objectif**: Créer immédiatement un sentiment d'excitation et d'opportunité

---

## 💰 ZONE 2: PROPOSITION DE VALEUR (30% hauteur)

### Titre de Section
- **Texte**: "Ce que tu gagnes en participant"
- **Taille**: 28-32pt, Bold
- **Icône**: 💰 ou 💵 (grande, 40pt, colorée)
- **Style**: Peut avoir ligne de soulignement décorative

### 4 Blocs de Bénéfices - CONCRETS ET MOTIVANTS

Chaque bloc doit être **visuellement attractif** avec:
- **Icône** (grande, 40-50pt, très colorée)
- **Titre** (16-18pt, Bold, accrocheur)
- **Description** (12-14pt, régulier, avec exemples concrets)
- **Fond**: Carte avec bordure arrondie, ombre légère, couleur accent très pâle

#### Bloc 1: Argent Comptant - LE PLUS IMPORTANT
- **Icône**: 💵 (vert/jaune vif)
- **Titre**: "Argent en poche"
- **Description**: "Gagne $[MONTANT_CASH] en argent comptant par produit vendu"
- **Exemple concret**: "Vends 10 produits = $[MONTANT_TOTAL] en poche!"
- **Style**: Carte la plus visible, peut être légèrement plus grande
- **Note**: Si montant variable, utiliser "jusqu'à $X" ou "$X-$Y par produit"

#### Bloc 2: Compte Scolaire
- **Icône**: 🎓 (bleu)
- **Titre**: "Crédit scolaire"
- **Description**: "Reçois $[MONTANT_COMPTE] crédité à ton compte scolaire"
- **Exemple concret**: "Utilise-le pour tes activités, sorties, matériel!"
- **Note**: Expliquer brièvement l'utilité si espace disponible

#### Bloc 3: Compétition Amicale
- **Icône**: 🏆 (or/jaune)
- **Titre**: "Compétition amicale"
- **Description**: "Affronte tes amis dans le classement des meilleurs vendeurs"
- **Exemple concret**: "Monte dans le classement et gagne des badges!"
- **Note**: Peut inclure mini-icône de classement ou trophée

#### Bloc 4: Aide à l'École
- **Icône**: ❤️ ou 🎯 (rouge/rose)
- **Titre**: "Aide ton école"
- **Description**: "Aide [NOM_ÉCOLE] à atteindre l'objectif de $[OBJECTIF_FINANCIER]"
- **Exemple concret**: "Chaque vente compte pour financer nos projets!"
- **Note**: Peut montrer barre de progression vide (0%) pour montrer l'objectif

### Layout
- **Disposition**: 2 colonnes x 2 lignes (carré 2x2)
- **Espacement**: 0.4" (10mm) entre les blocs
- **Bordures**: 2pt, arrondies (radius 12pt), couleur accent
- **Fond**: Fond clair (blanc ou couleur très pâle #F9FAFB) pour contraste
- **Ombre**: 3pt offset, 15% opacité pour profondeur
- **Priorité visuelle**: Bloc "Argent en poche" peut être légèrement plus grand ou avec bordure plus épaisse

---

## ⭐ ZONE 3: AVANTAGES D'ÊTRE PREMIER (25% hauteur)

### Titre de Section
- **Texte**: "⭐ Sois parmi les premiers!"
- **Taille**: 28-32pt, Bold, centré
- **Style**: Peut avoir étoiles décoratives ou effet brillant
- **Couleur**: Couleur accent vive (orange, vert, ou couleur école)

### Message Principal
- **Texte**: "Rejoins la campagne dès maintenant et deviens un leader!"
- **Taille**: 18-20pt, Semi-Bold, centré
- **Style**: Peut être en italique ou avec emphase

### 3 Avantages d'Être Premier - CRÉER FOMO

Chaque avantage dans une carte horizontale ou verticale:

#### Avantage 1: Longueur d'Avance
- **Icône**: ⭐ ou 🚀 (grande, 35pt)
- **Titre**: "Aie une longueur d'avance"
- **Description**: "Inscris-toi maintenant et commence à vendre dès le premier jour"
- **Style**: Carte avec fond dégradé subtil

#### Avantage 2: Montre l'Exemple
- **Icône**: 👑 ou 🌟 (grande, 35pt)
- **Titre**: "Montre l'exemple à tes amis"
- **Description**: "Sois un leader et inspire les autres à te suivre"
- **Style**: Carte avec bordure dorée ou couleur accent

#### Avantage 3: Accès Prioritaire
- **Icône**: 🎯 ou ⚡ (grande, 35pt)
- **Titre**: "Accède à ton compte en premier"
- **Description**: "Configure ta boutique avant tout le monde et maximise tes ventes"
- **Style**: Carte avec effet "nouveau" ou badge

### Informations Campagne

#### Date de Début
- **Texte**: "📅 La campagne commence le [DATE_DÉBUT]"
- **Style**: Badge arrondi, couleur accent, police 14-16pt
- **Position**: Sous les 3 avantages ou à côté
- **Urgence**: "Inscris-toi AVANT pour être prêt!"

#### Objectif de Campagne
- **Texte**: "🎯 Objectif: $[OBJECTIF_FINANCIER]"
- **Style**: Grand, visible, 24-28pt, Bold
- **Couleur**: Couleur accent ou couleur école
- **Note**: Peut montrer barre de progression à 0% pour visualiser l'objectif

### Layout Général Zone 3
- **Fond**: Légèrement différent de Zone 2 (couleur complémentaire très pâle ou dégradé)
- **Bordures**: Séparation subtile avec Zone 2 (ligne fine ou espace)
- **Espacement**: 0.5" (12mm) entre éléments
- **Style**: Plus énergique, plus coloré que Zone 2 pour créer excitation

---

## 📋 ZONE 4: PROCESSUS EN 3 ÉTAPES (15% hauteur)

### Titre de Section
- **Texte**: "C'est simple en 3 étapes:"
- **Taille**: 20-24pt, Bold
- **Icône**: ✨ (optionnel, 20pt)
- **Style**: Peut être plus discret que les autres titres

### Les 3 Étapes - ULTRA SIMPLES

Chaque étape doit être **extrêmement claire** et **réduire la friction perçue**:

- **Numéro**: Grand cercle avec numéro (1, 2, 3), 1" (25mm) de diamètre
- **Icône**: 30-40pt, colorée, centrée dans le cercle ou à côté
- **Titre**: 14-16pt, Bold, action claire
- **Description**: 11-12pt, régulier, **1 ligne max**, ultra-courte

#### Étape 1: Scan
- **Numéro**: 1 (cercle bleu vif)
- **Icône**: 📱 (téléphone avec QR)
- **Titre**: "Scanne le code QR"
- **Description**: "2 secondes" ou "Utilise ton téléphone"
- **Style**: Le plus visible, peut être légèrement plus grand

#### Étape 2: Inscription
- **Numéro**: 2 (cercle vert)
- **Icône**: ✏️ ou 👤 (création compte)
- **Titre**: "Crée ton compte"
- **Description**: "2 minutes" ou "C'est rapide!"
- **Style**: Emphase sur rapidité

#### Étape 3: Vente
- **Numéro**: 3 (cercle violet/orange)
- **Icône**: 📤 ou 💼 (partage/vente)
- **Titre**: "Partage et vends!"
- **Description**: "C'est parti!" ou "Commence maintenant"
- **Style**: Action finale, énergique

### Layout
- **Disposition**: 3 colonnes horizontales (côte à côte)
- **Flèches**: Flèches entre les étapes (→) pour montrer progression
- **Espacement**: 0.3" (8mm) entre étapes
- **Alignement**: Centré
- **Style**: Minimaliste mais clair, ne pas surcharger

---

## 🎯 ZONE 5: CALL-TO-ACTION PRINCIPAL (10% hauteur, bas)

### Message d'Urgence
- **Position**: Au-dessus du QR Code
- **Texte**: "Commence dès aujourd'hui!" ou "Inscris-toi MAINTENANT!"
- **Taille**: 20-22pt, Bold
- **Couleur**: Couleur accent vive (vert, orange, ou couleur école)
- **Style**: Peut être en badge arrondi avec fond coloré

### QR Code - L'ÉLÉMENT LE PLUS IMPORTANT
- **Position**: Côté droit (zone naturelle pour pouce droit sur téléphone)
- **Taille**: **MINIMUM 2.5" x 2.5" (6.5cm x 6.5cm)** - Plus grand = mieux!
- **Marge**: 0.5" (12mm) depuis les bords
- **Contraste**: Fond blanc pur, QR noir (ou inversé si fond sombre)
- **Zone tranquille**: 0.25" (6mm) de zone blanche autour du QR (critique pour scan)
- **Texte sous QR**: "Scanne-moi!" (14-16pt, Bold, centré, couleur accent)
- **Note**: Le QR code doit être le premier élément que l'œil voit dans cette zone

### Code de Campagne
- **Position**: À gauche du QR Code (même ligne ou au-dessus)
- **Titre**: "Code de campagne:" (12-14pt)
- **Code**: "[CODE_CAMPAGNE]" (28-32pt, Bold, police monospace)
- **Style**: Badge arrondi, fond coloré (couleur accent), texte blanc
- **Format**: Exemple: "ABC123-C1"
- **Note**: Backup si QR code ne fonctionne pas

### URL Alternative
- **Position**: Sous le code OU à gauche du QR
- **Texte**: "Ou va sur jappuie.ca et entre le code"
- **Taille**: 11-12pt
- **URL**: "jappuie.ca" (peut être stylisée, couleur accent)

### Layout Zone 5
- **Fond**: Couleur accent pâle (#EFF6FF pour bleu, #ECFDF5 pour vert) ou dégradé subtil
- **Bordures**: Bordure supérieure (2-3pt) pour séparation visuelle forte
- **Alignement**: Centré ou aligné à droite (pour QR code)
- **Espacement**: 0.3" (8mm) entre éléments
- **Style**: Zone la plus "appelante", doit attirer l'œil immédiatement

---

## 🎨 SYSTÈME DE COULEURS - OPTIMISÉ POUR CONVERSION

### Palette Principale (Si Pas de Couleurs École)
- **Primaire**: Bleu vif (#2563EB) - confiance, professionnel
- **Secondaire**: Violet énergique (#7C3AED) - créativité, innovation
- **Accent Succès**: Vert vif (#10B981) - action, succès, argent
- **Accent Urgence**: Orange vif (#F59E0B) - urgence, excitation
- **Neutre Texte**: Gris foncé (#111827) - lisibilité

### Palette avec Couleurs École
- **Primaire**: Couleur principale de l'école (renforce appartenance)
- **Secondaire**: Couleur secondaire de l'école
- **Accent**: Couleur complémentaire ou vert (pour CTA)
- **Neutre**: Gris pour texte

### Application Stratégique des Couleurs

**Zone 1 (En-tête):**
- Fond: Blanc ou couleur école très pâle
- Titre: Couleur école ou bleu foncé
- Badge: Couleur accent vive (vert ou orange)

**Zone 2 (Bénéfices):**
- Fond: Blanc ou gris très pâle (#F9FAFB)
- Icônes: Couleurs vives (vert pour argent, bleu pour crédit, or pour compétition)
- Bordures: Couleur accent subtile

**Zone 3 (Avantages):**
- Fond: Couleur accent très pâle (ex: #ECFDF5 pour vert)
- Titre: Couleur accent vive
- Cartes: Fond blanc avec bordure couleur accent

**Zone 4 (Processus):**
- Fond: Blanc
- Cercles: Couleurs vives différentes (bleu, vert, violet)
- Texte: Gris foncé

**Zone 5 (CTA):**
- Fond: Couleur accent pâle (#EFF6FF) ou dégradé
- QR Code: Noir sur blanc
- Code campagne: Fond couleur accent vive, texte blanc
- Message urgence: Couleur accent vive

### Règles de Contraste
- **Texte sur fond clair**: Minimum #333333 (gris foncé)
- **Texte sur fond coloré**: Blanc (#FFFFFF) si fond sombre
- **Ratio de contraste**: Minimum 4.5:1 pour accessibilité (WCAG AA)

---

## 📝 TYPOGRAPHIE - HIÉRARCHIE CLAIRE

### Hiérarchie
1. **Titre principal (Zone 1)**: 48-60pt, Bold
2. **Titres de section (Zones 2-5)**: 24-32pt, Bold
3. **Sous-titres**: 18-20pt, Semi-Bold
4. **Corps de texte**: 12-14pt, Regular
5. **Texte secondaire**: 10-12pt, Regular
6. **Code campagne**: 28-32pt, Bold, Monospace

### Polices Recommandées
- **Titres**: Montserrat Bold, Poppins Bold, Inter Bold (sans-serif, moderne, énergique)
- **Corps**: Inter, Open Sans, Roboto (lisible, claire, professionnelle)
- **Code campagne**: Courier New, Monaco (monospace, facile à lire)

### Espacement
- **Interlignage**: 1.4-1.6 pour corps de texte
- **Espacement lettres**: Normal pour lisibilité
- **Espacement mots**: Normal

---

## 🖼️ ÉLÉMENTS VISUELS

### Icônes
- **Style**: Ligne épaisse (2-3pt), moderne, cohérent, coloré
- **Bibliothèque**: Lucide, Feather, ou style personnalisé
- **Taille**: 30-50pt pour grandes icônes, 20-24pt pour petites
- **Couleur**: Couleur accent vive ou couleur école
- **Note**: Les icônes doivent être expressives et joyeuses

### Formes et Décoration
- **Formes**: Cercles, rectangles arrondis, badges
- **Ombres**: Légères à modérées (2-4pt offset, 10-20% opacité)
- **Dégradés**: Subtils pour fonds, plus prononcés pour badges et CTA
- **Bordures**: 1-3pt, arrondies (radius 8-12pt)
- **Note**: Éviter la surcharge, garder professionnel mais énergique

### Images Produits (Optionnel - Si Espace)
- **Position**: Peut être intégré dans Zone 2 ou Zone 3
- **Taille**: Maximum 1.5" x 1.5" (4cm) par produit
- **Quantité**: 2-3 produits maximum
- **Style**: Photos haute qualité, coins arrondis, ombre légère
- **Note**: Seulement si espace disponible, ne pas surcharger l'affiche

---

## ✅ CHECKLIST DE DESIGN

### Avant Finalisation
- [ ] Logo école intégré correctement (ou fallback approprié)
- [ ] QR code scannable (testé avec téléphone, minimum 2.5"x2.5")
- [ ] Tous les textes lisibles (taille minimum 10pt)
- [ ] Contraste suffisant partout (ratio 4.5:1 minimum)
- [ ] Marges d'impression respectées (0.25" / 6mm)
- [ ] Espacement cohérent entre éléments
- [ ] Couleurs cohérentes avec branding école (si disponible)
- [ ] Résolution 300 DPI vérifiée
- [ ] Format CMYK pour impression
- [ ] Pas de texte trop près des bords
- [ ] Zone tranquille autour QR code (0.25" / 6mm)
- [ ] Message d'urgence clair et visible
- [ ] Processus 3 étapes ultra-simple
- [ ] Bénéfices concrets et motivants

### Test d'Impression
- [ ] Test impression noir & blanc (lisibilité)
- [ ] Test impression couleur
- [ ] Test sur papier standard (80-100g)
- [ ] Vérification coupe après impression
- [ ] Test scan QR code depuis impression (critique!)
- [ ] Test à distance (3-5 pieds) - est-ce que le QR code est visible?

---

## 🎯 PRINCIPES DE CONVERSION - OPTIMISÉS POUR LANCEMENT

### 1. Clarté Immédiate (3 Secondes)
- L'étudiant doit comprendre en 3 secondes:
  - "C'est une campagne de financement"
  - "Je peux gagner de l'argent"
  - "C'est simple (3 étapes)"
  - "Je dois scanner le QR code"

### 2. Réduction de Friction Maximale
- **3 étapes seulement** (pas 10)
- **QR code = action immédiate** (pas besoin de chercher)
- **Code campagne en backup** (si QR ne fonctionne pas)
- **Processus perçu comme rapide** ("2 minutes", "2 secondes")

### 3. Motivation Multi-Facettes
- **Bénéfices financiers clairs** (argent comptant + crédit)
- **Compétition amicale** (classement, badges)
- **Aide à l'école** (sentiment d'appartenance)
- **Avantages d'être premier** (FOMO, leadership)

### 4. Confiance et Légitimité
- **Logo école = officiel** (pas une arnaque)
- **Design professionnel** (inspire confiance)
- **Informations claires** (dates, objectif, code)
- **Plateforme reconnue** (jappuie.ca)

### 5. Urgence et Action Immédiate
- **"Commence dès aujourd'hui!"** (pas "peut-être plus tard")
- **Date de début visible** (créer anticipation)
- **"Sois parmi les premiers"** (FOMO)
- **QR code proéminent** (action évidente)

### 6. Exemples Concrets
- **"Vends 10 produits = $X en poche"** (pas abstrait)
- **Montants précis** (pas "beaucoup d'argent")
- **Objectif clair** (pas vague)

---

## 📦 LIVRABLES ATTENDUS

### Formats de Fichier
1. **Fichier Source**: 
   - Adobe Illustrator (.ai) OU
   - Figma (.fig) OU
   - Adobe InDesign (.indd)
   - Avec calques organisés et texte éditable

2. **Fichiers de Production**:
   - PDF haute résolution (300 DPI, CMYK)
   - PNG haute résolution (300 DPI, RGB) pour prévisualisation
   - JPG haute résolution (300 DPI) comme backup

3. **Fichiers Web** (optionnel):
   - PNG 150 DPI pour affichage écran
   - Version optimisée pour partage digital

### Organisation des Fichiers
```
affiche-lancement-campagne/
├── source/
│   ├── affiche-lancement.ai (ou .fig)
│   └── assets/
│       ├── logo-placeholder.png
│       └── icones/
├── production/
│   ├── affiche-lancement.pdf
│   ├── affiche-lancement.png
│   └── affiche-lancement.jpg
└── web/
    └── affiche-lancement-web.png
```

### Notes Techniques
- **Calques nommés**: Tous les calques doivent avoir des noms clairs
- **Textes éditable**: Tous les textes doivent être éditable (pas rasterisés)
- **Variables/Placeholders**: Utiliser variables pour données dynamiques:
  - `[NOM_ÉCOLE]`
  - `[NUMÉRO_CAMPAGNE]`
  - `[DATE_DÉBUT]`
  - `[DATE_FIN]`
  - `[CODE_CAMPAGNE]`
  - `[OBJECTIF_FINANCIER]`
  - `[MONTANT_CASH]`
  - `[MONTANT_COMPTE]`
- **Grille**: Inclure grille de mise en page pour référence
- **Guides**: Guides pour zones de contenu et marges

---

## 🎨 EXEMPLE DE MOCKUP TEXTUEL

```
┌─────────────────────────────────────────────────────┐
│ [LOGO ÉCOLE]    Rejoins la campagne de             │
│                 financement de                      │
│                 ÉCOLE PRIMAIRE SAINT-JEAN           │
│                                    [Badge: #1]     │
│                                    Début: 15 jan   │
│                                    Inscris-toi     │
│                                    MAINTENANT!     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  💰 CE QUE TU GAGNES EN PARTICIPANT                │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ 💵           │  │ 🎓           │             │
│  │ Argent       │  │ Crédit       │             │
│  │ en poche     │  │ scolaire     │             │
│  │              │  │              │             │
│  │ Gagne $2.50  │  │ Reçois $1.50 │             │
│  │ par produit  │  │ crédité      │             │
│  │              │  │              │             │
│  │ Vends 10 =   │  │ Utilise-le   │             │
│  │ $25 en poche!│  │ pour tes     │             │
│  └──────────────┘  │ activités!   │             │
│                    └──────────────┘             │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ 🏆           │  │ ❤️           │             │
│  │ Compétition  │  │ Aide ton     │             │
│  │ amicale      │  │ école        │             │
│  │              │  │              │             │
│  │ Affronte tes │  │ Aide l'école │             │
│  │ amis!        │  │ à atteindre  │             │
│  │              │  │ $5,000       │             │
│  └──────────────┘  └──────────────┘             │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⭐ SOIS PARMI LES PREMIERS!                       │
│                                                     │
│  Rejoins la campagne dès maintenant et deviens      │
│  un leader!                                        │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ ⭐       │  │ 👑       │  │ 🎯       │        │
│  │ Aie une  │  │ Montre   │  │ Accède   │        │
│  │ longueur │  │ l'exemple│  │ en       │        │
│  │ d'avance │  │          │  │ premier  │        │
│  └──────────┘  └──────────┘  └──────────┘        │
│                                                     │
│  📅 La campagne commence le 15 janvier 2025       │
│  🎯 Objectif: $5,000                               │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  C'EST SIMPLE EN 3 ÉTAPES:                         │
│                                                     │
│  [1] 📱  →  [2] ✏️  →  [3] 📤                      │
│  Scanne    Crée ton   Partage et                  │
│  le code   compte     vends!                      │
│  QR        (2 min)                                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  COMMENCE DÈS AUJOURD'HUI!                  │  │
│  │                                               │  │
│  │  Code: ABC123-C1                             │  │
│  │  Ou va sur jappuie.ca                        │  │
│  │                                               │  │
│  │         ┌─────────┐                          │  │
│  │         │  QR     │                          │  │
│  │         │  CODE   │                          │  │
│  │         │  (2.5") │                          │  │
│  │         └─────────┘                          │  │
│  │         Scanne-moi!                          │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## ✅ VALIDATION FINALE

L'affiche est réussie si:
1. ✅ Un étudiant comprend le message en 3 secondes
2. ✅ Le QR code est évident et facile à scanner (testé!)
3. ✅ Les bénéfices sont clairs et motivants
4. ✅ Le design est professionnel et inspire confiance
5. ✅ Le processus semble simple (3 étapes)
6. ✅ Le logo école est bien intégré (ou fallback approprié)
7. ✅ L'impression est de qualité professionnelle
8. ✅ Le design crée un sentiment d'urgence et d'opportunité
9. ✅ L'affiche maximise les inscriptions au lancement

---

## 🎯 MÉTRIQUES DE SUCCÈS

L'affiche doit maximiser:
- **Taux de scan QR code** (objectif: >60% des étudiants qui voient l'affiche)
- **Taux d'inscription** (objectif: >40% des scans)
- **Temps entre scan et inscription** (objectif: <5 minutes)
- **Nombre total de participants** au lancement (objectif: >30% des étudiants de l'école)

---

**Date de livraison souhaitée**: [À définir]  
**Révisions incluses**: [À définir]  
**Contact**: [À définir]

---

*Ce brief est optimisé spécifiquement pour le lancement d'une nouvelle campagne. L'objectif est de convertir le maximum d'étudiants en participants actifs dès le début de la campagne.*
