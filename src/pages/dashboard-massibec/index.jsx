import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import SupplierStats from '../../components/Dashboard/Supplier/SupplierStats';
import SchoolsTable from '../../components/Dashboard/Supplier/SchoolsTable';
import { useSupplierSchools } from '../../hooks/useSupplierSchools';
import { useSupplierStats } from '../../hooks/useSupplierStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  TrendingUp
} from 'lucide-react';

const DashboardMassibec = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [periode, setPeriode] = useState('mois');
  const { schools, loading: schoolsLoading, refreshSchools } = useSupplierSchools();
  const { stats, loading: statsLoading, refreshStats } = useSupplierStats(periode);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/connexion');
      return;
    }
    // Redirect suppliers to the new dashboard-supplier pages
    if (session.user.role === 'supplier' || session.user.role === 'fournisseur') {
      router.push('/dashboard-supplier');
      return;
    }
  }, [session, status, router]);

  const handleApproveSchool = async (school) => {
    console.log('handleApproveSchool called for:', school.name);
    try {
      const response = await fetch(`/api/schools/${school._id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Approve response:', response.status);
      if (response.ok) {
        console.log('Refreshing data...');
        await Promise.all([refreshSchools(), refreshStats()]);
        console.log('Data refreshed');
      }
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
    }
  };

  const handleRejectSchool = async (school) => {
    try {
      const response = await fetch(`/api/schools/${school._id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Rejeté par l\'administrateur' })
      });

      if (response.ok) {
        await Promise.all([refreshSchools(), refreshStats()]);
      }
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
    }
  };

  const handleDeactivateSchool = async (school) => {
    try {
      const response = await fetch(`/api/schools/${school._id}/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Désactivation temporaire' })
      });

      if (response.ok) {
        await Promise.all([refreshSchools(), refreshStats()]);
      }
    } catch (error) {
      console.error('Erreur lors de la désactivation:', error);
    }
  };

  const handleReactivateSchool = async (school) => {
    try {
      const response = await fetch(`/api/schools/${school._id}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await Promise.all([refreshSchools(), refreshStats()]);
      }
    } catch (error) {
      console.error('Erreur lors de la réactivation:', error);
    }
  };

  const handleViewDetails = (school) => {
    // TODO: Implémenter la vue détaillée
    console.log('Voir détails de:', school.name);
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
        console.log('Campaign approved successfully');
        await Promise.all([refreshSchools(), refreshStats()]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'approbation de la campagne:', error);
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
        console.log('Campaign rejected successfully');
        await Promise.all([refreshSchools(), refreshStats()]);
      }
    } catch (error) {
      console.error('Erreur lors du rejet de la campagne:', error);
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
        console.log('Campaign unapproved successfully');
        await Promise.all([refreshSchools(), refreshStats()]);
      }
    } catch (error) {
      console.error('Erreur lors de la désapprobation de la campagne:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Fournisseur</h1>
            <p className="text-gray-600">Gestion des écoles et campagnes Massibec</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={refreshSchools}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Statistiques principales */}
        <SupplierStats
          stats={stats}
          loading={statsLoading}
          periode={periode}
          onPeriodeChange={setPeriode}
          onRefresh={refreshStats}
        />

        {/* Vue d'ensemble des écoles */}
        <div id="schools-table">
          <SchoolsTable
            schools={schools}
            loading={schoolsLoading}
            onRefresh={refreshSchools}
            onApprove={handleApproveSchool}
            onReject={handleRejectSchool}
            onDeactivate={handleDeactivateSchool}
            onReactivate={handleReactivateSchool}
            onViewDetails={handleViewDetails}
            onApproveCampaign={handleApproveCampaign}
            onRejectCampaign={handleRejectCampaign}
            onUnapproveCampaign={handleUnapproveCampaign}
          />
        </div>

        {/* Résumé rapide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Total Écoles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{schools.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                {schools.filter(s => s.status === 'approved').length} approuvées
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Campagnes Actives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {schools.filter(s => s.activeCampaign && s.activeCampaign.status === 'active').length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                En cours d'exécution
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardMassibec;