// pages/dashboard/vendre.jsx - Version Production Ready
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { getServerSession } from 'next-auth/next';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Layout from '../../components/Layout';
import CampaignSelector from '../../components/Dashboard/CampaignSelector';
import JoinCampaignModal from '../../components/Dashboard/JoinCampaignModal';
import OnboardingTooltip from '../../components/Dashboard/OnboardingTooltip';
import useOnboarding from '../../hooks/useOnboarding';
import { getUserCampaignContext } from '../../utils/campaignHelpers';
import { getDashboardSSRData } from '../../lib/dashboardSSR';
import { authOptions } from '../api/auth/[...nextauth]';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Users,
  Facebook,
  Instagram,
  Music,
  Copy,
  Target,
  Gift,
  Eye,
  CheckCircle,
  Check,
  Lightbulb,
  ArrowLeft,
  MessageSquare,
  Hash,
  Sparkles,
  Zap,
  BookOpen,
  Award,
  Share2
} from 'lucide-react';
import { getFullStoreUrl } from '../../utils/storeUrlHelpers';
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

const defaultSalesStats = { total: 0, thisMonth: 0, growth: 0 };

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value?._id) return value._id.toString?.() || value._id;
  if (value.toString) return value.toString();
  return null;
};

const SalesToolPlaceholder = ({ title, description }) => (
  <Card className="min-h-[220px]">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent>
      <Skeleton className="w-full h-32" />
    </CardContent>
  </Card>
);

const PDFGenerator = dynamic(() => import('../../components/SalesTools/PDFGenerator'), {
  ssr: false,
  loading: () => (
    <SalesToolPlaceholder
      title="Outil PDF"
      description="Chargement de l'éditeur d'affiches"
    />
  )
});

const QRCodeGenerator = dynamic(() => import('../../components/SalesTools/QRCodeGenerator'), {
  ssr: false,
  loading: () => (
    <SalesToolPlaceholder
      title="QR Code Boutique"
      description="Préparation du générateur"
    />
  )
});

const ClientManager = dynamic(() => import('../../components/SalesTools/ClientManager'), {
  ssr: false,
  loading: () => (
    <SalesToolPlaceholder
      title="Gestion des clients"
      description="Chargement de votre base de clients"
    />
  )
});

const EmailCampaign = dynamic(() => import('../../components/SalesTools/EmailCampaign'), {
  ssr: false,
  loading: () => (
    <SalesToolPlaceholder
      title="Campagne email"
      description="Initialisation de l'éditeur"
    />
  )
});

// Component for weekly plan item with checkbox
function WeeklyPlanItem({ day, action, icon }) {
  const storageKey = `weekly-plan-${day}-${new Date().toISOString().split('T')[0]}`;
  const [completed, setCompleted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) === 'true';
    }
    return false;
  });

  return (
    <div className="flex items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 text-2xl mr-3">{icon}</div>
      <div className="w-24 font-semibold text-orange-600">{day}</div>
      <div className="flex-1 text-sm">{action}</div>
      <input
        type="checkbox"
        checked={completed}
        onChange={(e) => {
          setCompleted(e.target.checked);
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, e.target.checked.toString());
          }
          if (e.target.checked) {
            toast.success(`Bravo ! ${action} est complété !`);
          }
        }}
        className="w-5 h-5 text-orange-600 rounded cursor-pointer"
      />
    </div>
  );
}

export default function VendrePage({
  initialCampaignContext,
  initialStoreInfo,
  initialClients = [],
  initialSalesStats = defaultSalesStats
}) {
  const { data: session } = useSession();
  const router = useRouter();

  // State declarations - must come before handlers that use them
  const [storeInfo, setStoreInfo] = useState(initialStoreInfo || null);
  const [clients, setClients] = useState(initialClients);
  const [selectedClients, setSelectedClients] = useState([]);
  const [salesStats, setSalesStats] = useState(initialSalesStats || defaultSalesStats);
  const [loading, setLoading] = useState(!initialStoreInfo);
  const [copiedTemplate, setCopiedTemplate] = useState(null);

  // Campaign-related state - initialize from SSR props
  const [campaignContext, setCampaignContext] = useState(initialCampaignContext || null);
  const [showJoinCampaignModal, setShowJoinCampaignModal] = useState(false);

  // Onboarding state
  const [showOnboardingTooltip, setShowOnboardingTooltip] = useState(false);
  const [tooltipTarget, setTooltipTarget] = useState(null);
  const toolsTabsRef = useRef(null);

  // Use onboarding hook - must come before handlers that use its values
  const {
    progress,
    currentStep,
    isLoading: onboardingLoading,
    markStepComplete,
    getStepContent
  } = useOnboarding();

  // Memoize handlers to prevent unnecessary re-renders
  const handleCampaignSwitch = useCallback((campaignId) => {
    window.location.reload(); // Simple refresh for now
  }, []);

  const handleJoinCampaignClick = useCallback(() => {
    setShowJoinCampaignModal(true);
  }, []);

  const handleJoinCampaignSuccess = useCallback((campaign) => {
    setShowJoinCampaignModal(false);
    window.location.reload();
  }, []);

  const handleBackNavigation = useCallback((e) => {
    e.preventDefault();
    router.push('/dashboard');
  }, [router]);

  const handleOnboardingNext = useCallback(async () => {
    if (currentStep?.key === 'viewedTools') {
      const success = await markStepComplete('viewedTools', true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  }, [currentStep, markStepComplete]);

  const handleOnboardingSkip = useCallback(async () => {
    if (currentStep?.key === 'viewedTools') {
      const success = await markStepComplete('viewedTools', true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  }, [currentStep, markStepComplete]);

  const handleOnboardingClose = useCallback(() => {
    setShowOnboardingTooltip(false);
  }, []);

  const handleCloseJoinCampaignModal = useCallback(() => {
    setShowJoinCampaignModal(false);
  }, []);

  const normalizedInitialStoreId = normalizeId(initialStoreInfo?.storeId || initialStoreInfo?._id);
  const normalizedStoreId = useMemo(() => normalizeId(storeInfo?.storeId || storeInfo?._id), [storeInfo]);
  const clientsStoreIdRef = useRef(initialClients?.length ? normalizedInitialStoreId : null);
  const statsStoreIdRef = useRef(initialSalesStats ? normalizedInitialStoreId : null);
  const hasClientDataRef = useRef(initialClients?.length > 0);
  const hasStatsDataRef = useRef(initialSalesStats && typeof initialSalesStats.total === 'number');

  // Memoize campaign selector props
  const campaignSelectorProps = useMemo(() => ({
    onCampaignSwitch: handleCampaignSwitch,
    onJoinCampaign: handleJoinCampaignClick,
    initialCampaigns: initialCampaignContext?.campaigns || [],
  }), [handleCampaignSwitch, handleJoinCampaignClick, initialCampaignContext]);

  // Optimized prefetching for instant return navigation
  useEffect(() => {
    // Aggressive prefetching
    router.prefetch('/dashboard');
    router.prefetch('/dashboard');
    const timeoutId = setTimeout(() => {
      router.prefetch('/dashboard');
    }, 100);

    // Prefetch on hover/touch
    const backLink = document.querySelector('a[href="/dashboard"], button[onclick*="dashboard"]');
    if (backLink) {
      const prefetchDashboard = () => router.prefetch('/dashboard');
      backLink.addEventListener('mouseenter', prefetchDashboard, { once: true, passive: true });
      backLink.addEventListener('touchstart', prefetchDashboard, { once: true, passive: true });
    }

    return () => clearTimeout(timeoutId);
  }, [router]);

  // Onboarding logic for tools page
  useEffect(() => {
    if (!onboardingLoading && currentStep?.key === 'viewedTools') {
      setShowOnboardingTooltip(true);
      setTooltipTarget(toolsTabsRef.current);
    } else {
      setShowOnboardingTooltip(false);
    }
  }, [currentStep, onboardingLoading]);

  useEffect(() => {
    // If initialStoreInfo has all required fields, use it directly
    if (initialStoreInfo && initialStoreInfo.ownerName && initialStoreInfo.schoolName !== undefined) {
      setStoreInfo(initialStoreInfo);
      setLoading(false);
      return;
    }

    // Otherwise fetch store info if session and campaign are available
    if (session && campaignContext?.activeCampaignId && !initialStoreInfo) {
      fetchStoreInfo();
    } else if (initialStoreInfo) {
      setLoading(false);
    }
  }, [session, campaignContext?.activeCampaignId, initialStoreInfo]);

  // Refresh campaign context on client-side updates (only if not provided via SSR)
  useEffect(() => {
    if (!session?.user || initialCampaignContext) return;

    const fetchCampaignContext = async () => {
      try {
        const response = await fetch('/api/users/campaigns');
        if (response.ok) {
          const data = await response.json();
          const context = getUserCampaignContext(data);
          setCampaignContext(context);
        }
      } catch (error) {
        console.error('Error fetching campaign context:', error);
      }
    };

    fetchCampaignContext();
  }, [session, initialCampaignContext]);

  const fetchStoreInfo = async () => {
    if (!session?.user || !campaignContext?.activeCampaignId) {
      return;
    }
    try {
      // First get storeId from /api/get-store
      const storeResponse = await fetch('/api/get-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaignContext.activeCampaignId
        }),
      });

      if (!storeResponse.ok) {
        throw new Error('Failed to fetch store');
      }

      const storeData = await storeResponse.json();

      // Then fetch full store details using storeId
      if (storeData.storeId) {
        const fullStoreResponse = await fetch(`/api/stores/${storeData.storeId}`);
        if (fullStoreResponse.ok) {
          const fullStoreData = await fullStoreResponse.json();
          const normalizedStoreId = (() => {
            if (typeof storeData.storeId === 'string') return storeData.storeId;
            if (storeData.storeId?._id) return storeData.storeId._id.toString?.() || storeData.storeId._id;
            if (storeData.storeId?.toString) return storeData.storeId.toString();
            if (fullStoreData?._id) return fullStoreData._id.toString?.() || fullStoreData._id;
            return '';
          })();

          setStoreInfo({
            ...storeData,
            ...fullStoreData,
            storeId: normalizedStoreId,
          });
        } else {
          // Fallback to basic store data if full fetch fails
          setStoreInfo(storeData);
        }
      } else {
        setStoreInfo(storeData);
      }
    } catch (error) {
      console.error('Error fetching store info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = useCallback(async (force = false) => {
    if (!normalizedStoreId) {
      console.warn('[vendre] fetchClients: Missing storeId, skipping fetch.');
      return;
    }

    const storeChanged = normalizedStoreId !== clientsStoreIdRef.current;
    if (!force && !storeChanged && hasClientDataRef.current) {
      return;
    }

    clientsStoreIdRef.current = normalizedStoreId;

    try {
      const url = `/api/clients?storeId=${normalizedStoreId}&allCampaigns=true&autoSync=true`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
        hasClientDataRef.current = true;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('[vendre] Failed to fetch clients:', response.status, errorData);
      }
    } catch (error) {
      console.error('[vendre] Error fetching clients:', error);
    }
  }, [normalizedStoreId]);

  const fetchSalesStats = useCallback(async (force = false) => {
    if (!normalizedStoreId) {
      console.warn('fetchSalesStats: Missing storeId, skipping fetch');
      return;
    }

    const storeChanged = normalizedStoreId !== statsStoreIdRef.current;
    if (!force && !storeChanged && hasStatsDataRef.current) {
      return;
    }

    statsStoreIdRef.current = normalizedStoreId;

    try {
      const response = await fetch(`/api/sales-stats?storeId=${normalizedStoreId}`);
      if (response.ok) {
        const data = await response.json();
        setSalesStats(data);
        hasStatsDataRef.current = true;
      }
    } catch (error) {
      console.error('Error fetching sales stats:', error);
    }
  }, [normalizedStoreId]);

  useEffect(() => {
    if (!normalizedStoreId) {
      return;
    }

    if (normalizedStoreId !== clientsStoreIdRef.current) {
      hasClientDataRef.current = false;
    }

    if (!hasClientDataRef.current) {
      fetchClients(true);
    }

    if (normalizedStoreId !== statsStoreIdRef.current) {
      hasStatsDataRef.current = false;
    }

    if (!hasStatsDataRef.current) {
      fetchSalesStats(true);
    }
  }, [normalizedStoreId, fetchClients, fetchSalesStats]);

  const copyToClipboard = (text, templateId) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTemplate(templateId);
      toast.success('Copié dans le presse-papiers !');
      setTimeout(() => setCopiedTemplate(null), 2000);
    }).catch((err) => {
      console.error('Erreur lors de la copie:', err);
      toast.error('Erreur lors de la copie');
    });
  };

  // Get store URL for personalization
  // Helper to add source parameter
  const getStoreUrlWithSource = (source) => {
    if (!storeInfo) return '';
    const baseUrl = getFullStoreUrl(storeInfo);
    if (!baseUrl) return '';
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}source=${source}`;
  };

  const storeUrl = storeInfo ? getFullStoreUrl(storeInfo) : '';
  const storeName = storeInfo?.name || 'Ma Boutique';
  const schoolName = storeInfo?.schoolName || 'notre école';

  // Generate personalized social templates with store info
  const socialTemplates = useMemo(() => {
    const storeLink = storeUrl || 'lien-boutique';
    const hashtags = `#Massibec #Financement #${storeName.replace(/\s+/g, '')} #Tartes`;

    return {
      facebook: [
        {
          text: `🍰 Nouvelle campagne de financement ! Commandez vos délicieuses tartes Massibec et soutenez ${schoolName}. Chaque commande compte ! ${storeLink} ${hashtags}`,
          tip: "Partagez sur votre mur et dans les groupes locaux",
          hashtags: ["#Massibec", "#Financement", "#Tartes", "#École"]
        },
        {
          text: `🎯 Objectif: 1000 tartes vendues ! Aidez-nous à atteindre notre but en commandant vos tartes préférées sur ${storeName}. ${storeLink} ${hashtags}`,
          tip: "Créez un événement Facebook pour votre campagne",
          hashtags: ["#Objectif", "#Tartes", "#Massibec", "#Financement"]
        },
        {
          text: `❤️ Merci à tous ceux qui ont déjà commandé ! Il nous reste encore quelques jours pour atteindre notre objectif. Commandez maintenant sur ${storeName} ! ${storeLink} ${hashtags}`,
          tip: "Taguez les personnes qui ont commandé pour les remercier",
          hashtags: ["#Merci", "#Soutien", "#Massibec"]
        },
        {
          text: `📢 Dernière chance ! La campagne se termine bientôt. Commandez vos tartes Massibec maintenant et soutenez ${schoolName}. ${storeLink} ${hashtags}`,
          tip: "Créez un sentiment d'urgence pour booster les ventes",
          hashtags: ["#DernièreChance", "#Massibec", "#Tartes"]
        },
        {
          text: `🎉 Félicitations ! Nous avons atteint ${Math.max(10, Math.floor(salesStats.total * 0.5))} commandes ! Continuons ensemble vers notre objectif. Commandez sur ${storeName} : ${storeLink} ${hashtags}`,
          tip: "Célébrez les succès pour motiver davantage",
          hashtags: ["#Succès", "#Objectif", "#Massibec"]
        }
      ],
      instagram: [
        {
          text: `✨ Nouvelle collection de tartes Massibec disponible ! Swipe pour voir nos délicieux produits 👆 Commandez maintenant et soutenez ${schoolName} 🏫 ${storeLink} ${hashtags}`,
          tip: "Créez un carrousel avec photos des produits",
          hashtags: ["#Massibec", "#Tartes", "#Food", "#Delicious"]
        },
        {
          text: `📸 Behind the scenes de notre campagne de financement ! Regardez comment nous préparons vos commandes avec amour ❤️ Commandez maintenant : ${storeLink} ${hashtags}`,
          tip: "Partagez en Story avec un sticker de lien",
          hashtags: ["#BehindTheScenes", "#Massibec", "#BTS"]
        },
        {
          text: `🎉 CONCOURS ! Partagez cette publication en story et taguez 3 amis pour gagner une tarte gratuite ! Tirage dans 48h 🍰 ${storeLink} ${hashtags}`,
          tip: "Organisez un concours pour augmenter la visibilité",
          hashtags: ["#Concours", "#Giveaway", "#Massibec"]
        },
        {
          text: `💙 Chaque commande soutient directement ${schoolName} ! Commandez vos tartes Massibec préférées maintenant : ${storeLink} ${hashtags}`,
          tip: "Utilisez des visuels colorés et attrayants",
          hashtags: ["#Soutien", "#École", "#Massibec"]
        },
        {
          text: `🔥 Nouveau produit disponible ! Découvrez notre dernière création et commandez-la maintenant sur ${storeName} : ${storeLink} ${hashtags}`,
          tip: "Créez de l'excitation autour des nouveaux produits",
          hashtags: ["#Nouveau", "#Massibec", "#Tartes"]
        }
      ],
      tiktok: [
        {
          text: `POV: Tu découvres les meilleures tartes de ta vie 🥧✨ Commandez maintenant et soutenez ${schoolName} ! Lien en bio ${hashtags}`,
          tip: "Filmez une vidéo de dégustation authentique",
          hashtags: ["#Massibec", "#Tartes", "#POV", "#Food"]
        },
        {
          text: `Cette école vend des tartes et c'est génial ! 🎓🍰 Voici pourquoi vous devriez commander 👇 Lien en bio ${hashtags}`,
          tip: "Créez une vidéo avec musique tendance",
          hashtags: ["#Tartes", "#Massibec", "#École", "#Financement"]
        },
        {
          text: `Jour 1 de ma campagne vs Jour 30 😱 Regardez notre progression ! ${salesStats.total} commandes déjà ! Lien en bio ${hashtags}`,
          tip: "Montrez votre évolution et vos résultats",
          hashtags: ["#Transformation", "#Financement", "#Progression"]
        },
        {
          text: `Meilleur moment pour commander des tartes ? MAINTENANT ! 🍰✨ Lien en bio ${hashtags}`,
          tip: "Utilisez des transitions et effets visuels",
          hashtags: ["#Massibec", "#Tartes", "#Now"]
        },
        {
          text: `Quand tu réalises que chaque tarte aide ton école 💡🍰 Commandez maintenant ! Lien en bio ${hashtags}`,
          tip: "Créez du contenu engageant et émotionnel",
          hashtags: ["#Réalisation", "#École", "#Massibec"]
        }
      ],
      whatsapp: [
        {
          text: `🍰 Bonjour ! Notre campagne de financement Massibec est en cours. Commandez vos tartes préférées et soutenez ${schoolName} ! ${storeLink}`,
          tip: "Envoyez à vos contacts proches et famille",
          hashtags: []
        },
        {
          text: `🎯 Nous avons besoin de votre soutien ! Commandez sur ${storeName} : ${storeLink} Chaque commande compte !`,
          tip: "Personnalisez le message avec le nom du destinataire",
          hashtags: []
        },
        {
          text: `❤️ Merci pour votre commande ! N'hésitez pas à partager le lien avec vos amis : ${storeLink}`,
          tip: "Envoyez après chaque commande pour multiplier les ventes",
          hashtags: []
        },
        {
          text: `📢 Dernière chance ! La campagne se termine bientôt. Commandez maintenant : ${storeLink}`,
          tip: "Créez un sentiment d'urgence",
          hashtags: []
        }
      ]
    };
  }, [storeUrl, storeName, schoolName, salesStats.total]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    // If no session, show loading or null - redirect is handled by getServerSideProps
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-20 overflow-x-hidden">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          {/* Back Arrow */}
          <div className="mb-4">
            <Button
              variant="ghost"
              onClick={handleBackNavigation}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour au tableau de bord</span>
            </Button>
          </div>

          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Outils de Vente
              </h1>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Boostez vos ventes avec nos outils marketing prêts à utiliser</p>
            </div>
            <CampaignSelector {...campaignSelectorProps} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Ventes Total</CardTitle>
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{salesStats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">commandes</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Ce Mois</CardTitle>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{salesStats.thisMonth}</div>
              <p className="text-xs text-muted-foreground mt-1">commandes</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Croissance</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${salesStats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {salesStats.growth >= 0 ? '+' : ''}{salesStats.growth}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">vs mois dernier</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Clients</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">{clients.length}</div>
              <p className="text-xs text-muted-foreground mt-1">dans votre base</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <motion.div
          ref={toolsTabsRef}
          animate={currentStep?.key === 'viewedTools' ? {
            scale: [1, 1.02, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: currentStep?.key === 'viewedTools' ? Infinity : 0,
            ease: "easeInOut"
          }}
        >
          <Tabs defaultValue="marketing" className={`space-y-4 sm:space-y-6 ${currentStep?.key === 'viewedTools' ? 'ring-4 ring-blue-500 rounded-lg p-4' : ''}`}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="marketing" className="text-xs sm:text-sm">🎨 Marketing</TabsTrigger>
              <TabsTrigger value="clients" className="text-xs sm:text-sm">👥 Clients</TabsTrigger>
              <TabsTrigger value="social" className="text-xs sm:text-sm">📱 Réseaux</TabsTrigger>
              <TabsTrigger value="tips" className="text-xs sm:text-sm">💡 Conseils</TabsTrigger>
            </TabsList>

            {/* Marketing Tab */}
            <TabsContent value="marketing" className="space-y-4 sm:space-y-6">
              {/* PDF Generator prend toute la largeur car il a sa propre grille 2 colonnes */}
              <PDFGenerator storeInfo={storeInfo} products={null} />

              {/* QR Code Generator en dessous */}
              <QRCodeGenerator storeInfo={storeInfo} />

              {/* Marketing Tips */}
              <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2 text-purple-600" />
                    Stratégies Marketing Gagnantes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-bold">1</span>
                        </div>
                        <h4 className="font-semibold">Réseaux Sociaux</h4>
                      </div>
                      <p className="text-sm text-gray-600">Publiez quotidiennement sur Facebook, Instagram et TikTok avec nos templates</p>
                    </div>

                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-green-600 font-bold">2</span>
                        </div>
                        <h4 className="font-semibold">Email Marketing</h4>
                      </div>
                      <p className="text-sm text-gray-600">Envoyez des emails personnalisés à vos anciens clients chaque semaine</p>
                    </div>

                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-bold">3</span>
                        </div>
                        <h4 className="font-semibold">Affichage Local</h4>
                      </div>
                      <p className="text-sm text-gray-600">Imprimez et affichez vos PDF dans des lieux stratégiques de votre quartier</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Clients Tab */}
            <TabsContent value="clients" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <EmailCampaign
                  selectedClients={selectedClients}
                  storeId={storeInfo?.storeId}
                  studentName={session?.user?.name}
                  onSuccess={() => {
                    setSelectedClients([]);
                    fetchClients(true);
                  }}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Clients Sélectionnés</CardTitle>
                    <CardDescription>
                      {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''} sélectionné{selectedClients.length > 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedClients.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">Sélectionnez des clients ci-dessous pour envoyer des emails</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {clients.filter(c => selectedClients.includes(c._id)).map(client => (
                          <div key={client._id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div>
                              <p className="font-medium">{client.name}</p>
                              <p className="text-sm text-gray-600">{client.email}</p>
                            </div>
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <ClientManager
                clients={clients}
                storeId={
                  typeof (storeInfo?.storeId || storeInfo?._id) === 'string'
                    ? (storeInfo?.storeId || storeInfo?._id)
                    : (storeInfo?.storeId || storeInfo?._id)?.toString?.()
                }
                campaignId={
                  storeInfo?.campaignId || campaignContext?.activeCampaignId
                    ? (typeof (storeInfo?.campaignId || campaignContext?.activeCampaignId) === 'string'
                      ? (storeInfo?.campaignId || campaignContext?.activeCampaignId)
                      : (storeInfo?.campaignId || campaignContext?.activeCampaignId)?.toString?.())
                    : null
                }
                onRefresh={() => fetchClients(true)}
                selectedClients={selectedClients}
                onSelectionChange={setSelectedClients}
              />
            </TabsContent>

            {/* Social Media Tab */}
            <TabsContent value="social" className="space-y-4 sm:space-y-6">
              {/* Info Banner */}
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Templates personnalisés avec votre boutique
                      </p>
                      <p className="text-xs text-blue-700">
                        Tous les messages incluent automatiquement le nom de votre boutique ({storeName}) et le lien vers votre page ({storeUrl || 'lien-boutique'})
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                {/* Facebook */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <Facebook className="h-5 w-5 mr-2" />
                      Facebook
                    </CardTitle>
                    <CardDescription className="text-blue-100 text-xs sm:text-sm">
                      Posts pour votre mur et groupes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4 max-h-[600px] overflow-y-auto">
                    {socialTemplates.facebook.map((template, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <p className="text-sm mb-2 whitespace-pre-wrap break-words">{template.text}</p>
                        {template.hashtags && template.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {template.hashtags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="secondary" className="text-xs">
                                <Hash className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-start space-x-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-600">{template.tip}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(template.text, `facebook-${index}`)}
                            className={`flex-1 transition-all duration-200 ${copiedTemplate === `facebook-${index}`
                              ? 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100'
                              : ''
                              }`}
                          >
                            {copiedTemplate === `facebook-${index}` ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Copié!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copier
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const urlWithSource = getStoreUrlWithSource('facebook');
                              const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlWithSource || storeUrl)}&quote=${encodeURIComponent(template.text)}`;
                              window.open(url, '_blank');
                            }}
                            className="px-2"
                            title="Partager sur Facebook"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Instagram */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <Instagram className="h-5 w-5 mr-2" />
                      Instagram
                    </CardTitle>
                    <CardDescription className="text-pink-100 text-xs sm:text-sm">
                      Stories et posts attractifs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4 max-h-[600px] overflow-y-auto">
                    {socialTemplates.instagram.map((template, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-pink-300 transition-colors">
                        <p className="text-sm mb-2 whitespace-pre-wrap break-words">{template.text}</p>
                        {template.hashtags && template.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {template.hashtags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="secondary" className="text-xs">
                                <Hash className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-start space-x-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-600">{template.tip}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(template.text, `instagram-${index}`)}
                            className={`flex-1 transition-all duration-200 ${copiedTemplate === `instagram-${index}`
                              ? 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100'
                              : ''
                              }`}
                          >
                            {copiedTemplate === `instagram-${index}` ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Copié!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copier
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const url = `https://www.instagram.com/create/story/?text=${encodeURIComponent(template.text)}`;
                              window.open(url, '_blank');
                            }}
                            className="px-2"
                            title="Créer une Story"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* TikTok */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-gray-800 to-black text-white">
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <Music className="h-5 w-5 mr-2" />
                      TikTok
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-xs sm:text-sm">
                      Contenu viral pour jeunes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4 max-h-[600px] overflow-y-auto">
                    {socialTemplates.tiktok.map((template, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors">
                        <p className="text-sm mb-2 whitespace-pre-wrap break-words">{template.text}</p>
                        {template.hashtags && template.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {template.hashtags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="secondary" className="text-xs">
                                <Hash className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-start space-x-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-600">{template.tip}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(template.text, `tiktok-${index}`)}
                          className={`w-full transition-all duration-200 ${copiedTemplate === `tiktok-${index}`
                            ? 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100'
                            : ''
                            }`}
                        >
                          {copiedTemplate === `tiktok-${index}` ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copié!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copier
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* WhatsApp */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      WhatsApp / SMS
                    </CardTitle>
                    <CardDescription className="text-green-100 text-xs sm:text-sm">
                      Messages personnels
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4 max-h-[600px] overflow-y-auto">
                    {socialTemplates.whatsapp.map((template, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
                        <p className="text-sm mb-2 whitespace-pre-wrap break-words">{template.text}</p>
                        <div className="flex items-start space-x-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-600">{template.tip}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(template.text, `whatsapp-${index}`)}
                            className={`flex-1 transition-all duration-200 ${copiedTemplate === `whatsapp-${index}`
                              ? 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100'
                              : ''
                              }`}
                          >
                            {copiedTemplate === `whatsapp-${index}` ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Copié!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copier
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const url = `https://wa.me/?text=${encodeURIComponent(template.text)}`;
                              window.open(url, '_blank');
                            }}
                            className="px-2"
                            title="Ouvrir WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tips Tab */}
            <TabsContent value="tips" className="space-y-4 sm:space-y-6">
              {/* Stats-based tips */}
              {salesStats.total > 0 && (
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-700">
                      <Zap className="h-5 w-5 mr-2" />
                      Conseils Personnalisés Basés sur Vos Statistiques
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {salesStats.total < 10 && (
                        <div className="p-4 bg-white rounded-lg border border-green-200">
                          <p className="font-semibold text-green-700 mb-2">🚀 Démarrage</p>
                          <p className="text-sm text-gray-700">
                            Vous avez {salesStats.total} commande{salesStats.total > 1 ? 's' : ''}. Concentrez-vous sur vos proches (famille, amis) pour créer un effet boule de neige !
                          </p>
                        </div>
                      )}
                      {salesStats.total >= 10 && salesStats.total < 50 && (
                        <div className="p-4 bg-white rounded-lg border border-green-200">
                          <p className="font-semibold text-green-700 mb-2">📈 Croissance</p>
                          <p className="text-sm text-gray-700">
                            Excellent début avec {salesStats.total} commandes ! Utilisez les témoignages de vos premiers clients pour convaincre de nouveaux clients.
                          </p>
                        </div>
                      )}
                      {salesStats.thisMonth > 0 && (
                        <div className="p-4 bg-white rounded-lg border border-green-200">
                          <p className="font-semibold text-green-700 mb-2">📅 Ce Mois</p>
                          <p className="text-sm text-gray-700">
                            {salesStats.thisMonth} commande{salesStats.thisMonth > 1 ? 's' : ''} ce mois-ci. Maintenez le rythme avec des publications régulières !
                          </p>
                        </div>
                      )}
                      {clients.length > 0 && (
                        <div className="p-4 bg-white rounded-lg border border-green-200">
                          <p className="font-semibold text-green-700 mb-2">👥 Base de Clients</p>
                          <p className="text-sm text-gray-700">
                            Vous avez {clients.length} client{clients.length > 1 ? 's' : ''} dans votre base. Envoyez-leur des emails de relance pour augmenter les ventes répétées !
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center text-blue-600">
                      <Target className="h-5 w-5 mr-2" />
                      Maximiser Vos Ventes
                    </CardTitle>
                    <CardDescription>Stratégies éprouvées pour augmenter vos commandes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-start p-2 rounded-lg hover:bg-blue-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Publiez quotidiennement</span>
                          <p className="text-xs text-gray-600 mt-1">Les réseaux sociaux récompensent la régularité. Publiez au moins une fois par jour sur Facebook et Instagram.</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-blue-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Emails de relance hebdomadaires</span>
                          <p className="text-xs text-gray-600 mt-1">Envoyez un email chaque semaine à votre liste de clients. Les rappels doux augmentent les conversions de 20-30%.</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-blue-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Affichez vos PDF partout</span>
                          <p className="text-xs text-gray-600 mt-1">Imprimez et affichez dans les commerces locaux, écoles, centres communautaires. Le marketing physique fonctionne !</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-blue-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">QR code stratégique</span>
                          <p className="text-xs text-gray-600 mt-1">Partagez votre QR code sur tous vos posts, emails et documents. Facilitez l'accès à votre boutique !</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-blue-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Concours et défis</span>
                          <p className="text-xs text-gray-600 mt-1">Organisez des concours sur les réseaux sociaux. C'est un excellent moyen d'augmenter votre portée.</p>
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center text-purple-600">
                      <Gift className="h-5 w-5 mr-2" />
                      Idées Créatives
                    </CardTitle>
                    <CardDescription>Contenu engageant pour attirer l'attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-start p-2 rounded-lg hover:bg-purple-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Défi TikTok viral</span>
                          <p className="text-xs text-gray-600 mt-1">Créez un défi autour de vos produits (ex: "Montre-moi ta tarte préférée"). Les défis génèrent beaucoup d'engagement.</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-purple-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Offres spéciales</span>
                          <p className="text-xs text-gray-600 mt-1">"Commande 5 tartes, reçois-en 1 gratuite" ou "10% de rabais pour les 10 premiers commandes". Créez de l'urgence !</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-purple-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Témoignages vidéo</span>
                          <p className="text-xs text-gray-600 mt-1">Filmez des clients satisfaits qui parlent de vos produits. La preuve sociale est très efficace.</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-purple-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Compte à rebours</span>
                          <p className="text-xs text-gray-600 mt-1">Créez un sentiment d'urgence avec un compte à rebours pour la fin de campagne. "Plus que X jours !"</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-purple-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Progression visuelle</span>
                          <p className="text-xs text-gray-600 mt-1">Partagez votre progression vers l'objectif avec des graphiques visuels. "Nous sommes à 60% de notre objectif !"</p>
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center text-orange-600">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Relations Clients
                    </CardTitle>
                    <CardDescription>Construire une base de clients fidèles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-start p-2 rounded-lg hover:bg-orange-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Remerciez chaque client</span>
                          <p className="text-xs text-gray-600 mt-1">Envoyez un message de remerciement après chaque commande. Les clients appréciés reviennent plus souvent.</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-orange-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Demandez des avis</span>
                          <p className="text-xs text-gray-600 mt-1">Demandez à vos clients satisfaits de partager leur expérience. Les avis positifs attirent de nouveaux clients.</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-orange-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Programme de parrainage</span>
                          <p className="text-xs text-gray-600 mt-1">Offrez une récompense aux clients qui parrainent de nouveaux acheteurs. "Parraine un ami, reçois une tarte gratuite !"</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-orange-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Suivi personnalisé</span>
                          <p className="text-xs text-gray-600 mt-1">Personnalisez vos messages avec le nom du client. Les messages personnalisés ont un taux d'ouverture plus élevé.</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-orange-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Rappels de commande</span>
                          <p className="text-xs text-gray-600 mt-1">Rappelez aux clients qui ont consulté mais n'ont pas commandé. Parfois ils ont juste besoin d'un petit rappel.</p>
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center text-indigo-600">
                      <Award className="h-5 w-5 mr-2" />
                      Techniques Avancées
                    </CardTitle>
                    <CardDescription>Stratégies pour les vendeurs expérimentés</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-start p-2 rounded-lg hover:bg-indigo-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Partenariats locaux</span>
                          <p className="text-xs text-gray-600 mt-1">Collaborez avec d'autres commerces locaux pour échanger des clients. "Achetez chez X, obtenez 10% chez nous"</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-indigo-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Influenceurs micro</span>
                          <p className="text-xs text-gray-600 mt-1">Contactez des micro-influenceurs locaux (500-5000 followers) pour promouvoir votre campagne. Souvent plus abordable et efficace.</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-indigo-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Événements en direct</span>
                          <p className="text-xs text-gray-600 mt-1">Organisez des lives sur Instagram/Facebook pour présenter vos produits en temps réel. Les lives génèrent beaucoup d'engagement.</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-indigo-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Contenu éducatif</span>
                          <p className="text-xs text-gray-600 mt-1">Créez du contenu qui éduque (recettes, histoire des produits). Les gens aiment apprendre avant d'acheter.</p>
                        </div>
                      </li>
                      <li className="flex items-start p-2 rounded-lg hover:bg-indigo-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Analysez vos meilleurs moments</span>
                          <p className="text-xs text-gray-600 mt-1">Identifiez à quels moments vous recevez le plus de commandes et concentrez vos efforts sur ces périodes.</p>
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-orange-600">
                    <Calendar className="h-5 w-5 mr-2" />
                    Plan d'Action Hebdomadaire
                  </CardTitle>
                  <CardDescription>Suivez ce plan pour maximiser vos ventes chaque semaine</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { day: 'Lundi', action: 'Envoyez des emails de relance à vos clients', icon: '📧' },
                      { day: 'Mardi', action: 'Publiez sur Facebook et Instagram avec un nouveau template', icon: '📱' },
                      { day: 'Mercredi', action: 'Créez et publiez une vidéo TikTok', icon: '🎬' },
                      { day: 'Jeudi', action: 'Partagez votre QR code en story Instagram', icon: '📸' },
                      { day: 'Vendredi', action: 'Relancez les clients qui n\'ont pas encore commandé', icon: '🔄' },
                      { day: 'Samedi', action: 'Organisez un concours ou un défi sur les réseaux', icon: '🎉' },
                      { day: 'Dimanche', action: 'Analysez vos résultats et planifiez la semaine suivante', icon: '📊' }
                    ].map((item, index) => (
                      <WeeklyPlanItem
                        key={index}
                        day={item.day}
                        action={item.action}
                        icon={item.icon}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
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
        onClose={handleCloseJoinCampaignModal}
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

    return {
      props: dashboardData,
    };
  } catch (error) {
    console.error('Error in getServerSideProps (vendre):', error);
    return {
      props: {
        initialCampaignContext: { campaigns: [], activeCampaignId: null, mode: 'none' },
        initialStoreInfo: null,
        initialSchoolData: null,
        initialCampaignData: null,
        initialClients: [],
        initialSalesStats: defaultSalesStats
      },
    };
  }
}
