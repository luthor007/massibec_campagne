import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart, Settings, ShoppingBag, Store, TrendingUp, AlertTriangle, CheckCircle, Info, ArrowLeft, School, Loader2, Copy, Share2, Check, DollarSign, Clock } from 'lucide-react';
import CampaignSelector from '@/components/Dashboard/CampaignSelector';
import JoinCampaignModal from '@/components/Dashboard/JoinCampaignModal';
import OnboardingTooltip from '@/components/Dashboard/OnboardingTooltip';
import useOnboarding from '@/hooks/useOnboarding';
import { getUserCampaignContext } from '@/utils/campaignHelpers';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from 'framer-motion';
import { getStoreUrl, getFullStoreUrl } from '@/utils/storeUrlHelpers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]';
import { getDashboardSSRData, getOrdersSSR } from '../../lib/dashboardSSR';
import { prefetchSalesTools } from '@/utils/salesToolsPrefetcher';

export default function Dashboard({
  initialCampaignContext,
  initialStoreInfo,
  initialSchoolData,
  initialCampaignData,
  initialStudentProfit = 0,
  initialSchoolProfit = 0
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [storeId, setStoreId] = useState(initialStoreInfo?.storeId || null);
  const [storeSlug, setStoreSlug] = useState(initialStoreInfo?.slug || null);
  const [navigatingTo, setNavigatingTo] = useState(null); // Track which route we're navigating to

  // Check if user is in preview mode (school_manager viewing as student)
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Campaign-related state - initialize from SSR props
  const [campaignContext, setCampaignContext] = useState(initialCampaignContext || null);
  const [showJoinCampaignModal, setShowJoinCampaignModal] = useState(false);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // School data for distribution message - initialize from SSR props
  const [schoolData, setSchoolData] = useState(initialSchoolData || null);
  const [campaignData, setCampaignData] = useState(initialCampaignData || null);

  // Onboarding state
  const [storeExists, setStoreExists] = useState(!!initialStoreInfo?.storeId);
  const [showOnboardingTooltip, setShowOnboardingTooltip] = useState(false);
  const [tooltipTarget, setTooltipTarget] = useState(null);

  // Refs for tooltip positioning
  const campaignSelectorRef = useRef(null);
  const personalizeCardRef = useRef(null);
  const storeCardRef = useRef(null);
  const ordersCardRef = useRef(null);
  const statsCardRef = useRef(null);
  const toolsCardRef = useRef(null);

  // Use onboarding hook
  const {
    progress,
    currentStep,
    isLoading: onboardingLoading,
    isCompleted,
    completionPercentage,
    markStepComplete,
    getStepContent
  } = useOnboarding();

  // Prefetch all dashboard routes for instant navigation - optimized
  useEffect(() => {
    // Prefetch all dashboard pages immediately - multiple times for aggressive caching
    const routesToPrefetch = [
      '/dashboard/personnalisation',
      '/dashboard/commandes',
      '/dashboard/statistiques',
      '/dashboard/vendre',
      '/detail'
    ];

    // Prefetch all routes immediately - batch prefetch for better performance
    routesToPrefetch.forEach(route => {
      router.prefetch(route);
    });

    // Double prefetch for extra assurance - single timeout
    const timeoutId = setTimeout(() => {
      routesToPrefetch.forEach(route => {
        router.prefetch(route);
      });
    }, 100);

    // Optimized hover listener setup - single function, reused
    const prefetchOnHover = (e) => {
      const link = e.currentTarget;
      const href = link.getAttribute('href');
      if (href && (href.startsWith('/dashboard/') || href === '/detail')) {
        router.prefetch(href);
      }
    };

    // Set up hover listeners - batch DOM query
    const setupHoverListeners = () => {
      const links = document.querySelectorAll('a[href^="/dashboard/"], a[href="/detail"]');
      links.forEach(link => {
        link.addEventListener('mouseenter', prefetchOnHover, { once: true, passive: true });
        link.addEventListener('touchstart', prefetchOnHover, { once: true, passive: true });
      });
    };

    // Set up listeners immediately
    setupHoverListeners();

    // Single delayed setup
    const delayedSetup = setTimeout(setupHoverListeners, 300);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(delayedSetup);
    };
  }, [router]);

  // Memoize store URL to avoid recalculating on every render
  const storeUrl = useMemo(() => {
    if (!storeId) return null;
    return getStoreUrl({ storeId, slug: storeSlug });
  }, [storeId, storeSlug]);

  // State for full store URL (client-side only to avoid hydration issues)
  const [fullStoreUrl, setFullStoreUrl] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  // Mark component as mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate full store URL on client-side only
  useEffect(() => {
    if (storeId && isMounted) {
      const url = getFullStoreUrl({ storeId, slug: storeSlug });
      setFullStoreUrl(url);
    }
  }, [storeId, storeSlug, isMounted]);

  // State for copy/share functionality
  const [linkCopied, setLinkCopied] = useState(false);

  // State for profit and campaign metrics (initialized from SSR props)
  const [studentProfit, setStudentProfit] = useState(initialStudentProfit);
  const [schoolProfit, setSchoolProfit] = useState(initialSchoolProfit);
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Memoize onboarding handlers to prevent unnecessary re-renders
  const handleOnboardingNext = useCallback(async () => {
    if (currentStep) {
      const success = await markStepComplete(currentStep.key, true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  }, [currentStep, markStepComplete]);

  const handleOnboardingSkip = useCallback(async () => {
    if (currentStep) {
      const success = await markStepComplete(currentStep.key, true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  }, [currentStep, markStepComplete]);

  const handleOnboardingClose = useCallback(() => {
    setShowOnboardingTooltip(false);
  }, []);

  // Warm up heavy sales tools so the vendre page loads instantly
  useEffect(() => {
    prefetchSalesTools();
  }, []);

  // Memoize campaign handlers
  const handleCampaignSwitch = useCallback((campaignId) => {
    window.location.reload(); // Simple refresh for now
  }, []);

  const handleJoinCampaignClick = useCallback(() => {
    setShowJoinCampaignModal(true);
  }, []);

  // Memoize campaign join success handler
  const handleJoinCampaignSuccess = useCallback(async (campaign) => {
    setShowJoinCampaignModal(false);
    await markStepComplete('joinedCampaign', true);
    window.location.reload();
  }, [markStepComplete]);

  // Memoize navigation handler
  const handleNavigation = useCallback((href, e) => {
    e.preventDefault();
    e.stopPropagation();
    setNavigatingTo(href);
    // Navigate immediately - prefetching should have already loaded the page
    router.push(href).catch(() => {
      // Fallback if navigation fails
      setNavigatingTo(null);
    });
  }, [router]);

  // Memoize detail page navigation
  const handleDetailNavigation = useCallback((e) => {
    e.preventDefault();
    router.push('/detail');
  }, [router]);

  // Memoize return to manager dashboard handler
  const handleReturnToManagerDashboard = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('viewMode');
    }
    router.push('/dashboard-manager');
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

  // Share link handler (uses native share on mobile)
  const handleShareLink = useCallback(async () => {
    const urlToShare = fullStoreUrl || (isMounted && storeUrl ? `${window.location.origin}${storeUrl}` : '');
    if (!urlToShare) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ma boutique Jappuie.ca',
          text: 'Découvrez ma boutique de financement scolaire!',
          url: urlToShare
        });
      } catch (error) {
        // User cancelled or error occurred - silently fail
        if (error.name !== 'AbortError') {
          console.log('Error sharing:', error);
        }
      }
    } else {
      // Fallback to copy if share is not available
      handleCopyLink();
    }
  }, [fullStoreUrl, storeUrl, isMounted, handleCopyLink]);

  // Memoize modal close handler
  const handleCloseJoinCampaignModal = useCallback(() => {
    setShowJoinCampaignModal(false);
  }, []);

  // Memoize completion percentage to avoid recalculation
  const completionPercentageDisplay = useMemo(() => completionPercentage, [completionPercentage]);

  // Clear navigating state when route changes
  useEffect(() => {
    const handleRouteChangeComplete = () => {
      setNavigatingTo(null);
    };

    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeComplete);
    };
  }, [router]);

  // Only fetch if data wasn't provided via SSR (fallback for client-side updates)
  useEffect(() => {
    // Only fetch store if we don't have it from SSR and campaign context is available
    if (session && campaignContext?.activeCampaignId && !initialStoreInfo?.storeId) {
      const fetchStore = async () => {
        try {
          const response = await fetch('/api/get-store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              campaignId: campaignContext.activeCampaignId
            }),
          });
          const data = await response.json();
          setStoreId(data.storeId);
          setStoreSlug(data.slug || null);
          setStoreExists(!!data.storeId);
        } catch (error) {
          console.error('Error fetching store ID:', error);
        }
      };
      fetchStore();
    }
  }, [session, campaignContext?.activeCampaignId, initialStoreInfo]);

  // Refresh campaign context on client-side updates (only if not provided via SSR)
  useEffect(() => {
    if (!session?.user || initialCampaignContext) return;

    const fetchCampaignContext = async () => {
      setCampaignsLoading(true);
      try {
        const response = await fetch('/api/users/campaigns');
        if (response.ok) {
          const data = await response.json();
          const context = getUserCampaignContext(data);
          setCampaignContext(context);
        }
      } catch (error) {
        console.error('Error fetching campaign context:', error);
      } finally {
        setCampaignsLoading(false);
      }
    };

    fetchCampaignContext();
  }, [session, initialCampaignContext]);

  // Check if in preview mode on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const viewMode = localStorage.getItem('viewMode');
      const isPreview = viewMode === 'student_preview' && (session?.user?.role === 'school_manager' || session?.user?.role === 'supplier' || session?.user?.role === 'fournisseur');
      setIsPreviewMode(isPreview);
    }
  }, [session]);

  // Calculate days remaining from campaign end date
  useEffect(() => {
    if (initialCampaignData?.endDate) {
      const endDate = new Date(initialCampaignData.endDate);
      const now = new Date();
      const diffTime = endDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(Math.max(0, diffDays));
    } else if (campaignData?.endDate) {
      const endDate = new Date(campaignData.endDate);
      const now = new Date();
      const diffTime = endDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(Math.max(0, diffDays));
    }
  }, [initialCampaignData, campaignData]);


  // Show onboarding tooltip when current step is available
  useEffect(() => {
    if (!onboardingLoading && currentStep && !isCompleted) {
      // Use a small delay to ensure refs are attached
      const timer = setTimeout(() => {
        setShowOnboardingTooltip(true);

        // Set tooltip target based on current step
        switch (currentStep.key) {
          case 'joinedCampaign':
            setTooltipTarget(campaignSelectorRef.current);
            break;
          case 'personalizedStore':
            setTooltipTarget(personalizeCardRef.current);
            break;
          case 'visitedStore':
            setTooltipTarget(storeCardRef.current);
            break;
          case 'viewedOrders':
            setTooltipTarget(ordersCardRef.current);
            break;
          case 'viewedStats':
            setTooltipTarget(statsCardRef.current);
            break;
          case 'viewedTools':
            setTooltipTarget(toolsCardRef.current);
            break;
          default:
            setTooltipTarget(null);
        }
      }, 100); // Small delay to ensure refs are attached

      return () => clearTimeout(timer);
    } else {
      setShowOnboardingTooltip(false);
    }
  }, [currentStep, onboardingLoading, isCompleted]);

  // Check if in preview mode on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const viewMode = localStorage.getItem('viewMode');
      const isPreview = viewMode === 'student_preview' && (session?.user?.role === 'school_manager' || session?.user?.role === 'supplier' || session?.user?.role === 'fournisseur');
      setIsPreviewMode(isPreview);
    }
  }, [session]);

  // Show onboarding tooltip when current step is available

  return (
    <Layout>
      <div className="pt-12 sm:pt-16 md:pt-20 overflow-x-hidden max-w-full px-3 sm:px-4 md:px-6">
        {/* Header with Campaign Management */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-6 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tableau de bord</h1>
            {!isCompleted && currentStep && (
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="text-xs sm:text-sm text-gray-600">
                  Formation en cours ({completionPercentageDisplay}%)
                </div>
                <div className="w-full sm:w-24 h-1.5 sm:h-1 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentageDisplay}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
          </div>
          <motion.div
            ref={campaignSelectorRef}
            className="flex-shrink-0 w-full sm:w-auto"
            animate={currentStep?.key === 'joinedCampaign' ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: currentStep?.key === 'joinedCampaign' ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            <div className={currentStep?.key === 'joinedCampaign' ? 'ring-4 ring-blue-500 rounded-lg p-2 shadow-2xl' : ''}>
              <CampaignSelector
                onCampaignSwitch={handleCampaignSwitch}
                onJoinCampaign={handleJoinCampaignClick}
                initialCampaigns={initialCampaignContext?.campaigns || []}
                initialActiveCampaignId={initialCampaignContext?.activeCampaignId || null}
              />
            </div>
          </motion.div>
        </div>

        {/* Boutique Link Share Section */}
        {storeExists && storeUrl && (
          <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <Store className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-primary" />
                Lien de votre boutique
              </CardTitle>
              <CardDescription>
                Partagez ce lien avec vos clients pour qu&apos;ils puissent commander vos produits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 flex items-center min-w-0">
                  <code className="text-sm sm:text-base text-gray-800 truncate flex-1">
                    {isMounted && fullStoreUrl ? fullStoreUrl : storeUrl || 'Chargement...'}
                  </code>
                </div>
                <div className="flex gap-2 sm:flex-shrink-0">
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    disabled={linkCopied}
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        <span className="hidden sm:inline">Copié!</span>
                        <span className="sm:hidden">Copié!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Copier</span>
                        <span className="sm:hidden">Copier</span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleShareLink}
                    variant="default"
                    className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Partager</span>
                    <span className="sm:hidden">Partager</span>
                  </Button>
                </div>
              </div>

              {/* Metrics Section */}
              <div className={`grid gap-3 pt-3 border-t border-gray-200 ${daysRemaining !== null
                ? 'grid-cols-1 sm:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2'
                }`}>
                {/* Student Profit */}
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-600">Vos profits</div>
                    <div className="text-sm sm:text-base font-bold text-gray-900">
                      {metricsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      ) : (
                        `${(studentProfit || 0).toFixed(2)}$`
                      )}
                    </div>
                  </div>
                </div>

                {/* School Profit */}
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <School className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-600">Profits école</div>
                    <div className="text-sm sm:text-base font-bold text-gray-900">
                      {metricsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      ) : (
                        `${(schoolProfit || 0).toFixed(2)}$`
                      )}
                    </div>
                  </div>
                </div>

                {/* Days Remaining */}
                {daysRemaining !== null && (
                  <div className={`flex items-center gap-2 bg-white rounded-lg px-3 py-2 border ${daysRemaining <= 7
                    ? 'border-red-300 bg-red-50'
                    : daysRemaining <= 14
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-200'
                    }`}>
                    <Clock className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${daysRemaining <= 7
                      ? 'text-red-600'
                      : daysRemaining <= 14
                        ? 'text-yellow-600'
                        : 'text-gray-600'
                      }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-600">Jours restants</div>
                      <div className={`text-sm sm:text-base font-bold ${daysRemaining <= 7
                        ? 'text-red-700'
                        : daysRemaining <= 14
                          ? 'text-yellow-700'
                          : 'text-gray-900'
                        }`}>
                        {daysRemaining === 0 ? (
                          <span className="text-red-600">Terminé</span>
                        ) : daysRemaining === 1 ? (
                          <span className="text-red-600">Dernier jour!</span>
                        ) : (
                          `${daysRemaining} jours`
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Distribution Information 
        {schoolData && campaignData && campaignData.deliveryDate && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-md">
            <p className="text-blue-800 text-sm">
              <strong>📦 Distribution :</strong> La distribution se fera à <strong>{schoolData.address || 'l\'adresse de l\'école'}</strong> le <strong>{new Date(campaignData.deliveryDate).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. Assurez-vous d'apporter cette confirmation de commande ou du moins votre numéro de commande (#commande).
            </p>
          </div>
        )}*/}

        {/* Campaign Status Alert */}
        {/*!campaignsLoading && campaignContext && (
          <div className="mb-6">
            {campaignContext.mode === 'none' ? (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Action requise :</strong> Vous devez rejoindre une campagne pour commencer à vendre. 
                  Utilisez le sélecteur de campagne ci-dessus pour rejoindre une campagne active.
                </AlertDescription>
              </Alert>
            ) : campaignContext.mode === 'legacy' ? (
              <Alert className="border-blue-200 bg-blue-50">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Campagne active :</strong> Vous participez à la campagne de votre organisation. 
                  Vous pouvez maintenant vendre et gagner des commissions.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Campagne active :</strong> Vous participez à {campaignContext.campaigns?.length || 0} campagne(s). 
                  Vous pouvez maintenant vendre et gagner des commissions.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}*/}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            ref={personalizeCardRef}
            animate={currentStep?.key === 'personalizedStore' ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: currentStep?.key === 'personalizedStore' ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            <Card className={`flex flex-col h-full ${currentStep?.key === 'personalizedStore' ? 'ring-4 ring-blue-500 shadow-2xl' : ''}`}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-primary" />
                  Personnaliser ma boutique
                </CardTitle>
                <CardDescription className="min-h-[3rem]">Modifiez l&apos;apparence et les détails de votre boutique en ligne.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end w-full">
                <Link href="/dashboard/personnalisation" passHref className="w-full block">
                  <Button
                    className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all"
                    onClick={(e) => handleNavigation('/dashboard/personnalisation', e)}
                    disabled={navigatingTo === '/dashboard/personnalisation'}
                  >
                    {navigatingTo === '/dashboard/personnalisation' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        Personnaliser
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            ref={ordersCardRef}
            animate={currentStep?.key === 'viewedOrders' ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: currentStep?.key === 'viewedOrders' ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            <Card className={`flex flex-col h-full ${currentStep?.key === 'viewedOrders' ? 'ring-4 ring-blue-500 shadow-2xl' : ''}`}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center">
                  <ShoppingBag className="h-5 w-5 mr-2 text-primary" />
                  Mes commandes
                </CardTitle>
                <CardDescription className="min-h-[3rem]">Consultez et gérez les commandes de vos clients.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end w-full">
                <Link href="/dashboard/commandes" passHref className="w-full block">
                  <Button
                    className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-all"
                    onClick={(e) => handleNavigation('/dashboard/commandes', e)}
                    disabled={navigatingTo === '/dashboard/commandes'}
                  >
                    {navigatingTo === '/dashboard/commandes' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        Voir les commandes
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            ref={statsCardRef}
            animate={currentStep?.key === 'viewedStats' ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: currentStep?.key === 'viewedStats' ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            <Card className={`flex flex-col h-full ${currentStep?.key === 'viewedStats' ? 'ring-4 ring-blue-500 shadow-2xl' : ''}`}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2 text-primary" />
                  Statistiques
                </CardTitle>
                <CardDescription className="min-h-[3rem]">Suivez les performances de votre campagne.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end w-full">
                <Link href="/dashboard/statistiques" passHref className="w-full block">
                  <Button
                    className="w-full bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition-all"
                    onClick={(e) => handleNavigation('/dashboard/statistiques', e)}
                    disabled={navigatingTo === '/dashboard/statistiques'}
                  >
                    {navigatingTo === '/dashboard/statistiques' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        Voir les statistiques
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* New Card to View the Store */}
          <motion.div
            ref={storeCardRef}
            animate={currentStep?.key === 'visitedStore' ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: currentStep?.key === 'visitedStore' ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            <Card className={`flex flex-col h-full ${currentStep?.key === 'visitedStore' ? 'ring-4 ring-blue-500 shadow-2xl' : ''}`}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center">
                  <Store className="h-5 w-5 mr-2 text-primary" />
                  Voir ma boutique
                </CardTitle>
                <CardDescription className="min-h-[3rem]">Accédez à votre boutique en ligne pour la voir comme vos clients.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end w-full">
                {storeUrl ? (
                  <Link href={storeUrl} passHref className="w-full block">
                    <Button className="w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                      Voir la boutique
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded" disabled>
                    Chargement de la boutique...
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* New Card for Sales Tools */}
          <motion.div
            ref={toolsCardRef}
            animate={currentStep?.key === 'viewedTools' ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: currentStep?.key === 'viewedTools' ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            <Card className={`flex flex-col h-full ${currentStep?.key === 'viewedTools' ? 'ring-4 ring-blue-500 shadow-2xl' : ''}`}>
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  Outils de Vente
                </CardTitle>
                <CardDescription className="min-h-[3rem]">Boostez vos ventes avec nos outils marketing prêts à utiliser.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end w-full">
                <Link href="/dashboard/vendre" passHref className="w-full block">
                  <Button
                    className="w-full bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-all"
                    onClick={(e) => handleNavigation('/dashboard/vendre', e)}
                    disabled={navigatingTo === '/dashboard/vendre'}
                  >
                    {navigatingTo === '/dashboard/vendre' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        Voir les outils
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card for Campaign Details */}
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 mr-2 text-primary" />
                Détail de la campagne
              </CardTitle>
              <CardDescription className="min-h-[3rem]">Consultez les détails de votre campagne et les profits par produit.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end w-full">
              <Link href="/detail" passHref className="w-full block">
                <Button
                  className="w-full bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-all"
                  onClick={handleDetailNavigation}
                >
                  Voir les détails
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Loading overlay for navigation - ultra-fast, minimal */}
        {navigatingTo && (
          <div className="fixed inset-0 bg-white/40 backdrop-blur-[2px] z-50 flex items-center justify-center pointer-events-none transition-opacity duration-75">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          </div>
        )}

        {/* Onboarding Tooltip */}
        {showOnboardingTooltip && currentStep && tooltipTarget && (
          <OnboardingTooltip
            isVisible={showOnboardingTooltip}
            position={
              currentStep.key === 'joinedCampaign' ? 'bottom' :
                currentStep.key === 'viewedStats' ? 'left' : 'right'
            }
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
      </div>
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

    if (dashboardData.initialCampaignContext?.activeCampaignId) {
      try {
        const orders = await getOrdersSSR(session, dashboardData.initialCampaignContext.activeCampaignId);
        const campaignData = dashboardData.initialCampaignData;

        orders.forEach(order => {
          // Skip test orders
          if (order.isTest) return;

          // Add student donations to student profit
          const studentDonation = order.studentDonation || order.tip || 0;
          initialStudentProfit += studentDonation;

          // Add school donations to school profit
          const schoolDonation = order.schoolDonation || 0;
          initialSchoolProfit += schoolDonation;

          // Calculate product profits
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
      } catch (orderError) {
        console.error('Error fetching orders for profit calculation:', orderError);
      }
    }

    return {
      props: {
        ...dashboardData,
        initialStudentProfit: Math.round(initialStudentProfit * 100) / 100,
        initialSchoolProfit: Math.round(initialSchoolProfit * 100) / 100,
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
      },
    };
  }
}
