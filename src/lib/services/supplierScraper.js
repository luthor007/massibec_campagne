// src/lib/services/supplierScraper.js
import firecrawl from '../../lib/firecrawl';

/**
 * Infère les attributs produits à partir du contenu scrapé
 */
function inferProductAttributes(productData) {
    const textToAnalyze = [
        productData.name || '',
        productData.description || '',
        productData.ingredientsText || '',
        (productData.allergens || []).join(' '),
        productData.category || ''
    ].join(' ').toLowerCase();

    const attributes = {
        freezable: false,
        glutenFree: false,
        vegetarian: false,
        vegan: false,
        nutFree: false,
        halal: false,
        kosher: false,
        organic: false,
        quebecProduct: false
    };

    // Freezable
    if (/congelable|freezable|peut être congelé|peut-être congelé|peut être congelée/i.test(textToAnalyze)) {
        attributes.freezable = true;
    }

    // Gluten Free
    if (/sans gluten|gluten-free|gluten free|sans blé/i.test(textToAnalyze) ||
        (!textToAnalyze.includes('gluten') && !textToAnalyze.includes('blé') && !textToAnalyze.includes('wheat'))) {
        attributes.glutenFree = true;
    }

    // Vegetarian
    if (/végétarien|vegetarian/i.test(textToAnalyze) ||
        (!textToAnalyze.includes('viande') && !textToAnalyze.includes('meat') &&
            !textToAnalyze.includes('poisson') && !textToAnalyze.includes('fish') &&
            !textToAnalyze.includes('poulet') && !textToAnalyze.includes('chicken'))) {
        attributes.vegetarian = true;
    }

    // Vegan
    if (/végétalien|vegan|végane/i.test(textToAnalyze) ||
        (!textToAnalyze.includes('lait') && !textToAnalyze.includes('milk') &&
            !textToAnalyze.includes('œuf') && !textToAnalyze.includes('egg') &&
            !textToAnalyze.includes('fromage') && !textToAnalyze.includes('cheese') &&
            attributes.vegetarian)) {
        attributes.vegan = true;
    }

    // Nut Free
    if (/sans noix|nut-free|nut free|sans arachides|peanut free/i.test(textToAnalyze) ||
        (!textToAnalyze.includes('noix') && !textToAnalyze.includes('nut') &&
            !textToAnalyze.includes('arachide') && !textToAnalyze.includes('peanut'))) {
        attributes.nutFree = true;
    }

    // Halal
    if (/halal/i.test(textToAnalyze)) {
        attributes.halal = true;
    }

    // Kosher
    if (/kosher/i.test(textToAnalyze)) {
        attributes.kosher = true;
    }

    // Organic
    if (/biologique|organic|bio/i.test(textToAnalyze)) {
        attributes.organic = true;
    }

    // Quebec Product
    if (/quebec|québec|du québec|made in quebec|produit québécois|québécois/i.test(textToAnalyze)) {
        attributes.quebecProduct = true;
    }

    return attributes;
}

/**
 * Scrape un site web de fournisseur et extrait les informations structurées
 */
export async function scrapeSupplierWebsite(url) {
    try {
        // Définir le schéma JSON pour l'extraction (format JSON Schema)
        const extractionSchema = {
            type: 'object',
            properties: {
                companyInfo: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: 'string' },
                        address: { type: 'string' },
                        logo: { type: 'string' },
                        website: { type: 'string' },
                        certifications: { type: 'array', items: { type: 'string' } },
                        storageType: { type: 'string' }
                    }
                },
                products: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            pricePickup: { type: 'number' },
                            priceStudent: { type: 'number' },
                            priceFinal: { type: 'number' },
                            image: { type: 'string' },
                            ingredientsImage: { type: 'string' },
                            nutritionImage: { type: 'string' },
                            ingredientsText: { type: 'string' },
                            nutritionText: { type: 'string' },
                            unitSize: { type: 'string' },
                            casePack: { type: 'string' },
                            pallet: {
                                type: 'object',
                                properties: {
                                    ti: { type: 'number' },
                                    hi: { type: 'number' }
                                }
                            },
                            refrigerated: { type: 'boolean' },
                            allergens: { type: 'array', items: { type: 'string' } },
                            category: { type: 'string' },
                            sourceUrl: { type: 'string' },
                            attributes: {
                                type: 'object',
                                properties: {
                                    freezable: { type: 'boolean' },
                                    glutenFree: { type: 'boolean' },
                                    vegetarian: { type: 'boolean' },
                                    vegan: { type: 'boolean' },
                                    nutFree: { type: 'boolean' },
                                    halal: { type: 'boolean' },
                                    kosher: { type: 'boolean' },
                                    organic: { type: 'boolean' },
                                    quebecProduct: { type: 'boolean' }
                                }
                            }
                        }
                    }
                }
            }
        };

        // Valider que l'URL est fournie
        if (!url || typeof url !== 'string' || url.trim() === '') {
            throw new Error('URL du site web requise pour le scraping');
        }

        const urlToScrape = url.trim();
        console.log('Scraping URL:', urlToScrape);

        // Prompt amélioré pour extraire les produits en explorant plus de pages
        const prompt = `Extract company information and ALL products from this supplier website. 

CRITICAL: Extract ONLY real data that actually exists on the website. DO NOT create fake data, placeholder values, or example data. If information is not found, leave fields empty or null.

EXPLORATION STRATEGY:
1. Start from the homepage and explore ALL navigation links
2. Look for pages like: "Products", "Catalogue", "Our Products", "Menu", "Produits", "Catalogue", "Notre gamme"
3. Check footer links, navigation menus, and any product category pages
4. Follow links to individual product pages
5. Look for product listings, product grids, or product catalogs
6. Check for downloadable PDFs or catalogs that might contain product information
7. Explore subpages and category pages thoroughly

Company info to extract:
- name: Official company name
- description: Company description in FRENCH (translate if needed). Be detailed about their mission, specialties, and offerings.
- email: Real contact email (check contact page, footer, about page)
- phone: Real phone number (check contact page, footer, about page) - DO NOT make up numbers
- address: Real physical address - DO NOT create fake addresses
- logo: Actual logo image URL from the website (usually in header or footer)
- website: Website URL
- certifications: List of actual certifications found (HACCP, ISO, Organic, etc.)
- storageType: "ambient", "chilled", or "frozen" based on how products are stored

PRODUCT EXTRACTION - IMPORTANT:
Extract EVERY product you find on the website. Look for:
- Product pages with individual product details
- Product listing pages with multiple products
- Category pages (e.g., "Tartes", "Salades", "Pâtés", "Desserts")
- Menu pages or catalog pages
- Any page showing food items, products, or offerings

For EACH product found, extract:
- name: Product name/title
- description: Detailed product description in FRENCH (translate if needed). Include ingredients, preparation, and key features.
- pricePickup: The supplier's pickup price (price at which supplier sells to schools). If not shown, leave as 0.
- priceStudent: Selling price to students (typically +30% from pricePickup). If not shown, calculate as pricePickup * 1.3 or leave as 0.
- priceFinal: Final retail price to customers (typically +30% from priceStudent). If not shown, calculate as priceStudent * 1.3 or leave as 0.
- image: Full URL of the main product image (absolute URL, not relative)
- ingredientsImage: URL of ingredients label/image if available
- nutritionImage: URL of nutrition facts label/image if available
- ingredientsText: Text content of ingredients list if available
- nutritionText: Text content of nutrition facts table if available
- unitSize: Product unit size (e.g., "650 g", "500 ml", "1 kg", "12 units")
- casePack: Case packaging information (e.g., "12 x 650 g", "24 units", "6 x 1 kg")
- pallet: Object with ti (tiers/levels) and hi (units per tier). If not found, use {ti: 0, hi: 0}
- refrigerated: Boolean - true if product requires refrigeration, false otherwise
- allergens: Array of allergens (e.g., ["milk", "eggs", "gluten", "nuts", "soy"])
- category: Product category (e.g., "Tartes", "Salades", "Pâtés", "Desserts", "Entrées", "Viandes")
- sourceUrl: The exact URL of the page where this product was found
- attributes: Object with boolean values:
  - freezable: Can the product be frozen? (true if mentioned as freezable/frozen)
  - glutenFree: Is the product gluten-free? (true if explicitly stated)
  - vegetarian: Is the product vegetarian? (true if no meat/fish mentioned)
  - vegan: Is the product vegan? (true if no animal products mentioned)
  - nutFree: Is the product free of nuts? (true if explicitly stated or no nuts in allergens)
  - halal: Is the product halal certified? (true if halal certification mentioned)
  - kosher: Is the product kosher certified? (true if kosher certification mentioned)
  - organic: Is the product organic? (true if organic certification or label mentioned)
  - quebecProduct: Is the product made in Quebec? (true if "Québec", "Quebec", "Made in Quebec", "Produit du Québec" mentioned)

IMPORTANT RULES:
- Extract ALL products found, not just a few
- If prices are not shown, leave as 0 (do not estimate or guess)
- If information is missing, leave empty (do not create placeholder data)
- Only extract what actually exists on the website
- Be thorough - explore multiple pages and follow all product links
- For images, always use full absolute URLs (e.g., https://domain.com/image.jpg, not /image.jpg)`;

        // Utiliser le wildcard /* pour explorer tout le domaine et extraire tous les produits
        const urlToExtract = urlToScrape.replace(/\/$/, '') + '/*';
        console.log(`Extracting from: ${urlToExtract}`);

        // Extraire les données de la page
        // Utiliser startExtract et getExtractStatus manuellement pour éviter le timeout d'Axios
        // Le timeout de 60 secondes vient d'Axios, pas de Firecrawl
        console.log('Starting extract job...');
        const extractJob = await firecrawl.startExtract({
            urls: [urlToExtract],
            prompt: prompt,
            schema: extractionSchema
        });

        if (!extractJob || !extractJob.id) {
            throw new Error('Impossible de démarrer le job d\'extraction');
        }

        console.log('Extract job started, jobId:', extractJob.id);

        // Poller le statut manuellement pour éviter le timeout d'Axios
        // Chaque appel à getExtractStatus est rapide (< 1 seconde), donc pas de problème de timeout
        let extractStatus;
        const maxWaitTime = 600000; // 10 minutes en millisecondes
        const startTime = Date.now();
        const pollInterval = 5000; // Vérifier toutes les 5 secondes
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 3;

        do {
            await new Promise(resolve => setTimeout(resolve, pollInterval));

            try {
                extractStatus = await firecrawl.getExtractStatus(extractJob.id);
                consecutiveErrors = 0; // Reset error counter on success
                console.log('Extract status:', extractStatus?.status || 'unknown');

                if (Date.now() - startTime > maxWaitTime) {
                    throw new Error('Extraction timeout: le processus prend trop de temps (10 minutes)');
                }
            } catch (error) {
                consecutiveErrors++;
                console.error(`Error checking extract status (attempt ${consecutiveErrors}/${maxConsecutiveErrors}):`, error.message);

                if (consecutiveErrors >= maxConsecutiveErrors) {
                    throw new Error(`Impossible de récupérer le statut après ${maxConsecutiveErrors} tentatives: ${error.message}`);
                }

                // Continue polling even after error (might be temporary network issue)
                continue;
            }
        } while (extractStatus && (extractStatus.status === 'scraping' || extractStatus.status === 'pending' || extractStatus.status === 'processing'));

        if (!extractStatus) {
            throw new Error('Impossible de récupérer le statut de l\'extraction');
        }

        if (extractStatus.status === 'failed' || extractStatus.status === 'cancelled') {
            throw new Error(`Extraction failed: ${extractStatus.error || 'Unknown error'}`);
        }

        // Construire le résultat dans le format attendu
        const extractResult = {
            success: extractStatus.success !== false,
            data: extractStatus.data,
            error: extractStatus.error,
            warning: extractStatus.warning
        };

        // Vérifier le résultat de l'extraction
        if (!extractResult || !extractResult.success) {
            console.error('Extraction failed:', extractResult);
            throw new Error(`Extraction failed: ${extractResult?.error || 'Unknown error'}`);
        }

        if (!extractResult.data) {
            console.error('No data in extractResult:', extractResult);
            throw new Error('Aucune donnée extraite du site web');
        }

        // Log pour déboguer la structure des données
        console.log('Extract result data structure:', JSON.stringify(extractResult.data, null, 2));

        // La structure peut être différente selon le format de réponse
        // Firecrawl peut retourner les données directement ou dans un objet
        let extractedData = extractResult.data;

        // Si les données sont dans un array, prendre le premier élément
        if (Array.isArray(extractedData) && extractedData.length > 0) {
            extractedData = extractedData[0];
        }

        // Si les données sont dans un objet avec une propriété data
        if (extractedData && typeof extractedData === 'object' && extractedData.data) {
            extractedData = extractedData.data;
        }

        // Traiter les données extraites
        const companyInfo = extractedData.companyInfo || {};
        let products = extractedData.products || [];

        // Inférer les attributs pour chaque produit
        products = products.map(product => {
            // Si les attributs ne sont pas déjà extraits, les inférer
            if (!product.attributes || Object.keys(product.attributes).length === 0) {
                product.attributes = inferProductAttributes(product);
            } else {
                // Compléter les attributs manquants par inférence
                const inferred = inferProductAttributes(product);
                product.attributes = {
                    ...inferred,
                    ...product.attributes // Les attributs extraits ont priorité
                };
            }

            // S'assurer que sourceUrl est défini
            if (!product.sourceUrl) {
                product.sourceUrl = url;
            }

            return product;
        });

        return {
            companyInfo: {
                name: companyInfo.name || '',
                description: companyInfo.description || '',
                email: companyInfo.email || '',
                phone: companyInfo.phone || '',
                address: companyInfo.address || '',
                logo: companyInfo.logo || '',
                website: companyInfo.website || url,
                certifications: companyInfo.certifications || [],
                storageType: companyInfo.storageType || 'ambient'
            },
            products: products
        };
    } catch (error) {
        console.error('Error scraping supplier website:', error);
        throw new Error(`Erreur lors du scraping: ${error.message}`);
    }
}

