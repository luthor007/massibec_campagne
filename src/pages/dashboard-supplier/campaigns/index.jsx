import React, { useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import SupplierCampaignManager from '../../../components/Dashboard/Supplier/SupplierCampaignManager';
import CampaignStudentsList from '../../../components/Dashboard/Supplier/CampaignStudentsList';
import { useSupplierCampaigns } from '../../../hooks/useSupplierCampaigns';
import { Button } from '@/components/ui/button';
import {
    Calendar,
    RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

const CampaignsPage = () => {
    const router = useRouter();
    const [selectedCampaignId, setSelectedCampaignId] = useState(null);

    const { campaigns, loading: loadingCampaigns, refreshCampaigns } = useSupplierCampaigns();

    const handleApproveCampaign = async (campaign) => {
        try {
            const response = await fetch(`/api/campaigns/${campaign._id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                toast.success('Campagne passée en mode production');
                await refreshCampaigns();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors de l\'approbation');
            }
        } catch (error) {
            console.error('Error approving campaign:', error);
            toast.error('Erreur lors de l\'approbation de la campagne');
        }
    };

    const handleRejectCampaign = async (campaign, rejectionReason) => {
        try {
            const response = await fetch(`/api/campaigns/${campaign._id}/supplier-reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejectionReason: rejectionReason || 'Refusé par le fournisseur' })
            });

            if (response.ok) {
                toast.success('Campagne rejetée avec succès');
                await refreshCampaigns();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors du rejet');
            }
        } catch (error) {
            console.error('Error rejecting campaign:', error);
            toast.error('Erreur lors du rejet de la campagne');
        }
    };

    const handleUnapproveCampaign = async (campaign) => {
        try {
            const response = await fetch(`/api/supplier/campaigns/${campaign._id}/unapprove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                toast.success('Campagne repassée en mode test');
                await refreshCampaigns();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors de la désapprobation');
            }
        } catch (error) {
            console.error('Error unapproving campaign:', error);
            toast.error('Erreur lors de la désapprobation de la campagne');
        }
    };

    const handleEditCampaign = (campaign) => {
        // TODO: Implement campaign editing
        console.log('Éditer campagne:', campaign.name || campaign.nomCampagne);
        toast.info('Fonctionnalité d\'édition à venir');
    };

    const handleLockCampaign = async (campaign) => {
        try {
            const response = await fetch(`/api/campaigns/${campaign._id}/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locked: true }),
            });

            if (response.ok) {
                toast.success('Campagne verrouillée');
                await refreshCampaigns();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors du verrouillage');
            }
        } catch (error) {
            console.error('Error locking campaign:', error);
            toast.error('Erreur lors du verrouillage de la campagne');
        }
    };

    const handleUnlockCampaign = async (campaign) => {
        try {
            const response = await fetch(`/api/campaigns/${campaign._id}/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locked: false }),
            });

            if (response.ok) {
                toast.success('Campagne déverrouillée');
                await refreshCampaigns();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors du déverrouillage');
            }
        } catch (error) {
            console.error('Error unlocking campaign:', error);
            toast.error('Erreur lors du déverrouillage de la campagne');
        }
    };

    const handleViewDetails = (campaign) => {
        setSelectedCampaignId(campaign._id?.toString() || campaign._id);
    };

    const handleRefresh = () => {
        refreshCampaigns();
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gestion des Campagnes</h1>
                        <p className="text-gray-600 mt-1">Gérez toutes les campagnes de vos écoles partenaires</p>
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
                    campaigns={campaigns}
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
                    const selectedCampaign = campaigns.find(c => {
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

