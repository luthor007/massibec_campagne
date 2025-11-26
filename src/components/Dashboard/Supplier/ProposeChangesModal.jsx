import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

const ProposeChangesModal = ({ campaign, isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        deliveryDate: '',
        distributionStartHour: '',
        distributionEndHour: '',
        truckArrivalHour: '',
        notes: ''
    });

    useEffect(() => {
        if (campaign && isOpen) {
            // Initialize form with current campaign dates
            const formatDateForInput = (date) => {
                if (!date) return '';
                try {
                    const d = new Date(date);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                } catch {
                    return '';
                }
            };

            setFormData({
                startDate: formatDateForInput(campaign.debutCampagne || campaign.startDate),
                endDate: formatDateForInput(campaign.finCampagne || campaign.endDate),
                deliveryDate: formatDateForInput(campaign.dateDeLivraison || campaign.deliveryDate),
                distributionStartHour: campaign.distributionStartHour || '',
                distributionEndHour: campaign.distributionEndHour || '',
                truckArrivalHour: campaign.truckArrivalHour || '',
                notes: ''
            });
        }
    }, [campaign, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`/api/campaigns/${campaign._id}/supplier-propose-changes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success('Proposition de changements envoyée avec succès');
                onSuccess && onSuccess();
                onClose();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors de l\'envoi de la proposition');
            }
        } catch (error) {
            console.error('Error proposing changes:', error);
            toast.error('Erreur lors de l\'envoi de la proposition');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Proposer des changements</DialogTitle>
                    <DialogDescription>
                        Proposez des modifications aux dates et détails de la campagne. L'école devra approuver vos changements.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="startDate">
                                <Calendar className="w-4 h-4 inline mr-2" />
                                Date de début
                            </Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="endDate">
                                <Calendar className="w-4 h-4 inline mr-2" />
                                Date de fin
                            </Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="deliveryDate">
                                <Calendar className="w-4 h-4 inline mr-2" />
                                Date de livraison
                            </Label>
                            <Input
                                id="deliveryDate"
                                type="date"
                                value={formData.deliveryDate}
                                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Distribution Hours */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="distributionStartHour">
                                <Clock className="w-4 h-4 inline mr-2" />
                                Heure de début de distribution
                            </Label>
                            <Input
                                id="distributionStartHour"
                                type="text"
                                placeholder="10h00"
                                value={formData.distributionStartHour}
                                onChange={(e) => setFormData({ ...formData, distributionStartHour: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: HHhMM (ex: 10h00)</p>
                        </div>
                        <div>
                            <Label htmlFor="distributionEndHour">
                                <Clock className="w-4 h-4 inline mr-2" />
                                Heure de fin de distribution
                            </Label>
                            <Input
                                id="distributionEndHour"
                                type="text"
                                placeholder="15h00"
                                value={formData.distributionEndHour}
                                onChange={(e) => setFormData({ ...formData, distributionEndHour: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: HHhMM (ex: 15h00)</p>
                        </div>
                        <div>
                            <Label htmlFor="truckArrivalHour">
                                <Clock className="w-4 h-4 inline mr-2" />
                                Heure d'arrivée du camion
                            </Label>
                            <Input
                                id="truckArrivalHour"
                                type="text"
                                placeholder="08h00"
                                value={formData.truckArrivalHour}
                                onChange={(e) => setFormData({ ...formData, truckArrivalHour: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: HHhMM (ex: 08h00)</p>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <Label htmlFor="notes">Notes (optionnel)</Label>
                        <Textarea
                            id="notes"
                            rows={4}
                            placeholder="Expliquez les raisons de ces changements..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Envoi...
                                </>
                            ) : (
                                'Envoyer la proposition'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ProposeChangesModal;

