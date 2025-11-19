import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import SupplierCampaignManager from '../../../components/Dashboard/Supplier/SupplierCampaignManager';
import CampaignStudentsList from '../../../components/Dashboard/Supplier/CampaignStudentsList';
import { useSupplierSchools } from '../../../hooks/useSupplierSchools';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

const CampaignsPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  const { schools, loading: schoolsLoading, refreshSchools } = useSupplierSchools();

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

    fetchAllCampaigns();
  }, [session, status, router]);

  const fetchAllCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      // Use the Massibec campaigns API endpoint that gets all campaigns
      const response = await fetch('/api/massibec/campaigns', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.ok) {
        const campaigns = await response.json();
        console.log('Campaigns fetched:', campaigns.length, campaigns);
        setAllCampaigns(campaigns);
      } else {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Error fetching campaigns:', response.status, errorData);
        setAllCampaigns([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des campagnes:', error);
      setAllCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleApproveCampaign = async (campaign) => {
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showNotification('Campagne approuvée avec succès!', 'success');
        fetchAllCampaigns();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error approving campaign:', error);
      showNotification('Erreur lors de l\'approbation de la campagne', 'error');
    }
  };

  const handleRejectCampaign = async (campaign) => {
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showNotification('Campagne rejetée avec succès!', 'success');
        fetchAllCampaigns();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error rejecting campaign:', error);
      showNotification('Erreur lors du rejet de la campagne', 'error');
    }
  };

  const handleUnapproveCampaign = async (campaign) => {
    try {
      const response = await fetch(`/api/massibec/campaigns/${campaign._id}/unapprove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showNotification('Campagne désapprouvée avec succès!', 'success');
        fetchAllCampaigns();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error unapproving campaign:', error);
      showNotification('Erreur lors de la désapprobation de la campagne', 'error');
    }
  };

  const handleEditCampaign = (campaign) => {
    // TODO: Implémenter l'édition de campagne
    console.log('Éditer campagne:', campaign.nomCampagne);
  };

  const handleLockCampaign = async (campaign) => {
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locked: true }),
      });

      if (response.ok) {
        showNotification('Campagne verrouillée avec succès!', 'success');
        fetchAllCampaigns();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error locking campaign:', error);
      showNotification('Erreur lors du verrouillage de la campagne', 'error');
    }
  };

  const handleUnlockCampaign = async (campaign) => {
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locked: false }),
      });

      if (response.ok) {
        showNotification('Campagne déverrouillée avec succès!', 'success');
        fetchAllCampaigns();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error unlocking campaign:', error);
      showNotification('Erreur lors du déverrouillage de la campagne', 'error');
    }
  };

  const handleViewDetails = (campaign) => {
    setSelectedCampaignId(campaign._id?.toString() || campaign._id);
    console.log('Sélection de campagne:', campaign.nomCampagne);
  };

  const handleRefresh = () => {
    fetchAllCampaigns();
    refreshSchools();
  };

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
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${notification.type === 'success'
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
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Campagnes</h1>
            <p className="text-gray-600 mt-1">Gérez toutes les campagnes de toutes les écoles</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Campaign Manager */}
        <SupplierCampaignManager
          campaigns={allCampaigns}
          loading={loadingCampaigns}
          onRefresh={handleRefresh}
          onApprove={handleApproveCampaign}
          onReject={handleRejectCampaign}
          onUnapprove={handleUnapproveCampaign}
          onEdit={handleEditCampaign}
          onLock={handleLockCampaign}
          onUnlock={handleUnlockCampaign}
          onViewDetails={handleViewDetails}
          selectedCampaignId={selectedCampaignId}
        />

        {/* Students List for Selected Campaign */}
        {selectedCampaignId && (() => {
          const selectedCampaign = allCampaigns.find(c => {
            const cId = c._id?.toString() || c._id;
            const sId = selectedCampaignId?.toString() || selectedCampaignId;
            return cId === sId;
          });
          return selectedCampaign ? (
            <CampaignStudentsList
              campaign={selectedCampaign}
            />
          ) : null;
        })()}
      </div>
    </DashboardLayout>
  );
};

export default CampaignsPage;