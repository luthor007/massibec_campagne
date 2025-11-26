import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BarChart3,
    TrendingUp,
    Users,
    Package,
    DollarSign,
    ShoppingCart,
    RefreshCw,
    Calendar,
    Target,
    Award,
    Activity,
    Eye,
    Repeat,
    Building2,
    Filter,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const DEFAULT_START_DATE = format(subDays(new Date(), 90), 'yyyy-MM-dd');
const DEFAULT_END_DATE = format(new Date(), 'yyyy-MM-dd');

const formatCurrency = (value = 0) => {
    const amount = Number(value) || 0;
    return amount.toLocaleString('fr-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatNumber = (value = 0) => {
    const amount = Number(value) || 0;
    return amount.toLocaleString('fr-CA');
};

const AnalyticsPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [funnelAnalytics, setFunnelAnalytics] = useState(null);
    const [funnelLoading, setFunnelLoading] = useState(false);
    const [activePreset, setActivePreset] = useState(null);
    const [filters, setFilters] = useState({
        startDate: DEFAULT_START_DATE,
        endDate: DEFAULT_END_DATE,
        schoolIds: []
    });
    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/connexion');
            return;
        }
        if (session.user.role === 'supplier' || session.user.role === 'fournisseur') {
            // Redirect suppliers to the new dashboard-supplier pages
            router.push('/dashboard-supplier/analytics');
            return;
        }
        if (session.user.role !== 'supplier' && session.user.role !== 'fournisseur') {
            router.push('/dashboard');
            return;
        }
    }, [session, status, router]);

    useEffect(() => {
        if (status === 'authenticated' && (session?.user?.role === 'supplier' || session?.user?.role === 'fournisseur')) {
            fetchAnalytics();
            fetchFunnelAnalytics();
        }
    }, [status, session]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.set('startDate', filters.startDate);
            if (filters.endDate) params.set('endDate', filters.endDate);
            if (filters.schoolIds.length > 0) {
                params.set('schoolIds', filters.schoolIds.join(','));
            }

            const response = await fetch(`/api/massibec/analytics?${params.toString()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            } else {
                console.error('Error fetching analytics:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFunnelAnalytics = async () => {
        setFunnelLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.set('startDate', filters.startDate);
            if (filters.endDate) params.set('endDate', filters.endDate);

            const response = await fetch(`/api/massibec/funnel-analytics?${params.toString()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setFunnelAnalytics(data);
            } else {
                console.error('Error fetching funnel analytics:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching funnel analytics:', error);
        } finally {
            setFunnelLoading(false);
        }
    };

    const handleDateChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear preset when manually changing dates
        setActivePreset(null);
    };

    const handleApplyFilters = () => {
        fetchAnalytics();
        fetchFunnelAnalytics();
    };

    const handleResetFilters = () => {
        const newFilters = {
            startDate: DEFAULT_START_DATE,
            endDate: DEFAULT_END_DATE,
            schoolIds: []
        };
        setFilters(newFilters);
        setSelectedSchools([]);
        setActivePreset(null);
        // Apply filters immediately after reset
        setTimeout(() => {
            fetchAnalytics();
            fetchFunnelAnalytics();
        }, 0);
    };

    const handlePresetPeriod = (days) => {
        const end = new Date();
        const start = subDays(end, days);
        const newFilters = {
            ...filters,
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(end, 'yyyy-MM-dd')
        };
        setFilters(newFilters);
        setActivePreset(days);
        // Apply filters immediately
        setTimeout(() => {
            fetchAnalytics();
            fetchFunnelAnalytics();
        }, 0);
    };

    // Top 5% stats
    const top5PercentStats = useMemo(() => {
        if (!analytics?.studentPerformance || analytics.studentPerformance.length === 0) {
            return null;
        }

        const totalStudents = analytics.studentPerformance.length;
        const top5PercentCount = Math.ceil(totalStudents * 0.05);
        const top5Percent = analytics.studentPerformance.slice(0, top5PercentCount);

        const totalUnits = top5Percent.reduce((sum, s) => sum + s.totalUnits, 0);
        const totalSales = top5Percent.reduce((sum, s) => sum + s.totalSales, 0);

        return {
            studentCount: top5PercentCount,
            totalUnits,
            totalSales,
            averageUnitsPerStudent: totalUnits / top5PercentCount,
            averageSalesPerStudent: totalSales / top5PercentCount
        };
    }, [analytics]);

    // Show loading state
    if (status === 'loading' || loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="flex items-center gap-3 text-gray-600">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
                        Chargement des analytics...
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!session || (session.user.role !== 'supplier' && session.user.role !== 'fournisseur')) {
        return null;
    }

    const overallMetrics = analytics?.overallMetrics || {};
    const salesDistribution = analytics?.salesDistribution || [];
    const recurringCustomers = analytics?.recurringCustomers || {};
    const productPerformance = analytics?.productPerformance || [];
    const campaignPerformance = analytics?.campaignPerformance || [];
    const enrollmentDiagnostics = analytics?.enrollmentDiagnostics || {};

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Analytics & Rapports</h1>
                        <p className="text-gray-600 mt-1">Statistiques détaillées et analyses de performance</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => {
                            fetchAnalytics();
                            fetchFunnelAnalytics();
                        }}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualiser
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filtres de Période</CardTitle>
                        <CardDescription>
                            Sélectionnez la période pour analyser les performances du funnel et comparer les améliorations
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Quick Preset Buttons */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Périodes rapides</label>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={activePreset === 7 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetPeriod(7)}
                                >
                                    7 derniers jours
                                </Button>
                                <Button
                                    variant={activePreset === 30 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetPeriod(30)}
                                >
                                    30 derniers jours
                                </Button>
                                <Button
                                    variant={activePreset === 60 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetPeriod(60)}
                                >
                                    60 derniers jours
                                </Button>
                                <Button
                                    variant={activePreset === 90 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetPeriod(90)}
                                >
                                    90 derniers jours
                                </Button>
                                <Button
                                    variant={activePreset === 180 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetPeriod(180)}
                                >
                                    6 derniers mois
                                </Button>
                            </div>
                        </div>

                        {/* Custom Date Range */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Période personnalisée</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-600">Du</label>
                                    <Input
                                        type="date"
                                        value={filters.startDate}
                                        onChange={(e) => handleDateChange('startDate', e.target.value)}
                                        max={filters.endDate || undefined}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-600">Au</label>
                                    <Input
                                        type="date"
                                        value={filters.endDate}
                                        onChange={(e) => handleDateChange('endDate', e.target.value)}
                                        min={filters.startDate || undefined}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Selected Period Display */}
                        {filters.startDate && filters.endDate && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    Période sélectionnée: <strong>{format(new Date(filters.startDate), 'd MMM yyyy', { locale: fr })}</strong> au <strong>{format(new Date(filters.endDate), 'd MMM yyyy', { locale: fr })}</strong>
                                </span>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button onClick={handleApplyFilters}>
                                <Filter className="h-4 w-4 mr-2" />
                                Appliquer les filtres
                            </Button>
                            <Button variant="outline" onClick={handleResetFilters}>
                                Réinitialiser
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Produits/Élève (Moyenne)</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatNumber(overallMetrics.averageProductsPerStudent || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Tous les élèves
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Produits/Élève Actif</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatNumber(overallMetrics.averageProductsPerActiveStudent || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {overallMetrics.activeStudents || 0} élèves actifs
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ticket Moyen</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(overallMetrics.averageOrderValue || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Par commande
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {(overallMetrics.conversionRate || 0).toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Visites → Commandes
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Top 5% Stats */}
                {top5PercentStats && (
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-900">
                                <Award className="h-5 w-5" />
                                Top 5% des Vendeurs
                            </CardTitle>
                            <CardDescription>
                                Performance des meilleurs {top5PercentStats.studentCount} vendeurs
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Unités vendues</p>
                                    <p className="text-2xl font-bold text-blue-900">
                                        {formatNumber(top5PercentStats.totalUnits)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Ventes totales</p>
                                    <p className="text-2xl font-bold text-blue-900">
                                        {formatCurrency(top5PercentStats.totalSales)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Moyenne unités/élève</p>
                                    <p className="text-2xl font-bold text-blue-900">
                                        {formatNumber(top5PercentStats.averageUnitsPerStudent)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Moyenne ventes/élève</p>
                                    <p className="text-2xl font-bold text-blue-900">
                                        {formatCurrency(top5PercentStats.averageSalesPerStudent)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tabs for different views */}
                <Tabs defaultValue="distribution" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="distribution">Distribution des Ventes</TabsTrigger>
                        <TabsTrigger value="customers">Clients Récurrents</TabsTrigger>
                        <TabsTrigger value="products">Performance Produits</TabsTrigger>
                        <TabsTrigger value="campaigns">Performance Campagnes</TabsTrigger>
                        <TabsTrigger value="diagnostics">Diagnostic Inscription</TabsTrigger>
                        <TabsTrigger value="funnel">Funnel Analytics</TabsTrigger>
                    </TabsList>

                    {/* Sales Distribution Table */}
                    <TabsContent value="distribution" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Distribution des Ventes par Tranches de 5%</CardTitle>
                                <CardDescription>
                                    Répartition des ventes et unités vendues par percentile d'élèves
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {salesDistribution.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-8">
                                        Aucune donnée disponible pour cette période.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tranche</TableHead>
                                                    <TableHead>Nombre d'Élèves</TableHead>
                                                    <TableHead>Unités Totales</TableHead>
                                                    <TableHead>Ventes Totales</TableHead>
                                                    <TableHead>Moy. Unités/Élève</TableHead>
                                                    <TableHead>Moy. Ventes/Élève</TableHead>
                                                    <TableHead>% Unités</TableHead>
                                                    <TableHead>% Ventes</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {salesDistribution.map((tranche, index) => (
                                                    <TableRow
                                                        key={index}
                                                        className={tranche.startPercent === 0 ? 'bg-blue-50 font-semibold' : ''}
                                                    >
                                                        <TableCell>
                                                            {tranche.startPercent === 0 ? (
                                                                <Badge className="bg-blue-600">Top {tranche.endPercent}%</Badge>
                                                            ) : (
                                                                tranche.range
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{formatNumber(tranche.studentCount)}</TableCell>
                                                        <TableCell>{formatNumber(tranche.totalUnits)}</TableCell>
                                                        <TableCell>{formatCurrency(tranche.totalSales)}</TableCell>
                                                        <TableCell>{formatNumber(tranche.averageUnitsPerStudent.toFixed(1))}</TableCell>
                                                        <TableCell>{formatCurrency(tranche.averageSalesPerStudent)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {tranche.percentageOfTotalUnits.toFixed(1)}%
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {tranche.percentageOfTotalSales.toFixed(1)}%
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Recurring Customers */}
                    <TabsContent value="customers" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Clients Totaux</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {formatNumber(recurringCustomers.totalCustomers || 0)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Clients Récurrents</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">
                                        {formatNumber(recurringCustomers.returningCustomers || 0)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {(recurringCustomers.returningCustomerRate || 0).toFixed(1)}% du total
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Clients Uniques</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-orange-600">
                                        {formatNumber(recurringCustomers.oneTimeCustomers || 0)}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top 10 Clients</CardTitle>
                                <CardDescription>Clients avec le plus de commandes</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recurringCustomers.topCustomers && recurringCustomers.topCustomers.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Client</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Commandes</TableHead>
                                                    <TableHead>Total Dépensé</TableHead>
                                                    <TableHead>Première Commande</TableHead>
                                                    <TableHead>Dernière Commande</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recurringCustomers.topCustomers.map((customer, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{customer.customerName}</TableCell>
                                                        <TableCell>{customer.email}</TableCell>
                                                        <TableCell>
                                                            <Badge>{customer.orderCount}</Badge>
                                                        </TableCell>
                                                        <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
                                                        <TableCell>
                                                            {format(new Date(customer.firstOrderDate), 'dd MMM yyyy', { locale: fr })}
                                                        </TableCell>
                                                        <TableCell>
                                                            {format(new Date(customer.lastOrderDate), 'dd MMM yyyy', { locale: fr })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-8">
                                        Aucune donnée disponible.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Product Performance */}
                    <TabsContent value="products" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Top 20 Produits</CardTitle>
                                <CardDescription>Produits les plus vendus par revenus</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {productPerformance.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-8">
                                        Aucune donnée disponible.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Produit</TableHead>
                                                    <TableHead>Quantité Vendue</TableHead>
                                                    <TableHead>Revenus</TableHead>
                                                    <TableHead>Commandes</TableHead>
                                                    <TableHead>Prix Moyen</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {productPerformance.map((product, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{product.name}</TableCell>
                                                        <TableCell>{formatNumber(product.totalQuantity)}</TableCell>
                                                        <TableCell className="font-semibold">
                                                            {formatCurrency(product.totalRevenue)}
                                                        </TableCell>
                                                        <TableCell>{formatNumber(product.orderCount)}</TableCell>
                                                        <TableCell>
                                                            {formatCurrency(product.totalRevenue / product.totalQuantity)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Campaign Performance */}
                    <TabsContent value="campaigns" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance par Campagne</CardTitle>
                                <CardDescription>Comparaison des ventes par campagne (système basé sur campagnes)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {campaignPerformance.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-8">
                                        Aucune donnée disponible.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Campagne</TableHead>
                                                    <TableHead>École</TableHead>
                                                    <TableHead>Élèves</TableHead>
                                                    <TableHead>Unités Vendues</TableHead>
                                                    <TableHead>Revenus</TableHead>
                                                    <TableHead>Commandes</TableHead>
                                                    <TableHead>Unités/Élève</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {campaignPerformance.map((campaign, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <div className="font-medium">{campaign.campaignName}</div>
                                                            {campaign.campaignNumber > 0 && (
                                                                <div className="text-xs text-gray-500">#{campaign.campaignNumber}</div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>{campaign.schoolName}</div>
                                                            {campaign.schoolCode && (
                                                                <div className="text-xs text-gray-500">{campaign.schoolCode}</div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{formatNumber(campaign.studentCount)}</TableCell>
                                                        <TableCell>{formatNumber(campaign.totalUnits)}</TableCell>
                                                        <TableCell className="font-semibold">
                                                            {formatCurrency(campaign.totalRevenue)}
                                                        </TableCell>
                                                        <TableCell>{formatNumber(campaign.totalOrders)}</TableCell>
                                                        <TableCell>
                                                            {campaign.studentCount > 0
                                                                ? formatNumber((campaign.totalUnits / campaign.studentCount).toFixed(1))
                                                                : '0'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Enrollment Diagnostics */}
                    <TabsContent value="diagnostics" className="space-y-4">
                        {/* Campaigns with Low Enrollment */}
                        {enrollmentDiagnostics.campaignsWithLowEnrollment && enrollmentDiagnostics.campaignsWithLowEnrollment.length > 0 && (
                            <Card className="border-orange-200 bg-orange-50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-orange-900">
                                        <AlertTriangle className="h-5 w-5" />
                                        Campagnes avec Faible Inscription
                                    </CardTitle>
                                    <CardDescription>
                                        Campagnes où moins de 30% des étudiants de l'école sont inscrits
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Campagne</TableHead>
                                                    <TableHead>École</TableHead>
                                                    <TableHead>Étudiants École</TableHead>
                                                    <TableHead>Inscrits</TableHead>
                                                    <TableHead>Taux d'Inscription</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {enrollmentDiagnostics.campaignsWithLowEnrollment.map((campaign, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                                                        <TableCell>{campaign.schoolName}</TableCell>
                                                        <TableCell>{formatNumber(campaign.totalStudentsInSchool)}</TableCell>
                                                        <TableCell>
                                                            <Badge className="bg-orange-200 text-orange-900">
                                                                {formatNumber(campaign.enrolledStudents)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-orange-700">
                                                                {campaign.enrollmentRate.toFixed(1)}%
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Students with Orders but Not Enrolled */}
                        {enrollmentDiagnostics.studentsWithOrdersButNotEnrolled && enrollmentDiagnostics.studentsWithOrdersButNotEnrolled.length > 0 && (
                            <Card className="border-red-200 bg-red-50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-red-900">
                                        <AlertTriangle className="h-5 w-5" />
                                        Étudiants avec Commandes mais Non Inscrits
                                    </CardTitle>
                                    <CardDescription>
                                        Étudiants qui ont des commandes mais ne sont pas inscrits à la campagne
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Étudiant</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Commandes</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {enrollmentDiagnostics.studentsWithOrdersButNotEnrolled.map((student, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{student.studentName}</TableCell>
                                                        <TableCell>{student.studentEmail}</TableCell>
                                                        <TableCell>
                                                            <Badge className="bg-red-200 text-red-900">
                                                                {formatNumber(student.orderCount)}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* No Issues Found */}
                        {(!enrollmentDiagnostics.campaignsWithLowEnrollment || enrollmentDiagnostics.campaignsWithLowEnrollment.length === 0) &&
                            (!enrollmentDiagnostics.studentsWithOrdersButNotEnrolled || enrollmentDiagnostics.studentsWithOrdersButNotEnrolled.length === 0) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Diagnostic d'Inscription</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-center py-8">
                                            <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
                                            <p className="text-lg font-medium text-gray-900">Aucun problème détecté</p>
                                            <p className="text-sm text-gray-500 mt-2">
                                                Tous les étudiants semblent correctement inscrits aux campagnes.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                    </TabsContent>

                    {/* Funnel Analytics */}
                    <TabsContent value="funnel" className="space-y-4">
                        {/* Period Indicator */}
                        {filters.startDate && filters.endDate && (
                            <Card className="bg-blue-50 border-blue-200">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="text-sm font-medium text-blue-900">
                                                    Période analysée
                                                </p>
                                                <p className="text-xs text-blue-700">
                                                    {format(new Date(filters.startDate), 'd MMM yyyy', { locale: fr })} au {format(new Date(filters.endDate), 'd MMM yyyy', { locale: fr })}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                fetchFunnelAnalytics();
                                            }}
                                        >
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Actualiser
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {funnelLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center gap-3 text-gray-600">
                                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
                                    Chargement des données du funnel...
                                </div>
                            </div>
                        ) : funnelAnalytics ? (
                            <>
                                {/* Tabs for Student vs School Funnel */}
                                <Tabs defaultValue="student" className="space-y-4">
                                    <TabsList>
                                        <TabsTrigger value="student">Funnel Élèves</TabsTrigger>
                                        <TabsTrigger value="school">Funnel Écoles</TabsTrigger>
                                    </TabsList>

                                    {/* Student Funnel */}
                                    <TabsContent value="student" className="space-y-4">
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium">Visites Page d'Accueil</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {formatNumber(funnelAnalytics.summary?.totalHomeVisits || 0)}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium">Inscriptions Complétées</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {formatNumber(funnelAnalytics.summary?.totalRegistrations || 0)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {funnelAnalytics.keyConversions?.homeToRegistration?.toFixed(1) || 0}% conversion
                                                    </p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium">Campagnes Rejointes</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {formatNumber(funnelAnalytics.summary?.totalCampaignJoins || 0)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {funnelAnalytics.keyConversions?.verifiedToCampaignJoin?.toFixed(1) || 0}% conversion
                                                    </p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium">Premières Commandes</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {formatNumber(funnelAnalytics.summary?.totalFirstOrders || 0)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {funnelAnalytics.summary?.overallConversionRate?.toFixed(2) || 0}% conversion globale
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Funnel Visualization */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Funnel de Conversion - Élèves</CardTitle>
                                                <CardDescription>
                                                    Visualisation du parcours utilisateur de la page d'accueil à la première commande
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {funnelAnalytics.funnelData?.map((step, index) => (
                                                        <div key={step.step} className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-gray-700 w-6">{index + 1}.</span>
                                                                    <span className="text-sm font-medium">{step.stepName}</span>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-sm text-gray-600">
                                                                        {formatNumber(step.uniqueSessions)} sessions
                                                                    </span>
                                                                    {step.avgTimeFromPrevious !== null && (
                                                                        <span className="text-xs text-gray-500">
                                                                            {step.avgTimeFromPrevious.toFixed(1)} min
                                                                        </span>
                                                                    )}
                                                                    {step.conversionRate !== null && (
                                                                        <Badge variant={step.conversionRate >= 50 ? "default" : step.conversionRate >= 25 ? "secondary" : "outline"}>
                                                                            {step.conversionRate.toFixed(1)}%
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                                                    style={{
                                                                        width: `${Math.min((step.uniqueSessions / (funnelAnalytics.funnelData[0]?.uniqueSessions || 1)) * 100, 100)}%`
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Key Conversion Rates */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Taux de Conversion Clés - Élèves</CardTitle>
                                                <CardDescription>
                                                    Conversion entre les étapes principales du funnel
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Étape</TableHead>
                                                                <TableHead>Taux de Conversion</TableHead>
                                                                <TableHead>Temps Moyen</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Page d'accueil → Inscription</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.keyConversions?.homeToRegistration >= 10 ? "default" : "outline"}>
                                                                        {funnelAnalytics.keyConversions?.homeToRegistration?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>-</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Page Inscription → Commencée</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.keyConversions?.registrationPageToStarted >= 50 ? "default" : "outline"}>
                                                                        {funnelAnalytics.keyConversions?.registrationPageToStarted?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>-</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Commencée → Complétée</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.keyConversions?.startedToCompleted >= 70 ? "default" : "outline"}>
                                                                        {funnelAnalytics.keyConversions?.startedToCompleted?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>-</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Inscription → Email Vérifié</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.keyConversions?.completedToVerified >= 80 ? "default" : "outline"}>
                                                                        {funnelAnalytics.keyConversions?.completedToVerified?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>-</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Email Vérifié → Campagne Rejointe</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.keyConversions?.verifiedToCampaignJoin >= 60 ? "default" : "outline"}>
                                                                        {funnelAnalytics.keyConversions?.verifiedToCampaignJoin?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {funnelAnalytics.funnelData?.find(s => s.step === 'campaign_joined')?.avgTimeFromPrevious ?
                                                                        `${funnelAnalytics.funnelData.find(s => s.step === 'campaign_joined').avgTimeFromPrevious.toFixed(1)} min` : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Campagne → Onboarding Complété</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.keyConversions?.campaignJoinToOnboardingComplete >= 60 ? "default" : "outline"}>
                                                                        {funnelAnalytics.keyConversions?.campaignJoinToOnboardingComplete?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {funnelAnalytics.funnelData?.find(s => s.step === 'onboarding_completed')?.avgTimeFromPrevious ?
                                                                        `${funnelAnalytics.funnelData.find(s => s.step === 'onboarding_completed').avgTimeFromPrevious.toFixed(1)} min` : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Onboarding → Boutique Créée</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.keyConversions?.onboardingToStore >= 80 ? "default" : "outline"}>
                                                                        {funnelAnalytics.keyConversions?.onboardingToStore?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {funnelAnalytics.funnelData?.find(s => s.step === 'store_created')?.avgTimeFromPrevious ?
                                                                        `${funnelAnalytics.funnelData.find(s => s.step === 'store_created').avgTimeFromPrevious.toFixed(1)} min` : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Boutique → Personnalisée</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.keyConversions?.storeToPersonalized >= 70 ? "default" : "outline"}>
                                                                        {funnelAnalytics.keyConversions?.storeToPersonalized?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {funnelAnalytics.funnelData?.find(s => s.step === 'store_personalized')?.avgTimeFromPrevious ?
                                                                        `${funnelAnalytics.funnelData.find(s => s.step === 'store_personalized').avgTimeFromPrevious.toFixed(1)} min` : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Personnalisée → Premier Ajout Panier</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.keyConversions?.personalizedToAddToCart >= 30 ? "default" : "outline"}>
                                                                        {funnelAnalytics.keyConversions?.personalizedToAddToCart?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {funnelAnalytics.funnelData?.find(s => s.step === 'first_add_to_cart')?.avgTimeFromPrevious ?
                                                                        `${funnelAnalytics.funnelData.find(s => s.step === 'first_add_to_cart').avgTimeFromPrevious.toFixed(1)} min` : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Ajout Panier → Première Commande</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.keyConversions?.addToCartToFirstOrder >= 30 ? "default" : "outline"}>
                                                                        {funnelAnalytics.keyConversions?.addToCartToFirstOrder?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {funnelAnalytics.funnelData?.find(s => s.step === 'first_order_placed')?.avgTimeFromPrevious ?
                                                                        `${funnelAnalytics.funnelData.find(s => s.step === 'first_order_placed').avgTimeFromPrevious.toFixed(1)} min` : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow className="bg-blue-50 font-semibold">
                                                                <TableCell className="font-bold">Conversion Globale</TableCell>
                                                                <TableCell>
                                                                    <Badge className="bg-blue-600">
                                                                        {funnelAnalytics.keyConversions?.overallConversion?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>-</TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Top Drop-off Points */}
                                        {funnelAnalytics.dropOffs && funnelAnalytics.dropOffs.length > 0 && (
                                            <Card className="border-orange-200 bg-orange-50">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-orange-900">
                                                        <AlertTriangle className="h-5 w-5" />
                                                        Points d'Abandon Principaux
                                                    </CardTitle>
                                                    <CardDescription>
                                                        Étapes où les utilisateurs abandonnent le plus
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>De</TableHead>
                                                                    <TableHead>À</TableHead>
                                                                    <TableHead>Taux d'Abandon</TableHead>
                                                                    <TableHead>Utilisateurs Perdus</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {funnelAnalytics.dropOffs.map((dropOff, index) => (
                                                                    <TableRow key={index}>
                                                                        <TableCell className="font-medium">{dropOff.from}</TableCell>
                                                                        <TableCell>{dropOff.to}</TableCell>
                                                                        <TableCell>
                                                                            <Badge className="bg-orange-200 text-orange-900">
                                                                                {dropOff.dropOffRate.toFixed(1)}%
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell>{formatNumber(dropOff.lostUsers)}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                    </TabsContent>

                                    {/* School Funnel */}
                                    <TabsContent value="school" className="space-y-4">
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium">Visites Page d'Accueil</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {formatNumber(funnelAnalytics.schoolSummary?.totalHomeVisits || 0)}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium">Inscriptions Complétées</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {formatNumber(funnelAnalytics.schoolSummary?.totalRegistrations || 0)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {funnelAnalytics.schoolKeyConversions?.homeToRegistration?.toFixed(1) || 0}% conversion
                                                    </p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium">Profils Complétés</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {formatNumber(funnelAnalytics.schoolSummary?.totalProfilesCompleted || 0)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {funnelAnalytics.schoolKeyConversions?.verifiedToProfileComplete?.toFixed(1) || 0}% conversion
                                                    </p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium">Campagnes Créées</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {formatNumber(funnelAnalytics.schoolSummary?.totalCampaignsCreated || 0)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {funnelAnalytics.schoolSummary?.overallConversionRate?.toFixed(2) || 0}% conversion globale
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* School Funnel Visualization */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Funnel de Conversion - Écoles</CardTitle>
                                                <CardDescription>
                                                    Visualisation du parcours école de la page d'accueil à la création de campagne
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {funnelAnalytics.schoolFunnelData?.map((step, index) => (
                                                        <div key={step.step} className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-gray-700 w-6">{index + 1}.</span>
                                                                    <span className="text-sm font-medium">{step.stepName}</span>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-sm text-gray-600">
                                                                        {formatNumber(step.uniqueSessions)} sessions
                                                                    </span>
                                                                    {step.avgTimeFromPrevious !== null && (
                                                                        <span className="text-xs text-gray-500">
                                                                            {step.avgTimeFromPrevious.toFixed(1)} min
                                                                        </span>
                                                                    )}
                                                                    {step.conversionRate !== null && (
                                                                        <Badge variant={step.conversionRate >= 50 ? "default" : step.conversionRate >= 25 ? "secondary" : "outline"}>
                                                                            {step.conversionRate.toFixed(1)}%
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="bg-green-600 h-2 rounded-full transition-all"
                                                                    style={{
                                                                        width: `${Math.min((step.uniqueSessions / (funnelAnalytics.schoolFunnelData[0]?.uniqueSessions || 1)) * 100, 100)}%`
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* School Key Conversion Rates */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Taux de Conversion Clés - Écoles</CardTitle>
                                                <CardDescription>
                                                    Conversion entre les étapes principales du funnel école
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Étape</TableHead>
                                                                <TableHead>Taux de Conversion</TableHead>
                                                                <TableHead>Temps Moyen</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Page d'accueil → Inscription</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.schoolKeyConversions?.homeToRegistration >= 10 ? "default" : "outline"}>
                                                                        {funnelAnalytics.schoolKeyConversions?.homeToRegistration?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>-</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Page Inscription → Commencée</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.schoolKeyConversions?.registrationPageToStarted >= 50 ? "default" : "outline"}>
                                                                        {funnelAnalytics.schoolKeyConversions?.registrationPageToStarted?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>-</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Commencée → Complétée</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.schoolKeyConversions?.startedToCompleted >= 70 ? "default" : "outline"}>
                                                                        {funnelAnalytics.schoolKeyConversions?.startedToCompleted?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>-</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Inscription → Email Vérifié</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.schoolKeyConversions?.completedToVerified >= 80 ? "default" : "outline"}>
                                                                        {funnelAnalytics.schoolKeyConversions?.completedToVerified?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {funnelAnalytics.schoolFunnelData?.find(s => s.step === 'school_email_verified')?.avgTimeFromPrevious ?
                                                                        `${funnelAnalytics.schoolFunnelData.find(s => s.step === 'school_email_verified').avgTimeFromPrevious.toFixed(1)} min` : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Email Vérifié → Profil Complété</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.schoolKeyConversions?.verifiedToProfileComplete >= 60 ? "default" : "outline"}>
                                                                        {funnelAnalytics.schoolKeyConversions?.verifiedToProfileComplete?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {funnelAnalytics.schoolFunnelData?.find(s => s.step === 'school_profile_completed')?.avgTimeFromPrevious ?
                                                                        `${funnelAnalytics.schoolFunnelData.find(s => s.step === 'school_profile_completed').avgTimeFromPrevious.toFixed(1)} min` : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Profil → Campagne Créée</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={funnelAnalytics.schoolKeyConversions?.profileToCampaignCreated >= 50 ? "default" : "outline"}>
                                                                        {funnelAnalytics.schoolKeyConversions?.profileToCampaignCreated?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {funnelAnalytics.schoolFunnelData?.find(s => s.step === 'school_campaign_created')?.avgTimeFromPrevious ?
                                                                        `${funnelAnalytics.schoolFunnelData.find(s => s.step === 'school_campaign_created').avgTimeFromPrevious.toFixed(1)} min` : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow className="bg-green-50 font-semibold">
                                                                <TableCell className="font-bold">Conversion Globale</TableCell>
                                                                <TableCell>
                                                                    <Badge className="bg-green-600">
                                                                        {funnelAnalytics.schoolKeyConversions?.overallConversion?.toFixed(2) || 0}%
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>-</TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                            </>
                        ) : (
                            <Card>
                                <CardContent className="py-12">
                                    <p className="text-sm text-gray-500 text-center">
                                        Aucune donnée disponible pour cette période.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Overall Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Élèves</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatNumber(overallMetrics.totalStudents || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {overallMetrics.totalStudentsWithSales || overallMetrics.activeStudents || 0} avec ventes (uniques)
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Somme par campagne: {overallMetrics.totalStudentsInCampaigns || 0}
                            </p>
                            {overallMetrics.totalStudentsInCampaigns > (overallMetrics.totalStudentsWithSales || 0) && (
                                <p className="text-xs text-blue-600 mt-1 italic">
                                    * Un élève peut avoir des ventes dans plusieurs campagnes
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(overallMetrics.totalRevenue || 0)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Unités Vendues</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatNumber(overallMetrics.totalUnits || 0)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Visites Boutiques</CardTitle>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatNumber(overallMetrics.totalVisits || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatNumber(overallMetrics.uniqueVisitors || 0)} visiteurs uniques
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AnalyticsPage;

