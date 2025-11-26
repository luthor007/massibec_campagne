import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Star, Target, ArrowUp, ArrowDown, Check, Crown, Medal, ChevronDown, ChevronUp, Users } from 'lucide-react'

function EnhancedLeaderboardCard({ rank, topPerformers, totalProductsSold, totalStudentEarning, userId, groups, userGroup, userGroupRank }) {
  const [showAll, setShowAll] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({})
  const INITIAL_DISPLAY_COUNT = 10
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

  const getRankText = (position) => {
    if (position === 1) return "1er";
    if (position === 2) return "2ème";
    if (position === 3) return "3ème";
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
          {userGroupRank && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Badge className={`${getRankBadgeStyle(userGroupRank)} text-base px-3 py-1`}>
                {getRankIcon(userGroupRank)}
                <span className="ml-2 font-bold">{getRankText(userGroupRank)}</span>
              </Badge>
            </motion.div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 bg-white">

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

        {/* Groups Leaderboard (if groups enabled) */}
        {groups && groups.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-700 flex items-center">
                <Users className="mr-2 h-4 w-4 text-indigo-600" />
                Classement par Groupe
              </h3>
            </div>
            <div className="space-y-3">
              {groups.map((group, groupIndex) => {
                const isExpanded = expandedGroups[group.name] || false;
                const isUserGroup = userGroup === group.name;

                return (
                  <motion.div
                    key={group.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.05 }}
                    className={`border rounded-lg overflow-hidden transition-all ${isUserGroup
                      ? 'border-indigo-300 bg-indigo-50/50'
                      : 'border-gray-200 bg-white'
                      }`}
                  >
                    {/* Group Header - Clickable to expand/collapse */}
                    <button
                      onClick={() => setExpandedGroups(prev => ({
                        ...prev,
                        [group.name]: !prev[group.name]
                      }))}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeStyle(group.rank)}`}>
                          {group.rank <= 3 ? getRankIcon(group.rank) : group.rank}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-base text-gray-900">{group.name}</h4>
                            {isUserGroup && (
                              <Badge className="bg-indigo-600 text-white text-xs px-1.5 py-0.5">Votre groupe</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                            <span>{group.totalProductsSold || 0} produits vendus</span>
                            <span>•</span>
                            <span>${(group.totalSales || 0).toFixed(2)}</span>
                            <span>•</span>
                            <span>{group.participants || 0} participant{group.participants !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {group.participants > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {group.participants} membre{group.participants > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Group Content - Individual Rankings */}
                    {isExpanded && group.students && group.students.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-200 bg-gray-50"
                      >
                        <div className="p-3">
                          <h5 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                            Classement individuel - {group.name}
                          </h5>
                          <div className="space-y-2">
                            {group.students.map((student, studentIndex) => {
                              const isCurrentUser = student._id === userId || student.userId === userId;
                              return (
                                <motion.div
                                  key={student._id || studentIndex}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: studentIndex * 0.03 }}
                                  className={`flex items-center justify-between p-2 rounded-lg transition-all ${isCurrentUser
                                    ? 'bg-indigo-100 border border-indigo-300'
                                    : 'bg-white border border-gray-200'
                                    }`}
                                >
                                  <div className="flex items-center space-x-2 flex-1">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getRankBadgeStyle(student.rank)}`}>
                                      {student.rank <= 3 ? getRankIcon(student.rank) : student.rank}
                                    </div>
                                    <div className="flex-1">
                                      <div className={`font-medium text-xs ${isCurrentUser ? 'text-indigo-900' : 'text-gray-900'} flex items-center gap-2`}>
                                        <span>{student.name || 'Vendeur'}</span>
                                        {isCurrentUser && (
                                          <Badge className="bg-indigo-600 text-white text-xs px-1 py-0">Vous</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {student.totalProductsSold || 0} produits • ${(student.totalSales || 0).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Empty group message */}
                    {isExpanded && (!group.students || group.students.length === 0) && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm text-gray-500 text-center">Aucun participant dans ce groupe</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Performers List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">
              {groups && groups.length > 0 ? 'Classement Général' : 'Meilleurs Vendeurs'}
            </h3>
            {topPerformers && topPerformers.length > INITIAL_DISPLAY_COUNT && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="text-xs h-7 px-2 text-indigo-600 hover:text-indigo-700"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Voir moins
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Voir tout ({topPerformers.length})
                  </>
                )}
              </Button>
            )}
          </div>
          <div className={`space-y-2 ${showAll ? 'max-h-[600px]' : 'max-h-80'} overflow-y-auto pr-2`}>
            {topPerformers && topPerformers.length > 0 ? (
              (showAll ? topPerformers : topPerformers.slice(0, INITIAL_DISPLAY_COUNT)).map((performer, index) => {
                const isCurrentUser = performer._id === userId || performer.userId === userId;
                return (
                  <motion.div
                    key={performer.rank || performer._id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${isCurrentUser
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 shadow-md'
                      : 'bg-white border border-gray-200 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeStyle(performer.rank)}`}>
                        {performer.rank != null && performer.rank !== undefined ? (
                          <>
                            {performer.rank <= 3 ? getRankIcon(performer.rank) : performer.rank}
                          </>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold text-sm ${isCurrentUser ? 'text-indigo-900' : 'text-gray-900'} flex items-center gap-2`}>
                          <span>{performer.name || 'Vendeur'}</span>
                          {isCurrentUser && (
                            <Badge className="bg-indigo-600 text-white text-xs px-1.5 py-0.5">Vous</Badge>
                          )}
                        </div>
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

