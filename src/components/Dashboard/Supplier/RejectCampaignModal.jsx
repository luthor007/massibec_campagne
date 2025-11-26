import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

const RejectCampaignModal = ({ campaign, isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!rejectionReason.trim()) {
            toast.error('Veuillez fournir une raison pour le refus');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`/api/campaigns/${campaign._id}/supplier-reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejectionReason })
            });

            if (response.ok) {
                toast.success('Campagne refusée avec succès');
                onSuccess && onSuccess();
                onClose();
                setRejectionReason('');
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors du refus de la campagne');
            }
        } catch (error) {
            console.error('Error rejecting campaign:', error);
            toast.error('Erreur lors du refus de la campagne');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" />
                        Refuser la campagne
                    </DialogTitle>
                    <DialogDescription>
                        Êtes-vous sûr de vouloir refuser cette campagne ? Cette action est irréversible.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800 font-medium mb-2">
                            Campagne : {campaign?.nomCampagne || campaign?.name || `Campagne #${campaign?.campaignNumber}`}
                        </p>
                        <p className="text-sm text-red-700">
                            École : {campaign?.school?.nomEcole || campaign?.school?.name || 'N/A'}
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="rejectionReason">
                            Raison du refus <span className="text-red-600">*</span>
                        </Label>
                        <Textarea
                            id="rejectionReason"
                            rows={4}
                            placeholder="Expliquez pourquoi vous refusez cette campagne..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            required
                            className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Cette raison sera visible par l'école.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Annuler
                        </Button>
                        <Button type="submit" variant="destructive" disabled={loading || !rejectionReason.trim()}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Traitement...
                                </>
                            ) : (
                                'Confirmer le refus'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default RejectCampaignModal;

