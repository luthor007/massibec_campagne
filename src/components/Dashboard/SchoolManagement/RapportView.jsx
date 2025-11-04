import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, TrendingUp, ShoppingCart, Download, Printer, BarChart3, Filter, Table } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RapportTable from './RapportTable';
import RapportAnalytics from './RapportAnalytics';
import RapportFilters from './RapportFilters';
import { exportStudentDataCSV, exportAllOrdersCSV, printStudentSummary } from '../../../utils/exportRapport';
import { getTerminology } from '@/utils/organizationHelpers';

const RapportView = ({ campaign, school }) => {
  // Get terminology based on organization type
  const organizationType = school?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  const [students, setStudents] = useState([]);
  const [aggregateStats, setAggregateStats] = useState(null);
  const [campaignInfo, setCampaignInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    const fetchRapportData = async () => {
      if (!campaign?._id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/campaigns/${campaign._id}/rapport`);
        
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des données');
        }

        const data = await response.json();
        setStudents(data.students || []);
        setAggregateStats(data.aggregateStats || null);
        setCampaignInfo(data.campaign || null);
      } catch (err) {
        console.error('Error fetching rapport data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRapportData();
  }, [campaign]);

  // Handle filters change
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    
    let filtered = [...students];
    
    // Apply search filter
    if (newFilters.search) {
      const searchLower = newFilters.search.toLowerCase();
      filtered = filtered.filter(student => 
        student.firstName?.toLowerCase().includes(searchLower) ||
        student.lastName?.toLowerCase().includes(searchLower) ||
        student.parentFirstName?.toLowerCase().includes(searchLower) ||
        student.parentLastName?.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student.parentEmail?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sales range filter
    if (newFilters.minSales) {
      filtered = filtered.filter(student => student.metrics.totalSales >= parseFloat(newFilters.minSales));
    }
    if (newFilters.maxSales) {
      filtered = filtered.filter(student => student.metrics.totalSales <= parseFloat(newFilters.maxSales));
    }
    
    // Apply orders range filter
    if (newFilters.minOrders) {
      filtered = filtered.filter(student => student.metrics.orderCount >= parseInt(newFilters.minOrders));
    }
    if (newFilters.maxOrders) {
      filtered = filtered.filter(student => student.metrics.orderCount <= parseInt(newFilters.maxOrders));
    }
    
    // Apply date range filter
    if (newFilters.dateFrom || newFilters.dateTo) {
      filtered = filtered.filter(student => {
        return student.orders.some(order => {
          const orderDate = new Date(order.createdAt);
          const fromDate = newFilters.dateFrom ? new Date(newFilters.dateFrom) : null;
          const toDate = newFilters.dateTo ? new Date(newFilters.dateTo) : null;
          
          if (fromDate && orderDate < fromDate) return false;
          if (toDate && orderDate > toDate) return false;
          return true;
        });
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (newFilters.sortBy) {
        case 'totalSales':
          aValue = a.metrics.totalSales;
          bValue = b.metrics.totalSales;
          break;
        case 'totalStudentProfit':
          aValue = a.metrics.totalStudentProfit;
          bValue = b.metrics.totalStudentProfit;
          break;
        case 'orderCount':
          aValue = a.metrics.orderCount;
          bValue = b.metrics.orderCount;
          break;
        case 'firstName':
          aValue = a.firstName;
          bValue = b.firstName;
          break;
        case 'lastName':
          aValue = a.lastName;
          bValue = b.lastName;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return newFilters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return newFilters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredStudents(filtered);
  };

  // Update filtered students when students data changes
  useEffect(() => {
    setFilteredStudents(students);
  }, [students]);

  // Handle exports
  const handleExportStudents = () => {
    exportStudentDataCSV(students, campaignInfo);
  };

  const handleExportOrders = () => {
    exportAllOrdersCSV(students, campaignInfo);
  };

  const handlePrint = () => {
    printStudentSummary(students, campaignInfo, aggregateStats);
  };

  // Show message if no campaign selected
  if (!campaign) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-600">Veuillez sélectionner une campagne pour voir les rapports.</p>
        </CardContent>
      </Card>
    );
  }

  // Show error if loading failed
  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-600">Erreur: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{campaignInfo?.name || campaign.name}</span>
            <span className="text-sm font-normal text-gray-500">
              {campaignInfo?.code || campaign.campaignCode}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Date de début:</span>{' '}
              <span className="font-medium">
                {campaignInfo?.startDate 
                  ? new Date(campaignInfo.startDate).toLocaleDateString('fr-CA')
                  : campaign.startDate 
                    ? new Date(campaign.startDate).toLocaleDateString('fr-CA')
                    : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Date de fin:</span>{' '}
              <span className="font-medium">
                {campaignInfo?.endDate 
                  ? new Date(campaignInfo.endDate).toLocaleDateString('fr-CA')
                  : campaign.endDate 
                    ? new Date(campaign.endDate).toLocaleDateString('fr-CA')
                    : 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        {/* Mobile: Scrollable horizontal tabs */}
        <div className="lg:hidden overflow-x-auto scrollbar-hide">
          <TabsList className="inline-flex w-max min-w-full bg-gray-50/50 h-12 p-1 space-x-1">
            <TabsTrigger value="overview" className="flex items-center whitespace-nowrap px-3 sm:px-4">
              <Table className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Vue d'ensemble</span>
              <span className="sm:hidden">Vue</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center whitespace-nowrap px-3 sm:px-4">
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Analyses</span>
              <span className="sm:hidden">Anal.</span>
            </TabsTrigger>
            <TabsTrigger value="filters" className="flex items-center whitespace-nowrap px-3 sm:px-4">
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filtres</span>
              <span className="sm:hidden">Filt.</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden lg:block">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center">
              <Table className="h-4 w-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analyses
            </TabsTrigger>
            <TabsTrigger value="filters" className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-hidden">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2 text-blue-600" />
              Étudiants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {aggregateStats?.totalStudents || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-green-600" />
              Ventes Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${aggregateStats?.totalSales?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-purple-600" />
              Profits Étudiants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              ${aggregateStats?.totalStudentEarnings?.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Comptant: ${aggregateStats?.totalStudentCashProfit?.toFixed(2) || '0.00'} | 
              Compte: ${aggregateStats?.totalStudentSchoolAccountProfit?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <ShoppingCart className="h-4 w-4 mr-2 text-orange-600" />
              Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {aggregateStats?.totalOrders || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-hidden">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Projet École
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${aggregateStats?.totalSchoolProjectEarnings?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tirage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${aggregateStats?.totalRaffleEarnings?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Dons Étudiants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${aggregateStats?.totalStudentDonations?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Dons École
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${aggregateStats?.totalSchoolDonations?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Montant à Payer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${aggregateStats?.totalStudentPaymentAmount?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
        <Button
          onClick={handleExportStudents}
          variant="outline"
          className="flex items-center justify-center w-full sm:w-auto text-sm sm:text-base"
          disabled={loading || !students || students.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="truncate">Exporter Données Étudiants (CSV)</span>
        </Button>
        <Button
          onClick={handleExportOrders}
          variant="outline"
          className="flex items-center justify-center w-full sm:w-auto text-sm sm:text-base"
          disabled={loading || !students || students.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="truncate">Exporter Toutes les Commandes (CSV)</span>
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex items-center justify-center w-full sm:w-auto text-sm sm:text-base"
          disabled={loading || !students || students.length === 0}
        >
          <Printer className="h-4 w-4 mr-2" />
          <span className="truncate">Imprimer Résumé</span>
        </Button>
      </div>

          {/* Table */}
          <Card className="overflow-x-hidden">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Détails par {terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} ({filteredStudents.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
                <div className="overflow-x-auto scrollbar-hide">
                  <RapportTable students={filteredStudents} loading={loading} school={school} />
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <RapportAnalytics students={filteredStudents} aggregateStats={aggregateStats} school={school} />
        </TabsContent>

        <TabsContent value="filters" className="space-y-6">
          <RapportFilters onFiltersChange={handleFiltersChange} students={students} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RapportView;

