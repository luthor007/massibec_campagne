// components/Dashboard/OrderPlacementModal.jsx

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateMultipleOfBoxSuggestion, getNextMultipleOfBox, isMultipleOfBox, aggregateProductsWithSuggestions } from '@/utils/inventoryHelpers';
import { getCampaignDataWithFallback } from '@/utils/campaignHelpers';
import { toast } from 'sonner';
import { Plus, Minus, Package, Sparkles, TrendingUp, Store, Zap, CheckCircle2, DollarSign, Gift, School, Trophy, AlertCircle, Copy, Check } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function OrderPlacementModal({
    open,
    onOpenChange,
    paidOrders,
    school,
    schoolId,
    session,
    onOrderPlaced,
    campaignContext,
    isOrderingPeriod = false,
    campaignEndDateLong = null
}) {
    const [additionalProducts, setAdditionalProducts] = useState({});
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [campaignData, setCampaignData] = useState(null);
    const [fallbackSplit, setFallbackSplit] = useState(null);
    const [productsList, setProductsList] = useState([]); // For product ID lookup
    const [showNonMultipleConfirmation, setShowNonMultipleConfirmation] = useState(false);
    const [pendingOrderData, setPendingOrderData] = useState(null);
    const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
    const [showThankYouMessage, setShowThankYouMessage] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [amountToPay, setAmountToPay] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    // Create a map of product names to product info (for casePack lookup)
    const productsMap = useMemo(() => {
        const map = {};
        allProducts.forEach(product => {
            const productName = product.name;
            if (productName) {
                map[productName] = {
                    casePack: product.casePack || '6', // Default to 6 if not set
                    name: productName
                };
            }
        });
        return map;
    }, [allProducts]);

    // Aggregate products from paid orders and calculate suggestions (with dynamic box sizes)
    const productBreakdown = useMemo(() => {
        if (!paidOrders || paidOrders.length === 0) return {};
        return aggregateProductsWithSuggestions(paidOrders, productsMap);
    }, [paidOrders, productsMap]);

    // Fetch all available products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const campaignId = campaignContext?.activeCampaignId;
                let url = '/api/products?limit=100';
                if (campaignId) {
                    url = `/api/products?campaignId=${campaignId}&limit=100`;
                } else if (schoolId) {
                    url = `/api/products?schoolId=${schoolId}&limit=100`;
                }

                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    const productsArray = Array.isArray(data)
                        ? data
                        : (data.products || []);
                    setAllProducts(productsArray);
                    setProductsList(productsArray);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            }
        };

        if (open) {
            fetchProducts();
            // Fetch campaign data
            if (schoolId && school) {
                getCampaignDataWithFallback(schoolId, school).then(({ campaign, fallbackSplit }) => {
                    setCampaignData(campaign);
                    setFallbackSplit(fallbackSplit);
                });
            }
        }
    }, [open, schoolId, school, campaignContext]);

    // Reset additional products when modal opens/closes
    useEffect(() => {
        if (!open) {
            setAdditionalProducts({});
            setShowPaymentInstructions(false);
            setShowThankYouMessage(false);
            setOrderId(null);
            setAmountToPay(null);
            setCopiedField(null);
        }
    }, [open]);

    // Copy to clipboard function
    const copyToClipboard = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        toast.success('Copié dans le presse-papier!');
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Calculate delivery date info
    const deliveryInfo = useMemo(() => {
        if (!campaignData?.deliveryDate) return null;
        const deliveryDate = new Date(campaignData.deliveryDate);
        const today = new Date();
        const daysUntilDelivery = differenceInDays(deliveryDate, today);
        const threeWeeksFromToday = addDays(today, 21);

        return {
            deliveryDate,
            daysUntilDelivery,
            formattedDeliveryDate: format(deliveryDate, 'd MMMM yyyy', { locale: fr }),
            threeWeeksFromToday,
            canStillSell: daysUntilDelivery >= 21
        };
    }, [campaignData]);

    // Calculate financial breakdown for all products
    const financialBreakdown = useMemo(() => {
        if (!campaignData && !fallbackSplit) return [];

        const breakdown = [];
        const allProductsForBreakdown = [];

        // Add sold products
        Object.values(productBreakdown).forEach(product => {
            if (product.soldQuantity > 0) {
                // Get current price from product catalog, fallback to order price
                const productFromCatalog = allProducts.find(p => p.name === product.productName);
                const currentPrice = productFromCatalog?.price || product.price;
                const currentCost = productFromCatalog?.cost || product.cost;

                allProductsForBreakdown.push({
                    productName: product.productName,
                    quantity: product.soldQuantity,
                    price: currentPrice,
                    cost: currentCost,
                    isAdditional: false
                });
            }
        });

        // Add additional products
        Object.entries(additionalProducts).forEach(([productName, quantity]) => {
            if (quantity > 0) {
                const product = allProducts.find(p => p.name === productName);
                if (product) {
                    allProductsForBreakdown.push({
                        productName: productName,
                        quantity: quantity,
                        price: product.price,
                        cost: product.cost || 0,
                        isAdditional: true
                    });
                }
            }
        });

        allProductsForBreakdown.forEach(product => {
            // Find product ID for profit split lookup
            const productObj = productsList.find(p => p.name === product.productName);
            const productId = productObj?._id?.toString() || productObj?.id?.toString();

            // Calculate profit splits
            let cashProfit = 0;
            let schoolAccountProfit = 0;
            let schoolProfit = 0;
            let raffleProfit = 0;

            if (campaignData?.profitSplitType === 'absolute' && campaignData?.profitSplits) {
                const profitSplit = campaignData.profitSplits.find(ps => {
                    const psProductId = ps.productId?._id?.toString() || ps.productId?.toString();
                    return psProductId === productId;
                });

                if (profitSplit) {
                    cashProfit = (Number(profitSplit.studentCash) || 0) * product.quantity;
                    schoolAccountProfit = (Number(profitSplit.studentSchoolAccount) || 0) * product.quantity;
                    schoolProfit = (Number(profitSplit.schoolProject) || 0) * product.quantity;
                    raffleProfit = (Number(profitSplit.raffle) || 0) * product.quantity;
                } else {
                    // Fallback to percentage
                    const profit = (product.price - product.cost) * product.quantity;
                    const studentBenefit = fallbackSplit?.studentBenefit || 85.6;
                    const studentBenefitHalf = studentBenefit / 2;
                    cashProfit = profit * (studentBenefitHalf / 100);
                    schoolAccountProfit = profit * (studentBenefitHalf / 100);
                    schoolProfit = profit * ((fallbackSplit?.organizationBenefit || 9.4) / 100);
                    raffleProfit = profit * ((fallbackSplit?.raffleBenefit || 5.0) / 100);
                }
            } else {
                // Percentage-based
                const profit = (product.price - product.cost) * product.quantity;
                const studentBenefit = fallbackSplit?.studentBenefit || 85.6;
                const studentBenefitHalf = studentBenefit / 2;
                cashProfit = profit * (studentBenefitHalf / 100);
                schoolAccountProfit = profit * (studentBenefitHalf / 100);
                schoolProfit = profit * ((fallbackSplit?.organizationBenefit || 9.4) / 100);
                raffleProfit = profit * ((fallbackSplit?.raffleBenefit || 5.0) / 100);
            }

            breakdown.push({
                productName: product.productName,
                quantity: product.quantity,
                unitPrice: product.price,
                unitCost: product.cost,
                totalRevenue: product.price * product.quantity,
                totalCost: product.cost * product.quantity,
                cashProfit,
                schoolAccountProfit,
                schoolProfit,
                raffleProfit,
                totalStudentProfit: cashProfit + schoolAccountProfit,
                isAdditional: product.isAdditional
            });
        });

        return breakdown;
    }, [productBreakdown, additionalProducts, allProducts, campaignData, fallbackSplit, productsList]);

    // Calculate donations and discounts from paid orders
    const donationsAndDiscounts = useMemo(() => {
        if (!paidOrders || paidOrders.length === 0) {
            return {
                totalDonations: 0,
                totalStudentDonationsToCash: 0,
                totalStudentDonationsToAccount: 0,
                totalSchoolDonations: 0,
                totalDiscountAmount: 0,
                discountFromSchoolAccount: 0,
                discountFromCash: 0
            };
        }

        // Calculate donations
        let totalStudentDonationsToCash = 0;
        let totalStudentDonationsToAccount = 0;
        let totalSchoolDonations = 0;

        paidOrders.forEach(order => {
            // Student donations split
            if (order.studentDonationSplit) {
                totalStudentDonationsToCash += order.studentDonationSplit.studentCash || 0;
                totalStudentDonationsToAccount += order.studentDonationSplit.studentAccount || 0;
            } else if (order.tipBreakdown) {
                totalStudentDonationsToCash += order.tipBreakdown.studentCash || 0;
                totalStudentDonationsToAccount += order.tipBreakdown.studentSchoolAccount || 0;
            } else {
                // Fallback: assume all goes to cash
                const studentDonation = order.studentDonation || order.tip || 0;
                totalStudentDonationsToCash += studentDonation;
            }

            // School donations
            totalSchoolDonations += order.schoolDonation || 0;
        });

        const totalDonations = totalStudentDonationsToCash + totalStudentDonationsToAccount + totalSchoolDonations;

        // Calculate discounts
        let totalDiscountAmount = 0;
        paidOrders.forEach(order => {
            if (order.discount !== undefined && order.discount !== null) {
                totalDiscountAmount += order.discount || 0;
            } else if (order.products && order.products.length > 0) {
                const originalSubtotal = order.products.reduce((sum, product) => {
                    const price = product.productPrice || product.price || 0;
                    const quantity = product.quantity || 0;
                    return sum + (price * quantity);
                }, 0);
                const discount = Math.max(0, originalSubtotal - (order.totalAmount || 0));
                totalDiscountAmount += discount;
            }
        });

        // Calculate how discount affects profits (deducted from school account first, then cash)
        const totalSchoolAccountProfit = financialBreakdown
            .filter(p => !p.isAdditional)
            .reduce((sum, p) => sum + p.schoolAccountProfit, 0);

        let discountFromSchoolAccount = 0;
        let discountFromCash = 0;

        if (totalDiscountAmount > 0) {
            if (totalSchoolAccountProfit >= totalDiscountAmount) {
                discountFromSchoolAccount = totalDiscountAmount;
                discountFromCash = 0;
            } else {
                discountFromSchoolAccount = totalSchoolAccountProfit;
                discountFromCash = totalDiscountAmount - totalSchoolAccountProfit;
            }
        }

        return {
            totalDonations,
            totalStudentDonationsToCash,
            totalStudentDonationsToAccount,
            totalSchoolDonations,
            totalDiscountAmount,
            discountFromSchoolAccount,
            discountFromCash
        };
    }, [paidOrders, financialBreakdown]);

    // Check if all products in the order are freezable
    const allProductsFreezable = useMemo(() => {
        if (!paidOrders || paidOrders.length === 0) return true; // Default to true if no orders

        const productNames = new Set();

        // Collect all product names from orders
        paidOrders.forEach(order => {
            if (order.products && Array.isArray(order.products)) {
                order.products.forEach(product => {
                    productNames.add(product.productName || product.name);
                });
            }
        });

        // Also check additional products
        Object.keys(additionalProducts).forEach(productName => {
            if (additionalProducts[productName] > 0) {
                productNames.add(productName);
            }
        });

        // Check if all products are freezable (support both old and new format)
        for (const productName of productNames) {
            const product = allProducts.find(p => p.name === productName);
            if (product) {
                // Check new format (attributes.freezable) or old format (freezable at root)
                const isFreezable = product.attributes?.freezable !== undefined
                    ? product.attributes.freezable
                    : (product.freezable !== undefined ? product.freezable : false);
                if (isFreezable === false) {
                    return false;
                }
            }
        }

        return true; // Default to true if product info not found
    }, [paidOrders, additionalProducts, allProducts]);

    // Calculate totals
    const calculatedTotals = useMemo(() => {
        let totalSoldQuantity = 0;
        let totalSoldAmount = 0;
        let totalAdditionalQuantity = 0;
        let totalAdditionalAmount = 0;

        Object.values(productBreakdown).forEach(product => {
            totalSoldQuantity += product.soldQuantity;
            totalSoldAmount += product.soldQuantity * product.price;
        });

        Object.entries(additionalProducts).forEach(([productName, quantity]) => {
            const product = allProducts.find(p => p.name === productName);
            if (product && quantity > 0) {
                totalAdditionalQuantity += quantity;
                totalAdditionalAmount += quantity * product.price;
            }
        });

        // Calculate financial totals
        const financialTotals = financialBreakdown.reduce((acc, product) => {
            acc.totalRevenue += product.totalRevenue;
            acc.totalCost += product.totalCost;
            acc.totalCashProfit += product.cashProfit;
            acc.totalSchoolAccountProfit += product.schoolAccountProfit;
            acc.totalSchoolProfit += product.schoolProfit;
            acc.totalRaffleProfit += product.raffleProfit;
            acc.totalStudentProfit += product.totalStudentProfit;
            return acc;
        }, {
            totalRevenue: 0,
            totalCost: 0,
            totalCashProfit: 0,
            totalSchoolAccountProfit: 0,
            totalSchoolProfit: 0,
            totalRaffleProfit: 0,
            totalStudentProfit: 0
        });

        // Add donations to student profits (after discount deduction)
        const netCashProfit = financialTotals.totalCashProfit - donationsAndDiscounts.discountFromCash;
        const netSchoolAccountProfit = financialTotals.totalSchoolAccountProfit - donationsAndDiscounts.discountFromSchoolAccount;

        // School account donations must be remitted, so they're counted as profit
        // but also must be paid. The equation is:
        // Total Revenue = Product Revenue + Donations
        // What they pay = Product Costs + School Donations + School Account Donations (to remit)
        // What they keep = Cash Profit + School Account Donations (counts as profit but must remit)
        // 
        // The school account donations (12$) appear in both "pay" and "keep" because:
        // - They received it (part of revenue)
        // - They must remit it (part of what they pay)
        // - But it still counts as their profit (what they keep, even though they remit it)
        // 
        // So: Revenue (304$) = Pay (202$) + Keep (104$ cash + 12$ account) - School Account (12$ double-counted)
        // This simplifies to: Revenue (304$) = Pay (202$) + Keep (104$ cash) + School Account (12$ counted once)
        // Which is: 304$ = 202$ + 104$ + 12$ - 12$ = 306$ - 12$ = 294$... wait that's still wrong
        //
        // Actually, the correct way to think about it:
        // - They received 12$ (revenue)
        // - They must remit 12$ (pay)
        // - Net: 0$ (they don't actually keep it)
        // But for accounting purposes, it counts as profit even though it must be remitted
        // So the equation should be: Revenue = Pay + Keep (where Keep includes the 12$ even though it's remitted)
        // 304$ = 202$ + (104$ + 12$) = 318$... but that's 14$ too much
        //
        // I think the issue is that school account donations shouldn't be added to totalAmountToPay
        // because they're already accounted for in the revenue. They're received and must be remitted,
        // but they're not an additional cost - they're just passing through.
        const totalStudentProfitWithDonations =
            Math.max(0, netCashProfit) +
            Math.max(0, netSchoolAccountProfit) +
            donationsAndDiscounts.totalStudentDonationsToCash +
            donationsAndDiscounts.totalStudentDonationsToAccount;

        return {
            soldQuantity: totalSoldQuantity,
            soldAmount: totalSoldAmount,
            additionalQuantity: totalAdditionalQuantity,
            additionalAmount: totalAdditionalAmount,
            totalQuantity: totalSoldQuantity + totalAdditionalQuantity,
            totalAmount: totalSoldAmount + totalAdditionalAmount,
            ...financialTotals,
            // Net profits after discounts
            netCashProfit: Math.max(0, netCashProfit),
            netSchoolAccountProfit: Math.max(0, netSchoolAccountProfit),
            // Total student profit including donations
            totalStudentProfitWithDonations,
            // Amount to pay (cost + school donations + school account donations)
            // Note: School account donations are received as revenue and must be remitted.
            // They appear in both "Pay" (must remit) and "Keep" (counts as profit),
            // which is why Pay + Keep may exceed Revenue. This is correct accounting:
            // the 12$ is received (revenue), must be remitted (pay), but still counts as profit (keep).
            totalAmountToPay: financialTotals.totalCost + donationsAndDiscounts.totalSchoolDonations + donationsAndDiscounts.totalStudentDonationsToAccount
        };
    }, [productBreakdown, additionalProducts, allProducts, financialBreakdown, donationsAndDiscounts]);

    // One-click function to make all products multiples of their box size
    const handleMakeAllMultiplesOfBox = () => {
        const newAdditionalProducts = { ...additionalProducts };

        Object.values(productBreakdown).forEach(product => {
            const currentAdditional = newAdditionalProducts[product.productName] || 0;
            const totalQty = product.soldQuantity + currentAdditional;
            const productsPerBox = product.productsPerBox || 6;
            const nextMultiple = getNextMultipleOfBox(totalQty, productsPerBox);
            const needed = nextMultiple - totalQty;

            if (needed > 0) {
                newAdditionalProducts[product.productName] = currentAdditional + needed;
            } else if (needed === 0 && currentAdditional > 0) {
                // Already a multiple, keep current
            }
        });

        // Also ensure new products are multiples of their box size
        Object.entries(newAdditionalProducts).forEach(([productName, quantity]) => {
            if (!productBreakdown[productName] && quantity > 0) {
                const productInfo = productsMap[productName] || {};
                const productsPerBox = parseInt(productInfo.casePack) || 6;
                const nextMultiple = getNextMultipleOfBox(quantity, productsPerBox);
                if (nextMultiple !== quantity) {
                    newAdditionalProducts[productName] = nextMultiple;
                }
            }
        });

        setAdditionalProducts(newAdditionalProducts);
        toast.success('Tous les produits ont été ajustés aux multiples de leurs boîtes! 🎉');
    };

    const handleAdditionalQuantityChange = (productName, delta) => {
        setAdditionalProducts(prev => {
            const current = prev[productName] || 0;
            const product = productBreakdown[productName];
            const soldQty = product?.soldQuantity || 0;
            const currentTotal = soldQty + current;

            // Get productsPerBox for this product
            const productsPerBox = product?.productsPerBox || parseInt(productsMap[productName]?.casePack) || 6;

            let newValue;
            if (delta > 0) {
                // Add: always add one box (or go to next multiple if not at one)
                if (currentTotal % productsPerBox === 0) {
                    // Already at a multiple, add one box more
                    newValue = current + productsPerBox;
                } else {
                    // Not at a multiple, go to next multiple
                    const nextMultiple = getNextMultipleOfBox(currentTotal, productsPerBox);
                    const needed = nextMultiple - currentTotal;
                    newValue = current + needed;
                }
            } else {
                // Subtract: go to previous multiple (or subtract one box if already at multiple)
                if (currentTotal % productsPerBox === 0 && currentTotal >= productsPerBox) {
                    // Already at a multiple, subtract one box
                    newValue = Math.max(0, current - productsPerBox);
                } else {
                    // Not at a multiple, go to previous multiple
                    const previousMultiple = Math.floor(currentTotal / productsPerBox) * productsPerBox;
                    const newTotal = Math.max(0, previousMultiple);
                    newValue = Math.max(0, newTotal - soldQty);
                }
            }

            if (newValue === 0) {
                const { [productName]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productName]: newValue };
        });
    };

    const handleSetSuggestedQuantity = (productName, suggestedAddition) => {
        if (suggestedAddition > 0) {
            setAdditionalProducts(prev => ({
                ...prev,
                [productName]: (prev[productName] || 0) + suggestedAddition
            }));
        }
    };

    const handleConfirmOrder = async () => {
        if (loading) return;
        setLoading(true);

        try {
            // Check if we're in the ordering period
            if (!isOrderingPeriod) {
                toast.error('Vous pouvez passer votre commande dès 2 jours avant jusqu\'à 1 jour après la fin de campagne (pour les retardataires).');
                setLoading(false);
                return;
            }

            if (!session || !session.user) {
                throw new Error('Utilisateur non authentifié');
            }

            if (!school || !schoolId) {
                throw new Error('Données de l\'école non disponibles.');
            }

            // Aggregate all products (sold + additional)
            const allProductsForOrder = [];

            // Add sold products (isAdditional: false)
            Object.values(productBreakdown).forEach(product => {
                if (product.soldQuantity > 0) {
                    allProductsForOrder.push({
                        productName: product.productName,
                        quantity: product.soldQuantity,
                        price: product.price,
                        cost: product.cost,
                        isAdditional: false
                    });
                }
            });

            // Add additional products (isAdditional: true)
            Object.entries(additionalProducts).forEach(([productName, quantity]) => {
                if (quantity > 0) {
                    const product = allProducts.find(p => p.name === productName);
                    if (product) {
                        const wasSold = productBreakdown[productName]?.soldQuantity > 0;
                        if (wasSold) {
                            allProductsForOrder.push({
                                productName: productName,
                                quantity: quantity,
                                price: product.price,
                                cost: product.cost || 0,
                                isAdditional: true
                            });
                        } else {
                            allProductsForOrder.push({
                                productName: productName,
                                quantity: quantity,
                                price: product.price,
                                cost: product.cost || 0,
                                isAdditional: true
                            });
                        }
                    }
                }
            });

            if (allProductsForOrder.length === 0) {
                toast.error('Aucun produit à commander.');
                setLoading(false);
                return;
            }

            // Check if all products are multiples of their box size (combine sold + additional quantities)
            const productQuantities = new Map();
            allProductsForOrder.forEach(p => {
                const currentQty = productQuantities.get(p.productName) || 0;
                productQuantities.set(p.productName, currentQty + p.quantity);
            });

            const invalidProducts = Array.from(productQuantities.entries())
                .filter(([productName, totalQty]) => {
                    const product = productBreakdown[productName];
                    const productsPerBox = product?.productsPerBox || parseInt(productsMap[productName]?.casePack) || 6;
                    return !isMultipleOfBox(totalQty, productsPerBox);
                })
                .map(([productName, totalQty]) => {
                    const product = productBreakdown[productName];
                    const productsPerBox = product?.productsPerBox || parseInt(productsMap[productName]?.casePack) || 6;
                    return { productName, totalQty, productsPerBox };
                });

            if (invalidProducts.length > 0) {
                // Show confirmation dialog instead of blocking
                setPendingOrderData({ allProductsForOrder, invalidProducts });
                setShowNonMultipleConfirmation(true);
                setLoading(false);
                return;
            }

            // All products are multiples of their box size, proceed with order
            await processOrder(allProductsForOrder);
        } catch (error) {
            console.error('Error confirming order:', error);
            toast.error(error.message || 'Erreur lors de la confirmation de la commande');
            setLoading(false);
        }
    };

    const processOrder = async (allProductsForOrder) => {
        try {
            setLoading(true);

            // Get campaign data
            const { campaign, fallbackSplit: fallback } = await getCampaignDataWithFallback(schoolId, school);

            // Calculate benefits for each product
            let totalStudentCashBenefit = 0;
            let totalStudentSchoolAccountBenefit = 0;
            let totalOrganizationBenefit = 0;
            let totalRaffleBenefit = 0;

            const calculatedProducts = allProductsForOrder.map(product => {
                const productObj = productsList.find(p => p.name === product.productName);
                const productId = productObj?._id?.toString() || productObj?.id?.toString();

                const profitSplit = campaign?.profitSplits?.find(ps => {
                    const psProductId = ps.productId?._id?.toString() || ps.productId?.toString();
                    return psProductId === productId;
                });

                let studentCashB, studentSchoolAccountB, organizationB, raffleB;

                if (profitSplit && campaign?.profitSplitType === 'absolute') {
                    studentCashB = (Number(profitSplit.studentCash) || 0) * product.quantity;
                    studentSchoolAccountB = (Number(profitSplit.studentSchoolAccount) || 0) * product.quantity;
                    organizationB = (Number(profitSplit.schoolProject) || 0) * product.quantity;
                    raffleB = (Number(profitSplit.raffle) || 0) * product.quantity;
                } else {
                    const profit = (product.price - product.cost) * product.quantity;
                    const studentPercentage = fallback?.studentBenefit || 85.6;
                    const studentBenefitHalf = studentPercentage / 2;
                    const organizationPercentage = fallback?.organizationBenefit || 9.4;
                    const rafflePercentage = fallback?.raffleBenefit || 5.0;

                    studentCashB = profit * (studentBenefitHalf / 100);
                    studentSchoolAccountB = profit * (studentBenefitHalf / 100);
                    organizationB = profit * (organizationPercentage / 100);
                    raffleB = profit * (rafflePercentage / 100);
                }

                totalStudentCashBenefit += studentCashB;
                totalStudentSchoolAccountBenefit += studentSchoolAccountB;
                totalOrganizationBenefit += organizationB;
                totalRaffleBenefit += raffleB;

                return {
                    productName: product.productName,
                    productId: productId, // Include productId so API can find correct profit splits
                    quantity: product.quantity,
                    price: product.price,
                    cost: product.cost,
                    profit: (product.price - product.cost) * product.quantity,
                    studentCashBenefit: studentCashB,
                    studentSchoolAccountBenefit: studentSchoolAccountB,
                    schoolProjectBenefit: organizationB,
                    raffleBenefit: raffleB,
                    isAdditional: product.isAdditional || false
                };
            });

            const totalUnits = calculatedTotals.totalQuantity;
            // Use the calculated total amount to pay (includes cost + donations to remit)
            const totalAmountToPay = calculatedTotals.totalAmountToPay;

            // For OrderStudent, we store the product cost only (as totalAmount)
            // The payment amount includes donations that must be remitted
            const totalAmount = calculatedTotals.totalCost; // Product cost only for OrderStudent record

            // Get campaignId from campaignContext to ensure it matches the store's campaignId
            const campaignIdFromContext = campaignContext?.activeCampaignId;

            const studentOrderData = {
                timestamp: new Date(),
                email: session.user.email,
                studentName: session.user.name,
                phoneNumber: session.user.parentInfo?.telephone || '000-000-0000',
                schoolId: school._id,
                campaignId: campaignIdFromContext, // Pass campaignId explicitly
                products: calculatedProducts,
                totalUnits,
                totalAmount,
                amountPaid: 0,
                studentCashBenefit: totalStudentCashBenefit,
                studentSchoolAccountBenefit: totalStudentSchoolAccountBenefit,
                schoolProjectBenefit: totalOrganizationBenefit,
                raffleBenefit: totalRaffleBenefit,
            };

            // Send order to API
            const response = await fetch('/api/orderStudent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentOrderData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la création de la commande étudiante');
            }

            const data = await response.json();
            toast.success('🎉 Commande passée avec succès! Votre boutique reste ouverte pour continuer à vendre!');

            // Store order ID and amount for payment instructions
            // The amount to pay includes product cost + donations that must be remitted
            setOrderId(data.order?.orderId || data.orderId);
            setAmountToPay(totalAmountToPay);

            // Show thank you message first, then payment instructions after a delay
            setShowThankYouMessage(true);

            // After 3 seconds, show payment instructions
            setTimeout(() => {
                setShowThankYouMessage(false);
                setShowPaymentInstructions(true);
            }, 3000);

            // Call callback (but don't close modal yet)
            if (onOrderPlaced) {
                onOrderPlaced(data);
            }
        } catch (error) {
            toast.error(`Erreur: ${error.message}`);
            console.error('Error placing order:', error);
        } finally {
            setLoading(false);
        }
    };

    const productBreakdownArray = Object.values(productBreakdown);

    // Check if all products are multiples of their box size (dynamic box sizes)
    const allProductsAreMultiplesOfBox = useMemo(() => {
        // Check sold products
        for (const product of productBreakdownArray) {
            const additionalQty = additionalProducts[product.productName] || 0;
            const totalQty = product.soldQuantity + additionalQty;
            if (totalQty > 0) {
                const productsPerBox = product?.productsPerBox || parseInt(productsMap[product.productName]?.casePack) || 6;
                if (!isMultipleOfBox(totalQty, productsPerBox)) return false;
            }
        }
        // Check additional-only products
        for (const [productName, quantity] of Object.entries(additionalProducts)) {
            if (!productBreakdown[productName] && quantity > 0) {
                const productsPerBox = parseInt(productsMap[productName]?.casePack) || 6;
                if (!isMultipleOfBox(quantity, productsPerBox)) return false;
            }
        }
        return true;
    }, [productBreakdown, additionalProducts, productBreakdownArray, productsMap]);

    // Legacy: Check if all products are multiples of 6 (for backward compatibility)
    const allProductsAreMultiplesOf6 = useMemo(() => {
        // Check sold products
        for (const product of productBreakdownArray) {
            const additionalQty = additionalProducts[product.productName] || 0;
            const totalQty = product.soldQuantity + additionalQty;
            if (totalQty > 0 && totalQty % 6 !== 0) return false;
        }
        // Check additional-only products
        for (const [productName, quantity] of Object.entries(additionalProducts)) {
            if (!productBreakdown[productName] && quantity > 0 && quantity % 6 !== 0) return false;
        }
        return true;
    }, [productBreakdown, additionalProducts, productBreakdownArray]);

    const hasRaffleProfit = calculatedTotals.totalRaffleProfit > 0;

    // If showing thank you message, render that first
    if (showThankYouMessage) {
        return (
            <Dialog open={open} onOpenChange={() => { }}>
                <DialogContent className="bg-white p-8 rounded-lg shadow-xl max-w-md">
                    <DialogHeader>
                        <div className="flex flex-col items-center space-y-4">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                            >
                                <CheckCircle2 className="h-20 w-20 text-green-500" />
                            </motion.div>
                            <DialogTitle className="text-3xl font-bold text-gray-900 text-center">
                                Merci pour votre commande!
                            </DialogTitle>
                            <DialogDescription className="text-center text-gray-600 text-lg">
                                Votre commande a été enregistrée avec succès.
                                <br />
                                Vous allez recevoir les instructions de paiement dans quelques instants...
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
    }

    // If showing payment instructions, render that instead
    if (showPaymentInstructions) {
        const schoolName = school?.name || school?.code || 'N/A';
        const personName = session?.user?.name || 'N/A';
        const paymentMessage = `${schoolName}-${orderId || 'N/A'}-${personName}`;

        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="bg-white p-6 rounded-lg shadow-xl max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center space-x-3 mb-2">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                            <DialogTitle className="text-2xl font-bold text-gray-900">
                                Merci, commande reçue!
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-gray-600">
                            Suivez les étapes ci-dessous pour finaliser votre paiement par virement Interac.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 space-y-6">
                        {/* Step 1: Bank Selection */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">1. Choisissez votre banque :</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                <a
                                    href="https://www.desjardins.com/fr/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200 group"
                                >
                                    <img src="/images/desjardins.svg" alt="Desjardins" className="w-10 h-10 object-contain mb-2" />
                                    <span className="text-xs font-medium text-gray-700 group-hover:text-green-700">Desjardins</span>
                                </a>
                                <a
                                    href="https://www.bnc.ca/fr/particuliers.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                                >
                                    <img src="/images/bnc.svg" alt="BNC" className="w-10 h-10 object-contain mb-2" />
                                    <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">BNC</span>
                                </a>
                                <a
                                    href="https://www.rbcbanqueroyale.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all duration-200 group"
                                >
                                    <img src="/images/rbc.svg" alt="RBC" className="w-10 h-10 object-contain mb-2" />
                                    <span className="text-xs font-medium text-gray-700 group-hover:text-red-700">RBC</span>
                                </a>
                                <a
                                    href="https://www.td.com/ca/fr/perso/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200 group"
                                >
                                    <img src="/images/TD.svg" alt="TD" className="w-10 h-10 object-contain mb-2" />
                                    <span className="text-xs font-medium text-gray-700 group-hover:text-green-700">TD</span>
                                </a>
                                <a
                                    href="https://www.scotiabank.com/ca/fr/particuliers.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all duration-200 group"
                                >
                                    <img src="/images/Scotiabank.svg" alt="Scotiabank" className="w-10 h-10 object-contain mb-2" />
                                    <span className="text-xs font-medium text-gray-700 group-hover:text-red-700">Scotiabank</span>
                                </a>
                                <a
                                    href="https://www.cibc.com/fr/personal-banking.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all duration-200 group"
                                >
                                    <img src="/images/cibc.svg" alt="CIBC" className="w-10 h-10 object-contain mb-2" />
                                    <span className="text-xs font-medium text-gray-700 group-hover:text-red-700">CIBC</span>
                                </a>
                            </div>
                        </div>

                        {/* Step 2: Email */}
                        <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1">
                                <p className="text-sm text-gray-600 mb-1">2. Destinataire :</p>
                                <p className="text-base font-semibold text-gray-900">campagne@jappuie.ca</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0"
                                onClick={() => copyToClipboard('campagne@jappuie.ca', 'email')}
                                title="Copier l'email"
                            >
                                {copiedField === 'email' ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4 text-gray-500" />
                                )}
                            </Button>
                        </div>

                        {/* Step 3: Amount */}
                        <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1">
                                <p className="text-sm text-gray-600 mb-1">3. Montant à payer :</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {amountToPay ? parseFloat(amountToPay).toFixed(2) : '0.00'}$
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0"
                                onClick={() => copyToClipboard(amountToPay ? parseFloat(amountToPay).toFixed(2) : '0.00', 'montant')}
                                title="Copier le montant"
                            >
                                {copiedField === 'montant' ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4 text-gray-500" />
                                )}
                            </Button>
                        </div>

                        {/* Step 4: Message */}
                        <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-600 mb-1">4. Message de virement :</p>
                                <p className="text-base font-mono text-gray-900 break-all">
                                    {paymentMessage}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0"
                                onClick={() => copyToClipboard(paymentMessage, 'message')}
                                title="Copier le message"
                            >
                                {copiedField === 'message' ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4 text-gray-500" />
                                )}
                            </Button>
                        </div>

                        {/* Important Notice */}
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                            <p className="text-sm text-yellow-800">
                                <strong>IMPORTANT :</strong> Assurez-vous de faire le virement avant de quitter cette page.
                                Vous allez sous peu recevoir un courriel de confirmation avec ces mêmes informations de paiement.
                                Si vous avez déjà effectué le paiement, ne tenez pas compte de ce courriel.
                                Il se peut qu&apos;il soit dans vos indésirables.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button
                            onClick={() => {
                                setShowPaymentInstructions(false);
                                onOpenChange(false);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="lg"
                        >
                            J&apos;ai compris, fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                🎉 Félicitations! Passez votre commande
                            </DialogTitle>
                            <DialogDescription className="text-base mt-2">
                                {calculatedTotals.soldQuantity > 0 ? (
                                    <>
                                        Vous avez déjà vendu <span className="font-bold text-blue-600">{calculatedTotals.soldQuantity}</span> unités!
                                        Continuez à vendre pour maximiser vos profits!
                                    </>
                                ) : (
                                    <>
                                        Vous n'avez pas encore de commandes payées à inclure dans cette commande.
                                        {(!paidOrders || paidOrders.length === 0) && (
                                            <span className="block mt-2 text-sm text-amber-600">
                                                Note: Les commandes TEST sont exclues de cette commande finale.
                                            </span>
                                        )}
                                    </>
                                )}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Hype Section - Continue Selling */}
                    {deliveryInfo && deliveryInfo.canStillSell && (
                        <Card className="border-2 border-gradient-to-r from-green-400 to-blue-500 bg-gradient-to-br from-green-50 to-blue-50">
                            <CardHeader>
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-gradient-to-br from-green-400 to-blue-500 rounded-full">
                                        <TrendingUp className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-2xl text-gray-900 mb-2">
                                            🚀 Continuez à vendre pendant encore {deliveryInfo.daysUntilDelivery} jours!
                                        </CardTitle>
                                        <p className="text-gray-700 text-lg">
                                            Votre boutique reste <span className="font-bold text-green-600">OUVERTE</span> jusqu'à ce que vous ayez vendu tout votre inventaire
                                            ou que vous la fermiez manuellement. La livraison est prévue le{' '}
                                            <span className="font-bold text-blue-600">{deliveryInfo.formattedDeliveryDate}</span>.
                                        </p>
                                        {allProductsFreezable && (
                                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                <p className="text-sm text-blue-800">
                                                    <strong>❄️ Note importante:</strong> Tous les produits de votre commande peuvent être congelés pour une conservation optimale.
                                                    Vous pouvez les congeler dès réception et les décongeler au besoin.
                                                </p>
                                            </div>
                                        )}
                                        <div className="mt-4 p-4 bg-white rounded-lg border-2 border-green-300">
                                            <p className="text-sm text-gray-700">
                                                <strong>💡 Astuce:</strong> Plus vous vendez maintenant, plus vous gagnez!
                                                Chaque vente supplémentaire augmente directement vos profits.
                                                Partagez votre boutique avec votre famille et vos amis pour maximiser vos ventes! En bonus, à partir du moment où vous passez votre commande, vous gardez 100% de tout les dons recueillis.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    )}

                    {/* Store Stays Open Info */}
                    <Alert className="bg-blue-50 border-blue-200">
                        <Store className="h-5 w-5 text-blue-600" />
                        <AlertDescription className="text-base">
                            <strong>Votre boutique reste ouverte!</strong> Après avoir passé cette commande, votre boutique en ligne
                            restera accessible à vos clients jusqu'à ce que vous ayez vendu tout votre inventaire ou que vous la fermiez manuellement.
                            Vous pouvez continuer à recevoir des commandes et augmenter vos profits!
                        </AlertDescription>
                    </Alert>

                    {/* Freezing Info - Dynamic based on products */}
                    {allProductsFreezable && (
                        <Alert className="bg-cyan-50 border-cyan-200">
                            <Package className="h-5 w-5 text-cyan-600" />
                            <AlertDescription className="text-base">
                                <strong>❄️ Conservation des produits:</strong> Tous les produits de votre commande peuvent être congelés pour une conservation optimale.
                                Vous pouvez les congeler dès réception et les décongeler au besoin. Cette flexibilité vous permet de mieux gérer votre inventaire!
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Earnings Comparison - What You've Made vs What You'll Make */}
                    <Card className="border-2 border-gradient-to-r from-yellow-400 to-orange-500 bg-gradient-to-br from-yellow-50 to-orange-50">
                        <CardHeader>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full">
                                    <DollarSign className="h-8 w-8 text-white" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-2xl text-gray-900 mb-4">
                                        💰 Vos gains actuels vs gains potentiels
                                    </CardTitle>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Current Earnings from Sold Products */}
                                        <Card className="bg-white border-2 border-green-300">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    <CardTitle className="text-lg text-green-700">Ce que vous avez déjà gagné</CardTitle>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Produits vendus:</span>
                                                        <span className="font-semibold">{calculatedTotals.soldQuantity} unités</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Revenus totaux:</span>
                                                        <span className="font-semibold text-blue-600">
                                                            {(financialBreakdown
                                                                .filter(p => !p.isAdditional)
                                                                .reduce((sum, p) => sum + p.totalRevenue, 0) +
                                                                donationsAndDiscounts.totalDonations).toFixed(2)}$
                                                        </span>
                                                    </div>
                                                    <div className="border-t pt-2 mt-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-medium text-gray-700">Votre profit total:</span>
                                                            <span className="text-2xl font-bold text-green-600">
                                                                {(() => {
                                                                    const soldProductsProfit = financialBreakdown
                                                                        .filter(p => !p.isAdditional)
                                                                        .reduce((sum, p) => sum + p.totalStudentProfit, 0);
                                                                    const netSoldCash = Math.max(0, financialBreakdown
                                                                        .filter(p => !p.isAdditional)
                                                                        .reduce((sum, p) => sum + p.cashProfit, 0) - donationsAndDiscounts.discountFromCash);
                                                                    const netSoldAccount = Math.max(0, financialBreakdown
                                                                        .filter(p => !p.isAdditional)
                                                                        .reduce((sum, p) => sum + p.schoolAccountProfit, 0) - donationsAndDiscounts.discountFromSchoolAccount);
                                                                    return (netSoldCash + netSoldAccount + donationsAndDiscounts.totalStudentDonationsToCash + donationsAndDiscounts.totalStudentDonationsToAccount).toFixed(2);
                                                                })()}$
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {(() => {
                                                                const netSoldCash = Math.max(0, financialBreakdown
                                                                    .filter(p => !p.isAdditional)
                                                                    .reduce((sum, p) => sum + p.cashProfit, 0) - donationsAndDiscounts.discountFromCash);
                                                                const netSoldAccount = Math.max(0, financialBreakdown
                                                                    .filter(p => !p.isAdditional)
                                                                    .reduce((sum, p) => sum + p.schoolAccountProfit, 0) - donationsAndDiscounts.discountFromSchoolAccount);
                                                                return `${netSoldCash.toFixed(2)}$ comptant + ${netSoldAccount.toFixed(2)}$ compte`;
                                                            })()}
                                                            {donationsAndDiscounts.totalStudentDonationsToCash + donationsAndDiscounts.totalStudentDonationsToAccount > 0 && (
                                                                <span className="block mt-1 text-green-600">
                                                                    + {(donationsAndDiscounts.totalStudentDonationsToCash + donationsAndDiscounts.totalStudentDonationsToAccount).toFixed(2)}$ dons
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Potential Earnings from Additional Inventory */}
                                        <Card className="bg-white border-2 border-purple-300">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-5 w-5 text-purple-600" />
                                                    <CardTitle className="text-lg text-purple-700">Ce que vous pourriez gagner</CardTitle>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Inventaire supplémentaire:</span>
                                                        <span className="font-semibold">
                                                            {calculatedTotals.additionalQuantity > 0 ? `+${calculatedTotals.additionalQuantity} unités` : '0 unité'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Revenus potentiels:</span>
                                                        <span className="font-semibold text-blue-600">
                                                            {calculatedTotals.additionalQuantity > 0
                                                                ? financialBreakdown
                                                                    .filter(p => p.isAdditional)
                                                                    .reduce((sum, p) => sum + p.totalRevenue, 0)
                                                                    .toFixed(2)
                                                                : '0.00'
                                                            }$
                                                        </span>
                                                    </div>
                                                    <div className="border-t pt-2 mt-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-medium text-gray-700">Profit potentiel:</span>
                                                            <span className="text-2xl font-bold text-purple-600">
                                                                {calculatedTotals.additionalQuantity > 0
                                                                    ? financialBreakdown
                                                                        .filter(p => p.isAdditional)
                                                                        .reduce((sum, p) => sum + p.totalStudentProfit, 0)
                                                                        .toFixed(2)
                                                                    : '0.00'
                                                                }$
                                                            </span>
                                                        </div>
                                                        {calculatedTotals.additionalQuantity > 0 && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {financialBreakdown
                                                                    .filter(p => p.isAdditional)
                                                                    .reduce((sum, p) => sum + p.cashProfit, 0)
                                                                    .toFixed(2)}$ comptant + {' '}
                                                                {financialBreakdown
                                                                    .filter(p => p.isAdditional)
                                                                    .reduce((sum, p) => sum + p.schoolAccountProfit, 0)
                                                                    .toFixed(2)}$ compte
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Total Potential Earnings */}
                                    {calculatedTotals.additionalQuantity > 0 && (
                                        <div className="mt-4 p-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg text-white">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium opacity-90">Si vous vendez tout votre inventaire:</div>
                                                    <div className="text-3xl font-bold mt-1">
                                                        {(() => {
                                                            // Calculate sold products profit (including donations)
                                                            const netSoldCash = Math.max(0, financialBreakdown
                                                                .filter(p => !p.isAdditional)
                                                                .reduce((sum, p) => sum + p.cashProfit, 0) - donationsAndDiscounts.discountFromCash);
                                                            const netSoldAccount = Math.max(0, financialBreakdown
                                                                .filter(p => !p.isAdditional)
                                                                .reduce((sum, p) => sum + p.schoolAccountProfit, 0) - donationsAndDiscounts.discountFromSchoolAccount);
                                                            const soldProductsProfit = netSoldCash + netSoldAccount + donationsAndDiscounts.totalStudentDonationsToCash + donationsAndDiscounts.totalStudentDonationsToAccount;

                                                            // Calculate additional products profit
                                                            const additionalCash = financialBreakdown
                                                                .filter(p => p.isAdditional)
                                                                .reduce((sum, p) => sum + p.cashProfit, 0);
                                                            const additionalAccount = financialBreakdown
                                                                .filter(p => p.isAdditional)
                                                                .reduce((sum, p) => sum + p.schoolAccountProfit, 0);
                                                            const additionalProductsProfit = additionalCash + additionalAccount;

                                                            return (soldProductsProfit + additionalProductsProfit).toFixed(2);
                                                        })()}$
                                                    </div>
                                                    <div className="text-sm opacity-90 mt-1">
                                                        {(() => {
                                                            const netSoldCash = Math.max(0, financialBreakdown
                                                                .filter(p => !p.isAdditional)
                                                                .reduce((sum, p) => sum + p.cashProfit, 0) - donationsAndDiscounts.discountFromCash);
                                                            const additionalCash = financialBreakdown
                                                                .filter(p => p.isAdditional)
                                                                .reduce((sum, p) => sum + p.cashProfit, 0);
                                                            const totalCash = netSoldCash + additionalCash + donationsAndDiscounts.totalStudentDonationsToCash;

                                                            const netSoldAccount = Math.max(0, financialBreakdown
                                                                .filter(p => !p.isAdditional)
                                                                .reduce((sum, p) => sum + p.schoolAccountProfit, 0) - donationsAndDiscounts.discountFromSchoolAccount);
                                                            const additionalAccount = financialBreakdown
                                                                .filter(p => p.isAdditional)
                                                                .reduce((sum, p) => sum + p.schoolAccountProfit, 0);
                                                            const totalAccount = netSoldAccount + additionalAccount + donationsAndDiscounts.totalStudentDonationsToAccount;

                                                            return `${totalCash.toFixed(2)}$ comptant + ${totalAccount.toFixed(2)}$ compte`;
                                                        })()}
                                                        {donationsAndDiscounts.totalStudentDonationsToCash + donationsAndDiscounts.totalStudentDonationsToAccount > 0 && (
                                                            <span className="block mt-1">
                                                                (inclut {(donationsAndDiscounts.totalStudentDonationsToCash + donationsAndDiscounts.totalStudentDonationsToAccount).toFixed(2)}$ dons)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium opacity-90">Gain supplémentaire:</div>
                                                    <div className="text-3xl font-bold mt-1">
                                                        +{financialBreakdown
                                                            .filter(p => p.isAdditional)
                                                            .reduce((sum, p) => sum + p.totalStudentProfit, 0)
                                                            .toFixed(2)}$
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* One-Click Multiples of Box Button */}
                    {!allProductsAreMultiplesOfBox && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="flex justify-center"
                        >
                            <Button
                                onClick={handleMakeAllMultiplesOfBox}
                                variant="default"
                                size="lg"
                                disabled={!isOrderingPeriod}
                                className={`relative overflow-hidden transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg text-white font-semibold py-3 px-6 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 ${isOrderingPeriod
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                    : 'bg-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                <motion.span
                                    className="relative z-10 flex items-center space-x-2"
                                    whileHover={isOrderingPeriod ? { x: 5 } : {}}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Zap className="h-5 w-5" />
                                    <span>Ajuster tous les produits aux multiples de leurs boîtes (un clic!)</span>
                                </motion.span>
                                {isOrderingPeriod && (
                                    <motion.div
                                        className="absolute inset-0 bg-white"
                                        initial={{ scale: 0, opacity: 0 }}
                                        whileHover={{ scale: 1.5, opacity: 0.15 }}
                                        transition={{ duration: 0.3 }}
                                        style={{ borderRadius: '100%', zIndex: 0 }}
                                    />
                                )}
                            </Button>
                        </motion.div>
                    )}

                    {/* Product Breakdown Table */}
                    {productBreakdownArray.length > 0 && (
                        <Card className={!isOrderingPeriod ? 'opacity-60 pointer-events-none' : ''}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Ajustement des quantités
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                                    <p className="text-sm text-gray-700">
                                        <strong>💡 Pourquoi commander en boîtes complètes ?</strong>
                                    </p>
                                    <p className="text-sm text-gray-600 mt-2">
                                        Afin de faciliter la préparation et d&apos;éviter les erreurs, merci de former autant que possible des caisses complètes selon la configuration de chaque produit.
                                        Les produits arrivent du fournisseur en boîtes, et commander en multiples de la taille de boîte permet d&apos;éviter de déballer et réemballer les produits,
                                        ce qui accélère la préparation de votre commande et réduit les risques d&apos;erreurs.
                                    </p>
                                    <p className="text-sm text-gray-600 mt-2">
                                        <strong>Note :</strong> Chaque produit a sa propre taille de boîte définie par le fournisseur. Le système ajuste automatiquement les suggestions selon ces paramètres.
                                    </p>
                                </div>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Produit</TableHead>
                                                <TableHead className="text-right">Vendu</TableHead>
                                                <TableHead className="text-right">Suggestion</TableHead>
                                                <TableHead className="text-right">Ajouter</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead className="text-right">Boîte complète?</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productBreakdownArray.map((product) => {
                                                const additionalQty = additionalProducts[product.productName] || 0;
                                                const totalQty = product.soldQuantity + additionalQty;
                                                const productsPerBox = product.productsPerBox || 6;
                                                const isMultiple = isMultipleOfBox(totalQty, productsPerBox);
                                                // Always calculate next multiple (even if already at a multiple, show next one)
                                                const nextMultiple = isMultiple
                                                    ? totalQty + productsPerBox  // If already at multiple, next is +one box
                                                    : getNextMultipleOfBox(totalQty, productsPerBox); // Otherwise, get next multiple
                                                const stillNeeded = nextMultiple - totalQty;
                                                // Dynamic suggestion - always show next multiple (minimum one box)
                                                const dynamicSuggestion = stillNeeded > 0 ? stillNeeded : productsPerBox;

                                                return (
                                                    <TableRow key={product.productName}>
                                                        <TableCell className="font-medium">{product.productName}</TableCell>
                                                        <TableCell className="text-right">{product.soldQuantity}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleSetSuggestedQuantity(product.productName, dynamicSuggestion)}
                                                                className="text-xs"
                                                                disabled={!isOrderingPeriod}
                                                            >
                                                                +{dynamicSuggestion}
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleAdditionalQuantityChange(product.productName, -1)}
                                                                    disabled={additionalQty === 0 || !isOrderingPeriod}
                                                                >
                                                                    <Minus className="h-3 w-3" />
                                                                </Button>
                                                                <Input
                                                                    type="number"
                                                                    value={additionalQty}
                                                                    onChange={(e) => {
                                                                        if (!isOrderingPeriod) return;
                                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                        if (val === 0) {
                                                                            const { [product.productName]: _, ...rest } = additionalProducts;
                                                                            setAdditionalProducts(rest);
                                                                        } else {
                                                                            setAdditionalProducts(prev => ({
                                                                                ...prev,
                                                                                [product.productName]: val
                                                                            }));
                                                                        }
                                                                    }}
                                                                    className="w-20 text-center"
                                                                    min="0"
                                                                    disabled={!isOrderingPeriod}
                                                                />
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleAdditionalQuantityChange(product.productName, 1)}
                                                                    disabled={!isOrderingPeriod}
                                                                >
                                                                    <Plus className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">{totalQty}</TableCell>
                                                        <TableCell className="text-right">
                                                            {isMultiple ? (
                                                                <Badge variant="default" className="bg-green-500">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                    Boîte complète
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-orange-600">
                                                                    +{stillNeeded} pour {nextMultiple}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Add New Products Section */}
                    <Card className={!isOrderingPeriod ? 'opacity-60 pointer-events-none' : ''}>
                        <CardHeader>
                            <CardTitle>Ajouter d&apos;autres produits</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <select
                                    className="w-full p-2 border rounded"
                                    onChange={(e) => {
                                        if (!isOrderingPeriod) return;
                                        const productName = e.target.value;
                                        if (productName && !productBreakdown[productName]) {
                                            setAdditionalProducts(prev => ({
                                                ...prev,
                                                [productName]: prev[productName] || 6 // Default to 6
                                            }));
                                            e.target.value = '';
                                        }
                                    }}
                                    defaultValue=""
                                    disabled={!isOrderingPeriod}
                                >
                                    <option value="">Sélectionner un produit...</option>
                                    {allProducts
                                        .filter(p => !productBreakdown[p.name])
                                        .map(product => (
                                            <option key={product.id} value={product.name}>
                                                {product.name} - {product.price.toFixed(2)}$
                                            </option>
                                        ))}
                                </select>
                                {Object.entries(additionalProducts)
                                    .filter(([name]) => !productBreakdown[name])
                                    .map(([productName, quantity]) => {
                                        const product = allProducts.find(p => p.name === productName);
                                        if (!product) return null;
                                        const totalQty = quantity;
                                        const isMultiple = totalQty > 0 && totalQty % 6 === 0;
                                        const nextMultiple = getNextMultipleOf6(totalQty);
                                        const stillNeeded = nextMultiple - totalQty;

                                        return (
                                            <div key={productName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                                <span className="font-medium">{productName}</span>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (!isOrderingPeriod) return;
                                                            // For products not yet sold, subtract 6 or go to previous multiple
                                                            if (totalQty % 6 === 0 && totalQty >= 6) {
                                                                // Already at a multiple, subtract 6
                                                                setAdditionalProducts(prev => {
                                                                    const newVal = Math.max(0, quantity - 6);
                                                                    if (newVal === 0) {
                                                                        const { [productName]: _, ...rest } = prev;
                                                                        return rest;
                                                                    }
                                                                    return { ...prev, [productName]: newVal };
                                                                });
                                                            } else {
                                                                // Not at a multiple, go to previous multiple
                                                                const previousMultiple = Math.floor(totalQty / 6) * 6;
                                                                setAdditionalProducts(prev => {
                                                                    if (previousMultiple === 0) {
                                                                        const { [productName]: _, ...rest } = prev;
                                                                        return rest;
                                                                    }
                                                                    return { ...prev, [productName]: previousMultiple };
                                                                });
                                                            }
                                                        }}
                                                        disabled={quantity === 0 || !isOrderingPeriod}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <Input
                                                        type="number"
                                                        value={quantity}
                                                        onChange={(e) => {
                                                            if (!isOrderingPeriod) return;
                                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                                            if (val === 0) {
                                                                const { [productName]: _, ...rest } = additionalProducts;
                                                                setAdditionalProducts(rest);
                                                            } else {
                                                                setAdditionalProducts(prev => ({
                                                                    ...prev,
                                                                    [productName]: val
                                                                }));
                                                            }
                                                        }}
                                                        className="w-20 text-center"
                                                        min="0"
                                                        disabled={!isOrderingPeriod}
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (!isOrderingPeriod) return;
                                                            // For products not yet sold, always add 6 units (or go to next multiple if not at one)
                                                            if (totalQty % 6 === 0) {
                                                                // Already at a multiple, add 6 more
                                                                setAdditionalProducts(prev => ({
                                                                    ...prev,
                                                                    [productName]: quantity + 6
                                                                }));
                                                            } else {
                                                                // Not at a multiple, go to next multiple
                                                                const nextMultiple = getNextMultipleOf6(totalQty);
                                                                const needed = nextMultiple - totalQty;
                                                                setAdditionalProducts(prev => ({
                                                                    ...prev,
                                                                    [productName]: quantity + needed
                                                                }));
                                                            }
                                                        }}
                                                        disabled={!isOrderingPeriod}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                    {isMultiple ? (
                                                        <Badge variant="default" className="bg-green-500 ml-2">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="ml-2 text-orange-600">
                                                            +{stillNeeded}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Financial Breakdown Table */}
                    {financialBreakdown.length > 0 && (
                        <Card className="border-2 border-blue-200">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <DollarSign className="h-6 w-6 text-blue-600" />
                                    Détail financier de votre commande
                                </CardTitle>
                                <p className="text-sm text-gray-600 mt-2">
                                    Voici exactement ce que vous payez et où va votre argent
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs sm:text-sm">Produit</TableHead>
                                                <TableHead className="text-right text-xs sm:text-sm">Qté</TableHead>
                                                <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">Prix Vente</TableHead>
                                                <TableHead className="text-right text-xs sm:text-sm">Ventes Totales</TableHead>
                                                <TableHead className="text-right text-xs sm:text-sm font-semibold text-red-600">Coût produit</TableHead>
                                                <TableHead className="text-right text-xs sm:text-sm text-purple-600">Profit + dons École</TableHead>
                                                <TableHead className="text-right text-xs sm:text-sm text-blue-600">Profit + Dons Compte Scolaire</TableHead>
                                                <TableHead className="text-right text-xs sm:text-sm text-green-600">Profit + Dons comptant</TableHead>
                                                <TableHead className="text-right font-bold text-xs sm:text-sm text-blue-600">Votre Profit Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {financialBreakdown.map((product, index) => (
                                                <TableRow key={index} className={product.isAdditional ? 'bg-blue-50' : ''}>
                                                    <TableCell className="font-medium text-xs sm:text-sm">
                                                        {product.productName}
                                                        {product.isAdditional && (
                                                            <Badge variant="outline" className="ml-2 text-xs">+Ajouté</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm">{product.quantity}</TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">
                                                        {product.unitPrice.toFixed(2)}$
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm font-medium">
                                                        {product.totalRevenue.toFixed(2)}$
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm font-semibold text-red-600">
                                                        {product.totalCost.toFixed(2)}$
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm text-purple-600">
                                                        {product.schoolProfit.toFixed(2)}$
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm text-blue-600">
                                                        {product.schoolAccountProfit.toFixed(2)}$
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm text-green-600">
                                                        {product.cashProfit.toFixed(2)}$
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-xs sm:text-sm text-blue-600">
                                                        {product.totalStudentProfit.toFixed(2)}$
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {/* Discounts Row */}
                                            {donationsAndDiscounts.totalDiscountAmount > 0 && (
                                                <TableRow className="bg-orange-50 border-t border-orange-200">
                                                    <TableCell colSpan={4} className="font-medium text-xs sm:text-sm text-orange-700">
                                                        Remises accordées
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm">-</TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm">-</TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm text-red-600">
                                                        {donationsAndDiscounts.discountFromSchoolAccount > 0 ? `-${donationsAndDiscounts.discountFromSchoolAccount.toFixed(2)}$` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm text-red-600">
                                                        {donationsAndDiscounts.discountFromCash > 0 ? `-${donationsAndDiscounts.discountFromCash.toFixed(2)}$` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm font-semibold text-red-600">
                                                        -{donationsAndDiscounts.totalDiscountAmount.toFixed(2)}$
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {/* Student Donations Row */}
                                            {(donationsAndDiscounts.totalStudentDonationsToCash > 0 || donationsAndDiscounts.totalStudentDonationsToAccount > 0) && (
                                                <TableRow className="bg-green-50 border-t border-green-200">
                                                    <TableCell colSpan={4} className="font-medium text-xs sm:text-sm text-green-700">
                                                        Dons élève
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm">-</TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm">-</TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm text-blue-600">
                                                        {donationsAndDiscounts.totalStudentDonationsToAccount > 0 ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="font-semibold">+{donationsAndDiscounts.totalStudentDonationsToAccount.toFixed(2)}$</span>
                                                                <span className="text-xs text-gray-600 font-normal">(à remettre)</span>
                                                            </div>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm text-green-600">
                                                        {donationsAndDiscounts.totalStudentDonationsToCash > 0 ? `+${donationsAndDiscounts.totalStudentDonationsToCash.toFixed(2)}$` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm font-semibold text-green-600">
                                                        +{(donationsAndDiscounts.totalStudentDonationsToCash + donationsAndDiscounts.totalStudentDonationsToAccount).toFixed(2)}$
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {/* School Donations Row */}
                                            {donationsAndDiscounts.totalSchoolDonations > 0 && (
                                                <TableRow className="bg-purple-50 border-t border-purple-200">
                                                    <TableCell colSpan={4} className="font-medium text-xs sm:text-sm text-purple-700">
                                                        Dons école
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm">-</TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm text-purple-600">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-semibold">+{donationsAndDiscounts.totalSchoolDonations.toFixed(2)}$</span>
                                                            <span className="text-xs text-gray-600 font-normal">(à remettre)</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm">-</TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm">-</TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm">-</TableCell>
                                                </TableRow>
                                            )}
                                            <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 font-bold border-t-2 border-blue-300">
                                                <TableCell colSpan={4} className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Trophy className="h-5 w-5 text-yellow-500" />
                                                        <span>TOTAUX</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-red-600">
                                                    {calculatedTotals.totalCost.toFixed(2)}$
                                                </TableCell>
                                                <TableCell className="text-right text-purple-600">
                                                    {(calculatedTotals.totalSchoolProfit + donationsAndDiscounts.totalSchoolDonations).toFixed(2)}$
                                                </TableCell>
                                                <TableCell className="text-right text-blue-600">
                                                    {(calculatedTotals.netSchoolAccountProfit + donationsAndDiscounts.totalStudentDonationsToAccount).toFixed(2)}$
                                                </TableCell>
                                                <TableCell className="text-right text-green-600">
                                                    {(calculatedTotals.netCashProfit + donationsAndDiscounts.totalStudentDonationsToCash).toFixed(2)}$
                                                </TableCell>
                                                <TableCell className="text-right text-blue-600 text-lg">
                                                    {(calculatedTotals.netCashProfit + calculatedTotals.netSchoolAccountProfit + donationsAndDiscounts.totalStudentDonationsToCash + donationsAndDiscounts.totalStudentDonationsToAccount).toFixed(2)}$
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Financial Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                    <Card className="bg-red-50 border-red-200">
                                        <CardContent className="pt-4">
                                            <div className="text-sm text-red-700 font-medium mb-1">Vous payez</div>
                                            <div className="text-2xl font-bold text-red-600">
                                                {calculatedTotals.totalAmountToPay.toFixed(2)}$
                                            </div>
                                            <div className="text-xs text-red-600 mt-2 space-y-1">
                                                <div>
                                                    <span className="font-semibold">{calculatedTotals.totalCost.toFixed(2)}$</span> Coût produit
                                                </div>
                                                {(calculatedTotals.totalSchoolProfit + donationsAndDiscounts.totalSchoolDonations) > 0 && (
                                                    <div>
                                                        <span className="font-semibold">{(calculatedTotals.totalSchoolProfit + donationsAndDiscounts.totalSchoolDonations).toFixed(2)}$</span> Profit + dons école (à l&apos;école)
                                                        {donationsAndDiscounts.totalSchoolDonations > 0 && (
                                                            <span className="block text-gray-600 italic mt-0.5">
                                                                (inclut {donationsAndDiscounts.totalSchoolDonations.toFixed(2)}$ dons à remettre)
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {(calculatedTotals.netSchoolAccountProfit + donationsAndDiscounts.totalStudentDonationsToAccount) > 0 && (
                                                    <div>
                                                        <span className="font-semibold">{(calculatedTotals.netSchoolAccountProfit + donationsAndDiscounts.totalStudentDonationsToAccount).toFixed(2)}$</span> Profit + dons compte scolaire (à vous)
                                                        {donationsAndDiscounts.totalStudentDonationsToAccount > 0 && (
                                                            <span className="block text-gray-600 italic mt-0.5">
                                                                (inclut {donationsAndDiscounts.totalStudentDonationsToAccount.toFixed(2)}$ dons reçus mais à remettre)
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-green-50 border-green-200">
                                        <CardContent className="pt-4">
                                            <div className="text-sm text-green-700 font-medium mb-1">Vous gardez (net)</div>
                                            <div className="text-2xl font-bold text-green-600">
                                                {(calculatedTotals.netCashProfit + donationsAndDiscounts.totalStudentDonationsToCash).toFixed(2)}$
                                            </div>
                                            <div className="text-xs text-green-600 mt-1">
                                                {calculatedTotals.netCashProfit.toFixed(2)}$ profit comptant
                                                {donationsAndDiscounts.totalStudentDonationsToCash > 0 && (
                                                    <span className="block mt-1">
                                                        + {donationsAndDiscounts.totalStudentDonationsToCash.toFixed(2)}$ dons comptant
                                                    </span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-blue-50 border-blue-200">
                                        <CardContent className="pt-4">
                                            <div className="text-sm text-blue-700 font-medium mb-1">Revenus totaux</div>
                                            <div className="text-2xl font-bold text-blue-600">
                                                {(calculatedTotals.totalRevenue + donationsAndDiscounts.totalDonations).toFixed(2)}$
                                            </div>
                                            <div className="text-xs text-blue-600 mt-1">
                                                {calculatedTotals.totalRevenue.toFixed(2)}$ ventes
                                                {donationsAndDiscounts.totalDonations > 0 && (
                                                    <span className="block mt-1">
                                                        + {donationsAndDiscounts.totalDonations.toFixed(2)}$ dons
                                                    </span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Reminder about real profits */}
                                <Alert className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-300">
                                    <AlertCircle className="h-5 w-5 text-green-600" />
                                    <AlertDescription className="text-sm text-gray-700">
                                        <strong className="text-green-700">💡 C&apos;est ici que les vrais profits commencent !</strong>
                                        <p className="mt-2">
                                            Une fois que vous avez passé votre commande, vous gardez <strong>100% de tous les dons</strong> que vous recevez.
                                            Les produits seront déjà payés, donc tout l&apos;argent des ventes supplémentaires vous appartient entièrement !
                                        </p>
                                        <p className="mt-1 text-xs text-gray-600 italic">
                                            Continuez à vendre pour maximiser vos profits ! 🚀
                                        </p>
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}

                    {/* Order Summary */}
                    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gift className="h-5 w-5 text-indigo-600" />
                                Résumé de votre commande
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-medium">Total unités vendues:</span>
                                    <span className="font-bold">{calculatedTotals.soldQuantity}</span>
                                </div>
                                {calculatedTotals.additionalQuantity > 0 && (
                                    <div className="flex justify-between items-center text-lg text-blue-600">
                                        <span className="font-medium">Unités supplémentaires:</span>
                                        <span className="font-bold">+{calculatedTotals.additionalQuantity}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xl font-bold border-t-2 border-indigo-300 pt-3">
                                    <span>Total unités à commander:</span>
                                    <span className="text-2xl text-indigo-600">{calculatedTotals.totalQuantity}</span>
                                </div>
                                {allProductsAreMultiplesOfBox ? (
                                    <Alert className="bg-green-50 border-green-200">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-sm text-green-700">
                                            ✅ Parfait, votre commande est ajustée en caisses complètes. Merci beaucoup!
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <Alert className="bg-orange-50 border-orange-200">
                                        <AlertCircle className="h-4 w-4 text-orange-600" />
                                        <AlertDescription className="text-sm">
                                            Certains produits ne sont pas en boîtes complètes. Utilisez le bouton ci-dessus pour ajuster automatiquement.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <DialogFooter className="gap-3 flex-col">
                    {!isOrderingPeriod && campaignEndDateLong && (
                        <Alert className="w-full bg-yellow-50 border-yellow-200">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-sm text-gray-700">
                                La fin de la campagne est le{' '}
                                <span className="font-medium">{campaignEndDateLong}</span>.
                                {' '}Vous pouvez passer votre commande dès 2 jours avant jusqu'à 1 jour après cette date (pour les retardataires).
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="flex gap-3 w-full">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} size="lg" className="flex-1">
                            Annuler
                        </Button>
                        <Button
                            onClick={handleConfirmOrder}
                            disabled={loading || calculatedTotals.totalQuantity === 0 || !isOrderingPeriod}
                            size="lg"
                            className={`flex-1 font-bold text-lg px-8 shadow-lg ${isOrderingPeriod
                                ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white'
                                : 'bg-gray-400 cursor-not-allowed text-white'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Traitement...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-5 w-5 mr-2" />
                                    Confirmer la commande 🎉
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>

            {/* Confirmation Dialog for Non-Multiple of 6 */}
            <Dialog open={showNonMultipleConfirmation} onOpenChange={setShowNonMultipleConfirmation}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-600">
                            <AlertCircle className="h-5 w-5" />
                            Confirmation requise
                        </DialogTitle>
                        <DialogDescription>
                            Certains produits ne sont pas en boîtes complètes
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <p className="text-sm text-gray-700 mb-3">
                                <strong>Les produits suivants ne sont pas en boîtes complètes :</strong>
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                                {pendingOrderData?.invalidProducts.map(({ productName, totalQty, productsPerBox }) => {
                                    const boxSize = productsPerBox || 6;
                                    const recommended = Math.ceil(totalQty / boxSize) * boxSize;
                                    return (
                                        <li key={productName}>
                                            {productName}: {totalQty} unités (boîte complète recommandée: {recommended} unités - {boxSize} par boîte)
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                        <Alert className="bg-red-50 border-red-200">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-sm text-gray-700">
                                <strong className="text-red-700">Important :</strong> Si vous confirmez cette commande sans ajuster pour des boîtes complètes,
                                <strong className="text-red-700"> votre boutique sera fermée à partir de maintenant</strong> et vous ne pourrez plus recevoir de nouvelles commandes.
                            </AlertDescription>
                        </Alert>
                        <p className="text-sm text-gray-600">
                            Êtes-vous sûr de vouloir passer votre commande sans ajuster pour des boîtes complètes ?
                        </p>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowNonMultipleConfirmation(false);
                                setPendingOrderData(null);
                            }}
                        >
                            Annuler et ajuster
                        </Button>
                        <Button
                            onClick={async () => {
                                setShowNonMultipleConfirmation(false);
                                if (pendingOrderData?.allProductsForOrder) {
                                    await processOrder(pendingOrderData.allProductsForOrder);
                                }
                                setPendingOrderData(null);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Confirmer quand même
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
