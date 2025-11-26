import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import Supplier from '../../models/Supplier';
import SupplierManager from '../../models/SupplierManager';
import School from '../../models/School';
import SchoolManager from '../../models/SchoolManager';
import Product from '../../models/Product';
import ScrapingCache from '../../models/ScrapingCache';
import { sendVerificationEmail } from '../../utils/gmailMailer';
import { scrapeSupplierWebsite } from '../../lib/services/supplierScraper';
import { scrapeSupplierWebsiteGemini } from '../../lib/services/supplierScraperGemini';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        try {
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        } catch (error) {
            console.error('Error creating upload directory:', error);
            cb(error, null);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'supplier-logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Disable body parser to handle file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// Sanitize function to handle special characters
const sanitizeString = (str) => {
    return str ? str.normalize('NFC').trim() : str;
};

// Helper function to create products from cached data
async function createProductsFromCache(supplierId, cache) {
    try {
        await dbConnect();

        const supplierRecord = await Supplier.findById(supplierId).select('companyEmail email logo pricingSettings');
        const canOverwriteCompanyEmail = !supplierRecord?.companyEmail || supplierRecord.companyEmail === supplierRecord.email;
        // Only overwrite logo if supplier doesn't have a custom uploaded logo (logos in /uploads/logos/ are user-uploaded)
        const hasCustomLogo = supplierRecord?.logo && supplierRecord.logo.startsWith('/uploads/logos/');
        const canOverwriteLogo = !hasCustomLogo;

        // Get supplier pricing settings
        const pricingSettings = supplierRecord?.pricingSettings || { markup: 5, handlesShipping: false };
        const markupMultiplier = 1 + (pricingSettings.markup / 100);

        // Update supplier with cached company info
        const updateData = {
            scrapedAt: new Date(cache.scrapedAt),
            scrapingStatus: 'completed'
        };

        if (cache.companyInfo) {
            const companyInfo = cache.companyInfo;
            if (companyInfo.phone) updateData.phone = companyInfo.phone;
            if (companyInfo.email && canOverwriteCompanyEmail) {
                updateData.companyEmail = companyInfo.email.toLowerCase().trim();
            }
            if (companyInfo.description) {
                let description = companyInfo.description;
                if (description.length > 1000) {
                    description = description.substring(0, 997) + '...';
                }
                updateData.description = description;
            }
            if (companyInfo.logo && canOverwriteLogo) updateData.logo = companyInfo.logo;
            if (companyInfo.address) updateData.address = companyInfo.address;
            if (companyInfo.certifications && companyInfo.certifications.length > 0) {
                updateData.certifications = companyInfo.certifications;
            }
            if (companyInfo.storageType) {
                updateData.storageType = companyInfo.storageType;
            }
        }

        await Supplier.findByIdAndUpdate(supplierId, updateData);

        // Create products from cached data
        if (cache.allProducts && cache.allProducts.length > 0) {
            const productsToCreate = cache.allProducts.map((productData, index) => {
                let pricePickup = productData.pricePickup;
                if (pricePickup === undefined || pricePickup === null || pricePickup === 0) {
                    if (productData.priceStudent && productData.priceStudent > 0) {
                        pricePickup = Math.round((productData.priceStudent / 1.20) * 100) / 100;
                    } else if (productData.priceFinal && productData.priceFinal > 0) {
                        pricePickup = Math.round((productData.priceFinal / 1.20 / 1.30) * 100) / 100;
                    } else if (productData.price && productData.price > 0) {
                        pricePickup = Math.round((productData.price / 1.20) * 100) / 100;
                    } else {
                        pricePickup = 0;
                    }
                }
                pricePickup = Number(pricePickup) || 0;
                // Calculate price from pricePickup (pricePickup * markup + deliveryCostToSchool)
                // Note: deliveryCostToSchool will be calculated later, so we just use base price here
                // The Product model's pre-save hook will recalculate correctly with deliveryCostToSchool
                const calculatedPrice = Math.round((pricePickup * markupMultiplier) * 100) / 100;

                let description = productData.description || '';
                // Ensure description is not empty (required field)
                if (!description || description.trim() === '') {
                    description = productData.name ? `Description pour ${productData.name}` : `Description du produit ${index + 1}`;
                }
                if (description.length > 1000) {
                    description = description.substring(0, 997) + '...';
                }

                return {
                    name: productData.name || `Produit ${index + 1}`,
                    description: description,
                    pricePickup: pricePickup,
                    price: calculatedPrice,
                    cost: 0,
                    image: productData.image || '',
                    ingredientsImage: productData.ingredientsImage || '',
                    nutritionImage: productData.nutritionImage || '',
                    productId: Math.floor(Math.random() * 900000) + 100000,
                    supplier: supplierId,
                    order: index,
                    unitSize: productData.unitSize || '',
                    casePack: productData.casePack || '',
                    pallet: productData.pallet || { ti: 0, hi: 0 },
                    refrigerated: productData.refrigerated || false,
                    category: productData.category || '',
                    ingredientsText: productData.ingredientsText || '',
                    nutritionText: productData.nutritionText || '',
                    sourceUrl: productData.sourceUrl || '',
                    attributes: productData.attributes || {
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
                };
            });

            if (productsToCreate.length > 0) {
                await Product.insertMany(productsToCreate);
                console.log(`✅ Created ${productsToCreate.length} products from cache for supplier ${supplierId}`);
            }
        }
    } catch (error) {
        console.error('Error creating products from cache:', error);
        throw error;
    }
}

// Background function to scrape website and save products
async function scrapeAndSaveProducts(supplierId, websiteUrl, useGemini = true) {
    try {
        await dbConnect();

        // Update supplier status to pending
        await Supplier.findByIdAndUpdate(supplierId, {
            scrapingStatus: 'pending'
        });

        const supplierRecord = await Supplier.findById(supplierId).select('companyEmail email logo');
        const canOverwriteCompanyEmail = !supplierRecord?.companyEmail || supplierRecord.companyEmail === supplierRecord.email;
        // Only overwrite logo if supplier doesn't have a custom uploaded logo (logos in /uploads/logos/ are user-uploaded)
        const hasCustomLogo = supplierRecord?.logo && supplierRecord.logo.startsWith('/uploads/logos/');
        const canOverwriteLogo = !hasCustomLogo;

        // Check if caching is enabled (default: true)
        //const useCache = process.env.ENABLE_SCRAPING_CACHE !== 'false';
        const useCache = true;

        // Normalize URL for cache lookup
        const normalizedUrl = websiteUrl.trim().replace(/\/$/, '');

        // Check cache first if enabled
        let scrapedData;
        let fromCache = false;
        if (useCache) {
            let cache = await ScrapingCache.findOne({ websiteUrl: normalizedUrl });

            if (cache) {
                console.log('🔍 Cache trouvé pour:', normalizedUrl);
                console.log('   - Cache age:', cache.scrapedAt ? new Date(cache.scrapedAt).toISOString() : 'N/A');
                console.log('   - CompanyInfo:', cache.companyInfo ? 'Oui' : 'Non');
                console.log('   - allProducts:', cache.allProducts ? `${cache.allProducts.length} produits` : 'Non');
                console.log('   - sampleProducts:', cache.sampleProducts ? `${cache.sampleProducts.length} produits` : 'Non');
            } else {
                console.log('❌ Aucun cache trouvé pour:', normalizedUrl);
            }

            // Check if cache exists and is fresh (less than 2 months old)
            if (cache && cache.companyInfo) {
                const cacheAge = Date.now() - new Date(cache.scrapedAt).getTime();
                const twoMonths = 60 * 24 * 60 * 60 * 1000; // 60 days
                const isFresh = cacheAge < twoMonths;

                console.log('   - Cache age (ms):', cacheAge);
                console.log('   - Is fresh (< 2 mois):', isFresh);

                if (isFresh && cache.allProducts && cache.allProducts.length > 0) {
                    const cacheAgeDays = Math.round(cacheAge / (24 * 60 * 60 * 1000));
                    console.log('📦 Using fresh cached scraping data for supplier registration (cache age:', cacheAgeDays, 'days,', cache.allProducts.length, 'products)');
                    fromCache = true;
                    // Use cached data with ALL products
                    scrapedData = {
                        companyInfo: cache.companyInfo,
                        products: cache.allProducts // Use ALL products from cache
                    };
                } else {
                    if (!isFresh) {
                        console.log('⚠️ Cache trop vieux (> 2 mois)');
                    }
                    if (!cache.allProducts || cache.allProducts.length === 0) {
                        console.log('⚠️ Cache sans allProducts ou allProducts vide');
                    }
                }
            } else if (cache && !cache.companyInfo) {
                console.log('⚠️ Cache trouvé mais sans companyInfo');
            }
        }

        // If no fresh cache with products, scrape the website
        if (!fromCache) {
            // Scrape the website with Gemini (default)
            if (useGemini) {
                console.log('🔮 Using Gemini scraper for supplier registration (cache not found, stale, or missing products)');
                scrapedData = await scrapeSupplierWebsiteGemini(websiteUrl);
            } else {
                console.log('🔥 Using Firecrawl scraper for supplier registration');
                scrapedData = await scrapeSupplierWebsite(websiteUrl);
            }

            // Save to cache for future use if caching is enabled
            if (useCache && scrapedData) {
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

                    // Save ALL products to cache
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
                    // Don't fail registration if cache save fails
                }
            }
        }

        // Update supplier with scraped company info
        const updateData = {
            scrapedAt: new Date(),
            scrapingStatus: 'completed'
        };

        // Update company info if found
        if (scrapedData.companyInfo) {
            const companyInfo = scrapedData.companyInfo;
            // Don't update email if it already exists (to avoid duplicate key errors)
            // The email from scraped data might be different from the one used during registration
            // if (companyInfo.email) updateData.email = companyInfo.email.toLowerCase().trim();
            // Update companyEmail if found in scraped data (this is the email shown to schools)
            if (companyInfo.email && canOverwriteCompanyEmail) {
                updateData.companyEmail = companyInfo.email.toLowerCase().trim();
            }
            if (companyInfo.phone) updateData.phone = companyInfo.phone;
            if (companyInfo.description) {
                // Truncate description to 1000 characters (Mongoose limit)
                let description = companyInfo.description;
                if (description.length > 1000) {
                    description = description.substring(0, 997) + '...';
                }
                updateData.description = description;
            }
            if (companyInfo.logo && canOverwriteLogo) updateData.logo = companyInfo.logo;
            if (companyInfo.address) updateData.address = companyInfo.address;
            if (companyInfo.certifications && companyInfo.certifications.length > 0) {
                updateData.certifications = companyInfo.certifications;
            }
            if (companyInfo.storageType) {
                updateData.storageType = companyInfo.storageType;
            }
        }

        await Supplier.findByIdAndUpdate(supplierId, updateData);

        // Create products from scraped data
        if (scrapedData.products && scrapedData.products.length > 0) {
            const productsToCreate = scrapedData.products.map((productData, index) => {
                // Use pricePickup from scraped data
                // Fallback: if pricePickup is missing, try to calculate from priceStudent or priceFinal
                // or use 0 as last resort
                let pricePickup = productData.pricePickup;
                if (pricePickup === undefined || pricePickup === null || pricePickup === 0) {
                    // Try to reverse-calculate from priceStudent (priceStudent / 1.20)
                    if (productData.priceStudent && productData.priceStudent > 0) {
                        pricePickup = Math.round((productData.priceStudent / 1.20) * 100) / 100;
                    }
                    // Or try from priceFinal (priceFinal / 1.20 / 1.30)
                    else if (productData.priceFinal && productData.priceFinal > 0) {
                        pricePickup = Math.round((productData.priceFinal / 1.20 / 1.30) * 100) / 100;
                    }
                    // Or try from price (if it exists, reverse the 1.20 calculation)
                    else if (productData.price && productData.price > 0) {
                        pricePickup = Math.round((productData.price / 1.20) * 100) / 100;
                    }
                    // Last resort: default to 0
                    else {
                        pricePickup = 0;
                    }
                }
                // Ensure pricePickup is a valid number
                pricePickup = Number(pricePickup) || 0;

                // Calculate price from pricePickup (pricePickup * markup + deliveryCostToSchool)
                // Note: deliveryCostToSchool will be calculated later, so we just use base price here
                // The Product model's pre-save hook will recalculate correctly with deliveryCostToSchool
                const calculatedPrice = Math.round((pricePickup * markupMultiplier) * 100) / 100;

                // Truncate description to 1000 characters (Mongoose limit)
                let description = productData.description || '';
                if (description.length > 1000) {
                    description = description.substring(0, 997) + '...';
                }

                return {
                    name: productData.name || `Produit ${index + 1}`,
                    description: description,
                    pricePickup: pricePickup, // Required field
                    price: calculatedPrice, // Calculated from pricePickup * markup (will be recalculated by Product model pre-save hook with deliveryCostToSchool)
                    cost: 0, // Optional, default to 0
                    image: productData.image || '',
                    ingredientsImage: productData.ingredientsImage || '',
                    nutritionImage: productData.nutritionImage || '',
                    productId: Math.floor(Math.random() * 900000) + 100000, // 6-digit number
                    supplier: supplierId,
                    order: index,
                    // Logistical information
                    unitSize: productData.unitSize || '',
                    casePack: productData.casePack || '',
                    pallet: productData.pallet || { ti: 0, hi: 0 },
                    refrigerated: productData.refrigerated || false,
                    category: productData.category || '',
                    ingredientsText: productData.ingredientsText || '',
                    nutritionText: productData.nutritionText || '',
                    sourceUrl: productData.sourceUrl || websiteUrl,
                    // Attributes
                    attributes: {
                        freezable: productData.attributes?.freezable || false,
                        glutenFree: productData.attributes?.glutenFree || false,
                        vegetarian: productData.attributes?.vegetarian || false,
                        vegan: productData.attributes?.vegan || false,
                        nutFree: productData.attributes?.nutFree || false,
                        halal: productData.attributes?.halal || false,
                        kosher: productData.attributes?.kosher || false,
                        organic: productData.attributes?.organic || false,
                        quebecProduct: productData.attributes?.quebecProduct || false,
                        allergens: (productData.allergens || []).join(', ') || ''
                    }
                };
            });

            // Insert products in batch
            if (productsToCreate.length > 0) {
                await Product.insertMany(productsToCreate);
                console.log(`Created ${productsToCreate.length} products for supplier ${supplierId}`);
            }
        }
    } catch (error) {
        console.error('Error in scrapeAndSaveProducts:', error);
        // Update supplier status to failed
        await Supplier.findByIdAndUpdate(supplierId, {
            scrapingStatus: 'failed'
        });
        throw error;
    }
}

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            await dbConnect();

            // Handle file upload with multer
            await new Promise((resolve, reject) => {
                upload.single('logo')(req, res, (err) => {
                    if (err) {
                        console.error('Multer error:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            // Extract and sanitize fields from req.body (after multer processing)
            const {
                nomComplet,
                email,
                motDePasse,
                confirmationMotDePasse,
                nomEntreprise,
                telephone,
                companyEmail,
                adresse,
                ville,
                codePostal,
                description,
                website,
                logoUrl,
                skipVerification
                // Payment info removed - can be added later in settings
            } = req.body;

            // Check if we should skip email verification
            const shouldSkipVerification = skipVerification === 'true' || skipVerification === true;

            // Validate required fields
            if (!nomComplet || !email || !motDePasse || !confirmationMotDePasse ||
                !nomEntreprise || !telephone || !adresse) {
                return res.status(400).json({
                    message: 'Tous les champs requis doivent être remplis'
                });
            }

            // Validate companyEmail format if provided
            if (companyEmail && companyEmail.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(companyEmail.trim())) {
                    return res.status(400).json({ message: 'Format d\'email entreprise invalide.' });
                }
            }

            // Validate password confirmation
            if (motDePasse !== confirmationMotDePasse) {
                return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
            }

            // Sanitize inputs
            const sanitizedName = sanitizeString(nomComplet);
            const sanitizedEmail = email ? email.toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, '') : '';
            const sanitizedNomEntreprise = sanitizeString(nomEntreprise);
            const sanitizedTelephone = sanitizeString(telephone);
            const sanitizedCompanyEmail = companyEmail ? companyEmail.toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, '') : '';
            const sanitizedAdresse = sanitizeString(adresse);
            const sanitizedVille = sanitizeString(ville);
            const sanitizedCodePostal = sanitizeString(codePostal);
            let sanitizedDescription = sanitizeString(description);

            // Truncate description to 1000 characters (Mongoose limit)
            if (sanitizedDescription && sanitizedDescription.length > 1000) {
                sanitizedDescription = sanitizedDescription.substring(0, 997) + '...';
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sanitizedEmail)) {
                return res.status(400).json({ message: 'Format d\'email invalide.' });
            }

            // Check if email already exists in User or Supplier
            let existingUser = await User.findOne({ email: sanitizedEmail });
            if (existingUser) {
                return res.status(400).json({
                    message: 'Cette adresse e-mail est déjà utilisée.',
                    code: 'EMAIL_EXISTS'
                });
            }

            // Check if email already exists in Supplier collection
            const existingSupplierByEmail = await Supplier.findOne({ email: sanitizedEmail });
            if (existingSupplierByEmail) {
                return res.status(400).json({
                    message: 'Cette adresse e-mail est déjà utilisée.',
                    code: 'EMAIL_EXISTS'
                });
            }

            // Check if supplier name already exists
            const existingSupplier = await Supplier.findOne({ name: sanitizedNomEntreprise });
            if (existingSupplier) {
                return res.status(400).json({
                    message: 'Ce nom d\'entreprise est déjà utilisé.'
                });
            }

            // Handle logo upload
            let logoFilename = null;
            if (req.file) {
                // Logo is already saved by multer, just get the filename
                logoFilename = `/uploads/logos/${req.file.filename}`;
            } else if (logoUrl && logoUrl.trim()) {
                // Use scraped logo URL if no file was uploaded
                logoFilename = logoUrl.trim();
            }

            // Generate verification token (only if not skipping verification)
            let verificationToken = null;
            let verificationTokenExpires = null;
            if (!shouldSkipVerification) {
                verificationToken = crypto.randomBytes(32).toString('hex');
                verificationTokenExpires = new Date();
                verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);
            }

            // Create Supplier (auto-approved)
            const newSupplier = new Supplier({
                name: sanitizedNomEntreprise,
                email: sanitizedEmail, // Personal email for account/login
                companyEmail: sanitizedCompanyEmail || sanitizedEmail, // Company email (fallback to personal email if not provided)
                phone: sanitizedTelephone,
                address: sanitizedAdresse,
                ville: sanitizedVille,
                codePostal: sanitizedCodePostal,
                logo: logoFilename || '',
                description: sanitizedDescription || '',
                website: website ? sanitizeString(website) : '',
                status: 'active',
                approved: true, // Auto-approved as per requirements
                approvedAt: new Date(),
                scrapingStatus: website ? 'pending' : 'pending'
                // companyInfo and paymentInfo can be added later in settings
            });

            await newSupplier.save();

            // Hash the password
            const hashedPassword = bcrypt.hashSync(motDePasse, 10);

            // Create the user with supplier role
            const newUser = new User({
                email: sanitizedEmail,
                password: hashedPassword,
                name: sanitizedName,
                role: 'supplier',
                supplierManagerInfo: {
                    titreOuFonction: 'Propriétaire',
                    organisme: newSupplier._id,
                    ville: sanitizedVille || 'À compléter',
                    codePostal: sanitizedCodePostal || 'À compléter',
                    telephone: sanitizedTelephone,
                    momentPourJoindre: 'Toute la journée'
                },
                verificationToken: verificationToken,
                verificationTokenExpires: verificationTokenExpires,
                emailVerified: shouldSkipVerification, // Set to true if skipping verification
                profileCompleted: false
            });

            await newUser.save();

            // Create SupplierManager record for the owner
            const supplierManager = new SupplierManager({
                supplier: newSupplier._id,
                user: newUser._id,
                role: 'owner',
                invitedBy: newUser._id,
                status: 'active',
                joinedAt: new Date()
            });

            await supplierManager.save();

            // Automatically create a school for the supplier using their company information
            // This allows suppliers to immediately access the school portal and create campaigns
            let supplierSchool = null;
            try {
                // Use supplier's company name as the school name
                const schoolName = sanitizedNomEntreprise;

                supplierSchool = new School({
                    name: schoolName,
                    address: sanitizedAdresse || '',
                    ville: sanitizedVille || '',
                    codePostal: sanitizedCodePostal || '',
                    telephone: sanitizedTelephone || '',
                    email: sanitizedEmail,
                    logo: logoFilename || '',
                    organizationType: 'school',
                    approved: true, // Auto-approve school for suppliers
                    status: 'approved',
                    profileCompleted: true, // Mark as completed since we have all info from supplier
                    currentCampaignNumber: 0
                });

                await supplierSchool.save();

                // Create SchoolManager to link supplier to the school
                const schoolManager = new SchoolManager({
                    school: supplierSchool._id,
                    user: newUser._id,
                    role: 'owner',
                    invitedBy: newUser._id,
                    status: 'active',
                    joinedAt: new Date()
                });

                await schoolManager.save();

                console.log('✅ School automatically created for supplier:', supplierSchool.name);
            } catch (schoolError) {
                console.error('⚠️ Error creating school for supplier:', schoolError);
                // Don't fail registration if school creation fails, but log it
            }

            // Send verification email (only if not skipping verification)
            if (!shouldSkipVerification) {
                try {
                    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
                    await sendVerificationEmail({
                        to: sanitizedEmail,
                        subject: 'Vérification de votre compte Jappuie',
                        firstName: sanitizedName,
                        verificationUrl: verificationUrl
                    });
                } catch (emailError) {
                    console.error('Error sending verification email:', emailError);
                    // Don't fail registration if email fails
                }
            } else {
                console.log('⏭️ Skipping email verification (skipVerification=true)');
            }

            // Start scraping in background if website is provided
            // BUT: Check cache first - if cache exists and is fresh, use it directly (no scraping)
            if (website && website.trim()) {
                const normalizedUrl = website.trim().replace(/\/$/, '');
                const useCache = process.env.ENABLE_SCRAPING_CACHE !== 'false';

                // Check cache first before calling scrapeAndSaveProducts
                if (useCache) {
                    try {
                        const cache = await ScrapingCache.findOne({ websiteUrl: normalizedUrl });

                        if (cache && cache.companyInfo && cache.allProducts && cache.allProducts.length > 0) {
                            const cacheAge = Date.now() - new Date(cache.scrapedAt).getTime();
                            const twoMonths = 60 * 24 * 60 * 60 * 1000; // 60 days
                            const isFresh = cacheAge < twoMonths;

                            if (isFresh) {
                                const cacheAgeDays = Math.round(cacheAge / (24 * 60 * 60 * 1000));
                                console.log('📦 Cache frais trouvé lors de l\'inscription - création des produits depuis le cache (PAS de re-scraping)');
                                console.log(`   - Cache age: ${cacheAgeDays} days`);
                                console.log(`   - Produits dans le cache: ${cache.allProducts.length}`);

                                // Create products from cache directly (no scraping)
                                createProductsFromCache(newSupplier._id, cache).catch(error => {
                                    console.error('Error creating products from cache:', error);
                                    // Update supplier status to failed
                                    Supplier.findByIdAndUpdate(newSupplier._id, {
                                        scrapingStatus: 'failed'
                                    }).catch(updateError => {
                                        console.error('Error updating scraping status:', updateError);
                                    });
                                });

                                // Skip scraping - we're done
                                // Don't call scrapeAndSaveProducts
                            } else {
                                console.log('⚠️ Cache trouvé mais trop vieux (> 2 mois) - re-scraping nécessaire');
                                // Cache is stale, proceed with scraping
                                scrapeAndSaveProducts(newSupplier._id, website, true).catch(error => {
                                    console.error('Error in background scraping:', error);
                                    Supplier.findByIdAndUpdate(newSupplier._id, {
                                        scrapingStatus: 'failed'
                                    }).catch(updateError => {
                                        console.error('Error updating scraping status:', updateError);
                                    });
                                });
                            }
                        } else {
                            console.log('⚠️ Cache non trouvé ou incomplet - scraping nécessaire');
                            // No cache or incomplete cache, proceed with scraping
                            scrapeAndSaveProducts(newSupplier._id, website, true).catch(error => {
                                console.error('Error in background scraping:', error);
                                Supplier.findByIdAndUpdate(newSupplier._id, {
                                    scrapingStatus: 'failed'
                                }).catch(updateError => {
                                    console.error('Error updating scraping status:', updateError);
                                });
                            });
                        }
                    } catch (cacheError) {
                        console.error('Error checking cache:', cacheError);
                        // On error checking cache, proceed with scraping as fallback
                        scrapeAndSaveProducts(newSupplier._id, website, true).catch(error => {
                            console.error('Error in background scraping:', error);
                            Supplier.findByIdAndUpdate(newSupplier._id, {
                                scrapingStatus: 'failed'
                            }).catch(updateError => {
                                console.error('Error updating scraping status:', updateError);
                            });
                        });
                    }
                } else {
                    // Cache disabled, proceed with scraping
                    scrapeAndSaveProducts(newSupplier._id, website, true).catch(error => {
                        console.error('Error in background scraping:', error);
                        Supplier.findByIdAndUpdate(newSupplier._id, {
                            scrapingStatus: 'failed'
                        }).catch(updateError => {
                            console.error('Error updating scraping status:', updateError);
                        });
                    });
                }
            }

            res.status(200).json({
                message: 'Compte fournisseur créé avec succès',
                user: {
                    id: newUser._id.toString(),
                    email: newUser.email,
                    role: newUser.role
                },
                supplier: {
                    id: newSupplier._id.toString(),
                    name: newSupplier.name,
                    approved: newSupplier.approved,
                    scrapingStatus: newSupplier.scrapingStatus
                }
            });

        } catch (error) {
            // Handle MongoDB duplicate key errors
            if (error.code === 11000 || error.codeName === 'DuplicateKey') {
                const field = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'field';
                let message = 'Cette information est déjà utilisée.';

                if (field === 'email') {
                    message = 'Cette adresse e-mail est déjà utilisée.';
                } else if (field === 'name') {
                    message = 'Ce nom d\'entreprise est déjà utilisé.';
                }

                return res.status(400).json({
                    message: message,
                    code: 'DUPLICATE_KEY',
                    field: field
                });
            }

            // Handle other errors
            console.error('Error in supplier registration:', error);
            res.status(500).json({
                message: 'Erreur lors de la création du compte fournisseur',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).json({ message: 'Méthode non autorisée' });
    }
}

