// src/pages/dashboard-manager.jsx

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Calendar,
  Download,
  LogOut,
  Lock,
  Mail,
  Search,
  Settings,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  DollarSign,
  Award,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Eye,
  Plus,
  Filter,
  RefreshCw,
  HelpCircle,
  Info,
  CheckCircle,
  AlertCircle,
  Star,
  Gift,
  Zap,
  Heart,
  Sparkles,
  X,
  Percent,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';




import { useSession } from 'next-auth/react';
import { products } from '../../lib/product';
import { useRouter } from 'next/router';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function DashboardManager() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [school, setSchool] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true); // New loading state
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showWelcome, setShowWelcome] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showEditSchoolModal, setShowEditSchoolModal] = useState(false);
  const [showEditProfitModal, setShowEditProfitModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingCampaign, setReviewingCampaign] = useState(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);


const handleCopy = (code) => {
  if (!navigator.clipboard) {
    console.error('Clipboard API not supported');
    return;
  }

  navigator.clipboard.writeText(code)
    .then(() => {
      toast.success('Code copié dans le presse-papiers'); // Show success message (optional)
    })
    .catch((error) => {
      console.error('Error copying text: ', error);
      toast.error('Erreur lors de la copie'); // Show error message (optional)
    });
};

  // Fetch School Info
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        console.log('Fetching school info...');
        const response = await fetch('/api/school-info');
        console.log('School info response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('School info received:', data);
          setSchool(data);
          console.log('School info state updated');
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch school info:', errorData.message);
        }
      } catch (error) {
        console.error('Error fetching school info:', error);
      }
    };

    if (session) {
      fetchSchoolInfo();
    }
  }, [session]); // Removed 'school' from dependencies

  // Fetch Participants with Orders
  useEffect(() => {
    let timeoutId;
    
    const fetchParticipants = async () => {
      if (!school) return; // Ensure school info is available

      try {
        console.log('Fetching participants with orders...');
        const response = await fetch('/api/participants');
        console.log('Participants response status:', response.status);
        if (response.ok) {
          const participantsData = await response.json();
          console.log('Participants data received:', participantsData);

          let totalRaisedSum = 0;
          const aggregatedSales = {}; // To aggregate sales data by product

          const processedParticipants = participantsData.map((participant) => {
            const participantTotalSales = participant.orders.reduce((acc, order) => acc + order.totalAmount, 0);
            const participantTotalUnits = participant.orders.reduce((acc, order) => {
              order.products.forEach((item) => {
                acc += item.quantity;
              });
              return acc;
            }, 0);

            totalRaisedSum += participantTotalSales;

            // Aggregate sales data
            participantsData.forEach((participant) => {
            participant.orders.forEach((order) => {
              order.products.forEach((item) => {
                const productName = item.productName || 'Unknown Product';
                const productPrice = item.productPrice || 0;

                if (!aggregatedSales[productName]) {
                  aggregatedSales[productName] = { name: productName, price: productPrice, quantity: 0, total: 0 };
                }
                aggregatedSales[productName].quantity += item.quantity;
                aggregatedSales[productName].total += item.quantity * productPrice;
              });
            });
          });

            return {
              id: participant._id,
              name: participant.name,
              raised: participantTotalSales,
              goal: participant.objectifPersonnel || 1000,
              sales: participantTotalUnits,
            };
          });

          // Convert aggregatedSales object to array
          const salesDataArray = Object.values(aggregatedSales);

          console.log('Processed participants:', processedParticipants);
          console.log('Total raised:', totalRaisedSum);
          console.log('Aggregated sales data:', salesDataArray);

          setParticipants(processedParticipants);
          setTotalRaised(totalRaisedSum);
          setSalesData(salesDataArray);
          setLoading(false); // Data fetching complete
          console.log('Participants and school info state updated');
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch participants:', errorData.message);
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
      }
    };

    if (session && school) {
      // Debounce the request to prevent rapid successive calls
      timeoutId = setTimeout(() => {
        fetchParticipants();
      }, 300);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [session, school?._id]); // Only depend on school ID, not the entire school object

  // Handle Logout
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  // Handle Campaign Creation
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setIsCreatingCampaign(true);

    try {
      const formData = new FormData(e.target);
      const campaignData = {
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        deliveryDate: formData.get('deliveryDate'),
        financialGoal: formData.get('financialGoal'),
        profitSplitType: formData.get('profitSplitType'),
        studentBenefit: formData.get('studentBenefit'),
        organizationBenefit: formData.get('organizationBenefit'),
        raffleBenefit: formData.get('raffleBenefit')
      };

      const response = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Campagne créée avec succès! En attente d\'approbation de Massibec.');
        setActiveTab('campaigns');
        // Refresh school data
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Erreur: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Une erreur est survenue lors de la création de la campagne');
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setShowEditCampaignModal(true);
  };

  const handleReviewModifications = (campaign) => {
    setReviewingCampaign(campaign);
    setShowReviewModal(true);
  };

  const handleApproveModifications = async (campaign) => {
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}/approve-modifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Modifications approuvées avec succès!');
        fetchSchoolData();
        setShowReviewModal(false);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de l\'approbation');
      }
    } catch (error) {
      console.error('Error approving modifications:', error);
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleUpdateCampaign = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const updateData = {
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      deliveryDate: formData.get('deliveryDate'),
      financialGoal: formData.get('financialGoal'),
      profitSplitType: formData.get('profitSplitType'),
      studentBenefit: formData.get('studentBenefit'),
      organizationBenefit: formData.get('organizationBenefit'),
      raffleBenefit: formData.get('raffleBenefit')
    };

    try {
      const response = await fetch(`/api/campaigns/${editingCampaign._id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success('Campagne mise à jour avec succès!');
        fetchSchoolData();
        setShowEditCampaignModal(false);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Erreur lors de la mise à jour de la campagne');
    }
  };

  const handleDeleteAccount = async () => {
    if (process.env.NODE_ENV !== 'development') {
      alert('Cette fonctionnalité n\'est disponible qu\'en mode développement');
      return;
    }

    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir supprimer votre compte et toutes les données associées ? Cette action est irréversible.'
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('Compte supprimé avec succès. Vous allez être redirigé.');
        window.location.href = '/';
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Erreur lors de la suppression du compte');
    }
  };

  if (!school || !participants) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="ml-4 text-lg text-gray-700">Chargement du tableau de bord...</p>
      </div>
    );
  }

  // Calculate campaign progress and insights
  const campaignProgress = school ? (school.totalRaised / school.objectifFinancier) * 100 : 0;
  const daysRemaining = school?.finCampagne ? Math.ceil((new Date(school.finCampagne) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
  const isCampaignActive = school?.debutCampagne && school?.finCampagne && 
    new Date() >= new Date(school.debutCampagne) && new Date() <= new Date(school.finCampagne);
  
  // Find pending campaign
  const pendingCampaign = school?.campaigns?.find(campaign => campaign.status === 'pending_approval');
  
  // Filter participants based on search and status
  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'goal_reached' && (participant.raised / participant.goal) >= 1) ||
      (filterStatus === 'close_to_goal' && (participant.raised / participant.goal) >= 0.75 && (participant.raised / participant.goal) < 1) ||
      (filterStatus === 'needs_help' && (participant.raised / participant.goal) < 0.75);
    return matchesSearch && matchesStatus;
  });

  // Generate insights
  const insights = [
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Performance",
      value: `${campaignProgress.toFixed(1)}%`,
      subtitle: "de l'objectif atteint",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Temps restant",
      value: `${daysRemaining}`,
      subtitle: daysRemaining > 1 ? "jours" : "jour",
      color: daysRemaining < 7 ? "text-red-600" : "text-blue-600",
      bgColor: daysRemaining < 7 ? "bg-red-50" : "bg-blue-50"
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Participants",
      value: participants.length,
      subtitle: "élèves actifs",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: <Award className="h-5 w-5" />,
      title: "Moyenne",
      value: `$${participants.length > 0 ? (school.totalRaised / participants.length).toFixed(0) : 0}`,
      subtitle: "par élève",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <Avatar className="h-14 w-14 ring-4 ring-blue-100 shadow-lg">
                  <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {school.name?.charAt(0)}
                  </AvatarFallback>
              </Avatar>
                {isCampaignActive && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                )}
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {school.name}
                </h1>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-sm font-mono bg-blue-100 text-blue-800 border-blue-200">
                      Code: {school.code}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(school.code)}
                      className="h-6 w-6 p-0 hover:bg-blue-100"
                    >
                      <Copy className="h-3 w-3 text-blue-600" />
                    </Button>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Activity className="h-3 w-3 mr-1" />
                    {isCampaignActive ? 'Active' : 'En attente'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Partager ce code avec vos étudiants pour l'inscription
                </p>
              </div>
            </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLastUpdated(new Date())}
                className="text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            <Button variant="outline" className="flex items-center" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Welcome Banner */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6"
          >
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 rounded-full">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Bienvenue dans votre tableau de bord !</h3>
                      <p className="text-blue-100">
                        Suivez en temps réel les performances de votre campagne de financement
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWelcome(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-white/80 backdrop-blur-sm shadow-lg border border-gray-200/50 p-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Vue d&apos;ensemble
            </TabsTrigger>
            <TabsTrigger 
              value="campaigns"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Campagnes
            </TabsTrigger>
            <TabsTrigger 
              value="participants"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Users className="h-4 w-4 mr-2" />
              Participants
            </TabsTrigger>
            <TabsTrigger 
              value="sales"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <PieChartIcon className="h-4 w-4 mr-2" />
              Ventes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Key Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {insights.map((insight, index) => (
                <motion.div
                  key={insight.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">
                            {insight.title}
                          </p>
                          <p className={`text-2xl font-bold ${insight.color}`}>
                            {insight.value}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {insight.subtitle}
                          </p>
                        </div>
                        <div className={`p-3 rounded-full ${insight.bgColor}`}>
                          {insight.icon}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Enhanced Global Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
              <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Performance Globale
                      </CardTitle>
                      <CardDescription className="text-base">
                        Progression de votre campagne de financement
                </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        En progression
                      </Badge>
                    </div>
                  </div>
              </CardHeader>
              <CardContent className="pb-2">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <div className="flex justify-between items-end mb-6">
                  <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">
                      Montant amassé
                    </p>
                          <h2 className="text-4xl font-bold text-gray-900">
                      {school.totalRaised.toLocaleString()}$
                    </h2>
                          <p className="text-sm text-green-600 mt-1">
                            +12% cette semaine
                          </p>
                  </div>
                  <div className="text-right">
                          <p className="text-sm font-medium text-gray-600 mb-2">
                      Objectif
                    </p>
                          <p className="text-3xl font-semibold text-gray-900">
                      {school.objectifFinancier.toLocaleString()}$
                    </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {((school.objectifFinancier - school.totalRaised) / 1000).toFixed(0)}k$ restants
                    </p>
                  </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progression</span>
                          <span className="font-semibold">{campaignProgress.toFixed(1)}%</span>
                </div>
                <Progress
                          value={campaignProgress}
                          className="h-3 bg-gray-200"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>0$</span>
                          <span>{school.objectifFinancier.toLocaleString()}$</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                        <Target className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                        <p className="text-sm text-gray-600">Objectif atteint</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {campaignProgress.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                        <Clock className="h-8 w-8 mx-auto text-green-600 mb-2" />
                        <p className="text-sm text-gray-600">Temps restant</p>
                        <p className="text-2xl font-bold text-green-600">
                          {daysRemaining}
                        </p>
                        <p className="text-xs text-gray-500">jours</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
            </Card>
            </motion.div>

            {/* Enhanced Campaign Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border-0 shadow-xl">
              <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                        <Calendar className="mr-3 h-6 w-6" />
                  Informations de Campagne
                </CardTitle>
                      <CardDescription className="text-base">
                        Dates importantes et statut de votre campagne
                </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {school.currentCampaignNumber && (
                        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                          Campagne #{school.currentCampaignNumber}
                        </Badge>
                      )}
                      {(() => {
                        const today = new Date();
                        const startDate = new Date(school.debutCampagne);
                        const endDate = new Date(school.finCampagne);
                        
                        if (today < startDate) {
                          return <Badge className="bg-blue-100 text-blue-800 border-blue-200">À venir</Badge>;
                        } else if (today >= startDate && today <= endDate) {
                          return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
                        } else {
                          return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Terminée</Badge>;
                        }
                      })()}
                    </div>
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div 
                      className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="p-3 bg-blue-500 rounded-full w-fit mx-auto mb-4">
                        <Calendar className="h-6 w-6 text-white" />
                  </div>
                      <p className="text-sm font-medium text-blue-700 mb-2">Début de Campagne</p>
                      <p className="text-xl font-bold text-blue-900 mb-2">
                        {school.debutCampagne ? new Date(school.debutCampagne).toLocaleDateString('fr-CA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Non défini'}
                      </p>
                      {school.debutCampagne && (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                          {new Date(school.debutCampagne) > new Date() ? 'À venir' : 'Débutée'}
                        </Badge>
                      )}
                    </motion.div>
                    
                    <motion.div 
                      className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="p-3 bg-orange-500 rounded-full w-fit mx-auto mb-4">
                        <Clock className="h-6 w-6 text-white" />
                  </div>
                      <p className="text-sm font-medium text-orange-700 mb-2">Fin de Campagne</p>
                      <p className="text-xl font-bold text-orange-900 mb-2">
                        {school.finCampagne ? new Date(school.finCampagne).toLocaleDateString('fr-CA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Non défini'}
                      </p>
                      {school.finCampagne && (
                        <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                          {(() => {
                            const today = new Date();
                            const endDate = new Date(school.finCampagne);
                            const diffTime = endDate - today;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            if (diffDays > 0) {
                              return `${diffDays} jour${diffDays > 1 ? 's' : ''} restant${diffDays > 1 ? 's' : ''}`;
                            } else if (diffDays === 0) {
                              return 'Se termine aujourd\'hui';
                            } else {
                              return 'Terminée';
                            }
                          })()}
                    </Badge>
                      )}
                    </motion.div>
                    
                    <motion.div 
                      className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="p-3 bg-green-500 rounded-full w-fit mx-auto mb-4">
                        <Gift className="h-6 w-6 text-white" />
                  </div>
                      <p className="text-sm font-medium text-green-700 mb-2">Date de Livraison</p>
                      <p className="text-xl font-bold text-green-900 mb-2">
                        {school.dateDeLivraison ? new Date(school.dateDeLivraison).toLocaleDateString('fr-CA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Non défini'}
                      </p>
                      {school.dateDeLivraison && (
                        <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                          {(() => {
                            const today = new Date();
                            const deliveryDate = new Date(school.dateDeLivraison);
                            const diffTime = deliveryDate - today;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            if (diffDays > 0) {
                              return `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
                            } else if (diffDays === 0) {
                              return 'Aujourd\'hui';
                            } else {
                              return 'Passée';
                            }
                          })()}
                        </Badge>
                      )}
                    </motion.div>
                  </div>
              </CardContent>
            </Card>
            </motion.div>

            {/* Enhanced Top Performers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="border-0 shadow-xl">
              <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                        <Award className="mr-3 h-6 w-6" />
                        Meilleurs Performeurs
                      </CardTitle>
                      <CardDescription className="text-base">
                  Top 3 des élèves ayant amassé le plus de fonds
                </CardDescription>
                    </div>
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Classement
                    </Badge>
                  </div>
              </CardHeader>
              <CardContent>
                  {participants.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun participant</h3>
                      <p className="text-gray-500">
                        Les performances apparaîtront ici une fois que les élèves commenceront à vendre.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                  {participants
                    .sort((a, b) => b.raised - a.raised)
                    .slice(0, 3)
                        .map((participant, index) => {
                          const progress = (participant.raised / participant.goal) * 100;
                          const isGoalReached = progress >= 100;
                          
                          return (
                            <motion.div
                              key={participant.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300"
                            >
                              <div className="flex items-center space-x-4 flex-1">
                                <div className="relative">
                                  <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                                      {participant.name.charAt(0)}
                                    </AvatarFallback>
                        </Avatar>
                                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {index + 1}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <p className="font-semibold text-gray-900">{participant.name}</p>
                                    {isGoalReached && (
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Objectif atteint
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <span className="font-medium text-green-600">
                            {participant.raised.toLocaleString()}$ amassés
                                    </span>
                                    <span>•</span>
                                    <span>Objectif: {participant.goal.toLocaleString()}$</span>
                                    <span>•</span>
                                    <span>{participant.sales} ventes</span>
                                  </div>
                                  <div className="mt-2">
                                    <Progress
                                      value={progress}
                                      className="h-2 bg-gray-200"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      {progress.toFixed(1)}% de l'objectif
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl mb-1">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </div>
                        <Badge
                                  variant="outline" 
                                  className={
                                    index === 0 ? "border-yellow-300 text-yellow-700" :
                                    index === 1 ? "border-gray-300 text-gray-700" :
                                    "border-orange-300 text-orange-700"
                                  }
                                >
                                  {index === 0 ? 'Champion' : index === 1 ? '2ème' : '3ème'}
                        </Badge>
                      </div>
                            </motion.div>
                          );
                        })}
                </div>
                  )}
              </CardContent>
            </Card>
            </motion.div>

            {/* Pending Campaign Alert */}
            {pendingCampaign && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Card className="border-0 shadow-xl bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-yellow-500 rounded-full">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-yellow-900">
                            Campagne en attente d'approbation
                          </CardTitle>
                          <CardDescription className="text-yellow-700">
                            Votre campagne #{pendingCampaign.campaignNumber} est en cours d'examen par Massibec
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-yellow-500 text-white">
                        En attente
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-yellow-900 mb-2">Dates de la campagne</h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Début:</span> {new Date(pendingCampaign.startDate).toLocaleDateString('fr-CA')}</p>
                            <p><span className="font-medium">Fin:</span> {new Date(pendingCampaign.endDate).toLocaleDateString('fr-CA')}</p>
                            <p><span className="font-medium">Livraison:</span> {new Date(pendingCampaign.deliveryDate).toLocaleDateString('fr-CA')}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-yellow-900 mb-2">Objectif financier</h4>
                          <p className="text-lg font-bold text-yellow-900">{pendingCampaign.financialGoal?.toLocaleString()}$</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-yellow-900 mb-2">Répartition des profits</h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Type:</span> {pendingCampaign.profitSplitType === 'percentage' ? 'Pourcentage' : 'Valeur absolue'}</p>
                            <p><span className="font-medium">Étudiant:</span> {pendingCampaign.profitSplit?.studentBenefit}%</p>
                            <p><span className="font-medium">Organisation:</span> {pendingCampaign.profitSplit?.organizationBenefit}%</p>
                            <p><span className="font-medium">Tirage:</span> {pendingCampaign.profitSplit?.raffleBenefit}%</p>
                          </div>
                        </div>
                        {pendingCampaign.profitSplitLocked ? (
                          <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                            <p className="text-sm text-gray-600 flex items-center">
                              <Lock className="h-4 w-4 mr-2" />
                              Verrouillé par le fournisseur
                            </p>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => {
                              setEditingCampaign(pendingCampaign);
                              setShowEditProfitModal(true);
                            }}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Modifier la répartition
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        💡 Vous pouvez modifier la répartition des profits pendant que votre campagne est en attente d'approbation.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Enhanced School Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                        <Settings className="mr-3 h-6 w-6" />
                        Informations de l'École
                      </CardTitle>
                      <CardDescription className="text-base">
                        Détails de contact et informations générales
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                        <Info className="h-3 w-3 mr-1" />
                        Contact
                      </Badge>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowEditSchoolModal(true)}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Modifier
                        </Button>
                        {process.env.NODE_ENV === 'development' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowDeleteAccountModal(true)}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer (DEV)
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-blue-500 rounded-lg">
                            <Mail className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-700">Adresse</p>
                            <p className="text-base text-blue-900 font-medium">
                              {school.address || 'Non définie'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-green-500 rounded-lg">
                            <Mail className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-700">Email</p>
                            <p className="text-base text-green-900 font-medium">
                              {school.email || 'Non défini'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-purple-500 rounded-lg">
                            <Bell className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-purple-700">Téléphone</p>
                            <p className="text-base text-purple-900 font-medium">
                              {school.telephone || 'Non défini'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-500 rounded-lg">
                              <Settings className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-orange-700">Code d'identification</p>
                              <p className="text-lg text-orange-900 font-mono font-bold">
                                {school.code || 'Non défini'}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCopy(school.code)}
                            className="border-orange-300 text-orange-700 hover:bg-orange-50"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Copier
                          </Button>
                        </div>
                        <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                          <p className="text-xs text-orange-800">
                            💡 Partagez ce code avec vos élèves pour qu'ils puissent s'inscrire à la campagne.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Enhanced Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total des Ventes
                  </CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {salesData.reduce((acc, sale) => acc + sale.quantity, 0)}
                  </div>
                  <p className="text-sm text-gray-500">unités vendues</p>
                  <div className="mt-2 flex items-center text-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span className="text-xs">+15% cette semaine</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Produit le Plus Vendu
                  </CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Award className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-gray-900 mb-1">
                    {
                      salesData.sort((a, b) => b.quantity - a.quantity)[0]
                        ?.name || 'Aucun'
                    }
                  </div>
                  <p className="text-sm text-gray-500">
                    {salesData.sort((a, b) => b.quantity - a.quantity)[0]?.quantity || 0}{' '}
                    unités
                  </p>
                  <div className="mt-2 flex items-center text-blue-600">
                    <Star className="h-3 w-3 mr-1" />
                    <span className="text-xs">Produit populaire</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Moyenne par Élève
                  </CardTitle>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {participants.length > 0 ? (school.totalRaised / participants.length).toFixed(0) : 0}$
                  </div>
                  <p className="text-sm text-gray-500">
                    montant moyen amassé
                  </p>
                  <div className="mt-2 flex items-center text-purple-600">
                    <Heart className="h-3 w-3 mr-1" />
                    <span className="text-xs">Performance moyenne</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-8">
              <Card>
              <CardHeader>
                <CardTitle>Gestion des Campagnes</CardTitle>
                <CardDescription>
                  Créez et gérez vos campagnes de financement
                </CardDescription>
    </CardHeader>
    <CardContent>
                <div className="space-y-6">
                  {/* Current Campaign */}
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Campagne Actuelle</h3>
                        <p className="text-sm text-gray-600">Campagne #{school.currentCampaignNumber}</p>
                      </div>
                      <Badge className={
                        (() => {
                          const today = new Date();
                          const startDate = new Date(school.debutCampagne);
                          const endDate = new Date(school.finCampagne);
                          
                          if (today < startDate) return "bg-blue-500";
                          if (today >= startDate && today <= endDate) return "bg-green-500";
                          return "bg-gray-500";
                        })()
                      }>
                        {(() => {
                          const today = new Date();
                          const startDate = new Date(school.debutCampagne);
                          const endDate = new Date(school.finCampagne);
                          
                          if (today < startDate) return "À venir";
                          if (today >= startDate && today <= endDate) return "Active";
                          return "Terminée";
                        })()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Début</p>
                        <p className="font-medium">
                          {school.debutCampagne ? new Date(school.debutCampagne).toLocaleDateString('fr-CA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Non défini'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fin</p>
                        <p className="font-medium">
                          {school.finCampagne ? new Date(school.finCampagne).toLocaleDateString('fr-CA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Non défini'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Livraison</p>
                        <p className="font-medium">
                          {school.dateDeLivraison ? new Date(school.dateDeLivraison).toLocaleDateString('fr-CA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Non défini'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Create New Campaign Button */}
                  <div className="flex justify-end">
      <Button 
                      onClick={() => setActiveTab('create-campaign')}
                      className="bg-blue-600 hover:bg-blue-700"
      >
                      <Calendar className="mr-2 h-4 w-4" />
                      Créer une nouvelle campagne
      </Button>
                  </div>

                  {/* Campaign History */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Historique des Campagnes</h3>
                    <div className="space-y-3">
                      {school.campaigns && school.campaigns.length > 0 ? (
                        school.campaigns.map((campaign, index) => {
                          const getStatusBadge = (status) => {
                            switch (status) {
                              case 'pending_approval':
                                return <Badge className="bg-yellow-500">En attente d'approbation</Badge>;
                              case 'approved':
                                return <Badge className="bg-green-500">Approuvée</Badge>;
                              case 'rejected':
                                return <Badge className="bg-red-500">Rejetée</Badge>;
                              case 'active':
                                return <Badge className="bg-blue-500">Active</Badge>;
                              case 'completed':
                                return <Badge className="bg-gray-500">Terminée</Badge>;
                              case 'pending_school_approval':
                                return <Badge className="bg-orange-500">Modifications proposées</Badge>;
                              default:
                                return <Badge variant="outline">Inconnu</Badge>;
                            }
                          };

                          return (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-medium">Campagne #{campaign.campaignNumber}</h4>
                                  <p className="text-sm text-gray-600">
                                    {new Date(campaign.startDate).toLocaleDateString('fr-CA')} - {new Date(campaign.endDate).toLocaleDateString('fr-CA')}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Objectif: {campaign.financialGoal?.toLocaleString()}$ | 
                                    Répartition: {campaign.profitSplitType === 'percentage' ? 'Pourcentage' : 'Valeur absolue'}
                                  </p>
                                  {campaign.rejectionReason && (
                                    <p className="text-sm text-red-600 mt-1">
                                      Raison du rejet: {campaign.rejectionReason}
                                    </p>
                                  )}
                                  {campaign.massibecModifications && (
                                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                      <p className="text-sm text-blue-800 font-medium">Modifications proposées par Massibec</p>
                                      <p className="text-xs text-blue-600">Veuillez réviser et approuver ces changements</p>
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4 flex flex-col items-end space-y-2">
                                  {getStatusBadge(campaign.status)}
                                  {campaign.status !== 'active' && campaign.status !== 'completed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditCampaign(campaign)}
                                    >
                                      Modifier
                                    </Button>
                                  )}
                                  {campaign.status === 'pending_school_approval' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                      onClick={() => handleReviewModifications(campaign)}
                                    >
                                      Réviser modifications
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-gray-500 text-center py-4">Aucune campagne précédente</p>
                      )}
                    </div>
                  </div>
                </div>
    </CardContent>
  </Card>
          </TabsContent>

          {/* Create Campaign Tab */}
          <TabsContent value="create-campaign" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Créer une Nouvelle Campagne</CardTitle>
                <CardDescription>
                  Configurez les paramètres de votre nouvelle campagne de financement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCampaign} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de début
                      </label>
                      <Input
                        type="date"
                        name="startDate"
                        required
                      />
            </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de fin
                      </label>
                      <Input
                        type="date"
                        name="endDate"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de livraison
                    </label>
                    <Input
                      type="date"
                      name="deliveryDate"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      La date de livraison doit être au moins 3 semaines après la fin de la campagne
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Objectif financier
                    </label>
                    <Input
                      type="number"
                      name="financialGoal"
                      placeholder="100000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de répartition des profits
                    </label>
                    <Select name="profitSplitType">
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez le type de répartition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage par produit</SelectItem>
                        <SelectItem value="absolute">Valeur absolue par produit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Configuration des profits</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bénéfice étudiant (%)
                        </label>
                        <Input
                          type="number"
                          name="studentBenefit"
                          placeholder="85.6"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bénéfice organisation (%)
                        </label>
                        <Input
                          type="number"
                          name="organizationBenefit"
                          placeholder="9.4"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bénéfice tirage (%)
                        </label>
                        <Input
                          type="number"
                          name="raffleBenefit"
                          placeholder="5.0"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Les pourcentages doivent totaliser 100%
                    </p>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setActiveTab('campaigns')}
                    >
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isCreatingCampaign}
                    >
                      {isCreatingCampaign ? 'Création...' : 'Créer la campagne'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>Liste des Participants</CardTitle>
                <CardDescription>
                  Gérez et suivez les performances des élèves ({participants.length} participant{participants.length > 1 ? 's' : ''})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <Input
                      placeholder="Rechercher un élève..."
                      className="w-full sm:w-64"
                      // Implement search functionality as needed
                    />
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" className="flex items-center w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Exporter
                  </Button>
                </div>
                {participants.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun participant</h3>
                    <p className="text-gray-500">
                      Aucun élève ne s'est encore inscrit à votre campagne de financement.
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Partagez le code d'identification de votre école avec vos élèves pour qu'ils puissent s'inscrire.
                    </p>
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Montant amassé</TableHead>
                        <TableHead>Objectif</TableHead>
                        <TableHead>Ventes</TableHead>
                        <TableHead>Progression</TableHead>
                          <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {participants
                          .sort((a, b) => b.raised - a.raised)
                          .map((participant) => {
                            const progress = (participant.raised / participant.goal) * 100;
                            const isGoalReached = progress >= 100;
                            const isCloseToGoal = progress >= 75;
                            
                            return (
                        <TableRow key={participant.id}>
                          <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    <Avatar className="h-8 w-8 mr-3">
                                      <AvatarFallback className="text-xs">
                                        {participant.name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                            {participant.name}
                                  </div>
                          </TableCell>
                          <TableCell>
                                  <span className="font-semibold">
                            {participant.raised.toLocaleString()}$
                                  </span>
                          </TableCell>
                          <TableCell>
                            {participant.goal.toLocaleString()}$
                          </TableCell>
                          <TableCell>
                                  <span className="font-medium">{participant.sales}</span>
                                  <span className="text-sm text-gray-500 ml-1">unités</span>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                            <Progress
                                      value={progress}
                              className="w-full sm:w-32"
                            />
                                    <p className="text-xs text-gray-500">
                                      {progress.toFixed(1)}%
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={isGoalReached ? "default" : isCloseToGoal ? "secondary" : "outline"}
                                    className={
                                      isGoalReached ? "bg-green-500" : 
                                      isCloseToGoal ? "bg-yellow-500" : ""
                                    }
                                  >
                                    {isGoalReached ? "Objectif atteint" : 
                                     isCloseToGoal ? "Proche de l'objectif" : "En cours"}
                                  </Badge>
                          </TableCell>
                        </TableRow>
                            );
                          })}
                    </TableBody>
                  </Table>
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Détails des Ventes</CardTitle>
                <CardDescription>
                  Aperçu des produits vendus et des revenus générés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition des Ventes</CardTitle>
                <CardDescription>
                  Distribution des ventes par produit
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={salesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="quantity"
                    >
                      {salesData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
              <CardFooter>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Prix unitaire</TableHead>
                        <TableHead>Quantité vendue</TableHead>
                        <TableHead>Montant total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.map((product) => (
                        <TableRow key={product.name}>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>{product.price.toLocaleString()}$</TableCell>
                          <TableCell>{product.quantity}</TableCell>
                          <TableCell>{product.total.toLocaleString()}$</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Notifications et Communication</CardTitle>
                <CardDescription>
                  Gérez les communications avec les participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="notifications" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                  </TabsList>
                  <TabsContent value="notifications">
                    <div className="space-y-4">
                      <div className="flex items-center p-4 bg-muted rounded-lg">
                        <Bell className="h-5 w-5 mr-2 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Rappel: Fin de la campagne</p>
                          <p className="text-sm text-muted-foreground">
                            La campagne se termine dans 3 jours.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-muted rounded-lg">
                        <Bell className="h-5 w-5 mr-2 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Objectif atteint!</p>
                          <p className="text-sm text-muted-foreground">
                            L&apos;école a atteint 75% de son objectif.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="messages">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        <Input
                          placeholder="Tapez votre message..."
                          className="flex-grow"
                        />
                        <Button className="w-full sm:w-auto">
                          <Mail className="mr-2 h-4 w-4" /> Envoyer
                        </Button>
                      </div>
                      <Select>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionnez les destinataires" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les participants</SelectItem>
                          <SelectItem value="top">Meilleurs vendeurs</SelectItem>
                          <SelectItem value="below">
                            En dessous de l&apos;objectif
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit School Information Modal */}
      {showEditSchoolModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Modifier les informations de l'école</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditSchoolModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editName">Nom de l'école</Label>
                    <Input
                      id="editName"
                      defaultValue={school.name}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editEmail">Email</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      defaultValue={school.email}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="editAddress">Adresse</Label>
                  <Input
                    id="editAddress"
                    defaultValue={school.address}
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editTelephone">Téléphone</Label>
                    <Input
                      id="editTelephone"
                      defaultValue={school.telephone}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editCode">Code d'identification</Label>
                    <Input
                      id="editCode"
                      defaultValue={school.code}
                      className="mt-1"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Le code ne peut pas être modifié</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditSchoolModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Sauvegarder
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profit Split Modal */}
      {showEditProfitModal && editingCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Modifier la répartition des profits</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditProfitModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <form className="space-y-6">
                <div>
                  <Label htmlFor="editProfitSplitType">Type de répartition</Label>
                  <Select defaultValue={editingCampaign.profitSplitType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionnez le type de répartition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <div className="flex items-center space-x-2">
                          <Percent className="h-4 w-4" />
                          <span>Pourcentage par produit</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="absolute">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4" />
                          <span>Valeur absolue par produit</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="editStudentBenefit">Bénéfice étudiant (%)</Label>
                    <Input
                      id="editStudentBenefit"
                      type="number"
                      defaultValue={editingCampaign.profitSplit?.studentBenefit}
                      min="0"
                      max="100"
                      step="0.1"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editOrganizationBenefit">Bénéfice organisation (%)</Label>
                    <Input
                      id="editOrganizationBenefit"
                      type="number"
                      defaultValue={editingCampaign.profitSplit?.organizationBenefit}
                      min="0"
                      max="100"
                      step="0.1"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editRaffleBenefit">Bénéfice tirage (%)</Label>
                    <Input
                      id="editRaffleBenefit"
                      type="number"
                      defaultValue={editingCampaign.profitSplit?.raffleBenefit}
                      min="0"
                      max="100"
                      step="0.1"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Total:</strong> {(editingCampaign.profitSplit?.studentBenefit + editingCampaign.profitSplit?.organizationBenefit + editingCampaign.profitSplit?.raffleBenefit).toFixed(1)}%
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Les pourcentages doivent totaliser 100%
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditProfitModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button className="bg-yellow-600 hover:bg-yellow-700">
                    Sauvegarder
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {showEditCampaignModal && editingCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Modifier la Campagne #{editingCampaign.campaignNumber}</h3>
              <Button
                variant="outline"
                onClick={() => setShowEditCampaignModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateCampaign(e);
            }} className="space-y-6">
              {editingCampaign.datesLocked ? (
                <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <p className="text-sm text-gray-600 flex items-center mb-3">
                    <Lock className="h-4 w-4 mr-2" />
                    Les dates sont verrouillées par le fournisseur
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="editStartDate">Date de début</Label>
                      <Input
                        type="date"
                        id="editStartDate"
                        name="startDate"
                        defaultValue={editingCampaign.startDate}
                        disabled
                        className="mt-1 bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editEndDate">Date de fin</Label>
                      <Input
                        type="date"
                        id="editEndDate"
                        name="endDate"
                        defaultValue={editingCampaign.endDate}
                        disabled
                        className="mt-1 bg-gray-50"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="editDeliveryDate">Date de livraison</Label>
                    <Input
                      type="date"
                      id="editDeliveryDate"
                      name="deliveryDate"
                      defaultValue={editingCampaign.deliveryDate}
                      disabled
                      className="mt-1 bg-gray-50"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="editStartDate">Date de début</Label>
                      <Input
                        type="date"
                        id="editStartDate"
                        name="startDate"
                        defaultValue={editingCampaign.startDate}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editEndDate">Date de fin</Label>
                      <Input
                        type="date"
                        id="editEndDate"
                        name="endDate"
                        defaultValue={editingCampaign.endDate}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="editDeliveryDate">Date de livraison</Label>
                    <Input
                      type="date"
                      id="editDeliveryDate"
                      name="deliveryDate"
                      defaultValue={editingCampaign.deliveryDate}
                      required
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="editFinancialGoal">Objectif financier ($)</Label>
                <Input
                  type="number"
                  id="editFinancialGoal"
                  name="financialGoal"
                  defaultValue={editingCampaign.financialGoal}
                  required
                  className="mt-1"
                />
              </div>

              {editingCampaign.profitSplitLocked ? (
                <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <p className="text-sm text-gray-600 flex items-center mb-3">
                    <Lock className="h-4 w-4 mr-2" />
                    La répartition des profits est verrouillée par le fournisseur
                  </p>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Type:</span> {editingCampaign.profitSplitType === 'percentage' ? 'Pourcentage' : 'Valeur absolue'}</p>
                    <p><span className="font-medium">Étudiant:</span> {editingCampaign.profitSplit?.studentBenefit}%</p>
                    <p><span className="font-medium">Organisation:</span> {editingCampaign.profitSplit?.organizationBenefit}%</p>
                    <p><span className="font-medium">Tirage:</span> {editingCampaign.profitSplit?.raffleBenefit}%</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Percent className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-900">Configuration des profits</h3>
                  </div>
                  
                  <div className="space-y-4">
                  <div>
                    <Label htmlFor="editProfitSplitType">Type de répartition</Label>
                    <Select 
                      defaultValue={editingCampaign.profitSplitType} 
                      name="profitSplitType"
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionnez le type de répartition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          <div className="flex items-center space-x-2">
                            <Percent className="h-4 w-4" />
                            <span>Pourcentage par produit</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="absolute">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Valeur absolue par produit</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="editStudentBenefit">Bénéfice étudiant (%)</Label>
                      <Input
                        type="number"
                        id="editStudentBenefit"
                        name="studentBenefit"
                        defaultValue={editingCampaign.profitSplit?.studentBenefit}
                        min="0"
                        max="100"
                        step="0.1"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editOrganizationBenefit">Bénéfice organisation (%)</Label>
                      <Input
                        type="number"
                        id="editOrganizationBenefit"
                        name="organizationBenefit"
                        defaultValue={editingCampaign.profitSplit?.organizationBenefit}
                        min="0"
                        max="100"
                        step="0.1"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editRaffleBenefit">Bénéfice tirage (%)</Label>
                      <Input
                        type="number"
                        id="editRaffleBenefit"
                        name="raffleBenefit"
                        defaultValue={editingCampaign.profitSplit?.raffleBenefit}
                        min="0"
                        max="100"
                        step="0.1"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEditCampaignModal(false)}
                >
                  Annuler
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Sauvegarder
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modifications Modal */}
      {showReviewModal && reviewingCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Réviser les Modifications - Campagne #{reviewingCampaign.campaignNumber}</h3>
              <Button
                variant="outline"
                onClick={() => setShowReviewModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">Massibec a proposé des modifications à votre campagne</p>
                <p className="text-blue-600 text-sm mt-1">Veuillez réviser les changements ci-dessous et approuver ou rejeter</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Values */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-700">Vos valeurs originales</h4>
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium">Date de début:</span>
                      <p className="text-sm">{new Date(reviewingCampaign.startDate).toLocaleDateString('fr-CA')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Date de fin:</span>
                      <p className="text-sm">{new Date(reviewingCampaign.endDate).toLocaleDateString('fr-CA')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Date de livraison:</span>
                      <p className="text-sm">{new Date(reviewingCampaign.deliveryDate).toLocaleDateString('fr-CA')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Objectif financier:</span>
                      <p className="text-sm">{reviewingCampaign.financialGoal?.toLocaleString()}$</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Répartition:</span>
                      <p className="text-sm">
                        Étudiant: {reviewingCampaign.profitSplit?.studentBenefit}% | 
                        Organisation: {reviewingCampaign.profitSplit?.organizationBenefit}% | 
                        Tirage: {reviewingCampaign.profitSplit?.raffleBenefit}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modified Values */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-blue-700">Modifications proposées par Massibec</h4>
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium">Date de début:</span>
                      <p className="text-sm">{new Date(reviewingCampaign.massibecModifications?.startDate).toLocaleDateString('fr-CA')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Date de fin:</span>
                      <p className="text-sm">{new Date(reviewingCampaign.massibecModifications?.endDate).toLocaleDateString('fr-CA')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Date de livraison:</span>
                      <p className="text-sm">{new Date(reviewingCampaign.massibecModifications?.deliveryDate).toLocaleDateString('fr-CA')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Objectif financier:</span>
                      <p className="text-sm">{reviewingCampaign.massibecModifications?.financialGoal?.toLocaleString()}$</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Répartition:</span>
                      <p className="text-sm">
                        Étudiant: {reviewingCampaign.massibecModifications?.profitSplit?.studentBenefit}% | 
                        Organisation: {reviewingCampaign.massibecModifications?.profitSplit?.organizationBenefit}% | 
                        Tirage: {reviewingCampaign.massibecModifications?.profitSplit?.raffleBenefit}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {reviewingCampaign.massibecModifications?.reason && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">Raison des modifications</h4>
                  <p className="text-yellow-700 text-sm">{reviewingCampaign.massibecModifications.reason}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => {
                    // Handle rejection
                    setShowReviewModal(false);
                  }}
                >
                  Rejeter
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApproveModifications(reviewingCampaign)}
                >
                  Approuver les modifications
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-red-600">Supprimer le compte</h3>
              <Button
                variant="outline"
                onClick={() => setShowDeleteAccountModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">⚠️ Attention</p>
                <p className="text-red-700 text-sm mt-1">
                  Cette action supprimera définitivement votre compte et toutes les données associées :
                </p>
                <ul className="text-red-600 text-sm mt-2 list-disc list-inside">
                  <li>Votre compte utilisateur</li>
                  <li>Les informations de l'école</li>
                  <li>Toutes les campagnes</li>
                  <li>Les données des participants</li>
                  <li>Les commandes et statistiques</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium">Mode développement uniquement</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Cette fonctionnalité n'est disponible qu'en mode développement pour faciliter les tests.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteAccountModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    setShowDeleteAccountModal(false);
                    handleDeleteAccount();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer définitivement
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}