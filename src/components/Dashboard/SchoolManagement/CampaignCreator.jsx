import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Calendar,
  DollarSign,
  Percent,
  Target,
  Package,
  X,
  Settings,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Users,
  Edit
} from 'lucide-react';
import { toast } from 'react-toastify';
import ParentLetterModal from './ParentLetterModal';
import CampaignWizard from './CampaignWizard';
import { getTerminology } from '@/utils/organizationHelpers';
import { calculateDeliveryCostPerProduct } from '../../../lib/deliveryCalculator';
import { getMarkupMultiplier, roundDownToFiveCents } from '@/utils/supplierPricing';

const CampaignCreator = ({ onCampaignCreated, school }) => {
  // Get terminology based on organization type
  const organizationType = school?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  const [wizardCompleted, setWizardCompleted] = useState(false);
  const [wizardData, setWizardData] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  // Step management for post-wizard configuration
  const [configurationStep, setConfigurationStep] = useState(1); // 1 = Products/Profits, 2 = Donations
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    deliveryDate: '',
    financialGoal: '',
    distributionStartHour: '',
    distributionEndHour: '',
    truckArrivalHour: ''
  });
  const [creating, setCreating] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [customPrices, setCustomPrices] = useState({});
  const [profitSplits, setProfitSplits] = useState({});
  const [calculatedDeliveryCosts, setCalculatedDeliveryCosts] = useState({});
  const profitSplitsInitializedRef = useRef(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [minimumDeliveryDays, setMinimumDeliveryDays] = useState(21); // Default to 21 days
  const [truckArrivalError, setTruckArrivalError] = useState('');

  // Student donations configuration
  const [studentDonationsEnabled, setStudentDonationsEnabled] = useState(true);
  const [studentDonationPresets, setStudentDonationPresets] = useState([0, 5, 10, 20]);
  const [studentDonationSplit, setStudentDonationSplit] = useState({
    studentAccount: 0.0,
    studentCash: 100.0
  });

  // School donations configuration
  const [schoolDonationsEnabled, setSchoolDonationsEnabled] = useState(true);
  const [schoolDonationPresets, setSchoolDonationPresets] = useState([0, 5, 10, 20]);

  // Groups configuration
  const [groupsEnabled, setGroupsEnabled] = useState(false);
  const [groupsText, setGroupsText] = useState('');
  const [groupsList, setGroupsList] = useState([]);
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [selectedCampaignForReuse, setSelectedCampaignForReuse] = useState('');
  const [availableCampaignsForReuse, setAvailableCampaignsForReuse] = useState([]);

  const [showParentLetterModal, setShowParentLetterModal] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState(null);

  // Global profit settings - load from localStorage or defaults
  const [globalProfitSettings, setGlobalProfitSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('globalProfitSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            profitPerProduct: parsed.profitPerProduct || 3.00,
            studentCash: parsed.studentCash !== undefined ? parsed.studentCash : 1.00,
            studentSchoolAccount: parsed.studentSchoolAccount !== undefined ? parsed.studentSchoolAccount : 1.00,
            schoolProject: parsed.schoolProject !== undefined ? parsed.schoolProject : 0.75,
            raffle: parsed.raffle !== undefined ? parsed.raffle : 0.25
          };
        } catch (e) {
          console.error('Error parsing saved globalProfitSettings:', e);
        }
      }
    }
    return {
      profitPerProduct: 3.00,
      studentCash: 1.00,
      studentSchoolAccount: 1.00,
      schoolProject: 0.75,
      raffle: 0.25
    };
  });

  // State for visual feedback when applying settings
  const [settingsApplied, setSettingsApplied] = useState(false);

  // Handle wizard completion
  const handleWizardComplete = (data) => {
    setWizardData(data);
    setSelectedSupplierId(data.supplierId);
    setFormData(prev => ({
      ...prev,
      startDate: data.startDate,
      endDate: data.endDate,
      deliveryDate: data.deliveryDate,
      financialGoal: data.financialGoal.toString(),
      distributionStartHour: data.distributionStartHour || '',
      distributionEndHour: data.distributionEndHour || '',
      truckArrivalHour: data.truckArrivalHour || ''
    }));
    setWizardCompleted(true);
  };

  // Load campaigns for group reuse
  useEffect(() => {
    if (!groupsEnabled || !school?._id) return;

    const fetchCampaigns = async () => {
      try {
        const response = await fetch(`/api/campaigns?schoolId=${school._id}`);
        if (response.ok) {
          const data = await response.json();
          setAvailableCampaignsForReuse(data.campaigns || []);
        }
      } catch (error) {
        console.error('Error fetching campaigns for reuse:', error);
      }
    };

    fetchCampaigns();
  }, [groupsEnabled, school]);

  // Load suppliers on component mount (for backward compatibility)
  useEffect(() => {
    if (!wizardCompleted) return;

    const fetchSuppliers = async () => {
      try {
        const schoolId = school?._id || school?.id;
        const url = schoolId
          ? `/api/suppliers?schoolId=${schoolId}`
          : '/api/suppliers';

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setSuppliers(data.suppliers || []);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        toast.error('Erreur lors du chargement des fournisseurs');
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, [wizardCompleted, school]);

  // Load supplier info when supplier is selected
  useEffect(() => {
    if (!selectedSupplierId) {
      setSelectedSupplier(null);
      return;
    }

    const fetchSupplier = async () => {
      try {
        const response = await fetch(`/api/suppliers?id=${selectedSupplierId}`);
        if (response.ok) {
          const data = await response.json();
          const supplier = data.supplier || null;
          setSelectedSupplier(supplier);

          // Update minimumDeliveryDays from supplier's delivery settings
          if (supplier?.deliverySettings?.minimumDeliveryDays) {
            setMinimumDeliveryDays(supplier.deliverySettings.minimumDeliveryDays);
          } else {
            // Default to 21 days if not set
            setMinimumDeliveryDays(21);
          }
        }
      } catch (error) {
        console.error('Error fetching supplier:', error);
      }
    };

    fetchSupplier();
  }, [selectedSupplierId]);

  // Load products when supplier is selected
  useEffect(() => {
    if (!selectedSupplierId) {
      setProducts([]);
      setLoadingProducts(false);
      setCalculatedDeliveryCosts({});
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const params = new URLSearchParams({
          supplierId: selectedSupplierId,
          limit: '500'
        });
        const response = await fetch(`/api/products?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          // Extract products array from the response
          const productsData = data.products || [];
          setProducts(productsData);

          // Initialize custom prices with recommended retail price (or price as fallback)
          const initialPrices = {};
          productsData.forEach(product => {
            // Use recommendedRetailPrice as default selling price, fallback to price if not available
            const defaultPrice = product.recommendedRetailPrice || product.price || 0;
            initialPrices[product.id] = defaultPrice;
          });
          setCustomPrices(initialPrices);

          // Note: Profit splits will be initialized after calculatedDeliveryCosts are available
          // This is done in a separate useEffect to ensure delivery costs are calculated first
          profitSplitsInitializedRef.current = false; // Reset when products are loaded
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Erreur lors du chargement des produits');
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [selectedSupplierId]);

  // Calculate delivery costs for products when products and supplier/school info are available
  useEffect(() => {
    if (products.length === 0 || !selectedSupplier || !school) {
      setCalculatedDeliveryCosts({});
      return;
    }

    // Build supplier address
    const supplierAddressParts = [];
    if (selectedSupplier.address) supplierAddressParts.push(selectedSupplier.address);
    if (selectedSupplier.ville) supplierAddressParts.push(selectedSupplier.ville);
    if (selectedSupplier.codePostal) supplierAddressParts.push(selectedSupplier.codePostal);
    const supplierAddress = supplierAddressParts.length > 0
      ? supplierAddressParts.join(', ') + ', QC, Canada'
      : 'Montreal, QC, Canada'; // Default fallback

    // Build school address
    const schoolAddressParts = [];
    if (school.address) schoolAddressParts.push(school.address);
    if (school.ville) schoolAddressParts.push(school.ville);
    if (school.codePostal) schoolAddressParts.push(school.codePostal);
    const schoolAddress = schoolAddressParts.length > 0
      ? schoolAddressParts.join(', ') + ', QC, Canada'
      : 'Montreal, QC, Canada'; // Default fallback

    console.log('[CampaignCreator] Calculating delivery costs:', {
      supplierAddress,
      schoolAddress,
      productsCount: products.length,
      selectedSupplier: selectedSupplier.name
    });

    const costs = {};
    products.forEach(product => {
      const productId = product.id || product._id;

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
            schoolAddress,
            totalQuantity: halfPalletQuantity,
            requiresTailgate: false,
            isLimitedAccess: false
          });

          console.log(`[CampaignCreator] Calculated delivery cost for ${product.name}:`, {
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

          costs[productId] = estimate;
        } catch (error) {
          console.error('Error calculating delivery estimate for product:', product.name, error);
          costs[productId] = product.deliveryCostToSchool || 0;
        }
      } else {
        // Use stored deliveryCostToSchool if available, otherwise 0
        console.log(`[CampaignCreator] Product ${product.name} has no pallet info, using stored deliveryCostToSchool:`, {
          productId,
          pallet: product.pallet,
          casePack: product.casePack,
          storedDeliveryCost: product.deliveryCostToSchool
        });
        costs[productId] = product.deliveryCostToSchool || 0;
      }
    });

    console.log('[CampaignCreator] Final calculated delivery costs:', costs);
    setCalculatedDeliveryCosts(costs);
  }, [products, selectedSupplier, school]);

  // Initialize profit splits when delivery costs are calculated (or when products change)
  // This ensures we use the correct delivery costs in the profit calculation
  useEffect(() => {
    if (products.length === 0 || Object.keys(customPrices).length === 0) {
      profitSplitsInitializedRef.current = false;
      return;
    }

    // Only initialize profit splits once when delivery costs are first calculated
    // Don't overwrite if user has already modified them
    if (profitSplitsInitializedRef.current) {
      return;
    }

    // Check if we have calculated delivery costs (at least one product should have a cost)
    const hasCalculatedCosts = Object.keys(calculatedDeliveryCosts).length > 0 ||
      products.some(p => p.deliveryCostToSchool);

    if (!hasCalculatedCosts) {
      return; // Wait for delivery costs to be calculated
    }

    // Initialize profit splits with calculated delivery costs
    const initialProfitSplits = {};
    products.forEach(product => {
      // Use recommendedRetailPrice as default selling price, fallback to price if not available
      const defaultPrice = customPrices[product.id] !== undefined && customPrices[product.id] !== ''
        ? customPrices[product.id]
        : (product.recommendedRetailPrice || product.price || 0);

      // IMPORTANT: product.acquisitionCost or product.price is the ROUNDED price (source of truth)
      // Always prefer these values over computed values when available
      let acquisitionCost = 0;
      if (product.acquisitionCost !== undefined && product.acquisitionCost !== null && product.acquisitionCost > 0) {
        // Use acquisitionCost from API (already rounded to nearest 5 cents)
        acquisitionCost = Number(product.acquisitionCost);
      } else if (product.price !== undefined && product.price !== null && product.price > 0) {
        // product.price is already rounded to nearest 5 cents (source of truth) - use it directly
        acquisitionCost = Number(product.price);
      } else {
        // Last resort: calculate from pricePickup (should rarely happen as APIs set price correctly)
        const pricePickup = product.pricePickup || 0;
        // Use calculated delivery cost if available, otherwise fallback to stored value (same as in display)
        const deliveryCostToSchool = calculatedDeliveryCosts[product.id] || product.deliveryCostToSchool || 0;
        // Get pricing settings from supplier
        const pricingSettings = selectedSupplier?.pricingSettings || { markup: 5, handlesShipping: false };
        const markupMultiplier = getMarkupMultiplier({ pricingSettings });
        const handlesShipping = pricingSettings.handlesShipping || false;
        // If supplier handles shipping, delivery cost should be 0 for price calculation
        const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCostToSchool;
        const basePrice = pricePickup * markupMultiplier;
        const totalPrice = basePrice + effectiveDeliveryCost;
        // Round down to nearest 5 cents for school cost
        acquisitionCost = roundDownToFiveCents(totalPrice);
      }
      // Profit = Prix de vente - Coût d'acquisition (same calculation as in display)
      const profit = Math.max(0, defaultPrice - acquisitionCost);

      // Initialize profit splits with 100% of profit to "Étudiant(e) comptant" (studentCash)
      // Round to 2 decimals to avoid floating point precision issues
      const profitRounded = Math.round(profit * 100) / 100;
      initialProfitSplits[product.id] = {
        studentCash: profitRounded,
        studentSchoolAccount: 0,
        schoolProject: 0,
        raffle: 0
      };
    });

    setProfitSplits(initialProfitSplits);
    profitSplitsInitializedRef.current = true;
  }, [products, customPrices, calculatedDeliveryCosts]);

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };

      // Real-time validation for delivery date
      if (field === 'deliveryDate' || field === 'endDate') {
        validateDeliveryDate(updated.deliveryDate, updated.endDate);
      }

      // Real-time validation for truck arrival hour
      if (field === 'truckArrivalHour' || field === 'distributionStartHour') {
        validateTruckArrivalHour(updated.truckArrivalHour, updated.distributionStartHour);
      }

      return updated;
    });
  };

  // Real-time validation for truck arrival hour
  const validateTruckArrivalHour = (truckArrivalHour, distributionStartHour) => {
    if (!truckArrivalHour || !distributionStartHour) {
      setTruckArrivalError('');
      return;
    }

    // Parse hours in format "XXhXX" (e.g., "08h15")
    const truckMatch = truckArrivalHour.match(/(\d{2})h(\d{2})/);
    const distributionMatch = distributionStartHour.match(/(\d{2})h(\d{2})/);

    if (!truckMatch || !distributionMatch) {
      setTruckArrivalError('');
      return;
    }

    const truckHour = parseInt(truckMatch[1]);
    const truckMinutes = parseInt(truckMatch[2]);
    const truckTotalMinutes = truckHour * 60 + truckMinutes;

    const distributionHour = parseInt(distributionMatch[1]);
    const distributionMinutes = parseInt(distributionMatch[2]);
    const distributionTotalMinutes = distributionHour * 60 + distributionMinutes;

    const timeDiff = distributionTotalMinutes - truckTotalMinutes;

    if (timeDiff < 15) {
      const minutesShort = 15 - timeDiff;
      const errorMessage = `L'heure d'arrivée du camion doit être au moins 15 minutes avant le début de la distribution. Il manque ${minutesShort} minute${minutesShort > 1 ? 's' : ''}.`;
      setTruckArrivalError(errorMessage);
      const errors = { ...validationErrors };
      errors.truckArrivalHour = errorMessage;
      setValidationErrors(errors);
    } else {
      setTruckArrivalError('');
      const errors = { ...validationErrors };
      delete errors.truckArrivalHour;
      setValidationErrors(errors);
    }
  };

  // Real-time validation for delivery date
  const validateDeliveryDate = (deliveryDate, endDate) => {
    const errors = { ...validationErrors };

    if (!deliveryDate || !endDate) {
      delete errors.deliveryDate;
      setValidationErrors(errors);
      return;
    }

    const end = new Date(endDate + 'T00:00:00');
    const delivery = new Date(deliveryDate + 'T00:00:00');
    end.setHours(0, 0, 0, 0);
    delivery.setHours(0, 0, 0, 0);

    const requiredDaysInMillis = minimumDeliveryDays * 24 * 60 * 60 * 1000;
    const timeDiff = delivery.getTime() - end.getTime();
    const daysDiff = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));

    if (timeDiff < requiredDaysInMillis) {
      errors.deliveryDate = `La date de livraison doit être au moins ${minimumDeliveryDays} jour${minimumDeliveryDays > 1 ? 's' : ''} après la fin de la campagne. Actuellement: ${daysDiff} jour${daysDiff > 1 ? 's' : ''}.`;
    } else {
      delete errors.deliveryDate;
    }

    setValidationErrors(errors);
  };

  const handlePriceChange = (productId, price) => {
    setCustomPrices(prev => ({
      ...prev,
      [productId]: price === '' ? '' : (price === '-' ? '-' : (isNaN(parseFloat(price)) ? '' : price))
    }));
  };

  const handleProfitSplitChange = (productId, type, value) => {
    setProfitSplits(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [type]: value === '' ? '' : (value === '-' ? '-' : (isNaN(parseFloat(value)) ? '' : value))
      }
    }));
  };

  // Handle global profit settings changes
  const handleGlobalProfitSettingsChange = (field, value) => {
    setGlobalProfitSettings(prev => {
      const updated = {
        ...prev,
        [field]: value === '' ? '' : (value === '-' ? '-' : (isNaN(parseFloat(value)) ? '' : value))
      };
      // Save to localStorage whenever it changes (only if valid number)
      if (typeof window !== 'undefined' && value !== '' && !isNaN(parseFloat(value))) {
        const numValue = parseFloat(value);
        localStorage.setItem('globalProfitSettings', JSON.stringify({
          ...prev,
          [field]: numValue
        }));
      }
      return updated;
    });
  };

  // Apply global profit settings to all products
  const applyGlobalProfitSettings = () => {
    const newCustomPrices = { ...customPrices };
    const newProfitSplits = { ...profitSplits };

    products.forEach(product => {
      const desiredProfit = parseFloat(globalProfitSettings.profitPerProduct) || 0;
      // IMPORTANT: product.acquisitionCost or product.price is the ROUNDED price (source of truth)
      // Always prefer these values over computed values when available
      let acquisitionCost = 0;
      if (product.acquisitionCost !== undefined && product.acquisitionCost !== null && product.acquisitionCost > 0) {
        // Use acquisitionCost from API (already rounded to nearest 5 cents)
        acquisitionCost = Number(product.acquisitionCost);
      } else if (product.price !== undefined && product.price !== null && product.price > 0) {
        // product.price is already rounded to nearest 5 cents (source of truth) - use it directly
        acquisitionCost = Number(product.price);
      } else {
        // Last resort: calculate from pricePickup (should rarely happen as APIs set price correctly)
        const pricePickup = product.pricePickup || 0;
        const deliveryCostToSchool = calculatedDeliveryCosts[product.id] || product.deliveryCostToSchool || 0;
        // Get pricing settings from supplier
        const pricingSettings = selectedSupplier?.pricingSettings || { markup: 5, handlesShipping: false };
        const markupMultiplier = getMarkupMultiplier({ pricingSettings });
        const handlesShipping = pricingSettings.handlesShipping || false;
        // If supplier handles shipping, delivery cost should be 0 for price calculation
        const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCostToSchool;
        const basePrice = pricePickup * markupMultiplier;
        const totalPrice = basePrice + effectiveDeliveryCost;
        // Round down to nearest 5 cents
        acquisitionCost = roundDownToFiveCents(totalPrice);
      }
      // Prix de vente = Coût d'acquisition + Profit désiré
      const sellingPrice = acquisitionCost + desiredProfit;

      // Update custom price
      newCustomPrices[product.id] = parseFloat(sellingPrice.toFixed(2));

      // Use absolute values from global settings, converting empty strings to numbers
      newProfitSplits[product.id] = {
        studentCash: parseFloat(globalProfitSettings.studentCash) || 0,
        studentSchoolAccount: parseFloat(globalProfitSettings.studentSchoolAccount) || 0,
        schoolProject: parseFloat(globalProfitSettings.schoolProject) || 0,
        raffle: parseFloat(globalProfitSettings.raffle) || 0
      };
    });

    setCustomPrices(newCustomPrices);
    setProfitSplits(newProfitSplits);

    // Save global profit settings to localStorage (only numeric values)
    if (typeof window !== 'undefined') {
      const numericSettings = {
        profitPerProduct: parseFloat(globalProfitSettings.profitPerProduct) || 0,
        studentCash: parseFloat(globalProfitSettings.studentCash) || 0,
        studentSchoolAccount: parseFloat(globalProfitSettings.studentSchoolAccount) || 0,
        schoolProject: parseFloat(globalProfitSettings.schoolProject) || 0,
        raffle: parseFloat(globalProfitSettings.raffle) || 0
      };
      localStorage.setItem('globalProfitSettings', JSON.stringify(numericSettings));
    }

    // Show visual feedback
    setSettingsApplied(true);
    toast.success('Répartition des profits appliquée à tous les produits');

    // Reset visual feedback after animation
    setTimeout(() => {
      setSettingsApplied(false);
    }, 2000);
  };

  // Student donation handlers
  const handleStudentDonationPresetChange = (index, value) => {
    const newPresets = [...studentDonationPresets];
    newPresets[index] = value === '' ? '' : (value === '-' ? '-' : (isNaN(parseFloat(value)) ? '' : value));
    // Don't sort immediately - just update the value
    setStudentDonationPresets(newPresets);
  };

  const handleStudentDonationPresetBlur = () => {
    // Sort presets from smallest to largest when user finishes editing (onBlur)
    const sortedPresets = [...studentDonationPresets].sort((a, b) => {
      const numA = a === '' ? 0 : parseFloat(a) || 0;
      const numB = b === '' ? 0 : parseFloat(b) || 0;
      return numA - numB;
    });
    setStudentDonationPresets(sortedPresets);
  };

  const addStudentDonationPreset = () => {
    if (studentDonationPresets.length < 6) {
      const newPresets = [...studentDonationPresets, 0];
      // Sort presets from smallest to largest
      const sortedPresets = newPresets.sort((a, b) => {
        const numA = a === '' ? 0 : parseFloat(a) || 0;
        const numB = b === '' ? 0 : parseFloat(b) || 0;
        return numA - numB;
      });
      setStudentDonationPresets(sortedPresets);
    }
  };

  const removeStudentDonationPreset = (index) => {
    if (studentDonationPresets.length > 2) {
      const newPresets = studentDonationPresets.filter((_, i) => i !== index);
      // Sort presets from smallest to largest after removal
      const sortedPresets = newPresets.sort((a, b) => {
        const numA = a === '' ? 0 : parseFloat(a) || 0;
        const numB = b === '' ? 0 : parseFloat(b) || 0;
        return numA - numB;
      });
      setStudentDonationPresets(sortedPresets);
    }
  };

  const handleStudentDonationSplitChange = (type, value) => {
    setStudentDonationSplit(prev => ({
      ...prev,
      [type]: value === '' ? '' : (value === '-' ? '-' : (isNaN(parseFloat(value)) ? '' : value))
    }));
  };

  // School donation handlers
  const handleSchoolDonationPresetChange = (index, value) => {
    const newPresets = [...schoolDonationPresets];
    newPresets[index] = value === '' ? '' : (value === '-' ? '-' : (isNaN(parseFloat(value)) ? '' : value));
    // Don't sort immediately - just update the value
    setSchoolDonationPresets(newPresets);
  };

  const handleSchoolDonationPresetBlur = () => {
    // Sort presets from smallest to largest when user finishes editing (onBlur)
    const sortedPresets = [...schoolDonationPresets].sort((a, b) => {
      const numA = a === '' ? 0 : parseFloat(a) || 0;
      const numB = b === '' ? 0 : parseFloat(b) || 0;
      return numA - numB;
    });
    setSchoolDonationPresets(sortedPresets);
  };

  const addSchoolDonationPreset = () => {
    if (schoolDonationPresets.length < 6) {
      const newPresets = [...schoolDonationPresets, 0];
      // Sort presets from smallest to largest
      const sortedPresets = newPresets.sort((a, b) => {
        const numA = a === '' ? 0 : parseFloat(a) || 0;
        const numB = b === '' ? 0 : parseFloat(b) || 0;
        return numA - numB;
      });
      setSchoolDonationPresets(sortedPresets);
    }
  };

  const removeSchoolDonationPreset = (index) => {
    if (schoolDonationPresets.length > 2) {
      const newPresets = schoolDonationPresets.filter((_, i) => i !== index);
      // Sort presets from smallest to largest after removal
      const sortedPresets = newPresets.sort((a, b) => {
        const numA = a === '' ? 0 : parseFloat(a) || 0;
        const numB = b === '' ? 0 : parseFloat(b) || 0;
        return numA - numB;
      });
      setSchoolDonationPresets(sortedPresets);
    }
  };

  // Import date helpers
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate minimum delivery date (based on supplier's minimumDeliveryDays setting)
  const getMinDeliveryDate = () => {
    if (!formData.endDate) {
      return '';
    }

    const endDate = new Date(formData.endDate + 'T00:00:00');
    const daysInMillis = minimumDeliveryDays * 24 * 60 * 60 * 1000;
    const minDeliveryDate = new Date(endDate.getTime() + daysInMillis);

    const year = minDeliveryDate.getFullYear();
    const month = String(minDeliveryDate.getMonth() + 1).padStart(2, '0');
    const day = String(minDeliveryDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const validateForm = () => {
    const { startDate, endDate, deliveryDate, financialGoal } = formData;
    const errors = {};
    console.log('Validating form:', formData);

    // Clear previous errors
    setValidationErrors({});

    if (!startDate || !endDate || !deliveryDate || !financialGoal) {
      console.log('Missing required fields:', { startDate, endDate, deliveryDate, financialGoal });
      const missingFields = [];
      if (!startDate) missingFields.push('date de début');
      if (!endDate) missingFields.push('date de fin');
      if (!deliveryDate) missingFields.push('date de livraison');
      if (!financialGoal) missingFields.push('objectif financier');
      toast.error(`Champs requis manquants: ${missingFields.join(', ')}`);
      return false;
    }

    // Parse dates as local dates (YYYY-MM-DD format) to avoid timezone issues
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const delivery = new Date(deliveryDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    // Also normalize start date for comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    delivery.setHours(0, 0, 0, 0);

    console.log('Date validation:', { start, end, delivery });

    if (end <= start) {
      console.log('End date validation failed: end <= start', { end, start });
      errors.endDate = 'La date de fin doit être après la date de début';
      toast.error('La date de fin doit être après la date de début');
      setValidationErrors(errors);
      return false;
    }

    const requiredDaysInMillis = minimumDeliveryDays * 24 * 60 * 60 * 1000;
    const timeDiff = delivery.getTime() - end.getTime();
    const daysDiff = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));

    console.log('Delivery date validation:', {
      timeDiff,
      requiredDaysInMillis,
      daysDiff,
      minimumDeliveryDays,
      required: timeDiff >= requiredDaysInMillis
    });

    if (timeDiff < requiredDaysInMillis) {
      console.log('Delivery date validation failed');
      const errorMessage = `La date de livraison doit être au moins ${minimumDeliveryDays} jour${minimumDeliveryDays > 1 ? 's' : ''} après la fin de la campagne. Actuellement: ${daysDiff} jour${daysDiff > 1 ? 's' : ''}.`;
      errors.deliveryDate = errorMessage;
      toast.error(errorMessage, { autoClose: 5000 });
      setValidationErrors(errors);
      return false;
    }

    const financialGoalValue = parseFloat(financialGoal);
    console.log('Financial goal validation:', { financialGoalValue });
    if (financialGoalValue <= 0 || isNaN(financialGoalValue)) {
      console.log('Financial goal validation failed');
      errors.financialGoal = 'L\'objectif financier doit être supérieur à 0';
      toast.error('L\'objectif financier doit être supérieur à 0');
      setValidationErrors(errors);
      return false;
    }

    // Validate distribution hours if provided
    if (formData.distributionStartHour && formData.distributionEndHour) {
      const startMatch = formData.distributionStartHour.match(/(\d{2})h(\d{2})/);
      const endMatch = formData.distributionEndHour.match(/(\d{2})h(\d{2})/);

      console.log('Distribution hours validation:', {
        distributionStartHour: formData.distributionStartHour,
        distributionEndHour: formData.distributionEndHour,
        startMatch,
        endMatch
      });

      if (startMatch && endMatch) {
        const startMinutes = parseInt(startMatch[1]) * 60 + parseInt(startMatch[2]);
        const endMinutes = parseInt(endMatch[1]) * 60 + parseInt(endMatch[2]);

        console.log('Distribution hours comparison:', { startMinutes, endMinutes, valid: endMinutes > startMinutes });

        if (endMinutes <= startMinutes) {
          console.log('Distribution hours validation failed');
          errors.distributionEndHour = 'L\'heure de fin doit être après l\'heure de début';
          toast.error('L\'heure de fin doit être après l\'heure de début');
          setValidationErrors(errors);
          return false;
        }
      }
    }

    // Validate truck arrival hour if both are provided
    if (formData.truckArrivalHour && formData.distributionStartHour) {
      const truckMatch = formData.truckArrivalHour.match(/(\d{2})h(\d{2})/);
      const distributionMatch = formData.distributionStartHour.match(/(\d{2})h(\d{2})/);

      if (truckMatch && distributionMatch) {
        const truckHour = parseInt(truckMatch[1]);
        const truckMinutes = parseInt(truckMatch[2]);
        const truckTotalMinutes = truckHour * 60 + truckMinutes;

        const distributionHour = parseInt(distributionMatch[1]);
        const distributionMinutes = parseInt(distributionMatch[2]);
        const distributionTotalMinutes = distributionHour * 60 + distributionMinutes;

        const timeDiff = distributionTotalMinutes - truckTotalMinutes;

        if (timeDiff < 15) {
          const minutesShort = 15 - timeDiff;
          const errorMessage = `L'heure d'arrivée du camion doit être au moins 15 minutes avant le début de la distribution. Il manque ${minutesShort} minute${minutesShort > 1 ? 's' : ''}.`;
          errors.truckArrivalHour = errorMessage;
          toast.error(errorMessage);
          setValidationErrors(errors);
          return false;
        }
      }
    }

    // Validate products and profit splits
    if (products.length === 0) {
      errors.products = 'Au moins un produit est requis';
      toast.error('Veuillez sélectionner un fournisseur avec des produits');
      setValidationErrors(errors);
      return false;
    }

    // Check if all products have valid profit splits
    let hasInvalidProfitSplit = false;
    products.forEach(product => {
      const splits = profitSplits[product.id] || {};
      const studentCash = parseFloat(splits.studentCash) || 0;
      const studentSchoolAccount = parseFloat(splits.studentSchoolAccount) || 0;
      const schoolProject = parseFloat(splits.schoolProject) || 0;
      const raffle = parseFloat(splits.raffle) || 0;

      // Round to 2 decimals to avoid floating point precision issues
      const total = Math.round((studentCash + studentSchoolAccount + schoolProject + raffle) * 100) / 100;

      const sellingPrice = customPrices[product.id] !== undefined && customPrices[product.id] !== ''
        ? customPrices[product.id]
        : (product.recommendedRetailPrice || product.price);
      // IMPORTANT: product.acquisitionCost or product.price is the ROUNDED price (source of truth)
      // Always prefer these values over computed values when available
      let acquisitionCost = 0;
      if (product.acquisitionCost !== undefined && product.acquisitionCost !== null && product.acquisitionCost > 0) {
        // Use acquisitionCost from API (already rounded to nearest 5 cents)
        acquisitionCost = Number(product.acquisitionCost);
      } else if (product.price !== undefined && product.price !== null && product.price > 0) {
        // product.price is already rounded to nearest 5 cents (source of truth) - use it directly
        acquisitionCost = Number(product.price);
      } else {
        // Last resort: calculate from pricePickup (should rarely happen as APIs set price correctly)
        const pricePickup = product.pricePickup || 0;
        const deliveryCostToSchool = calculatedDeliveryCosts[product.id] || product.deliveryCostToSchool || 0;
        // Get pricing settings from supplier
        const pricingSettings = selectedSupplier?.pricingSettings || { markup: 5, handlesShipping: false };
        const markupMultiplier = getMarkupMultiplier({ pricingSettings });
        const handlesShipping = pricingSettings.handlesShipping || false;
        // If supplier handles shipping, delivery cost should be 0 for price calculation
        const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCostToSchool;
        const basePrice = pricePickup * markupMultiplier;
        const totalPrice = basePrice + effectiveDeliveryCost;
        // Round down to nearest 5 cents
        acquisitionCost = roundDownToFiveCents(totalPrice);
      }
      const profit = typeof sellingPrice === 'number' ? sellingPrice - acquisitionCost : (parseFloat(sellingPrice) || 0) - acquisitionCost;
      const profitRounded = Math.round(profit * 100) / 100;

      // Use epsilon (0.01) to account for rounding differences
      if (total > profitRounded + 0.01) {
        console.log('Profit split validation failed for product:', {
          productId: product.id,
          productName: product.name,
          total,
          profit: profitRounded,
          difference: total - profitRounded
        });
        hasInvalidProfitSplit = true;
      }
    });

    if (hasInvalidProfitSplit) {
      errors.profitSplits = 'Certains produits ont une répartition de profits supérieure au profit disponible';
      toast.error('Vérifiez la répartition des profits pour tous les produits');
      setValidationErrors(errors);
      return false;
    }

    console.log('All validations passed!');
    setValidationErrors({});
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted!', formData);

    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }

    console.log('Validation passed, creating campaign...');
    setCreating(true);
    try {
      if (!selectedSupplierId) {
        toast.error('Veuillez sélectionner un fournisseur');
        setCreating(false);
        return;
      }

      const campaignData = {
        supplierId: selectedSupplierId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        deliveryDate: formData.deliveryDate,
        distributionStartHour: formData.distributionStartHour,
        distributionEndHour: formData.distributionEndHour,
        truckArrivalHour: formData.truckArrivalHour,
        financialGoal: formData.financialGoal === '' || isNaN(parseFloat(formData.financialGoal))
          ? 0
          : parseFloat(formData.financialGoal),
        customPrices: Object.entries(customPrices).map(([productId, price]) => {
          const parsedPrice = parseFloat(price);
          if (isNaN(parsedPrice) || price === '') {
            // If empty, set to 0 or use default product price
            const product = products.find(p => p.id === productId);
            return {
              productId,
              price: product ? product.price : 0
            };
          }
          return {
            productId,
            price: parsedPrice
          };
        }),
        profitSplits: Object.entries(profitSplits).map(([productId, splits]) => {
          // Parse values, converting empty strings to 0
          const parseValue = (value, defaultValue = 0) => {
            if (value === '' || value === null || value === undefined) {
              return defaultValue;
            }
            const parsed = parseFloat(value);
            return isNaN(parsed) ? defaultValue : parsed;
          };

          const result = {
            productId,
            studentCash: parseValue(splits.studentCash, 0),
            studentSchoolAccount: parseValue(splits.studentSchoolAccount, 0),
            schoolProject: parseValue(splits.schoolProject, 0),
            raffle: parseValue(splits.raffle, 0)
          };

          // Log first few profit splits to debug
          if (Object.keys(profitSplits).indexOf(productId) < 3) {
            console.log('[CampaignCreator] Sending profit split:', {
              productId,
              rawSplits: splits,
              parsedResult: result
            });
          }

          return result;
        }),
        donationsForStudents: {
          enabled: studentDonationsEnabled,
          presets: studentDonationPresets.map(p => p === '' || isNaN(parseFloat(p)) ? 0 : parseFloat(p)),
          splitConfig: {
            studentAccount: studentDonationSplit.studentAccount === '' || isNaN(parseFloat(studentDonationSplit.studentAccount))
              ? 0.0
              : parseFloat(studentDonationSplit.studentAccount),
            studentCash: studentDonationSplit.studentCash === '' || isNaN(parseFloat(studentDonationSplit.studentCash))
              ? 100.0
              : parseFloat(studentDonationSplit.studentCash)
          }
        },
        donationsForSchool: {
          enabled: schoolDonationsEnabled,
          presets: schoolDonationPresets.map(p => p === '' || isNaN(parseFloat(p)) ? 0 : parseFloat(p))
        },
        groups: {
          enabled: groupsEnabled,
          list: groupsList.map((name, index) => ({
            name: name.trim(),
            order: index
          })).filter(g => g.name.length > 0)
        },
        schoolId: school?.id || school?._id // Pass school ID to ensure correct school association
      };

      const response = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent with the request
        body: JSON.stringify(campaignData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Campagne créée avec succès et activée en mode test!');

        // Store the created campaign and show parent letter modal
        setCreatedCampaign(result.campaign);
        setShowParentLetterModal(true);

        // Reset form
        setFormData({
          startDate: '',
          endDate: '',
          deliveryDate: '',
          financialGoal: '',
          distributionStartHour: '',
          distributionEndHour: '',
          truckArrivalHour: ''
        });
        setCustomPrices({});
        setProfitSplits({});
        setSelectedSupplierId(null);

        // Notify parent component
        onCampaignCreated && onCampaignCreated(result.campaign);
      } else {
        let errorMessage = 'Erreur lors de la création de la campagne';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Campaign creation error:', errorData);
        } catch (e) {
          console.error('Error parsing error response:', e);
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(`Erreur lors de la création de la campagne: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setCreating(false);
    }
  };

  // Show wizard if not completed
  if (!wizardCompleted) {
    return (
      <div className="max-w-5xl mx-auto p-3 sm:p-4 lg:p-6 bg-white rounded-lg shadow-md overflow-x-hidden">
        <CampaignWizard
          onComplete={handleWizardComplete}
          school={school}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 lg:p-6 bg-white rounded-lg shadow-md overflow-x-hidden">
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-3 sm:mb-4">
          <Target className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 px-2 break-words">
          Configurer les Produits et Profits
        </h2>
        <p className="text-gray-600 text-sm sm:text-base lg:text-lg px-2">
          Configurez les prix et la répartition des profits pour votre campagne
        </p>
      </div>

      {/* Validation Errors Alert */}
      {Object.keys(validationErrors).length > 0 && (
        <Card className="mb-6 border-2 border-red-300 bg-gradient-to-r from-red-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-2">
                  Erreurs de validation
                </h3>
                <ul className="space-y-1">
                  {Object.entries(validationErrors).map(([field, message]) => (
                    <li key={field} className="text-sm text-red-700">
                      • {message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary of wizard selections */}
      <Card className={`border-2 mb-6 ${validationErrors.deliveryDate || validationErrors.endDate || validationErrors.financialGoal
        ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50'
        : 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50'
        }`}>
        <CardHeader>
          <CardTitle className={`flex items-center space-x-2 ${validationErrors.deliveryDate || validationErrors.endDate || validationErrors.financialGoal
            ? 'text-orange-900'
            : 'text-green-900'
            }`}>
            {validationErrors.deliveryDate || validationErrors.endDate || validationErrors.financialGoal ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            <span>Résumé de la Campagne</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Fournisseur</p>
              <p className="font-semibold text-gray-900">
                {suppliers.find(s => s._id === selectedSupplierId)?.name || 'Sélectionné'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Dates</p>
              <p className={`font-semibold ${validationErrors.endDate ? 'text-red-600' : 'text-gray-900'}`}>
                {formData.startDate && formData.endDate
                  ? `${new Date(formData.startDate).toLocaleDateString('fr-CA')} - ${new Date(formData.endDate).toLocaleDateString('fr-CA')}`
                  : 'Non définies'}
              </p>
              {validationErrors.endDate && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.endDate}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Objectif</p>
              <p className={`font-semibold ${validationErrors.financialGoal ? 'text-red-600' : 'text-gray-900'}`}>
                {formData.financialGoal ? `${parseFloat(formData.financialGoal).toLocaleString('fr-CA')} $` : 'Non défini'}
              </p>
              {validationErrors.financialGoal && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.financialGoal}</p>
              )}
            </div>
          </div>
          {validationErrors.deliveryDate && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-900 mb-1">⚠️ Date de livraison</p>
              <p className="text-sm text-red-700">{validationErrors.deliveryDate}</p>
              <p className="text-xs text-red-600 mt-2">
                Date de fin: {formData.endDate ? new Date(formData.endDate).toLocaleDateString('fr-CA') : 'Non définie'} |
                Date de livraison: {formData.deliveryDate ? new Date(formData.deliveryDate).toLocaleDateString('fr-CA') : 'Non définie'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step Indicator - Only show after wizard completion */}
      {wizardCompleted && (
        <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {/* Step 1 */}
              <div className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${configurationStep >= 1
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                  {configurationStep > 1 ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold">1</span>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-medium ${configurationStep >= 1 ? 'text-blue-900' : 'text-gray-500'
                    }`}>
                    Produits & Profits
                  </p>
                  <p className="text-xs text-gray-500">Configurez les prix et la répartition</p>
                </div>
              </div>

              {/* Connector */}
              <div className={`flex-1 h-0.5 mx-4 ${configurationStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'
                }`} />

              {/* Step 2 */}
              <div className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${configurationStep >= 2
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                  <span className="font-semibold">2</span>
                </div>
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-medium ${configurationStep >= 2 ? 'text-blue-900' : 'text-gray-500'
                    }`}>
                    Dons
                  </p>
                  <p className="text-xs text-gray-500">Configurez les options de dons</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Only show supplier selection and dates if wizard not completed (backward compatibility) */}
        {!wizardCompleted && (
          <>
            {/* Supplier Selection */}
            <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-purple-900">
                  <Package className="h-5 w-5" />
                  <span>Sélectionner un Fournisseur *</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSuppliers ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Chargement des fournisseurs...</p>
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-600 mb-4">Aucun fournisseur disponible pour le moment.</p>
                    <p className="text-sm text-gray-500">Veuillez contacter l'administrateur.</p>
                  </div>
                ) : (
                  <Select
                    value={selectedSupplierId || ''}
                    onValueChange={(value) => {
                      setSelectedSupplierId(value);
                      setProducts([]);
                      setCustomPrices({});
                      setProfitSplits({});
                    }}
                    required
                  >
                    <SelectTrigger className="w-full border-2 border-purple-300 focus:border-purple-500">
                      <SelectValue placeholder="Choisissez un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier._id} value={supplier._id}>
                          <div className="flex items-center space-x-2">
                            {supplier.logo && (
                              <img src={supplier.logo} alt={supplier.name} className="w-6 h-6 rounded" />
                            )}
                            <span>{supplier.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedSupplierId && (
                  <p className="mt-2 text-sm text-green-600 flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    Fournisseur sélectionné. Les produits seront chargés ci-dessous.
                  </p>
                )}
              </CardContent>
            </Card>

            {!selectedSupplierId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Note:</strong> Veuillez sélectionner un fournisseur pour continuer la création de la campagne.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dates */}
              <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2 text-blue-900">
                    <Calendar className="h-5 w-5" />
                    <span>Dates de la Campagne</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">Date de début *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">Date de fin *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="deliveryDate" className="text-sm font-medium text-gray-700">Date de livraison *</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                      min={getMinDeliveryDate()}
                      className={`mt-1 border-2 rounded-lg focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${validationErrors.deliveryDate
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-blue-500'
                        }`}
                      required
                    />
                    {validationErrors.deliveryDate ? (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        ⚠️ {validationErrors.deliveryDate}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Doit être au moins {minimumDeliveryDays} jour{minimumDeliveryDays > 1 ? 's' : ''} après la fin de la campagne
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Indiquez les heures pendant lesquelles les parents et les {terminology.participants} pourront venir à l'école ramasser leurs commandes.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="distributionStartHour" className="text-sm font-medium text-gray-700">Heure de début de distribution</Label>
                      <Select
                        value={formData.distributionStartHour || ''}
                        onValueChange={(value) => handleInputChange('distributionStartHour', value)}
                      >
                        <SelectTrigger className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                          <SelectValue placeholder="Sélectionnez une heure" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 60 }, (_, i) => {
                            const totalMinutes = (i * 15) + (7 * 60); // From 7h00 to 21h45 (15-minute intervals)
                            const hour = Math.floor(totalMinutes / 60);
                            const minutes = totalMinutes % 60;
                            const hourStr = hour < 10 ? `0${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}` : `${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}`;
                            return (
                              <SelectItem key={hourStr} value={hourStr}>
                                {hourStr}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="distributionEndHour" className="text-sm font-medium text-gray-700">Heure de fin de distribution</Label>
                      <Select
                        value={formData.distributionEndHour || ''}
                        onValueChange={(value) => handleInputChange('distributionEndHour', value)}
                      >
                        <SelectTrigger className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                          <SelectValue placeholder="Sélectionnez une heure" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 60 }, (_, i) => {
                            const totalMinutes = (i * 15) + (7 * 60); // From 7h00 to 21h45 (15-minute intervals)
                            const hour = Math.floor(totalMinutes / 60);
                            const minutes = totalMinutes % 60;
                            const hourStr = hour < 10 ? `0${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}` : `${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}`;

                            // Only show times after the start hour (at least 15 minutes later)
                            if (formData.distributionStartHour) {
                              const startMatch = formData.distributionStartHour.match(/(\d{2})h(\d{2})/);
                              if (startMatch) {
                                const startHour = parseInt(startMatch[1]);
                                const startMinutes = parseInt(startMatch[2]);
                                const startTotalMinutes = startHour * 60 + startMinutes;

                                // Only show if at least 15 minutes after start
                                if (totalMinutes <= startTotalMinutes) {
                                  return null;
                                }
                              }
                            }

                            return (
                              <SelectItem key={hourStr} value={hourStr}>
                                {hourStr}
                              </SelectItem>
                            );
                          }).filter(Boolean)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Truck Arrival Hour */}
                  <div className="mt-4">
                    <Label htmlFor="truckArrivalHour" className="text-sm font-medium text-gray-700">Heure d'arrivée du camion de livraison</Label>
                    <p className="text-xs text-gray-500 mt-1 mb-2">
                      Heure à laquelle le camion de livraison arrivera à l'école pour le déchargement des produits
                    </p>
                    <Select
                      value={formData.truckArrivalHour || ''}
                      onValueChange={(value) => handleInputChange('truckArrivalHour', value)}
                    >
                      <SelectTrigger className={`mt-1 border-2 rounded-lg focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${truckArrivalError || validationErrors.truckArrivalHour
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-blue-500'
                        }`}>
                        <SelectValue placeholder="Sélectionnez une heure" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 48 }, (_, i) => {
                          const totalMinutes = (i * 15) + (5 * 60); // From 5h00 to 20h45 (15-minute intervals)
                          const hour = Math.floor(totalMinutes / 60);
                          const minutes = totalMinutes % 60;
                          const hourStr = hour < 10 ? `0${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}` : `${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}`;

                          // Filter out times that are too close to distribution start hour
                          if (formData.distributionStartHour) {
                            const distributionMatch = formData.distributionStartHour.match(/(\d{2})h(\d{2})/);
                            if (distributionMatch) {
                              const distributionHour = parseInt(distributionMatch[1]);
                              const distributionMinutes = parseInt(distributionMatch[2]);
                              const distributionTotalMinutes = distributionHour * 60 + distributionMinutes;

                              // Only show times that are at least 15 minutes before distribution start
                              if (totalMinutes >= distributionTotalMinutes - 15) {
                                return null;
                              }
                            }
                          }

                          return (
                            <SelectItem key={hourStr} value={hourStr}>
                              {hourStr}
                            </SelectItem>
                          );
                        }).filter(Boolean)}
                      </SelectContent>
                    </Select>
                    {truckArrivalError || validationErrors.truckArrivalHour ? (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        ⚠️ {truckArrivalError || validationErrors.truckArrivalHour}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Doit être au moins 15 minutes avant le début de la distribution
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <div className={wizardCompleted ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>

          {/* Step 1: Product Prices & Profit Distribution */}
          {(!wizardCompleted || configurationStep === 1) && (
            <>
              {/* Product Prices */}
              <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2 text-purple-900">
                    <Package className="h-5 w-5" />
                    <span>Prix des Produits</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Personnalisez les prix de vente pour chaque produit. Ces prix seront utilisés lors de la vente.
                    </p>

                    {/* Profit Split Templates and Global Controls */}
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-blue-900 flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Répartition des profits - Contrôles globaux
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-700">
                          Définissez un profit total par produit et sa répartition, puis appliquez-le à tous les produits.
                        </p>

                        {/* Global Profit per Product */}
                        <div>
                          <Label htmlFor="globalProfitPerProduct" className="text-sm font-medium text-gray-700">
                            Profit total par produit ($)
                          </Label>
                          <Input
                            id="globalProfitPerProduct"
                            type="number"
                            step="0.25"
                            min="0"
                            value={globalProfitSettings.profitPerProduct}
                            onChange={(e) => handleGlobalProfitSettingsChange('profitPerProduct', e.target.value)}
                            className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </div>

                        {/* Global Profit Distribution Ratios */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-gray-700">Répartition du profit ($):</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="globalStudentCash" className="text-xs text-gray-600">
                                {terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} comptant ($)
                              </Label>
                              <Input
                                id="globalStudentCash"
                                type="number"
                                step="0.25"
                                min="0"
                                value={globalProfitSettings.studentCash}
                                onChange={(e) => handleGlobalProfitSettingsChange('studentCash', e.target.value)}
                                className="mt-1 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              />
                            </div>
                            <div>
                              <Label htmlFor="globalStudentSchoolAccount" className="text-xs text-gray-600">
                                {terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} compte {terminology.organization} ($)
                              </Label>
                              <Input
                                id="globalStudentSchoolAccount"
                                type="number"
                                step="0.25"
                                min="0"
                                value={globalProfitSettings.studentSchoolAccount}
                                onChange={(e) => handleGlobalProfitSettingsChange('studentSchoolAccount', e.target.value)}
                                className="mt-1 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              />
                            </div>
                            <div>
                              <Label htmlFor="globalSchoolProject" className="text-xs text-gray-600">
                                Projet {terminology.organizationLabel} ($)
                              </Label>
                              <Input
                                id="globalSchoolProject"
                                type="number"
                                step="0.25"
                                min="0"
                                value={globalProfitSettings.schoolProject}
                                onChange={(e) => handleGlobalProfitSettingsChange('schoolProject', e.target.value)}
                                className="mt-1 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              />
                            </div>
                            <div>
                              <Label htmlFor="globalRaffle" className="text-xs text-gray-600">
                                Tirage ($)
                              </Label>
                              <Input
                                id="globalRaffle"
                                type="number"
                                step="0.25"
                                min="0"
                                value={globalProfitSettings.raffle}
                                onChange={(e) => handleGlobalProfitSettingsChange('raffle', e.target.value)}
                                className="mt-1 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              />
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 pt-2 border-t border-blue-200">
                            Total distribué: ${((parseFloat(globalProfitSettings.studentCash) || 0) + (parseFloat(globalProfitSettings.studentSchoolAccount) || 0) + (parseFloat(globalProfitSettings.schoolProject) || 0) + (parseFloat(globalProfitSettings.raffle) || 0)).toFixed(2)}
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={applyGlobalProfitSettings}
                          className={`w-full text-white transition-all duration-300 ${settingsApplied
                            ? 'bg-green-600 hover:bg-green-700 scale-105 shadow-lg ring-4 ring-green-300 ring-opacity-50'
                            : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                          <div className="flex items-center justify-center space-x-2">
                            {settingsApplied ? (
                              <>
                                <Check className="h-5 w-5 animate-pulse" />
                                <span className="font-semibold">Appliqué avec succès!</span>
                              </>
                            ) : (
                              <span>Appliquer cette répartition à tous les produits</span>
                            )}
                          </div>
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Products List */}
                    {loadingProducts ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">Chargement des produits...</p>
                      </div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium mb-2">Aucun produit disponible</p>
                        <p className="text-sm text-gray-500">
                          {selectedSupplierId
                            ? "Ce fournisseur n'a pas encore de produits configurés."
                            : "Les produits seront chargés une fois qu'un fournisseur sera sélectionné."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {products.map((product) => {
                          // Default selling price is recommendedRetailPrice, fallback to price
                          const defaultSellingPrice = product.recommendedRetailPrice || product.price;
                          const sellingPrice = customPrices[product.id] !== undefined && customPrices[product.id] !== ''
                            ? customPrices[product.id]
                            : defaultSellingPrice;
                          // Coût d'acquisition = pricePickup * markup + deliveryCostToSchool (if supplier doesn't handle shipping)
                          // C'est le prix école qui inclut la marge dynamique et les frais de transport
                          // Use calculated delivery cost if available, otherwise fallback to stored value
                          const pricePickup = product.pricePickup || 0;
                          const deliveryCostToSchool = calculatedDeliveryCosts[product.id] || product.deliveryCostToSchool || 0;

                          // Get pricing settings from supplier (if available in product data or from selectedSupplier)
                          const pricingSettings = selectedSupplier?.pricingSettings || { markup: 5, handlesShipping: false };
                          const markupMultiplier = getMarkupMultiplier({ pricingSettings });
                          const handlesShipping = pricingSettings.handlesShipping || false;

                          // If supplier handles shipping, delivery cost should be 0 for price calculation
                          const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCostToSchool;
                          const basePrice = pricePickup * markupMultiplier;
                          const totalPrice = basePrice + effectiveDeliveryCost;

                          // Round down to nearest 5 cents for school cost
                          const acquisitionCost = roundDownToFiveCents(totalPrice);
                          // Profit = Prix de vente - Coût d'acquisition (Prix École)
                          const profit = typeof sellingPrice === 'number' ? sellingPrice - acquisitionCost : (parseFloat(sellingPrice) || 0) - acquisitionCost;

                          return (
                            <div
                              key={product.id}
                              className={`border-0 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] ${settingsApplied
                                ? 'ring-2 ring-green-400 ring-opacity-75 bg-gradient-to-br from-green-50 to-gray-50'
                                : ''
                                }`}
                            >
                              <div className="flex items-start space-x-4">
                                {/* Product Image */}
                                <div className="flex-shrink-0">
                                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.src = '/images/placeholder-product.svg';
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                  <Label htmlFor={`price-${product.id}`} className="text-sm font-semibold text-gray-900 block mb-2">
                                    {product.name}
                                  </Label>

                                  {/* Financial Info */}
                                  <div className="space-y-1 mb-3">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-500">Coût d'acquisition:</span>
                                      <span className="font-medium text-gray-700">${acquisitionCost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-500">Prix par défaut:</span>
                                      <span className="font-medium text-gray-700">
                                        ${(product.recommendedRetailPrice || product.price || 0).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-500">Profit par unité:</span>
                                      <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ${typeof profit === 'number' ? profit.toFixed(2) : (parseFloat(profit) || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Price Input */}
                                  <div className="flex items-center space-x-2">
                                    <Label htmlFor={`price-${product.id}`} className="text-xs text-gray-600 whitespace-nowrap">
                                      Prix de vente:
                                    </Label>
                                    <div className="flex-1">
                                      <Input
                                        id={`price-${product.id}`}
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        value={sellingPrice}
                                        onChange={(e) => handlePriceChange(product.id, e.target.value)}
                                        className="text-sm h-9 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                      />
                                    </div>
                                  </div>

                                  {/* Updated Profit Display */}
                                  <div className="mt-2 text-right">
                                    <span className="text-xs text-gray-500">Nouveau profit: </span>
                                    <span className={`text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ${typeof profit === 'number' ? profit.toFixed(2) : (parseFloat(profit) || 0).toFixed(2)}
                                    </span>
                                  </div>

                                  {/* Profit Distribution */}
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Répartition des profits:</h4>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Label htmlFor={`studentCash-${product.id}`} className="text-xs text-gray-600 w-20">
                                          {terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} comptant:
                                        </Label>
                                        <Input
                                          id={`studentCash-${product.id}`}
                                          type="number"
                                          step="0.25"
                                          min="0"
                                          value={profitSplits[product.id]?.studentCash ?? ''}
                                          onChange={(e) => handleProfitSplitChange(product.id, 'studentCash', e.target.value)}
                                          className="text-xs h-7 border-2 border-gray-200 rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-200 transition-all duration-200 flex-1"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Label htmlFor={`studentSchoolAccount-${product.id}`} className="text-xs text-gray-600 w-20">
                                          {terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} compte {terminology.organization}:
                                        </Label>
                                        <Input
                                          id={`studentSchoolAccount-${product.id}`}
                                          type="number"
                                          step="0.25"
                                          min="0"
                                          value={profitSplits[product.id]?.studentSchoolAccount ?? ''}
                                          onChange={(e) => handleProfitSplitChange(product.id, 'studentSchoolAccount', e.target.value)}
                                          className="text-xs h-7 border-2 border-gray-200 rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-200 transition-all duration-200 flex-1"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Label htmlFor={`school-${product.id}`} className="text-xs text-gray-600 w-16">
                                          {terminology.organizationLabel}:
                                        </Label>
                                        <Input
                                          id={`school-${product.id}`}
                                          type="number"
                                          step="0.25"
                                          min="0"
                                          value={profitSplits[product.id]?.schoolProject ?? ''}
                                          onChange={(e) => handleProfitSplitChange(product.id, 'schoolProject', e.target.value)}
                                          className="text-xs h-7 border-2 border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-200 flex-1"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Label htmlFor={`raffle-${product.id}`} className="text-xs text-gray-600 w-16">
                                          Tirage:
                                        </Label>
                                        <Input
                                          id={`raffle-${product.id}`}
                                          type="number"
                                          step="0.25"
                                          min="0"
                                          value={profitSplits[product.id]?.raffle ?? ''}
                                          onChange={(e) => handleProfitSplitChange(product.id, 'raffle', e.target.value)}
                                          className="text-xs h-7 border-2 border-gray-200 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-200 transition-all duration-200 flex-1"
                                        />
                                      </div>

                                      {/* Profit Distribution Summary */}
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        {(() => {
                                          const splits = profitSplits[product.id] || { studentCash: 1.00, studentSchoolAccount: 1.00, schoolProject: 0.75, raffle: 0.25 };
                                          const studentCashValue = splits.studentCash === '' ? 0 : Number(splits.studentCash || 0);
                                          const studentSchoolAccountValue = splits.studentSchoolAccount === '' ? 0 : Number(splits.studentSchoolAccount || 0);
                                          const schoolValue = splits.schoolProject === '' ? 0 : Number(splits.schoolProject || 0);
                                          const raffleValue = splits.raffle === '' ? 0 : Number(splits.raffle || 0);
                                          // Round to 2 decimals to avoid floating point precision issues
                                          const totalDistributed = Math.round((studentCashValue + studentSchoolAccountValue + schoolValue + raffleValue) * 100) / 100;
                                          const profitValue = Math.round(Number(profit || 0) * 100) / 100;
                                          const remaining = profitValue - totalDistributed;
                                          // Use a small epsilon (0.01) to account for rounding differences
                                          const hasError = remaining < -0.01;

                                          return (
                                            <div className="text-xs">
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Total distribué:</span>
                                                <span className="font-medium">${totalDistributed.toFixed(2)}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Reste:</span>
                                                <span className={`font-medium ${remaining >= -0.01 ? 'text-green-600' : 'text-red-600'}`}>
                                                  ${remaining.toFixed(2)}
                                                </span>
                                              </div>
                                              {hasError && (
                                                <div className="text-red-500 text-xs mt-1">
                                                  ⚠️ Vous distribuez plus que le profit disponible
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Button for Step 1 */}
              {wizardCompleted && configurationStep === 1 && (
                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => setConfigurationStep(2)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
                  >
                    Continuer vers les Dons
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Step 2: Donations Configuration */}
          {(!wizardCompleted || configurationStep === 2) && (
            <>
              {/* Student Donations Configuration */}
              <Card className="lg:col-span-2 hover:shadow-xl transition-all duration-300 border-2 border-blue-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded-t-lg text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-3 text-white">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <DollarSign className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg font-bold">Dons pour les {terminology.participantsLabel.charAt(0).toUpperCase() + terminology.participantsLabel.slice(1)}</div>
                        <div className="text-sm text-blue-100 font-normal mt-0.5">
                          Permettez aux clients de soutenir les {terminology.participants}
                        </div>
                      </div>
                    </CardTitle>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setStudentDonationsEnabled(!studentDonationsEnabled)}
                        className={`
                          inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg font-semibold text-sm
                          transition-all duration-200 ease-in-out
                          shadow-md hover:shadow-lg min-w-[100px]
                          ${studentDonationsEnabled
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }
                        `}
                        aria-label={`${studentDonationsEnabled ? 'Désactiver' : 'Activer'} les dons pour les ${terminology.participants}`}
                      >
                        <div className={`
                          w-2 h-2 rounded-full transition-all duration-200
                          ${studentDonationsEnabled ? 'bg-white' : 'bg-gray-500'}
                        `} />
                        <span>{studentDonationsEnabled ? 'Activé' : 'Désactivé'}</span>
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {!studentDonationsEnabled && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-1">Dons désactivés</p>
                      <p className="text-xs text-gray-500">Les dons pour les {terminology.participants} ne seront pas affichés au checkout.</p>
                    </div>
                  )}
                  {studentDonationsEnabled && (
                    <div className="space-y-8">
                      {/* Info Box */}
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <p className="text-sm text-blue-900">
                          <strong>💡 Comment ça fonctionne :</strong> Les clients pourront ajouter un don optionnel lors de leur commande pour soutenir les {terminology.participants} de {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization}.
                        </p>
                      </div>

                      {/* Student Donation Presets */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-semibold text-gray-800 mb-1 flex items-center space-x-2">
                            <span>Montants de dons disponibles</span>
                            <Badge variant="outline" className="text-xs">{studentDonationPresets.length} montants</Badge>
                          </h4>
                          <p className="text-xs text-gray-500 mb-3">
                            Les clients pourront choisir parmi ces montants ou entrer un montant personnalisé.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {studentDonationPresets.map((preset, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2 bg-white border-2 border-gray-200 rounded-lg p-2 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              <div className="flex items-center space-x-1">
                                <span className="text-sm font-medium text-gray-500">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={preset}
                                  onChange={(e) => handleStudentDonationPresetChange(index, e.target.value)}
                                  onBlur={handleStudentDonationPresetBlur}
                                  className="w-20 text-sm border-0 focus:ring-0 focus-visible:ring-0 p-0 h-auto font-semibold"
                                />
                              </div>
                              {studentDonationPresets.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeStudentDonationPreset(index)}
                                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 rounded-full"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {studentDonationPresets.length < 6 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addStudentDonationPreset}
                              className="h-10 px-4 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-blue-600 font-medium"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Ajouter
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Student Donation Split */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-semibold text-gray-800 mb-1">
                            Répartition des dons (en pourcentage)
                          </h4>
                          <p className="text-xs text-gray-500 mb-3">
                            Définissez comment les dons sont répartis entre le compte {terminology.organization} et le comptant pour les {terminology.participants}.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
                            <Label htmlFor="student-donation-account" className="text-sm font-semibold text-blue-900 mb-2 block">
                              {terminology.accountLabel}
                            </Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                id="student-donation-account"
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={studentDonationSplit.studentAccount ?? ''}
                                onChange={(e) => handleStudentDonationSplitChange('studentAccount', e.target.value)}
                                className="text-lg font-bold border-2 border-blue-300 focus:border-blue-500"
                              />
                              <span className="text-lg font-semibold text-blue-700">%</span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                            <Label htmlFor="student-donation-cash" className="text-sm font-semibold text-green-900 mb-2 block">
                              {terminology.cashLabel}
                            </Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                id="student-donation-cash"
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={studentDonationSplit.studentCash ?? ''}
                                onChange={(e) => handleStudentDonationSplitChange('studentCash', e.target.value)}
                                className="text-lg font-bold border-2 border-green-300 focus:border-green-500"
                              />
                              <span className="text-lg font-semibold text-green-700">%</span>
                            </div>
                          </div>
                        </div>

                        {/* Validation and Preview */}
                        {(() => {
                          const total = (studentDonationSplit.studentAccount || 0) + (studentDonationSplit.studentCash || 0);
                          const isValid = total === 100;
                          return (
                            <div className={`mt-4 p-4 rounded-lg border-2 ${isValid ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
                              }`}>
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-sm font-semibold text-gray-800">Aperçu - Don de 10$</h5>
                                <Badge variant={isValid ? "default" : "destructive"} className={isValid ? 'bg-green-500' : 'bg-amber-500'}>
                                  {isValid ? '✓ Total: 100%' : `⚠ Total: ${total}%`}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg p-3 text-center border-2 border-blue-200">
                                  <div className="text-2xl font-bold text-blue-600 mb-1">
                                    ${((10 * (studentDonationSplit.studentAccount || 0)) / 100).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-600 font-medium">{terminology.accountLabel}</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 text-center border-2 border-green-200">
                                  <div className="text-2xl font-bold text-green-600 mb-1">
                                    ${((10 * (studentDonationSplit.studentCash || 0)) / 100).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-600 font-medium">{terminology.cashLabelShort}</div>
                                </div>
                              </div>
                              {!isValid && (
                                <p className="text-xs text-amber-700 mt-3 text-center">
                                  ⚠️ La somme des pourcentages doit être égale à 100%
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* School Donations Configuration */}
              <Card className="lg:col-span-2 hover:shadow-xl transition-all duration-300 border-2 border-green-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 rounded-t-lg text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-3 text-white">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Target className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg font-bold">Dons pour {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organizationLabel}</div>
                        <div className="text-sm text-green-100 font-normal mt-0.5">
                          Permettez aux clients de soutenir {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization} et ses projets
                        </div>
                      </div>
                    </CardTitle>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setSchoolDonationsEnabled(!schoolDonationsEnabled)}
                        className={`
                          inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg font-semibold text-sm
                          transition-all duration-200 ease-in-out
                          shadow-md hover:shadow-lg min-w-[100px]
                          ${schoolDonationsEnabled
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }
                        `}
                        aria-label={`${schoolDonationsEnabled ? 'Désactiver' : 'Activer'} les dons pour ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization}`}
                      >
                        <div className={`
                          w-2 h-2 rounded-full transition-all duration-200
                          ${schoolDonationsEnabled ? 'bg-white' : 'bg-gray-500'}
                        `} />
                        <span>{schoolDonationsEnabled ? 'Activé' : 'Désactivé'}</span>
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {!schoolDonationsEnabled && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-1">Dons désactivés</p>
                      <p className="text-xs text-gray-500">Les dons pour {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization} ne seront pas affichés au checkout.</p>
                    </div>
                  )}
                  {schoolDonationsEnabled && (
                    <div className="space-y-8">
                      {/* Info Box */}
                      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                        <p className="text-sm text-green-900">
                          <strong>💡 Comment ça fonctionne :</strong> Les clients pourront ajouter un don optionnel lors de leur commande pour soutenir {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization} et financer ses projets.
                        </p>
                      </div>

                      {/* School Donation Presets */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-semibold text-gray-800 mb-1 flex items-center space-x-2">
                            <span>Montants de dons disponibles</span>
                            <Badge variant="outline" className="text-xs">{schoolDonationPresets.length} montants</Badge>
                          </h4>
                          <p className="text-xs text-gray-500 mb-3">
                            Les clients pourront choisir parmi ces montants ou entrer un montant personnalisé.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {schoolDonationPresets.map((preset, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2 bg-white border-2 border-gray-200 rounded-lg p-2 hover:border-green-400 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              <div className="flex items-center space-x-1">
                                <span className="text-sm font-medium text-gray-500">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={preset}
                                  onChange={(e) => handleSchoolDonationPresetChange(index, e.target.value)}
                                  onBlur={handleSchoolDonationPresetBlur}
                                  className="w-20 text-sm border-0 focus:ring-0 focus-visible:ring-0 p-0 h-auto font-semibold"
                                />
                              </div>
                              {schoolDonationPresets.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSchoolDonationPreset(index)}
                                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 rounded-full"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {schoolDonationPresets.length < 6 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addSchoolDonationPreset}
                              className="h-10 px-4 border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 text-green-600 font-medium"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Ajouter
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Groups Configuration */}
              <Card className="lg:col-span-2 hover:shadow-xl transition-all duration-300 border-2 border-purple-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 rounded-t-lg text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-3 text-white">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg font-bold">Gestion des Groupes</div>
                        <div className="text-sm text-purple-100 font-normal mt-0.5">
                          Organisez les {terminology.participants} en groupes pour le classement
                        </div>
                      </div>
                    </CardTitle>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setGroupsEnabled(!groupsEnabled);
                          if (!groupsEnabled) {
                            setIsEditingGroups(true);
                            if (groupsList.length === 0) {
                              setGroupsText('');
                            }
                          }
                        }}
                        className={`
                          inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg font-semibold text-sm
                          transition-all duration-200 ease-in-out
                          shadow-md hover:shadow-lg min-w-[100px]
                          ${groupsEnabled
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }
                        `}
                        aria-label={`${groupsEnabled ? 'Désactiver' : 'Activer'} les groupes`}
                      >
                        <div className={`
                          w-2 h-2 rounded-full transition-all duration-200
                          ${groupsEnabled ? 'bg-white' : 'bg-gray-500'}
                        `} />
                        <span>{groupsEnabled ? 'Activé' : 'Désactivé'}</span>
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {!groupsEnabled && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-1">Groupes désactivés</p>
                      <p className="text-xs text-gray-500">Les {terminology.participants} ne seront pas organisés en groupes pour cette campagne.</p>
                    </div>
                  )}
                  {groupsEnabled && (
                    <div className="space-y-6">
                      {/* Info Box */}
                      <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                        <p className="text-sm text-purple-900">
                          <strong>💡 Comment ça fonctionne :</strong> Les {terminology.participants} pourront choisir un groupe lors de leur adhésion à la campagne. Le classement affichera les groupes et les classements individuels par groupe.
                        </p>
                      </div>

                      {/* Reuse Groups from Another Campaign */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-gray-800">
                          Réutiliser les groupes d'une autre campagne (optionnel)
                        </Label>
                        <div className="flex gap-3">
                          <Select
                            value={selectedCampaignForReuse}
                            onValueChange={async (value) => {
                              setSelectedCampaignForReuse(value);
                              if (value) {
                                try {
                                  const response = await fetch(`/api/campaigns/${value}/groups`);
                                  if (response.ok) {
                                    const data = await response.json();
                                    if (data.groups && data.groups.enabled && data.groups.list) {
                                      const groupNames = data.groups.list
                                        .filter(g => g.name !== 'Autre')
                                        .map(g => g.name);
                                      setGroupsText(groupNames.join('\n'));
                                      setIsEditingGroups(true);
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error fetching groups:', error);
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Sélectionner une campagne..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCampaignsForReuse.map((campaign) => (
                                <SelectItem key={campaign._id} value={campaign._id}>
                                  {campaign.name || campaign.campaignCode}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Groups Input/Display */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold text-gray-800">
                            Groupes ({groupsList.length} configuré{groupsList.length !== 1 ? 's' : ''})
                          </Label>
                          {!isEditingGroups && groupsList.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsEditingGroups(true)}
                              className="text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Modifier
                            </Button>
                          )}
                        </div>

                        {isEditingGroups ? (
                          <div className="space-y-3">
                            <Textarea
                              value={groupsText}
                              onChange={(e) => setGroupsText(e.target.value)}
                              placeholder="Écrivez un nom de groupe par ligne&#10;Exemple:&#10;Groupe A&#10;Groupe B&#10;Groupe C"
                              className="min-h-[120px] font-mono text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={() => {
                                  const lines = groupsText.split('\n')
                                    .map(line => line.trim())
                                    .filter(line => line.length > 0);
                                  const uniqueLines = [...new Set(lines)];
                                  // Ensure "Autre" is included
                                  if (!uniqueLines.includes('Autre')) {
                                    uniqueLines.push('Autre');
                                  }
                                  setGroupsList(uniqueLines);
                                  setIsEditingGroups(false);
                                }}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                Enregistrer
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsEditingGroups(false);
                                  setGroupsText(groupsList.join('\n'));
                                }}
                              >
                                Annuler
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                              Note: Le groupe "Autre" sera automatiquement ajouté et ne peut pas être supprimé.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {groupsList.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {groupsList.map((groupName, index) => (
                                  <Badge
                                    key={index}
                                    variant={groupName === 'Autre' ? 'default' : 'outline'}
                                    className={`px-3 py-1 ${groupName === 'Autre'
                                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                                      : 'bg-white text-gray-700 border-gray-300'
                                      }`}
                                  >
                                    {groupName}
                                    {groupName === 'Autre' && (
                                      <span className="ml-1 text-xs">(automatique)</span>
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                Aucun groupe configuré. Cliquez sur "Modifier" pour ajouter des groupes.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation Buttons for Step 2 */}
              {wizardCompleted && configurationStep === 2 && (
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    onClick={() => setConfigurationStep(1)}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour aux Produits
                  </Button>
                </div>
              )}
            </>
          )}

        </div>

        {/* Submit Button - Only show on step 2 or if wizard not completed */}
        {(!wizardCompleted || configurationStep === 2) && (
          <div className="flex justify-center pt-6 sm:pt-8">
            <Button
              type="submit"
              disabled={creating}
              onClick={(e) => {
                console.log('Button clicked!', e);
              }}
              className={`
              relative px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl
              bg-gradient-to-r from-blue-600 to-blue-700 
              hover:from-blue-700 hover:to-blue-800
              text-white shadow-lg hover:shadow-xl
              transform transition-all duration-200 ease-in-out
              hover:scale-105 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              disabled:hover:scale-100 disabled:hover:shadow-lg
              w-full sm:w-auto sm:min-w-[180px] lg:min-w-[200px]
              ${creating ? 'animate-pulse' : ''}
            `}
            >
              <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                {creating ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm sm:text-base">Création en cours...</span>
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Créer la Campagne</span>
                  </>
                )}
              </div>

              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 hover:opacity-20 transition-opacity duration-200 pointer-events-none"></div>
            </Button>
          </div>
        )}
      </form>

      {/* Parent Letter Modal */}
      <ParentLetterModal
        isOpen={showParentLetterModal}
        onClose={() => setShowParentLetterModal(false)}
        campaign={createdCampaign}
        school={school}
      />
    </div>
  );
};

export default CampaignCreator;
