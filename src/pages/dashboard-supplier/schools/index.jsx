import React, { useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import SchoolsTable from '../../../components/Dashboard/Supplier/SchoolsTable';
import CreateSchoolModal from '../../../components/Dashboard/SchoolManagement/CreateSchoolModal';
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
    Calendar,
    Plus
} from 'lucide-react';
import { toast } from 'react-toastify';

const SchoolsPage = () => {
    const router = useRouter();
    const [filterStatus, setFilterStatus] = useState('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { schools, loading: schoolsLoading, refreshSchools } = useSupplierSchools();

    // School approval/rejection removed - all schools are now auto-approved

    const handleDeactivateSchool = async (school) => {
        try {
            const response = await fetch(`/api/schools/${school._id}/deactivate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Désactivation temporaire' })
            });

            if (response.ok) {
                toast.success(`École "${school.name}" désactivée`);
                await refreshSchools();
            }
        } catch (error) {
            console.error('Erreur lors de la désactivation:', error);
            toast.error('Erreur lors de la désactivation');
        }
    };

    const handleReactivateSchool = async (school) => {
        try {
            const response = await fetch(`/api/schools/${school._id}/reactivate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                toast.success(`École "${school.name}" réactivée`);
                await refreshSchools();
            }
        } catch (error) {
            console.error('Erreur lors de la réactivation:', error);
            toast.error('Erreur lors de la réactivation');
        }
    };

    const handleViewDetails = (school) => {
        router.push(`/dashboard-supplier/schools/${school._id}`);
    };

    const handleApproveCampaign = async (campaignId) => {
        try {
            const response = await fetch(`/api/campaigns/${campaignId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                toast.success('Campagne passée en mode production');
                await refreshSchools();
            }
        } catch (error) {
            console.error('Erreur lors de l\'approbation de la campagne:', error);
            toast.error('Erreur lors de l\'approbation');
        }
    };

    const handleRejectCampaign = async (campaignId, reason = 'Rejetée par le fournisseur') => {
        try {
            const response = await fetch(`/api/campaigns/${campaignId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                toast.success('Campagne rejetée');
                await refreshSchools();
            }
        } catch (error) {
            console.error('Erreur lors du rejet de la campagne:', error);
            toast.error('Erreur lors du rejet');
        }
    };

    const handleUnapproveCampaign = async (campaignId) => {
        try {
            const response = await fetch(`/api/supplier/campaigns/${campaignId}/unapprove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                toast.success('Campagne repassée en mode test');
                await refreshSchools();
            }
        } catch (error) {
            console.error('Erreur lors de la désapprobation:', error);
            toast.error('Erreur lors de la désapprobation');
        }
    };

    const filteredSchools = Array.isArray(schools) ? schools.filter(school => {
        if (filterStatus === 'all') return true;
        return school.status === filterStatus;
    }) : [];

    return (
        <DashboardLayout>
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
                                <SelectItem value="approved">Actives</SelectItem>
                                <SelectItem value="rejected">Rejetées</SelectItem>
                                <SelectItem value="deactivated">Désactivées</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button variant="outline" onClick={refreshSchools}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualiser
                        </Button>

                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Créer une école
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
                            <CardTitle className="text-sm font-medium">Actives</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {schools.filter(s => s.status === 'approved').length}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pending schools card removed - all schools are now auto-approved */}

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
                    onDeactivate={handleDeactivateSchool}
                    onReactivate={handleReactivateSchool}
                    onViewDetails={handleViewDetails}
                    onApproveCampaign={handleApproveCampaign}
                    onRejectCampaign={handleRejectCampaign}
                    onUnapproveCampaign={handleUnapproveCampaign}
                />

                {/* Create School Modal */}
                <CreateSchoolModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSchoolCreated={async (school) => {
                        await refreshSchools();
                        toast.success(`École "${school.name}" créée avec succès !`);
                    }}
                />
            </div>
        </DashboardLayout>
    );
};

export default SchoolsPage;

