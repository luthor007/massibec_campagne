import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, ChevronDown, ChevronUp, Crown, Medal, Star, Trophy, ExternalLink, Share2, ShoppingBag, Settings, BarChart, TrendingUp, Info, Users, AlertTriangle, Lock, Package, Clock } from 'lucide-react';
import CampaignSelector from '@/components/Dashboard/CampaignSelector';
import JoinCampaignModal from '@/components/Dashboard/JoinCampaignModal';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoreUrl, getFullStoreUrl } from '@/utils/storeUrlHelpers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]';
import { getDashboardSSRData, getOrdersSSR, getCampaignTotalSchoolProfitSSR } from '../../lib/dashboardSSR';
import { getCampaignExpirationStatus } from '../../utils/campaignHelpers';

export default function Dashboard({
  initialCampaignContext,
  initialStoreInfo,
  initialSchoolData,
  initialCampaignData,
  initialStudentProfit = 0,
  initialSchoolProfit = 0,
  initialTotalCampaignSchoolProfit = 0,
  initialOrders = [],
  initialHasInventory = false
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [storeId, setStoreId] = useState(initialStoreInfo?.storeId || null);
  const [storeSlug, setStoreSlug] = useState(initialStoreInfo?.slug || null);
  const [navigatingTo, setNavigatingTo] = useState(null);

  // Campaign state
  const [campaignContext, setCampaignContext] = useState(initialCampaignContext || null);
  const [showJoinCampaignModal, setShowJoinCampaignModal] = useState(false);
  const [schoolData] = useState(initialSchoolData || null);
  const [campaignData] = useState(initialCampaignData || null);

  // Store URL state
  const storeUrl = useMemo(() => {
    if (!storeId) return null;
    return getStoreUrl({ storeId, slug: storeSlug });
  }, [storeId, storeSlug]);

  const [fullStoreUrl, setFullStoreUrl] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Profits state
  const [studentProfit] = useState(initialStudentProfit);
  const [schoolProfit] = useState(initialSchoolProfit);
  const [totalCampaignSchoolProfit] = useState(initialTotalCampaignSchoolProfit);
  const [daysRemaining, setDaysRemaining] = useState(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Campaign status - calculate based on orders and end date
  const campaignStatus = useMemo(() => {
    const endDate = initialCampaignData?.endDate || campaignData?.endDate;
    return getCampaignExpirationStatus(endDate, initialOrders, initialHasInventory);
  }, [initialCampaignData?.endDate, campaignData?.endDate, initialOrders, initialHasInventory]);

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate full store URL on client-side
  useEffect(() => {
    if (storeId && isMounted) {
      const url = getFullStoreUrl({ storeId, slug: storeSlug });
      setFullStoreUrl(url);
    }
  }, [storeId, storeSlug, isMounted]);

  // Calculate days remaining
  useEffect(() => {
    const endDate = initialCampaignData?.endDate || campaignData?.endDate;
    if (endDate) {
      const end = new Date(endDate);
      const now = new Date();
      const diffTime = end - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(Math.max(0, diffDays));
    }
  }, [initialCampaignData, campaignData]);

  // Fetch leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!session?.user?.id || !campaignContext?.activeCampaignId) {
        setLeaderboardLoading(false);
        return;
      }

      try {
        const schoolId = initialSchoolData?._id || campaignData?.school;
        if (!schoolId) {
          setLeaderboardLoading(false);
          return;
        }

        const response = await fetch(`/api/schools/${schoolId}/topsellers/${session.user.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaignContext.activeCampaignId })
        });

        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [session?.user?.id, campaignContext?.activeCampaignId, initialSchoolData, campaignData]);

  // Clear navigating state on route change
  useEffect(() => {
    const handleRouteChangeComplete = () => setNavigatingTo(null);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeComplete);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeComplete);
    };
  }, [router]);

  // Copy link handler
  const handleCopyLink = useCallback(async () => {
    const urlToCopy = fullStoreUrl || (isMounted && storeUrl ? `${window.location.origin}${storeUrl}` : '');
    if (!urlToCopy) return;

    try {
      await navigator.clipboard.writeText(urlToCopy);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  }, [fullStoreUrl, storeUrl, isMounted]);

  // Share link handler
  const handleShareLink = useCallback(async () => {
    const urlToShare = fullStoreUrl || (isMounted && storeUrl ? `${window.location.origin}${storeUrl}` : '');
    if (!urlToShare) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '🎁 Ma boutique de financement!',
          text: 'Salut! Regarde les produits que je vends pour aider mon école! 🏫',
          url: urlToShare
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  }, [fullStoreUrl, storeUrl, isMounted, handleCopyLink]);

  // Navigation handlers
  const handleNavigation = useCallback((href, e) => {
    e?.preventDefault();
    setNavigatingTo(href);
    router.push(href).catch(() => setNavigatingTo(null));
  }, [router]);

  const handleCampaignSwitch = useCallback(() => {
    window.location.reload();
  }, []);

  const handleJoinCampaignSuccess = useCallback(() => {
    setShowJoinCampaignModal(false);
    window.location.reload();
  }, []);

  // Get rank display info
  const getRankInfo = (rank) => {
    if (rank === 1) return { emoji: '🥇', text: '1er', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (rank === 2) return { emoji: '🥈', text: '2e', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (rank === 3) return { emoji: '🥉', text: '3e', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { emoji: '⭐', text: `${rank}e`, color: 'text-blue-600', bg: 'bg-blue-50' };
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50">
        <div className="pt-16 sm:pt-20 pb-8 px-4 sm:px-6 max-w-2xl mx-auto">

          {/* Header - Super simple */}
          <div className="text-center mb-6">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl sm:text-3xl font-bold text-gray-800"
            >
              Salut {session?.user?.name?.split(' ')[0] || 'toi'}! 👋
            </motion.h1>
            <p className="text-gray-600 mt-1">Prêt à vendre?</p>
          </div>

          {/* Campaign Selector - Compact */}
          <div className="mb-6">
            <CampaignSelector
              onCampaignSwitch={handleCampaignSwitch}
              onJoinCampaign={() => setShowJoinCampaignModal(true)}
              initialCampaigns={initialCampaignContext?.campaigns || []}
              initialActiveCampaignId={initialCampaignContext?.activeCampaignId || null}
            />
          </div>

          {/* Campaign Status Banners */}
          {campaignStatus.status === 'expired_must_submit' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-5 shadow-xl"
            >
              <div className="flex items-start gap-4 text-white">
                <div className="bg-white/20 rounded-full p-3 flex-shrink-0">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">⚠️ Action requise aujourd'hui!</h3>
                  <p className="text-white/90 text-sm mb-4">
                    La campagne est terminée. Vous avez <strong>{campaignStatus.paidOrdersCount} commande{campaignStatus.paidOrdersCount > 1 ? 's' : ''}</strong> payée{campaignStatus.paidOrdersCount > 1 ? 's' : ''} à soumettre à Massibec.
                    <br />
                    <strong>Votre boutique est verrouillée</strong> jusqu'à ce que vous passiez votre commande.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/dashboard/commandes">
                      <Button className="bg-white text-red-600 hover:bg-white/90 font-bold">
                        <Package className="h-5 w-5 mr-2" />
                        Passer ma commande maintenant
                      </Button>
                    </Link>
                  </div>
                  <p className="text-white/80 text-xs mt-3">
                    💡 Si vous souhaitez continuer à vendre, prenez de l'inventaire lors du passage de commande.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {campaignStatus.status === 'closed_no_orders' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-gradient-to-r from-gray-600 to-gray-700 rounded-2xl p-5 shadow-xl"
            >
              <div className="flex items-start gap-4 text-white">
                <div className="bg-white/20 rounded-full p-3 flex-shrink-0">
                  <Lock className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">🔒 Boutique fermée</h3>
                  <p className="text-white/90 text-sm mb-3">
                    La campagne est terminée et vous n'avez eu aucune commande.
                    Votre boutique est maintenant fermée.
                  </p>
                  <Button
                    onClick={() => setShowJoinCampaignModal(true)}
                    className="bg-white text-gray-700 hover:bg-white/90 font-bold"
                  >
                    Rejoindre une nouvelle campagne
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {campaignStatus.status === 'ordering_window' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 shadow-xl"
            >
              <div className="flex items-start gap-4 text-white">
                <div className="bg-white/20 rounded-full p-3 flex-shrink-0">
                  <Clock className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">⏰ C'est le moment de passer ta commande!</h3>
                  <p className="text-white/90 text-sm mb-4">
                    Tu as <strong>{campaignStatus.paidOrdersCount} commande{campaignStatus.paidOrdersCount > 1 ? 's' : ''}</strong> payée{campaignStatus.paidOrdersCount > 1 ? 's' : ''} prête{campaignStatus.paidOrdersCount > 1 ? 's' : ''} à être envoyée{campaignStatus.paidOrdersCount > 1 ? 's' : ''}.
                    {campaignStatus.daysRemaining === 0
                      ? " C'est le dernier jour!"
                      : campaignStatus.daysRemaining === 1
                        ? " Il reste 1 jour!"
                        : ` Il reste ${campaignStatus.daysRemaining} jours.`
                    }
                  </p>
                  <Link href="/dashboard/commandes">
                    <Button className="bg-white text-orange-600 hover:bg-white/90 font-bold">
                      <Package className="h-5 w-5 mr-2" />
                      Voir mes commandes et passer la commande
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {campaignStatus.status === 'expired_with_inventory' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-5 shadow-xl"
            >
              <div className="flex items-start gap-4 text-white">
                <div className="bg-white/20 rounded-full p-3 flex-shrink-0">
                  <Package className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">📦 Mode inventaire actif</h3>
                  <p className="text-white/90 text-sm mb-3">
                    La campagne est terminée mais vous avez pris de l'inventaire.
                    Votre boutique reste ouverte pour écouler votre stock!
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* HERO - Share Your Store (hidden when shop is closed) */}
          {storeUrl && campaignStatus.isShopOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl p-6 sm:p-8 mb-6 shadow-xl"
            >
              <div className="text-center text-white">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                  className="text-5xl sm:text-6xl mb-3 flex justify-center items-center"
                >
                  <Share2 className="h-12 w-12 sm:h-14 sm:w-14 text-white" />
                </motion.div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  Partage ta boutique!
                </h2>
                <p className="text-white/90 text-sm sm:text-base mb-4">
                  Envoie ce lien à ta famille et tes amis
                </p>

                {/* Link display */}
                <div className="bg-white/20 backdrop-blur rounded-xl p-3 mb-4">
                  <code className="text-white/90 text-xs sm:text-sm break-all">
                    {isMounted && fullStoreUrl ? fullStoreUrl : storeUrl}
                  </code>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={handleCopyLink}
                    className="flex-1 max-w-[140px] bg-white text-purple-600 hover:bg-white/90 font-bold py-3 rounded-xl shadow-lg"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        Copié!
                      </>
                    ) : (
                      <>
                        <Copy className="h-5 w-5 mr-2" />
                        Copier
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleShareLink}
                    className="flex-1 max-w-[140px] bg-yellow-400 text-yellow-900 hover:bg-yellow-300 font-bold py-3 rounded-xl shadow-lg"
                  >
                    <Share2 className="h-5 w-5 mr-2" />
                    Partager
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats Cards - Combined Money Card + Days Left */}
          <div className={`grid ${daysRemaining !== null ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-6`}>
            {/* Combined Money Card - Your Money + School Money */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-md border-2 border-green-200 overflow-hidden"
            >
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                {/* Your Money */}
                <div className="p-4 text-center">
                  <div className="text-2xl sm:text-3xl mb-1">💰</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {studentProfit.toFixed(2)}$
                  </div>
                  <div className="text-xs text-gray-600">Tes sous</div>
                </div>
                {/* School Money - Pizza Fund (Total from all students) */}
                <div className="p-4 text-center bg-orange-50/50">
                  <div className="text-2xl sm:text-3xl mb-1">🍕</div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">
                    {totalCampaignSchoolProfit.toFixed(2)}$
                  </div>
                  <div className="text-xs text-gray-600">Pour la pizza</div>
                </div>
              </div>
            </motion.div>

            {/* Days Left - Only show if campaign has end date */}
            {daysRemaining !== null && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={`bg-white rounded-2xl p-4 shadow-md border-2 ${daysRemaining <= 7 ? 'border-red-200' : 'border-blue-200'}`}
              >
                <div className="text-3xl mb-1">⏰</div>
                <div className={`text-2xl sm:text-3xl font-bold ${daysRemaining <= 7 ? 'text-red-600' : 'text-blue-600'}`}>
                  {daysRemaining === 0 ? 'Fini!' : `${daysRemaining}`}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {daysRemaining === 0 ? 'La campagne est finie' : daysRemaining === 1 ? 'jour restant!' : 'jours restants'}
                </div>
              </motion.div>
            )}
          </div>

          {/* Leaderboard - Fun Competition */}
          {(() => {
            // Get group data if user is in a group
            const userGroupData = leaderboard?.userGroup && leaderboard?.groups?.length > 0
              ? leaderboard.groups.find(g => g.name === leaderboard.userGroup)
              : null;

            // Use group students if available, otherwise use general leaderboard
            const displayStudents = userGroupData?.students?.length > 0
              ? userGroupData.students
              : leaderboard?.topPerformers || [];

            // Find user's rank in group
            const userRankInGroup = userGroupData?.students?.find(
              s => s._id === session?.user?.id || s.userId === session?.user?.id
            )?.rank;

            const displayRank = userGroupData ? userRankInGroup : leaderboard?.userRank;
            const groupName = leaderboard?.userGroup;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl p-5 shadow-md border-2 border-purple-200 mb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                      <Trophy className="h-5 w-5 mr-2 text-purple-500" />
                      Classement 🏆
                    </h3>
                    {groupName && (
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3 text-purple-400" />
                        <span className="text-xs text-purple-600 font-medium">
                          Classe {groupName}
                        </span>
                      </div>
                    )}
                  </div>
                  {displayRank && (
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${getRankInfo(displayRank).bg} ${getRankInfo(displayRank).color}`}>
                      Tu es {getRankInfo(displayRank).text}!
                    </div>
                  )}
                </div>

                {leaderboardLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                  </div>
                ) : displayStudents.length > 0 ? (
                  <div className="space-y-2">
                    {/* Scrollable leaderboard container */}
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
                      {/* All performers in group */}
                      {displayStudents.map((performer, index) => {
                        const isCurrentUser = performer._id === session?.user?.id || performer.userId === session?.user?.id;
                        const rankInfo = getRankInfo(performer.rank);

                        return (
                          <motion.div
                            key={performer._id || index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(index * 0.05, 0.25) }}
                            className={`flex items-center justify-between p-3 rounded-xl transition-all ${isCurrentUser
                              ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300'
                              : 'bg-gray-50 hover:bg-gray-100'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${rankInfo.bg}`}>
                                {performer.rank <= 3 ? rankInfo.emoji : performer.rank}
                              </div>
                              <div>
                                <div className={`font-semibold text-sm ${isCurrentUser ? 'text-purple-800' : 'text-gray-800'}`}>
                                  {performer.name?.split(' ')[0] || 'Vendeur'}
                                  {isCurrentUser && <span className="ml-2 text-xs">(toi! 🎉)</span>}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {performer.totalProductsSold || 0} produit{(performer.totalProductsSold || 0) !== 1 ? 's' : ''} vendu{(performer.totalProductsSold || 0) !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600 text-sm">
                                {parseFloat(performer.totalEarnings || 0).toFixed(0)}$
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Scroll hint if there are more than 5 students */}
                    {displayStudents.length > 5 && (
                      <div className="text-center text-xs text-gray-400 pt-1">
                        ↕️ Défile pour voir plus
                      </div>
                    )}

                    {/* Motivation message */}
                    {displayRank && displayRank > 1 && (
                      <div className="text-center text-sm text-purple-600 mt-3 p-2 bg-purple-50 rounded-lg">
                        💪 Continue! Tu peux monter dans le classement{groupName ? ` de ta classe` : ''}!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <div className="text-4xl mb-2">🎯</div>
                    <p>Pas encore de ventes{groupName ? ` dans ta classe` : ''}!</p>
                    <p className="text-sm">Partage ta boutique pour commencer</p>
                  </div>
                )}
              </motion.div>
            );
          })()}

          {/* Main Actions - Big Buttons */}
          <div className="space-y-3 mb-6">
            {/* View Store */}
            {storeUrl && (
              <Link href={storeUrl} className="block">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 text-lg"
                >
                  <span className="text-2xl">👀</span>
                  Voir ma boutique
                  <ExternalLink className="h-5 w-5" />
                </motion.button>
              </Link>
            )}

            {/* View Orders */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => handleNavigation('/dashboard/commandes', e)}
              disabled={navigatingTo === '/dashboard/commandes'}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 text-lg disabled:opacity-70"
            >
              {navigatingTo === '/dashboard/commandes' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span className="text-2xl">📦</span>
                  Mes commandes
                  <ShoppingBag className="h-5 w-5" />
                </>
              )}
            </motion.button>
          </div>

          {/* More Options - Collapsible */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="w-full p-4 flex items-center justify-between text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Plus d&apos;options
              </span>
              {showMoreOptions ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>

            <AnimatePresence>
              {showMoreOptions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-100"
                >
                  <div className="p-4 space-y-2">
                    {/* Statistics */}
                    <Link href="/dashboard/statistiques" className="block">
                      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                          <BarChart className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">📊 Mes statistiques</div>
                          <div className="text-xs text-gray-500">Voir tous mes chiffres</div>
                        </div>
                      </div>
                    </Link>

                    {/* Sales Tools */}
                    <Link href="/dashboard/vendre" className="block">
                      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">🛠️ Outils pour vendre</div>
                          <div className="text-xs text-gray-500">Affiches et codes QR</div>
                        </div>
                      </div>
                    </Link>

                    {/* Campaign Details */}
                    <Link href="/detail" className="block">
                      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <Info className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">ℹ️ Ma campagne</div>
                          <div className="text-xs text-gray-500">Les produits et les prix</div>
                        </div>
                      </div>
                    </Link>

                    {/* Customize Store */}
                    <Link href="/dashboard/personnalisation" className="block">
                      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                          <Settings className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">⚙️ Personnaliser</div>
                          <div className="text-xs text-gray-500">Changer les options de ma boutique</div>
                        </div>
                      </div>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Help tip */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>💡 <strong>Astuce:</strong> Plus tu partages, plus tu gagnes!</p>
          </div>

          {/* No store message */}
          {!storeUrl && !campaignContext?.activeCampaignId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 text-center"
            >
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="font-bold text-yellow-800 mb-2">Rejoins une campagne!</h3>
              <p className="text-yellow-700 text-sm mb-4">
                Pour commencer à vendre, tu dois d&apos;abord rejoindre une campagne.
              </p>
              <Button
                onClick={() => setShowJoinCampaignModal(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-6 py-3 rounded-xl"
              >
                Rejoindre une campagne
              </Button>
            </motion.div>
          )}

        </div>
      </div>

      {/* Loading overlay */}
      {navigatingTo && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-xl flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
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

    // Calculate profits from orders
    let initialStudentProfit = 0;
    let initialSchoolProfit = 0;
    let initialTotalCampaignSchoolProfit = 0;
    let initialOrders = [];
    let initialHasInventory = false;

    if (dashboardData.initialCampaignContext?.activeCampaignId) {
      try {
        const orders = await getOrdersSSR(session, dashboardData.initialCampaignContext.activeCampaignId);
        const campaignData = dashboardData.initialCampaignData;

        // Store orders for campaign status calculation (simplified version)
        initialOrders = orders.map(order => ({
          _id: order._id?.toString(),
          status: order.status,
          isTest: order.isTest || false,
        }));

        orders.forEach(order => {
          if (order.isTest) return;

          const studentDonation = order.studentDonation || order.tip || 0;
          initialStudentProfit += studentDonation;

          const schoolDonation = order.schoolDonation || 0;
          initialSchoolProfit += schoolDonation;

          if (order.products && Array.isArray(order.products)) {
            order.products.forEach(product => {
              const quantity = product.quantity || 0;
              const price = product.productPrice || product.price || 0;
              const cost = product.productCost || product.cost || 0;
              const rawProfit = (price - cost) * quantity;

              let studentCash = 0;
              let studentAccount = 0;
              let schoolProject = 0;

              if (campaignData?.profitSplitType === 'absolute' && campaignData?.profitSplits) {
                const productId = product.product?.toString() || product.productId;
                const profitSplit = campaignData.profitSplits.find(ps =>
                  ps.productId?.toString() === productId
                );

                if (profitSplit) {
                  studentCash = (profitSplit.studentCash || 0) * quantity;
                  studentAccount = (profitSplit.studentSchoolAccount || 0) * quantity;
                  schoolProject = (profitSplit.schoolProject || 0) * quantity;
                } else {
                  studentCash = rawProfit * 0.5;
                  studentAccount = rawProfit * 0.5;
                }
              } else {
                studentCash = rawProfit * 0.5;
                studentAccount = rawProfit * 0.5;
              }

              initialStudentProfit += studentCash + studentAccount;
              initialSchoolProfit += schoolProject;
            });
          }
        });

        // Get total campaign school profit from ALL students
        initialTotalCampaignSchoolProfit = await getCampaignTotalSchoolProfitSSR(
          dashboardData.initialCampaignContext.activeCampaignId,
          campaignData
        );

        // Check if user has inventory (limited inventory mode)
        try {
          const dbConnect = (await import('../../lib/mongodb')).default;
          await dbConnect();
          const StudentInventory = (await import('../../models/StudentInventory')).default;
          const inventory = await StudentInventory.findOne({
            userId: session.user.id,
            campaignId: dashboardData.initialCampaignContext.activeCampaignId
          }).lean();
          initialHasInventory = !!(inventory && inventory.products && inventory.products.length > 0);
        } catch (inventoryError) {
          console.error('Error checking inventory:', inventoryError);
        }
      } catch (orderError) {
        console.error('Error fetching orders for profit calculation:', orderError);
      }
    }

    return {
      props: {
        ...dashboardData,
        initialStudentProfit: Math.round(initialStudentProfit * 100) / 100,
        initialSchoolProfit: Math.round(initialSchoolProfit * 100) / 100,
        initialTotalCampaignSchoolProfit,
        initialOrders,
        initialHasInventory,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        initialCampaignContext: { campaigns: [], activeCampaignId: null, mode: 'none' },
        initialStoreInfo: null,
        initialSchoolData: null,
        initialCampaignData: null,
        initialStudentProfit: 0,
        initialSchoolProfit: 0,
        initialTotalCampaignSchoolProfit: 0,
        initialOrders: [],
        initialHasInventory: false,
      },
    };
  }
}
