'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Layout from '../../components/Layout'
import { motion } from 'framer-motion'
import OnboardingTooltip from '../../components/Dashboard/OnboardingTooltip'
import useOnboarding from '../../hooks/useOnboarding'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

export default function StatistiquesEtudiantUltime() {

  const [activeTab, setActiveTab] = useState("apercu")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [schoolFetchFailed, setSchoolFetchFailed] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState(null)
  
  const [orders, setOrders] = useState([])
  const [school, setSchool] = useState(null)
  const [user, setUser] = useState(null)
  const [topPerformers, setTopPerformers] = useState([])
  const [userRank, setUserRank] = useState(null)
  const [userEarnings, setUserEarnings] = useState(0)
  const [userProductsSold, setUserProductsSold] = useState(0)
  const [totalRaffle, setTotalRaffle] = useState(0)
  const [earnings, setEarnings] = useState([])
  const [products, setProducts] = useState([])
  const [totalStudentEarning, setTotalStudentEarning] = useState(0)
  const [productBreakdown, setProductBreakdown] = useState([])
  
  // Campaign-related state
  const [campaignContext, setCampaignContext] = useState(null)
  const [showJoinCampaignModal, setShowJoinCampaignModal] = useState(false)
  
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

  const userId = session?.user?.id
  // Campaign-first identifiers
  const activeCampaignId = campaignContext?.activeCampaignId
  const schoolId = session?.user?.school
  // Get school ID from campaign context or fallback to user's school
  const effectiveSchoolId = campaignContext?.schoolId || schoolId

  // Get current campaign or fallback to active campaign
  const getCurrentCampaign = useCallback(() => {
    if (selectedCampaignId && campaignContext?.campaigns) {
      return campaignContext.campaigns.find(c => c._id === selectedCampaignId)
    }
    return campaignContext?.campaigns?.[0] // Fallback to first campaign
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

    // Current campaign objects may be shaped either with `_id` (embedded user.campaign doc)
    // or `campaignId` (actual Campaign._id). Orders store the actual campaignId.
    const campaignIdToMatch = (
      currentCampaign.campaignId?._id ||
      currentCampaign.campaignId ||
      currentCampaign._id
    )?.toString()

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

  // Fetch campaign context
  useEffect(() => {
    const fetchCampaignContext = async () => {
      if (!session?.user) return;
      
      try {
        const response = await fetch('/api/users/campaigns');
        if (response.ok) {
          const data = await response.json();
          // Create campaign context directly from API response
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
  }, [session]);

  // Campaign handlers
  const handleCampaignSwitch = (campaignId) => {
    // Refresh data when campaign switches
    window.location.reload(); // Simple refresh for now
  };

  const handleJoinCampaignSuccess = (campaign) => {
    toast({
      title: "Campagne rejoint avec succès!",
      description: `Vous avez rejoint la campagne ${campaign.campaignCode} de ${campaign.school.name}`,
    });
    setShowJoinCampaignModal(false);
    // Refresh campaign context
    window.location.reload();
  };

  // Onboarding logic for stats page
  useEffect(() => {
    if (!onboardingLoading && currentStep?.key === 'viewedStats') {
      setShowOnboardingTooltip(true);
      setTooltipTarget(statsCardsRef.current);
    } else {
      setShowOnboardingTooltip(false);
    }
  }, [currentStep, onboardingLoading]);

  // Onboarding handlers
  const handleOnboardingNext = async () => {
    if (currentStep?.key === 'viewedStats') {
      const success = await markStepComplete('viewedStats', true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  };

  const handleOnboardingSkip = async () => {
    if (currentStep?.key === 'viewedStats') {
      const success = await markStepComplete('viewedStats', true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  };

  const handleOnboardingClose = () => {
    setShowOnboardingTooltip(false);
  };

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

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/commandes')
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      const data = await response.json()
      // Ensure we always store an array (empty array when no orders)
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      // Fallback to empty orders so UI still renders
      setOrders([])
    }
  }, [])

  // Fetch Top Sellers
  const fetchTopSellers = useCallback(async (schoolId, userId) => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/topsellers/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId: getCurrentCampaign()?._id })
      })
      if (!response.ok) {
        console.warn(`Top sellers API returned ${response.status}: ${response.statusText}`)
        throw new Error(`Failed to fetch top sellers: ${response.status}`)
      }
      const data = await response.json()
      setTopPerformers(data.topPerformers)
      setUserRank(data.userRank)
      setUserEarnings(data.userTotalEarnings)
      setUserProductsSold(data.userTotalProductsSold)
    } catch (error) {
      console.warn('Top sellers fetch failed, using defaults:', error.message)
      // Fallback defaults
      setTopPerformers([])
      setUserRank(null)
      setUserEarnings(0)
      setUserProductsSold(0)
    }
  }, [selectedCampaignId, campaignContext])

  // Fetch School Raffle
  const fetchSchoolRaffle = useCallback(async (schoolId) => {
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
  }, [selectedCampaignId, campaignContext])

  // Fetch Weekly Earnings
  const fetchWeeklyEarnings = useCallback(async (schoolId, userId) => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/student/${userId}/earnings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId: getCurrentCampaign()?._id })
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
  }, [selectedCampaignId, campaignContext])

  // Fetch Products (Assuming updateProductListWithSchool is defined elsewhere)
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      if (!res.ok) {
        throw new Error(`Failed to fetch products: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      console.log('API Response:', data) // Debugging

      if (data && Array.isArray(data.products)) {
        // Assuming updateProductListWithSchool is a function that enriches products with school names
        const updatedProductList = await updateProductListWithSchool(data.products)
        setProducts(updatedProductList)
        console.log('Products updated with school names:', updatedProductList) // Debugging
      } else {
        setProducts([])
        console.warn('Unexpected API response structure:', data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setError(error.message || 'Failed to load products. Please try again later.')
    }
  }, [])

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
    if (userId) {
      fetchUser(userId)
    }
  }, [userId, fetchUser])

  // useEffect to fetch school data, top sellers, raffle, and weekly earnings when user and schoolId are available
  useEffect(() => {
    const fetchData = async () => {
      // Wait for campaign context to be loaded
      if (!campaignContext && session?.user) {
        return; // Still loading campaign context
      }
      
      if (user && (activeCampaignId || effectiveSchoolId)) {
        await fetchCampaignStatsContext(activeCampaignId, effectiveSchoolId)
        
        // Only fetch these if we have a valid school ID
        if (effectiveSchoolId && effectiveSchoolId !== 'unknown') {
          fetchTopSellers(effectiveSchoolId, userId)
          fetchSchoolRaffle(effectiveSchoolId)
          fetchWeeklyEarnings(effectiveSchoolId, userId)
        }
      } else if (user && !effectiveSchoolId) {
        // If no school id can be resolved, stop loading to avoid infinite spinner
        setLoading(false)
      }
    }
    
    fetchData()
  }, [user, campaignContext, activeCampaignId, effectiveSchoolId, fetchCampaignStatsContext, fetchSchoolData, fetchTopSellers, fetchSchoolRaffle, fetchWeeklyEarnings, userId, selectedCampaignId])

  // Fetch orders and products on mount; ensure loading finishes even if these endpoints fail
  useEffect(() => {
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
  }, [fetchOrders, fetchProducts])

  // useEffect to handle real-time updates (if applicable)
  // Example: WebSocket or polling implementation can be added here

  // Memoize campaignId to avoid unnecessary API calls
  const currentCampaignId = useMemo(() => {
    const currentCampaign = getCurrentCampaign()
    return currentCampaign?._id || currentCampaign?.campaignId?._id || currentCampaign?.campaignId || null
  }, [getCurrentCampaign])

  // Calculate product breakdown with detailed profits
  useEffect(() => {
    let cancelled = false
    
    const calculateProductBreakdown = async () => {
      const filteredOrders = getFilteredOrders()
      if (!school || filteredOrders.length === 0) {
        if (!cancelled) setProductBreakdown([])
        return
      }
      
      // Get campaign data with fallback
      let campaign = null
      let fallbackSplit = school.split || {}
      
      if (currentCampaignId && school?._id) {
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
      filteredOrders.forEach(order => {
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
          
          // Get product ID - same way as detail.jsx
          const productId = product.product?._id?.toString() || 
                           product.product?.toString() || 
                           product.productId?.toString()
          
          // Check if this product has custom profit splits in the campaign (same as detail.jsx)
          const customProfitSplit = campaign?.profitSplits?.find(ps => {
            const psProductId = ps.productId?._id?.toString() || ps.productId?.toString()
            return psProductId === productId
          })
          
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
  }, [orders, school, getFilteredOrders, currentCampaignId])

  // Calculate total student earnings using campaign data
  useEffect(() => {
    const calculateEarnings = async () => {
      if (school && orders.length > 0) {
        try {
          const earnings = await calculateTotalStudentEarnings();
          setTotalStudentEarning(earnings);
        } catch (error) {
          console.error('Error calculating student earnings:', error);
          setTotalStudentEarning(0);
        }
      }
    };
    
    calculateEarnings();
  }, [school, orders, calculateTotalStudentEarnings]);

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
    if (!filteredOrders || filteredOrders.length === 0) return []
    
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    weekStart.setHours(0, 0, 0, 0)
    
    const previousWeekStart = new Date(weekStart)
    previousWeekStart.setDate(weekStart.getDate() - 7)
    
    // Generate data for each day of the current week
    const chartData = []
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart)
      currentDay.setDate(weekStart.getDate() + i)
      currentDay.setHours(0, 0, 0, 0)
      
      const previousDay = new Date(previousWeekStart)
      previousDay.setDate(previousWeekStart.getDate() + i)
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

  // Calculate derived data
  const totalProductsSold = calculateTotalProductsSold()
  const moneyRemaining = user ? user.objectifPersonnel - totalStudentEarning : 0
  const progressTowardGoal = user ? (totalStudentEarning / user.objectifPersonnel) * 100 : 0
  const chances = Math.floor(totalProductsSold / 6)
  const nextChanceProducts = 6 - (totalProductsSold % 6)
  const schoolGoal = school ? school.objectifFinancier : 0
  const personalGoal = user ? user.objectifPersonnel : 0
  const currentCampaign = getCurrentCampaign()
  const orderDeadline = currentCampaign?.endDate || school?.finCampagne || ''
  const deliveryDate = currentCampaign?.deliveryDate || school?.dateDeLivraison || ''
  const totalSales = calculateTotalStudentSales()
  const totalCost = calculateTotalStudentCost()
  const totalTip = calculateTotalStudentTip()
  
  // Previous period data
  const previousPeriodData = calculatePreviousPeriodData()
  const salesChartData = generateSalesChartData()
  
  // Calculate total orders count
  const totalOrdersCount = useMemo(() => {
    return getFilteredOrders()?.length || 0
  }, [getFilteredOrders])
  
  // Calculate average order value
  const averageOrderValue = useMemo(() => {
    const orders = getFilteredOrders()
    if (!orders || orders.length === 0) return 0
    return totalSales / orders.length
  }, [totalSales, getFilteredOrders])
  
  // Calculate conversion rate (products sold / unique customers)
  const conversionRate = useMemo(() => {
    const orders = getFilteredOrders()
    if (!orders || orders.length === 0) return 0
    const uniqueCustomers = new Set(orders.map(o => o.customerName || o.customerEmail || 'unknown')).size
    return uniqueCustomers > 0 ? (totalProductsSold / uniqueCustomers) : 0
  }, [totalProductsSold, getFilteredOrders])

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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-8 space-y-6 max-w-7xl">
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
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 shadow-sm mb-4 mt-16">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-orange-900 mb-1">
                ⚠️ MODE TEST
              </h3>
              <p className="text-sm text-orange-800">
                Les statistiques affichées sont en mode test et ne sont pas définitives jusqu'à l'approbation de la campagne.
              </p>
            </div>
          </div>
        </div>
      )}
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-8 space-y-6 max-w-7xl">
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
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors group"
          >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:text-indigo-600 transition-colors" />
            Retour au tableau de bord
          </Link>
          
          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Statistiques de campagne
            </h1>
              <p className="text-base text-gray-600">
                Suivez vos performances, relevez des défis et montez dans le classement
            </p>
          </div>
        </div>
        
        {/* Campaign Selectors */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <CampaignSelector 
            onCampaignSwitch={handleCampaignSwitch}
            onJoinCampaign={() => setShowJoinCampaignModal(true)}
          />
          
            <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
            <Select 
              value={selectedCampaignId || campaignContext?.campaigns?.[0]?._id} 
              onValueChange={setSelectedCampaignId}
            >
                <SelectTrigger className="w-48 border-0 shadow-none focus:ring-0 h-auto">
                <SelectValue placeholder="Sélectionner une campagne" />
              </SelectTrigger>
              <SelectContent>
                {campaignContext?.campaigns?.map((campaign) => (
                  <SelectItem key={campaign._id} value={campaign._id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{campaign.campaignCode}</span>
                      <span className="text-xs text-gray-500">
                        {campaign.startDate && campaign.endDate 
                          ? `${new Date(campaign.startDate).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })} - ${new Date(campaign.endDate).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}`
                          : 'Dates non disponibles'
                        }
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        </div>
      </motion.div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mb-8">
        <TabsList className="grid w-full grid-cols-3 h-11 bg-gray-100/50 p-1 rounded-lg border border-gray-200">
          <TabsTrigger 
            value="apercu"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-medium transition-all duration-200 rounded-md"
          >
            Aperçu
          </TabsTrigger>
          <TabsTrigger 
            value="produits"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-medium transition-all duration-200 rounded-md"
          >
            Produits
          </TabsTrigger>
          <TabsTrigger 
            value="badges"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-medium transition-all duration-200 rounded-md"
          >
            Badges & Accomplissements
          </TabsTrigger>
        </TabsList>

        {/* Aperçu Tab */}
        <TabsContent value="apercu" className="space-y-6">
          {/* Shopify-style Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Total Sales */}
            <MetricCard
              title="Total des ventes"
              value={totalSales}
              previousValue={previousPeriodData.sales}
              formatCurrency={true}
              chartData={salesChartData}
              chartDataKey="value"
              chartDataKeyPrevious="previousValue"
            />
            
            {/* Total Profits */}
            <MetricCard
              title="Total des profits"
              value={totalStudentEarning}
              previousValue={previousPeriodData.earnings}
              formatCurrency={true}
              breakdown={[
                { label: 'Profits + Pourboires', value: totalStudentEarning + totalTip, growth: undefined }
              ]}
            />
            
            {/* Total Orders */}
            <MetricCard
              title="Commandes totales"
              value={totalOrdersCount}
              previousValue={previousPeriodData.orders}
              formatValue={(v) => Math.round(v).toString()}
            />
            
            {/* Conversion Rate */}
            <MetricCard
              title="Taux de conversion"
              value={conversionRate}
              previousValue={previousPeriodData.products > 0 ? (previousPeriodData.products / Math.max(previousPeriodData.orders, 1)) : 0}
              formatValue={(v) => `${(v * 100).toFixed(2)}%`}
              breakdown={[
                { label: 'Produits vendus', value: totalProductsSold },
                { label: 'Clients atteints', value: userProductsSold || totalOrdersCount }
              ]}
            />
            
            {/* Average Order Value */}
            <MetricCard
              title="Valeur moyenne de commande"
              value={averageOrderValue}
              previousValue={previousPeriodData.sales > 0 ? (previousPeriodData.sales / Math.max(previousPeriodData.orders, 1)) : 0}
              formatCurrency={true}
            />
            
            {/* Products Sold */}
            <MetricCard
              title="Produits vendus"
              value={totalProductsSold}
              previousValue={previousPeriodData.products}
              formatValue={(v) => Math.round(v).toString()}
            />
          </div>

          {/* Campaign Overview - Main Stats */}
          <CampaignOverview
            campaignName={school?.campaignName || 'Campagne de Vente'}
            studentName={user?.name || 'Étudiant'}
            totalSales={totalSales}
            totalEarnings={totalStudentEarning}
            totalCost={totalCost}
            totalTip={totalTip}
            salesTarget={user?.objectifPersonnel || 1000}
            productsSold={totalProductsSold}
            customersReached={userProductsSold}
            daysLeft={orderDeadline ? Math.ceil((new Date(orderDeadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0}
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
          />

          {/* Important Dates and Raffle Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImportantDatesCard orderDeadline={orderDeadline} deliveryDate={deliveryDate} />
            {totalRaffle > 0 && (
              <RaffleInfoCard 
                raffleInfo={raffleInfo}
                totalTickets={topPerformers?.reduce((sum, p) => sum + Math.floor((p.totalProductsSold || 0) / 6), 0) || 0}
              />
            )}
          </div>
        </TabsContent>

        {/* Produits Tab */}
        <TabsContent value="produits" className="space-y-4">
          <ProductBreakdownCard
            productBreakdown={productBreakdown}
            totalProductsSold={totalProductsSold}
            totalEarnings={totalStudentEarning}
          />
          <ProductDistributionCard productBreakdown={productBreakdown} />
        </TabsContent>

        {/* Badges & Accomplissements Tab */}
        <TabsContent value="badges" className="h-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="h-full min-h-[600px]"
          >
            <GamificationCard
              totalProfit={totalStudentEarning}
            totalProductsSold={totalProductsSold}
              userRank={userRank}
            totalStudentEarning={totalStudentEarning}
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
      onClose={() => setShowJoinCampaignModal(false)}
      onSuccess={handleJoinCampaignSuccess}
    />
    </Layout>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex items-center p-4">
        <Icon className="h-5 w-5 text-muted-foreground mr-3" />
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
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
function ProductBreakdownCard({ productBreakdown, totalProductsSold, totalEarnings }) {
  if (!productBreakdown || productBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Détail des Produits</CardTitle>
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
    return acc
  }, {
    quantity: 0,
    cashProfit: 0,
    schoolAccountProfit: 0,
    schoolProfit: 0,
    raffleProfit: 0,
    totalStudentProfit: 0
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Détail des Produits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom du Produit</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead className="text-right">Prix Vente</TableHead>
                <TableHead className="text-right">Prix Achat</TableHead>
                <TableHead className="text-right">Profit Comptant</TableHead>
                <TableHead className="text-right">Profit Compte Scolaire</TableHead>
                <TableHead className="text-right">Profit École</TableHead>
                <TableHead className="text-right">Profit Tirage</TableHead>
                <TableHead className="text-right font-semibold">Total Profit Élève</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productBreakdown.map((product, index) => (
              <TableRow key={index}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right">{product.quantity}</TableCell>
                  <TableCell className="text-right">{product.unitPrice.toFixed(2)}$</TableCell>
                  <TableCell className="text-right">{product.unitCost.toFixed(2)}$</TableCell>
                  <TableCell className="text-right">{product.cashProfit.toFixed(2)}$</TableCell>
                  <TableCell className="text-right">{product.schoolAccountProfit.toFixed(2)}$</TableCell>
                  <TableCell className="text-right">{product.schoolProfit.toFixed(2)}$</TableCell>
                  <TableCell className="text-right">{product.raffleProfit.toFixed(2)}$</TableCell>
                  <TableCell className="text-right font-semibold">{product.totalStudentProfit.toFixed(2)}$</TableCell>
              </TableRow>
            ))}
              <TableRow className="font-bold bg-gray-50">
              <TableCell>Total</TableCell>
                <TableCell className="text-right">{totals.quantity}</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">{totals.cashProfit.toFixed(2)}$</TableCell>
                <TableCell className="text-right">{totals.schoolAccountProfit.toFixed(2)}$</TableCell>
                <TableCell className="text-right">{totals.schoolProfit.toFixed(2)}$</TableCell>
                <TableCell className="text-right">{totals.raffleProfit.toFixed(2)}$</TableCell>
                <TableCell className="text-right">{totals.totalStudentProfit.toFixed(2)}$</TableCell>
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
        <CardHeader>
          <CardTitle>Distribution des Ventes par Produit</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Aucune vente enregistrée pour le moment.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution des Ventes par Produit</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
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
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
        <CardTitle className="flex items-center text-lg">
          <Calendar className="mr-2 h-5 w-5 text-indigo-600" />
          Dates Importantes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-600 mt-2"></div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Date Limite de Commande</p>
            <p className="text-base font-semibold text-gray-900">
              {orderDeadline ? new Date(orderDeadline).toLocaleDateString('fr-CA', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'Non définie'}
            </p>
        </div>
            </div>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-600 mt-2"></div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Date de Livraison</p>
            <p className="text-base font-semibold text-gray-900">
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

  const percentage = (totalSales / salesTarget) * 100
  const currentMilestone = milestones.filter(m => totalSales >= m.value).pop() || milestones[0]

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
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{campaignName}</CardTitle>
        <p className="text-muted-foreground">Bonjour, {studentName}!</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          <div className="mb-1 flex justify-between text-sm">
            <span>Progrès</span>
            <span>{totalSales.toFixed(2)}$ / {salesTarget.toFixed(2)}$</span>
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
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            totalSales >= milestone.value ? milestone.color : 'bg-gray-300'
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Ventes Totales" value={`${totalSales.toFixed(2)}$`} />
          <StatCard icon={DollarSign} label="Coûts Totaux" value={`${totalCost.toFixed(2)}$`} />
          <StatCard icon={DollarSign} label="Profits Totales" value={`${(totalEarnings - totalTip).toFixed(2)}$`} />
          <StatCard icon={DollarSign} label="Pourboires Totales" value={`${totalTip.toFixed(2)}$`} />
          <StatCard icon={DollarSign} label="Profits + Pourboires" value={`${totalEarnings.toFixed(2)}$`} />
          <StatCard icon={ShoppingCart} label="Produits Vendus" value={productsSold} />
          <StatCard icon={ShoppingCart} label="Caisse Pleine" value={(productsSold / 6).toFixed(2)} />
          <StatCard icon={Users} label="Clients Atteints" value={customersReached} />
          <StatCard icon={TrendingUp} label="Classement" value={`#${leaderboardPosition}`} />
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Niveau Actuel:</p>
            <p className="text-xl font-bold">{currentMilestone.label}</p>
          </div>
          {/* Remove AnimatePresence and isIncreasing since we removed state */}
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Temps Restant:</p>
            <p className="text-xl font-bold">{daysLeft} jours</p>
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
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
        <CardTitle className="flex items-center text-lg">
          <Gift className="mr-2 h-5 w-5 text-indigo-600" />
          Tirage au Sort
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Montant Total du Tirage</p>
          <p className="text-2xl font-bold text-indigo-700">{parseFloat(raffleInfo.totalAmount || 0).toFixed(2)}$</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Vos Chances</p>
            <p className="text-lg font-bold text-gray-900">{raffleInfo.chances} ticket{raffleInfo.chances > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Total de Tickets</p>
            <p className="text-lg font-bold text-gray-900">{totalTickets} ticket{totalTickets > 1 ? 's' : ''}</p>
          </div>
          {totalTickets > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Vous avez {((raffleInfo.chances / totalTickets) * 100).toFixed(1)}% des chances
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-semibold text-yellow-900 mb-1">💡 Comment Gagner Plus de Chances</p>
          <p className="text-sm text-yellow-800">
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
