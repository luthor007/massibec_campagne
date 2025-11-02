'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
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
import { calculateStudentEarnings, getUserCampaignContext, isTestCampaign } from '@/utils/campaignHelpers'
import CampaignSelector from '@/components/Dashboard/CampaignSelector'
import JoinCampaignModal from '@/components/Dashboard/JoinCampaignModal'
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
  const getCurrentCampaign = () => {
    if (selectedCampaignId && campaignContext?.campaigns) {
      return campaignContext.campaigns.find(c => c._id === selectedCampaignId)
    }
    return campaignContext?.campaigns?.[0] // Fallback to first campaign
  }

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
  }, [orders, selectedCampaignId, campaignContext])

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

    // Function to calculate product breakdown from orders
    const getProductBreakdown = (orders) => {
      const filteredOrders = getFilteredOrders()
      const productBreakdown = filteredOrders.reduce((breakdown, order) => {
        order.products.forEach(product => {
          // Calculate earnings for this product
          const profit = (product.productPrice - product.productCost) * product.quantity
          const studentPercentage = school?.split?.studentBenefit || 85.6
          const earnings = (profit * studentPercentage / 100) + (order.tip || 0)
          
          // Calculate unit price
          const unitPrice = product.productPrice
          
          const existingProduct = breakdown.find(p => p.name === product.productName)
          if (existingProduct) {
            existingProduct.quantity += product.quantity
            existingProduct.earnings += earnings
          } else {
            breakdown.push({ 
              name: product.productName, 
              quantity: product.quantity, 
              earnings: earnings, 
              unitPrice: unitPrice 
            })
          }
        })
        return breakdown
      }, [])
      
      // Round earnings to 2 decimal places
      const roundedBreakdown = productBreakdown.map(product => ({
        ...product,
        earnings: Math.round(product.earnings * 100) / 100
      }))
      
      // Custom sort: priority products first, then by quantity (best sellers)
      const priorityProducts = ['Pâté à la viande', 'Pâté au poulet', 'Tarte au sucre']
      
      return roundedBreakdown.sort((a, b) => {
        // Helper function to check if a product name matches a priority product (case-insensitive, exact match)
        const getPriorityIndex = (productName) => {
          const normalizedName = productName.toLowerCase().trim()
          return priorityProducts.findIndex(priority => {
            const normalizedPriority = priority.toLowerCase().trim()
            return normalizedName === normalizedPriority
          })
        }
        
        const aPriorityIndex = getPriorityIndex(a.name)
        const bPriorityIndex = getPriorityIndex(b.name)
        
        // If both are priority products, maintain their order
        if (aPriorityIndex !== -1 && bPriorityIndex !== -1) {
          return aPriorityIndex - bPriorityIndex
        }
        
        // If only a is priority, a comes first
        if (aPriorityIndex !== -1) {
          return -1
        }
        
        // If only b is priority, b comes first
        if (bPriorityIndex !== -1) {
          return 1
        }
        
        // If neither is priority, sort by quantity (best sellers first)
        return b.quantity - a.quantity
      })
    }

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

  // Calculate derived data
  const totalProductsSold = calculateTotalProductsSold()
  const moneyRemaining = user ? user.objectifPersonnel - totalStudentEarning : 0
  const progressTowardGoal = user ? (totalStudentEarning / user.objectifPersonnel) * 100 : 0
  const productBreakdown = getProductBreakdown(orders)
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

  // Handle loading and error states
  if (loading) {
    return <p>Loading...</p>  }

  if (error) {
    return <p>Error: {error}</p>
  }

  if (!user) {
    return <p>Missing user</p>
  }

  if (!school) {
    return <p>Missing school</p>
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
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex-1 space-y-3">
          {/* Back arrow */}
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Link>
          
          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Statistique de campagne
            </h1>
            <p className="text-sm text-gray-600">
              Suivez vos performances et vos progrès
            </p>
          </div>
        </div>
        
        {/* Campaign Selectors */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <CampaignSelector 
            onCampaignSwitch={handleCampaignSwitch}
            onJoinCampaign={() => setShowJoinCampaignModal(true)}
          />
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <Select 
              value={selectedCampaignId || campaignContext?.campaigns?.[0]?._id} 
              onValueChange={setSelectedCampaignId}
            >
              <SelectTrigger className="w-48">
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
      </motion.div>

      {/* Cards Section */}
      <motion.div 
        ref={statsCardsRef}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        animate={currentStep?.key === 'viewedStats' ? {
          scale: [1, 1.02, 1],
        } : {}}
        transition={{
          duration: 2,
          repeat: currentStep?.key === 'viewedStats' ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        <div className={currentStep?.key === 'viewedStats' ? 'ring-4 ring-blue-500 rounded-lg p-2' : ''}>
          <MotivationCard />
        </div>
        <div className={currentStep?.key === 'viewedStats' ? 'ring-4 ring-blue-500 rounded-lg p-2' : ''}>
          <DailyChallenge />
        </div>
        <div className={currentStep?.key === 'viewedStats' ? 'ring-4 ring-blue-500 rounded-lg p-2' : ''}>
          <AchievementsCard totalProfit={totalStudentEarning} />
        </div>
      </motion.div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-gray-100/50 p-1 rounded-lg">
          <TabsTrigger 
            value="apercu"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium transition-all duration-200 rounded-md"
          >
            Aperçu
          </TabsTrigger>
          <TabsTrigger 
            value="produits"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium transition-all duration-200 rounded-md"
          >
            Produits
          </TabsTrigger>
        </TabsList>

        {/* Aperçu Tab */}
        <TabsContent value="apercu" className="space-y-4">
          <CampaignOverview
                campaignName={school?.campaignName || 'Campagne de Vente'}
                studentName={user?.name || 'Étudiant'}
                totalSales={totalSales}
                totalEarnings={totalStudentEarning}
                totalCost={totalCost}
                totalTip={totalTip}
                salesTarget={user?.objectifPersonnel || 1000}
                productsSold={totalProductsSold}
                customersReached={userProductsSold} // Assuming customersReached is number of products sold
                daysLeft={orderDeadline ? Math.ceil((new Date(orderDeadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0}
                leaderboardPosition={userRank}
                milestones={profitRewards}
                topPerformers={topPerformers}
              />

          <LeaderboardCard rank={userRank} topPerformers={topPerformers} />
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

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <WeeklySalesCard salesOverTime={earnings} />
          <GoalsCard
            personalGoal={personalGoal}
            schoolGoal={schoolGoal}
            totalProductsSold={totalProductsSold}
            totalStudentEarning={totalStudentEarning}
          />
        </TabsContent>
      </Tabs>

      {/* Important Dates and Rewards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImportantDatesCard orderDeadline={orderDeadline} deliveryDate={deliveryDate} />
        <RewardsCard totalProfit={totalStudentEarning} />
      </div>

      {/* Recommendations and Raffle Info */}
      <RecommendationsCard />
      <RaffleInfoCard raffleInfo={raffleInfo} />
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

// Motivation Card Component
function MotivationCard() {
  const [quote, setQuote] = useState("Le succès, c'est tomber sept fois et se relever huit.")

  useEffect(() => {
    const quotes = [
      "Le succès, c'est tomber sept fois et se relever huit.",
      "Le seul endroit où le succès vient avant le travail, c'est dans le dictionnaire.",
      "Le meilleur moyen de prédire l'avenir, c'est de le créer.",
      "Les défis sont ce qui rend la vie intéressante et les surmonter est ce qui lui donne du sens.",
    ]
    const interval = setInterval(() => {
      setQuote(quotes[Math.floor(Math.random() * quotes.length)])
    }, 86400000) // 24 hours

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white h-full">
        <CardContent className="flex flex-col items-center justify-center h-full p-6">
          <div className="text-2xl font-bold mb-4">Motivation du Jour</div>
          <div className="text-lg italic text-center">"{quote}"</div>
        </CardContent>
      </Card>
    </motion.div>
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

// Daily Challenge Card Component
function DailyChallenge() {
  const [challenge, setChallenge] = useState({
    task: "Vendez 5 produits aujourd'hui",
    progress: 3,
    reward: "Badge Vendeur Étoile"
  })

  useEffect(() => {
    const challenges = [
      { task: "Vendez 5 produits aujourd'hui", progress: Math.floor(Math.random() * 6), reward: "Badge Vendeur Étoile" },
      { task: "Partagez votre lien 3 fois", progress: Math.floor(Math.random() * 4), reward: "Bonus de 5%" },
      { task: "Obtenez 2 nouveaux clients", progress: Math.floor(Math.random() * 3), reward: "Produit gratuit" },
    ]
    const interval = setInterval(() => {
      setChallenge(challenges[Math.floor(Math.random() * challenges.length)])
    }, 86400000) // 24 hours

    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="mr-2 h-5 w-5" />
          Défi du Jour
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <h1 className="font-semibold mb-2">{challenge.task}</h1>
        {/*<Progress value={(challenge.progress / 5) * 100} className="h-2 mb-2 bg-white/30" indicatorColor="bg-white" />
        <p>{challenge.progress}/5 complétés</p>
        <p className="mt-2">
          <strong>Récompense:</strong> {challenge.reward}
        </p>*/}
      </CardContent>
    </Card>
  )
}

// Achievements Card Component
function AchievementsCard({ totalProfit }) {
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

  const accumulatedProfitRewards = getAccumulatedRewards(totalProfit)
  const nextProfitReward = getNextReward(totalProfit)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="mr-2 h-5 w-5" />
          Récompenses Gagnées (Profits)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <h3 className="font-semibold">Profits Actuels</h3>
          <Badge variant="outline" className="ml-2 text-yellow-500">Profits: {Math.round(totalProfit * 100) / 100}$</Badge>
        </div>
        <ScrollArea className="h-[200px] mb-4">
          {accumulatedProfitRewards.map((reward, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="flex items-center mb-2"
            >
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>{reward.badge} - {reward.description}</span>
            </motion.div>
          ))}
        </ScrollArea>

        <div className="flex items-center mt-4">
          <Award className="mr-2 h-5 w-5 text-yellow-500" />
          <p><strong>Prochaine Récompense:</strong> {nextProfitReward.name} (à {nextProfitReward.productsAway.toFixed(2)}$ près)</p>
        </div>
      </CardContent>
    </Card>
    
  );
  
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

// Leaderboard Card Component
function LeaderboardCard({ rank, topPerformers }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Classement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          Votre Rang: <Badge variant="secondary" className="text-lg">{rank}ème</Badge>
        </div>
        <h3 className="font-semibold mb-2">Meilleurs Vendeurs:</h3>
        <ol className="list-decimal list-inside">
          {topPerformers.map((performer, index) => (
            <motion.li 
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="mb-2"
            >
              <div className="flex items-center justify-between">
                <span>{performer.name} - {performer.totalProductsSold} produits vendus</span>
                <Badge variant="outline">
                  {performer.category}
                </Badge>
              </div>
            </motion.li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Détail des Produits</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom du Produit</TableHead>
              <TableHead>Quantité Vendue</TableHead>
              <TableHead>Prix Unitaire</TableHead>
              <TableHead>Gains</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productBreakdown.map((product, index) => (
              <TableRow key={index}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.quantity}</TableCell>
                <TableCell>{product.unitPrice.toFixed(2)}$</TableCell>
                <TableCell>{product.earnings.toFixed(2)}$</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell>Total</TableCell>
              <TableCell>{totalProductsSold}</TableCell>
              <TableCell></TableCell>
              <TableCell>{Math.round(totalEarnings * 100) / 100}$</TableCell>
            </TableRow>
          </TableBody>
        </Table>
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
    <Card>
      <CardHeader>
        <CardTitle>Dates Importantes</CardTitle>
      </CardHeader>
      <CardContent>
        <p><strong>Date Limite de Commande:</strong> {new Date(orderDeadline).toLocaleDateString('fr-CA')}</p>
        <p><strong>Date de Livraison:</strong> {new Date(deliveryDate).toLocaleDateString('fr-CA')}</p>
      </CardContent>
    </Card>
  )
}

// Rewards Card Component
function RewardsCard({ totalProfit }) {
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

  const accumulatedRewards = getAccumulatedRewards(totalProfit)
  const nextReward = getNextReward(totalProfit)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Récompenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4">
          <Gift className="mr-2 h-5 w-5 text-green-500" />
          <p><strong>Récompenses Gagnées:</strong></p>
        </div>
        <ScrollArea className="h-[200px]">
          {accumulatedRewards.map((reward, index) => (
            <div key={index} className="flex items-center mb-2">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>{reward.badge} - {reward.description}</span>
            </div>
          ))}
        </ScrollArea>
        <div className="flex items-center mt-4">
          <Award className="mr-2 h-5 w-5 text-yellow-500" />
          <p><strong>Prochaine Récompense:</strong> {nextReward.name} (à {nextReward.productsAway.toFixed(2)}$ près)</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Recommendations Card Component
function RecommendationsCard() {
  const { data: session } = useSession();
  const [storeId, setStoreId] = useState(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const fetchStoreId = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/get-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user.id }),
          });
          const data = await response.json();
          if (data.storeId) {
            setStoreId(data.storeId);
          }
        } catch (error) {
          console.error('Error fetching store ID:', error);
        }
      }
    };
    fetchStoreId();
  }, [session]);

  const handleShare = async () => {
    if (!storeId) {
      toast.error('Votre boutique n\'est pas encore configurée. Veuillez d\'abord personnaliser votre boutique.');
      return;
    }

    setIsSharing(true);
    const storeUrl = `${window.location.origin}/boutique/${storeId}`;
    
    try {
      // Try using Web Share API first
      if (navigator.share) {
        await navigator.share({
          title: 'Ma boutique de financement',
          text: 'Découvrez ma boutique et commandez vos produits préférés!',
          url: storeUrl
        });
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(storeUrl);
        toast.success('Lien copié dans le presse-papiers! Partagez-le maintenant.');
      }
    } catch (error) {
      // User cancelled or error occurred, try clipboard fallback
      try {
        await navigator.clipboard.writeText(storeUrl);
        toast.success('Lien copié dans le presse-papiers!');
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
        toast.error('Impossible de partager le lien. Veuillez le copier manuellement.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommandations</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc list-inside space-y-2">
          <li>Partagez votre lien de vente avec vos amis et votre famille</li>
          <li>Organisez un mini-événement pour promouvoir vos produits</li>
          <li>Utilisez les réseaux sociaux pour atteindre plus de clients potentiels</li>
        </ul>
        <Button 
          className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
          onClick={handleShare}
          disabled={isSharing || !storeId}
        >
          <Share2 className="mr-2 h-4 w-4" />
          {isSharing ? 'Partage en cours...' : 'Partager votre lien de vente'}
        </Button>
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
function RaffleInfoCard({ raffleInfo }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Information sur le Tirage au Sort</CardTitle>
      </CardHeader>
      <CardContent>
        <p><strong>Montant Total du Tirage:</strong> {raffleInfo.totalAmount}$</p>
        <p><strong>Vos Chances:</strong> {raffleInfo.chances} tickets</p>
        <p className="mt-4"><strong>Comment Gagner Plus de Chances:</strong></p>
        <p>Vendez {raffleInfo.nextChanceProducts} produits de plus pour gagner une chance supplémentaire!</p>
       {/*  <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" className="mt-2">
                <TrendingUp className="mr-2 h-4 w-4" />
                Voir le Classement du Tirage
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Classement à venir</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        */}
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
