import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Star, Target, ArrowUp, ArrowDown, Check, Crown, Medal } from 'lucide-react'

function EnhancedLeaderboardCard({ rank, topPerformers, totalProductsSold, totalStudentEarning, userId }) {
  // Calculate average products sold
  const avgProductsSold = topPerformers && topPerformers.length > 0
    ? Math.round(topPerformers.reduce((sum, p) => sum + (p.totalProductsSold || 0), 0) / topPerformers.length)
    : 0;

  // Find performers above current user
  const performersAbove = rank && rank > 1 && topPerformers
    ? topPerformers
        .filter(p => p.rank && p.rank < rank)
        .slice(0, 3)
        .sort((a, b) => a.rank - b.rank)
    : [];

  // Find next performer to catch up to
  const nextPerformer = performersAbove.length > 0 ? performersAbove[0] : null;
  const productsToNextRank = nextPerformer && totalProductsSold
    ? Math.max(0, (nextPerformer.totalProductsSold || 0) - totalProductsSold)
    : null;

  // Get rank badge styling
  const getRankBadgeStyle = (position) => {
    if (position === 1) return "bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white shadow-lg";
    if (position === 2) return "bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-white shadow-lg";
    if (position === 3) return "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 text-white shadow-lg";
    if (position <= 10) return "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900 border-2 border-blue-300";
    return "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 border border-gray-300";
  };

  const getRankIcon = (position) => {
    if (position === 1) return <Crown className="h-5 w-5 text-yellow-300" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-200" />;
    if (position === 3) return <Medal className="h-5 w-5 text-orange-300" />;
    return <Star className="h-4 w-4" />;
  };

  const getRankLabel = (position) => {
    if (position === 1) return "🥇 Champion";
    if (position === 2) return "🥈 Vice-Champion";
    if (position === 3) return "🥉 Top 3";
    if (position <= 10) return `⭐ Top ${position}`;
    return `${position}ème`;
  };

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center text-xl">
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Trophy className="mr-3 h-6 w-6 text-indigo-600" />
            </motion.div>
            Classement
          </span>
          {rank && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Badge className={`${getRankBadgeStyle(rank)} text-base px-3 py-1`}>
                {getRankIcon(rank)}
                <span className="ml-2 font-bold">{rank}ème</span>
              </Badge>
            </motion.div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-5 bg-white">
        {/* Current Position - Prominent Display */}
        {rank && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${getRankBadgeStyle(rank)}`}>
                  {rank <= 3 ? getRankIcon(rank) : rank}
                </div>
                <div>
                  <p className="font-semibold text-base text-gray-900">Votre Position</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    <span className="font-medium">{totalProductsSold}</span> produits vendus
                  </p>
                  <Badge variant="outline" className="mt-1.5 text-xs">
                    {getRankLabel(rank)}
                  </Badge>
                </div>
              </div>
              {productsToNextRank !== null && productsToNextRank > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-right"
                >
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">Pour monter au classement</p>
                  <Badge variant="outline" className="text-sm px-3 py-1 bg-white border-indigo-300">
                    <Target className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                    <span className="font-semibold text-indigo-700">{productsToNextRank} produit{productsToNextRank > 1 ? 's' : ''}</span>
                  </Badge>
                </motion.div>
              )}
            </div>
            {productsToNextRank === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 p-2.5 bg-green-50 border border-green-300 rounded-lg"
              >
                <div className="flex items-center text-green-800">
                  <Check className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Vous êtes à égalité avec la position suivante!</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Performers Above - Motivation to Catch Up */}
        {performersAbove.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-5"
          >
            <h3 className="font-semibold mb-3 text-sm text-gray-700 flex items-center">
              <ArrowUp className="mr-2 h-4 w-4 text-indigo-600" />
              Votre objectif pour monter
            </h3>
            <div className="space-y-2">
              {performersAbove.map((performer, index) => {
                const gap = totalProductsSold ? (performer.totalProductsSold || 0) - totalProductsSold : 0;
                return (
                  <motion.div
                    key={performer.rank || performer._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeStyle(performer.rank)}`}>
                        {performer.rank <= 3 ? getRankIcon(performer.rank) : performer.rank}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{performer.name || 'Vendeur'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{performer.totalProductsSold || 0} produits vendus</p>
                      </div>
                    </div>
                    {gap > 0 && (
                      <Badge variant="outline" className="text-xs px-2 py-1 bg-indigo-50 border-indigo-300 text-indigo-700 font-medium">
                        +{gap} produit{gap > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Top Performers List */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-gray-700">Meilleurs Vendeurs</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {topPerformers && topPerformers.length > 0 ? (
              topPerformers.slice(0, 10).map((performer, index) => {
                const isCurrentUser = performer._id === userId || performer.userId === userId;
                return (
                  <motion.div
                    key={performer.rank || performer._id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 shadow-md' 
                        : 'bg-white border border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeStyle(performer.rank)}`}>
                        {performer.rank ? (
                          <>
                            {performer.rank <= 3 ? getRankIcon(performer.rank) : performer.rank}
                          </>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${isCurrentUser ? 'text-indigo-900' : 'text-gray-900'}`}>
                          {performer.name || 'Vendeur'}
                          {isCurrentUser && (
                            <Badge className="ml-2 bg-indigo-600 text-white text-xs px-1.5 py-0.5">Vous</Badge>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {performer.totalProductsSold || 0} produits • ${(performer.totalSales || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {performer.rank && performer.rank <= 3 && (
                      <Badge className={`${getRankBadgeStyle(performer.rank)} text-xs px-2 py-1`}>
                        Top {performer.rank}
                      </Badge>
                    )}
                  </motion.div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">Aucune vente encore</p>
            )}
          </div>
        </div>

        {/* Comparison with Average */}
        {avgProductsSold > 0 && totalProductsSold && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-5 p-3 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Moyenne de l'école</span>
              <span className="font-bold text-base text-gray-900">{avgProductsSold} produits</span>
            </div>
            <div className="flex items-center space-x-2">
              {totalProductsSold >= avgProductsSold ? (
                <>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <ArrowUp className="h-4 w-4 text-green-600" />
                  </motion.div>
                  <span className="text-sm font-medium text-green-700">
                    Vous êtes <span className="font-bold">{totalProductsSold - avgProductsSold} produit{totalProductsSold - avgProductsSold > 1 ? 's' : ''}</span> au-dessus de la moyenne! 🎉
                  </span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-700">
                    <span className="font-bold">{avgProductsSold - totalProductsSold} produit{avgProductsSold - totalProductsSold > 1 ? 's' : ''}</span> pour atteindre la moyenne 💪
                  </span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default EnhancedLeaderboardCard

