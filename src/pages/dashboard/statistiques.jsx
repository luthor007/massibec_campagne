'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue, startTransition } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { motion } from 'framer-motion'
import OnboardingTooltip from '../../components/Dashboard/OnboardingTooltip'
import useOnboarding from '../../hooks/useOnboarding'
import { getServerSession } from 'next-auth/next'
import { getDashboardSSRData, getOrdersSSR, getProductsSSR, getTopSellersSSR } from '../../lib/dashboardSSR'
import { authOptions } from '../api/auth/[...nextauth]'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs"
import {
  Alert,
  AlertDescription,
  AlertTitle
} from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { calculateStudentEarnings, getUserCampaignContext, isTestCampaign, calculateOrderProfitsDetailed, getCampaignDataWithFallback } from '@/utils/campaignHelpers'
import CampaignSelector from '@/components/Dashboard/CampaignSelector'
import JoinCampaignModal from '@/components/Dashboard/JoinCampaignModal'
// Import extracted components
import EnhancedLeaderboardCard from '@/components/Dashboard/StudentStats/EnhancedLeaderboardCard'
import GamificationCard from '@/components/Dashboard/StudentStats/GamificationCard'
import MetricCard from '@/components/Dashboard/StudentStats/MetricCard'
import DeepAnalyticsCard from '@/components/Dashboard/StudentStats/DeepAnalyticsCard'
import ConversionFunnelCard from '@/components/Dashboard/StudentStats/ConversionFunnelCard'
import DeviceTypeCard from '@/components/Dashboard/StudentStats/DeviceTypeCard'
import VisitSourceCard from '@/components/Dashboard/StudentStats/VisitSourceCard'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import {
  Award, Gift, Share2, TrendingUp, Star, Zap, Target,
  AlertTriangle, Check, ArrowUp, ArrowDown, Trophy, Calendar, ArrowLeft, AlertCircle
} from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Info } from 'lucide-react'
import { Users, ShoppingCart, DollarSign } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import Link from 'next/link'


// Reward Levels
const profitRewards = {
  level1: {
    minimum: 1,
    max: 10,
    badge: "Petit vendeur 💰",
    description: "Tu as gagné tes premiers dollars. C'est un bon début !",
  },
  level2: {
    minimum: 11,
    max: 50,
    badge: "Vendeur en herbe 💵",
    description: "Tes profits augmentent, tu progresses bien !",
  },
  level3: {
    minimum: 51,
    max: 100,
    badge: "Vendeur prometteur 💼",
    description: "Tu maîtrises l'art de vendre. Continue comme ça !",
  },
  level4: {
    minimum: 101,
    max: 200,
    badge: "Vendeur expérimenté 💳",
    description: "Tes compétences en ventes se confirment avec de beaux profits.",
  },
  level5: {
    minimum: 201,
    max: 300,
    badge: "Pro des profits 🏆",
    description: "Tu es reconnu pour tes résultats impressionnants en ventes.",
  },
  level6: {
    minimum: 301,
    max: 500,
    badge: "Champion des profits 💎",
    description: "Tu es une star de la vente. Tes profits parlent pour toi.",
  },
  level7: {
    minimum: 501,
    max: 1000,
    badge: "Maître des profits 🏅",
    description: "Tu as atteint un niveau de profit exceptionnel.",
  },
  level8: {
    minimum: 1001,
    max: 2000,
    badge: "Légende des profits 🔥",
    description: "Tu fais partie des meilleurs. Les profits ne cessent de croître.",
  },
  level9: {
    minimum: 2001,
    max: 3000,
    badge: "Titan des profits 🌟",
    description: "Tu fais partie d'une élite de vendeurs, dominant le marché.",
  },
  level10: {
    minimum: 3001,
    max: Infinity,
    badge: "Empereur des profits 👑",
    description: "Ton succès est incomparable. Tu es une légende vivante.",
  }
};

// Color scheme
const colors = {
  primary: "hsl(220, 100%, 50%)",
  secondary: "hsl(280, 100%, 50%)",
  accent: "hsl(330, 100%, 50%)",
  success: "hsl(120, 100%, 35%)",
  warning: "hsl(40, 100%, 50%)",
  error: "hsl(0, 100%, 50%)",
  background: "hsl(220, 100%, 98%)",
}

// School year definitions
const schoolYears = [
  {
    id: '2024-2025',
    label: '2024-2025',
    startDate: '2024-08-01',
    endDate: '2025-07-31'
  },
  {
    id: '2025-2026',
    label: '2025-2026',
    startDate: '2025-08-01',
    endDate: '2026-07-31'
  },
  {
    id: '2026-2027',
    label: '2026-2027',
    startDate: '2026-08-01',
    endDate: '2027-07-31'
  }
]

export default function StatistiquesEtudiantUltime({
  initialCampaignContext,
  initialStoreInfo,
  initialSchoolData,
  initialCampaignData,
  initialOrders,
  initialProducts,
  initialLeaderboard,
  initialSelectedCampaignId
}) {

  const [activeTab, setActiveTab] = useState("apercu")
  const [loading, setLoading] = useState(!(initialOrders && initialProducts && initialSchoolData && initialCampaignContext))
  const [error, setError] = useState(null)
  const [schoolFetchFailed, setSchoolFetchFailed] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    initialSelectedCampaignId ||
    initialCampaignContext?.activeCampaignId ||
    null
  )

  const [orders, setOrders] = useState(initialOrders || [])
  const [school, setSchool] = useState(initialSchoolData || null)
  const [user, setUser] = useState(null)
  const [topPerformers, setTopPerformers] = useState(initialLeaderboard?.topPerformers || [])
  const [userRank, setUserRank] = useState(initialLeaderboard?.userRank || null)
  const [userEarnings, setUserEarnings] = useState(initialLeaderboard ? parseFloat(initialLeaderboard.userTotalEarnings) : 0)
  const [userProductsSold, setUserProductsSold] = useState(initialLeaderboard?.userTotalProductsSold || 0)
  const [groups, setGroups] = useState(initialLeaderboard?.groups || [])
  const [userGroup, setUserGroup] = useState(initialLeaderboard?.userGroup || null)
  const [userGroupRank, setUserGroupRank] = useState(initialLeaderboard?.userGroupRank || null)
  const [totalRaffle, setTotalRaffle] = useState(0)
  const [earnings, setEarnings] = useState([])
  const [products, setProducts] = useState(initialProducts || [])
  const [productBreakdown, setProductBreakdown] = useState([])

  // Campaign-related state - initialize from SSR props
  const [campaignContext, setCampaignContext] = useState(initialCampaignContext || null)
  const [showJoinCampaignModal, setShowJoinCampaignModal] = useState(false)

  // Deep analytics state
  const [deepAnalytics, setDeepAnalytics] = useState(null)
  const [deepAnalyticsLoading, setDeepAnalyticsLoading] = useState(false)
  const [userStoreId, setUserStoreId] = useState(null)
  const [discountEnabled, setDiscountEnabled] = useState(true) // Default to true

  // Onboarding state
  const [showOnboardingTooltip, setShowOnboardingTooltip] = useState(false);
  const [tooltipTarget, setTooltipTarget] = useState(null);
  const statsCardsRef = useRef(null);

  // Use onboarding hook
  const {
    progress,
    currentStep,
    isLoading: onboardingLoading,
    markStepComplete,
    getStepContent
  } = useOnboarding();

  const { toast } = useToast()
  const { data: session, status } = useSession()
  const router = useRouter()

  // Prefetch dashboard index for instant return navigation
  useEffect(() => {
    router.prefetch('/dashboard');
    setTimeout(() => router.prefetch('/dashboard'), 100);
  }, [router]);

  const userId = session?.user?.id
  // Campaign-first identifiers
  const activeCampaignId = campaignContext?.activeCampaignId
  // DEPRECATED: Don't use user's school - always use campaign's school
  // const schoolId = session?.user?.school
  // Get school ID from campaign context ONLY (never from user's school)
  // When a user joins a campaign from another school, we must use the campaign's school
  const effectiveSchoolId = campaignContext?.schoolId || null

  // Get current campaign or fallback to active campaign
  // This works for both active and completed campaigns
  const getCurrentCampaign = useCallback(() => {
    if (!campaignContext?.campaigns || campaignContext.campaigns.length === 0) {
      return null
    }

    // If selectedCampaignId is set, use it (works for completed campaigns too)
    if (selectedCampaignId) {
      const selected = campaignContext.campaigns.find(c => c._id?.toString() === selectedCampaignId?.toString())
      if (selected) return selected
    }

    // Otherwise, try to use activeCampaignId
    if (campaignContext.activeCampaignId) {
      const active = campaignContext.campaigns.find(c =>
        c._id?.toString() === campaignContext.activeCampaignId?.toString()
      )
      if (active) return active
    }

    // Final fallback: first campaign (including completed ones)
    return campaignContext.campaigns[0]
  }, [selectedCampaignId, campaignContext])

  // Check if current campaign is in test mode
  const isTest = (() => {
    const currentCampaign = getCurrentCampaign();
    return currentCampaign ? isTestCampaign(currentCampaign) : false;
  })();

  // Filter orders by campaign
  const getFilteredOrders = useCallback(() => {
    if (!orders || orders.length === 0) return []

    const currentCampaign = getCurrentCampaign()

    // If no campaign selected, return all orders
    if (!currentCampaign) return orders

    // The API /api/users/campaigns returns campaigns where _id is the actual Campaign._id
    // Orders store the actual campaignId (Campaign._id)
    const campaignIdToMatch = currentCampaign._id?.toString()

    // If order has no campaignId, include it for the current campaign
    // This handles legacy orders or orders created before campaign system
    return orders.filter(order => {
      // If order has no campaignId, include it
      if (!order.campaignId) return true

      // Otherwise, match by campaignId
      if (!campaignIdToMatch) return true

      return order.campaignId?.toString() === campaignIdToMatch
    })
  }, [orders, getCurrentCampaign])

  // Debug logs removed - campaign context now working properly

  // Fetch campaign context - only if not provided via SSR
  useEffect(() => {
    if (initialCampaignContext) return; // Skip if SSR data exists

    const fetchCampaignContext = async () => {
      if (!session?.user) return;

      try {
        const response = await fetch('/api/users/campaigns');
        if (response.ok) {
          const data = await response.json();
          const context = {
            mode: data.mode,
            activeCampaignId: data.activeCampaignId,
            campaigns: data.campaigns,
            schoolId: data.campaigns && data.campaigns.length > 0
              ? data.campaigns[0].school?._id
              : undefined
          };
          setCampaignContext(context);
        }
      } catch (error) {
        console.error('Error fetching campaign context:', error);
      }
    };

    fetchCampaignContext();
  }, [session, initialCampaignContext]);

  // Initialize selectedCampaignId when campaigns are loaded
  // This ensures completed campaigns are still accessible
  useEffect(() => {
    if (campaignContext?.campaigns && campaignContext.campaigns.length > 0 && !selectedCampaignId) {
      // Prefer activeCampaignId if available, otherwise use first campaign (including completed ones)
      const campaignToSelect = campaignContext.activeCampaignId
        ? campaignContext.campaigns.find(c => c._id?.toString() === campaignContext.activeCampaignId?.toString())
        : null
      // If activeCampaignId doesn't match any campaign (e.g., campaign completed), use first campaign
      const initialCampaignId = campaignToSelect?._id || campaignContext.campaigns[0]?._id
      if (initialCampaignId) {
        console.log('[Stats] Initializing selectedCampaignId to:', initialCampaignId)
        setSelectedCampaignId(initialCampaignId)
      }
    }
  }, [campaignContext, selectedCampaignId])

  // Memoize handlers to prevent unnecessary re-renders
  const handleCampaignSwitch = useCallback((campaignId) => {
    // Refresh data when campaign switches
    window.location.reload(); // Simple refresh for now
  }, []);

  const handleJoinCampaignClick = useCallback(() => {
    setShowJoinCampaignModal(true);
  }, []);

  const handleJoinCampaignSuccess = useCallback((campaign) => {
    toast({
      title: "Campagne rejoint avec succès!",
      description: `Vous avez rejoint la campagne ${campaign.campaignCode} de ${campaign.school.name}`,
    });
    setShowJoinCampaignModal(false);
    // Refresh campaign context
    window.location.reload();
  }, []);

  const handleBackNavigation = useCallback((e) => {
    e.preventDefault();
    router.push('/dashboard');
  }, [router]);

  const handleCloseJoinCampaignModal = useCallback(() => {
    setShowJoinCampaignModal(false);
  }, []);

  // Memoize campaign selector props
  const campaignSelectorProps = useMemo(() => ({
    onCampaignSwitch: handleCampaignSwitch,
    onJoinCampaign: handleJoinCampaignClick,
    initialCampaigns: initialCampaignContext?.campaigns || [],
    initialActiveCampaignId: initialSelectedCampaignId || initialCampaignContext?.activeCampaignId || null
  }), [handleCampaignSwitch, handleJoinCampaignClick, initialCampaignContext, initialSelectedCampaignId]);

  // Onboarding logic for stats page
  useEffect(() => {
    if (!onboardingLoading && currentStep?.key === 'viewedStats') {
      setShowOnboardingTooltip(true);
      setTooltipTarget(statsCardsRef.current);
    } else {
      setShowOnboardingTooltip(false);
    }
  }, [currentStep, onboardingLoading]);

  // Memoize onboarding handlers
  const handleOnboardingNext = useCallback(async () => {
    if (currentStep?.key === 'viewedStats') {
      const success = await markStepComplete('viewedStats', true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  }, [currentStep, markStepComplete]);

  const handleOnboardingSkip = useCallback(async () => {
    if (currentStep?.key === 'viewedStats') {
      const success = await markStepComplete('viewedStats', true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  }, [currentStep, markStepComplete]);

  const handleOnboardingClose = useCallback(() => {
    setShowOnboardingTooltip(false);
  }, []);

  // Calculate total products sold
  const calculateTotalProductsSold = useCallback(() => {
    const filteredOrders = getFilteredOrders()
    if (!filteredOrders || filteredOrders.length === 0) return 0;
    return filteredOrders.reduce((total, order) => {
      return total + order.products.reduce((sum, product) => sum + product.quantity, 0);
    }, 0);
  }, [getFilteredOrders]);

  // Calculate total student earnings using campaign data
  const calculateTotalStudentEarnings = useCallback(() => {
    const filteredOrders = getFilteredOrders()
    if (!filteredOrders || !school) return 0;

    try {
      // Use campaign context data instead of querying database
      const currentCampaign = getCurrentCampaign();
      const campaign = currentCampaign ? {
        _id: currentCampaign._id,
        profitSplits: [], // We don't have detailed profit splits on client side
        profitSplitType: 'percentage'
      } : null;

      const fallbackSplit = school.split;

      // Calculate earnings using campaign-specific per-product profit splits
      const totalEarnings = calculateStudentEarnings(filteredOrders, campaign, fallbackSplit);

      return totalEarnings;
    } catch (error) {
      console.error('Error calculating student earnings:', error);
      // Fallback to old calculation if campaign helpers fail
      let totalEarnings = 0;
      filteredOrders.forEach(order => {
        const { products, tip } = order;
        const totalCost = products.reduce((acc, product) => {
          return acc + (product.productCost * product.quantity);
        }, 0);
        const profitBeforeTips = order.totalAmount - totalCost;
        const studentEarnings = (profitBeforeTips * (school.split.studentBenefit / 100)) + (tip || 0);
        totalEarnings += studentEarnings;
      });
      return totalEarnings;
    }
  }, [getFilteredOrders, school, getCurrentCampaign]);


  // Calculate total student tip
  const calculateTotalStudentTip = useCallback(() => {
    const filteredOrders = getFilteredOrders()
    if (!filteredOrders || !school) return 0;
    let totalTip = 0;

    filteredOrders.forEach(order => {
      const { tip } = order;

      // Add to total earnings
      totalTip += tip;
    });

    return totalTip;
  }, [getFilteredOrders, school]);

  // Calculate today's sales (products and amount)
  const calculateTodaySales = useCallback(() => {
    const filteredOrders = getFilteredOrders()
    if (!filteredOrders) return { products: 0, amount: 0, orders: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayProducts = 0;
    let todayAmount = 0;
    let todayOrders = 0;

    filteredOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      orderDate.setHours(0, 0, 0, 0);

      if (orderDate.getTime() === today.getTime()) {
        todayOrders++;
        order.products?.forEach(product => {
          todayProducts += product.quantity || 0;
          todayAmount += (product.productPrice || 0) * (product.quantity || 0);
        });
      }
    });

    return { products: todayProducts, amount: todayAmount, orders: todayOrders };
  }, [getFilteredOrders]);

  // Calculate this week's sales
  const calculateWeekSales = useCallback(() => {
    const filteredOrders = getFilteredOrders()
    if (!filteredOrders) return { products: 0, amount: 0 };

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    let weekProducts = 0;
    let weekAmount = 0;

    filteredOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= weekStart) {
        order.products?.forEach(product => {
          weekProducts += product.quantity || 0;
          weekAmount += (product.productPrice || 0) * (product.quantity || 0);
        });
      }
    });

    return { products: weekProducts, amount: weekAmount };
  }, [getFilteredOrders]);

  // Calculate total student sales
  const calculateTotalStudentSales = useCallback(() => {
    const filteredOrders = getFilteredOrders()
    if (!filteredOrders || !school) return 0;
    let totalSales = 0;

    filteredOrders.forEach(order => {
      const { products } = order;

      // Calculate total sales from products in the order
      const orderSales = products.reduce((acc, product) => {
        return acc + (product.productPrice * product.quantity);
      }, 0);

      // Add to total sales
      totalSales += orderSales;
    });

    return totalSales;
  }, [getFilteredOrders, school]);

  // Calculate total student cost
  const calculateTotalStudentCost = useCallback(() => {
    const filteredOrders = getFilteredOrders()
    if (!filteredOrders || !school) return 0;
    let totalCost = 0;

    filteredOrders.forEach(order => {
      const { products } = order;

      // Calculate total cost of products in the order
      totalCost += products.reduce((acc, product) => {
        return acc + (product.productCost * product.quantity);
      }, 0);
    });

    return totalCost;
  }, [getFilteredOrders, school]);

  // Handle real-time updates (if applicable)
  const handleUpdate = useCallback((newData) => {
    // Update state based on newData
    // Example:
    // setOrders(newData.orders)
    // setTopPerformers(newData.topPerformers)
    // Implement according to your actual data structure
  }, [])

  // Fetch User Data
  const fetchUser = useCallback(async (userId) => {
    try {
      const userResponse = await fetch(`/api/users/${userId}`)
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data')
      }
      const ownerData = await userResponse.json()
      setUser(ownerData)
    } catch (error) {
      // Fallback to session user if API fails (e.g., DB offline)
      if (session?.user) {
        setUser({
          _id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        })
      }
    }
  }, [])

  // Fetch School Data
  // Campaign-centric fetch for stats context
  const fetchCampaignStatsContext = useCallback(async (campaignId, fallbackSchoolId) => {
    try {
      // We already have the school ID from campaign context, no need to call campaign API
      if (fallbackSchoolId) {
        await fetchSchoolData(fallbackSchoolId)
      } else {
        // No school ID available, use degraded mode
        setSchool({
          _id: 'unknown',
          name: 'École',
          code: 'N/A',
          split: { studentBenefit: 85.6, organizationBenefit: 9.4, raffleBenefit: 5.0 },
          finCampagne: new Date().toISOString(),
          dateDeLivraison: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        setSchoolFetchFailed(true)
      }
    } catch (e) {
      console.error('Error fetching campaign stats context:', e)
      if (fallbackSchoolId) {
        await fetchSchoolData(fallbackSchoolId)
      }
    }
  }, [])

  const fetchSchoolData = useCallback(async (schoolId) => {
    try {
      const response = await fetch(`/api/schools/${schoolId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch school data')
      }
      const schoolData = await response.json()
      setSchool(schoolData)
    } catch (error) {
      // Degraded mode: provide sensible defaults so the page still loads
      setSchool({
        _id: schoolId,
        name: 'École',
        code: 'N/A',
        split: { studentBenefit: 85.6, organizationBenefit: 9.4, raffleBenefit: 5.0 },
        finCampagne: new Date().toISOString(),
        dateDeLivraison: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      setSchoolFetchFailed(true)
    }
  }, [])

  // Fetch Orders - only if not provided via SSR
  const fetchOrders = useCallback(async () => {
    if (initialOrders && initialOrders.length >= 0) {
      return; // Skip if SSR data exists
    }

    try {
      const response = await fetch('/api/commandes')
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      const data = await response.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      setOrders([])
    }
  }, [initialOrders])

  // Fetch Top Sellers - always fetch for completed campaigns, even if SSR data exists
  const fetchTopSellers = useCallback(async (schoolId, userId) => {
    const currentCampaign = getCurrentCampaign()
    const campaignId = currentCampaign?._id?.toString() || null
    const campaignNumber = currentCampaign?.campaignNumber

    // Ensure we have a valid schoolId - get from campaign if available
    const finalSchoolId = currentCampaign?.school?._id?.toString() ||
      currentCampaign?.schoolId?.toString() ||
      schoolId

    if (!finalSchoolId) {
      console.warn('[Stats] No schoolId available for top sellers fetch')
      return
    }

    // Check if campaign is completed (endDate is in the past)
    const isCampaignCompleted = currentCampaign?.endDate
      ? new Date(currentCampaign.endDate) < new Date()
      : false;

    // Skip only if we have valid SSR data AND campaign is not completed
    // For completed campaigns, always fetch fresh data
    if (!isCampaignCompleted &&
      initialLeaderboard &&
      initialLeaderboard.topPerformers &&
      initialLeaderboard.topPerformers.length > 0 &&
      initialLeaderboard.userRank !== null &&
      initialLeaderboard.userRank !== undefined) {
      // Only skip if we have complete SSR data and campaign is active
      console.log('[Stats] Skipping top sellers fetch - using SSR data for active campaign')
      return;
    }

    // Always fetch for completed campaigns or if SSR data is incomplete
    console.log('[Stats] Will fetch top sellers - campaign completed:', isCampaignCompleted)

    // Always fetch for completed campaigns or if SSR data is incomplete
    try {
      // Ensure userId is available - use session user ID as fallback
      const finalUserId = userId || session?.user?.id;
      if (!finalUserId) {
        console.warn('[Stats] No userId available for top sellers fetch');
        return;
      }

      console.log('[Stats] Fetching top sellers with:', { schoolId: finalSchoolId, userId: finalUserId, campaignId })
      const response = await fetch(`/api/schools/${finalSchoolId}/topsellers/${finalUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId, campaignNumber })
      })
      if (!response.ok) {
        console.warn(`Top sellers API returned ${response.status}: ${response.statusText}`)
        throw new Error(`Failed to fetch top sellers: ${response.status}`)
      }
      const data = await response.json()
      console.log('[Stats] Top sellers data received:', {
        topPerformersCount: data.topPerformers?.length || 0,
        groupsCount: data.groups?.length || 0,
        userRank: data.userRank,
        userGroup: data.userGroup,
        userGroupRank: data.userGroupRank,
        hasTopPerformers: !!data.topPerformers
      })
      setTopPerformers(data.topPerformers || [])
      setGroups(data.groups || [])
      setUserGroup(data.userGroup || null)
      setUserGroupRank(data.userGroupRank || null)
      setUserRank(data.userRank !== null && data.userRank !== undefined ? data.userRank : null)
      setUserEarnings(data.userTotalEarnings ? parseFloat(data.userTotalEarnings) : 0)
      setUserProductsSold(data.userTotalProductsSold || 0)
    } catch (error) {
      console.error('Top sellers fetch failed:', error)
      // Fallback defaults
      setTopPerformers([])
      setGroups([])
      setUserGroup(null)
      setUserGroupRank(null)
      setUserRank(null)
      setUserEarnings(0)
      setUserProductsSold(0)
    }
  }, [selectedCampaignId, campaignContext?.campaigns?.length, campaignContext?.activeCampaignId, initialLeaderboard, getCurrentCampaign])

  // Fetch School Raffle - but calculate from productBreakdown instead to respect campaign splits
  const fetchSchoolRaffle = useCallback(async (schoolId) => {
    // Note: totalRaffle is now calculated from productBreakdown in a useEffect
    // This function is kept for backward compatibility but won't be used
    // Calculate raffle from productBreakdown instead of API
    // This ensures we use campaign-specific splits (0$ if campaign has 0$ raffle)
    if (productBreakdown && productBreakdown.length > 0) {
      const raffleTotal = productBreakdown.reduce((sum, product) => {
        return sum + (product.raffleProfit || 0)
      }, 0)
      setTotalRaffle(raffleTotal)
      return
    }

    // Fallback: only fetch from API if no productBreakdown available
    try {
      const response = await fetch(`/api/schools/${schoolId}/raffle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId: getCurrentCampaign()?._id })
      })
      if (!response.ok) {
        console.warn(`Raffle API returned ${response.status}: ${response.statusText}`)
        throw new Error(`Failed to fetch school raffle: ${response.status}`)
      }
      const data = await response.json()
      setTotalRaffle(data.totalRaffle)
    } catch (error) {
      console.warn('Raffle fetch failed, using default:', error.message)
      setTotalRaffle(0)
    }
  }, [productBreakdown, getCurrentCampaign])

  // Fetch Weekly Earnings
  const fetchWeeklyEarnings = useCallback(async (schoolId, userId) => {
    const currentCampaign = getCurrentCampaign()
    const campaignId = currentCampaign?._id?.toString() || null

    try {
      const response = await fetch(`/api/schools/${schoolId}/student/${userId}/earnings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId })
      })
      if (!response.ok) {
        throw new Error('Failed to fetch weekly earnings')
      }
      const data = await response.json()
      const salesData = data.weeklyEarnings.map((week, index) => ({
        week: `Semaine ${index + 1}`,
        sales: parseFloat(week.earnings)
      }))
      setEarnings(salesData)
    } catch (error) {
      // Fallback to empty data
      setEarnings([])
    } finally {
      setLoading(false)
    }
  }, [selectedCampaignId, campaignContext?.campaigns?.length, campaignContext?.activeCampaignId])

  // Fetch user's store ID and discount settings
  const fetchUserStore = useCallback(async (campaignId) => {
    if (!campaignId) return

    try {
      const response = await fetch('/api/get-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.storeId) {
          setUserStoreId(data.storeId)
          // Fetch store details to get discountEnabled
          try {
            const storeResponse = await fetch(`/api/stores/${data.storeId}`)
            if (storeResponse.ok) {
              const storeData = await storeResponse.json()
              setDiscountEnabled(storeData.discountEnabled !== false) // Default to true if not set
            }
          } catch (error) {
            console.error('Error fetching store details:', error)
          }
          return data.storeId
        }
      }
      setUserStoreId(null)
      return null
    } catch (error) {
      console.error('Error fetching user store:', error)
      setUserStoreId(null)
      return null
    }
  }, [])

  // Fetch Deep Analytics
  const fetchDeepAnalytics = useCallback(async () => {
    // Use storeId from state (fetched via API) or from user.store
    const storeId = userStoreId || user?.store?._id || user?.store
    if (!user || !storeId) {
      console.log('No store found for user:', { userId: user?._id, store: user?.store, userStoreId })
      return
    }

    setDeepAnalyticsLoading(true)
    try {
      const currentCampaign = getCurrentCampaign()
      if (!currentCampaign) {
        console.warn('[Stats] No campaign found, cannot fetch deep analytics')
        setDeepAnalyticsLoading(false)
        return
      }

      // Get the Campaign._id (works for completed campaigns too)
      const campaignId = currentCampaign._id?.toString()
      // Get schoolId from campaign or fallback to effectiveSchoolId
      const schoolId = currentCampaign?.school?._id?.toString() ||
        currentCampaign?.schoolId?.toString() ||
        effectiveSchoolId

      console.log('[Stats] Fetching deep analytics with:', {
        storeId,
        campaignId,
        schoolId,
        effectiveSchoolId,
        campaignSchool: currentCampaign?.school?._id?.toString(),
        campaignSchoolId: currentCampaign?.schoolId?.toString()
      })

      const params = new URLSearchParams()
      // Use storeId (can be ObjectId string or _id from populated object)
      params.append('storeId', storeId.toString())
      if (campaignId) params.append('campaignId', campaignId.toString())
      if (schoolId) params.append('schoolId', schoolId.toString())

      const response = await fetch(`/api/stats/deep-analytics?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch deep analytics: ${response.status}`)
      }
      const data = await response.json()
      console.log('[Stats] Deep analytics data received:', {
        totalOrders: data.totalOrders,
        totalSales: data.totalSales,
        hasOrders: data.totalOrders > 0
      })
      setDeepAnalytics(data)
    } catch (error) {
      console.error('[Stats] Error fetching deep analytics:', error)
      setDeepAnalytics(null)
    } finally {
      setDeepAnalyticsLoading(false)
    }
  }, [user?._id, userStoreId, effectiveSchoolId, selectedCampaignId, campaignContext?.campaigns?.length, campaignContext?.activeCampaignId, getCurrentCampaign])

  // Fetch Products - only if not provided via SSR
  const fetchProducts = useCallback(async () => {
    if (initialProducts && initialProducts.length >= 0) {
      return; // Skip if SSR data exists
    }

    try {
      const res = await fetch('/api/products')
      if (!res.ok) {
        throw new Error(`Failed to fetch products: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      if (data && Array.isArray(data.products)) {
        const updatedProductList = await updateProductListWithSchool(data.products)
        setProducts(updatedProductList)
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setError(error.message || 'Failed to load products. Please try again later.')
    }
  }, [initialProducts])

  // Helper function to update products with school names (Define accordingly)
  const updateProductListWithSchool = async (products) => {
    // Example implementation, adjust based on actual requirements
    // This function can fetch additional data for each product if needed
    return products.map(product => ({
      ...product,
      // Add or modify properties as needed
      // Example: schoolName: 'School XYZ'
    }))
  }

  // useEffect to fetch user data when userId changes
  useEffect(() => {
    if (userId && campaignContext?.activeCampaignId) {
      fetchUser(userId)
      const campaignId = getCurrentCampaign()?._id || campaignContext?.activeCampaignId;
      if (campaignId) {
        fetchUserStore(campaignId) // Also fetch store ID
      }
    }
  }, [userId, campaignContext?.activeCampaignId, fetchUser, fetchUserStore, getCurrentCampaign])

  // useEffect to fetch school data, top sellers, raffle, and weekly earnings when user and schoolId are available
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      // Wait for campaign context to be loaded
      if (!campaignContext && session?.user) {
        return; // Still loading campaign context
      }

      // Get current campaign (works for completed campaigns too)
      const currentCampaign = getCurrentCampaign()
      const currentCampaignId = currentCampaign?._id?.toString() || activeCampaignId

      if (user && (currentCampaignId || effectiveSchoolId)) {
        if (cancelled) return
        await fetchCampaignStatsContext(currentCampaignId || activeCampaignId, effectiveSchoolId)

        // Get schoolId from current campaign or use effectiveSchoolId
        const currentCampaignForSchool = getCurrentCampaign()
        const schoolIdForFetch = currentCampaignForSchool?.school?._id?.toString() ||
          currentCampaignForSchool?.schoolId?.toString() ||
          effectiveSchoolId

        // Only fetch these if we have a valid school ID
        if (schoolIdForFetch && schoolIdForFetch !== 'unknown') {
          if (cancelled) return
          // Always fetch leaderboard - it will check internally if SSR data is complete
          // This ensures completed campaigns get fresh data
          fetchTopSellers(schoolIdForFetch, userId)
          // Note: fetchSchoolRaffle is no longer called here - totalRaffle is calculated from productBreakdown
          fetchWeeklyEarnings(schoolIdForFetch, userId)
        }

        // Fetch deep analytics if user has a store (check userStoreId from API or user.store)
        // Also fetch when campaign changes - works for completed campaigns too
        const storeId = userStoreId || user?.store?._id || user?.store
        if (storeId) {
          if (cancelled) return
          fetchDeepAnalytics()
        }
      } else if (user && !effectiveSchoolId && !currentCampaign) {
        // If no school id can be resolved and no campaign found, stop loading to avoid infinite spinner
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [user?._id, activeCampaignId, effectiveSchoolId, userId, userStoreId, selectedCampaignId, campaignContext?.campaigns?.length, campaignContext?.activeCampaignId, initialLeaderboard, getCurrentCampaign])

  // Fetch orders and products on mount; ensure loading finishes even if these endpoints fail
  useEffect(() => {
    // If we have SSR data, set loading to false immediately
    if (initialOrders && initialProducts && initialSchoolData && initialCampaignContext) {
      setLoading(false);
      return;
    }

    let cancelled = false
    const run = async () => {
      try {
        await Promise.allSettled([fetchOrders(), fetchProducts()])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [fetchOrders, fetchProducts, initialOrders, initialProducts, initialSchoolData, initialCampaignContext])

  // useEffect to handle real-time updates (if applicable)
  // Example: WebSocket or polling implementation can be added here

  // Memoize campaignId to avoid unnecessary API calls
  const currentCampaignId = useMemo(() => {
    const currentCampaign = getCurrentCampaign()
    // The API returns campaigns where _id is the actual Campaign._id
    return currentCampaign?._id?.toString() || null
  }, [getCurrentCampaign])

  // Memoize filtered orders to avoid recalculating on every render
  const filteredOrders = useMemo(() => {
    return getFilteredOrders();
  }, [getFilteredOrders]);

  // Defer expensive calculations for better perceived performance
  const deferredFilteredOrders = useDeferredValue(filteredOrders);
  const deferredProducts = useDeferredValue(products);
  const deferredProductBreakdown = useDeferredValue(productBreakdown);

  // Calculate product breakdown with detailed profits
  useEffect(() => {
    let cancelled = false

    const calculateProductBreakdown = async () => {
      if (!school || !deferredFilteredOrders || deferredFilteredOrders.length === 0) {
        if (!cancelled) setProductBreakdown([])
        return
      }

      // Ensure products are available for fallback matching
      let productsList = deferredProducts
      if (!productsList || productsList.length === 0) {
        try {
          const productsResponse = await fetch('/api/products')
          if (productsResponse.ok) {
            const productsData = await productsResponse.json()
            productsList = Array.isArray(productsData) ? productsData : (productsData.products || [])
          }
        } catch (error) {
          console.error('[Stats] Error fetching products for fallback:', error)
        }
      }

      // Get campaign data with fallback - use SSR data if available
      let campaign = null
      let fallbackSplit = school.split || {}

      // Use SSR campaign data if available to avoid API call
      if (initialCampaignData) {
        campaign = initialCampaignData
        fallbackSplit = school.split || {}
      } else if (currentCampaignId && school?._id) {
        // Fallback to API call only if SSR data not available
        try {
          const campaignData = await getCampaignDataWithFallback(school._id, school, currentCampaignId)
          if (cancelled) return
          campaign = campaignData.campaign
          fallbackSplit = campaignData.fallbackSplit || school.split || {}
        } catch (error) {
          console.error('Error fetching campaign data:', error)
          if (cancelled) return
          // Use school split as fallback
          fallbackSplit = school.split || {}
        }
      }

      const productBreakdown = {}
      let totalTip = 0

      // Calculate profits for each order
      deferredFilteredOrders.forEach(order => {
        totalTip += order.tip || 0

        // Calculate profits for each product in the order
        order.products.forEach(product => {
          const productName = product.productName
          const quantity = product.quantity
          const unitPrice = product.productPrice
          const unitCost = product.productCost

          // Calculate raw profit for this product
          const rawProfit = (unitPrice - unitCost) * quantity

          // Calculate profits based on campaign split
          // Use the same logic as detail.jsx
          let cashProfit = 0
          let schoolAccountProfit = 0
          let schoolProfit = 0
          let raffleProfit = 0

          // Get product ID - normalize to string for comparison
          // In orders, product.product is usually an ObjectId (string when lean())
          let productId = null
          if (product.product) {
            if (typeof product.product === 'string') {
              productId = product.product
            } else if (product.product._id) {
              productId = product.product._id.toString()
            } else if (product.product.toString) {
              productId = product.product.toString()
            }
          } else if (product.productId) {
            productId = typeof product.productId === 'string' ? product.productId : product.productId.toString()
          }

          // Normalize productId to string for comparison
          const normalizedProductId = productId ? productId.toString() : null

          // Debug logging for product ID matching
          if (!normalizedProductId) {
            console.warn('[Stats] Product ID not found for product:', productName, 'product object:', product)
          }

          // Check if this product has custom profit splits in the campaign
          // First try by ID, then by name as fallback
          let customProfitSplit = null

          if (campaign?.profitSplits && normalizedProductId) {
            // Try to find by product ID (normalized comparison)
            // Handle ObjectId from lean() queries (they can be ObjectId objects or strings)
            customProfitSplit = campaign.profitSplits.find(ps => {
              if (!ps.productId) return false

              let psProductId = null

              // Handle ObjectId objects (from lean() or populated)
              if (ps.productId && typeof ps.productId === 'object') {
                // Check if it's a Mongoose ObjectId
                if (ps.productId.toString && typeof ps.productId.toString === 'function') {
                  psProductId = ps.productId.toString()
                } else if (ps.productId._id) {
                  psProductId = ps.productId._id.toString()
                } else {
                  // Try to get the hex string directly
                  psProductId = String(ps.productId)
                }
              } else if (typeof ps.productId === 'string') {
                psProductId = ps.productId
              }

              if (!psProductId) return false

              // Normalize both to strings and compare (case-insensitive for hex strings)
              const normalizedPsId = psProductId.toString().toLowerCase()
              const normalizedOrderId = normalizedProductId.toString().toLowerCase()

              return normalizedPsId === normalizedOrderId
            })
          }

          // If not found by ID, try to find by product name (fallback)
          // This can happen if products were created with different IDs but same name
          // Use productsList from outer scope
          if (!customProfitSplit && campaign?.profitSplits && productName && productsList) {
            try {
              // Find product by name (normalize comparison)
              const normalizedProductName = productName.toLowerCase().trim()
              const matchingProduct = productsList.find(p => {
                const pName = (p.name || '').toLowerCase().trim()
                return pName === normalizedProductName
              })

              if (matchingProduct) {
                // Get the matching product's ID
                const matchingProductId = matchingProduct._id?.toString() || matchingProduct.id?.toString()

                if (matchingProductId) {
                  // Now try to find profitSplit with this product ID
                  customProfitSplit = campaign.profitSplits.find(ps => {
                    if (!ps.productId) return false

                    let psProductId = null
                    if (ps.productId && typeof ps.productId === 'object') {
                      if (ps.productId.toString && typeof ps.productId.toString === 'function') {
                        psProductId = ps.productId.toString()
                      } else if (ps.productId._id) {
                        psProductId = ps.productId._id.toString()
                      } else {
                        psProductId = String(ps.productId)
                      }
                    } else if (typeof ps.productId === 'string') {
                      psProductId = ps.productId
                    }

                    if (!psProductId) return false

                    return psProductId.toString().toLowerCase() === matchingProductId.toString().toLowerCase()
                  })

                  if (customProfitSplit) {
                    console.log('[Stats] Found profitSplit by product name fallback:', productName, 'matched productId:', matchingProductId)
                  }
                }
              }
            } catch (error) {
              console.error('[Stats] Error in product name fallback:', error)
            }
          }

          // Debug logging if fallback is used
          if (campaign?.profitSplitType === 'absolute' && !customProfitSplit && normalizedProductId) {
            console.warn('[Stats] Using fallback for product:', productName, {
              productId: normalizedProductId,
              availableProductIds: campaign.profitSplits?.map(ps => {
                let psId = null
                if (ps.productId) {
                  if (typeof ps.productId === 'string') psId = ps.productId
                  else if (ps.productId._id) psId = ps.productId._id.toString()
                  else if (ps.productId.toString) psId = ps.productId.toString()
                }
                return psId
              }).filter(Boolean),
              profitSplitsCount: campaign.profitSplits?.length || 0
            })
          }

          // Check if we should use absolute values from campaign (same condition as detail.jsx)
          if (campaign?.profitSplitType === 'absolute' && customProfitSplit) {
            // Use product-specific absolute values from campaign's profitSplits
            // Preserve 0 values - don't use || which treats 0 as falsy
            // Use same fallbacks as detail.jsx
            const studentCash = customProfitSplit.studentCash !== undefined && customProfitSplit.studentCash !== null
              ? Number(customProfitSplit.studentCash)
              : 1.00
            const studentSchoolAccount = customProfitSplit.studentSchoolAccount !== undefined && customProfitSplit.studentSchoolAccount !== null
              ? Number(customProfitSplit.studentSchoolAccount)
              : 1.00
            const schoolProject = customProfitSplit.schoolProject !== undefined && customProfitSplit.schoolProject !== null
              ? Number(customProfitSplit.schoolProject)
              : 0.75
            const raffle = customProfitSplit.raffle !== undefined && customProfitSplit.raffle !== null
              ? Number(customProfitSplit.raffle)
              : 0.25

            cashProfit = studentCash * quantity
            schoolAccountProfit = studentSchoolAccount * quantity
            schoolProfit = schoolProject * quantity
            raffleProfit = raffle * quantity
          } else {
            // Use percentage-based calculation using school's split configuration (same as detail.jsx)
            const studentBenefit = fallbackSplit?.studentBenefit || 85.6
            const raffleBenefit = fallbackSplit?.raffleBenefit || 5.0
            const orgBenefit = fallbackSplit?.organizationBenefit || 9.4

            // Split student benefit equally between cash and school account (same as detail.jsx)
            const studentBenefitHalf = studentBenefit / 2
            cashProfit = rawProfit * (studentBenefitHalf / 100)
            schoolAccountProfit = rawProfit * (studentBenefitHalf / 100)
            schoolProfit = rawProfit * (orgBenefit / 100)
            raffleProfit = rawProfit * (raffleBenefit / 100)
          }

          if (!productBreakdown[productName]) {
            productBreakdown[productName] = {
              name: productName,
              quantity: 0,
              unitPrice: unitPrice,
              unitCost: unitCost,
              cashProfit: 0,
              schoolAccountProfit: 0,
              schoolProfit: 0,
              raffleProfit: 0,
              totalStudentProfit: 0
            }
          }

          productBreakdown[productName].quantity += quantity
          productBreakdown[productName].cashProfit += cashProfit
          productBreakdown[productName].schoolAccountProfit += schoolAccountProfit
          productBreakdown[productName].schoolProfit += schoolProfit
          productBreakdown[productName].raffleProfit += raffleProfit
          productBreakdown[productName].totalStudentProfit += cashProfit + schoolAccountProfit
        })
      })

      // Note: Tips are NOT distributed in product breakdown
      // They are shown separately in the total earnings calculation

      // Round all values to 2 decimal places
      const roundedBreakdown = Object.values(productBreakdown).map(product => ({
        ...product,
        cashProfit: Math.round(product.cashProfit * 100) / 100,
        schoolAccountProfit: Math.round(product.schoolAccountProfit * 100) / 100,
        schoolProfit: Math.round(product.schoolProfit * 100) / 100,
        raffleProfit: Math.round(product.raffleProfit * 100) / 100,
        totalStudentProfit: Math.round(product.totalStudentProfit * 100) / 100
      }))

      // Custom sort: priority products first, then by quantity (best sellers)
      const priorityProducts = ['Pâté à la viande', 'Pâté au poulet', 'Tarte au sucre']

      const sortedBreakdown = roundedBreakdown.sort((a, b) => {
        const getPriorityIndex = (productName) => {
          const normalizedName = productName.toLowerCase().trim()
          return priorityProducts.findIndex(priority => {
            const normalizedPriority = priority.toLowerCase().trim()
            return normalizedName === normalizedPriority
          })
        }

        const aPriorityIndex = getPriorityIndex(a.name)
        const bPriorityIndex = getPriorityIndex(b.name)

        if (aPriorityIndex !== -1 && bPriorityIndex !== -1) {
          return aPriorityIndex - bPriorityIndex
        }
        if (aPriorityIndex !== -1) return -1
        if (bPriorityIndex !== -1) return 1
        return b.quantity - a.quantity
      })

      if (!cancelled) {
        setProductBreakdown(sortedBreakdown)
      }
    }

    calculateProductBreakdown()

    return () => {
      cancelled = true
    }
  }, [deferredFilteredOrders, school, deferredProducts, currentCampaignId, initialCampaignData])

  // Calculate totalRaffle from productBreakdown to respect campaign splits
  useEffect(() => {
    if (productBreakdown && productBreakdown.length > 0) {
      const raffleTotal = productBreakdown.reduce((sum, product) => {
        return sum + (product.raffleProfit || 0)
      }, 0)
      setTotalRaffle(raffleTotal)
    } else {
      setTotalRaffle(0)
    }
  }, [productBreakdown])

  // Calculate previous period data for comparison (previous week)
  const calculatePreviousPeriodData = useCallback(() => {
    const filteredOrders = getFilteredOrders()
    if (!filteredOrders) return { sales: 0, earnings: 0, orders: 0, products: 0 }

    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const previousWeekStart = new Date(weekStart)
    previousWeekStart.setDate(weekStart.getDate() - 7)
    const previousWeekEnd = new Date(weekStart)

    let prevSales = 0
    let prevEarnings = 0
    let prevOrders = 0
    let prevProducts = 0

    filteredOrders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      if (orderDate >= previousWeekStart && orderDate < previousWeekEnd) {
        prevOrders++
        order.products?.forEach(product => {
          prevProducts += product.quantity || 0
          prevSales += (product.productPrice || 0) * (product.quantity || 0)
        })
      }
    })

    // Calculate earnings for previous period (simplified - would need full profit calculation)
    prevEarnings = prevSales * 0.3 // Approximation

    return { sales: prevSales, earnings: prevEarnings, orders: prevOrders, products: prevProducts }
  }, [getFilteredOrders])

  // Generate chart data for sales over time (current vs previous week)
  const generateSalesChartData = useCallback(() => {
    const filteredOrders = getFilteredOrders()

    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    weekStart.setHours(0, 0, 0, 0)

    // Add 3 days before the week start to show evolution
    const chartStartDate = new Date(weekStart)
    chartStartDate.setDate(weekStart.getDate() - 3)

    const previousWeekStart = new Date(weekStart)
    previousWeekStart.setDate(weekStart.getDate() - 7)

    // Generate data for each day (3 days before + 7 days of week = 10 days total)
    const chartData = []
    for (let i = 0; i < 10; i++) {
      const currentDay = new Date(chartStartDate)
      currentDay.setDate(chartStartDate.getDate() + i)
      currentDay.setHours(0, 0, 0, 0)

      const previousDay = new Date(previousWeekStart)
      previousDay.setDate(previousWeekStart.getDate() + i - 3)
      previousDay.setHours(0, 0, 0, 0)

      let currentDaySales = 0
      let previousDaySales = 0

      filteredOrders.forEach(order => {
        const orderDate = new Date(order.createdAt)
        orderDate.setHours(0, 0, 0, 0)

        if (orderDate.getTime() === currentDay.getTime()) {
          order.products?.forEach(product => {
            currentDaySales += (product.productPrice || 0) * (product.quantity || 0)
          })
        }

        if (orderDate.getTime() === previousDay.getTime()) {
          order.products?.forEach(product => {
            previousDaySales += (product.productPrice || 0) * (product.quantity || 0)
          })
        }
      })

      chartData.push({
        date: currentDay.toISOString(),
        value: currentDaySales,
        previousValue: previousDaySales
      })
    }

    return chartData
  }, [getFilteredOrders])

  // Calculate derived data - memoized
  const totalProductsSold = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) return 0;
    return filteredOrders.reduce((total, order) => {
      return total + order.products.reduce((sum, product) => sum + product.quantity, 0);
    }, 0);
  }, [filteredOrders]);

  const totalSales = useMemo(() => {
    if (!filteredOrders || !school) return 0;
    let total = 0;
    filteredOrders.forEach(order => {
      const orderSales = order.products.reduce((acc, product) => {
        return acc + (product.productPrice * product.quantity);
      }, 0);
      total += orderSales;
    });
    return total;
  }, [filteredOrders, school]);

  const totalCost = useMemo(() => {
    if (!filteredOrders || !school) return 0;
    let total = 0;
    filteredOrders.forEach(order => {
      total += order.products.reduce((acc, product) => {
        // Use productCost if available, otherwise calculate from productPrice with a default margin
        const productCost = product.productCost !== undefined && product.productCost !== null && product.productCost > 0
          ? product.productCost
          : (product.productPrice || 0) * 0.7; // Fallback: assume 30% margin if cost not available
        return acc + (productCost * (product.quantity || 0));
      }, 0);
    });
    return total;
  }, [filteredOrders, school]);

  const totalTip = useMemo(() => {
    if (!filteredOrders || !school) return 0;
    let total = 0;
    filteredOrders.forEach(order => {
      total += order.tip || 0;
    });
    return total;
  }, [filteredOrders, school]);

  const totalStudentEarning = useMemo(() => {
    if (!deferredFilteredOrders || !school) return 0;
    try {
      const currentCampaign = getCurrentCampaign();
      const campaign = currentCampaign ? {
        _id: currentCampaign._id,
        profitSplits: [],
        profitSplitType: 'percentage'
      } : null;
      const fallbackSplit = school.split;
      return calculateStudentEarnings(deferredFilteredOrders, campaign, fallbackSplit);
    } catch (error) {
      console.error('Error calculating student earnings:', error);
      let totalEarnings = 0;
      deferredFilteredOrders.forEach(order => {
        const { products, tip } = order;
        const totalCost = products.reduce((acc, product) => {
          return acc + (product.productCost * product.quantity);
        }, 0);
        const profitBeforeTips = order.totalAmount - totalCost;
        const studentEarnings = (profitBeforeTips * (school.split.studentBenefit / 100)) + (tip || 0);
        totalEarnings += studentEarnings;
      });
      return totalEarnings;
    }
  }, [deferredFilteredOrders, school, getCurrentCampaign]);

  const previousPeriodData = useMemo(() => {
    if (!deferredFilteredOrders) return { sales: 0, earnings: 0, orders: 0, products: 0 };
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(weekStart.getDate() - 7);
    const previousWeekEnd = new Date(weekStart);
    let prevSales = 0, prevEarnings = 0, prevOrders = 0, prevProducts = 0;
    deferredFilteredOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= previousWeekStart && orderDate < previousWeekEnd) {
        prevOrders++;
        order.products?.forEach(product => {
          prevProducts += product.quantity || 0;
          prevSales += (product.productPrice || 0) * (product.quantity || 0);
        });
      }
    });
    prevEarnings = prevSales * 0.3;
    return { sales: prevSales, earnings: prevEarnings, orders: prevOrders, products: prevProducts };
  }, [deferredFilteredOrders]);

  const salesChartData = useMemo(() => {
    if (!deferredFilteredOrders) return [];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const chartStartDate = new Date(weekStart);
    chartStartDate.setDate(weekStart.getDate() - 3);
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(weekStart.getDate() - 7);
    const chartData = [];
    for (let i = 0; i < 10; i++) {
      const currentDay = new Date(chartStartDate);
      currentDay.setDate(chartStartDate.getDate() + i);
      currentDay.setHours(0, 0, 0, 0);
      const previousDay = new Date(previousWeekStart);
      previousDay.setDate(previousWeekStart.getDate() + i - 3);
      previousDay.setHours(0, 0, 0, 0);
      let currentDaySales = 0, previousDaySales = 0;
      deferredFilteredOrders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        if (orderDate.getTime() === currentDay.getTime()) {
          order.products?.forEach(product => {
            currentDaySales += (product.productPrice || 0) * (product.quantity || 0);
          });
        }
        if (orderDate.getTime() === previousDay.getTime()) {
          order.products?.forEach(product => {
            previousDaySales += (product.productPrice || 0) * (product.quantity || 0);
          });
        }
      });
      chartData.push({
        date: currentDay.toISOString(),
        value: currentDaySales,
        previousValue: previousDaySales
      });
    }
    return chartData;
  }, [deferredFilteredOrders]);

  // Calculate today's sales - memoized
  const todaySales = useMemo(() => {
    if (!deferredFilteredOrders) return { products: 0, amount: 0, orders: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let todayProducts = 0, todayAmount = 0, todayOrders = 0;
    deferredFilteredOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      if (orderDate.getTime() === today.getTime()) {
        todayOrders++;
        order.products?.forEach(product => {
          todayProducts += product.quantity || 0;
          todayAmount += (product.productPrice || 0) * (product.quantity || 0);
        });
      }
    });
    return { products: todayProducts, amount: todayAmount, orders: todayOrders };
  }, [deferredFilteredOrders]);

  // Calculate week's sales - memoized
  const weekSales = useMemo(() => {
    if (!deferredFilteredOrders) return { products: 0, amount: 0 };
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    let weekProducts = 0, weekAmount = 0;
    deferredFilteredOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= weekStart) {
        order.products?.forEach(product => {
          weekProducts += product.quantity || 0;
          weekAmount += (product.productPrice || 0) * (product.quantity || 0);
        });
      }
    });
    return { products: weekProducts, amount: weekAmount };
  }, [deferredFilteredOrders]);

  // Simple derived values - memoized
  const moneyRemaining = useMemo(() => user ? user.objectifPersonnel - totalStudentEarning : 0, [user, totalStudentEarning]);
  const progressTowardGoal = useMemo(() => user ? (totalStudentEarning / user.objectifPersonnel) * 100 : 0, [user, totalStudentEarning]);
  const chances = useMemo(() => Math.floor(totalProductsSold / 6), [totalProductsSold]);
  const nextChanceProducts = useMemo(() => 6 - (totalProductsSold % 6), [totalProductsSold]);
  const schoolGoal = useMemo(() => school ? school.objectifFinancier : 0, [school]);
  const personalGoal = useMemo(() => user ? user.objectifPersonnel : 0, [user]);
  const currentCampaign = useMemo(() => getCurrentCampaign(), [getCurrentCampaign]);
  const orderDeadline = useMemo(() => currentCampaign?.endDate || school?.finCampagne || '', [currentCampaign, school]);
  const deliveryDate = useMemo(() => currentCampaign?.deliveryDate || school?.dateDeLivraison || '', [currentCampaign, school]);

  // Calculate average order value
  const averageOrderValue = useMemo(() => {
    if (!deferredFilteredOrders || deferredFilteredOrders.length === 0) return 0
    return totalSales / deferredFilteredOrders.length
  }, [totalSales, deferredFilteredOrders])

  // Calculate conversion rate (products sold / unique customers)
  const conversionRate = useMemo(() => {
    if (!deferredFilteredOrders || deferredFilteredOrders.length === 0) return 0
    const uniqueCustomers = new Set(deferredFilteredOrders.map(o => o.customerName || o.customerEmail || 'unknown')).size
    return uniqueCustomers > 0 ? (totalProductsSold / uniqueCustomers) : 0
  }, [totalProductsSold, deferredFilteredOrders])

  // Calculate unique customers reached (by email address)
  const uniqueCustomersReached = useMemo(() => {
    if (!deferredFilteredOrders || deferredFilteredOrders.length === 0) return 0
    const uniqueEmails = new Set()
    deferredFilteredOrders.forEach(order => {
      if (order.customerEmail) {
        uniqueEmails.add(order.customerEmail.toLowerCase().trim())
      }
    })
    return uniqueEmails.size
  }, [deferredFilteredOrders])

  // Calculate total sales including donations (products + donations)
  const totalSalesWithDonations = useMemo(() => {
    if (!deferredFilteredOrders || deferredFilteredOrders.length === 0) return 0
    let sales = 0
    deferredFilteredOrders.forEach(order => {
      const orderSales = order.products?.reduce((sum, product) => {
        const price = product.productPrice || product.price || 0
        const quantity = product.quantity || 0
        return sum + (price * quantity)
      }, 0) || 0
      const studentDonation = order.studentDonation || order.tip || 0
      const schoolDonation = order.schoolDonation || 0
      sales += orderSales + studentDonation + schoolDonation
    })
    return sales
  }, [deferredFilteredOrders])

  // Calculate total student profit from products only (without donations, after discounts)
  const totalStudentProfitFromProducts = useMemo(() => {
    if (!deferredProductBreakdown || deferredProductBreakdown.length === 0) return 0

    const totals = deferredProductBreakdown.reduce((acc, product) => {
      acc.cashProfit += product.cashProfit || 0
      acc.schoolAccountProfit += product.schoolAccountProfit || 0
      return acc
    }, { cashProfit: 0, schoolAccountProfit: 0 })

    // Subtract discounts
    if (!deferredFilteredOrders || deferredFilteredOrders.length === 0) {
      return totals.cashProfit + totals.schoolAccountProfit
    }

    let discountFromSchoolAccount = 0
    let discountFromCash = 0
    const totalDiscountAmount = deferredFilteredOrders.reduce((sum, order) => {
      if (order.discount !== undefined && order.discount !== null) {
        return sum + (order.discount || 0)
      }
      if (order.products && order.products.length > 0) {
        const originalSubtotal = order.products.reduce((productSum, product) => {
          const price = product.productPrice || product.price || 0
          const quantity = product.quantity || 0
          return productSum + (price * quantity)
        }, 0)
        const discount = Math.max(0, originalSubtotal - (order.totalAmount || 0))
        return sum + discount
      }
      return sum
    }, 0)

    if (totalDiscountAmount > 0) {
      if (totals.schoolAccountProfit >= totalDiscountAmount) {
        discountFromSchoolAccount = totalDiscountAmount
      } else {
        discountFromSchoolAccount = totals.schoolAccountProfit
        discountFromCash = totalDiscountAmount - totals.schoolAccountProfit
      }
    }

    return totals.cashProfit + totals.schoolAccountProfit - discountFromCash - discountFromSchoolAccount
  }, [deferredProductBreakdown, deferredFilteredOrders])

  // Calculate total student profit including donations
  const totalStudentProfitWithDonations = useMemo(() => {
    if (!deferredFilteredOrders || deferredFilteredOrders.length === 0) return totalStudentProfitFromProducts

    // Calculate student donations split
    const totalStudentDonations = deferredFilteredOrders.reduce((sum, order) => {
      if (order.studentDonationSplit) {
        const cash = order.studentDonationSplit.studentCash || 0
        const account = order.studentDonationSplit.studentAccount || 0
        return sum + cash + account
      }
      if (order.tipBreakdown) {
        const cash = order.tipBreakdown.studentCash || 0
        const account = order.tipBreakdown.studentSchoolAccount || 0
        return sum + cash + account
      }
      const studentDonation = order.studentDonation || order.tip || 0
      return sum + studentDonation
    }, 0)

    return totalStudentProfitFromProducts + totalStudentDonations
  }, [deferredFilteredOrders, totalStudentProfitFromProducts])

  const raffleInfo = {
    totalAmount: totalRaffle,
    chances: chances,
    nextChanceProducts: nextChanceProducts,
  }



  // Function to accumulate rewards based on total profit
  const getAccumulatedRewards = (totalProfit) => {
    const accumulatedRewards = []
    for (const level in profitRewards) {
      if (totalProfit >= profitRewards[level].minimum) {
        accumulatedRewards.push(profitRewards[level])
      }
    }
    return accumulatedRewards
  }

  // Function to calculate the next profit reward
  const getNextReward = (totalProfit) => {
    let nextReward = { name: '', productsAway: 0 }
    for (const level in profitRewards) {
      if (totalProfit < profitRewards[level].minimum) {
        nextReward.name = profitRewards[level].badge
        nextReward.productsAway = Math.round((profitRewards[level].minimum - totalProfit) * 100) / 100
        break
      }
    }
    return nextReward
  }

  // Accumulated and next rewards
  const accumulatedProfitRewards = getAccumulatedRewards(totalStudentEarning)
  const nextProfitReward = getNextReward(totalStudentEarning)

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-16 md:pt-20 space-y-6 max-w-7xl">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )

  // Handle loading and error states
  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Utilisateur non trouvé</AlertTitle>
            <AlertDescription>Impossible de charger les informations de l'utilisateur.</AlertDescription>
          </Alert>
        </div>
      </Layout>
    )
  }

  if (!school) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>École non trouvée</AlertTitle>
            <AlertDescription>Impossible de charger les informations de l'école.</AlertDescription>
          </Alert>
        </div>
      </Layout>
    )
  }



  return (
    <Layout>
      {isTest && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3 sm:p-4 shadow-sm mb-3 sm:mb-4 mt-12 sm:mt-16 mx-3 sm:mx-4 md:mx-6 lg:mx-8">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-orange-900 mb-1">
                ⚠️ MODE TEST
              </h3>
              <p className="text-xs sm:text-sm text-orange-800">
                Les statistiques affichées sont en mode test et ne sont pas définitives jusqu'à l'approbation de la campagne.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 pt-12 sm:pt-16 md:pt-20 space-y-4 sm:space-y-6 max-w-7xl overflow-x-hidden">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1 space-y-3">
              {/* Back arrow */}
              <Link
                href="/dashboard"
                passHref
                prefetch={true}
                className="inline-flex items-center text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors group"
                onClick={handleBackNavigation}
              >
                <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
                <span className="truncate">Retour au tableau de bord</span>
              </Link>

              {/* Title */}
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                  Statistiques de campagne
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Suivez vos performances, relevez des défis et montez dans le classement
                </p>
              </div>
            </div>

            {/* Campaign Selector */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 sm:gap-3 w-full md:w-auto">
              <CampaignSelector {...campaignSelectorProps} />
            </div>
          </div>
        </motion.div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          <TabsList className="grid w-full grid-cols-3 h-10 sm:h-11 bg-gray-100/50 p-0.5 sm:p-1 rounded-lg border border-gray-200 text-xs sm:text-sm">
            <TabsTrigger
              value="apercu"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-medium transition-all duration-200 rounded-md px-1 sm:px-3"
            >
              <span className="truncate">Aperçu</span>
            </TabsTrigger>
            <TabsTrigger
              value="produits"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-medium transition-all duration-200 rounded-md px-1 sm:px-3"
            >
              <span className="truncate text-xs sm:text-sm">Statistiques</span>
            </TabsTrigger>
            <TabsTrigger
              value="badges"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-medium transition-all duration-200 rounded-md px-1 sm:px-3"
            >
              <span className="truncate text-xs sm:text-sm">Badges</span>
            </TabsTrigger>
          </TabsList>

          {/* Aperçu Tab */}
          <TabsContent value="apercu" className="space-y-4 sm:space-y-6">

            {/* Campaign Overview - Main Stats */}
            <CampaignOverview
              campaignName={school?.campaignName || 'Campagne de Vente'}
              studentName={user?.name || 'Étudiant'}
              totalSales={totalSalesWithDonations}
              totalEarnings={totalStudentProfitWithDonations}
              totalEarningsWithoutDonations={totalStudentProfitFromProducts}
              totalCost={totalCost}
              totalTip={totalTip}
              salesTarget={user?.objectifPersonnel || 1000}
              productsSold={totalProductsSold}
              customersReached={uniqueCustomersReached}
              daysLeft={orderDeadline ? (() => {
                const days = Math.ceil((new Date(orderDeadline) - new Date()) / (1000 * 60 * 60 * 24));
                return days < 0 ? 'Campagne terminée' : days;
              })() : 0}
              leaderboardPosition={userRank}
              milestones={profitRewards}
              topPerformers={topPerformers}
            />

            {/* Leaderboard - Social Comparison */}
            <EnhancedLeaderboardCard
              rank={userRank}
              topPerformers={topPerformers}
              totalProductsSold={totalProductsSold}
              totalStudentEarning={totalStudentEarning}
              userId={userId}
              groups={groups}
              userGroup={userGroup}
              userGroupRank={userGroupRank}
            />

            {/* Important Dates and Raffle Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <ImportantDatesCard orderDeadline={orderDeadline} deliveryDate={deliveryDate} />
              {totalRaffle > 0 && (
                <RaffleInfoCard
                  raffleInfo={raffleInfo}
                  totalTickets={topPerformers?.reduce((sum, p) => sum + Math.floor((p.totalProductsSold || 0) / 6), 0) || 0}
                />
              )}
            </div>
          </TabsContent>

          {/* Statistiques approfondies + Produits Tab */}
          <TabsContent value="produits" className="space-y-6">
            {/* Deep Analytics Section */}
            {deepAnalyticsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (() => {
              // Check if user has a store (from API or user.store)
              const hasStore = !!(userStoreId || user?.store?._id || user?.store)
              if (!hasStore && user) {
                console.log('[Stats] User does not have store:', {
                  userId: user._id,
                  store: user.store,
                  userStoreId: userStoreId,
                  storeType: typeof user.store,
                  userKeys: Object.keys(user || {})
                })
              }
              return hasStore
            })() ? (
              <>
                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <MetricCard
                    title="Ventes brutes"
                    value={deepAnalytics?.totalSales || 0}
                    formatCurrency={true}
                    previousValue={previousPeriodData.sales}
                  />
                  <MetricCard
                    title="Taux de clients récurrents"
                    value={deepAnalytics?.returningCustomerRate || 0}
                    formatValue={(v) => `${v.toFixed(2)}%`}
                    previousValue={0}
                  />
                  <MetricCard
                    title="Commandes"
                    value={deepAnalytics?.totalOrders || 0}
                    formatValue={(v) => Math.round(v).toString()}
                    previousValue={previousPeriodData.orders}
                  />
                  <MetricCard
                    title="Valeur moyenne de commande"
                    value={deepAnalytics?.averageOrderValue || 0}
                    formatCurrency={true}
                    previousValue={previousPeriodData.sales > 0 ? (previousPeriodData.sales / Math.max(previousPeriodData.orders, 1)) : 0}
                  />
                </div>

                {/* Time Series Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <DeepAnalyticsCard
                    title="Ventes totales dans le temps"
                    value={deepAnalytics?.totalSales || 0}
                    formatCurrency={true}
                    chartData={deepAnalytics?.salesOverTime || []}
                    chartDataKey="value"
                  />
                  <DeepAnalyticsCard
                    title="Historique de la valeur moyenne du panier"
                    value={deepAnalytics?.averageOrderValue || 0}
                    formatCurrency={true}
                    chartData={deepAnalytics?.avgOrderValueOverTime || []}
                    chartDataKey="value"
                  />
                  <DeepAnalyticsCard
                    title="Historique des visites"
                    value={deepAnalytics?.visitsOverTime?.reduce((sum, item) => sum + item.value, 0) || 0}
                    formatValue={(v) => Math.round(v).toString()}
                    chartData={deepAnalytics?.visitsOverTime || []}
                    chartDataKey="value"
                  />
                  <DeepAnalyticsCard
                    title="Taux de conversion dans le temps"
                    value={deepAnalytics?.overallConversionRate || 0}
                    formatValue={(v) => `${v.toFixed(2)}%`}
                    chartData={deepAnalytics?.conversionRateOverTime || []}
                    chartDataKey="value"
                  />
                </div>

                {/* Breakdown and Funnel Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <ConversionFunnelCard funnelData={deepAnalytics?.conversionFunnel} />
                  <DeviceTypeCard deviceData={deepAnalytics?.deviceTypeBreakdown} />
                </div>

                {/* Visit Sources Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <VisitSourceCard sourceData={deepAnalytics?.sourceBreakdown} />
                </div>

                {/* Sales by Product Card */}
                {deepAnalytics?.salesByProduct && deepAnalytics.salesByProduct.length > 0 && (
                  <DeepAnalyticsCard
                    title="Ventes totales par produit"
                    chartType="bar"
                    chartData={deepAnalytics.salesByProduct.map((product, index) => ({
                      date: product.name,
                      value: product.sales,
                      name: product.name
                    }))}
                    chartDataKey="value"
                    breakdown={deepAnalytics.salesByProduct.slice(0, 5).map(product => ({
                      label: product.name,
                      value: product.sales,
                      percentage: deepAnalytics.totalSales > 0 ? (product.sales / deepAnalytics.totalSales) * 100 : 0
                    }))}
                    formatCurrency={true}
                  />
                )}

                {/* Message if no data yet */}
                {!deepAnalytics && !deepAnalyticsLoading && (
                  <div className="text-center py-6 sm:py-8 px-4">
                    <p className="text-sm sm:text-base text-gray-500">Les statistiques approfondies apparaîtront ici une fois que votre boutique recevra des visites et des commandes.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 sm:py-8 px-4">
                <p className="text-sm sm:text-base text-gray-500">Les statistiques approfondies seront disponibles une fois votre boutique créée.</p>
              </div>
            )}

            {/* Products Section (Existing) */}
            <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 px-3 sm:px-0">Détails des Profits</h2>
              <ProductBreakdownCard
                productBreakdown={productBreakdown}
                totalProductsSold={totalProductsSold}
                totalEarnings={totalStudentEarning}
                getFilteredOrders={getFilteredOrders}
                discountEnabled={discountEnabled}
              />
              <ProductDistributionCard productBreakdown={productBreakdown} />
            </div>
          </TabsContent>

          {/* Badges & Accomplissements Tab */}
          <TabsContent value="badges" className="h-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="h-full min-h-[400px] sm:min-h-[600px]"
            >
              <GamificationCard
                totalProfit={totalStudentProfitWithDonations}
                totalProductsSold={totalProductsSold}
                userRank={userRank}
                totalStudentEarning={totalStudentProfitWithDonations}
                orders={orders}
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

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
    </Layout>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex items-center p-2 sm:p-3 md:p-4">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mr-2 sm:mr-3 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-sm sm:text-base md:text-lg font-semibold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Animated Stat Card Component
function AnimatedStatCard({ title, value, icon }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {/*<p className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center mt-1`}>
            {change >= 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
            {Math.abs(change)}% depuis la semaine dernière
          </p>*/}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ProgressCard({ title, value, target, icon = <Trophy className="h-5 w-5" /> }) {
  const percentage = Math.round((value / target) * 100)
  const isComplete = percentage >= 100

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Votre progression actuelle vers l'objectif</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-foreground bg-primary">
                {isComplete ? 'Complété!' : 'En cours'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-primary">
                {percentage}%
              </span>
            </div>
          </div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <Progress
              value={percentage}
              className="h-2"
              indicatorClassName={`bg-gradient-to-r from-blue-500 to-purple-600 ${isComplete ? 'animate-pulse' : ''}`}
            />
          </motion.div>
        </div>
        <p className="text-sm text-muted-foreground mt-2 flex justify-between items-center">
          <span>{value}/{target} {isComplete ? 'Objectif atteint!' : 'restants'}</span>
          <motion.span
            initial={{ scale: 1 }}
            animate={{ scale: isComplete ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.5, repeat: isComplete ? Infinity : 0, repeatDelay: 1 }}
          >
            {isComplete ? '🎉' : '💪'}
          </motion.span>
        </p>
      </CardContent>
    </Card>
  )
}

// Product Breakdown Card Component
function ProductBreakdownCard({ productBreakdown, totalProductsSold, totalEarnings, getFilteredOrders, discountEnabled = true }) {
  // Get filtered orders (only from current campaign)
  const filteredOrders = getFilteredOrders ? getFilteredOrders() : []

  // Calculate total donations from filtered orders
  // Use studentDonationSplit to properly split donations between account and cash
  const totalDonations = filteredOrders.reduce((sum, order) => {
    const studentDonation = order.studentDonation || order.tip || 0
    const schoolDonation = order.schoolDonation || 0
    return sum + studentDonation + schoolDonation
  }, 0)

  const totalSchoolDonations = filteredOrders.reduce((sum, order) => {
    return sum + (order.schoolDonation || 0)
  }, 0)

  // Calculate student donations split between account and cash
  const totalStudentDonationsToAccount = filteredOrders.reduce((sum, order) => {
    // Use studentDonationSplit if available (new format)
    if (order.studentDonationSplit) {
      return sum + (order.studentDonationSplit.studentAccount || 0)
    }
    // Fallback to tipBreakdown (legacy format)
    if (order.tipBreakdown) {
      return sum + (order.tipBreakdown.studentSchoolAccount || 0)
    }
    return sum
  }, 0)

  const totalStudentDonationsToCash = filteredOrders.reduce((sum, order) => {
    // Use studentDonationSplit if available (new format)
    if (order.studentDonationSplit) {
      return sum + (order.studentDonationSplit.studentCash || 0)
    }
    // Fallback to tipBreakdown (legacy format)
    if (order.tipBreakdown) {
      return sum + (order.tipBreakdown.studentCash || 0)
    }
    // Final fallback: if no split info, assume all goes to cash (backward compatibility)
    const studentDonation = order.studentDonation || order.tip || 0
    return sum + studentDonation
  }, 0)

  const totalStudentDonations = totalStudentDonationsToAccount + totalStudentDonationsToCash

  // Calculate total discounts from filtered orders
  const totalDiscountAmount = filteredOrders.reduce((sum, order) => {
    // Use order.discount if available, otherwise calculate from difference
    if (order.discount !== undefined && order.discount !== null) {
      return sum + (order.discount || 0)
    }
    // Fallback: calculate discount from products vs totalAmount
    if (order.products && order.products.length > 0) {
      const originalSubtotal = order.products.reduce((productSum, product) => {
        const price = product.productPrice || product.price || 0
        const quantity = product.quantity || 0
        return productSum + (price * quantity)
      }, 0)
      const discount = Math.max(0, originalSubtotal - (order.totalAmount || 0))
      return sum + discount
    }
    return sum
  }, 0)

  // Calculate how discount affects student profits (deducted from school account first, then cash)
  // Simplified calculation: discount comes from school account profit first, then cash
  let discountFromSchoolAccount = 0
  let discountFromCash = 0

  if (totalDiscountAmount > 0) {
    // Calculate total school account profit from products
    const totalSchoolAccountProfit = productBreakdown.reduce((sum, product) => {
      return sum + (product.schoolAccountProfit || 0)
    }, 0)

    // Discount is deducted from school account first, then cash
    if (totalSchoolAccountProfit >= totalDiscountAmount) {
      discountFromSchoolAccount = totalDiscountAmount
      discountFromCash = 0
    } else {
      discountFromSchoolAccount = totalSchoolAccountProfit
      discountFromCash = totalDiscountAmount - totalSchoolAccountProfit
    }
  }

  if (!productBreakdown || productBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Détail des Profits</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Aucune vente enregistrée pour le moment.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totals = productBreakdown.reduce((acc, product) => {
    acc.quantity += product.quantity
    acc.cashProfit += product.cashProfit || 0
    acc.schoolAccountProfit += product.schoolAccountProfit || 0
    acc.schoolProfit += product.schoolProfit || 0
    acc.raffleProfit += product.raffleProfit || 0
    acc.totalStudentProfit += product.totalStudentProfit || 0
    // Calculate total sales (price * quantity) and total cost (cost * quantity) for products
    const productSales = (product.unitPrice || 0) * (product.quantity || 0)
    const productCost = (product.unitCost || 0) * (product.quantity || 0)
    acc.totalSales += productSales
    acc.totalCost += productCost
    return acc
  }, {
    quantity: 0,
    cashProfit: 0,
    schoolAccountProfit: 0,
    schoolProfit: 0,
    raffleProfit: 0,
    totalStudentProfit: 0,
    totalSales: 0,
    totalCost: 0
  })

  // Check if any raffle profit exists
  const hasRaffleProfit = totals.raffleProfit > 0 || productBreakdown.some(product => (product.raffleProfit || 0) > 0)

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Détail des Profits</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <Table className="min-w-[800px] sm:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Nom du Produit</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Qté</TableHead>
                <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">Prix Vente</TableHead>
                <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">Prix Achat</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Ventes Totales</TableHead>
                <TableHead className="text-right text-xs sm:text-sm hidden lg:table-cell">Coût Total</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Profit Comptant</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Profit Compte</TableHead>
                <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">Profit École</TableHead>
                {hasRaffleProfit && (
                  <TableHead className="text-right text-xs sm:text-sm hidden lg:table-cell">Profit Tirage</TableHead>
                )}
                <TableHead className="text-right font-semibold text-xs sm:text-sm">Total Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productBreakdown.map((product, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium text-xs sm:text-sm">{product.name}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{product.quantity}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">{product.unitPrice.toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">{product.unitCost.toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{((product.unitPrice || 0) * (product.quantity || 0)).toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">{((product.unitCost || 0) * (product.quantity || 0)).toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{product.cashProfit.toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{product.schoolAccountProfit.toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">{product.schoolProfit.toFixed(2)}$</TableCell>
                  {hasRaffleProfit && (
                    <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">{product.raffleProfit.toFixed(2)}$</TableCell>
                  )}
                  <TableCell className="text-right font-semibold text-xs sm:text-sm">{(product.cashProfit + product.schoolAccountProfit).toFixed(2)}$</TableCell>
                </TableRow>
              ))}
              {totalDonations > 0 && (
                <TableRow className="font-medium bg-blue-50">
                  <TableCell className="text-xs sm:text-sm">Dons</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">-</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">-</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">-</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{totalDonations.toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">-</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{totalStudentDonationsToCash.toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{totalStudentDonationsToAccount.toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">{totalSchoolDonations.toFixed(2)}$</TableCell>
                  {hasRaffleProfit && (
                    <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">0.00$</TableCell>
                  )}
                  <TableCell className="text-right font-semibold text-xs sm:text-sm">{totalStudentDonations.toFixed(2)}$</TableCell>
                </TableRow>
              )}
              {discountEnabled && totalDiscountAmount > 0 && (
                <TableRow className="font-medium bg-red-50">
                  <TableCell className="text-xs sm:text-sm">Rabais</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">-</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">-</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">-</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm text-red-600">-{totalDiscountAmount.toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">-</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm text-red-600">-{discountFromCash.toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm text-red-600">-{discountFromSchoolAccount.toFixed(2)}$</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">0.00$</TableCell>
                  {hasRaffleProfit && (
                    <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">0.00$</TableCell>
                  )}
                  <TableCell className="text-right font-semibold text-xs sm:text-sm text-red-600">-{totalDiscountAmount.toFixed(2)}$</TableCell>
                </TableRow>
              )}
              <TableRow className="font-bold bg-gray-50">
                <TableCell className="text-xs sm:text-sm">Total</TableCell>
                <TableCell className="text-right text-xs sm:text-sm">{totals.quantity}</TableCell>
                <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">-</TableCell>
                <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">-</TableCell>
                <TableCell className="text-right text-xs sm:text-sm">{(totals.totalSales + totalDonations - totalDiscountAmount).toFixed(2)}$</TableCell>
                <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">{totals.totalCost.toFixed(2)}$</TableCell>
                <TableCell className="text-right text-xs sm:text-sm">{(totals.cashProfit + totalStudentDonationsToCash - discountFromCash).toFixed(2)}$</TableCell>
                <TableCell className="text-right text-xs sm:text-sm">{(totals.schoolAccountProfit + totalStudentDonationsToAccount - discountFromSchoolAccount).toFixed(2)}$</TableCell>
                <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">{(totals.schoolProfit + totalSchoolDonations).toFixed(2)}$</TableCell>
                {hasRaffleProfit && (
                  <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">{totals.raffleProfit.toFixed(2)}$</TableCell>
                )}
                <TableCell className="text-right text-xs sm:text-sm">{(
                  (totals.cashProfit + totalStudentDonationsToCash - discountFromCash) +
                  (totals.schoolAccountProfit + totalStudentDonationsToAccount - discountFromSchoolAccount)
                ).toFixed(2)}$</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// Product Distribution Card Component
function ProductDistributionCard({ productBreakdown }) {
  if (!productBreakdown || productBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Distribution des Ventes par Produit</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <p className="text-sm sm:text-base">Aucune vente enregistrée pour le moment.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Distribution des Ventes par Produit</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
          <PieChart>
            <Pie
              data={productBreakdown}
              dataKey="quantity"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              label
            >
              {productBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
              ))}
            </Pie>
            <RechartsTooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Weekly Sales Card Component
function WeeklySalesCard({ salesOverTime }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventes par Semaine</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesOverTime}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <RechartsTooltip />
            <Bar dataKey="sales" fill={colors.secondary} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Goals Card Component
function GoalsCard({ personalGoal, schoolGoal, totalProductsSold, totalStudentEarning }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Objectif Personnel</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={(totalStudentEarning / personalGoal) * 100} className="h-2 mb-2" />
          <p>{totalProductsSold} / {personalGoal} produits ({Math.round((totalStudentEarning / personalGoal) * 100)}% complété)</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Objectif de l'École</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={(totalProductsSold / schoolGoal) * 100} className="h-2 mb-2" />
          <p>Vous avez contribué {Math.round((totalStudentEarning / schoolGoal) * 100)}% à l'objectif de l'école</p>
        </CardContent>
      </Card>
    </div>
  )
}

// Important Dates Card Component
function ImportantDatesCard({ orderDeadline, deliveryDate }) {
  return (
    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 p-4 sm:p-6">
        <CardTitle className="flex items-center text-base sm:text-lg">
          <Calendar className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 flex-shrink-0" />
          Dates Importantes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-start space-x-2 sm:space-x-3">
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-600 mt-2"></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Date Limite de Commande</p>
            <p className="text-sm sm:text-base font-semibold text-gray-900 break-words">
              {orderDeadline ? new Date(orderDeadline).toLocaleDateString('fr-CA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Non définie'}
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-2 sm:space-x-3">
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-600 mt-2"></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Date de Livraison</p>
            <p className="text-sm sm:text-base font-semibold text-gray-900 break-words">
              {deliveryDate ? new Date(deliveryDate).toLocaleDateString('fr-CA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Non définie'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Campaign Overview Component
function CampaignOverview({
  campaignName,
  studentName,
  totalSales,
  totalEarnings,
  totalEarningsWithoutDonations,
  totalCost,
  totalTip,
  salesTarget,
  productsSold,
  customersReached,
  daysLeft,
  leaderboardPosition
}) {
  const milestones = [
    { value: salesTarget * 0.25, label: "Bronze", icon: Star, color: "bg-amber-500" },
    { value: salesTarget * 0.50, label: "Argent", icon: Zap, color: "bg-gray-400" },
    { value: salesTarget * 0.75, label: "Or", icon: Trophy, color: "bg-yellow-400" },
    { value: salesTarget, label: "Platine", icon: Award, color: "bg-blue-500" },
  ]

  // Use totalEarnings (profits + tips) for progress bar, not totalSales
  const percentage = (totalEarnings / salesTarget) * 100
  const currentMilestone = milestones.filter(m => totalEarnings >= m.value).pop() || milestones[0]

  const Progress = ({ value, className, indicatorClassName }) => {
    return (
      <div className={`relative w-full h-2 bg-gray-200 rounded ${className}`}>
        <div
          className={`absolute top-0 left-0 h-full rounded ${indicatorClassName}`}
          style={{ width: `${value}%` }}
        />
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl font-bold">{campaignName}</CardTitle>
        <p className="text-sm sm:text-base text-muted-foreground">Bonjour, {studentName}!</p>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        <div className="relative">
          <div className="mb-1 flex justify-between text-xs sm:text-sm">
            <span>Progrès</span>
            <span className="text-right pl-2">{totalEarnings.toFixed(2)}$ / {salesTarget.toFixed(2)}$</span>
          </div>
          <div className="relative">
            <Progress value={percentage} className="h-6" indicatorClassName="bg-gradient-to-r from-blue-500 to-purple-600" />
            <div className="absolute top-0 left-0 w-full h-full flex justify-between items-center px-2">
              {milestones.map((milestone, index) => (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute transform -translate-x-1/2"
                        style={{ left: `${(milestone.value / salesTarget) * 100}%` }}
                      >
                        <Badge
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${totalEarnings >= milestone.value ? milestone.color : 'bg-gray-300'
                            } transition-colors duration-300`}
                        >
                          <milestone.icon className="w-4 h-4 text-white" />
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{milestone.label}: {milestone.value.toFixed(2)}$</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <StatCard icon={DollarSign} label="Ventes Totales" value={`${totalSales.toFixed(2)}$`} />
          <StatCard icon={DollarSign} label="Coûts Totaux" value={`${totalCost.toFixed(2)}$`} />
          <StatCard icon={DollarSign} label="Profits sans dons" value={`${(totalEarningsWithoutDonations || 0).toFixed(2)}$`} />
          <StatCard icon={DollarSign} label="Dons Totaux" value={`${totalTip.toFixed(2)}$`} />
          <StatCard icon={DollarSign} label="Profits + Dons" value={`${totalEarnings.toFixed(2)}$`} />
          <StatCard icon={ShoppingCart} label="Produits Vendus" value={productsSold} />
          <StatCard icon={Users} label="Clients Atteints" value={customersReached} />
          <StatCard icon={TrendingUp} label="Classement" value={`#${leaderboardPosition}`} />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Niveau Actuel:</p>
            <p className="text-lg sm:text-xl font-bold">{currentMilestone.label}</p>
          </div>
          {/* Remove AnimatePresence and isIncreasing since we removed state */}
          <div className="text-left sm:text-right">
            <p className="text-xs sm:text-sm text-muted-foreground">Temps Restant:</p>
            <p className="text-lg sm:text-xl font-bold">
              {typeof daysLeft === 'string' ? daysLeft : `${daysLeft} jours`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Raffle Info Card Component
function RaffleInfoCard({ raffleInfo, totalTickets }) {
  return (
    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 p-4 sm:p-6">
        <CardTitle className="flex items-center text-base sm:text-lg">
          <Gift className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 flex-shrink-0" />
          Tirage au Sort
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
          <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Montant Total du Tirage</p>
          <p className="text-xl sm:text-2xl font-bold text-indigo-700">{parseFloat(raffleInfo.totalAmount || 0).toFixed(2)}$</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-medium text-gray-700">Vos Chances</p>
            <p className="text-base sm:text-lg font-bold text-gray-900">{raffleInfo.chances} ticket{raffleInfo.chances > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-medium text-gray-700">Total de Tickets</p>
            <p className="text-base sm:text-lg font-bold text-gray-900">{totalTickets} ticket{totalTickets > 1 ? 's' : ''}</p>
          </div>
          {totalTickets > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Vous avez {((raffleInfo.chances / totalTickets) * 100).toFixed(1)}% des chances
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs sm:text-sm font-semibold text-yellow-900 mb-1">💡 Comment Gagner Plus de Chances</p>
          <p className="text-xs sm:text-sm text-yellow-800">
            Vendez <span className="font-bold">{raffleInfo.nextChanceProducts} produit{raffleInfo.nextChanceProducts > 1 ? 's' : ''}</span> de plus pour gagner une chance supplémentaire!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Loading State Component
function LoadingState() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <Skeleton className="h-12 w-3/4 mx-auto mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-96" />
    </div>
  )
}

// Error State Component
function ErrorState({ message }) {
  return (
    <div className="container mx-auto p-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  )
}

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

    const campaigns = dashboardData.initialCampaignContext?.campaigns || [];
    const queryCampaignId = Array.isArray(context.query?.campaignId)
      ? context.query.campaignId[0]
      : context.query?.campaignId;

    const findCampaignById = (id) => {
      if (!id) return null;
      return campaigns.find(c => c?._id?.toString() === id.toString());
    };

    let selectedCampaignId = null;

    const queryCampaign = findCampaignById(queryCampaignId);
    if (queryCampaign) {
      selectedCampaignId = queryCampaign._id?.toString() || null;
    }

    if (!selectedCampaignId && dashboardData.initialCampaignContext?.activeCampaignId) {
      const activeCampaign = findCampaignById(dashboardData.initialCampaignContext.activeCampaignId);
      if (activeCampaign) {
        selectedCampaignId = activeCampaign._id?.toString() || null;
      }
    }

    if (!selectedCampaignId && campaigns.length > 0) {
      selectedCampaignId = campaigns[0]._id?.toString() || null;
    }

    const selectedCampaign = findCampaignById(selectedCampaignId);
    const schoolId =
      selectedCampaign?.school?._id?.toString() ||
      dashboardData.initialSchoolData?._id ||
      null;

    const [initialOrders, initialProducts, initialLeaderboard] = await Promise.all([
      getOrdersSSR(session, selectedCampaignId),
      getProductsSSR(),
      schoolId ? getTopSellersSSR(session, schoolId, selectedCampaignId) : Promise.resolve({
        topPerformers: [],
        userRank: null,
        userTotalEarnings: '0.00',
        userTotalProductsSold: 0,
        userCategory: 'Noob'
      })
    ]);

    return {
      props: {
        ...dashboardData,
        initialOrders: initialOrders || [],
        initialProducts: initialProducts || [],
        initialLeaderboard: initialLeaderboard || null,
        initialSelectedCampaignId: selectedCampaignId || null
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps (statistiques):', error);
    return {
      props: {
        initialCampaignContext: { campaigns: [], activeCampaignId: null, mode: 'none' },
        initialStoreInfo: null,
        initialSchoolData: null,
        initialCampaignData: null,
        initialOrders: [],
        initialProducts: [],
        initialLeaderboard: null
      },
    };
  }
}
