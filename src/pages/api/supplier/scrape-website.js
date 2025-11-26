// src/pages/api/supplier/scrape-website.js
import { getToken } from 'next-auth/jwt';
import dbConnect from '../../../lib/mongodb';
import ScrapingCache from '../../../models/ScrapingCache';
import { scrapeSupplierWebsite } from '../../../lib/services/supplierScraper';
import { scrapeSupplierWebsiteGemini } from '../../../lib/services/supplierScraperGemini';

// Configurer le timeout de l'API route à 6 minutes (360 secondes)
// L'exploration de tout le domaine avec /* peut prendre plus de temps
export const config = {
    api: {
        responseLimit: false,
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
    maxDuration: 3600000, // 60 minutes pour permettre l'exploration de tout le domaine
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        // Authentification optionnelle - permet l'utilisation pendant l'inscription
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        // Si authentifié, vérifier le rôle
        if (token && token.role !== 'supplier') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const { websiteUrl, useGemini = false } = req.body;

        if (!websiteUrl || typeof websiteUrl !== 'string') {
            return res.status(400).json({ message: 'URL du site web requise' });
        }

        // Valider l'URL
        try {
            new URL(websiteUrl);
        } catch (error) {
            return res.status(400).json({ message: 'URL invalide' });
        }

        await dbConnect();

        // Check if caching is enabled (default: true)
        const useCache = process.env.ENABLE_SCRAPING_CACHE !== 'false';


        // Normalize URL for cache lookup
        const normalizedUrl = websiteUrl.trim().replace(/\/$/, '');

        // Check cache first if enabled
        if (useCache) {
            let cache = await ScrapingCache.findOne({ websiteUrl: normalizedUrl });

            if (cache && cache.companyInfo) {
                console.log('📦 Using cached scraping data');
                // Check if cache is fresh (less than 7 days old)
                const cacheAge = Date.now() - new Date(cache.scrapedAt).getTime();
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                const isFresh = cacheAge < sevenDays;

                // Return cached data
                return res.status(200).json({
                    success: true,
                    data: {
                        companyInfo: cache.companyInfo,
                        products: [], // Products not included in cache response
                        cached: true,
                        isFresh
                    }
                });
            }
        }

        // Scraper le site web avec Gemini (par défaut)
        let scrapedData;
        if (useGemini !== false) { // Default to Gemini
            console.log('🔮 Utilisation du scraper Gemini');
            scrapedData = await scrapeSupplierWebsiteGemini(websiteUrl);
        } else {
            console.log('🔥 Utilisation du scraper Firecrawl');
            scrapedData = await scrapeSupplierWebsite(websiteUrl);
        }

        // Save to cache for future use if caching is enabled
        if (useCache) {
            try {
                const sampleProducts = (scrapedData.products || []).slice(0, 5).map(p => ({
                    name: p.name,
                    description: p.description?.substring(0, 200) || '', // Truncate for cache
                    pricePickup: p.pricePickup,
                    priceStudent: p.priceStudent,
                    priceFinal: p.priceFinal,
                    image: p.image,
                    category: p.category
                }));

                // Save ALL products to cache for reuse during registration
                const allProducts = (scrapedData.products || []).map(p => ({
                    name: p.name,
                    description: p.description || '',
                    pricePickup: p.pricePickup,
                    priceStudent: p.priceStudent,
                    priceFinal: p.priceFinal,
                    image: p.image,
                    category: p.category,
                    ingredientsImage: p.ingredientsImage || '',
                    nutritionImage: p.nutritionImage || '',
                    unitSize: p.unitSize || '',
                    casePack: p.casePack || '',
                    pallet: p.pallet || { ti: 0, hi: 0 },
                    refrigerated: p.refrigerated || false,
                    ingredientsText: p.ingredientsText || '',
                    nutritionText: p.nutritionText || '',
                    sourceUrl: p.sourceUrl || websiteUrl,
                    attributes: p.attributes || {
                        freezable: false,
                        glutenFree: false,
                        vegetarian: false,
                        vegan: false,
                        nutFree: false,
                        halal: false,
                        kosher: false,
                        organic: false,
                        quebecProduct: false,
                        allergens: ''
                    }
                }));

                await ScrapingCache.findOneAndUpdate(
                    { websiteUrl: normalizedUrl },
                    {
                        websiteUrl: normalizedUrl,
                        companyInfo: scrapedData.companyInfo || {},
                        sampleProducts: sampleProducts,
                        allProducts: allProducts, // Save ALL products
                        totalProductsFound: scrapedData.products?.length || 0,
                        scrapedAt: new Date()
                    },
                    { upsert: true, new: true }
                );
                console.log('💾 Saved scraping data to cache (including all products)');
            } catch (cacheError) {
                console.error('Error saving to cache:', cacheError);
                // Don't fail scraping if cache save fails
            }
        }

        // Retourner les données extraites
        res.status(200).json({
            success: true,
            data: scrapedData,
            cached: false
        });

    } catch (error) {
        console.error('Error scraping website:', error);
        res.status(500).json({
            message: error.message || 'Erreur lors du scraping du site web',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

