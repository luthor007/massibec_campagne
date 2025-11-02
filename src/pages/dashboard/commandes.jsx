// pages/commandes.jsx

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import { calculateOrderProfits, getCampaignDataWithFallback, isTestCampaign } from '../../utils/campaignHelpers';
import { getTerminology } from '../../utils/organizationHelpers';
import CampaignSelector from '../../components/Dashboard/CampaignSelector';
import JoinCampaignModal from '../../components/Dashboard/JoinCampaignModal';
import OnboardingTooltip from '../../components/Dashboard/OnboardingTooltip';
import useOnboarding from '../../hooks/useOnboarding';
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
import { ArrowLeft, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
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
import { SendHorizontal} from 'lucide-react'
import { format, addDays, isBefore, isAfter } from 'date-fns'; // Make sure to import date-fns
import { fr } from 'date-fns/locale'; // For French date formatting
import { toast } from 'sonner'


export default function Commandes() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schoolFetchFailed, setSchoolFetchFailed] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [newOrderId, setNewOrderId] = useState(null);
  const [priceToPay, setPriceToPay] = useState();
  const [school, setSchool] = useState();
  const [isHovered, setIsHovered] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  
  // Campaign-related state
  const [campaignContext, setCampaignContext] = useState(null);
  const [showJoinCampaignModal, setShowJoinCampaignModal] = useState(false);
  const [campaignData, setCampaignData] = useState(null);
  const [fallbackSplit, setFallbackSplit] = useState(null);
  
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

  // Fetch campaign context and school data
  useEffect(() => {
    const fetchCampaignContext = async () => {
      if (!session?.user) return;
      
      try {
        const response = await fetch('/api/users/campaigns');
        if (response.ok) {
          const data = await response.json();
          // The API already returns the properly structured campaign context
          setCampaignContext(data);
          
          // Get schoolId from campaign context - extract from campaigns array or use legacy field
          let schoolIdFromContext = null;
          if (data.campaigns && data.campaigns.length > 0) {
            // Extract schoolId from the first campaign's school object
            const firstCampaign = data.campaigns[0];
            schoolIdFromContext = firstCampaign.school?._id || firstCampaign.school;
          } else {
            // Fallback to legacy school field
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
  }, [session, fetchSchoolData]);

  // Fetch campaign data for profit calculations
  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!school || !campaignContext) return;

      try {
        const schoolId = campaignContext?.schoolId || session?.user?.school;
        const activeCampaignId = campaignContext?.campaigns?.find(c => c.isActive)?._id;

        // Only fetch if we have either schoolId or activeCampaignId
        if (!schoolId && !activeCampaignId) {
          console.warn('No schoolId or activeCampaignId available, skipping campaign data fetch');
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
          activeCampaignId
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
  }, [school, campaignContext, session]);

  // Campaign handlers
  const handleCampaignSwitch = (campaignId) => {
    window.location.reload(); // Simple refresh for now
  };

  const handleJoinCampaignSuccess = (campaign) => {
    setShowJoinCampaignModal(false);
    window.location.reload();
  };

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
      
      try {
        // Get active campaign ID from campaign context
        let campaignId = null;
        if (campaignContext?.mode === 'campaign') {
          // Prefer activeCampaignId from context (most accurate)
          if (campaignContext.activeCampaignId) {
            campaignId = campaignContext.activeCampaignId;
          } else if (campaignContext?.campaigns?.length > 0) {
            // Fallback: find active campaign or use first campaign
            const activeCampaign = campaignContext.campaigns.find(c => c.isActive || c.isActiveCampaign) || campaignContext.campaigns[0];
            campaignId = activeCampaign?._id;
          }
        }
        
        // Build API URL with campaign filter - always include campaignId if available
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

    // Fonction pour gérer l'impression des commandes
    const handlePrint = () => {
      window.print();
    };

  // Fonction pour gérer la suppression d'une commande
  const handleDeleteOrder = async () => {
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
  };

  // Fonction pour gérer le passage de la commande
  const handlePlaceOrder = async () => {
    if (isSubmitting) return; // Prevent multiple submissions
    setIsSubmitting(true);
    
    try {
      if (!session || !session.user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Get schoolId from campaign context or legacy school field
      const schoolId = campaignContext?.schoolId || session.user.school;
      if (!schoolId) {
        throw new Error('Aucune organisation associée à l\'utilisateur.');
      }

      // Check if there are any orders not marked as "Payé"
      const unpaidOrders = orders.filter(order => order.status !== 'Payé' && order.status !== 'Commander' && order.status !== 'Complété' && !order.isTest);
      if (unpaidOrders.length > 0) {
        toast.error('Assurez-vous que les commandes que vous voulez passer à Massibec soient au statut "Payé" pour qu\'elles puissent être envoyées à Massibec.');
        setIsSubmitting(false);
        return;
      }

      // Créer une commande étudiante - EXCLUDE test orders from final order
      const paidOrders = orders.filter(order => 
        order.status === 'Payé' && !order.isTest // Exclude test orders
      );
      const testOrders = orders.filter(order => order.status === 'Payé' && order.isTest);
      
      if (testOrders.length > 0) {
        console.log(`Excluding ${testOrders.length} test order(s) from final order`);
        toast.info(`${testOrders.length} commande(s) TEST exclue(s) de la commande finale. Elles ne seront pas envoyées à Massibec.`, {
          duration: 5000
        });
      }
      
      if (paidOrders.length === 0) {
        toast.error('Aucune commande payée disponible (les commandes TEST sont exclues).');
        setIsSubmitting(false);
        return;
      }
      
      console.log('Paid Orders (excluding test):', paidOrders);

      if (paidOrders.length > 0) {
        // Agréger les produits de toutes les commandes payées
        const aggregatedStudentProducts = [];

        paidOrders.forEach(order => {
          order.products.forEach(product => {
            // Use the product fields directly from the Order model
            if (product.productName && product.productPrice !== undefined && product.productCost !== undefined) {
              aggregatedStudentProducts.push({
                productName: product.productName,
                quantity: product.quantity,
                price: product.productPrice,
                cost: product.productCost,
              });
            } else {
              console.warn(`Détails du produit non trouvés pour le produit dans la commande ${order.orderId}`);
            }
          });
        });
        console.log('Aggregated Student Products:', aggregatedStudentProducts);

        // Calculer les totaux
        const studentTotalUnits = aggregatedStudentProducts.reduce((total, product) => total + product.quantity, 0);
        const studentTotalAmount = aggregatedStudentProducts.reduce((total, product) => total + (product.price * product.quantity), 0);
        const studentAmountPaid = studentTotalAmount; // Ajustez si nécessaire

        // Use the school data we already have
        if (!school) {
          throw new Error('Données de l\'école non disponibles.');
        }

        // Get campaign data with fallback to school data
        const { campaign, fallbackSplit } = await getCampaignDataWithFallback(schoolId, school);

          // Calculer les bénéfices using campaign data
          let totalStudentBenefit = 0;
          let totalOrganizationBenefit = 0;
          let totalRaffleBenefit = 0;

          const calculatedStudentProducts = aggregatedStudentProducts.map(product => {
            // Try to find product-specific profit split in campaign
            const profitSplit = campaign?.profitSplits?.find(ps => 
              ps.productId?.toString() === product.productId?.toString()
            );
            
            let studentB, organizationB, raffleB;
            
            if (profitSplit && campaign.profitSplitType === 'absolute') {
              // Use absolute per-unit values from campaign - use new fields with fallback to old
              const studentCash = Number(profitSplit.studentCash) || Number(profitSplit.student) || 0;
              const studentSchoolAccount = Number(profitSplit.studentSchoolAccount) || 0;
              const schoolProject = Number(profitSplit.schoolProject) || Number(profitSplit.school) || 0;
              const raffle = Number(profitSplit.raffle) || 0;
              
              // Total student benefit is cash + school account
              studentB = (studentCash + studentSchoolAccount) * product.quantity;
              organizationB = schoolProject * product.quantity;
              raffleB = raffle * product.quantity;
            } else {
              // Fallback to percentage calculation using school.split
              const profit = (product.price - product.cost) * product.quantity;
              const studentPercentage = fallbackSplit?.studentBenefit || 85.6;
              const organizationPercentage = fallbackSplit?.organizationBenefit || 9.4;
              const rafflePercentage = fallbackSplit?.raffleBenefit || 5.0;
              
              studentB = profit * (studentPercentage / 100);
              organizationB = profit * (organizationPercentage / 100);
              raffleB = profit * (rafflePercentage / 100);
            }

            totalStudentBenefit += studentB;
            totalOrganizationBenefit += organizationB;
            totalRaffleBenefit += raffleB;

            return {
              productName: product.productName,
              quantity: product.quantity,
              price: product.price,
              cost: product.cost,
              profit: (product.price - product.cost) * product.quantity,
              studentBenefit: studentB,
              organizationBenefit: organizationB,
              raffleBenefit: raffleB,
            };
          });

          setPriceToPay(studentTotalAmount - totalStudentBenefit);

          const studentOrderData = {
            timestamp: new Date(),
            email: session.user.email,
            studentName: session.user.name,
            phoneNumber: session.user.parentInfo?.telephone || '000-000-0000',
            schoolId: school._id,
            products: calculatedStudentProducts,
            totalUnits: studentTotalUnits,
            totalAmount: studentTotalAmount - totalStudentBenefit,
            amountPaid: 0,
            studentBenefit: totalStudentBenefit,
            organizationBenefit: totalOrganizationBenefit,
            raffleBenefit: totalRaffleBenefit,
          };

          // Envoyer la commande étudiante à l'API
          const studentResponse = await fetch('/api/orderStudent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentOrderData),
          });

          if (studentResponse.ok) {
            toast.success('Commande étudiante créée avec succès.');
            const data = await studentResponse.json();
            setNewOrderId(data.orderId); // Supposons que l'API retourne le nouvel orderId

            // Mettre à jour le statut des commandes payées à 'Commander'
            await handleStatusChange(
              paidOrders.map(order => order.orderId),
              'Commander'
            );
          } else {
            const errorData = await studentResponse.json();
            throw new Error(errorData.message || 'Erreur lors de la création de la commande étudiante');
          }


        // Afficher le popup de confirmation
        setShowPopup(true);
      } else {
        throw new Error('Aucune commande payée disponible pour passer la commande.');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'ajout de la commande.');
      console.log(error);
    } finally {
      setIsSubmitting(false);
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
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier!');
  };

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
      {isTest && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 shadow-sm mb-4 mt-16">
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
      <Card className="pt-16">
        <CardHeader>
          <Link href="/dashboard" passHref>
            <div className="flex items-center space-x-2 cursor-pointer">
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
            <CampaignSelector 
              onCampaignSwitch={handleCampaignSwitch}
              onJoinCampaign={() => setShowJoinCampaignModal(true)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p>Aucune commande trouvée</p>
          ) : (
            <>
                          {/* Bouton d'impression */}
              <Button className="mt-4 mb-4" onClick={handlePrint}>
                Imprimer les commandes
              </Button>

{/* Instructions sur les statuts des commandes */}
<div className="bg-white p-6 rounded-lg shadow-md mt-6">
  <h2 className="text-2xl font-bold mb-4 text-gray-800">📝 Statut des commandes</h2>
            <div className="space-y-6">
    <div>
      <h3 className="font-semibold text-lg mb-2">🕓 En attente</h3>
      <p className="text-gray-700">
        Ce statut est attribué automatiquement lorsqu'un client passe une commande.
        Vous devriez recevoir un virement Interac.
        <br />
        👉 Si vous n'avez pas activé les dépôts automatiques, la réponse de sécurité sera l'adresse courriel du client.
      </p>
    </div>
    <div>
      <h3 className="font-semibold text-lg mb-2">💰 Payé</h3>
      <p className="text-gray-700">
        Une fois le paiement reçu, mettez le statut à Payé.
        Cela confirme que l'argent a bien été reçu et vous permettra ensuite d'envoyer la commande à Massibec.
      </p>
    </div>
    <div>
      <h3 className="font-semibold text-lg mb-2">📦 Commandé</h3>
      <p className="text-gray-700 mb-2">
        (
          Disponible seulement le{' '}
          {campaignEndDateInfo.short || 'jour de fin de campagne'}{' '}
          entre minuit et midi
        )
        <br />
        Quand vous cliquez sur Passer la commande à Massibec, toutes les commandes avec le statut Payé sont transmises à Massibec.
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
          ❌ Si l'une d'elles est manquante, contactez-nous à <a href="mailto:commande@massibec.com" className="text-blue-600 hover:text-blue-800 underline">commande@massibec.com</a>.
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
              <Table className={`mt-6 ${currentStep?.key === 'viewedOrders' ? 'ring-4 ring-blue-500 rounded-lg' : ''}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Id de commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Produit(s)</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Dons ({terminology.participant})</TableHead>
                    <TableHead>Dons ({terminology.organization})</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Créer le</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order._id} className={order.isTest ? 'bg-orange-50/50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.orderId}
                          {order.isTest && (
                            <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              TEST
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.customerEmail}</TableCell>
                      <TableCell>{order.phoneNumber}</TableCell>
                      <TableCell>
                        {/* Display list of products and quantities */}
                        {order.products.map((prod, index) => (
                          <div key={index}>
                            {prod.productName} x {prod.quantity}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        <span className={order.isTest ? 'text-gray-500' : ''}>
                          {order.totalAmount.toFixed(2)}$
                        </span>
                      </TableCell>
                      <TableCell>{(order.studentDonation || order.tip || 0).toFixed(2)}$</TableCell>
                      <TableCell>{(order.schoolDonation || 0).toFixed(2)}$</TableCell>
                      <TableCell>{(calculateStudentProfit(order.products) + (order.studentDonation || order.tip || 0)).toFixed(2)}$</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.orderId, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Statut" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-200">
                            <SelectItem value="En attente">En attente</SelectItem>
                            <SelectItem value="Payé">Payé</SelectItem>
                            <SelectItem value="Commander">Commander</SelectItem>
                            <SelectItem value="Complété">Complété</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSelectedOrderId(order._id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </motion.div>

              <CommandeButton 
                school={school} 
                campaignContext={campaignContext}
                handlePlaceOrder={handlePlaceOrder}
                isSubmitting={isSubmitting}
                campaignEndDateInfo={campaignEndDateInfo}
              />

              {/* Popup pour les instructions de paiement */}
              <Dialog open={showPopup} onOpenChange={handlePopupClose}>
                <DialogContent className="bg-white p-6 rounded-md shadow-md">
                  <DialogHeader>
                    <DialogTitle>Bravo, commande reçue!</DialogTitle>
                    <DialogDescription>
                      Maintenant, suivez les étapes pour finaliser votre paiement.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-4 space-y-4">
                    <p>1. Choisissez votre banque :</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <a href="https://www.desjardins.com/fr/" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          Desjardins
                        </Button>
                      </a>
                      <a href="https://www.bnc.ca/fr/particuliers.html" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          BNC
                        </Button>
                      </a>
                      <a href="https://www.rbcbanqueroyale.com/" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          RBC
                        </Button>
                      </a>
                      <a href="https://www.td.com/ca/fr/perso/" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          TD
                        </Button>
                      </a>
                      <a href="https://www.scotiabank.com/ca/fr/particuliers.html" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          Scotiabank
                        </Button>
                      </a>
                      <a href="https://www.cibc.com/fr/personal-banking.html" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          CIBC
                        </Button>
                      </a>
                    </div>

                    <p>
                      2. Envoyez un virement Interac à <strong>facturation@massibec.com</strong>
                      <Button variant="outline" className="ml-2" onClick={() => copyToClipboard('facturation@massibec.com')}>
                        Copier
                      </Button>
                    </p>

                    <p>
                      3. Montant à payer : <strong>{priceToPay}$</strong>
                      <Button variant="outline" className="ml-2" onClick={() => copyToClipboard(`${priceToPay}`)}>
                        Copier
                      </Button>
                    </p>

                    <p>
                      4. Message de virement : <strong>@#&*-{school?.code || 'N/A'}-{newOrderId || 'N/A'}-{name}</strong>
                      <Button variant="outline" className="ml-2" onClick={() => copyToClipboard(`@#&*-${school?.code || ''}-${newOrderId || ''}-${name}`)}>
                        Copier
                      </Button>
                    </p>

                    <p>
                      <strong>IMPORTANT : Assurez-vous de faire le virement avant de quitter cette page.</strong>
                      Vous allez sous peu recevoir un courriel de confirmation, il se peut qu'il soit dans les indésirables.
                    </p>
                  </div>

                  <Button className="mt-4" onClick={handlePopupClose}>
                    Terminer
                  </Button>
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
        onClose={() => setShowJoinCampaignModal(false)}
        onSuccess={handleJoinCampaignSuccess}
      />
    </Layout>
  );
}
const CommandeButton = ({ school, campaignContext, handlePlaceOrder, isSubmitting, campaignEndDateInfo }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Guard against undefined school
  if (!school) {
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
  
  // Check if current date is within the allowed range
  const currentDate = new Date();
  const orderEndDate = addDays(finCampagne, 15);
  const orderEndDateFormatted = format(orderEndDate, 'dd MMMM yyyy', { locale: fr });
  const campaignEndDateLong = campaignEndDateInfo?.long || format(finCampagne, 'dd MMMM yyyy', { locale: fr });
  
  const isOrderingPeriod = !isBefore(currentDate, finCampagne) && 
                          !isAfter(currentDate, orderEndDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-2" // Added space between button and message
    >
      <Button
        onClick={isOrderingPeriod ? handlePlaceOrder : undefined}
        variant="default"
        size="lg"
        className={`
          relative overflow-hidden transition-all duration-300 ease-out
          transform hover:scale-105 hover:shadow-lg
          ${isOrderingPeriod 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
            : 'bg-gray-400 cursor-not-allowed'}
          text-white font-semibold py-3 px-6 rounded-full
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={!isOrderingPeriod || isSubmitting}
      >
        <motion.span
          className="relative z-10 flex items-center space-x-2"
          animate={{ x: isOrderingPeriod && isHovered ? 5 : 0 }}
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
              <span>Passer la commande à Massibec</span>
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
      

      {!isOrderingPeriod && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-600"
        >
          Vous pourrez transmettre vos commandes le{' '}
          <span className="font-medium">{campaignEndDateLong}</span>{' '}
          (minuit à midi)
        </motion.p>
      )}
    </motion.div>
  );
};
