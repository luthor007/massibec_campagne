import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import {
  DollarSign,
  Users,
  Package,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  Copy,
  Check,
  Trophy,
  Sparkles,
  Star,
  Zap,
  Award,
  Fire,
  Rocket,
  MessageSquare,
  X,
  Edit
} from 'lucide-react';
import ParentLetterModal from './ParentLetterModal';
import ReviewForm from './ReviewForm';
import ChatModal from '../Messaging/ChatModal';
import { getTerminology } from '@/utils/organizationHelpers';
import { isTestCampaign } from '@/utils/campaignHelpers';
import { toast } from 'react-toastify';

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 1.5, decimals = 0, prefix = '', suffix = '' }) => {
  const spring = useSpring(0, { stiffness: 50, damping: 30 });
  const display = useTransform(spring, (current) => {
    if (decimals > 0) {
      return prefix + current.toFixed(decimals) + suffix;
    }
    return prefix + Math.round(current) + suffix;
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
};

// Celebration Confetti Component
const CelebrationConfetti = ({ show }) => {
  const [height, setHeight] = useState(800);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHeight(window.innerHeight);
    }
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 pointer-events-none"
      >
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10%',
              background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][Math.floor(Math.random() * 6)]
            }}
            initial={{ y: 0, rotate: 0, opacity: 1 }}
            animate={{
              y: height + 100,
              rotate: 360,
              opacity: 0,
              x: (Math.random() - 0.5) * 200
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              delay: Math.random() * 0.5,
              ease: 'easeOut'
            }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

// Achievement Badge Component
const AchievementBadge = ({ icon: Icon, label, color, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${color} text-white shadow-lg`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-xs font-bold">{label}</span>
    </motion.div>
  );
};

// Motivation Message Component
const MotivationMessage = ({ progress }) => {
  const messages = [
    { threshold: 0, text: "🚀 C'est parti ! Votre campagne démarre !", color: "from-blue-500 to-cyan-500" },
    { threshold: 25, text: "💪 Excellent début ! Continuez comme ça !", color: "from-green-500 to-emerald-500" },
    { threshold: 50, text: "🎯 À mi-parcours ! Vous êtes sur la bonne voie !", color: "from-yellow-500 to-orange-500" },
    { threshold: 75, text: "🔥 Presque là ! Vous y êtes presque !", color: "from-orange-500 to-red-500" },
    { threshold: 100, text: "🎉 OBJECTIF ATTEINT ! Vous êtes incroyables !", color: "from-purple-500 to-pink-500" },
    { threshold: 110, text: "🌟 DÉPASSEMENT ! Vous êtes des champions !", color: "from-yellow-400 to-orange-500" }
  ];

  const currentMessage = messages
    .slice()
    .reverse()
    .find(msg => progress >= msg.threshold) || messages[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-gradient-to-r ${currentMessage.color} text-white rounded-xl p-4 shadow-xl`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{currentMessage.text.split(' ')[0]}</span>
        <p className="font-bold text-sm md:text-base">{currentMessage.text.substring(currentMessage.text.indexOf(' ') + 1)}</p>
      </div>
    </motion.div>
  );
};

const CampaignOverview = ({ campaign, stats, loading, school, onRefresh }) => {
  const [showParentLetterModal, setShowParentLetterModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const [respondingToProposal, setRespondingToProposal] = useState(false);
  const { data: session } = useSession();
  // Get terminology based on organization type
  const organizationType = school?.organizationType || campaign?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  // Determine mode: test or production
  const isProductionMode = campaign?.mode === 'production';
  const isTestMode = campaign?.mode === 'test' || !campaign?.mode; // Default to test if mode not set

  // Show confetti when goal is reached
  useEffect(() => {
    if (stats?.goalProgress >= 100 && !hasShownConfetti) {
      setShowConfetti(true);
      setHasShownConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [stats?.goalProgress, hasShownConfetti]);

  const getModeColor = (mode) => {
    if (mode === 'production') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-orange-100 text-orange-800 border-orange-200'; // Test mode
  };

  const getModeIcon = (mode) => {
    if (mode === 'production') {
      return <CheckCircle className="h-4 w-4" />;
    }
    return <AlertCircle className="h-4 w-4" />; // Test mode icon
  };

  const getModeLabel = (mode) => {
    if (mode === 'production') {
      return 'Production';
    }
    return 'Test';
  };

  // Removed auto-open chat - user must click to open

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'N/A';

    // Use UTC methods to avoid timezone issues
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();
    const day = dateObj.getUTCDate();

    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    return `${day} ${months[month]} ${year}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!campaign || !stats) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucune campagne sélectionnée</p>
      </div>
    );
  }

  // Calculate achievements
  const achievements = [];
  if (stats?.goalProgress >= 100) achievements.push({ icon: Trophy, label: 'Objectif Atteint!', color: 'from-yellow-400 to-orange-500' });
  if (stats?.goalProgress >= 110) achievements.push({ icon: Rocket, label: 'Dépassement!', color: 'from-purple-500 to-pink-500' });
  if (stats?.participantCount >= 50) achievements.push({ icon: Users, label: '50+ Participants', color: 'from-blue-500 to-cyan-500' });
  if (stats?.productsSold >= 1000) achievements.push({ icon: Package, label: '1000+ Produits', color: 'from-green-500 to-emerald-500' });

  return (
    <div className="space-y-6">
      {/* Celebration Confetti */}
      <CelebrationConfetti show={showConfetti} />

      {/* Motivation Message */}
      {stats?.goalProgress > 0 && (
        <MotivationMessage progress={stats.goalProgress} />
      )}

      {/* Achievements Bar */}
      {achievements.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-semibold text-gray-700">Badges obtenus:</span>
          {achievements.map((achievement, index) => (
            <AchievementBadge
              key={index}
              icon={achievement.icon}
              label={achievement.label}
              color={achievement.color}
              delay={index * 0.05}
            />
          ))}
        </div>
      )}

      {/* Combined Campaign Info Card - Compact */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-3 sm:p-4 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: Title and Status */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {campaign.name || `Campagne #${campaign.campaignNumber}`}
                </h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Badge className={`${getModeColor(campaign?.mode)} border font-medium px-2 py-0.5 text-xs ${isTestMode ? 'cursor-help' : ''}`}>
                          <div className="flex items-center space-x-1">
                            {getModeIcon(campaign?.mode)}
                            <span className="whitespace-nowrap">
                              {getModeLabel(campaign?.mode)}
                            </span>
                          </div>
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    {isTestMode && (
                      <TooltipContent className="max-w-xs bg-gray-900 text-white text-xs">
                        <p className="font-semibold mb-1">⚠️ Mode test</p>
                        <p>
                          Cette campagne est en mode test. Vous pouvez modifier tous les paramètres. Les données, commandes, statistiques et rapports sont marqués comme test et ne sont pas définitifs. Passez en mode production pour démarrer la campagne réelle.
                        </p>
                      </TooltipContent>
                    )}
                    {isProductionMode && (
                      <TooltipContent className="max-w-xs bg-gray-900 text-white text-xs">
                        <p className="font-semibold mb-1">✓ Mode production</p>
                        <p>
                          Cette campagne est en mode production. Les paramètres sont verrouillés et ne peuvent plus être modifiés. Toutes les données sont réelles et définitives.
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
              {campaign?.campaignCode && (
                <div className="flex items-center gap-2">
                  <div className="bg-gray-50 rounded border border-gray-200 px-2 py-1">
                    <span className="text-sm font-bold text-blue-600 font-mono">
                      {campaign.campaignCode}
                    </span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(campaign.campaignCode);
                              setCopied(true);
                              toast.success('Code copié!');
                              setTimeout(() => setCopied(false), 2000);
                            } catch (err) {
                              console.error('Erreur lors de la copie:', err);
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className={`h-7 w-7 p-0 transition-all duration-200 ${copied
                            ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copier le code</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </div>

          {/* Right: Action Button */}
          <Button
            onClick={() => setShowParentLetterModal(true)}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 whitespace-nowrap shrink-0"
          >
            <Mail className="h-4 w-4 mr-2" />
            <span className="text-sm">Lettre aux parents</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="hover:scale-[1.02] transition-transform duration-200">
          <Card className={`hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white ${stats?.goalProgress >= 100 ? 'to-green-100 ring-2 ring-green-400' : 'to-green-50'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Montant Collecté</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                {stats?.goalProgress >= 100 ? (
                  <Trophy className="h-5 w-5 text-yellow-300" />
                ) : (
                  <DollarSign className="h-5 w-5 text-white" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                <AnimatedCounter value={stats?.totalRaised || 0} decimals={2} prefix="$" />
              </div>
              <p className="text-xs text-green-600 mt-1">
                sur {formatCurrency(stats?.financialGoal || 0)} objectif
              </p>
              <div className="mt-3">
                <div className="relative">
                  {/* Background bar */}
                  <div className="h-3 bg-green-100 rounded-full overflow-visible relative">
                    {/* Progress fill up to 100% */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(stats?.goalProgress || 0, 100)}%`
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${stats?.goalProgress >= 100
                        ? 'bg-gradient-to-r from-green-500 via-green-400 to-green-500'
                        : 'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                    />
                    {/* Overflow indicator for > 100% - extends beyond the bar */}
                    {stats?.goalProgress > 100 && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{
                          width: `${Math.min((stats.goalProgress - 100) * 1.5, 15)}%`,
                          opacity: 1
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="absolute top-0 left-full h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-r-full shadow-lg ml-1"
                        style={{
                          boxShadow: '0 0 15px rgba(251, 191, 36, 0.6)',
                          zIndex: 2,
                          minWidth: '8px'
                        }}
                      />
                    )}
                    {/* 100% marker line */}
                    <div
                      className="absolute top-0 h-full w-0.5 bg-gray-400 opacity-50"
                      style={{ left: '100%', zIndex: 1 }}
                    />
                  </div>
                </div>
                <p className={`text-xs mt-2 font-bold ${stats?.goalProgress >= 100
                  ? 'text-orange-600'
                  : 'text-green-600'
                  }`}
                >
                  {stats?.goalProgress || 0}% de l'objectif atteint
                  {stats?.goalProgress >= 100 && ' 🎉'}
                  {stats?.goalProgress > 100 && ' ⭐'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hover:scale-[1.02] transition-transform duration-200">
          <Card className="hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Participants</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                <AnimatedCounter value={stats?.participantCount || 0} />
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {terminology.participants} actifs
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="hover:scale-[1.02] transition-transform duration-200">
          <Card className="hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-purple-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Produits Vendus</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">
                <AnimatedCounter value={stats?.productsSold || 0} />
              </div>
              <p className="text-xs text-purple-600 mt-1">
                unités vendues
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="hover:scale-[1.02] transition-transform duration-200">
          <Card className="hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Performance</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700">
                {stats?.participantCount > 0 ? (
                  <AnimatedCounter value={stats.totalRaised / stats.participantCount} decimals={2} prefix="$" />
                ) : (
                  '$0'
                )}
              </div>
              <p className="text-xs text-orange-600 mt-1">
                par participant
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Dates de la Campagne</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-sm text-gray-600">Début:</span>
              <span className="font-medium">{formatDate(campaign.startDate)}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-sm text-gray-600">Fin:</span>
              <span className="font-medium">{formatDate(campaign.endDate)}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-sm text-gray-600">Livraison:</span>
              <span className="font-medium">{formatDate(campaign.deliveryDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-purple-600" />
              <span>Top Vendeurs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topSellers && stats.topSellers.length > 0 ? (
              <div className="space-y-3">
                {stats.topSellers.slice(0, 3).map((seller, index) => (
                  <div
                    key={seller.userId}
                    className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-gray-50 to-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg' :
                          index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white' :
                            'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
                          }`}
                      >
                        {index === 0 ? <Trophy className="h-4 w-4" /> : index + 1}
                      </div>
                      <span className="text-sm font-medium">{seller.userName || 'Utilisateur inconnu'}</span>
                    </div>
                    <span className="font-bold text-green-600">{formatCurrency(seller.totalSales)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                Aucune vente encore
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier Proposal Alert */}
      {campaign.supplierProposals &&
        campaign.supplierProposals.status === 'pending' &&
        (campaign.supplierProposals.proposedBy || campaign.supplierProposals.proposedAt) && (
          <Card className="border-2 border-purple-300 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <MessageSquare className="w-5 h-5" />
                Proposition de changements du fournisseur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-gray-600 mb-4">
                  Le fournisseur a proposé des modifications à votre campagne. Veuillez examiner et répondre.
                </p>

                {/* Proposed Changes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {campaign.supplierProposals.startDate && (
                    <div>
                      <p className="text-xs text-gray-500">Date de début proposée</p>
                      <p className="font-medium">{formatDate(campaign.supplierProposals.startDate)}</p>
                      {campaign.startDate && (
                        <p className="text-xs text-gray-400">Actuelle: {formatDate(campaign.startDate)}</p>
                      )}
                    </div>
                  )}
                  {campaign.supplierProposals.endDate && (
                    <div>
                      <p className="text-xs text-gray-500">Date de fin proposée</p>
                      <p className="font-medium">{formatDate(campaign.supplierProposals.endDate)}</p>
                      {campaign.endDate && (
                        <p className="text-xs text-gray-400">Actuelle: {formatDate(campaign.endDate)}</p>
                      )}
                    </div>
                  )}
                  {campaign.supplierProposals.deliveryDate && (
                    <div>
                      <p className="text-xs text-gray-500">Date de livraison proposée</p>
                      <p className="font-medium">{formatDate(campaign.supplierProposals.deliveryDate)}</p>
                      {campaign.deliveryDate && (
                        <p className="text-xs text-gray-400">Actuelle: {formatDate(campaign.deliveryDate)}</p>
                      )}
                    </div>
                  )}
                  {campaign.supplierProposals.distributionStartHour && (
                    <div>
                      <p className="text-xs text-gray-500">Heure de début proposée</p>
                      <p className="font-medium">{campaign.supplierProposals.distributionStartHour}</p>
                      {campaign.distributionStartHour && (
                        <p className="text-xs text-gray-400">Actuelle: {campaign.distributionStartHour}</p>
                      )}
                    </div>
                  )}
                  {campaign.supplierProposals.distributionEndHour && (
                    <div>
                      <p className="text-xs text-gray-500">Heure de fin proposée</p>
                      <p className="font-medium">{campaign.supplierProposals.distributionEndHour}</p>
                      {campaign.distributionEndHour && (
                        <p className="text-xs text-gray-400">Actuelle: {campaign.distributionEndHour}</p>
                      )}
                    </div>
                  )}
                  {campaign.supplierProposals.truckArrivalHour && (
                    <div>
                      <p className="text-xs text-gray-500">Heure d'arrivée du camion proposée</p>
                      <p className="font-medium">{campaign.supplierProposals.truckArrivalHour}</p>
                      {campaign.truckArrivalHour && (
                        <p className="text-xs text-gray-400">Actuelle: {campaign.truckArrivalHour}</p>
                      )}
                    </div>
                  )}
                </div>

                {campaign.supplierProposals.notes && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Notes du fournisseur:</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">{campaign.supplierProposals.notes}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-purple-200">
                  <Button
                    onClick={async () => {
                      setRespondingToProposal(true);
                      try {
                        const response = await fetch(`/api/campaigns/${campaign._id}/school-respond-proposal`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ accept: true })
                        });

                        if (response.ok) {
                          toast.success('Proposition acceptée avec succès');
                          onRefresh && onRefresh();
                        } else {
                          const error = await response.json();
                          toast.error(error.message || 'Erreur lors de l\'acceptation');
                        }
                      } catch (error) {
                        console.error('Error accepting proposal:', error);
                        toast.error('Erreur lors de l\'acceptation de la proposition');
                      } finally {
                        setRespondingToProposal(false);
                      }
                    }}
                    disabled={respondingToProposal}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {respondingToProposal ? 'Traitement...' : 'Accepter les changements'}
                  </Button>
                  <Button
                    onClick={async () => {
                      setRespondingToProposal(true);
                      try {
                        const response = await fetch(`/api/campaigns/${campaign._id}/school-respond-proposal`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ accept: false })
                        });

                        if (response.ok) {
                          toast.success('Proposition refusée');
                          onRefresh && onRefresh();
                        } else {
                          const error = await response.json();
                          toast.error(error.message || 'Erreur lors du refus');
                        }
                      } catch (error) {
                        console.error('Error rejecting proposal:', error);
                        toast.error('Erreur lors du refus de la proposition');
                      } finally {
                        setRespondingToProposal(false);
                      }
                    }}
                    disabled={respondingToProposal}
                    variant="destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {respondingToProposal ? 'Traitement...' : 'Refuser'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Review Form - Show for completed campaigns */}
      {campaign.status === 'completed' && campaign.supplier && (
        <ReviewForm
          supplierId={campaign.supplier._id || campaign.supplier}
          campaignId={campaign._id}
          onReviewSubmitted={(review) => {
            toast.success('Merci pour votre révision !');
          }}
        />
      )}

      {/* Parent Letter Modal */}
      <ParentLetterModal
        isOpen={showParentLetterModal}
        onClose={() => setShowParentLetterModal(false)}
        campaign={campaign}
        school={school}
      />

      {/* Chat Modal - Auto-opens with supplier */}
      {school && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          schoolId={school._id || school.id}
          supplierId={campaign?.supplier?._id || campaign?.supplier || campaign?.supplierId}
          userRole={session?.user?.role}
        />
      )}
    </div>
  );
};

export default CampaignOverview;
