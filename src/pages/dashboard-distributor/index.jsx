import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Truck,
    TrendingUp,
    DollarSign,
    Gavel,
    Clock,
    MapPin,
    ArrowRight,
    RefreshCw,
    BarChart3,
    Package
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import Link from 'next/link';

const DashboardDistributor = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [stats, setStats] = useState({
        activeBids: 0,
        wonBids: 0,
        totalRevenue: 0,
        pendingShipments: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentShipments, setRecentShipments] = useState([]);

    // Redirect if not authenticated or not a distributor
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

    // Fetch dashboard data
    useEffect(() => {
        if (session?.user?.role === 'distributor') {
            fetchDashboardData();
        }
    }, [session]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, shipmentsRes] = await Promise.all([
                fetch('/api/distributor/stats'),
                fetch('/api/distributor/shipments?limit=5')
            ]);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            if (shipmentsRes.ok) {
                const shipmentsData = await shipmentsRes.json();
                setRecentShipments(shipmentsData.shipments || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        await fetchDashboardData();
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

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
                            Tableau de bord Distributeur
                        </h1>
                        <p className="text-gray-600">
                            Gérez vos enchères et livraisons
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

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card className="border-2 border-orange-200 hover:border-orange-400 transition-all">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Enchères actives</p>
                                        <p className="text-3xl font-bold text-gray-900">{stats.activeBids}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <Gavel className="w-6 h-6 text-orange-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        <Card className="border-2 border-green-200 hover:border-green-400 transition-all">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Enchères gagnées</p>
                                        <p className="text-3xl font-bold text-gray-900">{stats.wonBids}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                    >
                        <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Revenus totaux</p>
                                        <p className="text-3xl font-bold text-gray-900">
                                            ${stats.totalRevenue.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <DollarSign className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                    >
                        <Card className="border-2 border-purple-200 hover:border-purple-400 transition-all">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Livraisons en attente</p>
                                        <p className="text-3xl font-bold text-gray-900">{stats.pendingShipments}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <Package className="w-6 h-6 text-purple-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-2 border-orange-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gavel className="w-5 h-5 text-orange-600" />
                                Livraisons disponibles
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 mb-4">
                                Consultez les livraisons disponibles et enchérissez sur celles qui vous intéressent.
                            </p>
                            <Link href="/dashboard-distributor/shipments">
                                <Button className="w-full bg-orange-600 hover:bg-orange-700">
                                    Voir les livraisons
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                Mes enchères
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 mb-4">
                                Suivez l'état de toutes vos enchères et livraisons en cours.
                            </p>
                            <Link href="/dashboard-distributor/bids">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                    Voir mes enchères
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Shipments */}
                {recentShipments.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Livraisons récentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentShipments.map((shipment) => (
                                    <div
                                        key={shipment._id}
                                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold text-gray-900">
                                                    {shipment.supplier?.name || 'Fournisseur'} → {shipment.school?.name || 'École'}
                                                </h3>
                                                <Badge
                                                    variant={
                                                        shipment.status === 'bidding' ? 'default' :
                                                            shipment.status === 'awarded' ? 'default' :
                                                                shipment.status === 'delivered' ? 'default' : 'secondary'
                                                    }
                                                >
                                                    {shipment.status === 'bidding' ? 'Enchères ouvertes' :
                                                        shipment.status === 'awarded' ? 'Attribuée' :
                                                            shipment.status === 'delivered' ? 'Livrée' : shipment.status}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{shipment.pickupCity || 'N/A'} → {shipment.deliveryCity || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    <span>
                                                        {new Date(shipment.requestedDeliveryDate).toLocaleDateString('fr-CA')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Link href={`/dashboard-distributor/shipments/${shipment._id}`}>
                                            <Button variant="outline" size="sm">
                                                Voir détails
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4">
                                <Link href="/dashboard-distributor/shipments">
                                    <Button variant="outline" className="w-full">
                                        Voir toutes les livraisons
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
};

export default DashboardDistributor;

