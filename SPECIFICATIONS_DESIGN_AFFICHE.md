# Spécifications Détaillées - Affiche Campagne

## 📐 DIMENSIONS PRÉCISES PAR ZONE

### Zone 1: En-tête (20% = 2.2" / 59.4mm sur A4)

```
┌─────────────────────────────────────────────┐
│ Marge: 0.25" (6mm)                         │
│                                             │
│ [LOGO] 0.5" (12mm) depuis haut/gauche      │
│ Max: 2" (50mm) hauteur                     │
│                                             │
│ TITRE PRINCIPAL                             │
│ Taille: 48-60pt                            │
│ Marge bas: 0.3" (8mm)                      │
│                                             │
│ [Badge Campagne]                           │
│ Position: Haut droite                      │
│ Taille: 1.5" x 0.8" (38mm x 20mm)         │
└─────────────────────────────────────────────┘
```

**Spécifications Logo:**
- Format accepté: PNG transparent, SVG, JPG fond blanc
- Ratio: Maintenir proportions originales
- Position alternative si pas de logo: Centrer nom école en grand

---

### Zone 2: Bénéfices (30% = 3.3" / 89.1mm hauteur, côté gauche)

```
┌─────────────────────┬──────────────────────┐
│ ZONE 2              │ ZONE 3               │
│ (Largeur: 4.25")    │ (Largeur: 4.25")     │
│                     │                      │
│ 💰 CE QUE TU GAGNES │ 👥 PREUVE SOCIALE    │
│                     │                      │
│ ┌─────────────┐    │ ┌─────────────────┐ │
│ │ 💵 Argent   │    │ │ 45 étudiants    │ │
│ │ $2.50       │    │ │ participent!    │ │
│ └─────────────┘    │ └─────────────────┘ │
│                     │                      │
│ ┌─────────────┐    │ 🥇 Marie - 23 prod  │
│ │ 🎓 Crédit   │    │ 🥈 Jean - 18 prod   │
│ │ $1.50       │    │ 🥉 Sophie - 15 prod │
│ └─────────────┘    │                      │
│                     │ ┌─────────────────┐ │
│ ┌─────────────┐    │ │ Objectif $5000  │ │
│ │ 🏆 Compét.  │    │ │ ████████░░ 68%  │ │
│ │ Amicale     │    │ └─────────────────┘ │
│ └─────────────┘    │                      │
│                     │ ⏰ 12 jours restants │
│ ┌─────────────┐    │                      │
│ │ ❤️ Aide     │    │                      │
│ │ École       │    │                      │
│ └─────────────┘    │                      │
└─────────────────────┴──────────────────────┘
```

**Spécifications Blocs Bénéfices:**
- Taille chaque bloc: 1.8" x 1.2" (46mm x 30mm)
- Espacement vertical: 0.3" (8mm)
- Espacement horizontal: 0.3" (8mm)
- Bordure: 1pt, radius 8pt
- Fond: Blanc ou couleur très pâle (#F9FAFB)
- Ombre: 2pt offset, 10% opacité

**Icônes:**
- Taille: 40pt (14mm)
- Couleur: Selon type (vert pour argent, bleu pour crédit, etc.)
- Position: Centré en haut du bloc

---

### Zone 3: Preuve Sociale (30% hauteur, côté droit)

#### Version AVEC Participants:

```
┌─────────────────────────────────────┐
│ 👥 DÉJÀ 45 ÉTUDIANTS PARTICIPENT!   │
│     (Taille: 28pt, Bold)            │
│     Nombre: 36pt, couleur accent    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ TOP VENDEURS                    │ │
│ │                                 │ │
│ │ 🥇 Marie D.                     │ │
│ │    23 produits vendus           │ │
│ │                                 │ │
│ │ 🥈 Jean P.                      │ │
│ │    18 produits vendus           │ │
│ │                                 │ │
│ │ 🥉 Sophie L.                    │ │
│ │    15 produits vendus           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ OBJECTIF DE LA CAMPAGNE         │ │
│ │ $3,400 / $5,000                │ │
│ │ ████████████░░░░░░ 68%         │ │
│ │ (Barre: 0.3" hauteur, 3.5" lg)│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ⏰ Il reste 12 jours!                │
│    (18pt, Bold, couleur urgence)   │
└─────────────────────────────────────┘
```

#### Version SANS Participants:

```
┌─────────────────────────────────────┐
│ ⭐ SOIS PARMI LES PREMIERS!         │
│     (Taille: 32pt, Bold, centré)   │
│                                     │
│ Rejoins la campagne dès maintenant  │
│ et deviens un leader!               │
│     (18pt, centré)                 │
│                                     │
│ ┌─────────┐ ┌─────────┐ ┌────────┐│
│ │ ⭐      │ │ 🚀      │ │ 🎯     ││
│ │ Aie une │ │ Montre  │ │ Accède ││
│ │ longueur│ │ l'exemple│ │ en     ││
│ │ d'avance│ │         │ │ premier││
│ └─────────┘ └─────────┘ └────────┘│
│                                     │
│ 📅 La campagne commence le         │
│    15 janvier 2025                 │
│    (Badge arrondi, couleur accent) │
│                                     │
│ 🎯 OBJECTIF: $5,000                 │
│    (Grand, visible, 24pt)           │
└─────────────────────────────────────┘
```

**Spécifications Classement:**
- Carte par étudiant: 3.5" x 0.8" (89mm x 20mm)
- Espacement: 0.2" (5mm) entre cartes
- Fond: Blanc avec bordure subtile
- Médaille: 20pt, position gauche

**Spécifications Barre Progression:**
- Hauteur: 0.3" (8mm)
- Longueur: 3.5" (89mm)
- Radius: 4pt (coins arrondis)
- Fond: Gris clair (#E5E7EB)
- Remplissage: Couleur selon pourcentage
- Texte: 12pt, centré sur barre

---

### Zone 4: Processus 3 Étapes (20% = 2.2" / 59.4mm hauteur, gauche bas)

```
┌─────────────────────────────────────────────┐
│ C'EST SIMPLE EN 3 ÉTAPES:                  │
│ (Taille: 20pt, Bold)                       │
│                                             │
│  ┌──────┐    ┌──────┐    ┌──────┐         │
│  │  [1] │    │  [2] │    │  [3] │         │
│  │  📱  │ →  │  ✏️  │ →  │  📤  │         │
│  └──────┘    └──────┘    └──────┘         │
│                                             │
│  Scanne le   Crée ton    Partage et       │
│  code QR     compte      vends!           │
│  (2 min)                                  │
│                                             │
└─────────────────────────────────────────────┘
```

**Spécifications Cercles Numérotés:**
- Diamètre: 1" (25mm)
- Bordure: 3pt
- Numéro: 24pt, Bold, centré
- Icône: 30pt, centré sous numéro ou à côté
- Couleurs: Bleu (1), Vert (2), Violet/Orange (3)

**Flèches:**
- Taille: 0.5" (12mm) longueur
- Épaisseur: 2pt
- Espacement: 0.3" (8mm) entre cercles

---

### Zone 5: Call-to-Action (20% = 2.2" / 59.4mm hauteur, bas)

```
┌─────────────────────────────────────────────┐
│                                             │
│  COMMENCE DÈS AUJOURD'HUI!                 │
│  (Taille: 20pt, Bold, couleur accent)      │
│                                             │
│  ┌──────────────────┐  ┌───────────────┐  │
│  │                  │  │               │  │
│  │                  │  │   ┌───────┐   │  │
│  │  Code:           │  │   │       │   │  │
│  │  ABC123-C1       │  │   │  QR   │   │  │
│  │                  │  │   │ CODE  │   │  │
│  │  Ou va sur       │  │   │ 2.5"  │   │  │
│  │  jappuie.ca      │  │   │ x 2.5"│   │  │
│  │                  │  │   └───────┘   │  │
│  │                  │  │  Scanne-moi!  │  │
│  └──────────────────┘  └───────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

**Spécifications QR Code:**
- Taille: 2.5" x 2.5" (63.5mm x 63.5mm) - MINIMUM 2" x 2"
- Zone tranquille: 0.2" (5mm) blanc autour
- Contraste: Noir sur blanc (ou inversé si fond sombre)
- Correction d'erreur: Niveau M (15%) minimum
- Marge depuis bord: 0.5" (12mm)

**Spécifications Code Campagne:**
- Police: Monospace, 24pt, Bold
- Format: "[CODE]-C[NUMÉRO]" (ex: "ABC123-C1")
- Badge: Fond coloré, texte blanc, radius 6pt
- Padding: 0.3" (8mm) interne

---

## 🎨 COULEURS DÉTAILLÉES

### Palette Standard (Sans Couleurs École)

```css
/* Primaire - Confiance, Professionnel */
--blue-600: #2563EB
--blue-700: #1D4ED8
--blue-50: #EFF6FF

/* Secondaire - Créativité, Énergie */
--purple-600: #7C3AED
--purple-700: #6D28D9
--purple-50: #F5F3FF

/* Accent - Succès, Action */
--green-600: #10B981
--green-700: #059669
--green-50: #ECFDF5

/* Warning - Urgence */
--orange-600: #F59E0B
--orange-700: #D97706
--orange-50: #FFFBEB

/* Neutre */
--gray-900: #111827 (texte principal)
--gray-700: #374151 (texte secondaire)
--gray-500: #6B7280 (texte tertiaire)
--gray-100: #F3F4F6 (fond)
--gray-50: #F9FAFB (fond très clair)
```

### Application par Élément

**Titre Principal:**
- Couleur: `--gray-900` ou couleur école primaire
- Fond: Transparent ou très pâle

**Badges:**
- Fond: `--blue-600` ou couleur école
- Texte: Blanc (#FFFFFF)

**Icônes Bénéfices:**
- 💵 Argent: `--green-600`
- 🎓 Crédit: `--blue-600`
- 🏆 Compétition: `--orange-600` ou or (#FBBF24)
- ❤️ Aide: `--purple-600` ou rouge (#EF4444)

**Barre Progression:**
- >50%: `--green-600`
- 25-50%: `--orange-600`
- <25%: Rouge (#EF4444)

**Compte à Rebours:**
- <7 jours: Rouge (#EF4444)
- 7-14 jours: `--orange-600`
- >14 jours: `--blue-600`

**QR Code Zone:**
- Fond: `--blue-50` ou `--purple-50` (très pâle)
- QR Code: Noir (#000000) sur blanc
- Texte: `--gray-900`

---

## 📏 ESPACEMENTS ET MARGES

### Marges Globales
- **Bordure**: 0.25" (6mm) de tous les côtés
- **Zone de sécurité texte**: 0.5" (12mm) depuis bords

### Espacement Entre Zones
- **Zone 1 → Zone 2/3**: 0.4" (10mm)
- **Zone 2/3 → Zone 4/5**: 0.3" (8mm)
- **Zone 4 → Zone 5**: 0.2" (5mm)

### Espacement Interne
- **Entre blocs bénéfices**: 0.3" (8mm)
- **Entre éléments classement**: 0.2" (5mm)
- **Entre étapes processus**: 0.3" (8mm)
- **Padding interne blocs**: 0.3" (8mm)

---

## 🔤 TYPOGRAPHIE DÉTAILLÉE

### Hiérarchie Complète

```
Titre Principal (Zone 1)
├─ Taille: 48-60pt
├─ Poids: Bold (700)
├─ Famille: Montserrat, Poppins, Inter
├─ Interlignage: 1.2
└─ Couleur: #111827 ou couleur école

Titres Section (Zones 2-5)
├─ Taille: 24-32pt
├─ Poids: Bold (700)
├─ Famille: Montserrat, Poppins
├─ Interlignage: 1.3
└─ Couleur: #111827

Sous-titres
├─ Taille: 18-20pt
├─ Poids: Semi-Bold (600)
├─ Famille: Inter, Open Sans
├─ Interlignage: 1.4
└─ Couleur: #374151

Corps de Texte
├─ Taille: 12-14pt
├─ Poids: Regular (400)
├─ Famille: Inter, Open Sans, Roboto
├─ Interlignage: 1.5
└─ Couleur: #374151

Texte Secondaire
├─ Taille: 10-12pt
├─ Poids: Regular (400)
├─ Famille: Inter, Open Sans
├─ Interlignage: 1.5
└─ Couleur: #6B7280

Code Campagne
├─ Taille: 24-28pt
├─ Poids: Bold (700)
├─ Famille: Courier New, Monaco (monospace)
├─ Interlignage: 1.2
└─ Couleur: Blanc sur fond coloré
```

### Exemples de Texte

**Titre Principal:**
```
"Rejoins la campagne de financement de
ÉCOLE PRIMAIRE SAINT-JEAN"
```

**Titres Section:**
```
"💰 CE QUE TU GAGNES"
"👥 DÉJÀ 45 ÉTUDIANTS PARTICIPENT!"
"C'EST SIMPLE EN 3 ÉTAPES:"
"COMMENCE DÈS AUJOURD'HUI!"
```

**Descriptions:**
```
"Gagne $2.50 en argent comptant par produit vendu"
"Reçois $1.50 crédité à ton compte scolaire"
"Affronte tes amis dans le classement des meilleurs vendeurs"
```

---

## 🖼️ GESTION DES LOGOS

### Avec Logo École

**Position Option 1: Coin Supérieur Gauche**
```
┌─────────────────────────────┐
│ [LOGO]                      │
│ 2" max hauteur              │
│ 0.5" depuis haut/gauche     │
│                             │
│     TITRE PRINCIPAL         │
└─────────────────────────────┘
```

**Position Option 2: Centré en Haut**
```
┌─────────────────────────────┐
│        [LOGO]                │
│        2" max                │
│                             │
│     TITRE PRINCIPAL         │
└─────────────────────────────┘
```

**Spécifications:**
- Format: PNG transparent (préféré) ou JPG fond blanc
- Taille max: 2" (50mm) hauteur, proportion maintenue
- Résolution: 300 DPI minimum
- Espacement: 0.5" (12mm) depuis bords

### Sans Logo École (Fallback)

**Option 1: Nom École Stylisé**
```
┌─────────────────────────────┐
│                             │
│  ÉCOLE PRIMAIRE             │
│  SAINT-JEAN                 │
│  (48pt, Bold, couleur école)│
│                             │
└─────────────────────────────┘
```

**Option 2: Icône Générique + Nom**
```
┌─────────────────────────────┐
│        🏫                    │
│  ÉCOLE PRIMAIRE SAINT-JEAN   │
│  (Icône 40pt, nom 36pt)      │
└─────────────────────────────┘
```

---

## 📊 VARIATIONS DE CONTENU

### Variation A: Campagne Avant Début

**Zone 3 Modifiée:**
- Titre: "⭐ SOIS PARMI LES PREMIERS!"
- Message: "Rejoins la campagne dès maintenant et deviens un leader!"
- 3 avantages d'être premier (cartes)
- Date début: "La campagne commence le [DATE]"
- Objectif: "Objectif: $[MONTANT]"

**Zone 5 Modifiée:**
- Message: "Inscris-toi maintenant pour être prêt!"
- Pas de compte à rebours

### Variation B: Campagne Active (Données Disponibles)

**Zone 3 Standard:**
- Nombre participants
- Top 3 vendeurs
- Barre progression
- Compte à rebours

**Zone 5 Standard:**
- Message urgence: "Rejoins maintenant!"

### Variation C: Campagne Sans Données (Erreur API)

**Zone 3:**
- Version "Sois parmi les premiers!" (fallback)
- Pas de données dynamiques

**Zone 5:**
- QR code fonctionne toujours
- Code campagne toujours affiché

---

## ✅ CHECKLIST TECHNIQUE

### Fichier Source
- [ ] Calques organisés et nommés
- [ ] Textes éditable (pas rasterisés)
- [ ] Variables/placeholders pour données dynamiques
- [ ] Grille de mise en page visible
- [ ] Guides pour zones de contenu
- [ ] Marges marquées

### Production
- [ ] Résolution 300 DPI
- [ ] Format CMYK pour impression
- [ ] Format RGB pour prévisualisation
- [ ] Taille correcte (8.5" x 11" ou A4)
- [ ] Marges d'impression respectées
- [ ] Pas de texte trop près des bords

### Contenu
- [ ] Tous les placeholders remplis ou marqués
- [ ] Logo placeholder inclus
- [ ] QR code placeholder (carré blanc avec texte "QR CODE")
- [ ] Exemple de données réalistes
- [ ] Version avec et sans participants
- [ ] Version avec et sans logo

### Design
- [ ] Contraste suffisant partout (ratio 4.5:1 minimum)
- [ ] QR code assez grand (minimum 2" x 2")
- [ ] Hiérarchie visuelle claire
- [ ] Espacement cohérent
- [ ] Couleurs harmonieuses
- [ ] Pas de surcharge visuelle

### Test
- [ ] Test impression noir & blanc
- [ ] Test impression couleur
- [ ] Test scan QR code (depuis impression)
- [ ] Test lisibilité à distance (3-5 pieds)
- [ ] Test sur différents papiers

---

## 🎯 PRIORITÉS DE DESIGN

### Priorité 1 (Critique)
1. **QR Code visible et scannable** - C'est l'action principale
2. **Titre clair** - Comprendre immédiatement de quoi il s'agit
3. **Code campagne lisible** - Backup si QR ne fonctionne pas
4. **Bénéfices clairs** - Motiver l'étudiant

### Priorité 2 (Important)
5. **Preuve sociale** - Créer FOMO et confiance
6. **Processus simple** - Réduire friction perçue
7. **Urgence** - Créer sentiment d'action immédiate
8. **Design professionnel** - Inspirer confiance

### Priorité 3 (Souhaitable)
9. **Logo école** - Renforcer confiance
10. **Images produits** - Visualiser ce qu'on vend
11. **Détails compétition** - Motiver compétiteurs
12. **Décoration visuelle** - Rendre attrayant

---

## 📱 CONSIDÉRATIONS MOBILE

Même si c'est une affiche imprimée, penser mobile car:
- L'étudiant va scanner le QR avec son téléphone
- Il peut prendre une photo de l'affiche
- Il peut partager l'affiche digitalement

**Optimisations:**
- QR code assez grand pour photo floue
- Texte lisible même si photo de mauvaise qualité
- Code campagne facile à taper sur téléphone
- URL courte et mémorable (jappuie.ca)

---

## 🔄 WORKFLOW DE GÉNÉRATION

### Étape 1: Template de Base
Designer crée template avec:
- Structure de mise en page
- Placeholders pour toutes données
- Styles et couleurs de base
- Système de grille

### Étape 2: Intégration Données
Développeur intègre:
- API pour récupérer données campagne
- Génération QR code dynamique
- Remplissage placeholders
- Gestion cas sans données

### Étape 3: Génération PDF
Système génère:
- PDF haute résolution
- PNG pour prévisualisation
- Version avec/sans données
- Version avec/sans logo

### Étape 4: Distribution
École peut:
- Télécharger PDF pour impression
- Partager version digitale
- Imprimer en masse
- Distribuer aux étudiants

---

**Ce document complète le brief principal et fournit toutes les spécifications techniques nécessaires pour créer l'affiche optimale.**
