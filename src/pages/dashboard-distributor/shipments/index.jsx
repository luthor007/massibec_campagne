import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Truck,
    MapPin,
    Clock,
    DollarSign,
    Package,
    Gavel,
    RefreshCw,
    Save,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { toast } from 'react-toastify';

const ShipmentsPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, available, my_bids
    const [expandedCampaigns, setExpandedCampaigns] = useState({});
    const [bidForms, setBidForms] = useState({});
    const [submitting, setSubmitting] = useState({});

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/connexion');
            return;
        }
        if (session.user.role !== 'distributor') {
            router.push('/dashboard');
            return;
        }
    }, [session, status, router]);

    useEffect(() => {
        if (session?.user?.role === 'distributor') {
            fetchCampaigns();
        }
    }, [session, filter]);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/distributor/campaigns');

            if (response.ok) {
                const data = await response.json();
                let filteredCampaigns = data.campaigns || [];

                // Filter for "my_bids" if needed
                if (filter === 'my_bids') {
                    filteredCampaigns = filteredCampaigns.filter(c => c.hasBid);
                } else if (filter === 'available') {
                    filteredCampaigns = filteredCampaigns.filter(c => c.status === 'bidding' && !c.hasBid);
                }

                setCampaigns(filteredCampaigns);

                // Initialize bid forms with existing bids
                const forms = {};
                filteredCampaigns.forEach(campaign => {
                    if (campaign.currentBid && campaign.currentBid.palletPrices) {
                        // Convert Map to object if needed
                        const prices = {};
                        if (campaign.currentBid.palletPrices instanceof Map) {
                            campaign.currentBid.palletPrices.forEach((value, key) => {
                                prices[key] = value;
                            });
                        } else {
                            Object.assign(prices, campaign.currentBid.palletPrices);
                        }
                        forms[campaign._id] = {
                            palletPrices: prices,
                            estimatedDeliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString().split('T')[0] : '',
                            notes: ''
                        };
                    } else {
                        forms[campaign._id] = {
                            palletPrices: {},
                            estimatedDeliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString().split('T')[0] : '',
                            notes: ''
                        };
                    }
                });
                setBidForms(forms);
            } else {
                toast.error('Erreur lors du chargement des campagnes');
            }
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            toast.error('Erreur lors du chargement des campagnes');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchCampaigns();
        toast.success('Données actualisées');
    };

    const toggleExpanded = (campaignId) => {
        setExpandedCampaigns(prev => ({
            ...prev,
            [campaignId]: !prev[campaignId]
        }));
    };

    const updatePalletPrice = (campaignId, palletCount, value) => {
        setBidForms(prev => ({
            ...prev,
            [campaignId]: {
                ...prev[campaignId],
                palletPrices: {
                    ...prev[campaignId].palletPrices,
                    [palletCount]: value ? parseFloat(value) : ''
                }
            }
        }));
    };

    const handleSubmitBid = async (campaign) => {
        const formData = bidForms[campaign._id];
        if (!formData) return;

        // Validate that at least one price is provided
        const hasPrice = Object.values(formData.palletPrices).some(price => price && price > 0);
        if (!hasPrice) {
            toast.error('Veuillez entrer au moins un prix pour une palette');
            return;
        }

        if (!formData.estimatedDeliveryDate) {
            toast.error('Veuillez sélectionner une date de livraison estimée');
            return;
        }

        setSubmitting(prev => ({ ...prev, [campaign._id]: true }));

        try {
            // First, ensure shipment exists
            let shipmentId = campaign.shipmentId;
            if (!shipmentId) {
                // Create shipment if it doesn't exist
                const shipmentResponse = await fetch('/api/distributor/shipments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        campaignId: campaign._id,
                        supplierId: campaign.supplier._id,
                        schoolId: campaign.school._id,
                        pickupAddress: campaign.supplier.address,
                        pickupCity: campaign.supplier.ville,
                        pickupPostalCode: campaign.supplier.codePostal,
                        deliveryAddress: campaign.school.address,
                        deliveryCity: campaign.school.ville,
                        deliveryPostalCode: campaign.school.codePostal,
                        requestedDeliveryDate: campaign.deliveryDate || campaign.endDate,
                        biddingEndDate: campaign.deliveryDate || campaign.endDate
                    })
                });

                if (!shipmentResponse.ok) {
                    throw new Error('Erreur lors de la création de la livraison');
                }

                const shipmentData = await shipmentResponse.json();
                shipmentId = shipmentData.shipment._id;
            }

            // Submit bid
            const response = await fetch('/api/distributor/bids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shipmentId,
                    palletPrices: formData.palletPrices,
                    estimatedDeliveryDate: formData.estimatedDeliveryDate,
                    notes: formData.notes || ''
                })
            });

            if (response.ok) {
                toast.success('Enchère soumise avec succès');
                fetchCampaigns(); // Refresh to show updated bid status
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Erreur lors de la soumission de l\'enchère');
            }
        } catch (error) {
            console.error('Error submitting bid:', error);
            toast.error('Erreur lors de la soumission de l\'enchère');
        } finally {
            setSubmitting(prev => ({ ...prev, [campaign._id]: false }));
        }
    };

    if (status === 'loading' || loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Chargement...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!session || session.user.role !== 'distributor') {
        return null;
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
                            Livraisons disponibles
                        </h1>
                        <p className="text-gray-600">
                            Consultez les livraisons et enchérissez sur celles qui vous intéressent
                        </p>
                    </div>
                    <Button
                        onClick={handleRefresh}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualiser
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilter('all')}
                        className={filter === 'all' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                        Toutes
                    </Button>
                    <Button
                        variant={filter === 'available' ? 'default' : 'outline'}
                        onClick={() => setFilter('available')}
                        className={filter === 'available' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                        Disponibles
                    </Button>
                    <Button
                        variant={filter === 'my_bids' ? 'default' : 'outline'}
                        onClick={() => setFilter('my_bids')}
                        className={filter === 'my_bids' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                        Mes enchères
                    </Button>
                </div>

                {/* Campaigns List */}
                {campaigns.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Aucune livraison disponible
                            </h3>
                            <p className="text-gray-600">
                                {filter === 'my_bids'
                                    ? "Vous n'avez pas encore soumis d'enchères."
                                    : "Il n'y a actuellement aucune campagne active pour les enchères."}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {campaigns.map((campaign) => {
                            const isExpanded = expandedCampaigns[campaign._id];
                            const formData = bidForms[campaign._id] || {
                                palletPrices: {},
                                estimatedDeliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString().split('T')[0] : '',
                                notes: ''
                            };

                            return (
                                <Card
                                    key={campaign._id}
                                    className={`border-2 transition-all hover:shadow-lg ${campaign.hasBid
                                        ? 'border-green-200 bg-green-50/50'
                                        : 'border-orange-200'
                                        }`}
                                >
                                    <CardContent className="p-6">
                                        <div className="space-y-4">
                                            {/* Campaign Header */}
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                        {campaign.supplier.name} → {campaign.school.name}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mb-3">
                                                        Campagne: {campaign.name}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <Badge
                                                        variant="default"
                                                        className={campaign.status === 'bidding' ? 'bg-orange-600' : 'bg-gray-600'}
                                                    >
                                                        {campaign.status === 'bidding' ? 'Enchères ouvertes' : campaign.status}
                                                    </Badge>
                                                    {campaign.hasBid && (
                                                        <Badge variant="outline" className="border-green-600 text-green-700">
                                                            Vous avez enchéri
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Addresses */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">Point de départ (Fournisseur)</p>
                                                        <p className="text-sm text-gray-600">
                                                            {campaign.supplier.address}
                                                            {campaign.supplier.ville && `, ${campaign.supplier.ville}`}
                                                            {campaign.supplier.codePostal && ` ${campaign.supplier.codePostal}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">Destination (École)</p>
                                                        <p className="text-sm text-gray-600">
                                                            {campaign.school.address}
                                                            {campaign.school.ville && `, ${campaign.school.ville}`}
                                                            {campaign.school.codePostal && ` ${campaign.school.codePostal}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Delivery Date */}
                                            {campaign.deliveryDate && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="w-4 h-4 text-gray-500" />
                                                    <span className="text-gray-600">
                                                        Livraison demandée: {new Date(campaign.deliveryDate).toLocaleDateString('fr-CA')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Bid Count */}
                                            {campaign.bidCount !== undefined && campaign.bidCount > 0 && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <DollarSign className="w-4 h-4 text-gray-500" />
                                                    <span className="text-gray-600">
                                                        {campaign.bidCount} enchère(s) soumise(s)
                                                    </span>
                                                </div>
                                            )}

                                            {/* Current Bid Display */}
                                            {campaign.currentBid && campaign.currentBid.palletPrices && (
                                                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                                                    <p className="text-sm font-semibold text-green-900 mb-2">
                                                        Votre enchère actuelle:
                                                    </p>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                        {Object.entries(campaign.currentBid.palletPrices instanceof Map
                                                            ? Object.fromEntries(campaign.currentBid.palletPrices)
                                                            : campaign.currentBid.palletPrices
                                                        ).map(([pallets, price]) => (
                                                            <div key={pallets} className="text-green-700">
                                                                {pallets} palette(s): ${parseFloat(price).toFixed(2)} CAD
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bid Form Toggle */}
                                            <Button
                                                variant="outline"
                                                onClick={() => toggleExpanded(campaign._id)}
                                                className="w-full"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp className="w-4 h-4 mr-2" />
                                                        Masquer le formulaire d'enchères
                                                    </>
                                                ) : (
                                                    <>
                                                        <Gavel className="w-4 h-4 mr-2" />
                                                        {campaign.hasBid ? 'Modifier mon enchère' : 'Soumettre une enchère'}
                                                    </>
                                                )}
                                            </Button>

                                            {/* Bid Form */}
                                            {isExpanded && (
                                                <div className="border-t pt-4 space-y-4">
                                                    <div>
                                                        <Label className="text-sm font-semibold mb-2 block">
                                                            Prix par nombre de palettes (CAD)
                                                        </Label>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(palletCount => (
                                                                <div key={palletCount}>
                                                                    <Label htmlFor={`pallet-${campaign._id}-${palletCount}`} className="text-xs">
                                                                        {palletCount} palette{palletCount > 1 ? 's' : ''}
                                                                    </Label>
                                                                    <Input
                                                                        id={`pallet-${campaign._id}-${palletCount}`}
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        value={formData.palletPrices[palletCount] || ''}
                                                                        onChange={(e) => updatePalletPrice(campaign._id, palletCount, e.target.value)}
                                                                        placeholder="0.00"
                                                                        className="mt-1"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label htmlFor={`delivery-date-${campaign._id}`}>
                                                            Date de livraison estimée <span className="text-red-500">*</span>
                                                        </Label>
                                                        <Input
                                                            id={`delivery-date-${campaign._id}`}
                                                            type="date"
                                                            value={formData.estimatedDeliveryDate}
                                                            onChange={(e) => setBidForms(prev => ({
                                                                ...prev,
                                                                [campaign._id]: {
                                                                    ...prev[campaign._id],
                                                                    estimatedDeliveryDate: e.target.value
                                                                }
                                                            }))}
                                                            className="mt-1"
                                                            min={campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString().split('T')[0] : undefined}
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label htmlFor={`notes-${campaign._id}`}>Notes (optionnel)</Label>
                                                        <textarea
                                                            id={`notes-${campaign._id}`}
                                                            value={formData.notes || ''}
                                                            onChange={(e) => setBidForms(prev => ({
                                                                ...prev,
                                                                [campaign._id]: {
                                                                    ...prev[campaign._id],
                                                                    notes: e.target.value
                                                                }
                                                            }))}
                                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                            rows={3}
                                                            placeholder="Ajoutez des notes ou instructions..."
                                                        />
                                                    </div>

                                                    <Button
                                                        onClick={() => handleSubmitBid(campaign)}
                                                        disabled={submitting[campaign._id]}
                                                        className="w-full bg-orange-600 hover:bg-orange-700"
                                                    >
                                                        {submitting[campaign._id] ? (
                                                            'Envoi en cours...'
                                                        ) : (
                                                            <>
                                                                <Save className="w-4 h-4 mr-2" />
                                                                {campaign.hasBid ? 'Mettre à jour l\'enchère' : 'Soumettre l\'enchère'}
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ShipmentsPage;
