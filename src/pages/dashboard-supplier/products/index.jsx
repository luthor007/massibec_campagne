import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { calculateDeliveryCostPerProduct } from '../../../lib/deliveryCalculator';
import { getPriceLabel, getPriceLabelDescription, getMarkupMultiplier, roundDownToFiveCents } from '../../../utils/supplierPricing';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import SupplierOnboardingWizard from '../../../components/Dashboard/Supplier/SupplierOnboardingWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import ImageUpload from '../../../components/ImageUpload';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Package,
    Plus,
    Edit,
    Trash2,
    Search,
    RefreshCw,
    DollarSign,
    Image as ImageIcon,
    AlertCircle,
    CheckCircle,
    XCircle,
    Eye,
    Upload,
    Pencil,
    Info,
    ArrowLeft,
    CheckSquare,
    Square,
    ArrowUp,
    ArrowDown,
    ChevronUp,
    ChevronDown,
    Layers
} from 'lucide-react';

const ProductsPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deliverySettings, setDeliverySettings] = useState({
        directToConsumerEnabled: false,
        directToConsumerFee: 0
    });
    const [supplierAddress, setSupplierAddress] = useState('');
    const [pricingSettings, setPricingSettings] = useState({
        markup: 5,
        handlesShipping: false
    });
    const [estimatedDeliveryCosts, setEstimatedDeliveryCosts] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        pricePickup: '',
        recommendedRetailPrice: '',
        deliveryCostToSchool: '',
        directToConsumerEnabled: false,
        image: '',
        ingredientsImage: '',
        nutritionImage: '',
        productId: '',
        isDefault: false,
        // Transport/emballage
        unitSize: '',
        casePack: '',
        pallet: { ti: 0, hi: 0 },
        refrigerated: false,
        packagingGroup: '',
        attributes: {
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
    });
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
    const [showBulkAttributesModal, setShowBulkAttributesModal] = useState(false);
    const [editingCell, setEditingCell] = useState(null); // { productId, field }
    const [editingValue, setEditingValue] = useState('');
    const [showBundleForm, setShowBundleForm] = useState(false);
    const [editingBundle, setEditingBundle] = useState(null);
    const [bundleFormData, setBundleFormData] = useState({
        name: '',
        description: '',
        pricePickup: '',
        recommendedRetailPrice: '',
        image: '',
        includedProducts: []
    });
    const [generatingImage, setGeneratingImage] = useState(false);
    const [bundleImagePreview, setBundleImagePreview] = useState(null);
    const [showImportPriceList, setShowImportPriceList] = useState(false);
    const [importingPrices, setImportingPrices] = useState(false);
    const [importResults, setImportResults] = useState(null);
    const [bulkPrice, setBulkPrice] = useState('');
    const [bulkRecommendedRetailPrice, setBulkRecommendedRetailPrice] = useState('');
    const [bulkAttributes, setBulkAttributes] = useState({
        refrigerated: false,
        packagingGroup: '',
        unitSize: '',
        casePack: '',
        pallet: { ti: 0, hi: 0 },
        attributes: {
            freezable: false,
            glutenFree: false,
            vegetarian: false,
            vegan: false,
            nutFree: false,
            halal: false,
            kosher: false,
            organic: false,
            quebecProduct: false
        }
    });

    // Calculate price for school (pricePickup * markup + deliveryCostToSchool if supplier doesn't handle shipping)
    // Use useMemo to recalculate when pricingSettings or formData changes
    const { calculatedPrice, basePrice, calculatedMargin, marginPercentage, deliveryCost } = useMemo(() => {
        // If supplier handles shipping, delivery cost should be 0 for price calculation
        const handlesShipping = pricingSettings.handlesShipping || false;
        const deliveryCostValue = handlesShipping ? 0 : (formData.deliveryCostToSchool ? parseFloat(formData.deliveryCostToSchool) : 0);
        const markupMultiplier = getMarkupMultiplier({ pricingSettings });
        const basePriceValue = formData.pricePickup ? (parseFloat(formData.pricePickup) * markupMultiplier) : 0;
        const totalPrice = basePriceValue + deliveryCostValue;
        // Round down to nearest 5 cents
        const calculatedPriceValue = roundDownToFiveCents(totalPrice).toFixed(2);

        // Calculate margin for student/school (recommendedRetailPrice - calculatedPrice)
        const calculatedMarginValue = formData.recommendedRetailPrice && calculatedPriceValue
            ? (parseFloat(formData.recommendedRetailPrice) - parseFloat(calculatedPriceValue)).toFixed(2)
            : '0.00';
        const marginPercentageValue = formData.recommendedRetailPrice && calculatedPriceValue && parseFloat(calculatedPriceValue) > 0
            ? (((parseFloat(formData.recommendedRetailPrice) - parseFloat(calculatedPriceValue)) / parseFloat(calculatedPriceValue)) * 100).toFixed(1)
            : '0.0';

        return {
            calculatedPrice: calculatedPriceValue,
            basePrice: basePriceValue,
            calculatedMargin: calculatedMarginValue,
            marginPercentage: marginPercentageValue,
            deliveryCost: deliveryCostValue
        };
    }, [formData.pricePickup, formData.deliveryCostToSchool, formData.recommendedRetailPrice, pricingSettings]);

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/connexion');
            return;
        }

        if (session.user.role !== 'supplier') {
            router.push('/dashboard');
            return;
        }

        fetchProducts();

        // Check if onboarding wizard should be shown
        const checkOnboarding = async () => {
            try {
                const response = await fetch('/api/onboarding/progress?type=supplier');
                if (response.ok) {
                    const data = await response.json();
                    // Show wizard if onboarding is not completed
                    if (!data.isCompleted) {
                        setShowOnboardingWizard(true);
                    }
                }
            } catch (error) {
                console.error('Error checking onboarding:', error);
            }
        };

        if (router.query.onboarding === 'true') {
            setShowOnboardingWizard(true);
            // Remove query param from URL
            router.replace('/dashboard-supplier/products', undefined, { shallow: true });
        } else {
            checkOnboarding();
        }
    }, [session, status, router]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/supplier/products', {
                cache: 'no-store',
            });

            if (response.ok) {
                const data = await response.json();
                const fetchedProducts = Array.isArray(data.products) ? data.products : [];
                const sortedProducts = fetchedProducts
                    .map(p => ({ ...p, order: p.order || 0 }))
                    .sort((a, b) => (a.order || 0) - (b.order || 0));
                setProducts(sortedProducts);

                // Update delivery settings if provided
                if (data.deliverySettings) {
                    setDeliverySettings(data.deliverySettings);
                }

                // Update supplier address if provided
                if (data.supplierAddress) {
                    setSupplierAddress(data.supplierAddress);
                }

                // Update pricing settings if provided
                if (data.pricingSettings) {
                    console.log('[ProductsPage] Received pricingSettings:', data.pricingSettings);
                    setPricingSettings(data.pricingSettings);
                } else {
                    console.warn('[ProductsPage] No pricingSettings in API response, using defaults');
                }
            } else {
                console.error('Erreur lors de la récupération des produits');
                setProducts([]);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des produits:', error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.name || !formData.description || !formData.pricePickup || !formData.image) {
            toast.error(`Veuillez remplir tous les champs requis (nom, description, ${getPriceLabel({ pricingSettings }).toLowerCase()} et image)`);
            return;
        }

        if (parseFloat(formData.pricePickup) <= 0) {
            toast.error(`${getPriceLabel({ pricingSettings })} doit être supérieur à 0`);
            return;
        }

        try {
            const url = editingProduct ? `/api/supplier/products/${editingProduct.id || editingProduct._id}` : '/api/supplier/products';
            const method = editingProduct ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    pricePickup: parseFloat(formData.pricePickup),
                    // Price will be calculated automatically in the model (pricePickup * markup + deliveryCostToSchool)
                }),
            });

            if (response.ok) {
                toast.success(editingProduct ? 'Produit modifié avec succès!' : 'Produit créé avec succès!');
                setShowForm(false);
                setEditingProduct(null);
                resetForm();
                fetchProducts();
            } else {
                const error = await response.json();
                toast.error(`Erreur: ${error.message}`);
            }
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Erreur lors de la sauvegarde du produit');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            pricePickup: '',
            recommendedRetailPrice: '',
            deliveryCostToSchool: '',
            directToConsumerEnabled: deliverySettings.directToConsumerEnabled || false,
            image: '',
            ingredientsImage: '',
            nutritionImage: '',
            productId: '',
            isDefault: false,
            unitSize: '',
            casePack: '',
            pallet: { ti: 0, hi: 0 },
            refrigerated: false,
            packagingGroup: '',
            attributes: {
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
        });
    };

    const handleEdit = (product) => {
        // Handle bundle editing differently
        if (product.isBundle) {
            setEditingBundle(product);
            setBundleFormData({
                name: product.name || '',
                description: product.description || '',
                pricePickup: product.pricePickup || '',
                recommendedRetailPrice: product.recommendedRetailPrice || '',
                image: product.image || '',
                includedProducts: product.includedProducts ? product.includedProducts.map(ip => ({
                    product: ip.product?._id || ip.product || ip.productId,
                    quantity: ip.quantity || 1
                })) : []
            });
            setBundleImagePreview(null);
            setShowBundleForm(true);
            return;
        }

        setEditingProduct(product);
        // Use pricePickup if available, otherwise calculate from price (backward compatibility)
        // Note: Reverse calculation: (price - deliveryCost) / markup
        const deliveryCost = product.deliveryCostToSchool || 0;
        const markupMultiplier = getMarkupMultiplier({ pricingSettings });
        const pricePickup = product.pricePickup || (product.price ? ((product.price - deliveryCost) / markupMultiplier).toFixed(2) : '');
        setFormData({
            name: product.name || '',
            description: product.description || '',
            pricePickup: pricePickup,
            recommendedRetailPrice: product.recommendedRetailPrice || '',
            deliveryCostToSchool: product.deliveryCostToSchool || '',
            directToConsumerEnabled: product.directToConsumerEnabled || deliverySettings.directToConsumerEnabled || false,
            image: product.image || '',
            ingredientsImage: product.ingredientsImage || '',
            nutritionImage: product.nutritionImage || '',
            productId: product.productId || '',
            isDefault: product.isDefault === true,
            unitSize: product.unitSize || '',
            casePack: product.casePack || '',
            pallet: product.pallet || { ti: 0, hi: 0 },
            refrigerated: product.refrigerated || false,
            packagingGroup: product.packagingGroup || '',
            attributes: product.attributes || {
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
        });
        setShowForm(true);
    };

    const handleDelete = async (productId) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit? Cette action est irréversible.')) {
            return;
        }

        try {
            const response = await fetch(`/api/supplier/products/${productId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('Produit supprimé avec succès!');
                fetchProducts();
            } else {
                const error = await response.json();
                toast.error(`Erreur: ${error.message}`);
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Erreur lors de la suppression du produit');
        }
    };

    // Check if a product is complete (all required fields filled)
    const isProductComplete = (product) => {
        return product.name &&
            product.description &&
            (product.pricePickup || product.price) &&
            product.image;
    };

    // Check if all products are complete
    const areAllProductsComplete = () => {
        if (products.length === 0) return false;
        return products.every(isProductComplete);
    };

    const filteredProducts = products.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Selection functions
    const toggleProductSelection = (productId) => {
        setSelectedProducts(prev => {
            if (prev.includes(productId)) {
                return prev.filter(id => id !== productId);
            } else {
                return [...prev, productId];
            }
        });
    };

    // Inline editing functions
    const handleCellEdit = (productId, field, currentValue) => {
        setEditingCell({ productId, field });
        setEditingValue(currentValue || '');
    };

    const handleCellSave = async (productId, field) => {
        // Find the item to update
        const itemIndex = products.findIndex(p => (p._id || p.id) === productId);
        if (itemIndex === -1) {
            toast.error('Produit non trouvé');
            setEditingCell(null);
            return;
        }

        const item = products[itemIndex];
        const isBundle = item?.isBundle || false;

        // Prepare the value - handle empty strings for optional fields
        let valueToSend = editingValue;
        let displayValue = editingValue;

        if (field === 'recommendedRetailPrice' && (editingValue === '' || editingValue === null || editingValue === undefined)) {
            valueToSend = null;
            displayValue = undefined;
        } else if (field === 'pricePickup' || field === 'recommendedRetailPrice') {
            // Parse numeric values
            const numValue = parseFloat(editingValue);
            if (!isNaN(numValue)) {
                displayValue = numValue;
            }
        }

        // Optimistically update the UI immediately (spreadsheet-like behavior)
        const updatedProducts = [...products];
        const updatedItem = { ...updatedProducts[itemIndex] };

        // Update the field value
        if (field === 'pricePickup' || field === 'recommendedRetailPrice') {
            const numValue = parseFloat(editingValue);
            if (!isNaN(numValue)) {
                updatedItem[field] = numValue;
            } else if (field === 'recommendedRetailPrice' && (editingValue === '' || editingValue === null)) {
                updatedItem[field] = undefined;
            }
        } else {
            updatedItem[field] = displayValue;
        }

        // For bundles, recalculate price if pricePickup changed
        if (isBundle && field === 'pricePickup' && updatedItem.pricePickup) {
            const deliveryCost = updatedItem.deliveryCostToSchool || 0;
            const markupMultiplier = getMarkupMultiplier({ pricingSettings });
            const basePrice = updatedItem.pricePickup * markupMultiplier;
            updatedItem.price = Math.round((basePrice + deliveryCost) * 100) / 100;
        }

        updatedProducts[itemIndex] = updatedItem;
        setProducts(updatedProducts);
        setEditingCell(null);

        // Make API call in background (non-blocking, silent update)
        // No toast on success for spreadsheet-like experience
        fetch('/api/supplier/products/update-field', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, field, value: valueToSend, isBundle })
        })
            .then(async (response) => {
                if (response.ok) {
                    const data = await response.json();
                    // Silently update with server response to ensure consistency
                    setProducts(prevProducts => {
                        const finalProducts = [...prevProducts];
                        const finalItemIndex = finalProducts.findIndex(p => (p._id || p.id) === productId);
                        if (finalItemIndex !== -1 && data.product) {
                            finalProducts[finalItemIndex] = { ...finalProducts[finalItemIndex], ...data.product };
                        }
                        return finalProducts;
                    });
                } else {
                    // Revert on error
                    const error = await response.json();
                    toast.error(`Erreur: ${error.message}`);
                    console.error('API Error:', error);
                    // Revert to original state
                    fetchProducts();
                }
            })
            .catch((error) => {
                console.error('Error updating field:', error);
                toast.error('Erreur lors de la mise à jour');
                // Revert to original state
                fetchProducts();
            });
    };

    const handleCellCancel = () => {
        setEditingCell(null);
        setEditingValue('');
    };

    // Reorder functions - optimized for instant updates
    const reorderItemsOptimistically = (productId, newOrder) => {
        const itemIndex = products.findIndex(p => (p._id || p.id) === productId);
        if (itemIndex === -1) return null;

        const item = products[itemIndex];
        const oldOrder = item.order || 0;

        if (oldOrder === newOrder) return null; // No change needed

        // Create a copy of products array
        const updatedProducts = [...products];

        // Update orders for items that need to shift
        if (newOrder > oldOrder) {
            // Moving down: shift items between oldOrder and newOrder up
            updatedProducts.forEach(p => {
                const pOrder = p.order || 0;
                if (pOrder > oldOrder && pOrder <= newOrder && (p._id || p.id) !== productId) {
                    p.order = pOrder - 1;
                }
            });
        } else {
            // Moving up: shift items between newOrder and oldOrder down
            updatedProducts.forEach(p => {
                const pOrder = p.order || 0;
                if (pOrder >= newOrder && pOrder < oldOrder && (p._id || p.id) !== productId) {
                    p.order = pOrder + 1;
                }
            });
        }

        // Update the moved item's order
        updatedProducts[itemIndex] = { ...item, order: newOrder };

        // Re-sort to ensure correct order
        updatedProducts.sort((a, b) => {
            const orderA = a.order || 0;
            const orderB = b.order || 0;
            if (orderA !== orderB) return orderA - orderB;
            // Maintain stability with creation date
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return (a._id || '').toString().localeCompare((b._id || '').toString());
        });

        setProducts(updatedProducts);
        return { oldOrder, newOrder };
    };

    const handleMoveUp = (productId, currentOrder) => {
        if (currentOrder <= 0) return;
        const newOrder = currentOrder - 1;
        const reorderInfo = reorderItemsOptimistically(productId, newOrder);

        if (!reorderInfo) return;

        // Make API call in background (non-blocking, silent update)
        fetch('/api/supplier/products/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, newOrder })
        })
            .then(async (response) => {
                if (!response.ok) {
                    const error = await response.json();
                    toast.error(`Erreur: ${error.message}`);
                    console.error('API Error:', error);
                    // Revert to original state
                    fetchProducts();
                }
            })
            .catch((error) => {
                console.error('Error reordering:', error);
                toast.error('Erreur lors du réordonnancement');
                // Revert to original state
                fetchProducts();
            });
    };

    const handleMoveDown = (productId, currentOrder) => {
        // Use products.length (all products) instead of filteredProducts.length
        if (currentOrder >= products.length - 1) return;
        const newOrder = currentOrder + 1;
        const reorderInfo = reorderItemsOptimistically(productId, newOrder);

        if (!reorderInfo) return;

        // Make API call in background (non-blocking, silent update)
        fetch('/api/supplier/products/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, newOrder })
        })
            .then(async (response) => {
                if (!response.ok) {
                    const error = await response.json();
                    toast.error(`Erreur: ${error.message}`);
                    console.error('API Error:', error);
                    // Revert to original state
                    fetchProducts();
                }
            })
            .catch((error) => {
                console.error('Error reordering:', error);
                toast.error('Erreur lors du réordonnancement');
                // Revert to original state
                fetchProducts();
            });
    };

    const handleOrderChange = (productId, newOrder) => {
        const numOrder = parseInt(newOrder);
        // Use products.length (all products) instead of filteredProducts.length
        if (isNaN(numOrder) || numOrder < 0 || numOrder >= products.length) {
            toast.error(`Ordre invalide. Doit être entre 0 et ${products.length - 1}`);
            return;
        }

        const reorderInfo = reorderItemsOptimistically(productId, numOrder);

        if (!reorderInfo) return;

        // Make API call in background (non-blocking, silent update)
        fetch('/api/supplier/products/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, newOrder: numOrder })
        })
            .then(async (response) => {
                if (!response.ok) {
                    const error = await response.json();
                    toast.error(`Erreur: ${error.message}`);
                    console.error('API Error:', error);
                    // Revert to original state
                    fetchProducts();
                }
            })
            .catch((error) => {
                console.error('Error reordering:', error);
                toast.error('Erreur lors du réordonnancement');
                // Revert to original state
                fetchProducts();
            });
    };

    // Bundle functions
    const handleAddProductToBundle = (productId) => {
        const product = products.find(p => (p._id || p.id) === productId);
        if (!product) return;

        setBundleFormData(prev => ({
            ...prev,
            includedProducts: [...prev.includedProducts, { product: productId, quantity: 1 }]
        }));
    };

    const handleRemoveProductFromBundle = (index) => {
        setBundleFormData(prev => ({
            ...prev,
            includedProducts: prev.includedProducts.filter((_, i) => i !== index)
        }));
    };

    const handleUpdateBundleProductQuantity = (index, quantity) => {
        const numQuantity = parseInt(quantity);
        if (isNaN(numQuantity) || numQuantity < 1) return;

        setBundleFormData(prev => ({
            ...prev,
            includedProducts: prev.includedProducts.map((item, i) =>
                i === index ? { ...item, quantity: numQuantity } : item
            )
        }));
    };

    const handleGenerateBundleImage = async () => {
        if (bundleFormData.includedProducts.length === 0) {
            toast.error('Ajoutez d\'abord des produits au bundle');
            return;
        }

        setGeneratingImage(true);
        try {
            // Prepare items with image URLs and quantities
            const items = bundleFormData.includedProducts.map(item => {
                const product = products.find(p => (p._id || p.id) === item.product);
                return {
                    imageUrl: product?.image || '',
                    qty: item.quantity || 1,
                    label: product?.name || ''
                };
            }).filter(item => item.imageUrl); // Filter out products without images

            if (items.length === 0) {
                toast.error('Les produits doivent avoir des images pour générer l\'image du bundle');
                setGeneratingImage(false);
                return;
            }

            const response = await fetch('/api/supplier/bundles/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    width: 1200,
                    height: 1200,
                    bg: 'transparent',
                    mode: 'badges'
                })
            });

            if (response.ok) {
                const data = await response.json();
                setBundleFormData(prev => ({ ...prev, image: data.imageUrl }));
                setBundleImagePreview(data.imageUrl);
                toast.success('Image du bundle générée avec succès!');
            } else {
                const error = await response.json();
                toast.error(`Erreur: ${error.message}`);
            }
        } catch (error) {
            console.error('Error generating bundle image:', error);
            toast.error('Erreur lors de la génération de l\'image');
        } finally {
            setGeneratingImage(false);
        }
    };

    const handleCreateBundle = async (e) => {
        e.preventDefault();
        if (!bundleFormData.name || !bundleFormData.pricePickup || bundleFormData.includedProducts.length === 0) {
            toast.error('Veuillez remplir tous les champs requis');
            return;
        }

        // Only require image for new bundles, not when editing
        if (!editingBundle && !bundleFormData.image) {
            toast.error('Veuillez générer une image pour le bundle');
            return;
        }

        try {
            const isEditing = !!editingBundle;
            const url = isEditing ? '/api/supplier/bundles' : '/api/supplier/bundles';
            const method = isEditing ? 'PATCH' : 'POST';

            const requestBody = isEditing
                ? { bundleId: editingBundle._id || editingBundle.id, ...bundleFormData }
                : bundleFormData;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                toast.success(isEditing ? 'Bundle modifié avec succès!' : 'Bundle créé avec succès!');
                setShowBundleForm(false);
                setEditingBundle(null);
                setBundleFormData({ name: '', description: '', pricePickup: '', recommendedRetailPrice: '', image: '', includedProducts: [] });
                setBundleImagePreview(null);
                fetchProducts(); // Refresh to show updated bundle
            } else {
                const error = await response.json();
                toast.error(`Erreur: ${error.message}`);
            }
        } catch (error) {
            console.error('Error saving bundle:', error);
            toast.error(`Erreur lors de la ${editingBundle ? 'modification' : 'création'} du bundle`);
        }
    };

    const handleImportPriceList = async (file) => {
        if (!file) {
            toast.error('Veuillez sélectionner un fichier');
            return;
        }

        // Validate file type
        const allowedTypes = ['.xlsx', '.xls', '.csv'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedTypes.includes(fileExt)) {
            toast.error(`Format de fichier non supporté. Formats acceptés: ${allowedTypes.join(', ')}`);
            return;
        }

        setImportingPrices(true);
        setImportResults(null);

        try {
            // Read file as base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const base64Data = e.target.result.split(',')[1]; // Remove data:...;base64, prefix

                    const response = await fetch('/api/supplier/products/import-price-list', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fileData: base64Data,
                            fileName: file.name,
                            fileType: file.type
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        setImportResults(data);
                        toast.success(data.message || 'Import réussi!');
                        fetchProducts(); // Refresh products to show updated prices
                    } else {
                        toast.error(data.message || 'Erreur lors de l\'import');
                        setImportResults(data);
                    }
                } catch (error) {
                    console.error('Error importing price list:', error);
                    toast.error('Erreur lors de l\'import de la liste de prix');
                } finally {
                    setImportingPrices(false);
                }
            };

            reader.onerror = () => {
                toast.error('Erreur lors de la lecture du fichier');
                setImportingPrices(false);
            };

            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error handling file:', error);
            toast.error('Erreur lors du traitement du fichier');
            setImportingPrices(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedProducts.length === filteredProducts.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(filteredProducts.map(p => p._id || p.id));
        }
    };

    const clearSelection = () => {
        setSelectedProducts([]);
        setShowBulkActions(false);
    };

    // Bulk actions
    const handleBulkDelete = async () => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedProducts.length} produit(s)? Cette action est irréversible.`)) {
            return;
        }

        try {
            const response = await fetch('/api/supplier/products/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds: selectedProducts })
            });

            if (response.ok) {
                toast.success(`${selectedProducts.length} produit(s) supprimé(s) avec succès!`);
                clearSelection();
                fetchProducts();
            } else {
                const error = await response.json();
                toast.error(`Erreur: ${error.message}`);
            }
        } catch (error) {
            console.error('Error bulk deleting products:', error);
            toast.error('Erreur lors de la suppression des produits');
        }
    };

    const handleBulkPriceUpdate = async () => {
        if (!bulkPrice || parseFloat(bulkPrice) <= 0) {
            toast.error('Veuillez entrer un prix valide');
            return;
        }

        const updateData = {
            productIds: selectedProducts,
            pricePickup: parseFloat(bulkPrice)
        };

        // Include recommendedRetailPrice if provided
        if (bulkRecommendedRetailPrice && parseFloat(bulkRecommendedRetailPrice) > 0) {
            updateData.recommendedRetailPrice = parseFloat(bulkRecommendedRetailPrice);
        }

        try {
            const response = await fetch('/api/supplier/products/bulk', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                toast.success(`Prix mis à jour pour ${selectedProducts.length} produit(s)!`);
                setShowBulkPriceModal(false);
                setBulkPrice('');
                setBulkRecommendedRetailPrice('');
                clearSelection();
                fetchProducts();
            } else {
                const error = await response.json();
                toast.error(`Erreur: ${error.message}`);
            }
        } catch (error) {
            console.error('Error bulk updating price:', error);
            toast.error('Erreur lors de la mise à jour des prix');
        }
    };

    const handleBulkAttributesUpdate = async () => {
        try {
            const response = await fetch('/api/supplier/products/bulk', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productIds: selectedProducts,
                    ...bulkAttributes
                })
            });

            if (response.ok) {
                toast.success(`Attributs mis à jour pour ${selectedProducts.length} produit(s)!`);
                setShowBulkAttributesModal(false);
                setBulkAttributes({
                    refrigerated: false,
                    packagingGroup: '',
                    unitSize: '',
                    casePack: '',
                    pallet: { ti: 0, hi: 0 },
                    attributes: {
                        freezable: false,
                        glutenFree: false,
                        vegetarian: false,
                        vegan: false,
                        nutFree: false,
                        halal: false,
                        kosher: false,
                        organic: false,
                        quebecProduct: false
                    }
                });
                clearSelection();
                fetchProducts();
            } else {
                const error = await response.json();
                toast.error(`Erreur: ${error.message}`);
            }
        } catch (error) {
            console.error('Error bulk updating attributes:', error);
            toast.error('Erreur lors de la mise à jour des attributs');
        }
    };

    // Update showBulkActions when selection changes
    useEffect(() => {
        setShowBulkActions(selectedProducts.length > 0);
    }, [selectedProducts]);

    // Helper function to get selected products data
    const getSelectedProductsData = useCallback(() => {
        return products.filter(p => {
            const productId = p._id || p.id;
            return selectedProducts.includes(productId);
        });
    }, [products, selectedProducts]);

    // Helper function to check if all selected products have the same value for a field
    const getCommonValue = useCallback((fieldPath, defaultValue = null) => {
        const selectedProductsData = getSelectedProductsData();
        if (selectedProductsData.length === 0) return defaultValue;

        // Handle nested paths like 'pallet.ti' or 'attributes.freezable'
        const getNestedValue = (obj, path) => {
            const keys = path.split('.');
            let value = obj;
            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    return undefined;
                }
            }
            return value;
        };

        const firstValue = getNestedValue(selectedProductsData[0], fieldPath);

        // Check if all products have the same value
        const allSame = selectedProductsData.every(product => {
            const value = getNestedValue(product, fieldPath);
            // Handle null/undefined comparison
            if (firstValue === null || firstValue === undefined) {
                return value === null || value === undefined;
            }
            // Deep comparison for objects
            if (typeof firstValue === 'object' && firstValue !== null) {
                return JSON.stringify(value) === JSON.stringify(firstValue);
            }
            return value === firstValue;
        });

        return allSame ? firstValue : defaultValue;
    }, [getSelectedProductsData]);

    // Pre-fill bulk price modal when it opens
    useEffect(() => {
        if (showBulkPriceModal && selectedProducts.length > 0) {
            const commonPricePickup = getCommonValue('pricePickup');
            const commonRecommendedRetailPrice = getCommonValue('recommendedRetailPrice');

            if (commonPricePickup !== null && commonPricePickup !== undefined) {
                setBulkPrice(commonPricePickup.toString());
            } else {
                setBulkPrice('');
            }

            if (commonRecommendedRetailPrice !== null && commonRecommendedRetailPrice !== undefined) {
                setBulkRecommendedRetailPrice(commonRecommendedRetailPrice.toString());
            } else {
                setBulkRecommendedRetailPrice('');
            }
        } else if (!showBulkPriceModal) {
            // Reset when modal closes
            setBulkPrice('');
            setBulkRecommendedRetailPrice('');
        }
    }, [showBulkPriceModal, selectedProducts, getCommonValue]);

    // Pre-fill bulk attributes modal when it opens
    useEffect(() => {
        if (showBulkAttributesModal && selectedProducts.length > 0) {
            const commonRefrigerated = getCommonValue('refrigerated', false);
            const commonUnitSize = getCommonValue('unitSize', '');
            const commonCasePack = getCommonValue('casePack', '');
            const commonPackagingGroup = getCommonValue('packagingGroup', '');
            const commonPalletTi = getCommonValue('pallet.ti', 0);
            const commonPalletHi = getCommonValue('pallet.hi', 0);

            // Get common attribute values
            const commonFreezable = getCommonValue('attributes.freezable', false);
            const commonGlutenFree = getCommonValue('attributes.glutenFree', false);
            const commonVegetarian = getCommonValue('attributes.vegetarian', false);
            const commonVegan = getCommonValue('attributes.vegan', false);
            const commonNutFree = getCommonValue('attributes.nutFree', false);
            const commonHalal = getCommonValue('attributes.halal', false);
            const commonKosher = getCommonValue('attributes.kosher', false);
            const commonOrganic = getCommonValue('attributes.organic', false);
            const commonQuebecProduct = getCommonValue('attributes.quebecProduct', false);
            const commonAllergens = getCommonValue('attributes.allergens', '');

            setBulkAttributes({
                refrigerated: commonRefrigerated === true,
                unitSize: commonUnitSize || '',
                casePack: commonCasePack || '',
                packagingGroup: commonPackagingGroup || '',
                pallet: {
                    ti: commonPalletTi || 0,
                    hi: commonPalletHi || 0
                },
                attributes: {
                    freezable: commonFreezable === true,
                    glutenFree: commonGlutenFree === true,
                    vegetarian: commonVegetarian === true,
                    vegan: commonVegan === true,
                    nutFree: commonNutFree === true,
                    halal: commonHalal === true,
                    kosher: commonKosher === true,
                    organic: commonOrganic === true,
                    quebecProduct: commonQuebecProduct === true,
                    allergens: commonAllergens || ''
                }
            });
        } else if (!showBulkAttributesModal) {
            // Reset when modal closes
            setBulkAttributes({
                refrigerated: false,
                packagingGroup: '',
                unitSize: '',
                casePack: '',
                pallet: { ti: 0, hi: 0 },
                attributes: {
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
            });
        }
    }, [showBulkAttributesModal, selectedProducts, getCommonValue]);

    // Calculate estimated delivery costs for products
    useEffect(() => {
        if (products.length > 0 && supplierAddress) {
            const estimates = {};
            // Use a default school address for estimation (can be improved later)
            const defaultSchoolAddress = 'Montreal, QC, Canada'; // Default for estimation

            products.forEach(product => {
                if (product.pallet && (product.pallet.ti > 0 || product.pallet.hi > 0)) {
                    try {
                        // Calculate boxes per pallet (ti = tiers/layers, hi = boxes per layer)
                        const boxesPerPallet = product.pallet.ti * product.pallet.hi;

                        // Get products per box from casePack
                        const productsPerBox = parseInt(product.casePack) || 1;

                        // Calculate products per pallet: boxes × products per box
                        const productsPerPallet = boxesPerPallet * productsPerBox;

                        // Calculate for half a pallet (0.5) to be conservative and avoid surprises
                        // This gives us a more realistic per-product cost estimate
                        const halfPalletQuantity = Math.max(1, Math.floor(productsPerPallet * 0.5));

                        const estimate = calculateDeliveryCostPerProduct({
                            product,
                            supplierAddress,
                            schoolAddress: defaultSchoolAddress,
                            totalQuantity: halfPalletQuantity, // Use half pallet for conservative estimate
                            requiresTailgate: false,
                            isLimitedAccess: false
                        });
                        estimates[product._id || product.id] = estimate;
                    } catch (error) {
                        console.error('Error calculating delivery estimate for product:', product.name, error);
                        estimates[product._id || product.id] = 0;
                    }
                } else {
                    estimates[product._id || product.id] = 0;
                }
            });
            setEstimatedDeliveryCosts(estimates);
        }
    }, [products, supplierAddress]);

    return (
        <DashboardLayout blockSidebar={showOnboardingWizard}>
            <div className="space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                        {!showOnboardingWizard && (
                            <Button
                                variant="ghost"
                                onClick={() => router.push('/dashboard-supplier')}
                                className="mb-2 text-xs sm:text-sm px-2 sm:px-3"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                <span className="hidden sm:inline">Retour au tableau de bord</span>
                                <span className="sm:hidden">Retour</span>
                            </Button>
                        )}
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Gestion des Produits</h1>
                        <p className="text-sm sm:text-base text-gray-600">Gérez votre catalogue de produits et configurez vos prix</p>
                        {products.length > 0 && !areAllProductsComplete() && (
                            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 sm:p-3">
                                <div className="flex items-start gap-2 text-yellow-800">
                                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium">
                                        Certains produits sont incomplets. Veuillez compléter tous les champs requis (nom, description, {getPriceLabel({ pricingSettings }).toLowerCase()} et image).
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Onboarding Wizard - Integrated below warning */}
                    {showOnboardingWizard && (
                        <div className="mt-4">
                            <SupplierOnboardingWizard
                                isOpen={showOnboardingWizard}
                                onClose={() => {
                                    // Don't allow closing during onboarding - it's required
                                    if (!areAllProductsComplete() || products.length === 0) {
                                        return;
                                    }
                                    setShowOnboardingWizard(false);
                                }}
                                currentPage="/dashboard-supplier/products"
                                products={products}
                                areAllProductsComplete={areAllProductsComplete()}
                            />
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => setShowImportPriceList(true)}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs sm:text-sm px-3 sm:px-4"
                        >
                            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                            <span className="hidden sm:inline">Importer ma liste de prix</span>
                            <span className="sm:hidden">Importer</span>
                        </Button>
                        <Button onClick={() => { setEditingProduct(null); resetForm(); setShowForm(true); }} className="text-xs sm:text-sm px-3 sm:px-4">
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                            <span className="hidden sm:inline">Ajouter un produit</span>
                            <span className="sm:hidden">Ajouter</span>
                        </Button>
                    </div>
                </div>

                {/* Search and Filters */}
                <Card>
                    <CardContent className="pt-4 sm:pt-6">
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <Input
                                    placeholder="Rechercher un produit..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 sm:pl-10 text-sm"
                                />
                            </div>
                            <Button variant="outline" onClick={fetchProducts} className="text-xs sm:text-sm px-3 sm:px-4">
                                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                <span className="hidden sm:inline">Actualiser</span>
                                <span className="sm:hidden">Rafr.</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Bulk Actions Bar */}
                {showBulkActions && selectedProducts.length > 0 && (
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-blue-900">
                                        {selectedProducts.length} produit(s) sélectionné(s)
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearSelection}
                                        className="text-blue-700 hover:text-blue-900"
                                    >
                                        Annuler
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowBulkPriceModal(true)}
                                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                                    >
                                        <DollarSign className="w-4 h-4 mr-2" />
                                        Définir le prix
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowBulkAttributesModal(true)}
                                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                                    >
                                        <Package className="w-4 h-4 mr-2" />
                                        Attributs
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkDelete}
                                        className="border-red-300 text-red-700 hover:bg-red-100"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Supprimer
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Bundle Creation/Edit Section */}
                {showBundleForm && (
                    <Card className="border-2 border-blue-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Layers className="w-5 h-5" />
                                {editingBundle ? 'Modifier le Bundle' : 'Créer un Bundle'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateBundle} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <Label htmlFor="bundleName">Nom du Bundle *</Label>
                                        <Input
                                            id="bundleName"
                                            value={bundleFormData.name}
                                            onChange={(e) => setBundleFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Ex: Pack Familial"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="bundlePricePickup">{getPriceLabel({ pricingSettings })} *</Label>
                                        <Input
                                            id="bundlePricePickup"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={bundleFormData.pricePickup}
                                            onChange={(e) => setBundleFormData(prev => ({ ...prev, pricePickup: e.target.value }))}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <Label htmlFor="bundleRecommendedRetailPrice">Prix de revente recommandé</Label>
                                        <Input
                                            id="bundleRecommendedRetailPrice"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={bundleFormData.recommendedRetailPrice}
                                            onChange={(e) => setBundleFormData(prev => ({ ...prev, recommendedRetailPrice: e.target.value }))}
                                            placeholder="0.00"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Prix suggéré pour la revente aux écoles
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Coût total pour l'école (calculé automatiquement)</Label>
                                        <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            {(() => {
                                                const pricePickup = parseFloat(bundleFormData.pricePickup) || 0;
                                                // Calculer le coût de livraison estimé total
                                                let totalDeliveryCost = 0;
                                                if (bundleFormData.includedProducts.length > 0 && supplierAddress) {
                                                    bundleFormData.includedProducts.forEach(item => {
                                                        const product = products.find(p => (p._id || p.id) === item.product);
                                                        if (product && product.pallet && (product.pallet.ti > 0 || product.pallet.hi > 0)) {
                                                            try {
                                                                // Calculer pour une demi-palette (estimation conservatrice)
                                                                const boxesPerPallet = product.pallet.ti * product.pallet.hi;
                                                                const productsPerBox = parseInt(product.casePack) || 1;
                                                                const productsPerPallet = boxesPerPallet * productsPerBox;
                                                                const halfPalletQuantity = Math.max(1, Math.floor(productsPerPallet * 0.5));

                                                                const estimate = calculateDeliveryCostPerProduct({
                                                                    product,
                                                                    supplierAddress,
                                                                    schoolAddress: 'Montreal, QC, Canada', // Default for estimation
                                                                    totalQuantity: halfPalletQuantity,
                                                                    requiresTailgate: false,
                                                                    isLimitedAccess: false
                                                                });
                                                                totalDeliveryCost += estimate * item.quantity;
                                                            } catch (error) {
                                                                // Si erreur, utiliser le deliveryCostToSchool du produit
                                                                totalDeliveryCost += (product.deliveryCostToSchool || 0) * item.quantity;
                                                            }
                                                        } else if (product) {
                                                            totalDeliveryCost += (product.deliveryCostToSchool || 0) * item.quantity;
                                                        }
                                                    });
                                                }
                                                // If supplier handles shipping, delivery cost should be 0
                                                const handlesShipping = pricingSettings.handlesShipping || false;
                                                const effectiveDeliveryCost = handlesShipping ? 0 : totalDeliveryCost;
                                                const markupMultiplier = getMarkupMultiplier({ pricingSettings });
                                                const basePrice = pricePickup * markupMultiplier;
                                                const totalPrice = basePrice + effectiveDeliveryCost;
                                                // Round down to nearest 5 cents
                                                const roundedPrice = roundDownToFiveCents(totalPrice);
                                                return (
                                                    <div>
                                                        <div className="text-lg font-semibold text-blue-900">
                                                            ${roundedPrice.toFixed(2)}
                                                        </div>
                                                        {!handlesShipping && totalDeliveryCost > 0 && (
                                                            <div className="text-xs text-blue-700 mt-1">
                                                                Dont: ${basePrice.toFixed(2)} (base) + ${totalDeliveryCost.toFixed(2)} (livraison estimée)
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="bundleDescription">Description</Label>
                                    <Textarea
                                        id="bundleDescription"
                                        value={bundleFormData.description}
                                        onChange={(e) => setBundleFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Description du bundle..."
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <Label>Produits inclus *</Label>
                                    <div className="space-y-2 mt-2">
                                        {bundleFormData.includedProducts.map((item, index) => {
                                            const product = products.find(p => (p._id || p.id) === item.product);
                                            return (
                                                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                                    <span className="flex-1">{product?.name || 'Produit'}</span>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleUpdateBundleProductQuantity(index, e.target.value)}
                                                        className="w-20"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveProductFromBundle(index)}
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-2">
                                        <Select onValueChange={handleAddProductToBundle}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Ajouter un produit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products
                                                    .filter(p => !bundleFormData.includedProducts.some(item => item.product === (p._id || p.id)))
                                                    .map(product => (
                                                        <SelectItem key={product._id || product.id} value={product._id || product.id}>
                                                            {product.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <Label>Image du Bundle *</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleGenerateBundleImage}
                                            disabled={generatingImage || bundleFormData.includedProducts.length === 0}
                                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                        >
                                            {generatingImage ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                    Génération...
                                                </>
                                            ) : (
                                                <>
                                                    <ImageIcon className="w-4 h-4 mr-2" />
                                                    Générer l'image
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    {bundleImagePreview || bundleFormData.image ? (
                                        <div className="mt-2">
                                            <img
                                                src={bundleImagePreview || bundleFormData.image}
                                                alt="Aperçu du bundle"
                                                className="w-48 h-48 object-cover rounded-lg border-2 border-gray-200"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Image générée automatiquement à partir des produits inclus
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="mt-2 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                                            <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                            <p className="text-sm text-gray-500">
                                                Ajoutez d'abord des produits, puis cliquez sur "Générer l'image" pour créer automatiquement l'image du bundle
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit">{editingBundle ? 'Modifier le Bundle' : 'Créer le Bundle'}</Button>
                                    <Button type="button" variant="outline" onClick={() => {
                                        setShowBundleForm(false);
                                        setEditingBundle(null);
                                        setBundleFormData({ name: '', description: '', pricePickup: '', recommendedRetailPrice: '', image: '', includedProducts: [] });
                                        setBundleImagePreview(null);
                                    }}>
                                        Annuler
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Products Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Produits ({filteredProducts.length})</CardTitle>
                            {!showBundleForm && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setEditingBundle(null);
                                        setBundleFormData({ name: '', description: '', pricePickup: '', recommendedRetailPrice: '', image: '', includedProducts: [] });
                                        setBundleImagePreview(null);
                                        setShowBundleForm(true);
                                    }}
                                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                >
                                    <Layers className="w-4 h-4 mr-2" />
                                    Créer un Bundle
                                </Button>
                            )}
                            {filteredProducts.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleSelectAll}
                                    className="text-sm"
                                >
                                    {selectedProducts.length === filteredProducts.length ? (
                                        <>
                                            <CheckSquare className="w-4 h-4 mr-2" />
                                            Tout désélectionner
                                        </>
                                    ) : (
                                        <>
                                            <Square className="w-4 h-4 mr-2" />
                                            Tout sélectionner
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-2">Chargement...</span>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>Aucun produit trouvé</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <div className="flex items-center justify-center">
                                                    <div
                                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${selectedProducts.length === filteredProducts.length && filteredProducts.length > 0
                                                            ? 'bg-blue-600 border-blue-600 shadow-md scale-105'
                                                            : 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                                                            }`}
                                                        onClick={toggleSelectAll}
                                                        title={selectedProducts.length === filteredProducts.length ? "Tout désélectionner" : "Tout sélectionner"}
                                                    >
                                                        {selectedProducts.length === filteredProducts.length && filteredProducts.length > 0 && (
                                                            <CheckCircle className="w-3.5 h-3.5 text-white stroke-2" />
                                                        )}
                                                    </div>
                                                </div>
                                            </TableHead>
                                            <TableHead className="w-24">Ordre</TableHead>
                                            <TableHead>Image</TableHead>
                                            <TableHead>Nom</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>{getPriceLabel({ pricingSettings })}</TableHead>
                                            <TableHead>Coût Livraison</TableHead>
                                            <TableHead>Prix École</TableHead>
                                            <TableHead>Prix Revente</TableHead>
                                            <TableHead>Marge</TableHead>
                                            <TableHead>ID Produit</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.map((product) => {
                                            const isComplete = isProductComplete(product);
                                            const missingFields = [];
                                            if (!product.name) missingFields.push('Nom');
                                            if (!product.description) missingFields.push('Description');
                                            if (!product.pricePickup && !product.price) missingFields.push(getPriceLabel({ pricingSettings }));
                                            if (!product.image) missingFields.push('Image');

                                            const productId = product._id || product.id;
                                            const isSelected = selectedProducts.includes(productId);

                                            return (
                                                <TableRow
                                                    key={productId}
                                                    className={`${!isComplete ? 'bg-red-50 border-l-4 border-l-red-500' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
                                                >
                                                    <TableCell className="w-12">
                                                        <div className="flex items-center justify-center">
                                                            <div
                                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${isSelected
                                                                    ? 'bg-blue-600 border-blue-600 shadow-md scale-105'
                                                                    : 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                                                                    }`}
                                                                onClick={() => toggleProductSelection(productId)}
                                                            >
                                                                {isSelected && (
                                                                    <CheckCircle className="w-3.5 h-3.5 text-white stroke-2" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="w-24">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0"
                                                                    onClick={() => handleMoveUp(productId, product.order || 0)}
                                                                    disabled={(product.order || 0) <= 0}
                                                                >
                                                                    <ChevronUp className="w-4 h-4" />
                                                                </Button>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    value={product.order || 0}
                                                                    onChange={(e) => handleOrderChange(productId, e.target.value)}
                                                                    className="w-16 h-8 text-center text-sm"
                                                                />
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0"
                                                                    onClick={() => handleMoveDown(productId, product.order || 0)}
                                                                    disabled={(product.order || 0) >= products.length - 1}
                                                                >
                                                                    <ChevronDown className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {product.image ? (
                                                            <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded" />
                                                        ) : (
                                                            <div className="w-16 h-16 bg-red-100 border-2 border-red-300 rounded flex items-center justify-center">
                                                                <ImageIcon className="w-6 h-6 text-red-500" />
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {editingCell?.productId === productId && editingCell?.field === 'name' ? (
                                                            <div className="flex items-center gap-1">
                                                                <Input
                                                                    value={editingValue}
                                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                                    onBlur={() => handleCellSave(productId, 'name')}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleCellSave(productId, 'name');
                                                                        if (e.key === 'Escape') handleCellCancel();
                                                                    }}
                                                                    autoFocus
                                                                    className="h-8"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onClick={() => handleCellEdit(productId, 'name', product.name)}
                                                                className="cursor-pointer hover:bg-gray-100 p-1 rounded flex items-center gap-2"
                                                            >
                                                                {product.isBundle && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        <Layers className="w-3 h-3 mr-1" />
                                                                        Bundle
                                                                    </Badge>
                                                                )}
                                                                {product.name || <span className="text-red-500 italic">Nom requis</span>}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="max-w-xs">
                                                        {editingCell?.productId === productId && editingCell?.field === 'description' ? (
                                                            <div className="flex items-center gap-1">
                                                                <Input
                                                                    value={editingValue}
                                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                                    onBlur={() => handleCellSave(productId, 'description')}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleCellSave(productId, 'description');
                                                                        if (e.key === 'Escape') handleCellCancel();
                                                                    }}
                                                                    autoFocus
                                                                    className="h-8"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onClick={() => handleCellEdit(productId, 'description', product.description)}
                                                                className="cursor-pointer hover:bg-gray-100 p-1 rounded truncate"
                                                                title={product.description}
                                                            >
                                                                {product.description || <span className="text-red-500 italic">Description requise</span>}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {editingCell?.productId === productId && editingCell?.field === 'pricePickup' ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-sm">$</span>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={editingValue}
                                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                                    onBlur={() => handleCellSave(productId, 'pricePickup')}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleCellSave(productId, 'pricePickup');
                                                                        if (e.key === 'Escape') handleCellCancel();
                                                                    }}
                                                                    autoFocus
                                                                    className="h-8 w-20"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onClick={() => handleCellEdit(productId, 'pricePickup', product.pricePickup)}
                                                                className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                                                            >
                                                                {product.pricePickup
                                                                    ? `$${parseFloat(product.pricePickup).toFixed(2)}`
                                                                    : product.price
                                                                        ? (() => {
                                                                            // Calculate pricePickup from price: (price - deliveryCost) / markup
                                                                            const deliveryCost = product.deliveryCostToSchool || 0;
                                                                            const markupMultiplier = getMarkupMultiplier({ pricingSettings });
                                                                            const calculatedPricePickup = ((product.price - deliveryCost) / markupMultiplier).toFixed(2);
                                                                            return `$${calculatedPricePickup}`;
                                                                        })()
                                                                        : <span className="text-red-500 italic">Requis</span>}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {(() => {
                                                            // If supplier handles shipping, don't show delivery cost
                                                            if (pricingSettings.handlesShipping) {
                                                                return (
                                                                    <span className="text-gray-400 text-xs italic">Inclus dans le prix</span>
                                                                );
                                                            }
                                                            const productId = product._id || product.id;
                                                            const estimatedCost = estimatedDeliveryCosts[productId] || product.deliveryCostToSchool || 0;
                                                            if (estimatedCost > 0) {
                                                                return (
                                                                    <>
                                                                        <div className="font-semibold text-orange-700">
                                                                            ${estimatedCost.toFixed(2)}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            (estimation)
                                                                        </div>
                                                                    </>
                                                                );
                                                            } else if (product.pallet && (product.pallet.ti > 0 || product.pallet.hi > 0)) {
                                                                return (
                                                                    <span className="text-gray-400 text-xs italic">À calculer</span>
                                                                );
                                                            } else {
                                                                return (
                                                                    <span className="text-gray-400 text-xs italic">Données pallet requises</span>
                                                                );
                                                            }
                                                        })()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {(() => {
                                                            const productId = product._id || product.id;
                                                            const pricePickup = product.pricePickup ? parseFloat(product.pricePickup) : 0;
                                                            const deliveryCost = estimatedDeliveryCosts[productId] || product.deliveryCostToSchool || 0;

                                                            if (pricePickup > 0) {
                                                                // Calculate price dynamically: pricePickup * markup + deliveryCost (if supplier doesn't handle shipping)
                                                                const handlesShipping = pricingSettings.handlesShipping || false;
                                                                const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCost;
                                                                const markupMultiplier = getMarkupMultiplier({ pricingSettings });
                                                                const basePrice = pricePickup * markupMultiplier;
                                                                const totalPrice = basePrice + effectiveDeliveryCost;
                                                                // Round down to nearest 5 cents
                                                                const roundedPrice = roundDownToFiveCents(totalPrice);
                                                                const markupPercent = pricingSettings.markup || 5;

                                                                return (
                                                                    <>
                                                                        <div className="font-semibold text-blue-700">
                                                                            ${roundedPrice.toFixed(2)}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            (+{markupPercent}%)
                                                                        </div>
                                                                    </>
                                                                );
                                                            } else if (product.price) {
                                                                // Fallback to stored price if pricePickup is not available
                                                                return (
                                                                    <>
                                                                        <div className="font-semibold text-blue-700">
                                                                            ${product.price.toFixed(2)}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            (prix stocké)
                                                                        </div>
                                                                    </>
                                                                );
                                                            } else {
                                                                return <span className="text-red-500 italic">Requis</span>;
                                                            }
                                                        })()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {editingCell?.productId === productId && editingCell?.field === 'recommendedRetailPrice' ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-sm">$</span>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={editingValue}
                                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                                    onBlur={() => handleCellSave(productId, 'recommendedRetailPrice')}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleCellSave(productId, 'recommendedRetailPrice');
                                                                        if (e.key === 'Escape') handleCellCancel();
                                                                    }}
                                                                    autoFocus
                                                                    className="h-8 w-20"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onClick={() => handleCellEdit(productId, 'recommendedRetailPrice', product.recommendedRetailPrice || '')}
                                                                className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                                                            >
                                                                {product.recommendedRetailPrice ? (
                                                                    <div className="font-semibold text-purple-700">
                                                                        ${parseFloat(product.recommendedRetailPrice).toFixed(2)}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 text-xs italic">Non défini</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {(() => {
                                                            const productId = product._id || product.id;
                                                            const pricePickup = product.pricePickup ? parseFloat(product.pricePickup) : 0;
                                                            const deliveryCost = estimatedDeliveryCosts[productId] || product.deliveryCostToSchool || 0;
                                                            const recommendedRetailPrice = product.recommendedRetailPrice ? parseFloat(product.recommendedRetailPrice) : 0;

                                                            if (pricePickup > 0 && recommendedRetailPrice > 0) {
                                                                // Calculate price dynamically: pricePickup * markup + deliveryCost (if supplier doesn't handle shipping)
                                                                const handlesShipping = pricingSettings.handlesShipping || false;
                                                                const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCost;
                                                                const markupMultiplier = getMarkupMultiplier({ pricingSettings });
                                                                const basePrice = pricePickup * markupMultiplier;
                                                                const totalPrice = basePrice + effectiveDeliveryCost;
                                                                // Round down to nearest 5 cents for school price
                                                                const roundedPrice = roundDownToFiveCents(totalPrice);
                                                                const margin = recommendedRetailPrice - roundedPrice;
                                                                const marginPercentage = roundedPrice > 0 ? ((margin / roundedPrice) * 100) : 0;

                                                                return (
                                                                    <>
                                                                        <div className="font-semibold text-green-700">
                                                                            ${margin.toFixed(2)}
                                                                        </div>
                                                                        <div className="text-xs text-green-600">
                                                                            ({marginPercentage.toFixed(1)}%)
                                                                        </div>
                                                                    </>
                                                                );
                                                            } else if (product.recommendedRetailPrice && product.price) {
                                                                // Fallback to stored price if pricePickup is not available
                                                                const margin = parseFloat(product.recommendedRetailPrice) - parseFloat(product.price);
                                                                const marginPercentage = parseFloat(product.price) > 0 ? ((margin / parseFloat(product.price)) * 100) : 0;

                                                                return (
                                                                    <>
                                                                        <div className="font-semibold text-green-700">
                                                                            ${margin.toFixed(2)}
                                                                        </div>
                                                                        <div className="text-xs text-green-600">
                                                                            ({marginPercentage.toFixed(1)}%)
                                                                        </div>
                                                                    </>
                                                                );
                                                            } else {
                                                                return <span className="text-gray-400 text-xs italic">-</span>;
                                                            }
                                                        })()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {!product.isBundle && editingCell?.productId === productId && editingCell?.field === 'productId' ? (
                                                            <div className="flex items-center gap-1">
                                                                <Input
                                                                    value={editingValue}
                                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                                    onBlur={() => handleCellSave(productId, 'productId')}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleCellSave(productId, 'productId');
                                                                        if (e.key === 'Escape') handleCellCancel();
                                                                    }}
                                                                    autoFocus
                                                                    className="h-8 w-24"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onClick={() => !product.isBundle && handleCellEdit(productId, 'productId', product.productId)}
                                                                className={`${!product.isBundle ? 'cursor-pointer hover:bg-gray-100' : ''} p-1 rounded`}
                                                            >
                                                                {product.productId || (product.isBundle ? 'Bundle' : 'N/A')}
                                                            </div>
                                                        )}
                                                        {!isComplete && !product.isBundle && (
                                                            <div className="text-xs text-red-600 mt-1">
                                                                <AlertCircle className="w-3 h-3 inline mr-1" />
                                                                {missingFields.join(', ')}
                                                            </div>
                                                        )}
                                                        {product.isBundle && product.includedProducts && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {product.includedProducts.length} produit(s) inclus
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEdit(product)}
                                                                title={product.isBundle ? "Modifier le bundle" : "Modifier le produit"}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(product._id || product.id)}
                                                                className="text-red-600 hover:text-red-700"
                                                                title={product.isBundle ? "Supprimer le bundle" : "Supprimer le produit"}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Product Form Dialog - Always accessible even during onboarding */}
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[60]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingProduct ? 'Modifiez les informations du produit' : 'Remplissez les informations pour créer un nouveau produit'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Nom du produit *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className={!formData.name ? 'border-red-500' : ''}
                                />
                                {!formData.name && (
                                    <p className="text-xs text-red-500 mt-1">Ce champ est requis</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    required
                                    className={!formData.description ? 'border-red-500' : ''}
                                />
                                {!formData.description && (
                                    <p className="text-xs text-red-500 mt-1">Ce champ est requis</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="pricePickup">{getPriceLabel({ pricingSettings })} *</Label>
                                    <Input
                                        id="pricePickup"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.pricePickup}
                                        onChange={(e) => setFormData({ ...formData, pricePickup: e.target.value })}
                                        required
                                        className={!formData.pricePickup ? 'border-red-500' : ''}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {getPriceLabelDescription({ pricingSettings })}
                                    </p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <Label className="text-sm font-semibold text-blue-900">
                                        Prix de vente à l'école (calculé automatiquement)
                                    </Label>
                                    <div className="mt-2">
                                        <div className="text-2xl font-bold text-blue-700">
                                            ${calculatedPrice}
                                        </div>
                                        <p className="text-xs text-blue-600 mt-1">
                                            {getPriceLabel({ pricingSettings })} + {pricingSettings.markup || 5}%
                                        </p>

                                        {//deliveryCost > 0 && (
                                            //  <p className="text-xs text-blue-500 mt-1">
                                            //      Dont: ${basePrice.toFixed(2)} (base) + ${deliveryCost.toFixed(2)} (livraison)
                                            //  </p>
                                            //)}
                                        }
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="recommendedRetailPrice">Prix conseillé de revente ($)</Label>
                                <Input
                                    id="recommendedRetailPrice"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.recommendedRetailPrice}
                                    onChange={(e) => setFormData({ ...formData, recommendedRetailPrice: e.target.value })}
                                    placeholder="ex: 6.50"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Prix de revente conseillé pour l'élève/école (optionnel)
                                </p>
                                {formData.recommendedRetailPrice && calculatedPrice && parseFloat(formData.recommendedRetailPrice) > 0 && parseFloat(calculatedPrice) > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                                        <p className="text-xs text-green-800 mb-1">
                                            <strong>💰 Marge pour l'élève/école :</strong>
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-bold text-green-700">
                                                ${calculatedMargin}
                                            </span>
                                            <span className="text-sm text-green-600">
                                                ({marginPercentage}% de marge)
                                            </span>
                                        </div>
                                        <p className="text-xs text-green-700 mt-1">
                                            Prix de revente (${parseFloat(formData.recommendedRetailPrice).toFixed(2)}) - Prix école (${calculatedPrice})
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="productId">ID Produit</Label>
                                <Input
                                    id="productId"
                                    value={formData.productId}
                                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                    placeholder="Laissez vide pour générer automatiquement"
                                />
                            </div>

                            {/* Delivery Cost to School (calculated automatically, displayed for reference) */}
                            <div>
                                <Label htmlFor="deliveryCostToSchool">Coût de livraison à l'école ($)</Label>
                                <Input
                                    id="deliveryCostToSchool"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.deliveryCostToSchool}
                                    onChange={(e) => setFormData({ ...formData, deliveryCostToSchool: e.target.value })}
                                    placeholder="Calculé automatiquement"
                                    disabled
                                    className="bg-gray-100"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Coût de livraison calculé automatiquement basé sur le devis DMB et les données de pallet (affiché à titre informatif)
                                </p>
                                {formData.pallet && formData.pallet.ti > 0 && formData.pallet.hi > 0 && supplierAddress && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                                        <p className="text-xs text-orange-800 mb-1">
                                            <strong>📦 Estimation du coût de livraison :</strong>
                                        </p>
                                        <div className="text-sm font-semibold text-orange-700">
                                            {(() => {
                                                try {
                                                    // Calculate boxes per pallet (ti = tiers/layers, hi = boxes per layer)
                                                    const boxesPerPallet = formData.pallet.ti * formData.pallet.hi;

                                                    // Get products per box from casePack
                                                    const productsPerBox = parseInt(formData.casePack) || 1;

                                                    // Calculate products per pallet: boxes × products per box
                                                    const productsPerPallet = boxesPerPallet * productsPerBox;

                                                    // Calculate for half a pallet (0.5) to be conservative and avoid surprises
                                                    const halfPalletQuantity = Math.max(1, Math.floor(productsPerPallet * 0.5));

                                                    const estimate = calculateDeliveryCostPerProduct({
                                                        product: {
                                                            pallet: formData.pallet,
                                                            casePack: formData.casePack
                                                        },
                                                        supplierAddress,
                                                        schoolAddress: 'Montreal, QC, Canada', // Default for estimation
                                                        totalQuantity: halfPalletQuantity, // Use half pallet for conservative estimate
                                                        requiresTailgate: false,
                                                        isLimitedAccess: false
                                                    });
                                                    return `$${estimate.toFixed(2)} par produit (estimation)`;
                                                } catch (error) {
                                                    return 'Calcul en cours...';
                                                }
                                            })()}
                                        </div>
                                        <p className="text-xs text-orange-600 mt-1">
                                            Basé sur une demi-palette ({(() => {
                                                const boxesPerPallet = formData.pallet.ti * formData.pallet.hi;
                                                const productsPerBox = parseInt(formData.casePack) || 1;
                                                const productsPerPallet = boxesPerPallet * productsPerBox;
                                                const halfPallet = Math.max(1, Math.floor(productsPerPallet * 0.5));
                                                return `${halfPallet} produit(s) sur ${productsPerPallet}`;
                                            })()})
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Direct to Consumer Delivery */}
                            {deliverySettings.directToConsumerEnabled && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <Label className="text-sm font-semibold text-purple-900 mb-2 block">
                                        Livraison directe au consommateur
                                    </Label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.directToConsumerEnabled}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                directToConsumerEnabled: e.target.checked
                                            })}
                                            className="rounded"
                                        />
                                        <span className="text-sm text-purple-800">
                                            Activer la livraison directe au consommateur pour ce produit
                                        </span>
                                    </label>
                                    <p className="text-xs text-purple-600 mt-2">
                                        Si activé, ce produit peut être livré directement au consommateur (ne passant pas par l'école).
                                        Frais de livraison: ${deliverySettings.directToConsumerFee.toFixed(2)} par commande (pas par produit).
                                    </p>
                                </div>
                            )}

                            <div>
                                <Label htmlFor="image">Image du produit *</Label>
                                <ImageUpload
                                    value={formData.image}
                                    onChange={(url) => setFormData({ ...formData, image: url })}
                                    uploadType="product"
                                />
                                {!formData.image && (
                                    <p className="text-xs text-red-500 mt-1">Ce champ est requis</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="ingredientsImage">Image des ingrédients</Label>
                                <ImageUpload
                                    value={formData.ingredientsImage}
                                    onChange={(url) => setFormData({ ...formData, ingredientsImage: url })}
                                    uploadType="product"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Image de la liste des ingrédients (optionnel)
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="nutritionImage">Image de la valeur nutritive</Label>
                                <ImageUpload
                                    value={formData.nutritionImage}
                                    onChange={(url) => setFormData({ ...formData, nutritionImage: url })}
                                    uploadType="product"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Image du tableau de la valeur nutritive (optionnel)
                                </p>
                            </div>

                            {/* Product Attributes Section */}
                            <div className="border-t pt-4 space-y-4">
                                <div>
                                    <Label className="text-base font-semibold">Attributs du produit</Label>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Cochez les attributs qui s'appliquent à ce produit
                                    </p>
                                </div>

                                {/* Conservation */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Conservation</h4>
                                    <div className="space-y-2">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.attributes.freezable}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    attributes: { ...formData.attributes, freezable: e.target.checked }
                                                })}
                                                className="rounded"
                                            />
                                            <span className="text-sm">❄️ Congelable</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Régimes alimentaires */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Régimes alimentaires</h4>
                                    <div className="space-y-2">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.attributes.glutenFree}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    attributes: { ...formData.attributes, glutenFree: e.target.checked }
                                                })}
                                                className="rounded"
                                            />
                                            <span className="text-sm">🌾 Sans gluten</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.attributes.vegetarian}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    attributes: { ...formData.attributes, vegetarian: e.target.checked }
                                                })}
                                                className="rounded"
                                            />
                                            <span className="text-sm">🥬 Végétarien</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.attributes.vegan}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    attributes: { ...formData.attributes, vegan: e.target.checked }
                                                })}
                                                className="rounded"
                                            />
                                            <span className="text-sm">🌱 Végétalien/Vegan</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.attributes.nutFree}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    attributes: { ...formData.attributes, nutFree: e.target.checked }
                                                })}
                                                className="rounded"
                                            />
                                            <span className="text-sm">🥜 Sans noix</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Certifications */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Certifications</h4>
                                    <div className="space-y-2">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.attributes.halal}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    attributes: { ...formData.attributes, halal: e.target.checked }
                                                })}
                                                className="rounded"
                                            />
                                            <span className="text-sm">🕌 Halal</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.attributes.kosher}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    attributes: { ...formData.attributes, kosher: e.target.checked }
                                                })}
                                                className="rounded"
                                            />
                                            <span className="text-sm">✡️ Kasher</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.attributes.organic}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    attributes: { ...formData.attributes, organic: e.target.checked }
                                                })}
                                                className="rounded"
                                            />
                                            <span className="text-sm">🌿 Bio/Organique</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Origine */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Origine</h4>
                                    <div className="space-y-2">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.attributes.quebecProduct}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    attributes: { ...formData.attributes, quebecProduct: e.target.checked }
                                                })}
                                                className="rounded"
                                            />
                                            <span className="text-sm">🍁 Produit du Québec</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Allergènes */}
                                <div>
                                    <Label htmlFor="allergens">Allergènes</Label>
                                    <Textarea
                                        id="allergens"
                                        value={formData.attributes.allergens || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            attributes: { ...formData.attributes, allergens: e.target.value }
                                        })}
                                        rows={2}
                                        placeholder="Liste des allergènes (ex: Lait, Œufs, Soja...)"
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Liste les allergènes présents dans ce produit
                                    </p>
                                </div>
                            </div>

                            {/* Transport/Emballage Section */}
                            <div className="border-t pt-4 space-y-4">
                                <div>
                                    <Label className="text-base font-semibold">Informations de transport et d'emballage</Label>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Informations nécessaires pour la logistique et l'expédition
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="unitSize">Taille unitaire</Label>
                                        <Input
                                            id="unitSize"
                                            value={formData.unitSize}
                                            onChange={(e) => setFormData({ ...formData, unitSize: e.target.value })}
                                            placeholder="ex: 500g, 1L, etc."
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Taille/poids d'une unité du produit
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="casePack">Produits par boîte de transport</Label>
                                        <Input
                                            id="casePack"
                                            value={formData.casePack}
                                            onChange={(e) => setFormData({ ...formData, casePack: e.target.value })}
                                            placeholder="ex: 12, 24, etc."
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Nombre de produits par boîte de transport
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="palletTi">Palette - Tiers (TI)</Label>
                                        <Input
                                            id="palletTi"
                                            type="number"
                                            min="0"
                                            value={formData.pallet.ti === 0 ? '' : formData.pallet.ti}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                                                setFormData({
                                                    ...formData,
                                                    pallet: { ...formData.pallet, ti: val === '' ? 0 : val }
                                                });
                                            }}
                                            onBlur={(e) => {
                                                if (e.target.value === '') {
                                                    setFormData({
                                                        ...formData,
                                                        pallet: { ...formData.pallet, ti: 0 }
                                                    });
                                                }
                                            }}
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Nombre de couches (tiers) de boîtes empilées verticalement sur la palette
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="palletHi">Palette - Hauteur (HI)</Label>
                                        <Input
                                            id="palletHi"
                                            type="number"
                                            min="0"
                                            value={formData.pallet.hi === 0 ? '' : formData.pallet.hi}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                                                setFormData({
                                                    ...formData,
                                                    pallet: { ...formData.pallet, hi: val === '' ? 0 : val }
                                                });
                                            }}
                                            onBlur={(e) => {
                                                if (e.target.value === '') {
                                                    setFormData({
                                                        ...formData,
                                                        pallet: { ...formData.pallet, hi: 0 }
                                                    });
                                                }
                                            }}
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Nombre de boîtes par couche (disposition horizontale)
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs text-blue-800 mb-1">
                                        <strong>💡 Calcul automatique :</strong> Nombre total de produits par palette
                                    </p>
                                    {formData.pallet.ti > 0 && formData.pallet.hi > 0 && formData.casePack && (
                                        <p className="text-sm font-semibold text-blue-900">
                                            Total : {(formData.pallet.ti * formData.pallet.hi * parseInt(formData.casePack) || 0).toLocaleString()} produits par palette
                                        </p>
                                    )}
                                    <p className="text-xs text-blue-700 mt-1">
                                        Formule : (TI × HI) × Produits par boîte = Total produits/palette
                                    </p>
                                </div>

                                <div>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.refrigerated}
                                            onChange={(e) => setFormData({ ...formData, refrigerated: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">❄️ Produit réfrigéré (nécessite transport à température contrôlée)</span>
                                    </label>
                                </div>

                                <div>
                                    <Label htmlFor="packagingGroup">Groupe d'emballage</Label>
                                    <Input
                                        id="packagingGroup"
                                        value={formData.packagingGroup}
                                        onChange={(e) => setFormData({ ...formData, packagingGroup: e.target.value })}
                                        placeholder="ex: Groupe A, Forme ronde, etc."
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Groupez les produits de même forme/taille pour l'emballage ensemble (ex: "Groupe A", "Forme ronde", etc.)
                                    </p>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                                    Annuler
                                </Button>
                                <Button type="submit">
                                    {editingProduct ? 'Modifier' : 'Créer'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Bulk Price Modal */}
                <Dialog open={showBulkPriceModal} onOpenChange={setShowBulkPriceModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Définir le prix pour {selectedProducts.length} produit(s)</DialogTitle>
                            <DialogDescription>
                                Tous les produits sélectionnés auront le même {getPriceLabel({ pricingSettings }).toLowerCase()}. Le prix de vente à l'école sera calculé automatiquement (+{pricingSettings.markup || 5}%).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="bulkPrice">{getPriceLabel({ pricingSettings })} ($) *</Label>
                                <Input
                                    id="bulkPrice"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={bulkPrice}
                                    onChange={(e) => setBulkPrice(e.target.value)}
                                    placeholder="4.50"
                                />
                            </div>
                            {bulkPrice && parseFloat(bulkPrice) > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <Label className="text-sm font-semibold text-blue-900">
                                        Prix de vente à l'école (calculé automatiquement)
                                    </Label>
                                    <div className="mt-2">
                                        <div className="text-2xl font-bold text-blue-700">
                                            ${roundDownToFiveCents(parseFloat(bulkPrice) * getMarkupMultiplier({ pricingSettings })).toFixed(2)}
                                        </div>
                                        <p className="text-xs text-blue-600 mt-1">
                                            {getPriceLabel({ pricingSettings })} + {pricingSettings.markup || 5}%
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div>
                                <Label htmlFor="bulkRecommendedRetailPrice">Prix conseillé de revente ($)</Label>
                                <Input
                                    id="bulkRecommendedRetailPrice"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={bulkRecommendedRetailPrice}
                                    onChange={(e) => setBulkRecommendedRetailPrice(e.target.value)}
                                    placeholder="ex: 6.50"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Prix de revente conseillé pour l'élève/école (optionnel)
                                </p>
                                {bulkRecommendedRetailPrice && bulkPrice && parseFloat(bulkRecommendedRetailPrice) > 0 && parseFloat(bulkPrice) > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                                        <p className="text-xs text-green-800 mb-1">
                                            <strong>💰 Marge pour l'élève/école :</strong>
                                        </p>
                                        {(() => {
                                            const markupMultiplier = getMarkupMultiplier({ pricingSettings });
                                            const basePriceWithMarkup = parseFloat(bulkPrice) * markupMultiplier;
                                            // Round down to nearest 5 cents for school price
                                            const roundedPrice = roundDownToFiveCents(basePriceWithMarkup);
                                            const margin = parseFloat(bulkRecommendedRetailPrice) - roundedPrice;
                                            const marginPercent = roundedPrice > 0 ? ((margin / roundedPrice) * 100) : 0;
                                            return (
                                                <>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-lg font-bold text-green-700">
                                                            ${margin.toFixed(2)}
                                                        </span>
                                                        <span className="text-sm text-green-600">
                                                            ({marginPercent.toFixed(1)}% de marge)
                                                        </span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowBulkPriceModal(false)}>
                                Annuler
                            </Button>
                            <Button onClick={handleBulkPriceUpdate}>
                                Appliquer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Bulk Attributes Modal */}
                <Dialog open={showBulkAttributesModal} onOpenChange={setShowBulkAttributesModal}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Définir les attributs pour {selectedProducts.length} produit(s)</DialogTitle>
                            <DialogDescription>
                                Les attributs sélectionnés seront appliqués à tous les produits sélectionnés. Seuls les champs communs sont disponibles.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            {/* Transport et Emballage */}
                            <div className="border-b pb-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Transport et Emballage</h4>
                                <div className="space-y-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={bulkAttributes.refrigerated}
                                            onChange={(e) => setBulkAttributes({
                                                ...bulkAttributes,
                                                refrigerated: e.target.checked
                                            })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">❄️ Réfrigéré (transport à température contrôlée)</span>
                                    </label>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="bulkUnitSize">Taille unitaire</Label>
                                            <Input
                                                id="bulkUnitSize"
                                                value={bulkAttributes.unitSize}
                                                onChange={(e) => setBulkAttributes({
                                                    ...bulkAttributes,
                                                    unitSize: e.target.value
                                                })}
                                                placeholder="ex: 500g, 1L, etc."
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="bulkCasePack">Produits par boîte de transport</Label>
                                            <Input
                                                id="bulkCasePack"
                                                value={bulkAttributes.casePack}
                                                onChange={(e) => setBulkAttributes({
                                                    ...bulkAttributes,
                                                    casePack: e.target.value
                                                })}
                                                placeholder="ex: 12, 24, etc."
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="bulkPackagingGroup">Groupe d'emballage</Label>
                                        <Input
                                            id="bulkPackagingGroup"
                                            value={bulkAttributes.packagingGroup}
                                            onChange={(e) => setBulkAttributes({
                                                ...bulkAttributes,
                                                packagingGroup: e.target.value
                                            })}
                                            placeholder="ex: Groupe A, Forme ronde, etc."
                                            className="mt-1"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Groupez les produits de même forme/taille pour l'emballage ensemble
                                        </p>
                                    </div>

                                    <div>
                                        <Label className="text-sm font-semibold mb-2 block">Configuration Palette</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="bulkPalletTi" className="text-xs">Tiers (TI) - Couches</Label>
                                                <Input
                                                    id="bulkPalletTi"
                                                    type="number"
                                                    min="0"
                                                    value={bulkAttributes.pallet.ti === 0 ? '' : bulkAttributes.pallet.ti}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                                                        setBulkAttributes({
                                                            ...bulkAttributes,
                                                            pallet: { ...bulkAttributes.pallet, ti: val === '' ? 0 : val }
                                                        });
                                                    }}
                                                    onBlur={(e) => {
                                                        if (e.target.value === '') {
                                                            setBulkAttributes({
                                                                ...bulkAttributes,
                                                                pallet: { ...bulkAttributes.pallet, ti: 0 }
                                                            });
                                                        }
                                                    }}
                                                    placeholder="0"
                                                    className="mt-1"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Nombre de couches empilées
                                                </p>
                                            </div>
                                            <div>
                                                <Label htmlFor="bulkPalletHi" className="text-xs">Hauteur (HI) - Par couche</Label>
                                                <Input
                                                    id="bulkPalletHi"
                                                    type="number"
                                                    min="0"
                                                    value={bulkAttributes.pallet.hi === 0 ? '' : bulkAttributes.pallet.hi}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                                                        setBulkAttributes({
                                                            ...bulkAttributes,
                                                            pallet: { ...bulkAttributes.pallet, hi: val === '' ? 0 : val }
                                                        });
                                                    }}
                                                    onBlur={(e) => {
                                                        if (e.target.value === '') {
                                                            setBulkAttributes({
                                                                ...bulkAttributes,
                                                                pallet: { ...bulkAttributes.pallet, hi: 0 }
                                                            });
                                                        }
                                                    }}
                                                    placeholder="0"
                                                    className="mt-1"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Nombre de boîtes par couche
                                                </p>
                                            </div>
                                        </div>
                                        {bulkAttributes.pallet.ti > 0 && bulkAttributes.pallet.hi > 0 && bulkAttributes.casePack && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                                                <p className="text-xs text-blue-800">
                                                    <strong>Total produits par palette :</strong> {(bulkAttributes.pallet.ti * bulkAttributes.pallet.hi * parseInt(bulkAttributes.casePack) || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Attributs communs */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Attributs communs</h4>
                                <div className="space-y-3">
                                    <div>
                                        <h5 className="text-xs font-medium text-gray-600 mb-2">Régimes alimentaires</h5>
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bulkAttributes.attributes.glutenFree}
                                                    onChange={(e) => setBulkAttributes({
                                                        ...bulkAttributes,
                                                        attributes: { ...bulkAttributes.attributes, glutenFree: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">🌾 Sans gluten</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bulkAttributes.attributes.vegetarian}
                                                    onChange={(e) => setBulkAttributes({
                                                        ...bulkAttributes,
                                                        attributes: { ...bulkAttributes.attributes, vegetarian: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">🥬 Végétarien</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bulkAttributes.attributes.vegan}
                                                    onChange={(e) => setBulkAttributes({
                                                        ...bulkAttributes,
                                                        attributes: { ...bulkAttributes.attributes, vegan: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">🌱 Végétalien/Vegan</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bulkAttributes.attributes.nutFree}
                                                    onChange={(e) => setBulkAttributes({
                                                        ...bulkAttributes,
                                                        attributes: { ...bulkAttributes.attributes, nutFree: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">🥜 Sans noix</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <h5 className="text-xs font-medium text-gray-600 mb-2">Certifications</h5>
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bulkAttributes.attributes.halal}
                                                    onChange={(e) => setBulkAttributes({
                                                        ...bulkAttributes,
                                                        attributes: { ...bulkAttributes.attributes, halal: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">🕌 Halal</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bulkAttributes.attributes.kosher}
                                                    onChange={(e) => setBulkAttributes({
                                                        ...bulkAttributes,
                                                        attributes: { ...bulkAttributes.attributes, kosher: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">✡️ Kasher</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bulkAttributes.attributes.organic}
                                                    onChange={(e) => setBulkAttributes({
                                                        ...bulkAttributes,
                                                        attributes: { ...bulkAttributes.attributes, organic: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">🌿 Bio/Organique</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <h5 className="text-xs font-medium text-gray-600 mb-2">Autres</h5>
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bulkAttributes.attributes.freezable}
                                                    onChange={(e) => setBulkAttributes({
                                                        ...bulkAttributes,
                                                        attributes: { ...bulkAttributes.attributes, freezable: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">❄️ Congelable</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bulkAttributes.attributes.quebecProduct}
                                                    onChange={(e) => setBulkAttributes({
                                                        ...bulkAttributes,
                                                        attributes: { ...bulkAttributes.attributes, quebecProduct: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">🍁 Produit du Québec</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowBulkAttributesModal(false)}>
                                Annuler
                            </Button>
                            <Button onClick={handleBulkAttributesUpdate}>
                                Appliquer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Import Price List Dialog */}
                <Dialog open={showImportPriceList} onOpenChange={setShowImportPriceList}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Importer ma liste de prix</DialogTitle>
                            <DialogDescription>
                                Téléchargez un fichier Excel (.xlsx, .xls) ou CSV contenant vos prix.
                                L'IA Gemini analysera le document et associera automatiquement les prix aux produits existants.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="priceListFile">Fichier de liste de prix</Label>
                                <Input
                                    id="priceListFile"
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleImportPriceList(file);
                                        }
                                    }}
                                    disabled={importingPrices}
                                    className="mt-2"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Formats acceptés: Excel (.xlsx, .xls) ou CSV (.csv)
                                </p>
                            </div>

                            {importingPrices && (
                                <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                                    <span className="text-sm text-blue-700">
                                        Analyse du fichier en cours avec Gemini AI...
                                    </span>
                                </div>
                            )}

                            {importResults && (
                                <div className="space-y-4">
                                    <div className={`p-4 rounded-lg ${importResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                        <div className="flex items-start gap-2">
                                            {importResults.success ? (
                                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                            ) : (
                                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <p className={`font-medium ${importResults.success ? 'text-green-800' : 'text-red-800'}`}>
                                                    {importResults.message}
                                                </p>
                                                {importResults.reasoning && (
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {importResults.reasoning}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {importResults.stats && (
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <p className="text-xs text-gray-600">Prix extraits</p>
                                                <p className="text-lg font-semibold">{importResults.stats.totalExtracted || 0}</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <p className="text-xs text-gray-600">Correspondances</p>
                                                <p className="text-lg font-semibold">{importResults.stats.totalMatches || 0}</p>
                                            </div>
                                            <div className="p-3 bg-green-50 rounded-lg">
                                                <p className="text-xs text-green-600">Mis à jour</p>
                                                <p className="text-lg font-semibold text-green-700">{importResults.stats.totalUpdated || 0}</p>
                                            </div>
                                        </div>
                                    )}

                                    {importResults.updatedProducts && importResults.updatedProducts.length > 0 && (
                                        <div>
                                            <Label className="text-sm font-medium">Produits mis à jour:</Label>
                                            <div className="mt-2 max-h-60 overflow-y-auto border rounded-lg">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[200px]">Produit</TableHead>
                                                            <TableHead className="text-right">Nouveau prix</TableHead>
                                                            <TableHead className="text-right">Confiance</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {importResults.updatedProducts.map((product, index) => (
                                                            <TableRow key={product.id || index}>
                                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                                <TableCell className="text-right">
                                                                    ${parseFloat(product.pricePickup).toFixed(2)}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Badge variant={product.confidence > 0.7 ? 'default' : 'secondary'}>
                                                                        {(product.confidence * 100).toFixed(0)}%
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowImportPriceList(false);
                                    setImportResults(null);
                                }}
                                disabled={importingPrices}
                            >
                                {importResults ? 'Fermer' : 'Annuler'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};

export default ProductsPage;


