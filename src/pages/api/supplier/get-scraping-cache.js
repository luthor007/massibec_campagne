// src/pages/api/supplier/get-scraping-cache.js
import dbConnect from '../../../lib/mongodb';
import ScrapingCache from '../../../models/ScrapingCache';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            // Check if caching is enabled (default: true)
            const useCache = process.env.ENABLE_SCRAPING_CACHE !== 'false';

            if (!useCache) {
                return res.status(200).json({
                    success: false,
                    message: 'Cache désactivé',
                    cached: false
                });
            }

            await dbConnect();

            const { websiteUrl } = req.query;

            if (!websiteUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'URL du site web requise'
                });
            }

            // Normalize URL (remove trailing slash, convert to lowercase for domain)
            const normalizedUrl = websiteUrl.trim().replace(/\/$/, '');

            // Find cached scraping data
            const cache = await ScrapingCache.findOne({
                websiteUrl: normalizedUrl
            });

            if (!cache) {
                return res.status(200).json({
                    success: false,
                    message: 'Aucune donnée de scraping trouvée pour cette URL',
                    cached: false
                });
            }

            // Check if cache is still fresh (less than 2 months old)
            const cacheAge = Date.now() - new Date(cache.scrapedAt).getTime();
            const twoMonths = 60 * 24 * 60 * 60 * 1000; // 60 days
            const isFresh = cacheAge < twoMonths;

            return res.status(200).json({
                success: true,
                cached: true,
                isFresh,
                data: {
                    companyInfo: cache.companyInfo || {},
                    sampleProducts: cache.sampleProducts || [],
                    totalProductsFound: cache.totalProductsFound || 0,
                    scrapedAt: cache.scrapedAt
                }
            });
        } catch (error) {
            console.error('Error fetching scraping cache:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération du cache'
            });
        }
    } else {
        res.status(405).json({ message: 'Méthode non autorisée' });
    }
}

