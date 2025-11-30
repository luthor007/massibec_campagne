import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import {
  Edit3,
  Save,
  X,
  Lock,
  DollarSign,
  Calendar,
  Package,
  Target,
  AlertCircle,
  Building2,
  Settings,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  Info,
  Users,
  Edit,
  StopCircle
} from 'lucide-react';
import { getMarkupMultiplier, roundDownToFiveCents } from '@/utils/supplierPricing';
import { toast } from 'react-toastify';
import { getTerminology } from '@/utils/organizationHelpers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ChatModal from '../Messaging/ChatModal';

const CampaignEditor = ({ campaign, onUpdate, loading, school }) => {
  // Get terminology based on organization type
  const organizationType = school?.organizationType || campaign?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    deliveryDate: '',
    financialGoal: '',
    distributionStartHour: '',
    distributionEndHour: ''
  });
  const [products, setProducts] = useState([]);
  const [customPrices, setCustomPrices] = useState({});
  const [profitSplits, setProfitSplits] = useState({});

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

  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [minimumDeliveryDays, setMinimumDeliveryDays] = useState(21); // Default to 21 days
  const [showChatModal, setShowChatModal] = useState(false);
  const [isTogglingMode, setIsTogglingMode] = useState(false);
  const { data: session } = useSession();

  // Expandable sections state - all closed by default for cleaner UI
  const [expandedSections, setExpandedSections] = useState({
    name: false,
    dates: false,
    financial: false,
    products: false,
    donations: false,
    groups: false,
    profit: false
  });

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use refs to ensure we always have the latest values when auto-saving
  const formDataRef = useRef(formData);
  const customPricesRef = useRef(customPrices);
  const profitSplitsRef = useRef(profitSplits);
  const studentDonationsEnabledRef = useRef(studentDonationsEnabled);
  const studentDonationPresetsRef = useRef(studentDonationPresets);
  const studentDonationSplitRef = useRef(studentDonationSplit);
  const schoolDonationsEnabledRef = useRef(schoolDonationsEnabled);
  const schoolDonationPresetsRef = useRef(schoolDonationPresets);

  // Keep refs in sync with state
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    customPricesRef.current = customPrices;
  }, [customPrices]);

  useEffect(() => {
    profitSplitsRef.current = profitSplits;
  }, [profitSplits]);

  useEffect(() => {
    studentDonationsEnabledRef.current = studentDonationsEnabled;
  }, [studentDonationsEnabled]);

  useEffect(() => {
    studentDonationPresetsRef.current = studentDonationPresets;
  }, [studentDonationPresets]);

  useEffect(() => {
    studentDonationSplitRef.current = studentDonationSplit;
  }, [studentDonationSplit]);

  useEffect(() => {
    schoolDonationsEnabledRef.current = schoolDonationsEnabled;
  }, [schoolDonationsEnabled]);

  const groupsEnabledRef = useRef(groupsEnabled);
  const groupsListRef = useRef(groupsList);

  useEffect(() => {
    groupsEnabledRef.current = groupsEnabled;
  }, [groupsEnabled]);

  useEffect(() => {
    groupsListRef.current = groupsList;
  }, [groupsList]);

  useEffect(() => {
    schoolDonationPresetsRef.current = schoolDonationPresets;
  }, [schoolDonationPresets]);

  // Global profit settings - will be initialized after campaign data is loaded
  const [globalProfitSettings, setGlobalProfitSettings] = useState({
    profitPerProduct: 3.00,
    studentCash: 1.00,
    studentSchoolAccount: 1.00,
    schoolProject: 0.75,
    raffle: 0.25
  });

  // Initialize global profit settings from campaign or localStorage
  useEffect(() => {
    if (campaign?.profitSplits && campaign.profitSplits.length > 0) {
      // Try to infer global settings from campaign profit splits
      const firstSplit = campaign.profitSplits[0];
      const allSame = campaign.profitSplits.every(ps =>
        ps.studentCash === firstSplit.studentCash &&
        ps.studentSchoolAccount === firstSplit.studentSchoolAccount &&
        ps.schoolProject === firstSplit.schoolProject &&
        ps.raffle === firstSplit.raffle
      );

      if (allSame && products.length > 0) {
        // All products have the same splits - likely from global controls
        // Calculate average profit per product from custom prices
        let totalProfit = 0;
        let productCount = 0;

        products.forEach(product => {
          const campaignPrice = campaign?.customPrices?.find(cp => {
            const cpProductId = cp.productId?._id?.toString() || cp.productId?.toString();
            return cpProductId === product.id;
          })?.price;

          if (campaignPrice !== undefined) {
            // IMPORTANT: product.cost or product.acquisitionCost is the ROUNDED price (source of truth)
            // Use acquisitionCost if available (preferred), otherwise use cost
            const schoolPrice = product.acquisitionCost || product.cost || 0;
            const profit = campaignPrice - schoolPrice;
            totalProfit += profit;
            productCount++;
          }
        });

        // Round to 2 decimals to avoid floating point precision issues
        const avgProfit = productCount > 0 ? Math.round((totalProfit / productCount) * 100) / 100 : 0;

        // Use inferred settings from campaign
        const inferredSettings = {
          profitPerProduct: Math.round((avgProfit || 3.00) * 100) / 100,
          studentCash: firstSplit.studentCash !== undefined && firstSplit.studentCash !== null ? Math.round(Number(firstSplit.studentCash) * 100) / 100 : 1.00,
          studentSchoolAccount: firstSplit.studentSchoolAccount !== undefined && firstSplit.studentSchoolAccount !== null ? Math.round(Number(firstSplit.studentSchoolAccount) * 100) / 100 : 1.00,
          schoolProject: firstSplit.schoolProject !== undefined && firstSplit.schoolProject !== null ? Math.round(Number(firstSplit.schoolProject) * 100) / 100 : 0.75,
          raffle: firstSplit.raffle !== undefined && firstSplit.raffle !== null ? Math.round(Number(firstSplit.raffle) * 100) / 100 : 0.25
        };

        setGlobalProfitSettings(inferredSettings);

        // Also save to localStorage for future use
        if (typeof window !== 'undefined') {
          localStorage.setItem('globalProfitSettings', JSON.stringify(inferredSettings));
        }
        return;
      }
    }

    // If no campaign data to infer from, load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('globalProfitSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setGlobalProfitSettings({
            profitPerProduct: parsed.profitPerProduct || 3.00,
            studentCash: parsed.studentCash !== undefined ? parsed.studentCash : 1.00,
            studentSchoolAccount: parsed.studentSchoolAccount !== undefined ? parsed.studentSchoolAccount : 1.00,
            schoolProject: parsed.schoolProject !== undefined ? parsed.schoolProject : 0.75,
            raffle: parsed.raffle !== undefined ? parsed.raffle : 0.25
          });
          return;
        } catch (e) {
          console.error('Error parsing saved globalProfitSettings:', e);
        }
      }
    }
  }, [campaign?.profitSplits, campaign?.customPrices, products]);

  // Load products and initialize form data
  useEffect(() => {
    // Don't proceed if campaign is not loaded yet
    if (!campaign) {
      console.log('[CampaignEditor] Campaign not loaded yet, skipping product fetch');
      return;
    }

    console.log('[CampaignEditor] Loading products for campaign:', {
      campaignId: campaign._id || campaign.id,
      profitSplitsCount: campaign.profitSplits?.length || 0,
      hasProfitSplits: !!campaign.profitSplits,
      profitSplitsSample: campaign.profitSplits?.slice(0, 2)
    });

    const fetchProducts = async () => {
      try {
        const params = new URLSearchParams({ limit: '500' });
        const campaignIdValue = campaign?._id || campaign?.id;
        if (campaignIdValue) {
          params.set('campaignId', campaignIdValue.toString());
        }
        const supplierIdValue = campaign?.supplier?._id || campaign?.supplier || campaign?.supplierId;
        if (supplierIdValue) {
          params.set('supplierId', supplierIdValue.toString());
        }
        const response = await fetch(`/api/products?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          const productsData = data.products || [];
          setProducts(productsData);

          console.log('[CampaignEditor] Products loaded:', {
            productsCount: productsData.length,
            firstProductId: productsData[0]?.id || productsData[0]?._id?.toString(),
            firstProductIdType: typeof (productsData[0]?.id || productsData[0]?._id)
          });

          // Initialize custom prices and profit splits
          const initialPrices = {};
          const initialProfitSplits = {};

          productsData.forEach(product => {
            // Get product ID - handle both id and _id formats
            // For bundles, the id might be BUNDLE-XXXXXX, but we need the actual _id for matching
            let productId = product.id || product._id?.toString() || product._id;

            // If it's a bundle with BUNDLE- prefix, extract the actual _id
            // The API returns productId as BUNDLE-XXXXXX, but we need the full _id for matching
            if (product.isBundle && typeof productId === 'string' && productId.startsWith('BUNDLE-')) {
              // Try to get the actual _id from the product object
              productId = product._id?.toString() || product.id;
            }

            const productIdStr = productId?.toString();

            // Debug: Log bundle IDs to help diagnose
            if (product.isBundle) {
              console.log(`[CampaignEditor] Bundle found: ${product.name}, productId: ${productId}, productIdStr: ${productIdStr}, product.id: ${product.id}, product._id: ${product._id?.toString()}`);
            }

            // Use campaign custom prices if available, otherwise default prices
            // Handle multiple formats: populated object, ObjectId, or string
            const campaignPrice = campaign?.customPrices?.find(cp => {
              if (!cp.productId) return false;

              // Try multiple ways to extract the productId
              let cpProductId = null;
              if (cp.productId._id) {
                // Populated reference (nested _id)
                cpProductId = cp.productId._id.toString();
              } else if (cp.productId.toString && typeof cp.productId.toString === 'function') {
                // ObjectId instance or populated object
                cpProductId = cp.productId.toString();
              } else if (typeof cp.productId === 'string') {
                // Already a string
                cpProductId = cp.productId;
              } else {
                // Try to convert anyway
                try {
                  cpProductId = String(cp.productId);
                } catch (e) {
                  return false;
                }
              }

              return cpProductId === productIdStr;
            })?.price;
            // Use recommendedRetailPrice as default selling price (Prix école), fallback to price if not available
            // This matches the behavior in CampaignCreator.jsx
            initialPrices[productIdStr] = campaignPrice || product.recommendedRetailPrice || product.price;

            // Use campaign profit splits if available, otherwise defaults
            // Handle multiple formats: populated object, ObjectId, or string
            // First try to match by ID, then by product name as fallback
            let campaignSplit = campaign?.profitSplits?.find(ps => {
              if (!ps.productId) {
                return false;
              }

              // Try multiple ways to extract the productId
              let psProductId = null;

              // First check if it's a populated object (has _id property)
              if (ps.productId._id) {
                // Populated reference (nested _id) - this is the most common case
                psProductId = ps.productId._id.toString();
              } else if (ps.productId.toString && typeof ps.productId.toString === 'function') {
                // ObjectId instance (not populated) - call toString() directly
                psProductId = ps.productId.toString();
              } else if (typeof ps.productId === 'string') {
                // Already a string
                psProductId = ps.productId;
              } else if (ps.productId && typeof ps.productId === 'object') {
                // Try to get _id from the object directly (in case it's a plain object)
                if (ps.productId._id) {
                  psProductId = ps.productId._id.toString();
                } else {
                  // Last resort: try to convert to string
                  try {
                    psProductId = String(ps.productId);
                  } catch (e) {
                    return false;
                  }
                }
              } else {
                // Try to convert anyway
                try {
                  psProductId = String(ps.productId);
                } catch (e) {
                  return false;
                }
              }

              // For bundles, also check if the productId matches the bundle's _id
              // (bundles might not be populated correctly since they're not in Product collection)
              if (product.isBundle) {
                // Check if psProductId matches the bundle's _id (full or partial)
                const bundleId = product._id?.toString() || product.id;
                if (bundleId && psProductId === bundleId) {
                  return true;
                }
                // Also check if it matches the last 6 characters (BUNDLE-XXXXXX format)
                if (bundleId && psProductId === bundleId.slice(-6)) {
                  return true;
                }
              }

              return psProductId === productIdStr;
            });

            // If no match by ID, try to match by product name (fallback for when IDs don't match)
            if (!campaignSplit && campaign?.profitSplits?.length > 0 && product.name) {
              campaignSplit = campaign.profitSplits.find(ps => {
                if (!ps.productId) return false;

                // Get product name from populated productId or from the product itself
                let psProductName = null;
                if (ps.productId && typeof ps.productId === 'object') {
                  // If populated, it should have a name property
                  psProductName = ps.productId.name;
                }

                // Match by name (case-insensitive, trimmed)
                if (psProductName) {
                  return psProductName.trim().toLowerCase() === product.name.trim().toLowerCase();
                }

                return false;
              });

              if (campaignSplit) {
                console.log('[CampaignEditor] Matched profit split by product name (ID mismatch):', {
                  productName: product.name,
                  productId: productIdStr,
                  matchedSplitProductId: campaignSplit.productId?._id?.toString() || campaignSplit.productId?.toString()
                });
              }
            }

            // Enhanced logging to debug ID matching issues
            const allCampaignSplitsDebug = campaign?.profitSplits?.map(ps => {
              let pid = null;
              if (ps.productId?._id) {
                pid = ps.productId._id.toString();
              } else if (ps.productId?.toString && typeof ps.productId.toString === 'function') {
                pid = ps.productId.toString();
              } else if (typeof ps.productId === 'string') {
                pid = ps.productId;
              } else {
                try {
                  pid = String(ps.productId);
                } catch (e) {
                  pid = 'ERROR';
                }
              }
              return {
                productId: pid,
                productIdType: typeof ps.productId,
                productIdRaw: ps.productId,
                studentCash: ps.studentCash,
                matches: pid === productIdStr
              };
            }) || [];

            console.log('Loading profit split for product:', {
              productId: productIdStr,
              productName: product.name,
              productIdType: typeof productIdStr,
              productIdRaw: productId,
              campaignSplit: campaignSplit ? {
                studentCash: campaignSplit.studentCash,
                studentSchoolAccount: campaignSplit.studentSchoolAccount,
                schoolProject: campaignSplit.schoolProject,
                raffle: campaignSplit.raffle,
                productIdType: typeof campaignSplit.productId,
                productIdValue: campaignSplit.productId?._id?.toString() || campaignSplit.productId?.toString() || campaignSplit.productId
              } : 'not found',
              allCampaignSplits: allCampaignSplitsDebug,
              campaignProfitSplitsLength: campaign?.profitSplits?.length || 0
            });
            // Preserve actual values from campaign, including 0
            // If campaignSplit exists, use the actual values or 0 if not set
            // If campaignSplit doesn't exist, use defaults (new product)
            if (campaignSplit) {
              // Campaign split exists - preserve exact values including 0
              initialProfitSplits[productIdStr] = {
                studentCash: campaignSplit.studentCash !== undefined && campaignSplit.studentCash !== null ? Number(campaignSplit.studentCash) : 0,
                studentSchoolAccount: campaignSplit.studentSchoolAccount !== undefined && campaignSplit.studentSchoolAccount !== null ? Number(campaignSplit.studentSchoolAccount) : 0,
                schoolProject: campaignSplit.schoolProject !== undefined && campaignSplit.schoolProject !== null ? Number(campaignSplit.schoolProject) : 0,
                raffle: campaignSplit.raffle !== undefined && campaignSplit.raffle !== null ? Number(campaignSplit.raffle) : 0
              };
            } else {
              // No campaign split - use defaults for new products
              initialProfitSplits[productIdStr] = {
                studentCash: 1.00,
                studentSchoolAccount: 1.00,
                schoolProject: 0.75,
                raffle: 0.25
              };
            }
          });

          setCustomPrices(initialPrices);
          setProfitSplits(initialProfitSplits);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Erreur lors du chargement des produits');
      }
    };

    if (campaign) {
      fetchProducts();
    }
  }, [campaign, campaign?._id, campaign?.profitSplits]); // Re-run when campaign or profitSplits change

  // Load supplier delivery settings to get minimumDeliveryDays
  useEffect(() => {
    const fetchSupplierSettings = async () => {
      const supplierId = campaign?.supplier?._id || campaign?.supplier || campaign?.supplierId;
      if (!supplierId) {
        setMinimumDeliveryDays(21); // Default to 21 days if no supplier
        return;
      }

      try {
        const response = await fetch(`/api/suppliers?id=${supplierId.toString()}`);
        if (response.ok) {
          const data = await response.json();
          const supplier = data.supplier || null;

          // Get minimumDeliveryDays from supplier's delivery settings
          if (supplier?.deliverySettings?.minimumDeliveryDays) {
            setMinimumDeliveryDays(supplier.deliverySettings.minimumDeliveryDays);
          } else if (supplier?.minimumDeliveryDays) {
            // Fallback to direct field
            setMinimumDeliveryDays(supplier.minimumDeliveryDays);
          } else {
            // Default to 21 days if not set
            setMinimumDeliveryDays(21);
          }
        }
      } catch (error) {
        console.error('[CampaignEditor] Error fetching supplier settings:', error);
        setMinimumDeliveryDays(21); // Default to 21 days on error
      }
    };

    if (campaign) {
      fetchSupplierSettings();
    }
  }, [campaign?.supplier, campaign?.supplierId]);

  // Auto-open chat with supplier when campaign is loaded
  useEffect(() => {
    if (campaign && school && session?.user?.role === 'school_manager') {
      const supplierId = campaign?.supplier?._id || campaign?.supplier || campaign?.supplierId;
      if (supplierId) {
        // Open chat modal automatically with the supplier
        setShowChatModal(true);
      }
    }
  }, [campaign?._id, campaign?.supplier, school?._id, session?.user?.role]);

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
        deliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString().split('T')[0] : '',
        financialGoal: campaign.financialGoal || '',
        distributionStartHour: campaign.distributionStartHour || '',
        distributionEndHour: campaign.distributionEndHour || ''
      });

      // Initialize student donation configuration
      setStudentDonationsEnabled(campaign.donationsForStudents?.enabled ?? true);
      setStudentDonationPresets(campaign.donationsForStudents?.presets || [0, 5, 10, 20]);
      setStudentDonationSplit(campaign.donationsForStudents?.splitConfig || {
        studentAccount: 0.0,
        studentCash: 100.0
      });

      // Initialize school donation configuration
      setSchoolDonationsEnabled(campaign.donationsForSchool?.enabled ?? true);
      setSchoolDonationPresets(campaign.donationsForSchool?.presets || [0, 5, 10, 20]);

      // Initialize groups configuration
      setGroupsEnabled(campaign.groups?.enabled ?? false);
      if (campaign.groups?.enabled && campaign.groups?.list) {
        const groupNames = campaign.groups.list
          .filter(g => g.name !== 'Autre')
          .map(g => g.name);
        setGroupsList(groupNames);
        setGroupsText(groupNames.join('\n'));
      } else {
        setGroupsList([]);
        setGroupsText('');
      }
    }
  }, [campaign]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handlePriceChange = (productId, price) => {
    const parsedPrice = parseFloat(price);
    console.log(`[CampaignEditor] handlePriceChange - productId: ${productId}, input: "${price}", parsed: ${parsedPrice}`);
    setCustomPrices(prev => {
      const updated = {
        ...prev,
        [productId]: price === '' ? '' : (price === '-' ? '-' : (isNaN(parsedPrice) ? '' : price))
      };
      console.log(`[CampaignEditor] Updated customPrices for ${productId}:`, updated[productId]);
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  const handleProfitSplitChange = (productId, type, value) => {
    setProfitSplits(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [type]: value === '' ? '' : (value === '-' ? '-' : (isNaN(parseFloat(value)) ? '' : value))
      }
    }));
    setHasUnsavedChanges(true);
  };

  // Handle global profit settings changes
  const handleGlobalProfitSettingsChange = (field, value) => {
    setGlobalProfitSettings(prev => {
      let processedValue = value;

      // If it's a valid number, round to 2 decimals
      if (value !== '' && value !== '-' && !isNaN(parseFloat(value))) {
        const numValue = parseFloat(value);
        processedValue = Math.round(numValue * 100) / 100;
      } else if (value === '' || value === '-') {
        processedValue = value;
      } else {
        processedValue = '';
      }

      const updated = {
        ...prev,
        [field]: processedValue
      };

      // Save to localStorage whenever it changes (only if valid number)
      if (typeof window !== 'undefined' && processedValue !== '' && processedValue !== '-' && !isNaN(parseFloat(processedValue))) {
        const numValue = typeof processedValue === 'number' ? processedValue : parseFloat(processedValue);
        localStorage.setItem('globalProfitSettings', JSON.stringify({
          ...prev,
          [field]: numValue
        }));
      }
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Apply global profit settings to all products
  const applyGlobalProfitSettings = () => {
    const newCustomPrices = { ...customPrices };
    const newProfitSplits = { ...profitSplits };

    products.forEach(product => {
      // Get product ID - handle both id and _id formats (same as in fetchProducts)
      const productId = product.id || product._id?.toString() || product._id;
      const productIdStr = productId?.toString();

      const desiredProfit = parseFloat(globalProfitSettings.profitPerProduct) || 0;
      const sellingPrice = (product.cost || 0) + desiredProfit;

      // Update custom price
      newCustomPrices[productIdStr] = parseFloat(sellingPrice.toFixed(2));

      // Use absolute values from global settings, converting empty strings to numbers
      newProfitSplits[productIdStr] = {
        studentCash: parseFloat(globalProfitSettings.studentCash) || 0,
        studentSchoolAccount: parseFloat(globalProfitSettings.studentSchoolAccount) || 0,
        schoolProject: parseFloat(globalProfitSettings.schoolProject) || 0,
        raffle: parseFloat(globalProfitSettings.raffle) || 0
      };
    });

    setCustomPrices(newCustomPrices);
    setProfitSplits(newProfitSplits);
    setHasUnsavedChanges(true);

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

    toast.success('Répartition des profits appliquée à tous les produits');
  };

  // Student donation handlers
  const handleStudentDonationPresetChange = (index, value) => {
    const newPresets = [...studentDonationPresets];
    newPresets[index] = value === '' ? '' : (value === '-' ? '-' : (isNaN(parseFloat(value)) ? '' : value));
    setStudentDonationPresets(newPresets);
    setHasUnsavedChanges(true);
  };

  const addStudentDonationPreset = () => {
    if (studentDonationPresets.length < 6) {
      setStudentDonationPresets([...studentDonationPresets, 0]);
      setHasUnsavedChanges(true);
    }
  };

  const removeStudentDonationPreset = (index) => {
    if (studentDonationPresets.length > 2) {
      const newPresets = studentDonationPresets.filter((_, i) => i !== index);
      setStudentDonationPresets(newPresets);
      setHasUnsavedChanges(true);
    }
  };

  const handleStudentDonationSplitChange = (type, value) => {
    setStudentDonationSplit(prev => ({
      ...prev,
      [type]: value === '' ? '' : (value === '-' ? '-' : (isNaN(parseFloat(value)) ? '' : value))
    }));
    setHasUnsavedChanges(true);
  };

  // School donation handlers
  const handleSchoolDonationPresetChange = (index, value) => {
    const newPresets = [...schoolDonationPresets];
    newPresets[index] = value === '' ? '' : (value === '-' ? '-' : (isNaN(parseFloat(value)) ? '' : value));
    setSchoolDonationPresets(newPresets);
    setHasUnsavedChanges(true);
  };

  const addSchoolDonationPreset = () => {
    if (schoolDonationPresets.length < 6) {
      setSchoolDonationPresets([...schoolDonationPresets, 0]);
      setHasUnsavedChanges(true);
    }
  };

  const removeSchoolDonationPreset = (index) => {
    if (schoolDonationPresets.length > 2) {
      const newPresets = schoolDonationPresets.filter((_, i) => i !== index);
      setSchoolDonationPresets(newPresets);
      setHasUnsavedChanges(true);
    }
  };

  // Helper functions for date min attributes
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMinDeliveryDate = () => {
    if (!formData.endDate) {
      return getTodayDateString();
    }
    const endDate = new Date(formData.endDate + 'T00:00:00');
    // Use supplier's minimumDeliveryDays instead of hardcoded 21 days
    const minimumDeliveryDaysInMillis = minimumDeliveryDays * 24 * 60 * 60 * 1000;
    const minDeliveryDate = new Date(endDate.getTime() + minimumDeliveryDaysInMillis);
    const year = minDeliveryDate.getFullYear();
    const month = String(minDeliveryDate.getMonth() + 1).padStart(2, '0');
    const day = String(minDeliveryDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const validateForm = () => {
    const { startDate, endDate, deliveryDate, financialGoal } = formData;

    if (!startDate || !endDate || !deliveryDate || !financialGoal) {
      toast.error('Tous les champs sont requis');
      return false;
    }

    // Parse dates as local dates (YYYY-MM-DD format) to avoid timezone issues
    const parseLocalDate = (dateString) => {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    };

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    const delivery = parseLocalDate(deliveryDate);

    // Normalize times for comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    delivery.setHours(0, 0, 0, 0);

    if (end <= start) {
      toast.error('La date de fin doit être après la date de début');
      return false;
    }

    // Use supplier's minimumDeliveryDays instead of hardcoded 21 days
    const minimumDeliveryDaysInMillis = minimumDeliveryDays * 24 * 60 * 60 * 1000;
    const timeDiff = delivery.getTime() - end.getTime();
    if (timeDiff < minimumDeliveryDaysInMillis) {
      const daysDiff = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));
      toast.error(`La date de livraison doit être au moins ${minimumDeliveryDays} jour${minimumDeliveryDays > 1 ? 's' : ''} après la fin de la campagne (selon les paramètres du fournisseur). Actuellement: ${daysDiff} jour${daysDiff > 1 ? 's' : ''}.`);
      return false;
    }

    if (parseFloat(financialGoal) <= 0) {
      toast.error('L\'objectif financier doit être supérieur à 0');
      return false;
    }

    // Validate distribution hours if provided
    if (formData.distributionStartHour && formData.distributionEndHour) {
      const startMatch = formData.distributionStartHour.match(/(\d{2})h(\d{2})/);
      const endMatch = formData.distributionEndHour.match(/(\d{2})h(\d{2})/);

      if (startMatch && endMatch) {
        const startMinutes = parseInt(startMatch[1]) * 60 + parseInt(startMatch[2]);
        const endMinutes = parseInt(endMatch[1]) * 60 + parseInt(endMatch[2]);

        if (endMinutes <= startMinutes) {
          toast.error('L\'heure de fin doit être après l\'heure de début');
          return false;
        }
      }
    }

    // Note: Profit split validation removed - using absolute values now, no need to validate against profit

    console.log('All validations passed!');
    return true;
  };

  const handleSave = async (silent = false, useRefs = false) => {
    // Use refs for auto-save to ensure we have the latest values
    const currentFormData = useRefs ? formDataRef.current : formData;
    const currentCustomPrices = useRefs ? customPricesRef.current : customPrices;
    const currentProfitSplits = useRefs ? profitSplitsRef.current : profitSplits;
    const currentStudentDonationsEnabled = useRefs ? studentDonationsEnabledRef.current : studentDonationsEnabled;
    const currentStudentDonationPresets = useRefs ? studentDonationPresetsRef.current : studentDonationPresets;
    const currentStudentDonationSplit = useRefs ? studentDonationSplitRef.current : studentDonationSplit;
    const currentSchoolDonationsEnabled = useRefs ? schoolDonationsEnabledRef.current : schoolDonationsEnabled;
    const currentSchoolDonationPresets = useRefs ? schoolDonationPresetsRef.current : schoolDonationPresets;

    console.log('handleSave called', { silent, useRefs });
    console.log('Form data:', currentFormData);
    console.log('Campaign ID:', campaign?._id);

    // Validate using current form data
    const validateFormData = () => {
      const { startDate, endDate, deliveryDate, financialGoal } = currentFormData;

      if (!startDate || !endDate || !deliveryDate || !financialGoal) {
        return false;
      }

      const parseLocalDate = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      };

      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      const delivery = parseLocalDate(deliveryDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      delivery.setHours(0, 0, 0, 0);

      if (end <= start) {
        return false;
      }

      const minimumDeliveryDaysInMillis = minimumDeliveryDays * 24 * 60 * 60 * 1000;
      const timeDiff = delivery.getTime() - end.getTime();
      if (timeDiff < minimumDeliveryDaysInMillis) {
        return false;
      }

      if (parseFloat(financialGoal) <= 0) {
        return false;
      }

      if (currentFormData.distributionStartHour && currentFormData.distributionEndHour) {
        const startMatch = currentFormData.distributionStartHour.match(/(\d{2})h(\d{2})/);
        const endMatch = currentFormData.distributionEndHour.match(/(\d{2})h(\d{2})/);

        if (startMatch && endMatch) {
          const startMinutes = parseInt(startMatch[1]) * 60 + parseInt(startMatch[2]);
          const endMinutes = parseInt(endMatch[1]) * 60 + parseInt(endMatch[2]);

          if (endMinutes <= startMinutes) {
            return false;
          }
        }
      }

      return true;
    };

    if (!validateFormData()) {
      console.log('Validation failed');
      if (!silent) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
      return;
    }

    console.log('Validation passed, starting save...');
    setSaving(true);
    if (!silent) {
      setSaveStatus('saving');
    }

    try {
      const updateData = {
        name: currentFormData.name || undefined,
        startDate: currentFormData.startDate,
        endDate: currentFormData.endDate,
        deliveryDate: currentFormData.deliveryDate,
        distributionStartHour: currentFormData.distributionStartHour,
        distributionEndHour: currentFormData.distributionEndHour,
        financialGoal: currentFormData.financialGoal === '' || isNaN(parseFloat(currentFormData.financialGoal))
          ? 0
          : parseFloat(currentFormData.financialGoal),
        customPrices: Object.entries(currentCustomPrices).map(([productId, price]) => {
          const parsedPrice = parseFloat(price);
          if (isNaN(parsedPrice) || price === '') {
            // If empty, use default product price (recommendedRetailPrice or price)
            const product = products.find(p => p.id === productId);
            return {
              productId,
              price: product ? (product.recommendedRetailPrice || product.price || 0) : 0
            };
          }
          console.log(`[CampaignEditor] Sending custom price for product ${productId}: ${parsedPrice}`);
          return {
            productId,
            price: parsedPrice
          };
        }),
        profitSplits: Object.entries(currentProfitSplits).map(([productId, splits]) => {
          // Parse values, converting empty strings to 0
          const parseValue = (value, defaultValue = 0) => {
            if (value === '' || value === null || value === undefined) {
              return defaultValue;
            }
            const parsed = parseFloat(value);
            return isNaN(parsed) ? defaultValue : parsed;
          };

          return {
            productId,
            studentCash: parseValue(splits.studentCash, 0),
            studentSchoolAccount: parseValue(splits.studentSchoolAccount, 0),
            schoolProject: parseValue(splits.schoolProject, 0),
            raffle: parseValue(splits.raffle, 0)
          };
        }),
        donationsForStudents: {
          enabled: currentStudentDonationsEnabled,
          presets: currentStudentDonationPresets.map(p => p === '' || isNaN(parseFloat(p)) ? 0 : parseFloat(p)),
          splitConfig: {
            studentAccount: currentStudentDonationSplit.studentAccount === '' || isNaN(parseFloat(currentStudentDonationSplit.studentAccount))
              ? 0.0
              : parseFloat(currentStudentDonationSplit.studentAccount),
            studentCash: currentStudentDonationSplit.studentCash === '' || isNaN(parseFloat(currentStudentDonationSplit.studentCash))
              ? 100.0
              : parseFloat(currentStudentDonationSplit.studentCash)
          }
        },
        donationsForSchool: {
          enabled: currentSchoolDonationsEnabled,
          presets: currentSchoolDonationPresets.map(p => p === '' || isNaN(parseFloat(p)) ? 0 : parseFloat(p))
        },
        groups: {
          enabled: groupsEnabledRef.current,
          list: groupsListRef.current.map((name, index) => ({
            name: name.trim(),
            order: index
          })).filter(g => g.name.length > 0)
        }
      };

      console.log('Updating campaign:', campaign._id);
      console.log('[CampaignEditor] Current customPrices state:', customPrices);
      console.log('[CampaignEditor] Update data:', JSON.stringify(updateData, null, 2));

      // Debug: Check if bundle custom prices are included
      const bundleCustomPrices = updateData.customPrices.filter(cp => {
        const product = products.find(p => {
          const pId = p.id || p._id?.toString();
          return pId === cp.productId && p.isBundle;
        });
        return !!product;
      });
      if (bundleCustomPrices.length > 0) {
        console.log('[CampaignEditor] ✓ Bundle custom prices being saved:', bundleCustomPrices);
      } else {
        console.log('[CampaignEditor] ⚠ No bundle custom prices found in update data');
        const bundles = products.filter(p => p.isBundle);
        console.log('[CampaignEditor] Available bundles:', bundles.map(b => ({ id: b.id || b._id?.toString(), name: b.name })));
        console.log('[CampaignEditor] All customPrices keys:', Object.keys(customPrices));
        console.log('[CampaignEditor] All products IDs:', products.map(p => ({ id: p.id || p._id?.toString(), name: p.name, isBundle: p.isBundle })));

        // Check if bundle is in customPrices state
        bundles.forEach(bundle => {
          const bundleId = bundle.id || bundle._id?.toString();
          const bundleIdStr = bundleId?.toString();
          console.log(`[CampaignEditor] Bundle "${bundle.name}" - ID: ${bundleIdStr}, In customPrices: ${bundleIdStr in customPrices}, Value: ${customPrices[bundleIdStr]}`);
        });
      }

      const response = await fetch(`/api/campaigns/${campaign._id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Campaign update successful:', result);

        // Update local state with the updated campaign data
        if (result.campaign) {
          // Update form data with saved values
          setFormData({
            name: result.campaign.name || formData.name,
            startDate: result.campaign.startDate ? new Date(result.campaign.startDate).toISOString().split('T')[0] : formData.startDate,
            endDate: result.campaign.endDate ? new Date(result.campaign.endDate).toISOString().split('T')[0] : formData.endDate,
            deliveryDate: result.campaign.deliveryDate ? new Date(result.campaign.deliveryDate).toISOString().split('T')[0] : formData.deliveryDate,
            financialGoal: result.campaign.financialGoal || formData.financialGoal,
            distributionStartHour: result.campaign.distributionStartHour || formData.distributionStartHour,
            distributionEndHour: result.campaign.distributionEndHour || formData.distributionEndHour
          });

          // Update custom prices and profit splits from saved campaign
          if (result.campaign.customPrices) {
            const updatedPrices = {};
            result.campaign.customPrices.forEach(cp => {
              const productId = cp.productId?._id?.toString() || cp.productId?.toString();
              if (productId) {
                updatedPrices[productId] = cp.price;
              }
            });
            setCustomPrices(prev => ({ ...prev, ...updatedPrices }));
          }

          if (result.campaign.profitSplits) {
            const updatedSplits = {};
            result.campaign.profitSplits.forEach(ps => {
              // Handle multiple formats: populated object, ObjectId, or string (same logic as in fetchProducts)
              let productId = null;
              if (ps.productId?._id) {
                productId = ps.productId._id.toString();
              } else if (ps.productId?.toString && typeof ps.productId.toString === 'function') {
                productId = ps.productId.toString();
              } else if (typeof ps.productId === 'string') {
                productId = ps.productId;
              } else {
                try {
                  productId = String(ps.productId);
                } catch (e) {
                  console.error('[CampaignEditor] Error extracting productId from saved profit split:', e);
                  return;
                }
              }

              if (productId) {
                // Preserve actual values from campaign, including 0
                updatedSplits[productId] = {
                  studentCash: ps.studentCash !== undefined && ps.studentCash !== null ? Number(ps.studentCash) : 0,
                  studentSchoolAccount: ps.studentSchoolAccount !== undefined && ps.studentSchoolAccount !== null ? Number(ps.studentSchoolAccount) : 0,
                  schoolProject: ps.schoolProject !== undefined && ps.schoolProject !== null ? Number(ps.schoolProject) : 0,
                  raffle: ps.raffle !== undefined && ps.raffle !== null ? Number(ps.raffle) : 0
                };
              }
            });
            console.log('[CampaignEditor] Updated profit splits after save:', updatedSplits);
            setProfitSplits(prev => ({ ...prev, ...updatedSplits }));
          }

          // Update donation settings
          if (result.campaign.donationsForStudents) {
            setStudentDonationsEnabled(result.campaign.donationsForStudents.enabled ?? true);
            setStudentDonationPresets(result.campaign.donationsForStudents.presets || [0, 5, 10, 20]);
            setStudentDonationSplit(result.campaign.donationsForStudents.splitConfig || {
              studentAccount: 60.0,
              studentCash: 40.0
            });
          }

          if (result.campaign.donationsForSchool) {
            setSchoolDonationsEnabled(result.campaign.donationsForSchool.enabled ?? true);
            setSchoolDonationPresets(result.campaign.donationsForSchool.presets || [0, 5, 10, 20]);
          }

          // Update groups configuration
          if (result.campaign.groups) {
            setGroupsEnabled(result.campaign.groups.enabled ?? false);
            if (result.campaign.groups.enabled && result.campaign.groups.list) {
              const groupNames = result.campaign.groups.list
                .filter(g => g.name !== 'Autre')
                .map(g => g.name);
              setGroupsList(groupNames);
              setGroupsText(groupNames.join('\n'));
            } else {
              setGroupsList([]);
              setGroupsText('');
            }
          }
        }

        if (!silent) {
          toast.success('Campagne mise à jour avec succès');
        }
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        setTimeout(() => {
          if (saveStatus === 'saved') {
            setSaveStatus('idle');
          }
        }, 2000);
        onUpdate && onUpdate(result.campaign);
      } else {
        let errorMessage = 'Erreur lors de la mise à jour de la campagne';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Campaign update failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            errorMessage: errorData.message,
            fullError: JSON.stringify(errorData, null, 2)
          });
        } catch (e) {
          console.error('Error parsing error response:', e);
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        if (!silent) {
          toast.error(errorMessage);
        }
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      if (!silent) {
        toast.error('Erreur de connexion. Veuillez réessayer.');
      }
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save effect with debouncing
  useEffect(() => {
    const isProductionMode = campaign?.mode === 'production';

    if (!hasUnsavedChanges || !campaign?._id || isProductionMode || saving) {
      return;
    }

    const timer = setTimeout(() => {
      console.log('[CampaignEditor] Auto-saving...');
      // Use refs to ensure we get the latest values
      handleSave(true, true); // Silent save with refs
    }, 3000); // 3 second debounce - wait for user to finish typing

    return () => clearTimeout(timer);
    // Include formData in dependencies so the effect re-runs with latest values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, campaign?._id, campaign?.mode, saving, formData.name, formData.startDate, formData.endDate, formData.deliveryDate, formData.financialGoal, formData.distributionStartHour, formData.distributionEndHour]);

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original values
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
        deliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString().split('T')[0] : '',
        financialGoal: campaign.financialGoal || '',
        distributionStartHour: campaign.distributionStartHour || '',
        distributionEndHour: campaign.distributionEndHour || ''
      });
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Campagne supprimée avec succès');
        if (onUpdate) {
          onUpdate(); // Refresh campaigns list
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Erreur lors de la suppression de la campagne');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Erreur de connexion lors de la suppression');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleStop = async () => {
    if (!campaign) return;

    setIsStopping(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Campagne arrêtée avec succès');
        // Trigger refresh of campaigns list
        if (onUpdate) {
          onUpdate();
        }
        // Reload page to refresh data
        window.location.reload();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Erreur lors de l\'arrêt de la campagne');
      }
    } catch (error) {
      console.error('Error stopping campaign:', error);
      toast.error('Erreur lors de l\'arrêt de la campagne');
    } finally {
      setIsStopping(false);
      setShowStopConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Edit3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucune campagne sélectionnée</p>
      </div>
    );
  }

  const isProductionMode = campaign.mode === 'production';

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 lg:p-6 bg-white rounded-lg shadow-md overflow-x-hidden">
      <div className="text-center mb-6 sm:mb-8">
        <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-3 sm:mb-4 ${isProductionMode ? 'bg-gray-400' : 'bg-gradient-to-r from-orange-500 to-orange-600'
          }`}>
          <Edit3 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2 px-2 flex-wrap">
          <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold break-words ${isProductionMode ? 'text-gray-600' : 'text-gray-900'}`}>
            Modifier la Campagne #{campaign.campaignNumber}
          </h2>
          {!isProductionMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 border text-xs px-2 py-1 flex items-center gap-1 cursor-help">
                      <Info className="h-3 w-3" />
                      <span>Test</span>
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-gray-900 text-white text-xs">
                  <p className="font-semibold mb-1">⚠️ Mode test</p>
                  <p>
                    Cette campagne est en mode test. Vous pouvez modifier tous les paramètres. Les données, commandes, statistiques et rapports sont marqués comme test et ne sont pas définitifs. Passez en mode production pour démarrer la campagne réelle.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className={`text-sm sm:text-base lg:text-lg px-2 ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
          Gérez les détails de votre campagne de financement
        </p>

        {/* Save Status Indicator */}
        <div className="mt-3 flex items-center justify-center">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Enregistrement...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Enregistré</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Erreur d'enregistrement</span>
            </div>
          )}
        </div>

        {/* Activate Campaign Button */}
        {!isProductionMode && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {campaign.status !== 'approved' ? (
              <div className="w-full bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Campagne en attente d'approbation</p>
                    <p className="text-sm mt-1">
                      La campagne doit être approuvée par le fournisseur avant de pouvoir être activée.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Button
                  onClick={async () => {
                    setIsTogglingMode(true);
                    try {
                      const response = await fetch(`/api/campaigns/${campaign._id}/toggle-mode`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mode: 'production' })
                      });
                      if (response.ok) {
                        const data = await response.json();
                        toast.success('✅ Campagne activée ! Les clients peuvent maintenant commander.');
                        onUpdate && onUpdate(data.campaign);
                      } else {
                        const error = await response.json();
                        toast.error(error.message || 'Erreur lors de l\'activation de la campagne');
                      }
                    } catch (error) {
                      toast.error('Erreur lors de l\'activation de la campagne');
                    } finally {
                      setIsTogglingMode(false);
                    }
                  }}
                  disabled={isTogglingMode}
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
                >
                  {isTogglingMode ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Activation...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Activer la campagne
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 text-center max-w-md px-4">
                  Une fois la campagne activée, vous ne pourrez plus la modifier.
                </p>
              </>
            )}
          </div>
        )}
        {isProductionMode && (
          <div className="mt-4 p-3 sm:p-4 bg-orange-50 border-2 border-orange-300 rounded-lg mx-2 sm:mx-0">
            <div className="flex items-center justify-center gap-2 text-orange-800 flex-wrap">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="font-semibold text-xs sm:text-sm text-center">
                Campagne activée : Les modifications ne sont plus possibles
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 sm:space-y-6 lg:space-y-8 overflow-x-hidden">
        {/* Nom de la campagne */}
        <Card className={`transition-shadow duration-200 border-0 shadow-md ${isProductionMode ? '' : 'hover:shadow-lg'}`}>
          <CardHeader
            className={`rounded-t-lg cursor-pointer ${isProductionMode ? 'bg-gray-100' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}`}
            onClick={() => toggleSection('name')}
          >
            <CardTitle className={`flex items-center justify-between ${isProductionMode ? 'text-gray-600' : 'text-blue-900'}`}>
              <div className="flex items-center space-x-2">
                <Edit3 className="h-5 w-5" />
                <span>Nom de la campagne</span>
              </div>
              {expandedSections.name ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.name && (
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaignName" className={`text-sm font-medium ${isProductionMode ? 'text-gray-500' : 'text-gray-700'}`}>
                  Nom de la campagne
                </Label>
                <Input
                  id="campaignName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={`Ex: ${school?.name || 'Organisation'} - Janvier 2025`}
                  maxLength={200}
                  className={`mt-1 border-2 rounded-lg transition-all duration-200 ${isProductionMode
                    ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                    : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  disabled={isProductionMode}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Le nom sera utilisé pour identifier cette campagne dans les rapports et les vues
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 overflow-x-hidden">
          {/* Dates */}
          <Card className={`transition-shadow duration-200 border-0 shadow-md ${isProductionMode ? '' : 'hover:shadow-lg'}`}>
            <CardHeader
              className={`rounded-t-lg cursor-pointer ${isProductionMode ? 'bg-gray-100' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}`}
              onClick={() => toggleSection('dates')}
            >
              <CardTitle className={`flex items-center justify-between ${isProductionMode ? 'text-gray-600' : 'text-blue-900'}`}>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Dates de la Campagne</span>
                </div>
                {expandedSections.dates ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.dates && (
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="startDate" className={`text-sm font-medium ${isProductionMode ? 'text-gray-500' : 'text-gray-700'}`}>Date de début *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className={`mt-1 border-2 rounded-lg transition-all duration-200 ${isProductionMode
                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`}
                    disabled={isProductionMode || campaign.datesLocked}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className={`text-sm font-medium ${isProductionMode ? 'text-gray-500' : 'text-gray-700'}`}>Date de fin *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className={`mt-1 border-2 rounded-lg transition-all duration-200 ${isProductionMode
                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`}
                    disabled={isProductionMode || campaign.datesLocked}
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryDate" className={`text-sm font-medium ${isProductionMode ? 'text-gray-500' : 'text-gray-700'}`}>Date de livraison *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                    min={getMinDeliveryDate()}
                    className={`mt-1 border-2 rounded-lg transition-all duration-200 ${isProductionMode
                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`}
                    disabled={isProductionMode || campaign.datesLocked}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Doit être au moins {minimumDeliveryDays} jour{minimumDeliveryDays > 1 ? 's' : ''} après la fin de la campagne
                  </p>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Indiquez les heures pendant lesquelles les {terminology.participants} pourront venir chercher leurs commandes.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="distributionStartHour" className={`text-sm font-medium ${isProductionMode ? 'text-gray-500' : 'text-gray-700'}`}>Heure de début de distribution</Label>
                    <Select
                      value={formData.distributionStartHour || ''}
                      onValueChange={(value) => handleInputChange('distributionStartHour', value)}
                      disabled={isProductionMode || campaign.datesLocked}
                    >
                      <SelectTrigger className={`mt-1 border-2 rounded-lg transition-all duration-200 ${isProductionMode
                        ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        }`}>
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
                    <Label htmlFor="distributionEndHour" className={`text-sm font-medium ${isProductionMode ? 'text-gray-500' : 'text-gray-700'}`}>Heure de fin de distribution</Label>
                    <Select
                      value={formData.distributionEndHour || ''}
                      onValueChange={(value) => handleInputChange('distributionEndHour', value)}
                      disabled={isProductionMode || campaign.datesLocked}
                    >
                      <SelectTrigger className={`mt-1 border-2 rounded-lg transition-all duration-200 ${isProductionMode
                        ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        }`}>
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
              </CardContent>
            )}
          </Card>

          {/* Financial Goal */}
          <Card className={`transition-shadow duration-200 border-0 shadow-md ${isProductionMode ? '' : 'hover:shadow-lg'}`}>
            <CardHeader
              className={`rounded-t-lg cursor-pointer ${isProductionMode ? 'bg-gray-100' : 'bg-gradient-to-r from-green-50 to-emerald-50'}`}
              onClick={() => toggleSection('financial')}
            >
              <CardTitle className={`flex items-center justify-between ${isProductionMode ? 'text-gray-600' : 'text-green-900'}`}>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Objectif Financier</span>
                </div>
                {expandedSections.financial ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.financial && (
              <CardContent>
                <div>
                  <Label htmlFor="financialGoal" className={`text-sm font-medium ${isProductionMode ? 'text-gray-500' : 'text-gray-700'}`}>Montant cible (CAD) *</Label>
                  <Input
                    id="financialGoal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.financialGoal}
                    onChange={(e) => handleInputChange('financialGoal', e.target.value)}
                    placeholder="0.00"
                    className={`mt-1 border-2 rounded-lg transition-all duration-200 ${isProductionMode
                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                      : 'border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                      }`}
                    disabled={isProductionMode}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le montant total que vous souhaitez récolter
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Product Pricing */}
        <Card className={`transition-shadow duration-200 border-0 shadow-md ${isProductionMode ? '' : 'hover:shadow-lg'}`}>
          <CardHeader
            className={`rounded-t-lg cursor-pointer ${isProductionMode ? 'bg-gray-100' : 'bg-gradient-to-r from-purple-50 to-pink-50'}`}
            onClick={() => toggleSection('products')}
          >
            <CardTitle className={`flex items-center justify-between ${isProductionMode ? 'text-gray-600' : 'text-purple-900'}`}>
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Prix des Produits</span>
              </div>
              {expandedSections.products ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.products && (
            <CardContent>
              <div className="space-y-4">
                <p className={`text-sm ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  Personnalisez les prix de vente pour chaque produit. Ces prix seront utilisés lors de la vente.
                </p>

                {/* Global Profit Settings Card */}
                {!isProductionMode && (
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
                          step="0.01"
                          min="0"
                          value={typeof globalProfitSettings.profitPerProduct === 'number'
                            ? globalProfitSettings.profitPerProduct.toFixed(2)
                            : (typeof globalProfitSettings.profitPerProduct === 'string' && globalProfitSettings.profitPerProduct !== ''
                              ? (isNaN(parseFloat(globalProfitSettings.profitPerProduct))
                                ? globalProfitSettings.profitPerProduct
                                : parseFloat(globalProfitSettings.profitPerProduct).toFixed(2))
                              : '0.00')}
                          onChange={(e) => handleGlobalProfitSettingsChange('profitPerProduct', e.target.value)}
                          onBlur={(e) => {
                            const value = e.target.value;
                            if (value !== '' && !isNaN(parseFloat(value))) {
                              const rounded = Math.round(parseFloat(value) * 100) / 100;
                              handleGlobalProfitSettingsChange('profitPerProduct', rounded);
                            }
                          }}
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
                              step="0.01"
                              min="0"
                              value={typeof globalProfitSettings.studentCash === 'number'
                                ? globalProfitSettings.studentCash.toFixed(2)
                                : (typeof globalProfitSettings.studentCash === 'string' && globalProfitSettings.studentCash !== ''
                                  ? (isNaN(parseFloat(globalProfitSettings.studentCash))
                                    ? globalProfitSettings.studentCash
                                    : parseFloat(globalProfitSettings.studentCash).toFixed(2))
                                  : '0.00')}
                              onChange={(e) => handleGlobalProfitSettingsChange('studentCash', e.target.value)}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value !== '' && !isNaN(parseFloat(value))) {
                                  const rounded = Math.round(parseFloat(value) * 100) / 100;
                                  handleGlobalProfitSettingsChange('studentCash', rounded);
                                }
                              }}
                              className="mt-1 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </div>
                          <div>
                            <Label htmlFor="globalStudentSchoolAccount" className="text-xs text-gray-600">
                              Étudiant compte scolaire ($)
                            </Label>
                            <Input
                              id="globalStudentSchoolAccount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={typeof globalProfitSettings.studentSchoolAccount === 'number'
                                ? globalProfitSettings.studentSchoolAccount.toFixed(2)
                                : (typeof globalProfitSettings.studentSchoolAccount === 'string' && globalProfitSettings.studentSchoolAccount !== ''
                                  ? (isNaN(parseFloat(globalProfitSettings.studentSchoolAccount))
                                    ? globalProfitSettings.studentSchoolAccount
                                    : parseFloat(globalProfitSettings.studentSchoolAccount).toFixed(2))
                                  : '0.00')}
                              onChange={(e) => handleGlobalProfitSettingsChange('studentSchoolAccount', e.target.value)}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value !== '' && !isNaN(parseFloat(value))) {
                                  const rounded = Math.round(parseFloat(value) * 100) / 100;
                                  handleGlobalProfitSettingsChange('studentSchoolAccount', rounded);
                                }
                              }}
                              className="mt-1 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </div>
                          <div>
                            <Label htmlFor="globalSchoolProject" className="text-xs text-gray-600">
                              Projet École ($)
                            </Label>
                            <Input
                              id="globalSchoolProject"
                              type="number"
                              step="0.01"
                              min="0"
                              value={typeof globalProfitSettings.schoolProject === 'number'
                                ? globalProfitSettings.schoolProject.toFixed(2)
                                : (typeof globalProfitSettings.schoolProject === 'string' && globalProfitSettings.schoolProject !== ''
                                  ? (isNaN(parseFloat(globalProfitSettings.schoolProject))
                                    ? globalProfitSettings.schoolProject
                                    : parseFloat(globalProfitSettings.schoolProject).toFixed(2))
                                  : '0.00')}
                              onChange={(e) => handleGlobalProfitSettingsChange('schoolProject', e.target.value)}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value !== '' && !isNaN(parseFloat(value))) {
                                  const rounded = Math.round(parseFloat(value) * 100) / 100;
                                  handleGlobalProfitSettingsChange('schoolProject', rounded);
                                }
                              }}
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
                              step="0.01"
                              min="0"
                              value={typeof globalProfitSettings.raffle === 'number'
                                ? globalProfitSettings.raffle.toFixed(2)
                                : (typeof globalProfitSettings.raffle === 'string' && globalProfitSettings.raffle !== ''
                                  ? (isNaN(parseFloat(globalProfitSettings.raffle))
                                    ? globalProfitSettings.raffle
                                    : parseFloat(globalProfitSettings.raffle).toFixed(2))
                                  : '0.00')}
                              onChange={(e) => handleGlobalProfitSettingsChange('raffle', e.target.value)}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value !== '' && !isNaN(parseFloat(value))) {
                                  const rounded = Math.round(parseFloat(value) * 100) / 100;
                                  handleGlobalProfitSettingsChange('raffle', rounded);
                                }
                              }}
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
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Appliquer cette répartition à tous les produits
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 overflow-x-hidden">
                  {products.map((product) => {
                    // Get product ID - handle both id and _id formats (same as in fetchProducts)
                    // For bundles, the id might be BUNDLE-XXXXXX, but we need the actual _id for matching
                    let productId = product.id || product._id?.toString() || product._id;

                    // If it's a bundle with BUNDLE- prefix, extract the actual _id
                    if (product.isBundle && typeof productId === 'string' && productId.startsWith('BUNDLE-')) {
                      // Try to get the actual _id from the product object
                      productId = product._id?.toString() || product.id;
                    }

                    const productIdStr = productId?.toString();

                    // Use recommendedRetailPrice as default selling price (Prix école), fallback to price if not available
                    const defaultSellingPrice = product.recommendedRetailPrice || product.price;
                    const sellingPrice = customPrices[productIdStr] !== undefined && customPrices[productIdStr] !== ''
                      ? customPrices[productIdStr]
                      : defaultSellingPrice;

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
                      const deliveryCostToSchool = product.deliveryCostToSchool || 0;
                      // Get pricing settings from supplier (if available in campaign or product data)
                      const pricingSettings = campaign?.supplier?.pricingSettings || product?.supplier?.pricingSettings || { markup: 5, handlesShipping: false };
                      const markupMultiplier = getMarkupMultiplier({ pricingSettings });
                      const handlesShipping = pricingSettings.handlesShipping || false;
                      // If supplier handles shipping, delivery cost should be 0 for price calculation
                      const effectiveDeliveryCost = handlesShipping ? 0 : deliveryCostToSchool;
                      const basePrice = pricePickup * markupMultiplier;
                      const totalPrice = basePrice + effectiveDeliveryCost;
                      // Round down to nearest 5 cents for school cost
                      acquisitionCost = roundDownToFiveCents(totalPrice);
                    }
                    // Profit = Prix de vente - Coût d'acquisition (same calculation as in CampaignCreator)
                    const profit = typeof sellingPrice === 'number'
                      ? sellingPrice - acquisitionCost
                      : (parseFloat(sellingPrice) || 0) - acquisitionCost;

                    return (
                      <div key={product.id} className={`border-0 rounded-xl p-3 sm:p-4 lg:p-5 shadow-md transition-all duration-200 overflow-x-hidden ${isProductionMode
                        ? 'bg-gray-100 opacity-75'
                        : 'bg-gradient-to-br from-white to-gray-50 hover:shadow-lg hover:scale-[1.02]'
                        }`}>
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
                            <Label htmlFor={`price-${product.id}`} className={`text-sm font-semibold block mb-2 ${isProductionMode ? 'text-gray-600' : 'text-gray-900'}`}>
                              {product.name}
                            </Label>

                            {/* Financial Info */}
                            <div className="space-y-1 mb-3">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Coût:</span>
                                <span className="font-medium text-gray-700">${product.cost.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Prix par défaut:</span>
                                <span className="font-medium text-gray-700">${(product.recommendedRetailPrice || product.price || 0).toFixed(2)}</span>
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
                              <Label htmlFor={`price-${product.id}`} className={`text-xs whitespace-nowrap ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                Prix de vente:
                              </Label>
                              <div className="flex-1">
                                <Input
                                  id={`price-${product.id}`}
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  value={sellingPrice}
                                  onChange={(e) => handlePriceChange(productIdStr, e.target.value)}
                                  className={`text-sm h-9 border-2 rounded-lg transition-all duration-200 ${isProductionMode
                                    ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                                    : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                    }`}
                                  disabled={isProductionMode || campaign.profitSplitLocked}
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
                              <h4 className={`text-xs font-semibold mb-2 ${isProductionMode ? 'text-gray-500' : 'text-gray-700'}`}>Répartition des profits:</h4>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Label htmlFor={`studentCash-${product.id}`} className={`text-xs w-20 ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                    Étudiant comptant:
                                  </Label>
                                  <Input
                                    id={`studentCash-${product.id}`}
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    value={profitSplits[productIdStr]?.studentCash !== undefined && profitSplits[productIdStr]?.studentCash !== null ? profitSplits[productIdStr].studentCash : ''}
                                    onChange={(e) => handleProfitSplitChange(productIdStr, 'studentCash', e.target.value)}
                                    className={`text-xs h-7 border-2 rounded-md transition-all duration-200 ${isProductionMode
                                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                                      : 'border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-200'
                                      }`}
                                    disabled={isProductionMode || campaign.profitSplitLocked}
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Label htmlFor={`studentSchoolAccount-${product.id}`} className={`text-xs w-20 ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                    Étudiant compte scolaire:
                                  </Label>
                                  <Input
                                    id={`studentSchoolAccount-${product.id}`}
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    value={profitSplits[productIdStr]?.studentSchoolAccount !== undefined && profitSplits[productIdStr]?.studentSchoolAccount !== null ? profitSplits[productIdStr].studentSchoolAccount : ''}
                                    onChange={(e) => handleProfitSplitChange(productIdStr, 'studentSchoolAccount', e.target.value)}
                                    className={`text-xs h-7 border-2 rounded-md transition-all duration-200 ${isProductionMode
                                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                                      : 'border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-200'
                                      }`}
                                    disabled={isProductionMode || campaign.profitSplitLocked}
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Label htmlFor={`schoolProject-${product.id}`} className={`text-xs w-20 ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                    Projet École:
                                  </Label>
                                  <Input
                                    id={`schoolProject-${product.id}`}
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    value={profitSplits[productIdStr]?.schoolProject !== undefined && profitSplits[productIdStr]?.schoolProject !== null ? profitSplits[productIdStr].schoolProject : ''}
                                    onChange={(e) => handleProfitSplitChange(productIdStr, 'schoolProject', e.target.value)}
                                    className={`text-xs h-7 border-2 rounded-md transition-all duration-200 ${isProductionMode
                                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                                      : 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                                      }`}
                                    disabled={isProductionMode || campaign.profitSplitLocked}
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Label htmlFor={`raffle-${product.id}`} className={`text-xs w-16 ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                    Tirage:
                                  </Label>
                                  <Input
                                    id={`raffle-${product.id}`}
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    value={profitSplits[productIdStr]?.raffle !== undefined && profitSplits[productIdStr]?.raffle !== null ? profitSplits[productIdStr].raffle : ''}
                                    onChange={(e) => handleProfitSplitChange(productIdStr, 'raffle', e.target.value)}
                                    className={`text-xs h-7 border-2 rounded-md transition-all duration-200 ${isProductionMode
                                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed'
                                      : 'border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-200'
                                      }`}
                                    disabled={isProductionMode || campaign.profitSplitLocked}
                                  />
                                </div>

                                {/* Profit Distribution Summary */}
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  {(() => {
                                    const splits = profitSplits[productIdStr] || {
                                      studentCash: 1.00,
                                      studentSchoolAccount: 1.00,
                                      schoolProject: 0.75,
                                      raffle: 0.25
                                    };
                                    const studentCashValue = splits.studentCash === '' ? 0 : Number(splits.studentCash || 0);
                                    const studentSchoolAccountValue = splits.studentSchoolAccount === '' ? 0 : Number(splits.studentSchoolAccount || 0);
                                    const schoolProjectValue = splits.schoolProject === '' ? 0 : Number(splits.schoolProject || 0);
                                    const raffleValue = splits.raffle === '' ? 0 : Number(splits.raffle || 0);
                                    // Round to 2 decimals to avoid floating point precision issues (same as in validation)
                                    const totalDistributed = Math.round((studentCashValue + studentSchoolAccountValue + schoolProjectValue + raffleValue) * 100) / 100;
                                    const profitRounded = Math.round(Number(profit || 0) * 100) / 100;
                                    const remaining = profitRounded - totalDistributed;

                                    return (
                                      <div className="text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Total distribué:</span>
                                          <span className="font-medium">${totalDistributed.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Reste:</span>
                                          <span className={`font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ${remaining.toFixed(2)}
                                          </span>
                                        </div>
                                        {/* Use epsilon (0.01) to account for rounding differences */}
                                        {remaining < -0.01 && (
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
              </div>
            </CardContent>
          )}
        </Card>

        {/* Donation Configuration */}
        <Card className={`transition-shadow duration-200 border-0 shadow-md ${isProductionMode ? '' : 'hover:shadow-lg'}`}>
          <CardHeader
            className={`rounded-t-lg cursor-pointer ${isProductionMode ? 'bg-gray-100' : 'bg-gradient-to-r from-pink-50 to-rose-50'}`}
            onClick={() => toggleSection('donations')}
          >
            <CardTitle className={`flex items-center justify-between ${isProductionMode ? 'text-gray-600' : 'text-pink-900'}`}>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Configuration des Dons</span>
              </div>
              {expandedSections.donations ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.donations && (
            <CardContent>
              {/* Donation Configuration - Split into Two Sections */}

              {/* Student Donations Configuration */}
              <div className={`space-y-4 ${isProductionMode ? 'opacity-75' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className={`h-5 w-5 ${isProductionMode ? 'text-gray-500' : 'text-blue-600'}`} />
                    <h3 className={`text-lg font-semibold ${isProductionMode ? 'text-gray-500' : 'text-gray-800'}`}>
                      Dons pour les {terminology.participantsLabel.charAt(0).toUpperCase() + terminology.participantsLabel.slice(1)}
                    </h3>
                  </div>
                  <Toggle
                    pressed={studentDonationsEnabled}
                    onPressedChange={(pressed) => {
                      setStudentDonationsEnabled(pressed);
                      setHasUnsavedChanges(true);
                    }}
                    disabled={isProductionMode}
                    aria-label={`Activer les dons pour les ${terminology.participants}`}
                    size="sm"
                    variant="outline"
                    className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=off]:bg-gray-200 data-[state=off]:text-gray-700 min-w-16 disabled:opacity-50"
                  >
                    {studentDonationsEnabled ? 'Activé' : 'Désactivé'}
                  </Toggle>
                </div>
                {!studentDonationsEnabled && (
                  <p className="text-sm text-gray-500 mt-2">Cette section est désactivée. Les dons pour les {terminology.participants} ne seront pas affichés au checkout.</p>
                )}

                {isProductionMode && (
                  <Badge variant="outline" className="text-xs inline-flex items-center">
                    <Lock className="h-3 w-3 mr-1" />
                    En mode production - Paramètres verrouillés
                  </Badge>
                )}

                {studentDonationsEnabled && (
                  <>
                    <p className={`text-sm ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
                      Les clients pourront ajouter un don pour soutenir les {terminology.participants} de {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization}.
                    </p>

                    {/* Student Donation Presets */}
                    <div className="space-y-3">
                      <h4 className={`text-sm font-semibold ${isProductionMode ? 'text-gray-500' : 'text-gray-700'}`}>
                        Montants de dons disponibles:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {studentDonationPresets.map((preset, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={preset}
                              onChange={(e) => handleStudentDonationPresetChange(index, e.target.value)}
                              className={`w-20 text-sm ${isProductionMode ? 'bg-gray-100' : ''}`}
                              disabled={isProductionMode}
                            />
                            <span className="text-sm text-gray-500">$</span>
                            {studentDonationPresets.length > 2 && !isProductionMode && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeStudentDonationPreset(index)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {studentDonationPresets.length < 6 && !isProductionMode && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addStudentDonationPreset}
                            className="h-8 px-3"
                          >
                            + Ajouter
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Les clients pourront choisir parmi ces montants ou entrer un montant personnalisé.
                      </p>
                    </div>

                    {/* Student Donation Split */}
                    <div className="space-y-3">
                      <h4 className={`text-sm font-semibold ${isProductionMode ? 'text-gray-500' : 'text-gray-700'}`}>
                        Répartition des dons {terminology.participants} (en pourcentage):
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 overflow-x-hidden">
                        <div>
                          <Label htmlFor="student-donation-account" className={`text-sm ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
                            {terminology.accountLabel}:
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
                              className={`text-sm ${isProductionMode ? 'bg-gray-100' : ''}`}
                              disabled={isProductionMode}
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="student-donation-cash" className={`text-sm ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
                            {terminology.cashLabel}:
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
                              className={`text-sm ${isProductionMode ? 'bg-gray-100' : ''}`}
                              disabled={isProductionMode}
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Student Donation Split Preview */}
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <h5 className="text-sm font-semibold text-blue-800 mb-2">Aperçu - Don de 10$:</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-center">
                            <div className="text-blue-600 font-semibold">
                              ${((10 * studentDonationSplit.studentAccount) / 100).toFixed(2)}
                            </div>
                            <div className="text-gray-600">{terminology.accountLabel}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-green-600 font-semibold">
                              ${((10 * studentDonationSplit.studentCash) / 100).toFixed(2)}
                            </div>
                            <div className="text-gray-600">{terminology.cashLabelShort}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                          <span className="text-xs text-gray-500">
                            Total: {studentDonationSplit.studentAccount + studentDonationSplit.studentCash}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* School Donations Configuration */}
              <div className={`space-y-4 mt-6 ${isProductionMode ? 'opacity-75' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className={`h-5 w-5 ${isProductionMode ? 'text-gray-500' : 'text-green-600'}`} />
                    <h3 className={`text-lg font-semibold ${isProductionMode ? 'text-gray-500' : 'text-gray-800'}`}>
                      Dons pour {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organizationLabel}
                    </h3>
                  </div>
                  <Toggle
                    pressed={schoolDonationsEnabled}
                    onPressedChange={(pressed) => {
                      setSchoolDonationsEnabled(pressed);
                      setHasUnsavedChanges(true);
                    }}
                    disabled={isProductionMode}
                    aria-label={`Activer les dons pour ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization}`}
                    size="sm"
                    variant="outline"
                    className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=off]:bg-gray-200 data-[state=off]:text-gray-700 min-w-16 disabled:opacity-50"
                  >
                    {schoolDonationsEnabled ? 'Activé' : 'Désactivé'}
                  </Toggle>
                </div>
                {!schoolDonationsEnabled && (
                  <p className="text-sm text-gray-500 mt-2">Cette section est désactivée. Les dons pour {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization} ne seront pas affichés au checkout.</p>
                )}

                {schoolDonationsEnabled && (
                  <>
                    <p className={`text-sm ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
                      Les clients pourront ajouter un don pour soutenir {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization} et ses projets.
                    </p>

                    {/* School Donation Presets */}
                    <div className="space-y-3">
                      <h4 className={`text-sm font-semibold ${isProductionMode ? 'text-gray-500' : 'text-gray-700'}`}>
                        Montants de dons disponibles:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {schoolDonationPresets.map((preset, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={preset}
                              onChange={(e) => handleSchoolDonationPresetChange(index, e.target.value)}
                              className={`w-20 text-sm ${isProductionMode ? 'bg-gray-100' : ''}`}
                              disabled={isProductionMode}
                            />
                            <span className="text-sm text-gray-500">$</span>
                            {schoolDonationPresets.length > 2 && !isProductionMode && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeSchoolDonationPreset(index)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {schoolDonationPresets.length < 6 && !isProductionMode && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addSchoolDonationPreset}
                            className="h-8 px-3"
                          >
                            + Ajouter
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Les clients pourront choisir parmi ces montants ou entrer un montant personnalisé.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Groups Configuration */}
        <Card className={`transition-shadow duration-200 border-0 shadow-md ${isProductionMode ? '' : 'hover:shadow-lg'}`}>
          <CardHeader
            className={`rounded-t-lg cursor-pointer ${isProductionMode ? 'bg-gray-100' : 'bg-gradient-to-r from-purple-50 to-indigo-50'}`}
            onClick={() => toggleSection('groups')}
          >
            <CardTitle className={`flex items-center justify-between ${isProductionMode ? 'text-gray-600' : 'text-purple-900'}`}>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Gestion des Groupes</span>
              </div>
              {expandedSections.groups ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.groups && (
            <CardContent>
              <div className={`space-y-4 ${isProductionMode ? 'opacity-75' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className={`h-5 w-5 ${isProductionMode ? 'text-gray-500' : 'text-purple-600'}`} />
                    <h3 className={`text-lg font-semibold ${isProductionMode ? 'text-gray-500' : 'text-gray-800'}`}>
                      Groupes pour le classement
                    </h3>
                  </div>
                  <Toggle
                    pressed={groupsEnabled}
                    onPressedChange={(pressed) => {
                      setGroupsEnabled(pressed);
                      setHasUnsavedChanges(true);
                      if (pressed && groupsList.length === 0) {
                        setIsEditingGroups(true);
                      }
                    }}
                    disabled={isProductionMode}
                    aria-label="Activer les groupes"
                    size="sm"
                    variant="outline"
                    className="data-[state=on]:bg-purple-500 data-[state=on]:text-white data-[state=off]:bg-gray-200 data-[state=off]:text-gray-700 min-w-16 disabled:opacity-50"
                  >
                    {groupsEnabled ? 'Activé' : 'Désactivé'}
                  </Toggle>
                </div>

                {isProductionMode && (
                  <Badge variant="outline" className="text-xs inline-flex items-center">
                    <Lock className="h-3 w-3 mr-1" />
                    En mode production - Paramètres verrouillés (sauf groupes vides)
                  </Badge>
                )}

                {!groupsEnabled && (
                  <p className="text-sm text-gray-500 mt-2">Les groupes sont désactivés. Les {terminology.participants} ne seront pas organisés en groupes pour cette campagne.</p>
                )}

                {groupsEnabled && (
                  <div className="space-y-4">
                    <p className={`text-sm ${isProductionMode ? 'text-gray-500' : 'text-gray-600'}`}>
                      Les {terminology.participants} pourront choisir un groupe lors de leur adhésion à la campagne. Le classement affichera les groupes et les classements individuels par groupe.
                    </p>

                    {/* Groups Input/Display */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className={`text-sm font-semibold ${isProductionMode ? 'text-gray-500' : 'text-gray-800'}`}>
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
                            onChange={(e) => {
                              setGroupsText(e.target.value);
                              setHasUnsavedChanges(true);
                            }}
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
                                setHasUnsavedChanges(true);
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
                            {isProductionMode
                              ? 'Note: Vous pouvez ajouter ou supprimer des groupes vides même en production. Le groupe "Autre" sera automatiquement ajouté et ne peut pas être supprimé.'
                              : 'Note: Le groupe "Autre" sera automatiquement ajouté et ne peut pas être supprimé.'}
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
              </div>
            </CardContent>
          )}
        </Card>

        {/* Bouton d'arrêt de campagne (visible pour les campagnes actives ou en production) */}
        {campaign.status !== 'stopped' && (isProductionMode || campaign.status === 'active') && (
          <div className="pt-6 border-t border-gray-200 mt-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="text-center mb-2">
                <p className="text-sm text-gray-600">
                  Arrêter cette campagne la retirera de la liste des campagnes actives.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowStopConfirm(true)}
                className="flex items-center space-x-2 w-full sm:w-auto border-orange-500 text-orange-600 hover:bg-orange-50"
                disabled={isStopping}
              >
                <StopCircle className="h-4 w-4" />
                <span className="text-sm sm:text-base">Arrêter la campagne</span>
              </Button>
            </div>
          </div>
        )}

        {/* Bouton de suppression en bas du formulaire (uniquement si non approuvée) */}
        {!isProductionMode && campaign.status !== 'active' && (
          <div className="pt-6 border-t border-gray-200 mt-6">
            <div className="flex flex-col items-center space-y-3">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center space-x-2 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-sm sm:text-base">Supprimer la campagne</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog de confirmation d'arrêt */}
      <Dialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-orange-600 flex items-center space-x-2">
              <StopCircle className="h-5 w-5" />
              <span>Arrêter la campagne</span>
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-3">
              <p className="text-sm text-gray-700">
                Cette action va <strong className="text-orange-600">arrêter</strong> la campagne et la retirer de la liste des campagnes actives.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                <li>La campagne ne sera plus visible dans le sélecteur</li>
                <li>Les participants ne pourront plus y accéder</li>
                <li>Les données et commandes existantes seront conservées</li>
              </ul>
              {campaign?.name && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-600 mb-1">Campagne à arrêter :</p>
                  <p className="font-semibold text-gray-900">
                    {campaign.name} (Campagne #{campaign.campaignNumber})
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowStopConfirm(false)}
              disabled={isStopping}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleStop}
              disabled={isStopping}
              className="w-full sm:w-auto order-1 sm:order-2 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isStopping ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Arrêt en cours...
                </>
              ) : (
                <>
                  <StopCircle className="h-4 w-4 mr-2" />
                  Arrêter la campagne
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>Supprimer la campagne</span>
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-3">
              <p className="text-sm text-gray-700">
                Cette action est <strong className="text-red-600">irréversible</strong> et supprimera définitivement :
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                <li>La campagne et toutes ses données</li>
                <li>Les commandes associées</li>
                <li>Les statistiques et rapports</li>
              </ul>
              {campaign?.name && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Campagne à supprimer :</p>
                  <p className="font-semibold text-gray-900">
                    {campaign.name} (Campagne #{campaign.campaignNumber})
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Modal - Auto-opens with supplier */}
      {school && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          schoolId={school._id || school.id}
          supplierId={campaign?.supplier?._id || campaign?.supplier || campaign?.supplierId}
          userRole={session?.user?.role}
        />
      )}
    </div>
  );
};

export default CampaignEditor;
