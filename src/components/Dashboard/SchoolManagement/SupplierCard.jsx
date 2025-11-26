import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    MapPin,
    Phone,
    Mail,
    Globe,
    Star,
    TrendingUp,
    Package,
    CheckCircle2,
    Award,
    Users,
    ChevronDown,
    ChevronUp,
    DollarSign,
    ShoppingBag,
    Loader2,
    MessageCircle
} from 'lucide-react';
import { calculateDeliveryCostPerProduct } from '../../../lib/deliveryCalculator';
import { getMarkupMultiplier, roundDownToFiveCents } from '@/utils/supplierPricing';

const SupplierCard = ({
    supplier,
    isSelected,
    onSelect,
    averageProfitMargin,
    totalCampaigns,
    averageRating,
    reviewCount,
    distance,
    onStartChat
}) => {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [showProducts, setShowProducts] = useState(false);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [estimatedDeliveryCosts, setEstimatedDeliveryCosts] = useState({});

    const handleSelect = () => {
        onSelect(supplier._id);
    };

    const toggleDescription = (e) => {
        e.stopPropagation();
        setIsDescriptionExpanded(!isDescriptionExpanded);
    };

    const toggleProducts = async (e) => {
        e.stopPropagation();
        if (!showProducts && products.length === 0) {
            // Load products when expanding
            setLoadingProducts(true);
            try {
                const response = await fetch(`/api/products?supplierId=${supplier._id}&limit=50`);
                if (response.ok) {
                    const data = await response.json();
                    setProducts(data.products || []);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoadingProducts(false);
            }
        }
        setShowProducts(!showProducts);
    };

    // Calculate estimated delivery costs for products (like in supplier products page)
    useEffect(() => {
        if (products.length > 0 && supplier) {
            // Build supplier address
            const supplierAddressParts = [];
            if (supplier.address) supplierAddressParts.push(supplier.address);
            if (supplier.ville) supplierAddressParts.push(supplier.ville);
            if (supplier.codePostal) supplierAddressParts.push(supplier.codePostal);
            const supplierAddress = supplierAddressParts.length > 0
                ? supplierAddressParts.join(', ') + ', QC, Canada'
                : 'Montreal, QC, Canada'; // Default fallback

            // Use a default school address for estimation
            const defaultSchoolAddress = 'Montreal, QC, Canada';

            const estimates = {};
            products.forEach(product => {
                const productId = product._id || product.id;

                // Check if product has pallet information
                if (product.pallet && product.pallet.ti > 0 && product.pallet.hi > 0) {
                    try {
                        // Calculate boxes per pallet (ti = tiers/layers, hi = boxes per layer)
                        const boxesPerPallet = product.pallet.ti * product.pallet.hi;

                        // Get products per box from casePack
                        const productsPerBox = parseInt(product.casePack) || 1;

                        // Calculate products per pallet: boxes × products per box
                        const productsPerPallet = boxesPerPallet * productsPerBox;

                        // Calculate for half a pallet (0.5) to be conservative and avoid surprises
                        const halfPalletQuantity = Math.max(1, Math.floor(productsPerPallet * 0.5));

                        const estimate = calculateDeliveryCostPerProduct({
                            product,
                            supplierAddress,
                            schoolAddress: defaultSchoolAddress,
                            totalQuantity: halfPalletQuantity,
                            requiresTailgate: false,
                            isLimitedAccess: false
                        });

                        console.log(`[SupplierCard] Calculated delivery cost for ${product.name}:`, {
                            productId,
                            pricePickup: product.pricePickup,
                            pallet: product.pallet,
                            casePack: product.casePack,
                            boxesPerPallet,
                            productsPerBox,
                            productsPerPallet,
                            halfPalletQuantity,
                            estimatedDeliveryCost: estimate,
                            storedDeliveryCost: product.deliveryCostToSchool
                        });

                        estimates[productId] = estimate;
                    } catch (error) {
                        console.error('Error calculating delivery estimate for product:', product.name, error);
                        estimates[productId] = product.deliveryCostToSchool || 0;
                    }
                } else {
                    // Use stored deliveryCostToSchool if available, otherwise 0
                    console.log(`[SupplierCard] Product ${product.name} has no pallet info, using stored deliveryCostToSchool:`, {
                        productId,
                        pallet: product.pallet,
                        casePack: product.casePack,
                        storedDeliveryCost: product.deliveryCostToSchool
                    });
                    estimates[productId] = product.deliveryCostToSchool || 0;
                }
            });

            console.log('[SupplierCard] Final estimated delivery costs:', estimates);
            setEstimatedDeliveryCosts(estimates);
        }
    }, [products, supplier]);

    const calculateProfitMargin = (price, cost) => {
        if (!price || !cost || price === 0) return 0;
        return ((price - cost) / price) * 100;
    };

    return (
        <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected
                ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/50'
                : 'border-gray-200 hover:border-blue-300'
                }`}
            onClick={handleSelect}
        >
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4 flex-1">
                        {/* Logo */}
                        {supplier.logo ? (
                            <img
                                src={supplier.logo}
                                alt={supplier.name}
                                className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                                onError={(e) => {
                                    // If image fails to load, hide it and show fallback
                                    e.target.style.display = 'none';
                                    const fallback = e.target.nextElementSibling;
                                    if (fallback) {
                                        fallback.style.display = 'flex';
                                    }
                                }}
                            />
                        ) : null}
                        <div
                            className={`w-16 h-16 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-gray-200 ${supplier.logo ? 'hidden' : ''}`}
                        >
                            <Package className="w-8 h-8 text-blue-600" />
                        </div>

                        {/* Supplier Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                    {supplier.name}
                                </h3>
                                {supplier.approved && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Vérifié
                                    </Badge>
                                )}
                            </div>

                            {/* Rating */}
                            {averageRating > 0 && (
                                <div className="flex items-center space-x-1 mb-2">
                                    <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-4 h-4 ${i < Math.round(averageRating)
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'text-gray-300'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-sm text-gray-600 ml-1">
                                        {averageRating.toFixed(1)} ({reviewCount} avis)
                                    </span>
                                </div>
                            )}

                            {/* Description */}
                            {supplier.description && (
                                <div className="mb-2">
                                    <p className={`text-sm text-gray-600 ${!isDescriptionExpanded ? 'line-clamp-2' : ''}`}>
                                        {supplier.description}
                                    </p>
                                    {supplier.description.length > 100 && (
                                        <button
                                            onClick={toggleDescription}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1 flex items-center space-x-1"
                                        >
                                            <span>{isDescriptionExpanded ? 'Voir moins' : 'Voir plus'}</span>
                                            {isDescriptionExpanded ? (
                                                <ChevronUp className="w-3 h-3" />
                                            ) : (
                                                <ChevronDown className="w-3 h-3" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                        {onStartChat && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-green-300 text-green-700 hover:bg-green-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStartChat(supplier._id);
                                }}
                                title="Démarrer une conversation"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className={isSelected ? "bg-blue-600 hover:bg-blue-700" : ""}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect();
                            }}
                        >
                            {isSelected ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Sélectionné
                                </>
                            ) : (
                                'Sélectionner'
                            )}
                        </Button>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {/* Profit Margin - Average across all products */}
                    {averageProfitMargin !== null && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <div className="flex items-center space-x-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                <span className="text-xs font-medium text-green-700">Marge moyenne</span>
                            </div>
                            <p className="text-lg font-bold text-green-900">
                                {averageProfitMargin.toFixed(1)}%
                            </p>
                            <p className="text-xs text-green-600 mt-0.5">sur tous les produits</p>
                        </div>
                    )}

                    {/* Total Campaigns */}
                    {totalCampaigns !== null && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <div className="flex items-center space-x-2 mb-1">
                                <Award className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-medium text-blue-700">Campagnes</span>
                            </div>
                            <p className="text-lg font-bold text-blue-900">
                                {totalCampaigns}
                            </p>
                        </div>
                    )}

                    {/* Distance */}
                    {distance !== null && (
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                            <div className="flex items-center space-x-2 mb-1">
                                <MapPin className="w-4 h-4 text-purple-600" />
                                <span className="text-xs font-medium text-purple-700">Distance</span>
                            </div>
                            <p className="text-lg font-bold text-purple-900">
                                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                            </p>
                        </div>
                    )}

                    {/* Status */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-1">
                            <Users className="w-4 h-4 text-gray-600" />
                            <span className="text-xs font-medium text-gray-700">Statut</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900 capitalize">
                            {supplier.status === 'active' ? 'Actif' : 'Inactif'}
                        </p>
                    </div>
                </div>

                {/* Contact & Location Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                    {/* Location */}
                    {(supplier.address || supplier.ville || supplier.codePostal) && (
                        <div className="flex items-start space-x-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                                {(() => {
                                    // Helper function to normalize strings for comparison
                                    const normalize = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ');

                                    // Get individual fields
                                    const addressField = (supplier.address || '').trim();
                                    const villeField = (supplier.ville || '').trim();
                                    const codePostalField = (supplier.codePostal || '').trim();

                                    // If address field is empty, build from ville and codePostal
                                    if (!addressField) {
                                        const parts = [];
                                        if (villeField) parts.push(villeField);
                                        if (codePostalField) parts.push(codePostalField);
                                        return parts.length > 0 ? <p>{parts.join(', ')}</p> : null;
                                    }

                                    // Check if address field already contains ville and/or codePostal
                                    const normalizedAddress = normalize(addressField);
                                    const normalizedVille = normalize(villeField);
                                    const normalizedCodePostal = normalize(codePostalField);

                                    // Check if ville is already in address
                                    const villeInAddress = normalizedVille && normalizedAddress.includes(normalizedVille);

                                    // Check if codePostal is already in address (with or without space)
                                    const codePostalPattern = normalizedCodePostal.replace(/\s/g, '');
                                    const codePostalInAddress = normalizedCodePostal && (
                                        normalizedAddress.includes(normalizedCodePostal) ||
                                        normalizedAddress.includes(codePostalPattern)
                                    );

                                    // If both ville and codePostal are already in address, use address as-is
                                    if (villeInAddress && codePostalInAddress) {
                                        return <p>{addressField}</p>;
                                    }

                                    // Build address from parts, avoiding duplicates
                                    const addressParts = [addressField];

                                    if (villeField && !villeInAddress) {
                                        addressParts.push(villeField);
                                    }

                                    if (codePostalField && !codePostalInAddress) {
                                        addressParts.push(codePostalField);
                                    }

                                    return <p>{addressParts.join(', ')}</p>;
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Contact */}
                    <div className="flex flex-col space-y-1">
                        {supplier.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span>{supplier.phone}</span>
                            </div>
                        )}
                        {(supplier.companyEmail || supplier.email) && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{supplier.companyEmail || supplier.email}</span>
                            </div>
                        )}
                        {supplier.website && (() => {
                            // Extract domain name from URL
                            let domainName = supplier.website;
                            try {
                                const url = new URL(supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`);
                                domainName = url.hostname.replace('www.', '');
                            } catch (e) {
                                // If URL parsing fails, use the original value
                                domainName = supplier.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
                            }

                            return (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <a
                                        href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline break-all flex items-center"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {domainName}
                                    </a>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Certifications */}
                {supplier.certifications && supplier.certifications.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex flex-wrap gap-2">
                            {supplier.certifications.map((cert, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                    {cert}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Products Section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                        onClick={toggleProducts}
                        className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                    >
                        <div className="flex items-center space-x-2">
                            <ShoppingBag className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-gray-900">
                                Voir les produits {products.length > 0 && `(${products.length})`}
                            </span>
                        </div>
                        {showProducts ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </button>

                    {showProducts && (
                        <div className="mt-4 space-y-3">
                            {loadingProducts ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                    <span className="ml-2 text-gray-600">Chargement des produits...</span>
                                </div>
                            ) : products.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">Aucun produit disponible</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                                    {products.map((product) => {
                                        // Calculate exactly like the supplier products page
                                        const productId = product._id || product.id;
                                        const pricePickup = product.pricePickup ? parseFloat(product.pricePickup) : 0;
                                        // Use estimated delivery cost if available, otherwise fallback to stored value
                                        const deliveryCost = estimatedDeliveryCosts[productId] || product.deliveryCostToSchool || 0;
                                        const recommendedRetailPrice = product.recommendedRetailPrice ? parseFloat(product.recommendedRetailPrice) : 0;

                                        // Use acquisitionCost from API if available (already calculated and rounded correctly)
                                        // Otherwise calculate it using the same logic as the API
                                        let acquisitionCost = 0;
                                        let sellingPrice = 0;
                                        let profitMargin = 0;
                                        let profitAmount = 0;

                                        // Prefer acquisitionCost from API (already rounded to nearest 5 cents)
                                        if (product.acquisitionCost && product.acquisitionCost > 0) {
                                            acquisitionCost = parseFloat(product.acquisitionCost);
                                            sellingPrice = recommendedRetailPrice || parseFloat(product.recommendedRetailPrice) || 0;
                                            profitAmount = sellingPrice - acquisitionCost;
                                            profitMargin = acquisitionCost > 0 ? ((profitAmount / acquisitionCost) * 100) : 0;
                                        } else if (pricePickup > 0 && recommendedRetailPrice > 0) {
                                            // Calculate if acquisitionCost not available from API
                                            // Get pricing settings from supplier (if available)
                                            const pricingSettings = supplier?.pricingSettings || { markup: 5, handlesShipping: false };
                                            const markupMultiplier = getMarkupMultiplier({ pricingSettings });
                                            const handlesShipping = pricingSettings.handlesShipping || false;

                                            // If supplier handles shipping, delivery cost should be 0 for price calculation
                                            const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCost;
                                            const basePrice = pricePickup * markupMultiplier;
                                            const totalPrice = basePrice + effectiveDeliveryCost;

                                            // Round down to nearest 5 cents for school cost
                                            acquisitionCost = roundDownToFiveCents(totalPrice);
                                            sellingPrice = recommendedRetailPrice;
                                            profitAmount = sellingPrice - acquisitionCost;
                                            profitMargin = acquisitionCost > 0 ? ((profitAmount / acquisitionCost) * 100) : 0;

                                            // Debug log
                                            if (process.env.NODE_ENV === 'development') {
                                                console.log(`[SupplierCard] Price calculation for ${product.name}:`, {
                                                    productId,
                                                    pricePickup,
                                                    basePrice: basePrice.toFixed(2),
                                                    deliveryCost,
                                                    totalPrice: totalPrice.toFixed(2),
                                                    recommendedRetailPrice,
                                                    profitAmount: profitAmount.toFixed(2),
                                                    profitMargin: profitMargin.toFixed(1) + '%'
                                                });
                                            }
                                        } else if (product.recommendedRetailPrice && (product.cost || product.price)) {
                                            // Fallback: use cost from API (already rounded) or stored price
                                            acquisitionCost = product.cost ? parseFloat(product.cost) : parseFloat(product.price);
                                            // Ensure it's rounded to nearest 5 cents
                                            acquisitionCost = roundDownToFiveCents(acquisitionCost);
                                            sellingPrice = parseFloat(product.recommendedRetailPrice);
                                            profitAmount = sellingPrice - acquisitionCost;
                                            profitMargin = acquisitionCost > 0 ? ((profitAmount / acquisitionCost) * 100) : 0;
                                        }

                                        return (
                                            <div
                                                key={product._id || product.id}
                                                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex space-x-3">
                                                    {/* Product Image */}
                                                    <div className="flex-shrink-0">
                                                        {product.image ? (
                                                            <img
                                                                src={product.image}
                                                                alt={product.name}
                                                                className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200 shadow-sm"
                                                            />
                                                        ) : (
                                                            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-gray-200 shadow-sm">
                                                                <Package className="w-10 h-10 text-blue-600" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Product Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-900 truncate mb-2 text-base">
                                                            {product.name}
                                                        </h4>

                                                        {/* Pricing Info */}
                                                        {acquisitionCost > 0 && sellingPrice > 0 ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs text-gray-500">Coût d'acquisition:</span>
                                                                    <span className="font-semibold text-gray-700">
                                                                        ${acquisitionCost.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs text-gray-500">Prix suggéré:</span>
                                                                    <span className="font-bold text-lg text-blue-600">
                                                                        ${sellingPrice.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                                                    <span className="text-xs font-medium text-gray-600">Marge:</span>
                                                                    <div className="flex items-center space-x-2">
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`font-semibold ${profitMargin >= 30
                                                                                ? 'bg-green-50 text-green-700 border-green-300'
                                                                                : profitMargin >= 20
                                                                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                                                                    : 'bg-orange-50 text-orange-700 border-orange-300'
                                                                                }`}
                                                                        >
                                                                            {profitMargin.toFixed(1)}%
                                                                        </Badge>
                                                                        <span className="text-xs font-medium text-green-600">
                                                                            +${profitAmount.toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-gray-400 italic">
                                                                Données de prix non disponibles
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                            }
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default SupplierCard;

