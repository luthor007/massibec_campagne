# Brief de Design - Affiche de Campagne pour Écoles

## 🎯 Objectif
Créer une affiche imprimable (format 8.5" x 11" / A4) qui maximise le taux de conversion des étudiants qui reçoivent l'affiche vers leur première vente. L'affiche doit être généralisable pour toutes les écoles clientes.

---

## 📐 Spécifications Techniques

### Dimensions
- **Format principal**: 8.5" x 11" (US Letter) ou A4 (210mm x 297mm)
- **Résolution**: 300 DPI minimum pour impression
- **Modes de couleur**: CMYK pour impression, RGB pour prévisualisation
- **Marges d'impression**: 0.25" (6mm) de marge de sécurité de tous les côtés

### Zones de Contenu
L'affiche est divisée en 5 zones principales avec des proportions flexibles :

```
┌─────────────────────────────────────────┐
│  ZONE 1: EN-TÊTE (20% hauteur)         │
│  - Logo école + Titre principal         │
├─────────────────────────────────────────┤
│  ZONE 2: GAUCHE (30% hauteur)          │
│  - Proposition de valeur                │
│  - Bénéfices étudiants                  │
├──────────────┬──────────────────────────┤
│  ZONE 3:     │  ZONE 4:                 │
│  GAUCHE      │  DROITE                  │
│  (20%)       │  (30%)                   │
│  - 3 étapes  │  - Preuve sociale        │
│              │  - Urgence               │
├──────────────┴──────────────────────────┤
│  ZONE 5: PIED DE PAGE (20% hauteur)     │
│  - QR Code + Code campagne              │
│  - Call-to-action principal             │
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
- **Fallback**: Si pas de logo, utiliser le nom de l'école en grand texte stylisé

#### Titre Principal
- **Texte**: "Rejoins la campagne de financement de [NOM_ÉCOLE]"
- **Taille de police**: 48-60pt (selon longueur du nom)
- **Police**: Bold, moderne, lisible (ex: Montserrat Bold, Poppins Bold)
- **Couleur**: Contraste élevé avec le fond (noir ou couleur école)
- **Alignement**: Centré ou aligné à gauche selon position du logo

#### Badge Campagne
- **Position**: En haut à droite OU sous le titre
- **Contenu**: 
  - "Campagne #[NUMÉRO_CAMPAGNE]"
  - Dates: "[DATE_DÉBUT] - [DATE_FIN]"
- **Style**: Badge arrondi avec bordure, couleur accent
- **Taille**: Police 14-16pt pour le numéro, 10-12pt pour les dates

### Design Notes
- Utiliser les couleurs de l'école si disponibles
- Si pas de couleurs école, utiliser palette bleu/violet (professionnel, énergique)
- Fond peut être dégradé subtil ou uni

---

## 💰 ZONE 2: PROPOSITION DE VALEUR (30% hauteur, côté gauche)

### Titre de Section
- **Texte**: "Ce que tu gagnes"
- **Taille**: 28-32pt, Bold
- **Icône**: 💰 ou 💵 (grande, colorée)

### 4 Blocs de Bénéfices

Chaque bloc doit avoir:
- **Icône** (grande, 40-50pt, colorée)
- **Titre** (14-16pt, Bold)
- **Description** (12-14pt, régulier)

#### Bloc 1: Argent Comptant
- **Icône**: 💵 (vert/jaune)
- **Titre**: "Argent en poche"
- **Description**: "Gagne $[MONTANT_CASH] en argent comptant par produit vendu"
- **Note**: Si montant variable, utiliser "jusqu'à $X" ou "$X-$Y"

#### Bloc 2: Compte Scolaire
- **Icône**: 🎓 (bleu)
- **Titre**: "Crédit scolaire"
- **Description**: "Reçois $[MONTANT_COMPTE] crédité à ton compte scolaire"
- **Note**: Expliquer brièvement l'utilité si espace disponible

#### Bloc 3: Compétition
- **Icône**: 🏆 (or/jaune)
- **Titre**: "Compétition amicale"
- **Description**: "Affronte tes amis dans le classement des meilleurs vendeurs"
- **Note**: Peut inclure mini-icône de classement

#### Bloc 4: Aide à l'École
- **Icône**: ❤️ ou 🎯 (rouge/rose)
- **Titre**: "Aide ton école"
- **Description**: "Aide [NOM_ÉCOLE] à atteindre l'objectif de $[OBJECTIF_FINANCIER]"
- **Note**: Peut montrer barre de progression si campagne active

### Layout
- **Disposition**: 2 colonnes x 2 lignes OU 4 colonnes (selon espace)
- **Espacement**: 0.5" (12mm) entre les blocs
- **Bordures**: Légères, arrondies, couleur accent subtile
- **Fond**: Fond clair (blanc ou couleur très pâle) pour contraste

---

## 📊 ZONE 3: PREUVE SOCIALE & URGENCE (30% hauteur, côté droit)

### Cas 1: Campagne avec Participants (Données Disponibles)

#### Section "Déjà X étudiants participent!"
- **Titre**: 24-28pt, Bold
- **Nombre**: 36-48pt, couleur accent, très visible
- **Icône**: 👥 (grande)

#### Mini-Classement (Top 3)
- **Titre**: "Top vendeurs" (16-18pt)
- **Affichage**: 3 lignes avec:
  - Position: 🥇 🥈 🥉 (ou 1, 2, 3)
  - Nom: (prénom seulement ou initiales si confidentialité)
  - Badge: "X produits vendus" ou "$X gagnés"
- **Style**: Cartes légères avec ombre subtile
- **Note**: Si moins de 3 participants, afficher ceux disponibles

#### Barre de Progression
- **Titre**: "Objectif de la campagne"
- **Valeur actuelle**: "$[MONTANT_ACTUEL] / $[OBJECTIF]"
- **Pourcentage**: "[X]% atteint"
- **Barre visuelle**: Barre de progression colorée, 0.3" (8mm) de hauteur
- **Couleur**: Vert si >50%, orange si 25-50%, rouge si <25%

#### Compte à Rebours
- **Texte**: "Il reste [X] jours pour participer!"
- **Taille**: 18-20pt, Bold
- **Couleur**: Rouge/orange si <7 jours, bleu sinon
- **Icône**: ⏰

### Cas 2: Campagne Sans Participants (Aucune Donnée)

#### Section Alternative: "Sois parmi les premiers!"
- **Titre**: 28-32pt, Bold, centré
- **Sous-titre**: "Rejoins la campagne dès maintenant et deviens un leader!"
- **Icône**: ⭐ ou 🚀 (grande, centrée)

#### Avantages d'Être Premier
- **Bloc 1**: "Aie une longueur d'avance"
- **Bloc 2**: "Montre l'exemple à tes amis"
- **Bloc 3**: "Accède à ton compte en premier"
- **Style**: 3 cartes horizontales ou verticales, icônes colorées

#### Date de Début
- **Texte**: "La campagne commence le [DATE_DÉBUT]"
- **Style**: Badge arrondi, couleur accent
- **Icône**: 📅

#### Objectif de Campagne
- **Texte**: "Objectif: $[OBJECTIF_FINANCIER]"
- **Style**: Grand, visible, couleur accent

### Layout Général Zone 3
- **Fond**: Légèrement différent de Zone 2 (couleur complémentaire pâle)
- **Bordures**: Séparation subtile avec Zone 2
- **Espacement**: 0.5" (12mm) entre éléments

---

## 📋 ZONE 4: PROCESSUS EN 3 ÉTAPES (20% hauteur, côté gauche bas)

### Titre de Section
- **Texte**: "C'est simple en 3 étapes:"
- **Taille**: 20-24pt, Bold
- **Icône**: ✨ (optionnel)

### Les 3 Étapes

Chaque étape doit avoir:
- **Numéro**: Grand cercle avec numéro (1, 2, 3), 1" (25mm) de diamètre
- **Icône**: 30-40pt, colorée, centrée dans le cercle ou à côté
- **Titre**: 14-16pt, Bold
- **Description**: 11-12pt, régulier, 1-2 lignes max

#### Étape 1: Scan
- **Numéro**: 1 (cercle bleu)
- **Icône**: 📱 (téléphone avec QR)
- **Titre**: "Scanne le code QR"
- **Description**: "Utilise l'appareil photo de ton téléphone"

#### Étape 2: Inscription
- **Numéro**: 2 (cercle vert)
- **Icône**: ✏️ ou 👤 (création compte)
- **Titre**: "Crée ton compte"
- **Description**: "2 minutes, c'est tout!"

#### Étape 3: Vente
- **Numéro**: 3 (cercle violet/orange)
- **Icône**: 📤 ou 💼 (partage/vente)
- **Titre**: "Partage et vends!"
- **Description**: "Partage ton lien unique avec famille et amis"

### Layout
- **Disposition**: 3 colonnes horizontales OU verticales (selon espace)
- **Flèches**: Flèches entre les étapes (→) si horizontal
- **Espacement**: 0.4" (10mm) entre étapes
- **Alignement**: Centré ou aligné à gauche

---

## 🎯 ZONE 5: CALL-TO-ACTION PRINCIPAL (20% hauteur, bas)

### QR Code
- **Position**: Côté droit (zone naturelle pour pouce droit)
- **Taille**: Minimum 2" x 2" (5cm x 5cm), idéalement 2.5" x 2.5" (6.5cm)
- **Marge**: 0.5" (12mm) depuis les bords
- **Contraste**: Fond blanc, QR noir (ou inversé selon fond)
- **Zone tranquille**: 0.2" (5mm) de zone blanche autour du QR
- **Texte sous QR**: "Scanne-moi!" (12-14pt, Bold, centré)

### Code de Campagne
- **Position**: À gauche du QR Code OU au-dessus
- **Titre**: "Code de campagne:" (12-14pt)
- **Code**: "[CODE_CAMPAGNE]" (24-28pt, Bold, police monospace)
- **Style**: Badge arrondi, fond coloré, texte blanc ou noir selon contraste
- **Format**: Exemple: "ABC123-C1"

### URL Alternative
- **Position**: Sous le code OU à gauche du QR
- **Texte**: "Ou va sur jappuie.ca et entre le code"
- **Taille**: 10-12pt
- **URL**: "jappuie.ca" (peut être stylisée)

### Message d'Urgence
- **Position**: Au-dessus du QR Code OU en haut de la zone
- **Texte**: "Commence dès aujourd'hui!" ou "Rejoins maintenant!"
- **Taille**: 18-20pt, Bold
- **Couleur**: Couleur accent (vert, bleu, ou couleur école)
- **Style**: Peut être en badge arrondi

### Layout Zone 5
- **Fond**: Couleur accent pâle ou dégradé subtil pour attirer l'œil
- **Bordures**: Peut avoir bordure supérieure pour séparation
- **Alignement**: Centré ou aligné à droite (pour QR code)

---

## 🎨 SYSTÈME DE COULEURS

### Palette Principale (Si Pas de Couleurs École)
- **Primaire**: Bleu (#2563EB ou similaire) - confiance, professionnel
- **Secondaire**: Violet (#7C3AED) - créativité, énergie
- **Accent**: Vert (#10B981) - succès, action
- **Warning**: Orange (#F59E0B) - urgence, attention
- **Neutre**: Gris (#6B7280) - texte secondaire

### Palette avec Couleurs École
- **Primaire**: Couleur principale de l'école
- **Secondaire**: Couleur secondaire de l'école
- **Accent**: Couleur complémentaire ou vert
- **Neutre**: Gris pour texte

### Règles de Contraste
- **Texte sur fond clair**: Minimum #333333 (gris foncé)
- **Texte sur fond coloré**: Blanc (#FFFFFF) si fond sombre
- **Ratio de contraste**: Minimum 4.5:1 pour accessibilité

---

## 📝 TYPOGRAPHIE

### Hiérarchie
1. **Titre principal**: 48-60pt, Bold
2. **Titres de section**: 24-32pt, Bold
3. **Sous-titres**: 18-20pt, Semi-Bold
4. **Corps de texte**: 12-14pt, Regular
5. **Texte secondaire**: 10-12pt, Regular

### Polices Recommandées
- **Titres**: Montserrat, Poppins, Inter (sans-serif, moderne)
- **Corps**: Inter, Open Sans, Roboto (lisible, claire)
- **Code campagne**: Courier New, Monaco (monospace)

### Espacement
- **Interlignage**: 1.4-1.6 pour corps de texte
- **Espacement lettres**: Normal pour lisibilité
- **Espacement mots**: Normal

---

## 🖼️ ÉLÉMENTS VISUELS

### Icônes
- **Style**: Ligne épaisse (2-3pt), moderne, cohérent
- **Bibliothèque**: Lucide, Feather, ou style personnalisé
- **Taille**: 30-50pt pour grandes icônes, 20-24pt pour petites
- **Couleur**: Couleur accent ou couleur école

### Images Produits (Optionnel)
- **Position**: Peut être intégré dans Zone 2 ou Zone 3
- **Taille**: Maximum 1.5" x 1.5" (4cm) par produit
- **Quantité**: 2-3 produits maximum
- **Style**: Photos haute qualité, coins arrondis, ombre légère
- **Note**: Seulement si espace disponible, ne pas surcharger

### Formes et Décoration
- **Formes**: Cercles, rectangles arrondis, badges
- **Ombres**: Légères (2-4pt offset, 10-20% opacité)
- **Dégradés**: Subtils pour fonds, plus prononcés pour badges
- **Bordures**: 1-2pt, arrondies (radius 4-8pt)

---

## 📱 ADAPTATIONS POUR DIFFÉRENTS CAS

### Cas A: Campagne Avant Début (Pas de Participants)
- Zone 3: Utiliser version "Sois parmi les premiers!"
- Zone 2: Montrer bénéfices potentiels
- Zone 5: Message "Inscris-toi maintenant pour être prêt!"

### Cas B: Campagne Active (Avec Participants)
- Zone 3: Afficher classement, progression, compte à rebours
- Zone 2: Bénéfices réels si disponibles
- Zone 5: Message d'urgence "Rejoins maintenant!"

### Cas C: Campagne Sans Logo École
- Zone 1: Nom de l'école en grand texte stylisé
- Utiliser icône école générique ou emoji 🏫
- Adapter couleurs pour rester professionnel

### Cas D: Campagne avec Beaucoup de Texte (Nom École Long)
- Réduire taille titre principal si nécessaire
- Utiliser abréviation si approprié
- Adapter espacement

---

## ✅ CHECKLIST DE DESIGN

### Avant Finalisation
- [ ] Logo école intégré correctement (ou fallback)
- [ ] QR code scannable (testé avec téléphone)
- [ ] Tous les textes lisibles (taille minimum 10pt)
- [ ] Contraste suffisant partout
- [ ] Marges d'impression respectées
- [ ] Espacement cohérent entre éléments
- [ ] Couleurs cohérentes avec branding école
- [ ] Version avec et sans participants testée
- [ ] Version avec et sans logo testée
- [ ] Résolution 300 DPI vérifiée
- [ ] Format CMYK pour impression
- [ ] Pas de texte trop près des bords
- [ ] QR code assez grand (minimum 2"x2")

### Test d'Impression
- [ ] Test impression noir & blanc (lisibilité)
- [ ] Test impression couleur
- [ ] Test sur papier standard (80-100g)
- [ ] Vérification coupe après impression
- [ ] Test scan QR code depuis impression

---

## 🎯 PRINCIPES DE CONVERSION

### 1. Clarté Immédiate
- L'étudiant doit comprendre en 3 secondes ce que c'est
- Titre principal doit être accrocheur
- QR code doit être évident

### 2. Réduction de Friction
- 3 étapes simples (pas 10)
- QR code = action immédiate
- Code campagne en backup

### 3. Motivation
- Bénéfices clairs (argent, compétition)
- Preuve sociale (autres étudiants)
- Urgence (dates, compte à rebours)

### 4. Confiance
- Logo école = officiel
- Design professionnel
- Informations claires

### 5. Action Claire
- QR code = call-to-action principal
- Message d'urgence
- Pas de confusion sur "que faire"

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
affiche-campagne/
├── source/
│   ├── affiche-campagne.ai (ou .fig)
│   └── assets/
│       ├── logo-placeholder.png
│       └── icones/
├── production/
│   ├── affiche-campagne.pdf
│   ├── affiche-campagne.png
│   └── affiche-campagne.jpg
└── web/
    └── affiche-campagne-web.png
```

### Notes Techniques
- **Calques nommés**: Tous les calques doivent avoir des noms clairs
- **Textes éditable**: Tous les textes doivent être éditable (pas rasterisés)
- **Variables**: Utiliser variables/placeholders pour données dynamiques
- **Grille**: Inclure grille de mise en page pour référence
- **Guides**: Guides pour zones de contenu et marges

---

## 🔄 VERSIONS À CRÉER

### Version 1: Template de Base
- Avec placeholders pour toutes les données dynamiques
- Logo placeholder
- Exemple de données fictives

### Version 2: Version avec Données
- Remplir avec données d'exemple réalistes
- Montrer comment ça ressemble avec vraies données

### Version 3: Variations
- Version avec participants
- Version sans participants
- Version avec logo
- Version sans logo
- Version nom école court
- Version nom école long

---

## 💡 INSPIRATIONS & RÉFÉRENCES

### Styles à Éviter
- ❌ Trop chargé (trop d'informations)
- ❌ Trop minimaliste (manque d'information)
- ❌ Couleurs criardes (non professionnel)
- ❌ Texte trop petit
- ❌ QR code trop petit

### Styles à Privilégier
- ✅ Équilibré (information + espace blanc)
- ✅ Moderne mais professionnel
- ✅ Couleurs vives mais harmonieuses
- ✅ Hiérarchie visuelle claire
- ✅ Mobile-first (QR code prioritaire)

### Références Visuelles
- Affiches événements étudiants (énergie, jeunesse)
- Affiches marketing produits (clarté, CTA)
- Design système Material Design ou Apple HIG (moderne)
- Affiches de campagnes de financement (confiance, transparence)

---

## 📞 QUESTIONS POUR LE DESIGNER

1. Quelle est votre préférence de logiciel (Illustrator, Figma, InDesign)?
2. Avez-vous accès aux logos des écoles ou devons-nous créer un système de placeholder?
3. Préférez-vous un style plus conservateur ou plus audacieux?
4. Y a-t-il des contraintes d'impression spécifiques à considérer?
5. Souhaitez-vous des animations pour la version digitale (optionnel)?

---

## 🎨 EXEMPLE DE MOCKUP TEXTUEL

```
┌─────────────────────────────────────────────────────┐
│ [LOGO ÉCOLE]    Rejoins la campagne de              │
│                 financement de                      │
│                 ÉCOLE PRIMAIRE SAINT-JEAN           │
│                                    [Badge: Campagne #1]
│                                    [15 jan - 28 fév]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  💰 CE QUE TU GAGNES          👥 DÉJÀ 45 ÉTUDIANTS  │
│                                                     │
│  💵 Argent en poche          🥇 Marie - 23 produits│
│     Gagne $2.50 en           🥈 Jean - 18 produits │
│     argent comptant           🥉 Sophie - 15 produits│
│                              │
│  🎓 Crédit scolaire          📊 Objectif: $5000    │
│     Reçois $1.50 crédité      ████████░░ 68%        │
│     à ton compte             │
│                              ⏰ Il reste 12 jours!  │
│  🏆 Compétition amicale                              │
│     Affronte tes amis                               │
│                                                     │
│  ❤️ Aide ton école                                  │
│     Aide l'école à atteindre                       │
│     l'objectif de $5000                            │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  C'EST SIMPLE EN 3 ÉTAPES:                         │
│                                                     │
│  [1] 📱        [2] ✏️        [3] 📤                │
│  Scanne le    Crée ton      Partage et            │
│  code QR      compte        vends!                 │
│  (2 min)                                           │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  COMMENCE DÈS AUJOURD'HUI!                   │  │
│  │                                               │  │
│  │  Code: ABC123-C1                             │  │
│  │  Ou va sur jappuie.ca                        │  │
│  │                                               │  │
│  │         ┌─────────┐                          │  │
│  │         │  QR     │                          │  │
│  │         │  CODE   │                          │  │
│  │         │  (2.5") │                          │  │
│  │         └─────────┘                          │  │
│  │         Scanne-moi!                           │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## ✅ VALIDATION FINALE

L'affiche est réussie si:
1. ✅ Un étudiant comprend le message en 3 secondes
2. ✅ Le QR code est évident et facile à scanner
3. ✅ Les bénéfices sont clairs et motivants
4. ✅ Le design est professionnel et inspire confiance
5. ✅ L'affiche fonctionne avec ou sans données de participants
6. ✅ Le logo école est bien intégré (ou fallback approprié)
7. ✅ L'impression est de qualité professionnelle
8. ✅ Le design est généralisable pour toutes les écoles

---

**Date de livraison souhaitée**: [À définir]  
**Révisions incluses**: [À définir]  
**Contact**: [À définir]

---

*Ce brief est un document vivant et peut être ajusté selon les retours et contraintes techniques découvertes pendant le design.*
