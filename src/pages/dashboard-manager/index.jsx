import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, RefreshCw, School, User, Eye, Edit, Users, Plus, FileText, Settings, Cog, Store, Menu, X, Building2, ShoppingBag, ChevronDown, UserCircle, DollarSign, Package, MessageCircle } from 'lucide-react';
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
import RapportView from '../../components/Dashboard/SchoolManagement/RapportView';
import TeamManagement from '../../components/Dashboard/SchoolManagement/TeamManagement';
import SchoolSettings from '../../components/Dashboard/SchoolManagement/SchoolSettings';
import MultiSchoolSelector from '../../components/Dashboard/SchoolManagement/MultiSchoolSelector';
import CreateSchoolModal from '../../components/Dashboard/SchoolManagement/CreateSchoolModal';
import ChatModal from '../../components/Dashboard/Messaging/ChatModal';

export default function DashboardManager() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [showCreateSchoolModal, setShowCreateSchoolModal] = useState(false);
  const [schoolListRefreshTrigger, setSchoolListRefreshTrigger] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [justCreatedCampaign, setJustCreatedCampaign] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

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
    loading: schoolLoading,
    error: schoolError,
    refreshSchoolData
  } = useSchoolData(schoolIdParam);

  // Clear invalid selectedSchoolId if school data fetch fails or if school ID doesn't match
  useEffect(() => {
    // If there's an error indicating invalid schoolId was recovered, clear it
    if (schoolError === 'INVALID_SCHOOL_ID_RECOVERED' && selectedSchoolId) {
      console.log('Invalid schoolId was detected and recovered, clearing from localStorage');
      if (school && school.id) {
        // Update to the correct school ID
        const correctSchoolId = school.id.toString();
        setSelectedSchoolId(correctSchoolId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedSchoolId', correctSchoolId);
        }
      } else {
        // If no school loaded, just clear it
        setSelectedSchoolId(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedSchoolId');
        }
      }
      return;
    }

    // If there's a regular error and we have a selectedSchoolId, clear it
    if (schoolError && schoolError !== 'INVALID_SCHOOL_ID_RECOVERED' && selectedSchoolId) {
      console.log('School fetch failed, clearing invalid selectedSchoolId from localStorage');
      setSelectedSchoolId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedSchoolId');
      }
      // Retry fetching school data without the invalid schoolId
      refreshSchoolData();
      return;
    }

    // If school is loaded but doesn't match selectedSchoolId, update selectedSchoolId
    if (school && school.id && selectedSchoolId && school.id.toString() !== selectedSchoolId.toString()) {
      console.log('School ID mismatch detected:', {
        selectedSchoolId,
        actualSchoolId: school.id,
        updatingSelectedSchoolId: true
      });
      // Update to match the loaded school
      const loadedSchoolId = school.id.toString();
      setSelectedSchoolId(loadedSchoolId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedSchoolId', loadedSchoolId);
      }
    }
  }, [schoolError, selectedSchoolId, school, refreshSchoolData]);

  const {
    campaigns: allCampaigns,
    campaignsLoading,
    campaignsError,
    refreshCampaigns
  } = useCampaigns(session?.user?.id);

  // Filter campaigns by selected school if a school is selected
  const filteredCampaigns = selectedSchoolId && school?.id
    ? allCampaigns?.filter(campaign => campaign.school?._id?.toString() === selectedSchoolId || campaign.school === selectedSchoolId) || []
    : allCampaigns || [];

  // Sort campaigns by creation date (most recent first) for auto-selection
  const campaigns = filteredCampaigns.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.startDate || 0);
    const dateB = new Date(b.createdAt || b.startDate || 0);
    return dateB - dateA; // Most recent first
  });

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

    // Allow suppliers in preview mode to access school portal
    const viewMode = typeof window !== 'undefined' ? localStorage.getItem('viewMode') : null;
    const isSupplierPreview = viewMode === 'school_preview' && (session.user.role === 'supplier' || session.user.role === 'fournisseur');

    if (session.user.role !== 'school_manager' && !isSupplierPreview) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Handle logout
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

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
  const handleCampaignCreated = async (newCampaign) => {
    console.log('handleCampaignCreated called with:', newCampaign);

    if (!newCampaign?._id) {
      console.error('No campaign ID in response:', newCampaign);
      toast.error('Erreur: La campagne créée ne contient pas d\'ID');
      return;
    }

    // Mark that we just created a campaign to prevent welcome modal from showing
    setJustCreatedCampaign(true);
    setShowWelcomeModal(false); // Hide welcome modal immediately

    const campaignId = newCampaign._id.toString();
    console.log('Setting selected campaign ID to:', campaignId);

    // Set the selected campaign ID immediately
    setSelectedCampaignId(campaignId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCampaignId', campaignId);
    }

    setActiveTab('overview');

    // Refresh campaigns with retry logic
    let retries = 5;
    while (retries > 0) {
      // Wait before refreshing (longer delay for first refresh)
      await new Promise(resolve => setTimeout(resolve, retries === 5 ? 1500 : 1000));

      console.log(`Refreshing campaigns (attempt ${6 - retries}/5)...`);

      // Refresh campaigns
      try {
        await refreshCampaigns();

        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if we now have campaigns (this will be checked by the useEffect)
        // We continue to give the API time to sync
      } catch (error) {
        console.error('Error refreshing campaigns:', error);
      }

      retries--;
    }

    console.log('Campaign creation handling complete');

    // Reset the flag after a delay to allow the campaigns to load
    setTimeout(() => {
      setJustCreatedCampaign(false);
      console.log('Reset justCreatedCampaign flag');
    }, 5000);

    toast.success('Campagne créée avec succès !');
  };

  // Handle welcome modal actions
  const handleCreateCampaignFromModal = () => {
    setShowWelcomeModal(false);
    setActiveTab('create');
  };

  // Auto-select latest campaign if none selected or if selected campaign is invalid
  useEffect(() => {
    if (campaigns && campaigns.length > 0) {
      // Check if selected campaign is still valid (exists in current campaigns list)
      const selectedCampaignExists = selectedCampaignId && campaigns.some(
        campaign => (campaign._id?.toString() || campaign._id) === selectedCampaignId
      );

      // If no campaign selected or selected campaign is invalid, select the latest one
      if (!selectedCampaignId || !selectedCampaignExists) {
        // Campaigns are already sorted by most recent first, so select the first one
        const latestCampaign = campaigns[0];
        const latestCampaignId = latestCampaign._id?.toString() || latestCampaign._id;

        setSelectedCampaignId(latestCampaignId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedCampaignId', latestCampaignId);
        }
      }
    }
  }, [campaigns, selectedCampaignId]);

  // Show welcome modal if no campaigns exist (but not if user just created one or if wizard is shown)
  useEffect(() => {
    // Don't show welcome modal if we just created a campaign
    if (justCreatedCampaign) {
      console.log('Skipping welcome modal - campaign just created');
      return;
    }

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
      profileIsCompleted,
      justCreatedCampaign
    });

    // Don't show welcome modal if onboarding wizard should be shown (profile not completed)
    // Only show modal if profile is completed, no campaigns exist, and wizard is not shown
    if (school && profileIsCompleted && campaigns && campaigns.length === 0 && activeTab !== 'create' && !showOnboardingWizard && !justCreatedCampaign) {
      console.log('Showing welcome modal - no campaigns found and profile completed');
      setShowWelcomeModal(true);
    } else if (campaigns && campaigns.length > 0) {
      console.log('Hiding welcome modal - campaigns exist');
      setShowWelcomeModal(false); // Hide welcome modal if campaigns exist
    } else if (!profileIsCompleted) {
      console.log('Hiding welcome modal - profile not completed (wizard should show)');
      setShowWelcomeModal(false); // Hide welcome modal if profile not completed
    }
  }, [school, campaigns, schoolLoading, campaignsLoading, activeTab, showOnboardingWizard, justCreatedCampaign]);

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

  // Allow suppliers in preview mode
  const viewMode = typeof window !== 'undefined' ? localStorage.getItem('viewMode') : null;
  const isSupplierPreview = viewMode === 'school_preview' && (session?.user?.role === 'supplier' || session?.user?.role === 'fournisseur');

  if (!session || (session.user.role !== 'school_manager' && !isSupplierPreview)) {
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
        <header className="bg-white/98 backdrop-blur-md shadow-md border-b border-gray-200 sticky top-0 z-40 transition-all duration-200">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <div className="flex justify-between items-center h-20 py-2">
              {/* Campaign Selector - moved from separate section */}
              <div className="flex items-center flex-1 min-w-0 lg:flex-none">
                <div className="flex-1 min-w-0 lg:w-auto">
                  <CampaignSelector
                    campaigns={campaigns}
                    selectedCampaign={activeCampaign}
                    onSelect={handleCampaignSelect}
                    loading={campaignsLoading}
                  />
                </div>
              </div>

              {/* Mobile menu button - moved to right */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ml-2"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

              {/* Desktop user menu */}
              <div className="hidden lg:flex items-center space-x-2">
                {/* Portail Fournisseur - Only show for suppliers */}
                {isSupplierPreview && (
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('viewMode');
                        localStorage.removeItem('supplierView');
                      }
                      router.push('/dashboard-supplier');
                    }}
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    <span className="hidden xl:inline">Portail Fournisseur</span>
                    <span className="xl:hidden">Fournisseur</span>
                  </Button>
                )}

                {/* Portail Organisation - Current Badge (Active) */}
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 border-2 border-green-500 rounded-lg shadow-sm">
                  <School className="h-4 w-4 text-green-700" />
                  <span className="text-sm font-semibold text-green-700">Portail Organisation</span>
                </div>

                {/* Portail Vendeur */}
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSwitchToBoutique();
                  }}
                  variant="outline"
                  size="sm"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  <span className="hidden xl:inline">Portail Vendeur</span>
                  <span className="xl:hidden">Vendeur</span>
                </Button>

                {/* Chat Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative"
                  onClick={() => setShowChatModal(true)}
                  title="Messages"
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>

                {/* Profile Menu Dropdown with School Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-2 px-3 py-2 h-auto hover:bg-gray-100 transition-all duration-200"
                    >
                      <Avatar className="w-8 h-8 border-2 border-gray-200">
                        <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                          {session.user?.name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden xl:block text-left">
                        <div className="text-sm font-medium text-gray-700">{session.user.name}</div>
                        <div className="text-xs text-gray-500">Administrateur</div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 bg-white border border-gray-200 shadow-xl rounded-lg mt-2">
                    <div className="px-3 py-3 border-b border-gray-100">
                      <div className="text-sm font-semibold text-gray-900">{session.user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{session.user.email}</div>
                    </div>

                    {/* School Selector in Dropdown */}
                    <div className="px-3 py-3 border-b border-gray-100">
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

                    <DropdownMenuItem
                      onClick={() => setActiveTab('settings')}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50 py-2.5"
                    >
                      <UserCircle className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Profil</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center space-x-2 cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 py-2.5"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm font-medium">Déconnexion</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile menu dropdown with overlay - outside header */}
        {mobileMenuOpen && (
          <>
            {/* Overlay backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Mobile menu */}
            <div className="lg:hidden fixed top-0 right-0 h-screen w-80 max-w-[85vw] bg-white shadow-2xl z-[70] overflow-y-auto overflow-x-hidden">
              <div className="p-4 space-y-4">
                {/* Close button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* School Selector */}
                <div className="pb-4 border-b border-gray-200">
                  <MultiSchoolSelector
                    selectedSchoolId={selectedSchoolId || school?.id}
                    refreshTrigger={schoolListRefreshTrigger}
                    onSelectSchool={(schoolId) => {
                      setSelectedSchoolId(schoolId);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('selectedSchoolId', schoolId);
                      }
                      // Clear selected campaign when switching schools
                      // It will be auto-selected to the latest campaign after campaigns load
                      setSelectedCampaignId(null);
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('selectedCampaignId');
                      }
                      refreshSchoolData();
                      refreshCampaigns();
                      setMobileMenuOpen(false);
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

                {/* Portail Fournisseur - Only show for suppliers */}
                {isSupplierPreview && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileMenuOpen(false);
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('viewMode');
                        localStorage.removeItem('supplierView');
                      }
                      setTimeout(() => {
                        router.push('/dashboard-supplier');
                      }, 100);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Portail Fournisseur
                  </Button>
                )}

                {/* Portail Organisation - Active (Current) */}
                <div className="w-full flex items-center space-x-2 px-3 py-2 bg-green-50 border-2 border-green-500 rounded-lg">
                  <School className="h-4 w-4 text-green-700" />
                  <span className="text-sm font-semibold text-green-700">Portail Organisation</span>
                </div>

                {/* Portail Vendeur */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileMenuOpen(false);
                    // Use setTimeout to ensure menu closes before navigation
                    setTimeout(() => {
                      handleSwitchToBoutique();
                    }, 100);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Portail Vendeur
                </Button>

                {/* Profile Info - Clickable */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to settings tab which contains profile
                    setActiveTab('settings');
                    setMobileMenuOpen(false);
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-700 hover:bg-gray-100 p-3 h-auto"
                >
                  <Avatar className="w-10 h-10 border-2 border-gray-200 mr-3">
                    <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                      {session.user?.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-gray-700 truncate">{session.user.name}</div>
                    <div className="text-xs text-gray-500 truncate">{session.user.email}</div>
                  </div>
                </Button>

                {/* Logout */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
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
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6 lg:space-y-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
              {/* Mobile: Icons only tabs - no overflow */}
              <div className="lg:hidden overflow-hidden">
                <TabsList className="grid grid-cols-6 w-full bg-gray-50/50 h-14 p-1 gap-1">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200 hover:bg-white/50 rounded-lg p-2"
                    title="Vue d'ensemble"
                  >
                    <Eye className="h-5 w-5" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="edit"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200 hover:bg-white/50 rounded-lg p-2"
                    title="Modifier"
                  >
                    <Edit className="h-5 w-5" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="participants"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200 hover:bg-white/50 rounded-lg p-2"
                    title="Participants"
                  >
                    <Users className="h-5 w-5" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="rapport"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200 hover:bg-white/50 rounded-lg p-2"
                    title="Rapports"
                  >
                    <FileText className="h-5 w-5" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="create"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200 hover:bg-white/50 rounded-lg p-2"
                    title="Créer"
                  >
                    <Plus className="h-5 w-5" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200 hover:bg-white/50 rounded-lg p-2"
                    title="Paramètres & Équipe"
                  >
                    <Settings className="h-5 w-5" />
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Desktop: Grid layout */}
              <div className="hidden lg:block">
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
            </div>

            <TabsContent value="overview" className="space-y-6">
              <CampaignOverview
                campaign={activeCampaign}
                stats={stats}
                loading={statsLoading}
                school={school}
                onRefresh={handleRefresh}
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

      {/* Chat Modal */}
      <ChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        schoolId={school?._id || school?.id}
        supplierId={null}
        userRole={session?.user?.role}
      />
    </>
  );
}
