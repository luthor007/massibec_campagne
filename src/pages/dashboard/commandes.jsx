// pages/commandes.jsx

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { getServerSession } from 'next-auth/next';
import Layout from '../../components/Layout';
import { calculateOrderProfits, calculateOrderProfitsDetailed, getCampaignDataWithFallback, isTestCampaign } from '../../utils/campaignHelpers';
import { getTerminology } from '../../utils/organizationHelpers';
import CampaignSelector from '../../components/Dashboard/CampaignSelector';
import JoinCampaignModal from '../../components/Dashboard/JoinCampaignModal';
import OnboardingTooltip from '../../components/Dashboard/OnboardingTooltip';
import OrderPlacementModal from '../../components/Dashboard/OrderPlacementModal';
import useOnboarding from '../../hooks/useOnboarding';
import { getDashboardSSRData, getOrdersSSR } from '../../lib/dashboardSSR';
import { authOptions } from '../api/auth/[...nextauth]';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ArrowLeft, Trash2, AlertTriangle, AlertCircle, Copy, Check, CheckCircle, Edit2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { products } from '../../lib/product';
import { motion } from 'framer-motion'
import { SendHorizontal } from 'lucide-react'
import { format, addDays, isBefore, isAfter } from 'date-fns'; // Make sure to import date-fns
import { fr } from 'date-fns/locale'; // For French date formatting
import { toast } from 'sonner'


export default function Commandes({
  initialCampaignContext,
  initialStoreInfo,
  initialSchoolData,
  initialCampaignData,
  initialOrders
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State declarations - must come before handlers that use them
  const [orders, setOrders] = useState(initialOrders || []);
  const [loading, setLoading] = useState(!initialOrders);
  const [error, setError] = useState(null);
  const [schoolFetchFailed, setSchoolFetchFailed] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showOrderPlacementModal, setShowOrderPlacementModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [newOrderId, setNewOrderId] = useState(null);
  const [priceToPay, setPriceToPay] = useState();
  const [school, setSchool] = useState(initialSchoolData || null);
  const [isHovered, setIsHovered] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [editingDeliveryOption, setEditingDeliveryOption] = useState(null);
  const [showEditDeliveryModal, setShowEditDeliveryModal] = useState(false);
  const [editDeliveryOption, setEditDeliveryOption] = useState('');
  const [editCustomDeliveryOption, setEditCustomDeliveryOption] = useState('');
  const [editCustomerDeliveryAddress, setEditCustomerDeliveryAddress] = useState('');
  const [isSavingDeliveryOption, setIsSavingDeliveryOption] = useState(false);

  // Campaign-related state - initialize from SSR props
  const [campaignContext, setCampaignContext] = useState(initialCampaignContext || null);
  const [showJoinCampaignModal, setShowJoinCampaignModal] = useState(false);
  const [campaignData, setCampaignData] = useState(initialCampaignData || null);
  const [fallbackSplit, setFallbackSplit] = useState(initialSchoolData?.split || null);

  // Onboarding state
  const [showOnboardingTooltip, setShowOnboardingTooltip] = useState(false);
  const [tooltipTarget, setTooltipTarget] = useState(null);
  const ordersTableRef = useRef(null);

  // Use onboarding hook
  const {
    progress,
    currentStep,
    isLoading: onboardingLoading,
    markStepComplete,
    getStepContent
  } = useOnboarding();

  // Optimized prefetching for instant return navigation
  useEffect(() => {
    // Aggressive prefetching
    router.prefetch('/dashboard');
    router.prefetch('/dashboard');
    const timeoutId = setTimeout(() => {
      router.prefetch('/dashboard');
    }, 100);

    // Prefetch on hover/touch
    const backLink = document.querySelector('a[href="/dashboard"], div[onclick*="dashboard"]');
    if (backLink) {
      const prefetchDashboard = () => router.prefetch('/dashboard');
      backLink.addEventListener('mouseenter', prefetchDashboard, { once: true, passive: true });
      backLink.addEventListener('touchstart', prefetchDashboard, { once: true, passive: true });
    }

    return () => clearTimeout(timeoutId);
  }, [router]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleCampaignSwitch = useCallback((campaignId) => {
    window.location.reload(); // Simple refresh for now
  }, []);

  const handleJoinCampaignClick = useCallback(() => {
    setShowJoinCampaignModal(true);
  }, []);

  const handleJoinCampaignSuccess = useCallback((campaign) => {
    setShowJoinCampaignModal(false);
    window.location.reload();
  }, []);

  const handleBackNavigation = useCallback((e) => {
    e.preventDefault();
    router.push('/dashboard');
  }, [router]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopy = useCallback((text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success('Copié dans le presse-papier!');
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleDeleteOrder = useCallback(async () => {
    if (!selectedOrderId || isDeletingOrder) {
      return;
    }

    setIsDeletingOrder(true);
    try {
      console.log('Attempting to delete order with ID:', selectedOrderId);
      const response = await fetch(`/api/command/${selectedOrderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setOrders(orders.filter(order => order._id !== selectedOrderId));
        setShowPopup(false);
        setSelectedOrderId(null);
        toast.success('Commande supprimée avec succès.');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la suppression de la commande');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.message);
      toast.error(`Une erreur est survenue lors de la suppression de la commande: ${error.message}`);
    } finally {
      setIsDeletingOrder(false);
    }
  }, [selectedOrderId, isDeletingOrder, orders]);

  const handleCloseJoinCampaignModal = useCallback(() => {
    setShowJoinCampaignModal(false);
  }, []);

  // Memoize campaign selector props
  const campaignSelectorProps = useMemo(() => ({
    onCampaignSwitch: handleCampaignSwitch,
    onJoinCampaign: handleJoinCampaignClick,
    initialCampaigns: initialCampaignContext?.campaigns || [],
    initialActiveCampaignId: initialCampaignContext?.activeCampaignId || null
  }), [handleCampaignSwitch, handleJoinCampaignClick, initialCampaignContext]);

  const schoolId = session?.user?.school;
  const name = session?.user?.name;

  // Get terminology based on organization type
  const terminology = useMemo(() => {
    const orgType = school?.organizationType || campaignData?.organizationType || 'school';
    return getTerminology(orgType);
  }, [school?.organizationType, campaignData?.organizationType]);

  // Campaign end date (used for messaging and CTA availability)
  const campaignEndDateInfo = useMemo(() => {
    const result = {
      raw: null,
      short: null,
      long: null,
    };

    const candidateDate = (() => {
      if (campaignContext?.campaigns?.length) {
        const activeCampaign = campaignContext.campaigns.find(c => c.isActive) || campaignContext.campaigns[0];
        if (activeCampaign?.endDate) {
          return activeCampaign.endDate;
        }
      }
      if (campaignData?.endDate) {
        return campaignData.endDate;
      }
      if (school?.finCampagne) {
        return school.finCampagne;
      }
      return null;
    })();

    if (!candidateDate) {
      return result;
    }

    try {
      const parsedDate = new Date(candidateDate);
      if (Number.isNaN(parsedDate.getTime())) {
        console.warn('Unable to parse campaign end date:', candidateDate);
        return result;
      }

      result.raw = parsedDate;
      result.short = format(parsedDate, 'dd/MM/yyyy', { locale: fr });
      result.long = format(parsedDate, 'd MMMM yyyy', { locale: fr });
    } catch (error) {
      console.error('Error formatting campaign end date:', error);
    }

    return result;
  }, [campaignContext?.campaigns, campaignData?.endDate, school?.finCampagne]);

  // Fetch School Data
  const fetchSchoolData = useCallback(async (schoolId) => {
    if (!schoolId) return;

    try {
      const response = await fetch(`/api/schools/${schoolId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch school data')
      }
      const schoolData = await response.json()
      setSchool(schoolData)
      setSchoolFetchFailed(false)
    } catch (error) {
      console.error('Error fetching school data:', error)
      // Fallback so the page can still work without school API (e.g., offline/DB issues)
      setSchool({
        _id: schoolId,
        name: 'École',
        code: 'N/A',
        // Provide sensible defaults for calculations/UI
        split: {
          studentBenefit: 85.6,
          organizationBenefit: 9.4,
          raffleBenefit: 5.0,
        },
        // Dates used by CommandeButton to compute window; default to now
        finCampagne: new Date().toISOString(),
        dateDeLivraison: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      setSchoolFetchFailed(true)
    }
  }, [])

  // Fetch campaign context and school data - only if not provided via SSR
  useEffect(() => {
    if (initialCampaignContext || initialSchoolData) return; // Skip if SSR data exists

    const fetchCampaignContext = async () => {
      if (!session?.user) return;

      try {
        const response = await fetch('/api/users/campaigns');
        if (response.ok) {
          const data = await response.json();
          setCampaignContext(data);

          let schoolIdFromContext = null;
          if (data.campaigns && data.campaigns.length > 0) {
            const firstCampaign = data.campaigns[0];
            schoolIdFromContext = firstCampaign.school?._id || firstCampaign.school;
          } else {
            schoolIdFromContext = session?.user?.school;
          }

          if (schoolIdFromContext) {
            fetchSchoolData(schoolIdFromContext);
          }
        }
      } catch (error) {
        console.error('Error fetching campaign context:', error);
      }
    };

    fetchCampaignContext();
  }, [session, fetchSchoolData, initialCampaignContext, initialSchoolData]);

  // Fetch campaign data for profit calculations
  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!school) return;

      try {
        // First, try to get campaignId from orders (most reliable)
        let campaignId = null;
        if (orders && orders.length > 0) {
          // Find the first order with a campaignId
          const orderWithCampaign = orders.find(order => order.campaignId);
          campaignId = orderWithCampaign?.campaignId;
        }

        // Fallback to campaignContext if no campaignId in orders
        if (!campaignId && campaignContext) {
          campaignId = campaignContext.activeCampaignId ||
            campaignContext.campaigns?.find(c => c.isActive)?._id ||
            campaignContext.campaigns?.[0]?._id;
        }

        const schoolId = campaignContext?.schoolId || session?.user?.school || school?._id;

        // Only fetch if we have either schoolId or campaignId
        if (!schoolId && !campaignId) {
          console.warn('No schoolId or campaignId available, skipping campaign data fetch');
          // Set fallback split from school data
          setFallbackSplit(school?.split || {
            studentBenefit: 85.6,
            organizationBenefit: 9.4,
            raffleBenefit: 5.0
          });
          return;
        }

        const { campaign, fallbackSplit } = await getCampaignDataWithFallback(
          schoolId,
          school,
          campaignId
        );

        setCampaignData(campaign);
        setFallbackSplit(fallbackSplit);
      } catch (error) {
        console.error('Error fetching campaign data:', error);
        // Set fallback split from school data
        setFallbackSplit(school?.split || {
          studentBenefit: 85.6,
          organizationBenefit: 9.4,
          raffleBenefit: 5.0
        });
      }
    };

    fetchCampaignData();
  }, [school, campaignContext, session, orders]);

  // Campaign handlers

  useEffect(() => {


    const fetchOrders = async () => {
      // Don't fetch if session is still loading
      if (status === 'loading') {
        return;
      }

      // Don't fetch if there's no session
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // Skip if we have initial orders from SSR
      if (initialOrders && initialOrders.length >= 0) {
        setLoading(false);
        return;
      }

      try {
        // Get active campaign ID from campaign context
        let campaignId = null;
        if (campaignContext?.mode === 'campaign') {
          if (campaignContext.activeCampaignId) {
            campaignId = campaignContext.activeCampaignId;
          } else if (campaignContext?.campaigns?.length > 0) {
            const activeCampaign = campaignContext.campaigns.find(c => c.isActive || c.isActiveCampaign) || campaignContext.campaigns[0];
            campaignId = activeCampaign?._id;
          }
        }

        const apiUrl = campaignId
          ? `/api/commandes?campaignId=${campaignId}`
          : '/api/commandes';

        console.log('Fetching orders with campaignId:', campaignId);
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          console.log('Orders fetched:', data.length, 'orders from campaign:', campaignId);
          setOrders(data);
        } else {
          throw new Error('Erreur lors de la récupération des commandes');
        }
      } catch (error) {
        setError(error.message);
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    const getNewOrderId = async () => {
      try {
        const response = await fetch('/api/orderStudent'); // Utilisation de l'API OrderStudent pour générer orderId
        if (response.ok) {
          const data = await response.json();
          setNewOrderId(data.orderId); // Supposons que l'API retourne le nouvel orderId
        } else {
          throw new Error('Erreur lors de la création de orderId');
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchOrders();
    // La génération de orderId doit se faire lors de la création de la commande, pas au chargement de la page
    // Donc, nous pouvons supprimer ou commenter cette partie si non nécessaire
    // getNewOrderId();
  }, [session, status, campaignContext]);

  // Onboarding logic for orders page
  useEffect(() => {
    if (!onboardingLoading && currentStep?.key === 'viewedOrders') {
      setShowOnboardingTooltip(true);
      setTooltipTarget(ordersTableRef.current);
    } else {
      setShowOnboardingTooltip(false);
    }
  }, [currentStep, onboardingLoading]);

  // Onboarding handlers
  const handleOnboardingNext = async () => {
    if (currentStep?.key === 'viewedOrders') {
      const success = await markStepComplete('viewedOrders', true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  };

  const handleOnboardingSkip = async () => {
    if (currentStep?.key === 'viewedOrders') {
      const success = await markStepComplete('viewedOrders', true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  };

  const handleOnboardingClose = () => {
    setShowOnboardingTooltip(false);
  };

  // Check if any order has discounts enabled and applied
  const showDiscountColumn = useMemo(() => {
    return orders.some(order => {
      const storeHasDiscounts = order.store?.discountEnabled !== false;
      const originalSubtotal = order.products.reduce((sum, prod) => {
        const unitPrice = prod.productPrice || prod.price || 0;
        return sum + (unitPrice * prod.quantity);
      }, 0);
      const discountAmount = Math.max(0, originalSubtotal - order.totalAmount);
      return discountAmount > 0 && storeHasDiscounts;
    });
  }, [orders]);

  // Fonction pour calculer le total des commandes payées (excluding test orders)
  function calculateTotalOrders(orders) {
    if (!orders || orders.length === 0) {
      return 0;
    }
    // Only count paid orders that are NOT test orders
    const paidOrders = orders.filter(order =>
      order.status === 'Payé' && !order.isTest
    );
    return paidOrders.reduce((total, order) => total + order.totalAmount, 0);
  }

  // Fonction pour gérer le changement de statut d'une commande
  const handleStatusChange = async (orderIds, newStatus) => {
    try {
      // Convert single orderId to array if needed
      const orderIdsArray = Array.isArray(orderIds) ? orderIds : [orderIds];

      const updatePromises = orderIdsArray.map(async (orderId) => {
        const orderToUpdate = orders.find(order => order.orderId === orderId);
        if (!orderToUpdate) return;

        const response = await fetch(`/api/command/${orderToUpdate._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erreur lors de la mise à jour du statut');
        }

        return orderToUpdate._id;
      });

      const updatedOrderIds = await Promise.all(updatePromises);

      setOrders(orders.map(order =>
        updatedOrderIds.includes(order._id) ? { ...order, status: newStatus } : order
      ));
    } catch (error) {
      setError(error.message);
    }
  };

  // Fonction pour gérer la mise à jour des notes de distribution
  const handleDistributionNotesChange = async (orderId, notes) => {
    try {
      const orderToUpdate = orders.find(order => order._id === orderId);
      if (!orderToUpdate) return;

      // Optimistic update
      setOrders(orders.map(order =>
        order._id === orderId ? { ...order, distributionNotes: notes } : order
      ));

      const response = await fetch(`/api/command/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributionNotes: notes }),
      });

      if (!response.ok) {
        // Revert on error
        setOrders(orders.map(order =>
          order._id === orderId ? { ...order, distributionNotes: orderToUpdate.distributionNotes } : order
        ));
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la mise à jour des notes');
      }
    } catch (error) {
      setError(error.message);
      toast.error('Erreur lors de la sauvegarde des notes');
    }
  };

  // Fonction pour ouvrir le modal d'édition de l'option de livraison
  const handleEditDeliveryOption = (order) => {
    setEditingDeliveryOption(order);
    setEditDeliveryOption(order.deliveryOption || '');
    setEditCustomDeliveryOption(order.customDeliveryOption || '');
    setEditCustomerDeliveryAddress(order.customerDeliveryAddress || '');
    setShowEditDeliveryModal(true);
  };

  // Fonction pour sauvegarder l'option de livraison modifiée
  const handleSaveDeliveryOption = async () => {
    if (!editingDeliveryOption || isSavingDeliveryOption) return;

    // Determine final delivery option value
    let finalDeliveryOption = editDeliveryOption;
    let finalCustomDeliveryOption = editCustomDeliveryOption;
    let finalCustomerDeliveryAddress = editCustomerDeliveryAddress;

    // If custom text was entered without selecting an option, use it as the delivery option
    if (!editDeliveryOption && editCustomDeliveryOption) {
      finalDeliveryOption = 'Autre';
      finalCustomDeliveryOption = editCustomDeliveryOption;
    }

    // If "__custom__" was selected, use the custom text
    if (editDeliveryOption === '__custom__') {
      if (editCustomDeliveryOption) {
        finalDeliveryOption = 'Autre';
        finalCustomDeliveryOption = editCustomDeliveryOption;
      } else {
        toast.error('Veuillez entrer une option personnalisée');
        return;
      }
    }

    setIsSavingDeliveryOption(true);
    try {
      const orderToUpdate = orders.find(order => order._id === editingDeliveryOption._id);
      if (!orderToUpdate) return;

      // Optimistic update
      setOrders(orders.map(order =>
        order._id === editingDeliveryOption._id
          ? {
            ...order,
            deliveryOption: finalDeliveryOption,
            customDeliveryOption: finalCustomDeliveryOption,
            customerDeliveryAddress: finalCustomerDeliveryAddress,
          }
          : order
      ));

      const response = await fetch(`/api/command/${editingDeliveryOption._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryOption: finalDeliveryOption,
          customDeliveryOption: finalCustomDeliveryOption,
          customerDeliveryAddress: finalCustomerDeliveryAddress,
        }),
      });

      if (!response.ok) {
        // Revert on error
        setOrders(orders.map(order =>
          order._id === editingDeliveryOption._id
            ? {
              ...order,
              deliveryOption: orderToUpdate.deliveryOption,
              customDeliveryOption: orderToUpdate.customDeliveryOption,
              customerDeliveryAddress: orderToUpdate.customerDeliveryAddress,
            }
            : order
        ));
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la mise à jour de l\'option de livraison');
      }

      toast.success('Option de livraison mise à jour avec succès');
      setShowEditDeliveryModal(false);
      setEditingDeliveryOption(null);
      setEditDeliveryOption('');
      setEditCustomDeliveryOption('');
      setEditCustomerDeliveryAddress('');
    } catch (error) {
      setError(error.message);
      toast.error('Erreur lors de la sauvegarde de l\'option de livraison');
    } finally {
      setIsSavingDeliveryOption(false);
    }
  };

  // Fonction pour gérer le passage de la commande
  const handlePlaceOrder = async () => {
    if (isSubmitting) return; // Prevent multiple submissions

    try {
      if (!session || !session.user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Get schoolId from multiple possible sources
      let schoolId = null;

      // 1. Try from school object (already loaded in state)
      if (school?._id) {
        schoolId = school._id;
      }

      // 2. Try to get schoolId from campaign context campaigns
      if (!schoolId && campaignContext?.campaigns && campaignContext.campaigns.length > 0) {
        const firstCampaign = campaignContext.campaigns[0];
        schoolId = firstCampaign.school?._id || firstCampaign.school;
      }

      // 3. Fallback to campaignContext.schoolId if available
      if (!schoolId && campaignContext?.schoolId) {
        schoolId = campaignContext.schoolId;
      }

      // 4. Fallback to session.user.school
      if (!schoolId) {
        schoolId = session.user.school;
      }

      // 5. Try to get from orders if they exist (last resort)
      if (!schoolId && orders.length > 0) {
        schoolId = orders[0].school;
      }

      if (!schoolId) {
        console.error('SchoolId not found:', {
          school: school?._id,
          campaignContext: campaignContext?.schoolId || campaignContext?.campaigns?.[0]?.school,
          session: session.user.school,
          orders: orders.length > 0 ? orders[0].school : 'no orders'
        });
        throw new Error('Aucune organisation associée à l\'utilisateur.');
      }

      // Check if there are any orders not marked as "Payé"
      const unpaidOrders = orders.filter(order => order.status !== 'Payé' && order.status !== 'Commandé' && order.status !== 'Complété' && !order.isTest);
      if (unpaidOrders.length > 0) {
        toast.error('Assurez-vous que les commandes que vous voulez passer soient au statut (payé) pour qu\'elles puissent être envoyées.');
        return;
      }

      // Créer une commande étudiante - EXCLUDE test orders from final order
      const paidOrders = orders.filter(order =>
        order.status === 'Payé' && !order.isTest // Exclude test orders
      );
      const testOrders = orders.filter(order => order.status === 'Payé' && order.isTest);

      // Check if campaign is in test mode
      const isTest = campaignData ? isTestCampaign(campaignData) : false;

      if (testOrders.length > 0) {
        console.log(`Excluding ${testOrders.length} test order(s) from final order`);
        toast.info(`${testOrders.length} commande(s) TEST exclue(s) de la commande finale. Elles ne seront pas envoyées.`, {
          duration: 5000
        });
      }

      // Allow preview even if only test orders exist (for test campaigns or school_managers in preview mode)
      // This allows school_managers to preview orders even when they only have test orders
      if (paidOrders.length === 0) {
        // If we have test orders and we're in a test campaign or preview mode, allow preview
        const hasTestOrders = testOrders.length > 0;
        const isPreviewMode = typeof window !== 'undefined' &&
          localStorage.getItem('viewMode') === 'student_preview' &&
          session?.user?.role === 'school_manager';

        if (hasTestOrders && (isTest || isPreviewMode)) {
          // Allow preview with test orders only - they'll be excluded from final order
          console.log('Allowing preview with test orders only (test campaign or preview mode)');
        } else {
          toast.error('Aucune commande payée disponible (les commandes TEST sont exclues).');
          return;
        }
      }

      // Open the order placement modal instead of directly creating the order
      setShowOrderPlacementModal(true);
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
      console.log(error);
    }
  };

  // Handler for when order is placed from modal
  const handleOrderPlaced = async (orderData) => {
    try {
      // Update status of paid orders to 'Commandé'
      const paidOrders = orders.filter(order =>
        order.status === 'Payé' && !order.isTest
      );

      if (paidOrders.length > 0) {
        await handleStatusChange(
          paidOrders.map(order => order.orderId),
          'Commandé'
        );
      }

      // Refresh orders - use the correct API endpoint
      // Payment instructions are now shown in the modal, so we don't show popup here
      let campaignId = null;
      if (campaignContext?.mode === 'campaign') {
        if (campaignContext.activeCampaignId) {
          campaignId = campaignContext.activeCampaignId;
        } else if (campaignContext?.campaigns?.length > 0) {
          const activeCampaign = campaignContext.campaigns.find(c => c.isActive || c.isActiveCampaign) || campaignContext.campaigns[0];
          campaignId = activeCampaign?._id;
        }
      }

      const apiUrl = campaignId
        ? `/api/commandes?campaignId=${campaignId}`
        : '/api/commandes';

      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error handling order placement:', error);
    }
  };

  // Fonction pour fermer le popup
  const handlePopupClose = () => {
    setShowPopup(false);
  };

  const totalSales = calculateTotalOrders(orders);
  const amountToPay = (totalSales * 0.9).toFixed(2); // Ajustez selon votre logique


  // Function to calculate the student profit for an order
  const calculateStudentProfit = (products) => {
    if (!campaignData) {
      // Fallback to simple calculation if no campaign data
      return products
        .map((product) => (product.productPrice - product.productCost) * product.quantity)
        .reduce((acc, profit) => acc + profit, 0);
    }

    let totalStudentProfit = 0;

    products.forEach(product => {
      if (campaignData.profitSplits && campaignData.profitSplitType === 'absolute') {
        // Handle both populated and non-populated productId
        const productId = product.product?._id?.toString() || product.product?.toString();
        const profitSplit = campaignData.profitSplits.find(ps => {
          const psProductId = ps.productId?._id?.toString() || ps.productId?.toString();
          return psProductId === productId;
        });

        if (profitSplit) {
          const studentCash = profitSplit.studentCash || 1.00;
          const studentSchoolAccount = profitSplit.studentSchoolAccount || 1.00;
          const totalStudentProfitPerUnit = studentCash + studentSchoolAccount;
          totalStudentProfit += totalStudentProfitPerUnit * product.quantity;
        } else {
          // Fallback to percentage calculation
          const profit = (product.productPrice - product.productCost) * product.quantity;
          const studentPercentage = fallbackSplit?.studentBenefit || 85.6;
          totalStudentProfit += profit * (studentPercentage / 100);
        }
      } else {
        // Use percentage-based calculation
        const profit = (product.productPrice - product.productCost) * product.quantity;
        const studentPercentage = fallbackSplit?.studentBenefit || 85.6;
        totalStudentProfit += profit * (studentPercentage / 100);
      }
    });

    return totalStudentProfit;
  };

  // Fonction pour copier du texte dans le presse-papier
  const copyToClipboard = (text, fieldName) => {
    handleCopy(text, fieldName);
  };
  const handleCloseWithConfirmation = () => {
    setShowPaymentConfirmation(true);
  };

  const handleConfirmPayment = () => {
    setShowPaymentConfirmation(false);
    setShowPopup(false);
  };

  const handleCancelPayment = () => {
    setShowPaymentConfirmation(false);
  };

  // Calculate if we're in the ordering period
  // Students can order 2 days before the campaign end date until 1 day after
  // This hook must be called before any early returns
  const isOrderingPeriod = useMemo(() => {
    if (!campaignEndDateInfo?.raw) return false;

    // Allow bypass for testing if TEST_MODE is enabled or if URL has ?test=true
    const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true' ||
      (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('test') === 'true');
    if (isTestMode) return true;

    const finCampagne = new Date(campaignEndDateInfo.raw);
    const currentDate = new Date();

    // Set time to start of day for comparison
    const campaignEndStart = new Date(finCampagne);
    campaignEndStart.setHours(0, 0, 0, 0);

    // Calculate ordering window: 2 days before until 1 day after
    const orderingStart = new Date(campaignEndStart);
    orderingStart.setDate(orderingStart.getDate() - 2); // 2 days before

    const orderingEnd = new Date(campaignEndStart);
    orderingEnd.setDate(orderingEnd.getDate() + 1); // 1 day after
    orderingEnd.setHours(23, 59, 59, 999); // End of day

    const todayStart = new Date(currentDate);
    todayStart.setHours(0, 0, 0, 0);

    // Check if current date is within the ordering window
    return todayStart.getTime() >= orderingStart.getTime() &&
      currentDate.getTime() <= orderingEnd.getTime();
  }, [campaignEndDateInfo?.raw]);

  // Show loading if session is loading or if we're still fetching orders
  if (status === 'loading' || loading) {
    return <p>Chargement des commandes...</p>;
  }

  console.log('Rendering orders page. Orders count:', orders.length, 'Orders:', orders);

  if (error) {
    return <p>Erreur: {error}</p>;
  }

  if (!session) {
    return <p>Vous devez être connecté pour voir vos commandes.</p>;
  }

  // If school fetch failed, we proceed with fallback and show a light warning below the header

  const isTest = campaignData ? isTestCampaign(campaignData) : false;

  return (
    <Layout>
      <div className="pt-16 md:pt-20 overflow-x-hidden max-w-full">
        {isTest && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-orange-900 mb-1">
                  ⚠️ MODE TEST
                </h3>
                <p className="text-sm text-orange-800">
                  Les données affichées sont en mode test. Les commandes ne seront pas définitives jusqu'à l'approbation de la campagne.
                </p>
              </div>
            </div>
          </div>
        )}
        <Card className="mt-8">
          <CardHeader className="space-y-4">
            <Link href="/dashboard" passHref prefetch={true}>
              <div
                className="flex items-center space-x-2 cursor-pointer"
                onClick={handleBackNavigation}
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Retour au tableau de bord</span>
              </div>
            </Link>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Mes commandes</CardTitle>
                <CardDescription>Gérez les commandes de vos clients</CardDescription>
                {schoolFetchFailed && (
                  <p className="text-yellow-700 text-sm mt-2">Impossible de charger les données de l'école (connexion DB). Affichage en mode dégradé.</p>
                )}
              </div>
              <CampaignSelector {...campaignSelectorProps} />
            </div>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Aucune commande trouvée</p>
                <p className="text-gray-400 text-sm mt-2">Vos commandes apparaîtront ici une fois créées</p>
              </div>
            ) : (
              <>
                {/* Order Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-xs text-blue-600 font-medium mb-1">Total commandes</div>
                    <div className="text-xl font-bold text-blue-700">{orders.filter(o => !o.isTest).length}</div>
                    {orders.filter(o => o.isTest).length > 0 && (
                      <div className="text-[10px] text-blue-500 mt-1">+{orders.filter(o => o.isTest).length} TEST</div>
                    )}
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-xs text-green-600 font-medium mb-1">Payées</div>
                    <div className="text-xl font-bold text-green-700">
                      {orders.filter(o => o.status === 'Payé' && !o.isTest).length}
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="text-xs text-purple-600 font-medium mb-1">Total revenus</div>
                    <div className="text-xl font-bold text-purple-700">
                      {orders
                        .filter(o => !o.isTest)
                        .reduce((sum, o) => {
                          const donations = (o.studentDonation || o.tip || 0) + (o.schoolDonation || 0);
                          return sum + o.totalAmount + donations;
                        }, 0)
                        .toFixed(2)}$</div>
                    {orders.filter(o => o.status !== 'Payé' && !o.isTest).length > 0 && (
                      <div className="text-[10px] text-purple-500 mt-1">
                        {orders.filter(o => o.status === 'Payé' && !o.isTest).length > 0 ? 'Inclut' : 'En attente de paiement'}
                      </div>
                    )}
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="text-xs text-orange-600 font-medium mb-1">Total profit</div>
                    <div className="text-xl font-bold text-orange-700">
                      {orders
                        .filter(o => !o.isTest)
                        .reduce((sum, o) => {
                          const profitDetails = calculateOrderProfitsDetailed(o, campaignData, fallbackSplit);
                          const donation = o.studentDonation || o.tip || 0;
                          return sum + profitDetails.totalStudentBenefit + donation;
                        }, 0)
                        .toFixed(2)}$</div>
                    {orders.filter(o => o.status !== 'Payé' && !o.isTest).length > 0 && (
                      <div className="text-[10px] text-orange-500 mt-1">
                        {orders.filter(o => o.status === 'Payé' && !o.isTest).length > 0 ? 'Inclut' : 'En attente de paiement'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs">
                    📄 Imprimer
                  </Button>
                  <div className="text-xs text-gray-500">
                    {orders.length} commande{orders.length > 1 ? 's' : ''} affichée{orders.length > 1 ? 's' : ''}
                  </div>
                </div>

                {/* Instructions sur les statuts des commandes */}
                <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                  <h2 className="text-2xl font-bold mb-4 text-gray-800">📝 Statut des commandes</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">🕓 En attente</h3>
                      <p className="text-gray-700">
                        Ce statut est attribué automatiquement lorsqu'un client passe une commande.
                        Vous devriez recevoir un virement Interac.
                        {!initialStoreInfo?.autoDeposit && (
                          <>
                            <br />
                            👉 Si vous n'avez pas activé les dépôts automatiques, la réponse de sécurité du virement sera <strong>Cmd-{'{numéro de commande}'}</strong> (ex: Cmd-1, Cmd-12).
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">💰 Payé</h3>
                      <p className="text-gray-700">
                        Une fois le paiement reçu, mettez le statut à Payé.
                        Cela confirme que l'argent a bien été reçu et vous permettra plus tard d'envoyer votre commande.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">📦 Commandé</h3>
                      <p className="text-gray-700 mb-2">
                        (
                        Disponible dès 2 jours avant jusqu'à 1 jour après le{' '}
                        {campaignEndDateInfo.short || 'jour de fin de campagne'}
                        {' '}(pour les retardataires)
                        )
                        <br />
                        Quand vous cliquez sur Passer la commande, toutes les commandes avec le statut Payé sont transmises.
                        Le statut passe automatiquement à Commandé.
                        Vous recevrez ensuite les instructions pour effectuer le transfert Interac.
                      </p>
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-2">
                        <p className="text-sm text-gray-700">
                          ✅ Assurez-vous d'avoir reçu :
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-700 ml-2 mt-1">
                          <li>la confirmation de commande</li>
                          <li>la confirmation du transfert Interac</li>
                        </ul>
                        <p className="text-sm text-gray-700 mt-2">
                          ❌ Si l'une d'elles est manquante, contactez-nous à <a href="mailto:campagne@jappuie.ca" className="text-blue-600 hover:text-blue-800 underline">campagne@jappuie.ca</a>.
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">✅ Complété</h3>
                      <p className="text-gray-700">
                        Ce statut vous aide à suivre facilement la distribution aux clients.
                        Mettez une commande à compléter dès qu'elle est préparée ou remise.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tableau des commandes */}
                <motion.div
                  ref={ordersTableRef}
                  id="orderTable"
                  animate={currentStep?.key === 'viewedOrders' ? {
                    scale: [1, 1.02, 1],
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: currentStep?.key === 'viewedOrders' ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                >
                  <div className="overflow-x-auto">
                    <Table className={`mt-6 ${currentStep?.key === 'viewedOrders' ? 'ring-4 ring-blue-500 rounded-lg' : ''}`}>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="py-2 text-xs font-semibold sticky left-0 bg-gray-50 z-10">Id</TableHead>
                          <TableHead className="py-2 text-xs font-semibold">Client</TableHead>
                          <TableHead className="py-2 text-xs font-semibold">Email</TableHead>
                          <TableHead className="py-2 text-xs font-semibold">Téléphone</TableHead>
                          <TableHead className="py-2 text-xs font-semibold min-w-[180px]">Produit(s)</TableHead>
                          <TableHead className="py-2 text-xs font-semibold text-center">Dons ({terminology.participant})</TableHead>
                          <TableHead className="py-2 text-xs font-semibold text-center">Dons ({terminology.organization})</TableHead>
                          {showDiscountColumn && (
                            <TableHead className="py-2 text-xs font-semibold text-center">Rabais</TableHead>
                          )}
                          <TableHead className="py-2 text-xs font-semibold text-right font-bold">Total</TableHead>
                          <TableHead className="py-2 text-xs font-semibold text-right text-green-700">Profit</TableHead>
                          <TableHead className="py-2 text-xs font-semibold hidden lg:table-cell">Date</TableHead>
                          <TableHead className="py-2 text-xs font-semibold">Statut</TableHead>
                          <TableHead className="py-2 text-xs font-semibold min-w-[160px]">Option de livraison</TableHead>
                          <TableHead className="py-2 text-xs font-semibold sticky right-0 bg-gray-50 z-10">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => {
                          const studentDonation = order.studentDonation || order.tip || 0;
                          const schoolDonation = order.schoolDonation || 0;
                          const totalDonations = studentDonation + schoolDonation;

                          // Calculate original subtotal before discount
                          const originalSubtotal = order.products.reduce((sum, prod) => {
                            const unitPrice = prod.productPrice || prod.price || 0;
                            return sum + (unitPrice * prod.quantity);
                          }, 0);

                          // Calculate discount amount (difference between original subtotal and stored totalAmount)
                          const discountAmount = Math.max(0, originalSubtotal - order.totalAmount);

                          // Check if store has discounts enabled
                          const storeHasDiscounts = order.store?.discountEnabled !== false; // Default to true if not set
                          const hasDiscount = discountAmount > 0 && storeHasDiscounts;

                          // Calculate total with donations
                          const totalWithDonations = order.totalAmount + totalDonations;

                          // Calculate student profit using helper function which accounts for discount
                          const profitDetails = calculateOrderProfitsDetailed(order, campaignData, fallbackSplit);
                          const studentProfit = profitDetails.totalStudentBenefit + studentDonation;

                          return (
                            <TableRow key={order._id} className={`${order.isTest ? 'bg-orange-50/50' : ''} hover:bg-blue-50/30 transition-colors border-b border-gray-100`}>
                              <TableCell className="py-2 sticky left-0 bg-white z-10 border-r border-gray-200">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-mono font-semibold text-gray-700">#{order.orderId}</span>
                                  {order.isTest && (
                                    <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 text-[10px] px-1 py-0">
                                      <AlertCircle className="h-2 w-2 mr-0.5" />
                                      TEST
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-xs font-medium">{order.customerName}</TableCell>
                              <TableCell className="py-2 text-xs text-gray-600 truncate max-w-[180px]" title={order.customerEmail}>
                                {order.customerEmail}
                              </TableCell>
                              <TableCell className="py-2 text-xs text-gray-600">{order.phoneNumber}</TableCell>
                              <TableCell className="py-2 text-xs">
                                <div className="space-y-0.5">
                                  {order.products.map((prod, index) => {
                                    // Handle both productPrice (from Order schema) and price (from API)
                                    const unitPrice = prod.productPrice || prod.price || 0;
                                    const productTotal = unitPrice * prod.quantity;
                                    return (
                                      <div key={index} className="flex items-center justify-between gap-2 text-xs">
                                        <span className="text-gray-700 flex-1 min-w-0">
                                          <span className="truncate">{prod.productName}</span>
                                          <span className="text-gray-500 ml-1">×{prod.quantity}</span>
                                        </span>
                                        <span className="text-gray-600 font-medium whitespace-nowrap ml-2">
                                          {productTotal.toFixed(2)}$
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {order.products.length > 1 && (
                                    <div className="pt-0.5 mt-0.5 border-t border-gray-200">
                                      <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
                                        <span>Sous-total produits</span>
                                        <span className="font-medium">{originalSubtotal.toFixed(2)}$</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-xs text-center">
                                {studentDonation > 0 ? (
                                  <span className="font-medium text-blue-700">{studentDonation.toFixed(2)}$</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2 text-xs text-center">
                                {schoolDonation > 0 ? (
                                  <span className="font-medium text-purple-700">{schoolDonation.toFixed(2)}$</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              {showDiscountColumn && (
                                <TableCell className="py-2 text-xs text-center">
                                  {hasDiscount ? (
                                    <span className="font-medium text-green-700">-{discountAmount.toFixed(2)}$</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="py-2 text-xs text-right">
                                <div className="flex flex-col items-end">
                                  <span className={`font-bold text-base ${order.isTest ? 'text-gray-500' : 'text-gray-900'}`}>
                                    {totalWithDonations.toFixed(2)}$
                                  </span>
                                  {totalDonations > 0 && (
                                    <span className="text-[10px] text-gray-500 mt-0.5">
                                      (dont {totalDonations.toFixed(2)}$ dons)
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-xs text-right">
                                <span className="font-semibold text-green-700 text-sm">
                                  {studentProfit.toFixed(2)}$
                                </span>
                              </TableCell>
                              <TableCell className="py-2 text-xs text-gray-600 hidden lg:table-cell">
                                {new Date(order.createdAt).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${order.status === 'En attente' ? 'bg-yellow-500' :
                                    order.status === 'Payé' ? 'bg-green-500' :
                                      order.status === 'Commandé' ? 'bg-blue-500' :
                                        order.status === 'Complété' ? 'bg-gray-500' :
                                          'bg-gray-300'
                                    }`} title={order.status}></span>
                                  {order.status === 'Commandé' || order.status === 'Complété' ? (
                                    // Allow changing between Commandé and Complété (can go back if mistake)
                                    <Select
                                      value={order.status}
                                      onValueChange={(value) => handleStatusChange(order.orderId, value)}
                                    >
                                      <SelectTrigger className="h-7 text-xs border-gray-300 w-[110px]">
                                        <SelectValue placeholder="Statut" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white">
                                        <SelectItem value="Commandé" className="text-xs">
                                          <div className="flex items-center">
                                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                                            Commandé
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="Complété" className="text-xs">
                                          <div className="flex items-center">
                                            <span className="inline-block w-2 h-2 rounded-full bg-gray-500 mr-2"></span>
                                            Complété
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    // Allow changing between En attente and Payé
                                    <Select
                                      value={order.status}
                                      onValueChange={(value) => handleStatusChange(order.orderId, value)}
                                    >
                                      <SelectTrigger className="h-7 text-xs border-gray-300 w-[110px]">
                                        <SelectValue placeholder="Statut" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white">
                                        <SelectItem value="En attente" className="text-xs">
                                          <div className="flex items-center">
                                            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                                            En attente
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="Payé" className="text-xs">
                                          <div className="flex items-center">
                                            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                            Payé
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-xs min-w-[160px]">
                                <div className="flex flex-col gap-1">
                                  {order.deliveryOption ? (
                                    <>
                                      <span className="font-medium text-gray-800 text-xs">{order.deliveryOption}</span>
                                      {order.deliveryOption === 'Autre' && order.customDeliveryOption && (
                                        <span className="text-gray-600 text-[10px] italic">({order.customDeliveryOption})</span>
                                      )}
                                      {order.deliveryOption === 'Livraison (si près de chez moi)' && order.customerDeliveryAddress && (
                                        <div className="text-gray-600 text-[10px] mt-1">
                                          <span className="font-medium">Adresse livraison:</span> {order.customerDeliveryAddress}
                                        </div>
                                      )}
                                    </>
                                  ) : order.distributionNotes ? (
                                    <span className="text-gray-600 italic text-xs">{order.distributionNotes}</span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 sticky right-0 bg-white z-10 border-l border-gray-200">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditDeliveryOption(order)}
                                    className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="Modifier l'option de livraison"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedOrderId(order._id)}
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Supprimer la commande"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </motion.div>

                <CommandeButton
                  school={school}
                  campaignContext={campaignContext}
                  handlePlaceOrder={handlePlaceOrder}
                  isSubmitting={isSubmitting}
                  campaignEndDateInfo={campaignEndDateInfo}
                  session={session}
                />

                {/* Popup pour les instructions de paiement */}
                <Dialog open={showPopup} onOpenChange={handlePopupClose}>
                  <DialogContent className="bg-white p-6 rounded-lg shadow-xl max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <div className="flex items-center space-x-3 mb-2">
                        <CheckCircle className="h-8 w-8 text-green-500" />
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
                            {priceToPay ? parseFloat(priceToPay).toFixed(2) : '0.00'}$
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => copyToClipboard(priceToPay ? parseFloat(priceToPay).toFixed(2) : '0.00', 'montant')}
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
                            {(() => {
                              const schoolName = school?.name || school?.code || 'N/A';
                              const orderId = newOrderId || 'N/A';
                              const personName = session?.user?.role === 'school_manager'
                                ? session.user.name
                                : name;
                              return `${schoolName}-${orderId}-${personName}`;
                            })()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => {
                            const schoolName = school?.name || school?.code || 'N/A';
                            const orderId = newOrderId || 'N/A';
                            const personName = session?.user?.role === 'school_manager'
                              ? session.user.name
                              : name;
                            copyToClipboard(`${schoolName}-${orderId}-${personName}`, 'message');
                          }}
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
                          Il se peut qu'il soit dans vos indésirables.
                        </p>
                      </div>
                    </div>

                    <DialogFooter className="mt-6">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 w-full sm:w-auto"
                        onClick={handleCloseWithConfirmation}
                      >
                        Terminer
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Modal de confirmation de paiement */}
                <Dialog open={showPaymentConfirmation} onOpenChange={setShowPaymentConfirmation}>
                  <DialogContent className="sm:max-w-[450px] bg-white p-6">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
                        Confirmation de paiement
                      </DialogTitle>
                    </DialogHeader>

                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-gray-600">
                        Avez-vous effectué le virement Interac avec les informations fournies ?
                      </p>
                    </div>

                    <DialogFooter className="mt-6 gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCancelPayment}
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleConfirmPayment}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                      >
                        Oui, j'ai fait le paiement
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Popup de confirmation de suppression */}
                <Dialog open={selectedOrderId !== null} onOpenChange={() => setSelectedOrderId(null)}>
                  <DialogContent className="bg-white p-6 rounded-md shadow-md">
                    <DialogHeader>
                      <DialogTitle>Supprimer la commande</DialogTitle>
                      <DialogDescription>
                        Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.
                      </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="mt-4 flex justify-end space-x-4">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedOrderId(null)}
                        disabled={isDeletingOrder}
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteOrder}
                        disabled={isDeletingOrder}
                      >
                        {isDeletingOrder ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Suppression...
                          </>
                        ) : (
                          'Supprimer'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>

        {/* Onboarding Tooltip */}
        {showOnboardingTooltip && currentStep && tooltipTarget && (
          <OnboardingTooltip
            isVisible={showOnboardingTooltip}
            position="top"
            title={getStepContent(currentStep.key).title}
            message={getStepContent(currentStep.key).message}
            tip={getStepContent(currentStep.key).tip}
            stats={getStepContent(currentStep.key).stats}
            benefit={getStepContent(currentStep.key).benefit}
            onNext={handleOnboardingNext}
            onSkip={handleOnboardingSkip}
            onClose={handleOnboardingClose}
            currentStep={currentStep.order}
            totalSteps={6}
            showCelebration={false}
            targetElement={tooltipTarget}
          />
        )}

        {/* Join Campaign Modal */}
        <JoinCampaignModal
          isOpen={showJoinCampaignModal}
          onClose={handleCloseJoinCampaignModal}
          onSuccess={handleJoinCampaignSuccess}
        />

        {/* Order Placement Modal */}
        <OrderPlacementModal
          open={showOrderPlacementModal}
          onOpenChange={setShowOrderPlacementModal}
          paidOrders={orders.filter(order => order.status === 'Payé' && !order.isTest)}
          school={school}
          schoolId={school?._id}
          session={session}
          onOrderPlaced={handleOrderPlaced}
          campaignContext={campaignContext}
          isOrderingPeriod={isOrderingPeriod}
          campaignEndDateLong={campaignEndDateInfo?.long || null}
        />

        {/* Modal d'édition de l'option de livraison */}
        <Dialog open={showEditDeliveryModal} onOpenChange={setShowEditDeliveryModal}>
          <DialogContent className="sm:max-w-[500px] bg-white p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
                Modifier l'option de livraison
              </DialogTitle>
              <DialogDescription>
                Modifiez l'option de livraison pour cette commande. Vous pouvez sélectionner une option existante ou écrire une option personnalisée.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Sélection d'une option existante ou écriture manuelle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Option de livraison
                </label>
                <Select
                  value={editDeliveryOption}
                  onValueChange={(value) => {
                    setEditDeliveryOption(value);
                    // Reset custom fields when selecting a predefined option
                    if (value !== 'Autre' && value !== 'Livraison (si près de chez moi)') {
                      setEditCustomDeliveryOption('');
                      setEditCustomerDeliveryAddress('');
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner une option" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Options du store */}
                    {initialStoreInfo?.deliveryOptions
                      ?.filter(opt => opt.enabled)
                      .map((opt) => (
                        <SelectItem key={opt.name} value={opt.name}>
                          {opt.name}
                        </SelectItem>
                      ))}
                    {/* Option pour écrire manuellement */}
                    <SelectItem value="__custom__">Écrire manuellement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Champ pour option personnalisée (si "Autre" ou "Écrire manuellement") */}
              {(editDeliveryOption === 'Autre' || editDeliveryOption === '__custom__') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editDeliveryOption === '__custom__' ? 'Option personnalisée' : 'Détails (optionnel)'}
                  </label>
                  <Input
                    value={editCustomDeliveryOption}
                    onChange={(e) => {
                      setEditCustomDeliveryOption(e.target.value);
                      // If "__custom__" is selected and user starts typing, keep it selected
                      // If "Autre" is selected, just update the custom text
                    }}
                    placeholder={editDeliveryOption === '__custom__' ? 'Ex: Livraison au bureau' : 'Ex: Livraison au bureau'}
                    className="w-full"
                  />
                </div>
              )}

              {/* Champ pour l'adresse de livraison (si "Livraison (si près de chez moi)") */}
              {editDeliveryOption === 'Livraison (si près de chez moi)' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse de livraison
                  </label>
                  <Input
                    value={editCustomerDeliveryAddress}
                    onChange={(e) => setEditCustomerDeliveryAddress(e.target.value)}
                    placeholder="Ex: 123 Rue Principale, Ma ville"
                    className="w-full"
                  />
                </div>
              )}

            </div>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDeliveryModal(false);
                  setEditingDeliveryOption(null);
                  setEditDeliveryOption('');
                  setEditCustomDeliveryOption('');
                  setEditCustomerDeliveryAddress('');
                }}
                disabled={isSavingDeliveryOption}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveDeliveryOption}
                disabled={isSavingDeliveryOption || (!editDeliveryOption && !editCustomDeliveryOption)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSavingDeliveryOption ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
const CommandeButton = ({ school, campaignContext, handlePlaceOrder, isSubmitting, campaignEndDateInfo, session }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLimitedInventoryMode, setIsLimitedInventoryMode] = useState(false);
  const [isCheckingInventory, setIsCheckingInventory] = useState(true);

  // Check if we're in limited inventory mode
  useEffect(() => {
    const checkInventoryMode = async () => {
      if (!campaignContext?.activeCampaignId || !session?.user?.id) {
        setIsCheckingInventory(false);
        return;
      }

      try {
        // Use the correct API endpoint: /api/inventory/[userId]/[campaignId]
        const response = await fetch(`/api/inventory/${session.user.id}/${campaignContext.activeCampaignId}`);
        if (response.ok) {
          const data = await response.json();
          // If we have any inventory records, we're in limited inventory mode
          setIsLimitedInventoryMode(data.inventory && Array.isArray(data.inventory) && data.inventory.length > 0);
        }
      } catch (error) {
        console.error('Error checking inventory mode:', error);
      } finally {
        setIsCheckingInventory(false);
      }
    };

    checkInventoryMode();
  }, [campaignContext?.activeCampaignId, session?.user?.id]);

  // Guard against undefined school
  if (!school) {
    return null;
  }

  // Hide button if in limited inventory mode
  if (isLimitedInventoryMode) {
    return null;
  }

  // Get campaign end date - prefer campaign context, fallback to school legacy field
  let finCampagne;
  if (campaignEndDateInfo?.raw) {
    finCampagne = new Date(campaignEndDateInfo.raw);
  } else if (campaignContext?.mode === 'campaign' && campaignContext?.campaigns?.length > 0) {
    // Use active campaign's end date
    const activeCampaign = campaignContext.campaigns.find(c => c.isActive) || campaignContext.campaigns[0];
    finCampagne = new Date(activeCampaign.endDate);
  } else if (school.finCampagne) {
    // Fallback to legacy school field
    finCampagne = new Date(school.finCampagne);
  } else {
    // If no date available, hide the button
    return null;
  }

  // Check if current date is within the allowed ordering period
  // Students can order 2 days before the campaign end date until 1 day after
  const currentDate = new Date();
  const campaignEndDateLong = campaignEndDateInfo?.long || format(finCampagne, 'd MMMM yyyy', { locale: fr });

  // Allow bypass for testing if TEST_MODE is enabled or if URL has ?test=true
  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true' ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('test') === 'true');

  // Check if we're within the ordering window (2 days before until 1 day after)
  const isOrderingPeriod = (() => {
    if (isTestMode) return true;

    // Set time to start of day for comparison
    const campaignEndStart = new Date(finCampagne);
    campaignEndStart.setHours(0, 0, 0, 0);

    // Calculate ordering window: 2 days before until 1 day after
    const orderingStart = new Date(campaignEndStart);
    orderingStart.setDate(orderingStart.getDate() - 2); // 2 days before

    const orderingEnd = new Date(campaignEndStart);
    orderingEnd.setDate(orderingEnd.getDate() + 1); // 1 day after
    orderingEnd.setHours(23, 59, 59, 999); // End of day

    const todayStart = new Date(currentDate);
    todayStart.setHours(0, 0, 0, 0);

    // Check if current date is within the ordering window
    return todayStart.getTime() >= orderingStart.getTime() &&
      currentDate.getTime() <= orderingEnd.getTime();
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-2" // Added space between button and message
    >
      <Button
        onClick={handlePlaceOrder}
        variant="default"
        size="lg"
        className={`
          relative overflow-hidden transition-all duration-300 ease-out
          transform hover:scale-105 hover:shadow-lg
          ${isOrderingPeriod
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
            : 'bg-gradient-to-r from-gray-500 to-gray-600'}
          text-white font-semibold py-3 px-6 rounded-full
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isSubmitting}
      >
        <motion.span
          className="relative z-10 flex items-center space-x-2"
          animate={{ x: isHovered ? 5 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Traitement en cours...</span>
            </>
          ) : (
            <>
              <SendHorizontal className="w-5 h-5" />
              <span>{isOrderingPeriod ? 'Passer la commande' : 'Prévisualiser ma commande'}</span>
            </>
          )}
        </motion.span>
        {isOrderingPeriod && (
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: isHovered ? 1.5 : 0, opacity: isHovered ? 0.15 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ borderRadius: '100%', zIndex: 0 }}
          />
        )}
      </Button>

      {/* Always show the message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-gray-600"
      >
        La fin de la campagne est le{' '}
        <span className="font-medium">{campaignEndDateLong}</span>.
        {' '}Vous pouvez passer votre commande dès 2 jours avant jusqu'à 1 jour après cette date (pour les retardataires).
      </motion.p>
    </motion.div>
  );
};

export async function getServerSideProps(context) {
  try {
    const session = await getServerSession(context.req, context.res, authOptions);
    if (!session || !session.user) {
      return {
        redirect: {
          destination: '/connexion',
          permanent: false,
        },
      };
    }

    const dashboardData = await getDashboardSSRData(session);
    if (!dashboardData) {
      return {
        redirect: {
          destination: '/connexion',
          permanent: false,
        },
      };
    }

    // Fetch orders for the active campaign
    const campaignId = dashboardData.initialCampaignContext?.activeCampaignId;
    const initialOrders = await getOrdersSSR(session, campaignId);

    return {
      props: {
        ...dashboardData,
        initialOrders: initialOrders || []
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps (commandes):', error);
    return {
      props: {
        initialCampaignContext: { campaigns: [], activeCampaignId: null, mode: 'none' },
        initialStoreInfo: null,
        initialSchoolData: null,
        initialCampaignData: null,
        initialOrders: []
      },
    };
  }
}
