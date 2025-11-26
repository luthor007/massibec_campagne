import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Truck,
    MapPin,
    Clock,
    DollarSign,
    Package,
    Gavel,
    ArrowLeft,
    Save,
    AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import Link from 'next/link';

const ShipmentDetailPage = () => {
    const router = useRouter();
    const { shipmentId } = router.query;
    const { data: session, status } = useSession();
    const [shipment, setShipment] = useState(null);
    const [currentBid, setCurrentBid] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        estimatedDeliveryDate: '',
        notes: ''
    });

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
        if (shipmentId && session?.user?.role === 'distributor') {
            fetchShipmentDetails();
        }
    }, [shipmentId, session]);

    const fetchShipmentDetails = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/distributor/shipments?limit=1`);

            if (response.ok) {
                const data = await response.json();
                const foundShipment = data.shipments?.find(s => s._id === shipmentId);

                if (foundShipment) {
                    setShipment(foundShipment);
                    if (foundShipment.currentBid) {
                        setCurrentBid(foundShipment.currentBid);
                        setFormData({
                            amount: foundShipment.currentBid.amount.toString(),
                            estimatedDeliveryDate: new Date(foundShipment.currentBid.estimatedDeliveryDate).toISOString().split('T')[0],
                            notes: foundShipment.currentBid.notes || ''
                        });
                    } else {
                        // Set default estimated delivery date to requested date
                        if (foundShipment.requestedDeliveryDate) {
                            setFormData({
                                amount: '',
                                estimatedDeliveryDate: new Date(foundShipment.requestedDeliveryDate).toISOString().split('T')[0],
                                notes: ''
                            });
                        }
                    }
                } else {
                    toast.error('Livraison non trouvée');
                    router.push('/dashboard-distributor/shipments');
                }
            }
        } catch (error) {
            console.error('Error fetching shipment:', error);
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.amount || !formData.estimatedDeliveryDate) {
            toast.error('Veuillez remplir tous les champs requis');
            return;
        }

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Le montant doit être un nombre positif');
            return;
        }

        setSubmitting(true);

        try {
            const url = currentBid
                ? `/api/distributor/bids/${currentBid._id}`
                : '/api/distributor/bids';

            const method = currentBid ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shipmentId,
                    amount: formData.amount,
                    estimatedDeliveryDate: formData.estimatedDeliveryDate,
                    notes: formData.notes
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(currentBid ? 'Enchère mise à jour avec succès' : 'Enchère soumise avec succès');
                fetchShipmentDetails();
            } else {
                toast.error(data.message || 'Erreur lors de la soumission');
            }
        } catch (error) {
            console.error('Error submitting bid:', error);
            toast.error('Erreur lors de la soumission');
        } finally {
            setSubmitting(false);
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

    if (!session || session.user.role !== 'distributor' || !shipment) {
        return null;
    }

    const isBiddingOpen = shipment.status === 'bidding' || shipment.status === 'pending';
    const biddingEnded = shipment.biddingEndDate && new Date() > new Date(shipment.biddingEndDate);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/dashboard-distributor/shipments">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                            Détails de la livraison
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {shipment.supplierId?.name || 'Fournisseur'} → {shipment.schoolId?.name || 'École'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Shipment Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Informations de livraison</CardTitle>
                                    <Badge
                                        variant={shipment.status === 'bidding' ? 'default' : 'secondary'}
                                        className={shipment.status === 'bidding' ? 'bg-orange-600' : ''}
                                    >
                                        {shipment.status === 'bidding' ? 'Enchères ouvertes' : shipment.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 mb-1">Point de départ</p>
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-gray-900 font-medium">
                                                    {shipment.supplierId?.name || 'Fournisseur'}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {shipment.pickupAddress}
                                                    {shipment.pickupCity && `, ${shipment.pickupCity}`}
                                                    {shipment.pickupPostalCode && ` ${shipment.pickupPostalCode}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 mb-1">Destination</p>
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-gray-900 font-medium">
                                                    {shipment.schoolId?.name || 'École'}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {shipment.deliveryAddress}
                                                    {shipment.deliveryCity && `, ${shipment.deliveryCity}`}
                                                    {shipment.deliveryPostalCode && ` ${shipment.deliveryPostalCode}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-gray-500" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Date de livraison demandée</p>
                                            <p className="text-sm text-gray-600">
                                                {new Date(shipment.requestedDeliveryDate).toLocaleDateString('fr-CA', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    {shipment.biddingEndDate && (
                                        <div className="flex items-center gap-2">
                                            <Gavel className="w-5 h-5 text-gray-500" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">Fin des enchères</p>
                                                <p className="text-sm text-gray-600">
                                                    {new Date(shipment.biddingEndDate).toLocaleDateString('fr-CA', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {shipment.pickupInstructions && (
                                    <div className="pt-4 border-t">
                                        <p className="text-sm font-semibold text-gray-900 mb-1">Instructions de ramassage</p>
                                        <p className="text-sm text-gray-600">{shipment.pickupInstructions}</p>
                                    </div>
                                )}

                                {shipment.deliveryInstructions && (
                                    <div className="pt-4 border-t">
                                        <p className="text-sm font-semibold text-gray-900 mb-1">Instructions de livraison</p>
                                        <p className="text-sm text-gray-600">{shipment.deliveryInstructions}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Products Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Produits à livrer
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {shipment.products?.map((product, index) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900">{product.productName}</p>
                                                <p className="text-sm text-gray-600">Quantité: {product.quantity}</p>
                                            </div>
                                            {product.weight > 0 && (
                                                <p className="text-sm text-gray-600">Poids: {product.weight} kg</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Bid Form */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-6">
                            <CardHeader>
                                <CardTitle>
                                    {currentBid ? 'Modifier votre enchère' : 'Soumettre une enchère'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!isBiddingOpen || biddingEnded ? (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-yellow-900">
                                                    {biddingEnded ? 'Les enchères sont terminées' : 'Les enchères ne sont pas ouvertes'}
                                                </p>
                                                <p className="text-xs text-yellow-700 mt-1">
                                                    {biddingEnded
                                                        ? 'La période d\'enchères pour cette livraison est terminée.'
                                                        : 'Cette livraison n\'accepte pas encore d\'enchères.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <Label htmlFor="amount">
                                                Montant (CAD) <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="amount"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                required
                                                className="mt-1"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="estimatedDeliveryDate">
                                                Date de livraison estimée <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="estimatedDeliveryDate"
                                                type="date"
                                                value={formData.estimatedDeliveryDate}
                                                onChange={(e) => setFormData({ ...formData, estimatedDeliveryDate: e.target.value })}
                                                required
                                                className="mt-1"
                                                min={new Date(shipment.requestedDeliveryDate).toISOString().split('T')[0]}
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="notes">Notes (optionnel)</Label>
                                            <textarea
                                                id="notes"
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                rows={3}
                                                placeholder="Ajoutez des notes ou instructions..."
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full bg-orange-600 hover:bg-orange-700"
                                        >
                                            {submitting ? (
                                                'Envoi en cours...'
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4 mr-2" />
                                                    {currentBid ? 'Mettre à jour' : 'Soumettre l\'enchère'}
                                                </>
                                            )}
                                        </Button>

                                        {shipment.bidCount !== undefined && shipment.bidCount > 0 && (
                                            <p className="text-xs text-gray-600 text-center">
                                                {shipment.bidCount} autre(s) distributeur(s) ont soumis une enchère
                                            </p>
                                        )}
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ShipmentDetailPage;

