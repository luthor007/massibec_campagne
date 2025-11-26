import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Gavel,
    MapPin,
    Clock,
    DollarSign,
    Package,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';

const BidsPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, accepted, rejected, withdrawn

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
            fetchBids();
        }
    }, [session, filter]);

    const fetchBids = async () => {
        try {
            setLoading(true);
            const statusParam = filter === 'all' ? '' : filter;
            const response = await fetch(`/api/distributor/bids?status=${statusParam}`);

            if (response.ok) {
                const data = await response.json();
                setBids(data.bids || []);
            } else {
                toast.error('Erreur lors du chargement des enchères');
            }
        } catch (error) {
            console.error('Error fetching bids:', error);
            toast.error('Erreur lors du chargement des enchères');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawBid = async (bidId) => {
        if (!confirm('Êtes-vous sûr de vouloir retirer cette enchère ?')) {
            return;
        }

        try {
            const response = await fetch(`/api/distributor/bids/${bidId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Enchère retirée avec succès');
                fetchBids();
            } else {
                const data = await response.json();
                toast.error(data.message || 'Erreur lors du retrait de l\'enchère');
            }
        } catch (error) {
            console.error('Error withdrawing bid:', error);
            toast.error('Erreur lors du retrait de l\'enchère');
        }
    };

    const handleRefresh = () => {
        fetchBids();
        toast.success('Données actualisées');
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

    const getStatusBadge = (bid) => {
        if (bid.isSelected) {
            return <Badge className="bg-green-600">Gagnante</Badge>;
        }
        switch (bid.status) {
            case 'pending':
                return <Badge className="bg-orange-600">En attente</Badge>;
            case 'accepted':
                return <Badge className="bg-green-600">Acceptée</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rejetée</Badge>;
            case 'withdrawn':
                return <Badge variant="secondary">Retirée</Badge>;
            default:
                return <Badge variant="secondary">{bid.status}</Badge>;
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
                            Mes enchères
                        </h1>
                        <p className="text-gray-600">
                            Suivez l'état de toutes vos enchères
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
                        variant={filter === 'pending' ? 'default' : 'outline'}
                        onClick={() => setFilter('pending')}
                        className={filter === 'pending' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                        En attente
                    </Button>
                    <Button
                        variant={filter === 'accepted' ? 'default' : 'outline'}
                        onClick={() => setFilter('accepted')}
                        className={filter === 'accepted' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                        Acceptées
                    </Button>
                    <Button
                        variant={filter === 'rejected' ? 'default' : 'outline'}
                        onClick={() => setFilter('rejected')}
                        className={filter === 'rejected' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                        Rejetées
                    </Button>
                </div>

                {/* Bids List */}
                {bids.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Gavel className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Aucune enchère
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Vous n'avez pas encore soumis d'enchères.
                            </p>
                            <Button
                                onClick={() => router.push('/dashboard-distributor/shipments')}
                                className="bg-orange-600 hover:bg-orange-700"
                            >
                                Voir les livraisons disponibles
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {bids.map((bid) => {
                            const shipment = bid.shipmentId;
                            return (
                                <Card
                                    key={bid._id}
                                    className={`border-2 transition-all hover:shadow-lg ${bid.isSelected
                                        ? 'border-green-300 bg-green-50/50'
                                        : bid.status === 'pending'
                                            ? 'border-orange-200'
                                            : 'border-gray-200'
                                        }`}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                            {shipment?.supplierId?.name || 'Fournisseur'} → {shipment?.schoolId?.name || 'École'}
                                                        </h3>
                                                        <p className="text-sm text-gray-600">
                                                            Campagne: {shipment?.campaignId?.name || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {getStatusBadge(bid)}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="flex items-start gap-2">
                                                        <DollarSign className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">Montant de l'enchère</p>
                                                            <p className="text-lg font-bold text-gray-900">
                                                                ${bid.amount.toFixed(2)} CAD
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">Date de livraison estimée</p>
                                                            <p className="text-sm text-gray-600">
                                                                {new Date(bid.estimatedDeliveryDate).toLocaleDateString('fr-CA')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-2">
                                                    <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-semibold">Départ:</span> {shipment?.pickupAddress || 'N/A'}
                                                            {shipment?.pickupCity && `, ${shipment.pickupCity}`}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-semibold">Destination:</span> {shipment?.deliveryAddress || 'N/A'}
                                                            {shipment?.deliveryCity && `, ${shipment.deliveryCity}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                {bid.notes && (
                                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                                        <p className="text-sm font-semibold text-gray-900 mb-1">Notes:</p>
                                                        <p className="text-sm text-gray-600">{bid.notes}</p>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                    <span>
                                                        Soumise le {new Date(bid.createdAt).toLocaleDateString('fr-CA', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 lg:min-w-[200px]">
                                                {bid.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            onClick={() => router.push(`/dashboard-distributor/shipments/${shipment?._id}`)}
                                                            className="w-full bg-orange-600 hover:bg-orange-700"
                                                        >
                                                            Modifier
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleWithdrawBid(bid._id)}
                                                            variant="outline"
                                                            className="w-full border-red-300 text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Retirer
                                                        </Button>
                                                    </>
                                                )}
                                                {bid.isSelected && (
                                                    <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-center">
                                                        <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                                        <p className="text-sm font-semibold text-green-900">
                                                            Enchère gagnante!
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
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

export default BidsPage;

