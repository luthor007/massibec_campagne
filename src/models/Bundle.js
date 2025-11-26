import mongoose from 'mongoose';

const BundleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    // Prix pickup pour le bundle (peut être modifié indépendamment)
    pricePickup: {
        type: Number,
        required: true,
        min: 0
    },
    // Prix de revente recommandé (optionnel)
    recommendedRetailPrice: {
        type: Number,
        required: false,
        default: undefined,
        min: 0,
        validate: {
            validator: function (v) {
                // Allow undefined, null, or positive numbers
                return v === undefined || v === null || (typeof v === 'number' && v >= 0);
            },
            message: 'Le prix de revente doit être un nombre positif ou vide'
        }
    },
    // Prix de vente à l'école (calculé automatiquement: pricePickup * markup + deliveryCostToSchool, arrondi au multiple de 5 cent le plus bas)
    // IMPORTANT: Ce champ stocke le PRIX ARRONDI qui est la source de vérité pour tous les calculs
    // Tous les calculs de coût d'acquisition pour l'école doivent utiliser ce champ directement
    price: {
        type: Number,
        required: true,
        min: 0
    },
    // Coût de livraison (dérivé des produits inclus)
    deliveryCostToSchool: {
        type: Number,
        default: 0,
        min: 0
    },
    image: {
        type: String,
        required: true,
        trim: true
    },
    // Produits inclus dans le bundle avec leurs quantités
    includedProducts: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        }
    }],
    // Attributs dérivés des produits (union de tous les attributs des produits inclus)
    attributes: {
        freezable: { type: Boolean, default: false },
        glutenFree: { type: Boolean, default: false },
        vegetarian: { type: Boolean, default: false },
        vegan: { type: Boolean, default: false },
        nutFree: { type: Boolean, default: false },
        halal: { type: Boolean, default: false },
        kosher: { type: Boolean, default: false },
        organic: { type: Boolean, default: false },
        quebecProduct: { type: Boolean, default: false },
        allergens: { type: String, trim: true, default: '' }
    },
    // Informations logistiques dérivées
    unitSize: { type: String, trim: true, maxlength: 50 },
    casePack: { type: String, trim: true, maxlength: 100 },
    pallet: {
        ti: { type: Number, default: 0 },
        hi: { type: Number, default: 0 }
    },
    refrigerated: { type: Boolean, default: false },
    packagingGroup: { type: String, trim: true, maxlength: 100, default: '' },
    // Référence au fournisseur
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    // Ordre d'affichage
    order: {
        type: Number,
        default: 0,
        required: false
    },
    // Indicateur que c'est un bundle
    isBundle: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Calculer automatiquement le prix et les attributs avant sauvegarde
BundleSchema.pre('save', async function (next) {
    // Initialiser deliveryCostToSchool à 0 par défaut
    let totalDeliveryCost = 0;
    let products = [];

    // Dériver les attributs et informations logistiques des produits inclus
    if (this.includedProducts && this.includedProducts.length > 0) {
        const Product = mongoose.model('Product');
        const productIds = this.includedProducts.map(ip => ip.product);
        products = await Product.find({ _id: { $in: productIds } });

        // Calculer le coût de livraison total (somme des coûts des produits inclus)
        // IMPORTANT: Calculer d'abord deliveryCostToSchool avant le prix
        products.forEach(product => {
            const bundleItem = this.includedProducts.find(ip =>
                ip.product.toString() === product._id.toString()
            );
            if (bundleItem) {
                totalDeliveryCost += (product.deliveryCostToSchool || 0) * bundleItem.quantity;
            }
        });

        // Dériver les attributs (union - si un produit a l'attribut, le bundle l'a aussi)
        const derivedAttributes = {
            freezable: false,
            glutenFree: false,
            vegetarian: false,
            vegan: false,
            nutFree: false,
            halal: false,
            kosher: false,
            organic: false,
            quebecProduct: false,
            allergens: []
        };

        products.forEach(product => {
            if (product.attributes) {
                if (product.attributes.freezable) derivedAttributes.freezable = true;
                if (product.attributes.glutenFree) derivedAttributes.glutenFree = true;
                if (product.attributes.vegetarian) derivedAttributes.vegetarian = true;
                if (product.attributes.vegan) derivedAttributes.vegan = true;
                if (product.attributes.nutFree) derivedAttributes.nutFree = true;
                if (product.attributes.halal) derivedAttributes.halal = true;
                if (product.attributes.kosher) derivedAttributes.kosher = true;
                if (product.attributes.organic) derivedAttributes.organic = true;
                if (product.attributes.quebecProduct) derivedAttributes.quebecProduct = true;
                if (product.attributes.allergens) {
                    const allergens = product.attributes.allergens.split(',').map(a => a.trim()).filter(Boolean);
                    derivedAttributes.allergens.push(...allergens);
                }
            }
        });

        // Combiner les allergènes uniques
        this.attributes = {
            ...derivedAttributes,
            allergens: [...new Set(derivedAttributes.allergens)].join(', ')
        };

        // Dériver les informations logistiques (prendre les valeurs du premier produit ou combiner)
        if (products.length > 0) {
            const firstProduct = products[0];
            this.unitSize = firstProduct.unitSize || '';
            this.casePack = firstProduct.casePack || '';
            this.pallet = firstProduct.pallet || { ti: 0, hi: 0 };
            this.refrigerated = products.some(p => p.refrigerated);
            this.packagingGroup = firstProduct.packagingGroup || '';
        }
    }

    // Toujours définir deliveryCostToSchool (même si 0 ou pas de produits inclus)
    this.deliveryCostToSchool = totalDeliveryCost;

    // Calculer le prix APRÈS avoir calculé deliveryCostToSchool
    // Le prix est TOUJOURS calculé à partir de pricePickup (requis)
    // Convertir pricePickup en nombre si nécessaire
    const pricePickupNum = typeof this.pricePickup === 'string' ? parseFloat(this.pricePickup) : (this.pricePickup || 0);

    // Debug logs
    console.log('[Bundle pre-save] pricePickup:', this.pricePickup, 'pricePickupNum:', pricePickupNum);
    console.log('[Bundle pre-save] deliveryCostToSchool:', this.deliveryCostToSchool);

    // NOTE: This pre-save hook is a fallback. The APIs should calculate price correctly before saving.
    // IMPORTANT: Price must be rounded down to nearest 5 cents (Math.floor(value * 20) / 20)
    // This ensures bundle.price is always the rounded price (source of truth)
    if (!isNaN(pricePickupNum) && pricePickupNum >= 0) {
        // Fallback calculation (APIs should handle this with dynamic markup)
        const basePrice = pricePickupNum * 1.05; // Default 5% markup (APIs use dynamic markup)
        const deliveryCost = this.deliveryCostToSchool || 0;
        const totalPrice = basePrice + deliveryCost;
        // Round down to nearest 5 cents - this is the REAL price for schools
        this.price = Math.floor(totalPrice * 20) / 20;
    } else {
        // Fallback: si pricePickup n'est pas valide, utiliser deliveryCost seulement
        // (ne devrait jamais arriver car pricePickup est requis et validé)
        const deliveryCost = this.deliveryCostToSchool || 0;
        // Round down to nearest 5 cents
        this.price = Math.floor(deliveryCost * 20) / 20;
    }

    // S'assurer que le prix est toujours défini (requis par le schéma)
    if (this.price === undefined || this.price === null || isNaN(this.price)) {
        console.warn('[Bundle pre-save] Prix invalide, utilisation de 0 par défaut');
        this.price = 0;
    } else {
        // Ensure existing price is rounded to nearest 5 cents (even if set manually)
        // This ensures consistency
        this.price = Math.floor(this.price * 20) / 20;
    }

    console.log('[Bundle pre-save] Prix calculé:', this.price);

    next();
});

// Pre-save hook to sanitize string fields to ensure valid UTF-8
BundleSchema.pre('save', function (next) {
    const stringFields = ['name', 'description', 'image', 'unitSize', 'casePack', 'packagingGroup'];

    // Sanitize top-level string fields
    for (const field of stringFields) {
        if (this[field] && typeof this[field] === 'string') {
            try {
                this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
            } catch (e) {
                console.error(`Error encoding Bundle.${field}:`, e);
                this[field] = '';
            }
        }
    }

    // Sanitize attributes.allergens
    if (this.attributes && this.attributes.allergens && typeof this.attributes.allergens === 'string') {
        try {
            this.attributes.allergens = Buffer.from(this.attributes.allergens, 'utf8').toString('utf8');
        } catch (e) {
            console.error(`Error encoding Bundle.attributes.allergens:`, e);
            this.attributes.allergens = '';
        }
    }

    next();
});

export default mongoose.models.Bundle || mongoose.model('Bundle', BundleSchema);

