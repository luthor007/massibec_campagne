import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trophy, Award, Check, Star, Zap, Flame, Target, TrendingUp, DollarSign, ShoppingCart, ArrowRight } from 'lucide-react'

// Reward levels based on profit
const profitRewards = {
  level1: {
    minimum: 1,
    max: 10,
    badge: "Petit vendeur 💰",
    description: "Tu as gagné tes premiers dollars. C'est un bon début !",
    icon: "💰",
    color: "from-yellow-100 to-yellow-200"
  },
  level2: {
    minimum: 11,
    max: 50,
    badge: "Vendeur en herbe 💵",
    description: "Tes profits augmentent, tu progresses bien !",
    icon: "💵",
    color: "from-green-100 to-green-200"
  },
  level3: {
    minimum: 51,
    max: 100,
    badge: "Vendeur prometteur 💼",
    description: "Tu maîtrises l'art de vendre. Continue comme ça !",
    icon: "💼",
    color: "from-blue-100 to-blue-200"
  },
  level4: {
    minimum: 101,
    max: 200,
    badge: "Vendeur expérimenté 💳",
    description: "Tes compétences en ventes se confirment avec de beaux profits.",
    icon: "💳",
    color: "from-purple-100 to-purple-200"
  },
  level5: {
    minimum: 201,
    max: 300,
    badge: "Pro des profits 🏆",
    description: "Tu es reconnu pour tes résultats impressionnants en ventes.",
    icon: "🏆",
    color: "from-orange-100 to-orange-200"
  },
  level6: {
    minimum: 301,
    max: 500,
    badge: "Maître vendeur ⭐",
    description: "Tes performances dépassent les attentes. Excellent travail !",
    icon: "⭐",
    color: "from-pink-100 to-pink-200"
  },
  level7: {
    minimum: 501,
    max: 1000,
    badge: "Légende des ventes 👑",
    description: "Tu fais partie de l'élite des vendeurs. Félicitations !",
    icon: "👑",
    color: "from-amber-100 to-amber-200"
  }
}

// Achievement badges based on milestones
const achievementBadges = [
  { id: 'first_sale', name: 'Première vente', icon: '🎯', description: 'Vendez votre premier produit', threshold: 1 },
  { id: 'ten_sales', name: 'Débutant', icon: '🌟', description: 'Vendez 10 produits', threshold: 10 },
  { id: 'twenty_five', name: 'En progression', icon: '🚀', description: 'Vendez 25 produits', threshold: 25 },
  { id: 'fifty', name: 'Vendeur confirmé', icon: '💼', description: 'Vendez 50 produits', threshold: 50 },
  { id: 'hundred', name: 'Expert', icon: '🏅', description: 'Vendez 100 produits', threshold: 100 },
  { id: 'top_ten', name: 'Top 10', icon: '⭐', description: 'Entrez dans le top 10', threshold: null, rankThreshold: 10 },
  { id: 'top_three', name: 'Podium', icon: '🥇', description: 'Entrez dans le top 3', threshold: null, rankThreshold: 3 },
  { id: 'champion', name: 'Champion', icon: '👑', description: 'Devenez #1', threshold: null, rankThreshold: 1 },
]

function GamificationCard({ totalProfit, totalProductsSold, userRank, totalStudentEarning, orders = [] }) {
  // Use totalStudentEarning if provided, otherwise fallback to totalProfit
  const currentProfit = totalStudentEarning !== undefined ? totalStudentEarning : totalProfit

  // Calculate streak from orders
  const calculateStreak = useMemo(() => {
    if (!orders || orders.length === 0) return 0

    // Get unique dates when orders were placed (as date strings for comparison)
    const orderDateSet = new Set(
      orders.map(order => {
        const date = order.createdAt || order.date || new Date()
        const d = new Date(date)
        // Normalize to midnight for date comparison
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      })
    )

    if (orderDateSet.size === 0) return 0

    // Start checking from today
    let currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)
    const today = currentDate.getTime()

    let streak = 0

    // Check if today has an order
    if (orderDateSet.has(today)) {
      streak = 1
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      // If no order today, start from yesterday
      currentDate.setDate(currentDate.getDate() - 1)
    }

    // Count consecutive days with orders going backwards
    while (orderDateSet.has(currentDate.getTime())) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    }

    return streak
  }, [orders])
  // Calculate accumulated rewards
  const getAccumulatedRewards = (profit) => {
    const accumulatedRewards = []
    for (const level in profitRewards) {
      if (profit >= profitRewards[level].minimum) {
        accumulatedRewards.push(profitRewards[level])
      }
    }
    return accumulatedRewards
  }

  // Calculate next reward
  const getNextReward = (profit) => {
    let nextReward = { name: '', productsAway: 0, minimum: 0 }
    for (const level in profitRewards) {
      if (profit < profitRewards[level].minimum) {
        nextReward.name = profitRewards[level].badge
        nextReward.productsAway = Math.round((profitRewards[level].minimum - profit) * 100) / 100
        nextReward.minimum = profitRewards[level].minimum
        nextReward.icon = profitRewards[level].icon
        nextReward.color = profitRewards[level].color
        break
      }
    }
    return nextReward
  }

  // Get all levels as array for timeline
  const allLevels = useMemo(() => {
    return Object.keys(profitRewards).map((key, index) => {
      const level = profitRewards[key]
      const levelNumber = parseInt(key.replace('level', ''))
      const isUnlocked = currentProfit >= level.minimum
      const isCurrent = currentProfit >= level.minimum &&
        (index === Object.keys(profitRewards).length - 1 ||
          currentProfit < profitRewards[`level${levelNumber + 1}`]?.minimum)

      return {
        ...level,
        levelNumber,
        isUnlocked,
        isCurrent,
        key
      }
    })
  }, [currentProfit])

  // Calculate unlocked achievements
  const unlockedAchievements = useMemo(() => {
    const unlocked = []

    // Product-based achievements
    achievementBadges.forEach(badge => {
      if (badge.threshold && totalProductsSold >= badge.threshold) {
        unlocked.push(badge)
      } else if (badge.rankThreshold && userRank && userRank <= badge.rankThreshold) {
        unlocked.push(badge)
      }
    })

    return unlocked
  }, [totalProductsSold, userRank])

  // Calculate current level
  const currentLevel = useMemo(() => {
    let level = 0
    for (const levelKey in profitRewards) {
      if (currentProfit >= profitRewards[levelKey].minimum) {
        level = parseInt(levelKey.replace('level', ''))
      }
    }
    return level
  }, [currentProfit])

  // Calculate level progress
  const getLevelProgress = () => {
    const accumulatedRewards = getAccumulatedRewards(currentProfit)
    if (accumulatedRewards.length === 0) {
      return { current: 0, next: profitRewards.level1.minimum, percentage: 0 }
    }

    const currentLevelReward = accumulatedRewards[accumulatedRewards.length - 1]
    const nextLevelReward = getNextReward(currentProfit)

    if (!nextLevelReward.minimum) {
      return { current: currentProfit, next: currentProfit, percentage: 100 }
    }

    const levelRange = nextLevelReward.minimum - currentLevelReward.minimum
    const progressInLevel = currentProfit - currentLevelReward.minimum
    const percentage = Math.min(100, (progressInLevel / levelRange) * 100)

    return {
      current: currentProfit,
      next: nextLevelReward.minimum,
      percentage,
      currentLevel: currentLevelReward,
      nextLevel: nextLevelReward
    }
  }

  const levelProgress = getLevelProgress()
  const accumulatedProfitRewards = getAccumulatedRewards(currentProfit)
  const nextProfitReward = getNextReward(currentProfit)

  // Estimate products needed based on average profit per product
  const averageProfitPerProduct = totalProductsSold > 0 ? currentProfit / totalProductsSold : 2.5

  const streak = calculateStreak

  return (
    <Card className="h-full overflow-hidden border border-gray-200 shadow-lg flex flex-col min-h-[600px]">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center text-lg">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Trophy className="mr-2 h-5 w-5 text-indigo-600" />
            </motion.div>
            Accomplissements
          </span>
          <div className="flex items-center space-x-2">
            {streak > 0 && (
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 text-xs flex items-center">
                <Flame className="mr-1 h-3 w-3" />
                {streak} jour{streak > 1 ? 's' : ''}
              </Badge>
            )}
            {currentLevel > 0 && (
              <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-2 py-0.5 text-xs">
                Niveau {currentLevel}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 bg-white flex-1 flex flex-col overflow-hidden">
        {/* Streak Section */}
        {streak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-orange-50 via-red-50 to-orange-50 rounded-lg border-2 border-orange-200 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Flame className="h-8 w-8 text-orange-500" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-lg text-orange-900">
                    Streak de {streak} jour{streak > 1 ? 's' : ''} consécutif{streak > 1 ? 's' : ''}!
                  </h3>
                  <p className="text-sm text-orange-700">
                    Fais une vente par jour pour maintenir ton streak! 🔥
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-orange-600">{streak}</div>
                <div className="text-xs text-orange-600">jours</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Timeline of Levels */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center">
              <Trophy className="mr-2 h-4 w-4 text-indigo-600" />
              Timeline des Niveaux
            </h3>

            {allLevels.map((level, index) => {
              const productsNeeded = Math.ceil(level.minimum / averageProfitPerProduct)
              const isActive = level.isCurrent
              const isCompleted = level.isUnlocked && !isActive
              const isLocked = !level.isUnlocked

              return (
                <motion.div
                  key={level.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative"
                >
                  {/* Timeline connector */}
                  {index < allLevels.length - 1 && (
                    <div className={`absolute left-6 top-12 w-0.5 h-full ${isCompleted ? 'bg-gradient-to-b from-indigo-400 to-indigo-300' :
                      isActive ? 'bg-gradient-to-b from-indigo-400 via-gray-200 to-gray-200' :
                        'bg-gray-200'
                      }`} style={{ height: 'calc(100% + 0.75rem)' }} />
                  )}

                  <div className={`relative flex items-start space-x-3 p-3 rounded-lg transition-all ${isActive
                    ? 'bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border-2 border-indigo-400 shadow-lg'
                    : isCompleted
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 shadow-sm'
                      : 'bg-gray-50 border border-gray-200 opacity-70'
                    }`}>
                    {/* Level Icon/Number */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all ${isActive
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-4 ring-indigo-200 scale-110'
                      : isCompleted
                        ? 'bg-gradient-to-br from-indigo-400 to-purple-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                      }`}>
                      {isCompleted ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <span>{level.levelNumber}</span>
                      )}
                    </div>

                    {/* Level Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <div className={`font-bold text-sm flex items-center gap-2 ${isActive ? 'text-indigo-900' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                            <span>{level.badge}</span>
                            {isActive && (
                              <Badge className="bg-indigo-600 text-white text-xs px-1.5 py-0">
                                Actuel
                              </Badge>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${isActive ? 'text-indigo-700' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                            {level.description}
                          </p>
                        </div>
                      </div>

                      {/* Milestones */}
                      <div className="mt-2 space-y-1.5">
                        <div className={`flex items-center space-x-2 text-xs ${isActive ? 'text-indigo-800' : isCompleted ? 'text-gray-700' : 'text-gray-500'
                          }`}>
                          <DollarSign className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                            }`} />
                          <span className="font-semibold">${level.minimum.toFixed(2)}</span>
                          <span className="text-gray-400">de profit</span>
                        </div>
                        <div className={`flex items-center space-x-2 text-xs ${isActive ? 'text-indigo-800' : isCompleted ? 'text-gray-700' : 'text-gray-500'
                          }`}>
                          <ShoppingCart className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                            }`} />
                          <span className="font-semibold">~{productsNeeded}</span>
                          <span className="text-gray-400">produits</span>
                        </div>
                      </div>

                      {/* Progress indicator for current level */}
                      {isActive && nextProfitReward.minimum && (
                        <div className="mt-2 pt-2 border-t border-indigo-200">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-indigo-700 font-medium">Progression vers le niveau suivant</span>
                            <span className="text-indigo-600 font-bold">{Math.round(levelProgress.percentage)}%</span>
                          </div>
                          <Progress value={levelProgress.percentage} className="h-1.5" />
                          <div className="flex justify-between text-xs text-indigo-600 mt-1">
                            <span className="font-semibold">${currentProfit.toFixed(2)}</span>
                            <span className="text-indigo-500">/</span>
                            <span className="font-semibold">${nextProfitReward.minimum.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-indigo-600 mt-0.5 text-center">
                            Il reste ${(nextProfitReward.minimum - currentProfit).toFixed(2)} pour atteindre {nextProfitReward.name}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default GamificationCard

