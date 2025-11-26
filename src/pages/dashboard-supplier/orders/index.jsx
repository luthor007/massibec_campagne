import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ShoppingCart,
    Search,
    RefreshCw,
    Eye,
    DollarSign,
    Calendar,
    Clock,
    CheckCircle,
    AlertTriangle,
    ArrowLeft,
    Package,
    TrendingUp,
    Truck
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG = {
    pending: { label: 'À traiter', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    partial: { label: 'Paiement partiel', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
    paid: { label: 'Complétée', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
};

const OrdersPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [orders, setOrders] = useState([]);
    const [campaignSummaries, setCampaignSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' or 'orders'

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/connexion');
            return;
        }
        if (session.user.role !== 'supplier') {
            router.push('/dashboard');
            return;
        }
        fetchOrders();
    }, [session, status, router]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/supplier/orders', {
                cache: 'no-store',
            });

            if (response.ok) {
                const data = await response.json();
                setOrders(Array.isArray(data.orders) ? data.orders : []);
                setCampaignSummaries(Array.isArray(data.campaignSummaries) ? data.campaignSummaries : []);
            } else {
                setOrders([]);
                setCampaignSummaries([]);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.orderNumber?.toString().includes(searchTerm) ||
            order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('fr-CA', {
            style: 'currency',
            currency: 'CAD'
        }).format(value || 0);
    };

    const getDaysRemainingColor = (days) => {
        if (days <= 0) return 'text-gray-500';
        if (days <= 7) return 'text-red-600 font-bold';
        if (days <= 14) return 'text-orange-600 font-semibold';
        return 'text-green-600';
    };

    const formatDateSafe = (dateValue) => {
        if (!dateValue) return 'N/A';
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return 'N/A';
            return format(date, 'dd MMM yyyy', { locale: fr });
        } catch (error) {
            console.error('Error formatting date:', error, dateValue);
            return 'N/A';
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/dashboard-supplier')}
                            className="mb-2"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour au tableau de bord
                        </Button>
                        <h1 className="text-3xl font-bold text-gray-900">Commandes</h1>
                        <p className="text-gray-600">Gérez toutes les commandes de vos campagnes</p>
                    </div>
                    <Button onClick={fetchOrders} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualiser
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b">
                    <Button
                        variant={activeTab === 'campaigns' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('campaigns')}
                        className="rounded-b-none"
                    >
                        <Package className="w-4 h-4 mr-2" />
                        Campagnes et Expéditions
                    </Button>
                    <Button
                        variant={activeTab === 'orders' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('orders')}
                        className="rounded-b-none"
                    >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Commandes Individuelles ({orders.length})
                    </Button>
                </div>

                {/* Filters - only show for orders tab */}
                {activeTab === 'orders' && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Rechercher par numéro, email ou école..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Tous les statuts</option>
                                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                                    <option key={value} value={value}>{config.label}</option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>
                )}

                {/* Campaign Summaries Tab */}
                {activeTab === 'campaigns' && (
                    <div className="space-y-6">
                        {loading ? (
                            <Card>
                                <CardContent className="py-12">
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <span className="ml-2">Chargement...</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : campaignSummaries.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center text-gray-500">
                                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                    <p>Aucune campagne avec commandes trouvée</p>
                                </CardContent>
                            </Card>
                        ) : (
                            campaignSummaries.map((summary) => {
                                const { campaign, products, totalOrders, totalPayment } = summary;
                                return (
                                    <Card key={campaign._id} className="overflow-hidden">
                                        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <div>
                                                    <CardTitle className="text-xl">
                                                        {campaign.name || (campaign.campaignNumber ? `Campagne #${campaign.campaignNumber}` : 'Campagne')}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1">
                                                        {campaign.school?.name || 'École non spécifiée'}
                                                        {campaign.campaignCode && ` • ${campaign.campaignCode}`}
                                                    </CardDescription>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {campaign.endDate && (
                                                        <Badge variant="outline" className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDateSafe(campaign.endDate)}
                                                        </Badge>
                                                    )}
                                                    {campaign.deliveryDate && (
                                                        <Badge variant="outline" className="flex items-center gap-1">
                                                            <Truck className="w-3 h-3" />
                                                            Livraison: {formatDateSafe(campaign.deliveryDate)}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-6">
                                            {/* Key Metrics */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                                <div className="bg-blue-50 p-4 rounded-lg">
                                                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                                                        <Clock className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Jours restants</span>
                                                    </div>
                                                    <div className={`text-2xl font-bold ${getDaysRemainingColor(campaign.daysRemaining)}`}>
                                                        {campaign.daysRemaining}
                                                    </div>
                                                </div>
                                                <div className="bg-green-50 p-4 rounded-lg">
                                                    <div className="flex items-center gap-2 text-green-600 mb-1">
                                                        <ShoppingCart className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Commandes</span>
                                                    </div>
                                                    <div className="text-2xl font-bold text-green-700">
                                                        {totalOrders}
                                                    </div>
                                                </div>
                                                <div className="bg-purple-50 p-4 rounded-lg">
                                                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                                                        <TrendingUp className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Revenus totaux</span>
                                                    </div>
                                                    <div className="text-2xl font-bold text-purple-700">
                                                        {formatCurrency(summary.totalRevenue)}
                                                    </div>
                                                </div>
                                                <div className="bg-amber-50 p-4 rounded-lg">
                                                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                                                        <DollarSign className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Paiement total</span>
                                                    </div>
                                                    <div className="text-2xl font-bold text-amber-700">
                                                        {formatCurrency(totalPayment)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Products Table */}
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4">Produits vendus et paiements</h3>
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Produit</TableHead>
                                                                <TableHead className="text-right">Quantité vendue</TableHead>
                                                                <TableHead className="text-right">Prix pickup</TableHead>
                                                                <TableHead className="text-right">Paiement total</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {products.length === 0 ? (
                                                                <TableRow>
                                                                    <TableCell colSpan={4} className="text-center text-gray-500 py-4">
                                                                        Aucun produit vendu pour le moment
                                                                    </TableCell>
                                                                </TableRow>
                                                            ) : (
                                                                products.map((product) => (
                                                                    <TableRow key={product.productId}>
                                                                        <TableCell className="font-medium">{product.productName}</TableCell>
                                                                        <TableCell className="text-right font-semibold">{product.quantity}</TableCell>
                                                                        <TableCell className="text-right">{formatCurrency(product.pricePickup)}</TableCell>
                                                                        <TableCell className="text-right font-bold text-green-700">
                                                                            {formatCurrency(product.totalPayment)}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Individual Orders Table */}
                {activeTab === 'orders' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Commandes ({filteredOrders.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-2">Chargement...</span>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>Aucune commande trouvée</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Numéro</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>École</TableHead>
                                            <TableHead>Client</TableHead>
                                            <TableHead>Montant</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredOrders.map((order) => {
                                            const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                            const StatusIcon = statusConfig.icon;
                                            return (
                                                <TableRow key={order._id}>
                                                    <TableCell className="font-medium">
                                                        {order.orderNumber ? `#${order.orderNumber}` : `#${order._id.slice(-6)}`}
                                                    </TableCell>
                                                    <TableCell>
                                                            {formatDateSafe(order.createdAt)}
                                                    </TableCell>
                                                    <TableCell>{order.schoolName || 'N/A'}</TableCell>
                                                    <TableCell>{order.customerEmail || 'N/A'}</TableCell>
                                                    <TableCell className="font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                                                    <TableCell>
                                                        <Badge className={`${statusConfig.color} border-0 flex items-center gap-1 w-fit`}>
                                                            <StatusIcon className="h-3.5 w-3.5" />
                                                            {statusConfig.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
                )}
            </div>
        </DashboardLayout>
    );
};

export default OrdersPage;


