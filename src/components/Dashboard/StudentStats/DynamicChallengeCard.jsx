import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Zap, Check, Trophy, Target, TrendingUp } from 'lucide-react'

function DynamicChallengeCard({ 
  todaySales, 
  weekSales, 
  totalProductsSold, 
  totalStudentEarning, 
  userRank, 
  topPerformers, 
  personalGoal,
  progressTowardGoal 
}) {
  // Generate adaptive challenge based on performance
  const generateAdaptiveChallenge = () => {
    const todayProducts = todaySales?.products || 0;
    const weekProducts = weekSales?.products || 0;
    const avgProductsPerDay = weekProducts > 0 ? Math.ceil(weekProducts / 7) : 1;
    
    // Calculate how many products needed to reach next rank
    let productsToNextRank = null;
    if (userRank && userRank > 1 && topPerformers && topPerformers.length > 0) {
      const currentIndex = topPerformers.findIndex(p => p.rank === userRank);
      if (currentIndex > 0) {
        const nextPerformer = topPerformers[currentIndex - 1];
        const productsNeeded = Math.max(1, (nextPerformer.totalProductsSold || 0) - totalProductsSold);
        productsToNextRank = productsNeeded;
      }
    }

    // Calculate products needed to reach goal
    const goalProgress = progressTowardGoal || 0;
    const remainingProgress = Math.max(0, 100 - goalProgress);
    const productsNeededForGoal = personalGoal > 0 && totalProductsSold < personalGoal
      ? Math.max(1, Math.ceil((personalGoal - totalProductsSold) / Math.max(1, Math.ceil(remainingProgress / 10))))
      : null;

    // Generate challenge based on performance
    // Use consistent blue-purple color palette
    let challenge;
    if (todayProducts === 0) {
      // No sales today - encourage first sale
      challenge = {
        task: `Vendez ${Math.max(1, Math.ceil(avgProductsPerDay * 0.5))} produit${Math.ceil(avgProductsPerDay * 0.5) > 1 ? 's' : ''} aujourd'hui`,
        target: Math.max(1, Math.ceil(avgProductsPerDay * 0.5)),
        progress: todayProducts,
        reward: "Badge Premier Vendeur",
        type: "daily",
        icon: Zap,
        gradient: "from-blue-500 to-indigo-600"
      };
    } else if (productsToNextRank && productsToNextRank <= 5) {
      // Close to next rank - push for rank advancement
      challenge = {
        task: `Vendez ${productsToNextRank} produit${productsToNextRank > 1 ? 's' : ''} pour monter au classement`,
        target: productsToNextRank,
        progress: todayProducts,
        reward: "Monter au classement",
        type: "rank",
        icon: Target,
        gradient: "from-indigo-500 to-purple-600"
      };
    } else if (productsNeededForGoal && productsNeededForGoal <= 10) {
      // Close to goal - push for goal achievement
      challenge = {
        task: `Vendez ${productsNeededForGoal} produit${productsNeededForGoal > 1 ? 's' : ''} pour atteindre votre objectif`,
        target: productsNeededForGoal,
        progress: todayProducts,
        reward: "Objectif atteint",
        type: "goal",
        icon: Trophy,
        gradient: "from-purple-500 to-indigo-600"
      };
    } else if (todayProducts < avgProductsPerDay) {
      // Below average - encourage to match average
      challenge = {
        task: `Vendez ${Math.max(1, Math.ceil(avgProductsPerDay))} produit${Math.ceil(avgProductsPerDay) > 1 ? 's' : ''} aujourd'hui`,
        target: Math.ceil(avgProductsPerDay),
        progress: todayProducts,
        reward: "Badge Vendeur Étoile",
        type: "daily",
        icon: Zap,
        gradient: "from-blue-500 to-indigo-600"
      };
    } else {
      // Above average - set stretch goal
      challenge = {
        task: `Vendez ${Math.ceil(avgProductsPerDay * 1.5)} produit${Math.ceil(avgProductsPerDay * 1.5) > 1 ? 's' : ''} aujourd'hui`,
        target: Math.ceil(avgProductsPerDay * 1.5),
        progress: todayProducts,
        reward: "Bonus de 5%",
        type: "stretch",
        icon: TrendingUp,
        gradient: "from-indigo-500 to-purple-600"
      };
    }

    return challenge;
  };

  const challenge = generateAdaptiveChallenge();
  const progressPercentage = Math.min(100, (challenge.progress / challenge.target) * 100);
  const isCompleted = challenge.progress >= challenge.target;
  const Icon = challenge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`bg-gradient-to-br ${challenge.gradient} text-white h-full overflow-hidden relative flex flex-col shadow-lg ${isCompleted ? 'ring-2 ring-green-400' : ''}`}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '30px 30px'
          }} />
        </div>

        {/* Pulsing glow effect when completed */}
        {isCompleted && (
          <motion.div
            className="absolute inset-0 bg-white/20"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <motion.div
                animate={{ rotate: isCompleted ? [0, 360] : 0 }}
                transition={{ duration: 1, repeat: isCompleted ? Infinity : 0, ease: "linear" }}
              >
                <Icon className="mr-2 h-5 w-5" />
              </motion.div>
              Défi du Jour
            </span>
            {isCompleted && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <Check className="h-6 w-6 text-green-200" />
              </motion.div>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative z-10">
          <motion.h2 
            className="font-bold mb-4 text-lg md:text-xl"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {challenge.task}
          </motion.h2>
          
          <div className="space-y-3">
            <div className="relative">
              <Progress 
                value={progressPercentage} 
                className="h-4 mb-2 bg-white/30 shadow-lg" 
              />
              <motion.div
                className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {Math.round(progressPercentage)}%
              </motion.div>
            </div>
            
            <div className="flex justify-between text-sm font-semibold">
              <span className="bg-white/20 px-3 py-1 rounded-full">
                {challenge.progress}/{challenge.target} complétés
              </span>
              <motion.span
                animate={{ scale: isCompleted ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 0.5, repeat: isCompleted ? Infinity : 0 }}
                className="bg-white/20 px-3 py-1 rounded-full"
              >
                {challenge.target - challenge.progress} restant{challenge.target - challenge.progress > 1 ? 's' : ''}
              </motion.span>
            </div>
            
            {isCompleted ? (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="mt-4 p-4 bg-white/30 backdrop-blur-sm rounded-lg border-2 border-white/50 shadow-xl"
              >
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Trophy className="h-6 w-6 text-yellow-200" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-bold mb-1">🎉 Défi complété!</p>
                    <p className="text-xs opacity-90">{challenge.reward}</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-3 p-3 bg-white/20 rounded-lg backdrop-blur-sm"
              >
                <p className="text-sm font-semibold flex items-center">
                  <Target className="mr-2 h-4 w-4" />
                  Récompense: {challenge.reward}
                </p>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default DynamicChallengeCard

