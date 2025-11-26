import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Calendar,
    DollarSign,
    Users,
    Target,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    MapPin,
    Phone,
    Mail,
    Edit,
    X,
    MessageSquare,
    Ban
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CampaignDetailsModal = ({ campaign, isOpen, onClose, onProposeChanges, onReject }) => {
    if (!campaign) return null;

    const formatDate = (date) => {
        if (!date) return 'N/A';
        try {
            return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
        } catch {
            return 'N/A';
        }
    };

    const formatDateTime = (date) => {
        if (!date) return 'N/A';
        try {
            return format(new Date(date), 'dd MMMM yyyy à HH:mm', { locale: fr });
        } catch {
            return 'N/A';
        }
    };

    const progress = campaign.objectifFinancier ? Math.min(((campaign.totalSales || 0) / campaign.objectifFinancier) * 100, 100) : 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {campaign.nomCampagne || campaign.name || `Campagne #${campaign.campaignNumber}`}
                    </DialogTitle>
                    <DialogDescription>
                        Détails complets de la campagne
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Status and Mode */}
                    <div className="flex items-center gap-3">
                        <Badge className={campaign.status === 'approved' ? 'bg-green-100 text-green-800' : campaign.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                            {campaign.status === 'approved' ? 'Approuvée' : campaign.status === 'rejected' ? 'Rejetée' : 'En attente'}
                        </Badge>
                        <Badge className={campaign.mode === 'production' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                            {campaign.mode === 'production' ? 'Production' : 'Test'}
                        </Badge>
                        {campaign.supplierProposals?.status === 'pending' && (
                            <Badge className="bg-purple-100 text-purple-800">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Proposition en attente
                            </Badge>
                        )}
                    </div>

                    {/* School Information */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Informations de l'école
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <p className="text-sm text-gray-600">Nom de l'école</p>
                                <p className="font-medium">{campaign.school?.nomEcole || campaign.school?.name || 'N/A'}</p>
                            </div>
                            {campaign.school?.address && (
                                <div>
                                    <p className="text-sm text-gray-600">Adresse</p>
                                    <p className="font-medium flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {campaign.school.address}
                                    </p>
                                </div>
                            )}
                            {campaign.school?.email && (
                                <div>
                                    <p className="text-sm text-gray-600">Email</p>
                                    <p className="font-medium flex items-center gap-1">
                                        <Mail className="w-4 h-4" />
                                        {campaign.school.email}
                                    </p>
                                </div>
                            )}
                            {campaign.school?.telephone && (
                                <div>
                                    <p className="text-sm text-gray-600">Téléphone</p>
                                    <p className="font-medium flex items-center gap-1">
                                        <Phone className="w-4 h-4" />
                                        {campaign.school.telephone}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <h4 className="font-semibold">Date de début</h4>
                            </div>
                            <p className="text-lg font-medium">{formatDate(campaign.debutCampagne || campaign.startDate)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-5 h-5 text-red-600" />
                                <h4 className="font-semibold">Date de fin</h4>
                            </div>
                            <p className="text-lg font-medium">{formatDate(campaign.finCampagne || campaign.endDate)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-green-600" />
                                <h4 className="font-semibold">Date de livraison</h4>
                            </div>
                            <p className="text-lg font-medium">{formatDate(campaign.dateDeLivraison || campaign.deliveryDate)}</p>
                        </div>
                    </div>

                    {/* Distribution Hours */}
                    {(campaign.distributionStartHour || campaign.distributionEndHour || campaign.truckArrivalHour) && (
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                            <h3 className="font-semibold text-purple-900 mb-3">Heures de distribution</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {campaign.distributionStartHour && (
                                    <div>
                                        <p className="text-sm text-gray-600">Début</p>
                                        <p className="font-medium">{campaign.distributionStartHour}</p>
                                    </div>
                                )}
                                {campaign.distributionEndHour && (
                                    <div>
                                        <p className="text-sm text-gray-600">Fin</p>
                                        <p className="font-medium">{campaign.distributionEndHour}</p>
                                    </div>
                                )}
                                {campaign.truckArrivalHour && (
                                    <div>
                                        <p className="text-sm text-gray-600">Arrivée du camion</p>
                                        <p className="font-medium">{campaign.truckArrivalHour}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Financial Information */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Informations financières
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Objectif financier</p>
                                <p className="text-2xl font-bold text-green-700">
                                    ${(campaign.objectifFinancier || campaign.financialGoal || 0).toLocaleString('fr-CA')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Ventes totales</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    ${(campaign.totalSales || 0).toLocaleString('fr-CA')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Progression</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full ${progress >= 100 ? 'bg-green-500' : progress >= 75 ? 'bg-blue-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>
                                    <span className="font-semibold">{progress.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Participants</p>
                                <p className="text-xl font-bold text-gray-700">
                                    {campaign.totalParticipants || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Pending Proposal Alert */}
                    {campaign.supplierProposals?.status === 'pending' && (
                        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-purple-600 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-purple-900 mb-2">Proposition de changements en attente</h4>
                                    <p className="text-sm text-purple-800 mb-3">
                                        Vous avez proposé des changements le {formatDateTime(campaign.supplierProposals.proposedAt)}.
                                        En attente de réponse de l'école.
                                    </p>
                                    {campaign.supplierProposals.notes && (
                                        <div className="bg-white rounded p-3 mt-2">
                                            <p className="text-sm font-medium text-gray-700 mb-1">Vos notes :</p>
                                            <p className="text-sm text-gray-600">{campaign.supplierProposals.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rejection Reason */}
                    {campaign.status === 'rejected' && campaign.rejectionReason && (
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-red-900 mb-2">Campagne rejetée</h4>
                                    <p className="text-sm text-red-800">
                                        {campaign.rejectionReason}
                                    </p>
                                    {campaign.rejectedAt && (
                                        <p className="text-xs text-red-600 mt-2">
                                            Rejetée le {formatDateTime(campaign.rejectedAt)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {campaign.notes && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{campaign.notes}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <Separator />
                    <div className="flex flex-wrap gap-3 justify-end">
                        {campaign.status !== 'rejected' && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        onClose();
                                        onProposeChanges(campaign);
                                    }}
                                    disabled={campaign.supplierProposals?.status === 'pending'}
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Proposer des changements
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        onClose();
                                        onReject(campaign);
                                    }}
                                >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Refuser la campagne
                                </Button>
                            </>
                        )}
                        <Button variant="outline" onClick={onClose}>
                            Fermer
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CampaignDetailsModal;

