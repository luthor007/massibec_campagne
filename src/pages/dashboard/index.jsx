import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart, Settings, ShoppingBag, Store, TrendingUp, AlertTriangle, CheckCircle, Info, ArrowLeft, School } from 'lucide-react';
import CampaignSelector from '@/components/Dashboard/CampaignSelector';
import JoinCampaignModal from '@/components/Dashboard/JoinCampaignModal';
import OnboardingTooltip from '@/components/Dashboard/OnboardingTooltip';
import useOnboarding from '@/hooks/useOnboarding';
import { getUserCampaignContext } from '@/utils/campaignHelpers';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [storeId, setStoreId] = useState(null);
  
  // Check if user is in preview mode (school_manager viewing as student)
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Campaign-related state
  const [campaignContext, setCampaignContext] = useState(null);
  const [showJoinCampaignModal, setShowJoinCampaignModal] = useState(false);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  
  // School data for distribution message
  const [schoolData, setSchoolData] = useState(null);
  const [campaignData, setCampaignData] = useState(null);
  
  // Onboarding state
  const [storeExists, setStoreExists] = useState(false);
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

  useEffect(() => {
    if (session) {
      // Fetch the store information using the user's session
      const fetchStore = async () => {
        try {
          const response = await fetch('/api/get-store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: session.user.id }),
          });
          const data = await response.json();
          setStoreId(data.storeId);  // Assuming the API response returns a storeId
          setStoreExists(!!data.storeId); // Track if store exists
        } catch (error) {
          console.error('Error fetching store ID:', error);
        }
      };
      fetchStore();
    }
  }, [session]);

  // Fetch campaign context
  useEffect(() => {
    const fetchCampaignContext = async () => {
      if (!session?.user) return;
      
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
  }, [session]);

  // Fetch school and campaign data for distribution message
  useEffect(() => {
    const fetchSchoolAndCampaignData = async () => {
      if (!session?.user || !campaignContext) return;

      try {
        // Get schoolId from campaign context
        let schoolIdFromContext = null;
        if (campaignContext.campaigns && campaignContext.campaigns.length > 0) {
          const firstCampaign = campaignContext.campaigns[0];
          schoolIdFromContext = firstCampaign.school?._id || firstCampaign.school;
        }

        if (schoolIdFromContext) {
          // Fetch school data
          const schoolResponse = await fetch(`/api/schools/${schoolIdFromContext}`);
          if (schoolResponse.ok) {
            const schoolData = await schoolResponse.json();
            setSchoolData(schoolData);
          }

          // Fetch campaign data for delivery date
          const activeCampaignId = campaignContext.activeCampaignId || 
            (campaignContext.campaigns?.[0]?._id) || 
            (campaignContext.campaigns?.[0]?.campaignId);
          
          if (activeCampaignId) {
            const campaignResponse = await fetch(`/api/campaigns/${activeCampaignId}`);
            if (campaignResponse.ok) {
              const campaignResult = await campaignResponse.json();
              if (campaignResult.campaign) {
                setCampaignData(campaignResult.campaign);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching school/campaign data:', error);
      }
    };

    if (campaignContext && campaignContext.mode !== 'none') {
      fetchSchoolAndCampaignData();
    }
  }, [session, campaignContext]);

  // Check if in preview mode on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const viewMode = localStorage.getItem('viewMode');
      const isPreview = viewMode === 'student_preview' && session?.user?.role === 'school_manager';
      setIsPreviewMode(isPreview);
    }
  }, [session]);

  const handleReturnToManagerDashboard = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('viewMode');
    }
    router.push('/dashboard-manager');
  };

  // Campaign handlers
  const handleCampaignSwitch = (campaignId) => {
    window.location.reload(); // Simple refresh for now
  };


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

  // Onboarding handlers
  const handleOnboardingNext = async () => {
    if (currentStep) {
      const success = await markStepComplete(currentStep.key, true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  };

  const handleOnboardingSkip = async () => {
    if (currentStep) {
      const success = await markStepComplete(currentStep.key, true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  };

  const handleOnboardingClose = () => {
    setShowOnboardingTooltip(false);
  };


  // Handle campaign join success
  const handleJoinCampaignSuccess = async (campaign) => {
    setShowJoinCampaignModal(false);
    await markStepComplete('joinedCampaign', true);
    window.location.reload();
  };

  return (
    <Layout className="pt-8">
      <div className="pt-24">
        {/* Header with Campaign Management */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord</h1>
            {!isCompleted && currentStep && (
              <div className="mt-2 flex items-center space-x-2">
                <div className="text-sm text-gray-600">
                  Formation en cours ({completionPercentage}%)
                </div>
                <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
          </div>
          <motion.div
            ref={campaignSelectorRef}
            className="flex items-center space-x-4"
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
                onJoinCampaign={() => setShowJoinCampaignModal(true)}
              />
            </div>
          </motion.div>
        </div>

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
            <Card className={currentStep?.key === 'personalizedStore' ? 'ring-4 ring-blue-500 shadow-2xl' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-primary" />
                  Personnaliser ma boutique
                </CardTitle>
                <CardDescription>Modifiez l&apos;apparence et les détails de votre boutique en ligne.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/personnalisation" passHref>
                  <Button className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Personnaliser
                    <ArrowRight className="ml-2 h-4 w-4" />
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
            <Card className={currentStep?.key === 'viewedOrders' ? 'ring-4 ring-blue-500 shadow-2xl' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingBag className="h-5 w-5 mr-2 text-primary" />
                  Mes commandes
                </CardTitle>
                <CardDescription>Consultez et gérez les commandes de vos clients.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/commandes" passHref>
                  <Button className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                    Voir les commandes
                    <ArrowRight className="ml-2 h-4 w-4" />
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
            <Card className={currentStep?.key === 'viewedStats' ? 'ring-4 ring-blue-500 shadow-2xl' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2 text-primary" />
                  Statistiques
                </CardTitle>
                <CardDescription>Suivez les performances de votre campagne.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/statistiques" passHref>
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
                    Voir les statistiques
                    <ArrowRight className="ml-2 h-4 w-4" />
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
            <Card className={currentStep?.key === 'visitedStore' ? 'ring-4 ring-blue-500 shadow-2xl' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Store className="h-5 w-5 mr-2 text-primary" />
                  Voir ma boutique
                </CardTitle>
                <CardDescription>Accédez à votre boutique en ligne pour la voir comme vos clients.</CardDescription>
              </CardHeader>
              <CardContent>
                {storeId ? (
                  <Link href={`/boutique/${storeId}`} passHref>
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
            <Card className={currentStep?.key === 'viewedTools' ? 'ring-4 ring-blue-500 shadow-2xl' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  Outils de Vente
                </CardTitle>
                <CardDescription>Boostez vos ventes avec nos outils marketing prêts à utiliser.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/vendre" passHref>
                  <Button className="w-full bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                    Voir les outils
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card for Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 mr-2 text-primary" />
                Détail de la campagne
              </CardTitle>
              <CardDescription>Consultez les détails de votre campagne et les profits par produit.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/detail" passHref>
                <Button className="w-full bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
                  Voir les détails
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

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
          onClose={() => setShowJoinCampaignModal(false)}
          onSuccess={handleJoinCampaignSuccess}
        />
      </div>
    </Layout>
  );
}