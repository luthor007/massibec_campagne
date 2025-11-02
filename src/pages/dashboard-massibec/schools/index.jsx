import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import SchoolsTable from '../../../components/Dashboard/Supplier/SchoolsTable';
import { useSupplierSchools } from '../../../hooks/useSupplierSchools';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';

const SchoolsPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [filterStatus, setFilterStatus] = useState('all');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  const { schools, loading: schoolsLoading, refreshSchools, getSchoolsNeedingApproval } = useSupplierSchools();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/connexion');
      return;
    }
    
    // Vérifier si l'utilisateur a le rôle fournisseur
    if (session.user.role !== 'fournisseur') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleApproveSchool = async (school) => {
    try {
      const response = await fetch(`/api/schools/${school._id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showNotification('École approuvée avec succès!', 'success');
        refreshSchools();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error approving school:', error);
      showNotification('Erreur lors de l\'approbation de l\'école', 'error');
    }
  };

  const handleRejectSchool = async (school) => {
    try {
      const response = await fetch(`/api/schools/${school._id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showNotification('École rejetée avec succès!', 'success');
        refreshSchools();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error rejecting school:', error);
      showNotification('Erreur lors du rejet de l\'école', 'error');
    }
  };

  const handleViewDetails = (school) => {
    // TODO: Implémenter la vue détaillée complète
    console.log('Voir détails de:', school.nomEcole);
  };

  const handleApproveCampaign = async (campaignId) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        showNotification('Campagne approuvée avec succès!', 'success');
        refreshSchools();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Erreur lors de l\'approbation de la campagne:', error);
      showNotification('Erreur lors de l\'approbation de la campagne', 'error');
    }
  };

  const handleRejectCampaign = async (campaignId, reason = 'Rejetée par le fournisseur') => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      });
      
      if (response.ok) {
        showNotification('Campagne rejetée avec succès!', 'success');
        refreshSchools();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Erreur lors du rejet de la campagne:', error);
      showNotification('Erreur lors du rejet de la campagne', 'error');
    }
  };

  const handleUnapproveCampaign = async (campaignId) => {
    try {
      const response = await fetch(`/api/massibec/campaigns/${campaignId}/unapprove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        showNotification('Approbation de la campagne annulée avec succès!', 'success');
        refreshSchools();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Erreur lors de la désapprobation de la campagne:', error);
      showNotification('Erreur lors de la désapprobation de la campagne', 'error');
    }
  };

  const filteredSchools = Array.isArray(schools) ? schools.filter(school => {
    if (filterStatus === 'all') return true;
    return school.status === filterStatus;
  }) : [];

  const schoolsNeedingApproval = getSchoolsNeedingApproval();

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="ml-2 text-gray-600">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Don't render if not authenticated or wrong role
  if (!session || session.user.role !== 'fournisseur') {
    return null;
  }

  return (
    <DashboardLayout>
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {notification.message}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Écoles</h1>
            <p className="text-gray-600 mt-1">Gérez toutes les écoles et leurs campagnes</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les écoles</SelectItem>
                <SelectItem value="approved">Approuvées</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="rejected">Rejetées</SelectItem>
                <SelectItem value="deactivated">Désactivées</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={refreshSchools}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Écoles</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schools.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approuvées</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {schools.filter(s => s.status === 'approved').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {schoolsNeedingApproval.length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejetées</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {schools.filter(s => s.status === 'rejected').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Désactivées</CardTitle>
              <AlertCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {schools.filter(s => s.status === 'deactivated').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Campagnes Actives</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {schools.filter(s => s.activeCampaign && s.activeCampaign.status === 'active').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schools Table */}
        <SchoolsTable 
          schools={filteredSchools}
          loading={schoolsLoading}
          onRefresh={refreshSchools}
          onApprove={handleApproveSchool}
          onReject={handleRejectSchool}
          onViewDetails={handleViewDetails}
          onApproveCampaign={handleApproveCampaign}
          onRejectCampaign={handleRejectCampaign}
          onUnapproveCampaign={handleUnapproveCampaign}
        />
      </div>
    </DashboardLayout>
  );
};

export default SchoolsPage;
