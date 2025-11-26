import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
import Campaign from '../../../models/Campaign';
import User from '../../../models/User';
import SupplierManager from '../../../models/SupplierManager';
import mongoose from 'mongoose';
import { getToken } from 'next-auth/jwt';
import { calculateDeliveryCostPerProduct } from '../../../lib/deliveryCalculator';

const roundToTwoDecimals = (value) => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return 0;
    return Math.round((numericValue + Number.EPSILON) * 100) / 100;
};

const buildAddressString = (entity) => {
    if (!entity) return null;
    const parts = [];
    if (entity.address) parts.push(entity.address);
    if (entity.ville) parts.push(entity.ville);
    if (entity.codePostal) parts.push(entity.codePostal);
    if (parts.length === 0) return null;
    if (!parts[parts.length - 1]?.toLowerCase?.().includes('canada')) {
        parts.push('Canada');
    }
    return parts.join(', ');
};

const estimateDeliveryCostForProduct = (productDoc, supplierAddress, schoolAddress) => {
    if (!productDoc || !supplierAddress || !schoolAddress) return null;
    const ti = productDoc.pallet?.ti || 0;
    const hi = productDoc.pallet?.hi || 0;
    if (ti <= 0 || hi <= 0) return null;
    const casePackValue = parseInt(productDoc.casePack, 10) || 1;
    const productsPerPallet = ti * hi * casePackValue;
    const halfPalletQuantity = Math.max(1, Math.floor(productsPerPallet * 0.5));
    if (!halfPalletQuantity) return null;

    try {
        return calculateDeliveryCostPerProduct({
            product: productDoc,
            supplierAddress,
            schoolAddress,
            totalQuantity: halfPalletQuantity,
            requiresTailgate: false,
            isLimitedAccess: false
        });
    } catch (error) {
        console.error('Error estimating delivery cost (supplier schools API):', productDoc?._id || productDoc?.name, error);
        return null;
    }
};

const deriveDeliveryCostValue = (productDoc, supplierAddress, schoolAddress) => {
    if (!productDoc) return 0;
    const storedDeliveryCost = Number(productDoc.deliveryCostToSchool);
    if (!Number.isNaN(storedDeliveryCost) && storedDeliveryCost > 0) {
        return roundToTwoDecimals(storedDeliveryCost);
    }
    const estimated = estimateDeliveryCostForProduct(productDoc, supplierAddress, schoolAddress);
    if (estimated === null || estimated === undefined) {
        return 0;
    }
    return roundToTwoDecimals(estimated);
};

export default async function handler(req, res) {
    await dbConnect();

    if (req.method === 'GET') {
        try {
            // Get authenticated supplier user
            const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
            if (!token || token.role !== 'supplier') {
                return res.status(401).json({ message: 'Non autorisé' });
            }

            // Get supplier for this user
            const supplierManager = await SupplierManager.findOne({
                user: token.sub,
                status: 'active'
            }).populate('supplier');

            if (!supplierManager || !supplierManager.supplier) {
                return res.status(404).json({ message: 'Fournisseur non trouvé' });
            }

            const supplierId = supplierManager.supplier._id;
            const supplierAddressString = buildAddressString(supplierManager.supplier);

            // Get supplier pricing settings
            const Supplier = mongoose.models.Supplier || (await import('../../../models/Supplier')).default;
            const supplier = await Supplier.findById(supplierId).lean();
            const pricingSettings = supplier?.pricingSettings || { markup: 5, handlesShipping: false };
            const markupMultiplier = 1 + (pricingSettings.markup / 100);

            // Find all campaigns for this supplier
            // Don't use populate since productId might reference Bundle, not Product
            // We'll manually fetch products and bundles instead
            const campaigns = await Campaign.find({ supplier: supplierId }).lean();

            // Collect school IDs referenced in campaigns
            const schoolIdsSet = new Set(campaigns.map(c => {
                if (c.school && c.school._id) {
                    return c.school._id.toString();
                }
                return c.school ? (c.school.toString ? c.school.toString() : String(c.school)) : null;
            }).filter(Boolean));

            if (schoolIdsSet.size === 0) {
                return res.status(200).json([]);
            }

            const schoolIds = Array.from(schoolIdsSet);
            const schoolObjectIds = schoolIds.map(id => new mongoose.Types.ObjectId(id));

            // Fetch schools that have campaigns with this supplier
            const allSchools = await School.find({ _id: { $in: schoolObjectIds } })
                .select('name address ville codePostal telephone email logo status approved activeCampaignId createdAt split')
                .lean()
                .catch(error => {
                    console.error('Error fetching schools:', error);
                    return [];
                });

            const validSchools = (allSchools || []).filter(school => {
                try {
                    return school && school._id && school.name && typeof school.name === 'string';
                } catch (e) {
                    console.error('Corrupted school detected:', school?._id);
                    return false;
                }
            });

            const schoolMap = new Map(validSchools.map(school => [school._id.toString(), school]));
            const schoolAddressCache = new Map();
            const getSchoolAddressString = (schoolId) => {
                if (!schoolId) return null;
                if (schoolAddressCache.has(schoolId)) {
                    return schoolAddressCache.get(schoolId);
                }
                const schoolRecord = schoolMap.get(schoolId);
                const addressString = buildAddressString(schoolRecord);
                schoolAddressCache.set(schoolId, addressString);
                return addressString;
            };

            // Manually fetch all products and bundles referenced in campaigns
            // Since productId might reference either Product or Bundle, we need to check both
            const Bundle = mongoose.models.Bundle || (await import('../../../models/Bundle')).default;
            const Product = mongoose.models.Product || (await import('../../../models/Product')).default;

            // Get all product IDs from customPrices and profitSplits
            const allProductIds = new Set();
            campaigns.forEach(campaign => {
                if (campaign.customPrices) {
                    campaign.customPrices.forEach(cp => {
                        if (cp.productId) {
                            // Extract ID - productId should be an ObjectId at this point
                            const id = cp.productId.toString ? cp.productId.toString() : String(cp.productId);
                            if (id && mongoose.Types.ObjectId.isValid(id)) {
                                allProductIds.add(id);
                            }
                        }
                    });
                }
                if (campaign.profitSplits) {
                    campaign.profitSplits.forEach(ps => {
                        if (ps.productId) {
                            // Extract ID - productId should be an ObjectId at this point
                            const id = ps.productId.toString ? ps.productId.toString() : String(ps.productId);
                            if (id && mongoose.Types.ObjectId.isValid(id)) {
                                allProductIds.add(id);
                            }
                        }
                    });
                }
            });

            // Fetch all bundles and products in parallel
            const uniqueProductIds = Array.from(allProductIds);
            const objectIds = uniqueProductIds.map(id => new mongoose.Types.ObjectId(id));

            const [bundles, products] = await Promise.all([
                objectIds.length > 0
                    ? Bundle.find({ _id: { $in: objectIds } })
                        .select('name price cost deliveryCostToSchool image description isBundle casePack pallet')
                        .lean()
                    : Promise.resolve([]),
                objectIds.length > 0
                    ? Product.find({ _id: { $in: objectIds } })
                        .select('name price cost pricePickup deliveryCostToSchool image description isBundle casePack pallet')
                        .lean()
                    : Promise.resolve([])
            ]);

            // Create maps for quick lookup
            const bundleMap = new Map(bundles.map(b => [b._id.toString(), b]));
            const productMap = new Map(products.map(p => [p._id.toString(), p]));

            const computeAcquisitionCost = (productDoc, schoolAddress) => {
                if (!productDoc) return 0;

                // IMPORTANT: productDoc.price is the ROUNDED price and is the source of truth
                // Always prefer productDoc.price over computed values when available
                const storedPrice = Number(productDoc.price);
                if (!Number.isNaN(storedPrice) && storedPrice > 0) {
                    // product.price is already rounded to nearest 5 cents - use it directly
                    return storedPrice;
                }

                // Fallback: use stored cost if available (ensure it's rounded)
                const storedCost = Number(productDoc.cost);
                if (!Number.isNaN(storedCost) && storedCost > 0) {
                    // Round down to nearest 5 cents
                    return Math.floor(storedCost * 20) / 20;
                }

                // Last resort: calculate from pricePickup
                const handlesShipping = pricingSettings.handlesShipping || false;
                const deliveryCostValue = handlesShipping ? 0 : deriveDeliveryCostValue(productDoc, supplierAddressString, schoolAddress);
                const pricePickupValue = Number(productDoc.pricePickup);
                let basePriceComponent = 0;
                if (!Number.isNaN(pricePickupValue) && pricePickupValue > 0) {
                    basePriceComponent = pricePickupValue * markupMultiplier;
                }

                // Round down to nearest 5 cents - this is the REAL price for schools
                const totalPrice = basePriceComponent + deliveryCostValue;
                return Math.floor(totalPrice * 20) / 20;
            };

            const computeSchoolPrice = (productDoc, schoolAddress) => {
                // IMPORTANT: productDoc.price is the ROUNDED price and is the source of truth
                // Always use productDoc.price if available (it's already rounded)
                const storedPrice = Number(productDoc.price);
                if (!Number.isNaN(storedPrice) && storedPrice > 0) {
                    // product.price is already rounded to nearest 5 cents - use it directly
                    return storedPrice;
                }

                // Fallback: compute acquisition cost (which will also be rounded)
                return computeAcquisitionCost(productDoc, schoolAddress);
            };

            const computeBundleCost = (bundleDoc, fallbackPrice) => {
                if (!bundleDoc) {
                    const fallback = Number(fallbackPrice);
                    if (Number.isNaN(fallback)) return 0;
                    // Round down to nearest 5 cents
                    return Math.floor(fallback * 20) / 20;
                }

                // IMPORTANT: bundleDoc.price is the ROUNDED price and is the source of truth
                // Always prefer bundleDoc.price over computed values when available
                const storedPrice = Number(bundleDoc.price);
                if (!Number.isNaN(storedPrice) && storedPrice > 0) {
                    // bundle.price is already rounded to nearest 5 cents - use it directly
                    return storedPrice;
                }

                // Fallback: use stored cost if available (ensure it's rounded)
                const storedCost = Number(bundleDoc.cost);
                if (!Number.isNaN(storedCost) && storedCost > 0) {
                    // Round down to nearest 5 cents
                    return Math.floor(storedCost * 20) / 20;
                }

                // Last resort: use fallback price (ensure it's rounded)
                const fallback = Number(fallbackPrice);
                if (Number.isNaN(fallback)) return 0;
                // Round down to nearest 5 cents
                return Math.floor(fallback * 20) / 20;
            };

            // Replace ObjectId references with actual product/bundle data
            for (const campaign of campaigns) {
                const campaignSchoolId = campaign.school && campaign.school._id
                    ? campaign.school._id.toString()
                    : campaign.school
                        ? (campaign.school.toString ? campaign.school.toString() : String(campaign.school))
                        : null;
                const schoolAddress = getSchoolAddressString(campaignSchoolId);

                if (campaign.customPrices) {
                    for (const customPrice of campaign.customPrices) {
                        if (customPrice.productId) {
                            // Extract productId as string (should be ObjectId at this point)
                            const productIdStr = customPrice.productId.toString ?
                                customPrice.productId.toString() :
                                String(customPrice.productId);

                            // Check if it's a bundle first (bundles take priority)
                            const bundle = bundleMap.get(productIdStr);
                            if (bundle) {
                                customPrice.productId = {
                                    _id: bundle._id,
                                    name: bundle.name,
                                    image: bundle.image,
                                    description: bundle.description || '',
                                    price: customPrice.price !== undefined && customPrice.price !== null
                                        ? Number(customPrice.price)
                                        : computeBundleCost(bundle, bundle.price),
                                    cost: computeBundleCost(bundle, customPrice.price),
                                    isBundle: true
                                };
                            } else {
                                // Check if it's a product
                                const product = productMap.get(productIdStr);
                                if (product) {
                                    customPrice.productId = {
                                        _id: product._id,
                                        name: product.name,
                                        image: product.image,
                                        description: product.description || '',
                                        price: customPrice.price !== undefined && customPrice.price !== null
                                            ? Number(customPrice.price)
                                            : computeSchoolPrice(product, schoolAddress),
                                        cost: computeAcquisitionCost(product, schoolAddress),
                                        isBundle: product.isBundle || false
                                    };
                                } else {
                                    // Neither bundle nor product found - log warning
                                    console.warn('[supplier/schools] Product/Bundle not found for ID:', productIdStr);
                                    customPrice.productId = {
                                        _id: productIdStr,
                                        name: 'Produit introuvable',
                                        image: '',
                                        description: '',
                                        price: customPrice.price || 0,
                                        cost: Number(customPrice.price) || 0,
                                        isBundle: false
                                    };
                                }
                            }
                        }
                    }
                }
                if (campaign.profitSplits) {
                    for (const profitSplit of campaign.profitSplits) {
                        if (profitSplit.productId) {
                            // Extract productId as string (should be ObjectId at this point)
                            const productIdStr = profitSplit.productId.toString ?
                                profitSplit.productId.toString() :
                                String(profitSplit.productId);

                            // Check if it's a bundle first (bundles take priority)
                            const bundle = bundleMap.get(productIdStr);
                            if (bundle) {
                                profitSplit.productId = {
                                    _id: bundle._id,
                                    name: bundle.name,
                                    image: bundle.image,
                                    description: bundle.description || '',
                                    price: computeBundleCost(bundle, bundle.price),
                                    cost: computeBundleCost(bundle, bundle.price),
                                    isBundle: true
                                };
                            } else {
                                // Check if it's a product
                                const product = productMap.get(productIdStr);
                                if (product) {
                                    profitSplit.productId = {
                                        _id: product._id,
                                        name: product.name,
                                        image: product.image,
                                        description: product.description || '',
                                        price: computeSchoolPrice(product, schoolAddress),
                                        cost: computeAcquisitionCost(product, schoolAddress),
                                        isBundle: product.isBundle || false
                                    };
                                } else {
                                    // Neither bundle nor product found - log warning
                                    console.warn('[supplier/schools] Product/Bundle not found for profitSplit ID:', productIdStr);
                                    profitSplit.productId = {
                                        _id: productIdStr,
                                        name: 'Produit introuvable',
                                        image: '',
                                        description: '',
                                        price: 0,
                                        cost: 0,
                                        isBundle: false
                                    };
                                }
                            }

                            // Ensure profit split values are numbers (preserve existing values from database)
                            profitSplit.studentCash = profitSplit.studentCash !== undefined && profitSplit.studentCash !== null
                                ? Number(profitSplit.studentCash)
                                : (profitSplit.student !== undefined && profitSplit.student !== null ? Number(profitSplit.student) : 0);
                            profitSplit.studentSchoolAccount = profitSplit.studentSchoolAccount !== undefined && profitSplit.studentSchoolAccount !== null
                                ? Number(profitSplit.studentSchoolAccount)
                                : 0;
                            profitSplit.schoolProject = profitSplit.schoolProject !== undefined && profitSplit.schoolProject !== null
                                ? Number(profitSplit.schoolProject)
                                : (profitSplit.school !== undefined && profitSplit.school !== null ? Number(profitSplit.school) : 0);
                            profitSplit.raffle = profitSplit.raffle !== undefined && profitSplit.raffle !== null
                                ? Number(profitSplit.raffle)
                                : 0;
                        }
                    }
                }
            }

            // Récupérer les school managers pour chaque école
            const schoolManagers = await User.find({
                role: 'school_manager',
                'schoolManagerInfo.organisme': { $in: schoolIds }
            }).lean();

            // Enrichir chaque école avec ses campagnes (filtrées pour ce fournisseur) et informations de contact
            const schoolsWithCampaigns = validSchools.map(school => {
                try {
                    const schoolId = school._id.toString();

                    // Filter campaigns to only include those for this supplier
                    const schoolCampaigns = campaigns.filter(campaign => {
                        if (!campaign.school) return false;

                        // Handle both ObjectId and string formats (school is not populated, so it's an ObjectId)
                        const campaignSchoolId = campaign.school._id
                            ? campaign.school._id.toString()
                            : campaign.school.toString
                                ? campaign.school.toString()
                                : String(campaign.school);

                        return campaignSchoolId === schoolId;
                    });

                    // Find the earliest campaign creation date with this supplier
                    let firstCampaignDate = null;
                    if (schoolCampaigns.length > 0) {
                        const campaignDates = schoolCampaigns
                            .map(c => c.createdAt ? new Date(c.createdAt) : null)
                            .filter(d => d !== null && !isNaN(d.getTime()));

                        if (campaignDates.length > 0) {
                            firstCampaignDate = new Date(Math.min(...campaignDates.map(d => d.getTime())));
                        }
                    }

                    // Trouver le school manager pour cette école
                    const schoolManager = schoolManagers.find(sm => {
                        if (!sm.schoolManagerInfo || !sm.schoolManagerInfo.organisme) return false;
                        const managerSchoolId = sm.schoolManagerInfo.organisme.toString
                            ? sm.schoolManagerInfo.organisme.toString()
                            : String(sm.schoolManagerInfo.organisme);
                        return managerSchoolId === schoolId;
                    });

                    // Ensure campaigns include all necessary fields (customPrices, profitSplits, mode, etc.)
                    const enrichedCampaigns = schoolCampaigns.map(campaign => ({
                        ...campaign,
                        // Ensure customPrices and profitSplits are included
                        customPrices: campaign.customPrices || [],
                        profitSplits: campaign.profitSplits || [],
                        // Ensure mode is included
                        mode: campaign.mode || 'test',
                        // Map field names for compatibility
                        nomCampagne: campaign.name || `Campagne #${campaign.campaignNumber}`,
                        debutCampagne: campaign.startDate,
                        finCampagne: campaign.endDate,
                        dateDeLivraison: campaign.deliveryDate,
                        objectifFinancier: campaign.financialGoal
                    }));

                    return {
                        ...school,
                        campaigns: enrichedCampaigns,
                        activeCampaign: enrichedCampaigns.find(c => {
                            if (!c._id) return false;
                            const campaignId = c._id.toString ? c._id.toString() : String(c._id);
                            const activeId = school.activeCampaignId
                                ? school.activeCampaignId.toString
                                    ? school.activeCampaignId.toString()
                                    : String(school.activeCampaignId)
                                : null;
                            return activeId && campaignId === activeId;
                        }),
                        // Use school's own contact info first, fallback to school manager's
                        email: school.email || schoolManager?.email || null,
                        telephone: school.telephone || schoolManager?.schoolManagerInfo?.telephone || null,
                        cellulaire: schoolManager?.schoolManagerInfo?.cellulaire || null,
                        // Ensure address fields are included
                        adresse: school.address || null,
                        address: school.address || null,
                        // Date of first campaign with this supplier
                        firstCampaignDate: firstCampaignDate
                    };
                } catch (error) {
                    console.error('Error processing school:', school._id, error);
                    return null;
                }
            }).filter(Boolean);

            res.status(200).json(schoolsWithCampaigns);
        } catch (error) {
            console.error('Erreur lors de la récupération des écoles:', error);
            // Return empty array instead of error to prevent dashboard crashes
            res.status(200).json([]);
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
    }
}
