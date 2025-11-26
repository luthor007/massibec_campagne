# Scraper Gemini pour les Fournisseurs

Ce scraper personnalisé utilise Gemini AI pour explorer intelligemment les sites web de fournisseurs et extraire les informations de l'entreprise ainsi que tous les produits.

## Fonctionnalités

- ✅ Extraction intelligente du texte visible et des images
- ✅ **Analyse visuelle des images** : Gemini analyse visuellement les images pour identifier les produits alimentaires
- ✅ **Filtrage intelligent** : Exclut automatiquement les logos, images décoratives, photos d'équipe, etc.
- ✅ **Extraction visuelle** : Extrait les informations des étiquettes (ingrédients, nutrition, etc.) directement depuis les images
- ✅ Navigation automatique basée sur l'IA pour trouver les pages pertinentes
- ✅ Détection des champs manquants et exploration ciblée
- ✅ Fusion intelligente des données de multiples pages
- ✅ Arrêt automatique quand toutes les informations sont trouvées

## Installation

### 1. Installer les dépendances Python

```bash
pip install -r scripts/requirements-scraper.txt
```

### 2. Configurer la clé API Gemini

```bash
export GEMINI_API_KEY="votre-clé-api-gemini"
```

Ou ajoutez-la dans votre `.env.local` :

```
GEMINI_API_KEY=votre-clé-api-gemini
```

## Utilisation

### En ligne de commande

```bash
python3 scripts/supplier-scraper-gemini.py https://example-supplier.com
```

Le script va :
1. Explorer la page d'accueil
2. Extraire les données avec Gemini
3. Identifier les champs manquants
4. Demander à Gemini quels liens explorer
5. Visiter les pages pertinentes
6. Continuer jusqu'à ce que toutes les infos soient trouvées

### Via l'API Next.js

L'API `/api/supplier/scrape-website` supporte maintenant deux modes :

**Firecrawl (par défaut) :**
```javascript
fetch('/api/supplier/scrape-website', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    websiteUrl: 'https://example.com' 
  })
})
```

**Gemini (nouveau) :**
```javascript
fetch('/api/supplier/scrape-website', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    websiteUrl: 'https://example.com',
    useGemini: true  // Activer le scraper Gemini
  })
})
```

## Comment ça fonctionne

### 1. Extraction initiale
- Parse le HTML de la page
- Extrait tout le texte visible
- Récupère toutes les images de la page
- **Filtre les images** : Télécharge les images et demande à Gemini d'identifier lesquelles sont des produits alimentaires
- **Analyse visuelle** : Gemini analyse visuellement les images de produits pour extraire :
  - Le nom du produit (si visible sur l'image)
  - La description visuelle
  - Les informations nutritionnelles (étiquettes)
  - Les ingrédients (si visibles)
  - Le type de produit
- Envoie texte + images à Gemini avec le schéma JSON

### 2. Analyse des champs manquants
- Compare les données extraites avec le schéma requis
- Identifie les champs manquants (email, téléphone, produits, etc.)

### 3. Navigation intelligente
- Extrait tous les liens de navigation
- Demande à Gemini quels liens pourraient contenir les infos manquantes
- Gemini analyse les URLs et choisit les plus pertinentes

### 4. Exploration itérative
- Visite les pages sélectionnées
- Extrait les données de chaque page
- Fusionne avec les données existantes
- Répète jusqu'à ce que tout soit trouvé ou qu'il n'y ait plus de pages utiles

### 5. Arrêt intelligent
- Gemini peut indiquer qu'il n'y a plus de pages utiles à explorer
- Le scraper s'arrête automatiquement

## Structure des données

Le scraper retourne un objet JSON avec cette structure :

```json
{
  "companyInfo": {
    "name": "Nom de l'entreprise",
    "description": "Description en français",
    "email": "contact@example.com",
    "phone": "123-456-7890",
    "address": "123 Rue Example, Ville, QC",
    "logo": "https://example.com/logo.png",
    "website": "https://example.com",
    "certifications": ["HACCP", "ISO"],
    "storageType": "chilled"
  },
  "products": [
    {
      "name": "Nom du produit",
      "description": "Description détaillée",
      "pricePickup": 10.00,
      "priceStudent": 13.00,
      "priceFinal": 16.90,
      "image": "https://example.com/product.jpg",
      "category": "Tartes",
      "attributes": {
        "freezable": true,
        "glutenFree": false,
        "vegetarian": true
      }
    }
  ]
}
```

## Configuration

### Limites de sécurité

Dans `supplier-scraper-gemini.py`, vous pouvez ajuster :

```python
MAX_PAGES_TO_VISIT = 20  # Nombre maximum de pages à visiter
MAX_DEPTH = 3            # Profondeur maximale de navigation
```

### Modèle Gemini

Par défaut, le script utilise `gemini-2.5-flash`. Vous pouvez changer dans :

```python
MODEL = "gemini-2.5-flash"  # ou "gemini-2.5-pro" pour plus de précision
```

## Avantages vs Firecrawl

| Feature | Firecrawl | Gemini Scraper |
|---------|-----------|----------------|
| Exploration automatique | ✅ Wildcard `/*` | ✅ Navigation intelligente |
| Détection de champs manquants | ❌ | ✅ |
| Choix intelligent des pages | ❌ | ✅ |
| Coût | 💰 Tokens Firecrawl | 💰 Tokens Gemini |
| Contrôle | ⚙️ Limité | ⚙️ Total |
| Vitesse | ⚡ Rapide | 🐢 Plus lent (plus de requêtes) |

## Dépannage

### Erreur: "GEMINI_API_KEY environment variable is required"

Assurez-vous d'avoir défini la variable d'environnement :
```bash
export GEMINI_API_KEY="votre-clé"
```

### Erreur: "Module not found: google.genai"

Installez les dépendances :
```bash
pip install -r scripts/requirements-scraper.txt
```

### Le scraper ne trouve pas tous les produits

- Augmentez `MAX_PAGES_TO_VISIT`
- Vérifiez que les liens de navigation sont accessibles
- Le scraper s'arrête quand Gemini indique qu'il n'y a plus de pages utiles

## Notes

- Le scraper évite les doublons de produits basés sur le nom
- Les images sont converties en URLs absolues
- Le texte est nettoyé (scripts/styles supprimés)
- Les descriptions sont en français

