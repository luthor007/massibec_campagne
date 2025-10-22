import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, RefreshCw, School, User, Eye, Edit, Users, Plus } from 'lucide-react';
import { toast } from 'react-toastify';

// Custom Hooks
import { useSchoolData } from '../../hooks/useSchoolData';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useCampaignStats } from '../../hooks/useCampaignStats';

// Components
import CampaignSelector from '../../components/Dashboard/SchoolManagement/CampaignSelector';
import CampaignOverview from '../../components/Dashboard/SchoolManagement/CampaignOverview';
import CampaignEditor from '../../components/Dashboard/SchoolManagement/CampaignEditor';
import CampaignCreator from '../../components/Dashboard/SchoolManagement/CampaignCreator';
import ParticipantsList from '../../components/Dashboard/SchoolManagement/ParticipantsList';
import WelcomeModal from '../../components/Dashboard/SchoolManagement/WelcomeModal';
import OnboardingWizard from '../../components/Dashboard/OnboardingWizard';

export default function DashboardManager() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  // Custom hooks for data management
  const { 
    school, 
    schoolLoading, 
    schoolError, 
    refreshSchoolData 
  } = useSchoolData(session?.user?.id);

  const { 
    campaigns, 
    campaignsLoading, 
    campaignsError, 
    refreshCampaigns 
  } = useCampaigns(session?.user?.id);

  // Get the selected campaign
  const activeCampaign = campaigns?.find(campaign => campaign._id === selectedCampaignId) || null;

  const { 
    stats, 
    statsLoading, 
    statsError, 
    refreshStats 
  } = useCampaignStats(activeCampaign?._id);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/connexion');
      return;
    }
    if (session.user.role !== 'school_manager') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Handle logout
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Handle campaign selection
  const handleCampaignSelect = (campaignId) => {
    setSelectedCampaignId(campaignId);
  };

  // Refresh all data
  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshSchoolData(),
        refreshCampaigns(),
        refreshStats()
      ]);
      toast.success('Données actualisées');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Erreur lors de l\'actualisation');
    }
  };

  // Handle campaign creation
  const handleCampaignCreated = (newCampaign) => {
    refreshCampaigns();
    setSelectedCampaignId(newCampaign._id);
    setActiveTab('overview');
    setShowWelcomeModal(false); // Hide welcome modal after campaign creation
    toast.success('Campagne créée avec succès !');
  };

  // Handle welcome modal actions
  const handleCreateCampaignFromModal = () => {
    setShowWelcomeModal(false);
    setActiveTab('create');
  };

  // Auto-select first campaign if none selected
  useEffect(() => {
    if (campaigns && campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0]._id);
    }
  }, [campaigns, selectedCampaignId]);

  // Show welcome modal if no campaigns exist (but not if user just created one or if wizard is shown)
  useEffect(() => {
    if (school && campaigns && campaigns.length === 0 && !schoolLoading && !campaignsLoading && activeTab !== 'create' && !showOnboardingWizard) {
      setShowWelcomeModal(true);
    } else if (campaigns && campaigns.length > 0) {
      setShowWelcomeModal(false); // Hide welcome modal if campaigns exist
    }
  }, [school, campaigns, schoolLoading, campaignsLoading, activeTab, showOnboardingWizard]);

  // Show onboarding wizard if user profile is not completed
  useEffect(() => {
    if (session?.user && school && !schoolLoading && !school.profileCompleted) {
      setShowOnboardingWizard(true);
    }
  }, [session, school, schoolLoading]);

  // Handle campaign update
  const handleCampaignUpdate = () => {
    refreshCampaigns();
    refreshStats();
    toast.success('Campagne mise à jour');
  };

  const handleOnboardingComplete = () => {
    setShowOnboardingWizard(false);
    refreshSchoolData(); // Refresh school data to get updated profile status
    toast.success('Profil complété avec succès !');
  };

  if (status === 'loading' || schoolLoading || campaignsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'school_manager') {
    return null;
  }

  if (schoolError || campaignsError) {
  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <School className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Erreur de chargement</h2>
            <p className="text-sm">{schoolError || campaignsError}</p>
                  </div>
          <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
            </Button>
          </div>
        </div>
    );
  }
                          
                          return (
    <>
      <Head>
        <title>Dashboard Manager - {school?.name || 'École'}</title>
        <meta name="description" content="Tableau de bord pour les gestionnaires d'école" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-18 py-2">
              <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                    <School className="h-7 w-7 text-white" />
                        </div>
                        <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {school?.name || 'École'}
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">Gestionnaire d'école</p>
                        </div>
                      </div>
                    </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{session.user.name}</span>
                    </div>
                        <Button 
                  onClick={handleRefresh} 
                          variant="outline" 
                          size="sm"
                  className="border-gray-300 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                        >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                        </Button>
                          <Button 
                  onClick={handleLogout} 
                            variant="outline" 
                            size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-all duration-200"
                          >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                          </Button>
                      </div>
                    </div>
                  </div>
        </header>

        {/* Campaign Selector */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <CampaignSelector
              campaigns={campaigns}
              selectedCampaign={activeCampaign}
              onSelect={handleCampaignSelect}
              loading={campaignsLoading}
            />
                      </div>
                    </div>
                    
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Messages */}
          {statsError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                          </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erreur de chargement des statistiques
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{statsError}</p>
                          </div>
                        </div>
                      </div>
                            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
              <TabsList className="grid w-full grid-cols-4 bg-gray-50/50 h-14 p-1">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-medium transition-all duration-200 hover:bg-white/50 rounded-lg"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vue d'ensemble
                </TabsTrigger>
                <TabsTrigger 
                  value="edit" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-medium transition-all duration-200 hover:bg-white/50 rounded-lg"
                >
                  <Edit className="h-4 w-4 mr-2" />
                                      Modifier
                </TabsTrigger>
                <TabsTrigger 
                  value="participants" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-medium transition-all duration-200 hover:bg-white/50 rounded-lg"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Participants
                </TabsTrigger>
                <TabsTrigger 
                  value="create" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-medium transition-all duration-200 hover:bg-white/50 rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </TabsTrigger>
              </TabsList>
                                </div>

            <TabsContent value="overview" className="space-y-6">
              <CampaignOverview 
                campaign={activeCampaign}
                stats={stats}
                loading={statsLoading}
                school={school}
              />
          </TabsContent>

            <TabsContent value="edit" className="space-y-6">
              <CampaignEditor 
                campaign={activeCampaign}
                onUpdate={handleCampaignUpdate}
                loading={statsLoading}
              />
          </TabsContent>

            <TabsContent value="participants" className="space-y-6">
              <ParticipantsList 
                campaign={activeCampaign}
                onRefresh={handleRefresh}
              />
          </TabsContent>

            <TabsContent value="create" className="space-y-6">
              <CampaignCreator 
                onCampaignCreated={handleCampaignCreated}
                school={school}
              />
          </TabsContent>
        </Tabs>
      </main>
              </div>
              
      {/* Welcome Modal for new users */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onCreateCampaign={handleCreateCampaignFromModal}
      />

      {/* Onboarding Wizard for incomplete profiles */}
      <OnboardingWizard
        isOpen={showOnboardingWizard}
        onClose={() => setShowOnboardingWizard(false)}
        user={session.user}
        school={school}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
}
