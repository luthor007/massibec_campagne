import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, RefreshCw, School, User, Eye, Edit, Users, Plus, FileText, Settings, Cog, Store, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { isTestCampaign } from '../../utils/campaignHelpers';

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
import RapportView from '../../components/Dashboard/SchoolManagement/RapportView';
import TeamManagement from '../../components/Dashboard/SchoolManagement/TeamManagement';
import SchoolSettings from '../../components/Dashboard/SchoolManagement/SchoolSettings';
import MultiSchoolSelector from '../../components/Dashboard/SchoolManagement/MultiSchoolSelector';
import CreateSchoolModal from '../../components/Dashboard/SchoolManagement/CreateSchoolModal';

export default function DashboardManager() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [showCreateSchoolModal, setShowCreateSchoolModal] = useState(false);
  const [schoolListRefreshTrigger, setSchoolListRefreshTrigger] = useState(0);
  
  // Initialize selectedCampaignId from localStorage or null
  const [selectedCampaignId, setSelectedCampaignId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedCampaignId') || null;
    }
    return null;
  });

  // State for selected school
  const [selectedSchoolId, setSelectedSchoolId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedSchoolId') || null;
    }
    return null;
  });

  // Custom hooks for data management
  // Only pass selectedSchoolId if it exists, otherwise let useSchoolData fetch from user's associations
  const schoolIdParam = selectedSchoolId || undefined;
  const { 
    school, 
    schoolLoading, 
    schoolError, 
    refreshSchoolData 
  } = useSchoolData(schoolIdParam);

  // Clear invalid selectedSchoolId if school data fetch fails
  useEffect(() => {
    if (schoolError && selectedSchoolId) {
      console.log('School fetch failed, clearing invalid selectedSchoolId from localStorage');
      setSelectedSchoolId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedSchoolId');
      }
      // Retry fetching school data without the invalid schoolId
      refreshSchoolData();
    }
  }, [schoolError, selectedSchoolId, refreshSchoolData]);

  const { 
    campaigns: allCampaigns, 
    campaignsLoading, 
    campaignsError, 
    refreshCampaigns 
  } = useCampaigns(session?.user?.id);

  // Filter campaigns by selected school if a school is selected
  const campaigns = selectedSchoolId && school?.id
    ? allCampaigns?.filter(campaign => campaign.school?._id?.toString() === selectedSchoolId || campaign.school === selectedSchoolId) || []
    : allCampaigns || [];

  // Get the selected campaign
  const activeCampaign = campaigns?.find(campaign => campaign._id?.toString() === selectedCampaignId?.toString()) || null;

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

  // Handle campaign selection and persist to localStorage
  const handleCampaignSelect = (campaignId) => {
    setSelectedCampaignId(campaignId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCampaignId', campaignId);
    }
  };

  // Save to localStorage whenever selectedCampaignId changes
  useEffect(() => {
    if (selectedCampaignId && typeof window !== 'undefined') {
      localStorage.setItem('selectedCampaignId', selectedCampaignId);
    }
  }, [selectedCampaignId]);

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

  // Switch to student dashboard view (preview mode)
  const handleSwitchToBoutique = async () => {
    try {
      // Check if we're already in student preview mode
      const currentViewMode = typeof window !== 'undefined' ? localStorage.getItem('viewMode') : null;
      
      if (currentViewMode === 'student_preview') {
        // Return to manager dashboard
        if (typeof window !== 'undefined') {
          localStorage.removeItem('viewMode');
        }
        router.push('/dashboard-manager');
        return;
      }

      // Set view mode to student preview
      if (typeof window !== 'undefined') {
        localStorage.setItem('viewMode', 'student_preview');
      }

      // Redirect to student dashboard (preview mode)
      router.push('/dashboard');
    } catch (error) {
      console.error('Error switching to student dashboard:', error);
      toast.error(error.message || 'Erreur lors de l\'accès au dashboard participant');
    }
  };

  // Handle campaign creation
  const handleCampaignCreated = (newCampaign) => {
    refreshCampaigns();
    setSelectedCampaignId(newCampaign._id?.toString() || newCampaign._id);
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
      setSelectedCampaignId(campaigns[0]._id?.toString() || campaigns[0]._id);
    }
  }, [campaigns, selectedCampaignId]);

  // Show welcome modal if no campaigns exist (but not if user just created one or if wizard is shown)
  useEffect(() => {
    // Only evaluate after all data has finished loading
    if (schoolLoading || campaignsLoading) {
      console.log('Still loading:', { schoolLoading, campaignsLoading });
      return; // Don't show/hide modal while still loading
    }
    
    const profileIsCompleted = school?.profileCompleted === true;
    
    console.log('Campaigns loaded:', { 
      campaignsCount: campaigns?.length || 0, 
      activeTab, 
      showOnboardingWizard,
      hasSchool: !!school,
      profileIsCompleted
    });
    
    // Don't show welcome modal if onboarding wizard should be shown (profile not completed)
    // Only show modal if profile is completed, no campaigns exist, and wizard is not shown
    if (school && profileIsCompleted && campaigns && campaigns.length === 0 && activeTab !== 'create' && !showOnboardingWizard) {
      console.log('Showing welcome modal - no campaigns found and profile completed');
      setShowWelcomeModal(true);
    } else if (campaigns && campaigns.length > 0) {
      console.log('Hiding welcome modal - campaigns exist');
      setShowWelcomeModal(false); // Hide welcome modal if campaigns exist
    } else if (!profileIsCompleted) {
      console.log('Hiding welcome modal - profile not completed (wizard should show)');
      setShowWelcomeModal(false); // Hide welcome modal if profile not completed
    }
  }, [school, campaigns, schoolLoading, campaignsLoading, activeTab, showOnboardingWizard]);

  // Show onboarding wizard if user profile is not completed
  useEffect(() => {
    // Only evaluate after all data has finished loading
    if (schoolLoading || campaignsLoading || status === 'loading') {
      console.log('Still loading, skipping wizard check:', { schoolLoading, campaignsLoading, status });
      return; // Don't show/hide wizard while still loading
    }
    
    // Explicit check: profile is NOT completed if:
    // 1. school exists AND profileCompleted is explicitly false
    // 2. school exists AND profileCompleted is undefined/null (defaults to false)
    const profileIsCompleted = school?.profileCompleted === true;
    const profileNotCompleted = school && school.profileCompleted !== true; // true only if explicitly set to true
    
    console.log('Onboarding wizard check:', {
      hasSession: !!session?.user,
      hasSchool: !!school,
      schoolId: school?.id,
      schoolLoading,
      campaignsLoading,
      status,
      profileCompleted: school?.profileCompleted,
      profileIsCompleted,
      profileNotCompleted,
      showOnboardingWizard,
      schoolError: schoolError?.message
    });
    
    // Show wizard if: user is logged in, school exists, profile is NOT completed, wizard not already showing
    if (session?.user && school && profileNotCompleted && !showOnboardingWizard) {
      console.log('✅ Showing onboarding wizard - profile not completed');
      setShowOnboardingWizard(true);
    } else if (school && profileIsCompleted && showOnboardingWizard) {
      console.log('Hiding onboarding wizard - profile completed');
      setShowOnboardingWizard(false);
    } else if (schoolError) {
      console.error('❌ Cannot show wizard - school loading error:', schoolError);
    } else if (!school && !schoolLoading) {
      console.warn('⚠️ Cannot show wizard - school is null and not loading');
    }
  }, [session, school, schoolLoading, schoolError, campaignsLoading, status, showOnboardingWizard]);

  // Handle campaign update
  const handleCampaignUpdate = async (updatedCampaign) => {
    console.log('handleCampaignUpdate called with:', updatedCampaign);
    
    // Refresh campaigns to get updated data
    await refreshCampaigns();
    await refreshStats();
    
    // If updated campaign is provided, ensure it's selected
    if (updatedCampaign && updatedCampaign._id) {
      const campaignId = updatedCampaign._id.toString();
      if (selectedCampaignId !== campaignId) {
        setSelectedCampaignId(campaignId);
      }
    }
    
    toast.success('Campagne mise à jour');
  };

  const handleOnboardingComplete = async () => {
    setShowOnboardingWizard(false);
    try {
      // Wait a bit for the database update to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      // Force refresh school data with cache busting
      await refreshSchoolData();
      // Also refresh the school list in MultiSchoolSelector
      setSchoolListRefreshTrigger(prev => prev + 1);
      toast.success('Profil complété avec succès !');
    } catch (error) {
      console.error('Error refreshing school data:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    }
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
                <MultiSchoolSelector
                  selectedSchoolId={selectedSchoolId || school?.id}
                  refreshTrigger={schoolListRefreshTrigger}
                  onSelectSchool={(schoolId) => {
                    setSelectedSchoolId(schoolId);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('selectedSchoolId', schoolId);
                    }
                    // Clear selected campaign when switching schools
                    setSelectedCampaignId(null);
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('selectedCampaignId');
                    }
                    refreshSchoolData();
                    refreshCampaigns();
                  }}
                  onCreateSchool={() => {
                    setShowCreateSchoolModal(true);
                  }}
                  onSchoolsChange={(schools) => {
                    // If no school is selected and schools exist, select the first one
                    if (!selectedSchoolId && schools.length > 0) {
                      const firstSchoolId = schools[0].id;
                      setSelectedSchoolId(firstSchoolId);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('selectedSchoolId', firstSchoolId);
                      }
                    }
                  }}
                />
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{session.user.name}</span>
                    </div>
                        <Button 
                  onClick={handleSwitchToBoutique} 
                          variant="outline" 
                          size="sm"
                  className="border-gray-300 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                        >
                  <Users className="h-4 w-4 mr-2" />
                  Voir comme participant
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
          {/* TEST Mode Banner */}
          {activeCampaign && isTestCampaign(activeCampaign) && (
            <div className="mb-6 bg-orange-50 border-2 border-orange-300 rounded-xl p-4 shadow-sm">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-orange-900 mb-1">
                    ⚠️ MODE TEST
                  </h3>
                  <p className="text-sm text-orange-800">
                    Cette campagne est en attente d'approbation. Toutes les données, commandes, statistiques et rapports sont en mode test et ne sont pas définitives jusqu'à l'approbation de la campagne par Massibec.
                  </p>
                </div>
              </div>
            </div>
          )}
          
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
              <TabsList className="grid w-full grid-cols-6 bg-gray-50/50 h-14 p-1">
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
                  value="rapport" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-medium transition-all duration-200 hover:bg-white/50 rounded-lg"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Rapports
                </TabsTrigger>
                <TabsTrigger 
                  value="create" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-medium transition-all duration-200 hover:bg-white/50 rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-medium transition-all duration-200 hover:bg-white/50 rounded-lg"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres & Équipe
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
                school={school}
              />
          </TabsContent>

            <TabsContent value="rapport" className="space-y-6">
              <RapportView 
                campaign={activeCampaign}
                school={school}
              />
          </TabsContent>

            <TabsContent value="create" className="space-y-6">
              <CampaignCreator 
                onCampaignCreated={handleCampaignCreated}
                school={school}
              />
          </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              {schoolLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Chargement des paramètres...</p>
                </div>
              ) : school?.id ? (
                <div className="space-y-6">
                  <SchoolSettings 
                    school={school} 
                    onUpdate={refreshSchoolData}
                  />
                  <TeamManagement schoolId={school.id} />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-red-500">Erreur: Impossible de charger les paramètres de l'école</p>
                </div>
              )}
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

      {/* Create School Modal */}
      <CreateSchoolModal
        isOpen={showCreateSchoolModal}
        onClose={() => setShowCreateSchoolModal(false)}
        onSchoolCreated={(newSchool) => {
          // Refresh school list
          setSchoolListRefreshTrigger(prev => prev + 1);
          // Select the newly created school and refresh data
          setSelectedSchoolId(newSchool.id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('selectedSchoolId', newSchool.id);
          }
          // Wait a bit for the list to refresh, then refresh school data
          setTimeout(() => {
            refreshSchoolData();
            refreshCampaigns();
          }, 500);
        }}
      />
    </>
  );
}
