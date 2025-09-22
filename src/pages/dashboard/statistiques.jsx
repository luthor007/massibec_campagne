'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import { motion } from 'framer-motion'
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
import { useSession } from 'next-auth/react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import {
  Award, Gift, Share2, TrendingUp, Star, Zap, Target,
  AlertTriangle, Check, ArrowUp, ArrowDown, Trophy
} from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Info } from 'lucide-react'
import { Users, ShoppingCart, DollarSign } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'


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

export default function StatistiquesEtudiantUltime() {

  const [activeTab, setActiveTab] = useState("apercu")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
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

  const { toast } = useToast()
  const { data: session, status } = useSession()

  const userId = session?.user?.id
  const schoolId = session?.user?.school

  useEffect(() => {
    console.log('Session:', session);
    console.log('Status:', status);
    console.log('User ID:', userId);
    console.log('School ID:', schoolId);
  }, [session, status, userId, schoolId]);

  // Calculate total products sold
// Calculate total products sold
  const calculateTotalProductsSold = useCallback(() => {
    if (!orders || orders.length === 0) return 0;
    return orders.reduce((total, order) => {
      return total + order.products.reduce((sum, product) => sum + product.quantity, 0);
    }, 0);
  }, [orders]);

  // Calculate total student earnings
  const calculateTotalStudentEarnings = useCallback(() => {
    if (!orders || !school) return 0;
    let totalEarnings = 0;

    orders.forEach(order => {
      const { products, tip } = order;

      // Calculate total cost of products in the order
      const totalCost = products.reduce((acc, product) => {
        return acc + (product.productCost * product.quantity);
      }, 0);

      // Calculate profit before tips
      const profitBeforeTips = order.totalAmount - totalCost;

      // Calculate student earnings based on the percentage
      const studentEarnings = (profitBeforeTips * (school.split.studentBenefit / 100)) + tip;

      // Add to total earnings
      totalEarnings += studentEarnings;
    });

    return totalEarnings;
  }, [orders, school]);


    // Calculate total student earnings
    const calculateTotalStudentTip = useCallback(() => {
      if (!orders || !school) return 0;
      let totalTip = 0;
  
      orders.forEach(order => {
        const { tip } = order;
  
        // Add to total earnings
        totalTip += tip;
      });
  
      return totalTip;
    }, [orders, school]);

    // Calculate total student sales
  const calculateTotalStudentSales = useCallback(() => {
    if (!orders || !school) return 0;
    let totalSales = 0;

    orders.forEach(order => {
      const { products } = order;

      // Calculate total sales from products in the order
      const orderSales = products.reduce((acc, product) => {
        return acc + (product.productPrice * product.quantity);
      }, 0);

      // Add to total sales
      totalSales += orderSales;
    });

    return totalSales;
  }, [orders, school]);

  // Calculate total student cost
  const calculateTotalStudentCost = useCallback(() => {
    if (!orders || !school) return 0;
    let totalCost = 0;

    orders.forEach(order => {
      const { products } = order;

      // Calculate total cost of products in the order
      totalCost += products.reduce((acc, product) => {
        return acc + (product.productCost * product.quantity);
      }, 0);
    });

    return totalCost;
  }, [orders, school]);

  // Handle real-time updates (if applicable)
  const handleUpdate = useCallback((newData) => {
    // Update state based on newData
    // Example:
    // setOrders(newData.orders)
    // setTopPerformers(newData.topPerformers)
    // Implement according to your actual data structure
  }, [toast])

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
      setError(error.message)
    }
  }, [])

  // Fetch School Data
  const fetchSchoolData = useCallback(async (schoolId) => {
    try {
      const response = await fetch(`/api/schools/${schoolId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch school data')
      }
      const schoolData = await response.json()
      setSchool(schoolData)
    } catch (error) {
      setError(error.message)
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
      setOrders(data || '')
    } catch (error) {
      setError(error.message)
    }
  }, [])

  // Fetch Top Sellers
  const fetchTopSellers = useCallback(async (schoolId, userId) => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/topsellers/${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch top sellers')
      }
      const data = await response.json()
      setTopPerformers(data.topPerformers)
      setUserRank(data.userRank)
      setUserEarnings(data.userTotalEarnings)
      setUserProductsSold(data.userTotalProductsSold)
    } catch (error) {
      setError(error.message)
    }
  }, [])

  // Fetch School Raffle
  const fetchSchoolRaffle = useCallback(async (schoolId) => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/raffle`)
      if (!response.ok) {
        throw new Error('Failed to fetch school raffle')
      }
      const data = await response.json()
      setTotalRaffle(data.totalRaffle)
    } catch (error) {
      setError(error.message)
    }
  }, [])

  // Fetch Weekly Earnings
  const fetchWeeklyEarnings = useCallback(async (schoolId, userId) => {
    try {
      const response = await fetch(`/api/schools/${schoolId}/student/${userId}/earnings`)
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
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

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
    if (user && schoolId) {
      fetchSchoolData(schoolId)
      fetchTopSellers(schoolId, userId)
      fetchSchoolRaffle(schoolId)
      fetchWeeklyEarnings(schoolId, userId)
    }
  }, [user, schoolId, fetchSchoolData, fetchTopSellers, fetchSchoolRaffle, fetchWeeklyEarnings, userId])

  // useEffect to fetch orders and products on mount
  useEffect(() => {
    fetchOrders()
    fetchProducts()
  }, [fetchOrders, fetchProducts])

  // useEffect to handle real-time updates (if applicable)
  // Example: WebSocket or polling implementation can be added here

    // Function to calculate product breakdown from orders
    const getProductBreakdown = (orders) => {
      const productBreakdown = orders.reduce((breakdown, order) => {
        order.products.forEach(product => {
          const existingProduct = breakdown.find(p => p.name === product.name)
          if (existingProduct) {
            existingProduct.quantity += product.quantity
            existingProduct.earnings += product.earnings
          } else {
            breakdown.push({ name: product.name, quantity: product.quantity, earnings: product.earnings, unitPrice: product.unitPrice })
          }
        })
        return breakdown
      }, [])
      return productBreakdown
    }

  // Calculate derived data
  const totalProductsSold = calculateTotalProductsSold()
  const totalStudentEarning = calculateTotalStudentEarnings()
  const moneyRemaining = user ? user.objectifPersonnel - totalStudentEarning : 0
  const progressTowardGoal = user ? (totalStudentEarning / user.objectifPersonnel) * 100 : 0
  const productBreakdown = getProductBreakdown(orders)
  const chances = Math.floor(totalProductsSold / 6)
  const nextChanceProducts = 6 - (totalProductsSold % 6)
  const schoolGoal = school ? school.objectifFinancier : 0
  const personalGoal = user ? user.objectifPersonnel : 0
  const orderDeadline = school ? school.finCampagne : ''
  const deliveryDate = school ? school.dateDeLivraison : ''
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
        nextReward.productsAway = profitRewards[level].minimum - totalProfit
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
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <motion.div
        className="flex justify-between items-center mb-6"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
          Tableau de Bord de Campagne
        </h1>
      </motion.div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MotivationCard />
        <DailyChallenge />
        <AchievementsCard totalProfit={totalStudentEarning} />
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="apercu">Aperçu</TabsTrigger>
          <TabsTrigger value="produits">Produits</TabsTrigger>
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
                daysLeft={Math.ceil((new Date(school?.finCampagne) - new Date()) / (1000 * 60 * 60 * 24))}
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
        nextReward.productsAway = profitRewards[level].minimum - totalProfit
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
          <Badge variant="outline" className="ml-2 text-yellow-500">Profits: {totalProfit}$</Badge>
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
          <p><strong>Prochaine Récompense:</strong> {nextProfitReward.name} (à {nextProfitReward.productsAway} profits près)</p>
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
        <p className="mb-4">Votre Rang: <Badge variant="secondary" className="text-lg">{rank}ème</Badge></p>
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
              {performer.name} - {performer.totalProductsSold} produits vendus
              <Badge variant="outline" className="ml-2">
                {performer.category}
              </Badge>
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
                <TableCell>{product.unitPrice}$</TableCell>
                <TableCell>{product.earnings}$</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell>Total</TableCell>
              <TableCell>{totalProductsSold}</TableCell>
              <TableCell></TableCell>
              <TableCell>{totalEarnings}$</TableCell>
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
        nextReward.productsAway = profitRewards[level].minimum - totalProfit
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
          <p><strong>Prochaine Récompense:</strong> {nextReward.name} (à {nextReward.productsAway} profits près)</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Recommendations Card Component
function RecommendationsCard() {
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
        <Button className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <Share2 className="mr-2 h-4 w-4" />
          Partager votre lien de vente
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
