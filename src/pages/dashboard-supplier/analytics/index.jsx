import React, { useState, useEffect, useMemo } from 'react';
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
    BarChart3,
    TrendingUp,
    Users,
    Package,
    DollarSign,
    ShoppingCart,
    RefreshCw,
    Calendar,
    Award,
    Building2,
    Filter,
    AlertTriangle,
    CheckCircle,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { format, subDays } from 'date-fns';
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
    const [comparisonAnalytics, setComparisonAnalytics] = useState(null);
    const [activePreset, setActivePreset] = useState(30); // Default to 30 days
    const [showCustomDates, setShowCustomDates] = useState(false);
    const [compareMode, setCompareMode] = useState('none'); // 'none', 'lastYear', 'previousPeriod'
    const [filters, setFilters] = useState({
        startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: DEFAULT_END_DATE,
        schoolIds: []
    });

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
    }, [session, status, router]);

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role === 'supplier') {
            fetchAnalytics();
        }
    }, [status, session]);

    const fetchAnalytics = async (startDate = filters.startDate, endDate = filters.endDate) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            if (filters.schoolIds.length > 0) {
                params.set('schoolIds', filters.schoolIds.join(','));
            }

            const response = await fetch(`/api/supplier/analytics?${params.toString()}`, {
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

    const fetchComparisonAnalytics = async () => {
        if (compareMode === 'none') {
            setComparisonAnalytics(null);
            return;
        }

        try {
            let comparisonStartDate, comparisonEndDate;
            const start = new Date(filters.startDate);
            const end = new Date(filters.endDate);
            const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

            if (compareMode === 'lastYear') {
                // Compare with same period last year
                comparisonStartDate = format(subDays(start, 365), 'yyyy-MM-dd');
                comparisonEndDate = format(subDays(end, 365), 'yyyy-MM-dd');
            } else if (compareMode === 'previousPeriod') {
                // Compare with previous period of same length
                comparisonStartDate = format(subDays(start, periodDays), 'yyyy-MM-dd');
                comparisonEndDate = format(subDays(start, 1), 'yyyy-MM-dd');
            }

            const params = new URLSearchParams();
            if (comparisonStartDate) params.set('startDate', comparisonStartDate);
            if (comparisonEndDate) params.set('endDate', comparisonEndDate);
            if (filters.schoolIds.length > 0) {
                params.set('schoolIds', filters.schoolIds.join(','));
            }

            const response = await fetch(`/api/supplier/analytics?${params.toString()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setComparisonAnalytics(data);
            }
        } catch (error) {
            console.error('Error fetching comparison analytics:', error);
        }
    };

    useEffect(() => {
        if (compareMode !== 'none') {
            fetchComparisonAnalytics();
        } else {
            setComparisonAnalytics(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [compareMode, filters.startDate, filters.endDate]);

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
        setShowCustomDates(false);
        setTimeout(() => {
            fetchAnalytics(newFilters.startDate, newFilters.endDate);
        }, 100);
    };

    const handleCustomDateChange = (field, value) => {
        const newFilters = {
            ...filters,
            [field]: value
        };
        setFilters(newFilters);
        setActivePreset(null);
    };

    const handleApplyCustomDates = () => {
        fetchAnalytics(filters.startDate, filters.endDate);
        setShowCustomDates(false);
    };

    const handleCompareModeChange = (mode) => {
        setCompareMode(mode);
    };

    // Calculate percentage change for comparison
    const calculateChange = (current, previous) => {
        if (!previous || previous === 0) return null;
        const change = ((current - previous) / previous) * 100;
        return change;
    };

    if (status === 'loading' || loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="flex items-center gap-3 text-gray-600">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
                        Chargement des statistiques...
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!session || session.user.role !== 'supplier') {
        return null;
    }

    const overallMetrics = analytics?.overallMetrics || {};
    const campaignPerformance = analytics?.campaignPerformance || [];
    const productPerformance = analytics?.productPerformance || [];
    const recurringCustomers = analytics?.recurringCustomers || {};

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Statistiques & Performance</h1>
                        <p className="text-gray-600 mt-1">Analysez les performances de vos campagnes et produits</p>
                    </div>
                    <Button variant="outline" onClick={fetchAnalytics} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Actualiser
                    </Button>
                </div>

                {/* Period Selector with Comparison */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Période d'analyse</CardTitle>
                        <CardDescription>
                            Sélectionnez la période pour voir les statistiques et comparez avec une autre période
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Quick Preset Buttons */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Périodes rapides</label>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={activePreset === 7 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetPeriod(7)}
                                >
                                    7 jours
                                </Button>
                                <Button
                                    variant={activePreset === 30 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetPeriod(30)}
                                >
                                    30 jours
                                </Button>
                                <Button
                                    variant={activePreset === 60 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetPeriod(60)}
                                >
                                    60 jours
                                </Button>
                                <Button
                                    variant={activePreset === 90 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetPeriod(90)}
                                >
                                    90 jours
                                </Button>
                                <Button
                                    variant={showCustomDates ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setShowCustomDates(!showCustomDates)}
                                >
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Personnalisé
                                </Button>
                            </div>
                        </div>

                        {/* Custom Date Range */}
                        {showCustomDates && (
                            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                                <label className="text-sm font-medium text-gray-700">Période personnalisée</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-600">Du</label>
                                        <Input
                                            type="date"
                                            value={filters.startDate}
                                            onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                                            max={filters.endDate || undefined}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-600">Au</label>
                                        <Input
                                            type="date"
                                            value={filters.endDate}
                                            onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                                            min={filters.startDate || undefined}
                                            max={format(new Date(), 'yyyy-MM-dd')}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleApplyCustomDates} size="sm">
                                    Appliquer
                                </Button>
                            </div>
                        )}

                        {/* Selected Period Display */}
                        {filters.startDate && filters.endDate && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                <span>
                                    Période sélectionnée: <strong>{format(new Date(filters.startDate), 'd MMM yyyy', { locale: fr })}</strong> au <strong>{format(new Date(filters.endDate), 'd MMM yyyy', { locale: fr })}</strong>
                                </span>
                            </div>
                        )}

                        {/* Comparison Mode */}
                        <div className="pt-4 border-t">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Comparer avec</label>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={compareMode === 'none' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleCompareModeChange('none')}
                                >
                                    Aucune comparaison
                                </Button>
                                <Button
                                    variant={compareMode === 'previousPeriod' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleCompareModeChange('previousPeriod')}
                                >
                                    Période précédente
                                </Button>
                                <Button
                                    variant={compareMode === 'lastYear' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleCompareModeChange('lastYear')}
                                >
                                    Même période l'année dernière
                                </Button>
                            </div>
                            {compareMode !== 'none' && comparisonAnalytics && (
                                <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                    {compareMode === 'lastYear' && (
                                        <span>Comparaison avec: {format(subDays(new Date(filters.startDate), 365), 'd MMM yyyy', { locale: fr })} au {format(subDays(new Date(filters.endDate), 365), 'd MMM yyyy', { locale: fr })}</span>
                                    )}
                                    {compareMode === 'previousPeriod' && (
                                        <span>Comparaison avec la période précédente de même durée</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Main KPIs - Most Important Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Revenus Totaux</CardTitle>
                            <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {formatCurrency(overallMetrics.totalRevenue || 0)}
                            </div>
                            {compareMode !== 'none' && comparisonAnalytics && (() => {
                                const change = calculateChange(
                                    overallMetrics.totalRevenue || 0,
                                    comparisonAnalytics.overallMetrics?.totalRevenue || 0
                                );
                                return change !== null ? (
                                    <div className="flex items-center gap-2 mt-2">
                                        {change > 0 ? (
                                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                                        ) : change < 0 ? (
                                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                                        ) : null}
                                        <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                        </span>
                                        <span className="text-xs text-gray-500">vs période comparée</span>
                                    </div>
                                ) : null;
                            })()}
                            <p className="text-xs text-gray-500 mt-2">
                                Toutes les ventes confondues
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Nombre de Commandes</CardTitle>
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <ShoppingCart className="h-5 w-5 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {formatNumber(overallMetrics.totalOrders || 0)}
                            </div>
                            {compareMode !== 'none' && comparisonAnalytics && (() => {
                                const change = calculateChange(
                                    overallMetrics.totalOrders || 0,
                                    comparisonAnalytics.overallMetrics?.totalOrders || 0
                                );
                                return change !== null ? (
                                    <div className="flex items-center gap-2 mt-2">
                                        {change > 0 ? (
                                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                                        ) : change < 0 ? (
                                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                                        ) : null}
                                        <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                        </span>
                                        <span className="text-xs text-gray-500">vs période comparée</span>
                                    </div>
                                ) : null;
                            })()}
                            <p className="text-xs text-gray-500 mt-2">
                                Commandes reçues
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Produits Vendus</CardTitle>
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Package className="h-5 w-5 text-purple-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {formatNumber(overallMetrics.totalUnits || 0)}
                            </div>
                            {compareMode !== 'none' && comparisonAnalytics && (() => {
                                const change = calculateChange(
                                    overallMetrics.totalUnits || 0,
                                    comparisonAnalytics.overallMetrics?.totalUnits || 0
                                );
                                return change !== null ? (
                                    <div className="flex items-center gap-2 mt-2">
                                        {change > 0 ? (
                                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                                        ) : change < 0 ? (
                                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                                        ) : null}
                                        <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                        </span>
                                        <span className="text-xs text-gray-500">vs période comparée</span>
                                    </div>
                                ) : null;
                            })()}
                            <p className="text-xs text-gray-500 mt-2">
                                Unités vendues au total
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Ticket Moyen</CardTitle>
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-orange-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {formatCurrency(overallMetrics.averageOrderValue || 0)}
                            </div>
                            {compareMode !== 'none' && comparisonAnalytics && (() => {
                                const change = calculateChange(
                                    overallMetrics.averageOrderValue || 0,
                                    comparisonAnalytics.overallMetrics?.averageOrderValue || 0
                                );
                                return change !== null ? (
                                    <div className="flex items-center gap-2 mt-2">
                                        {change > 0 ? (
                                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                                        ) : change < 0 ? (
                                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                                        ) : null}
                                        <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                        </span>
                                        <span className="text-xs text-gray-500">vs période comparée</span>
                                    </div>
                                ) : null;
                            })()}
                            <p className="text-xs text-gray-500 mt-2">
                                Par commande
                            </p>
                        </CardContent>
                    </Card>
                    </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Élèves Actifs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900">
                                {formatNumber(overallMetrics.activeStudents || 0)}
                                </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Élèves ayant fait au moins une vente
                            </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Produits par Élève</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900">
                                {formatNumber((overallMetrics.averageProductsPerActiveStudent || 0).toFixed(1))}
                                </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Moyenne pour les élèves actifs
                            </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Taux de Conversion</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900">
                                {(overallMetrics.conversionRate || 0).toFixed(1)}%
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Visites → Commandes
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Performance by Campaign */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Performance par Campagne
                        </CardTitle>
                        <CardDescription>
                            Comparaison des ventes pour chaque campagne
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {campaignPerformance.length === 0 ? (
                            <div className="text-center py-12">
                                <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-sm text-gray-500">
                                    Aucune donnée disponible pour cette période.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Campagne</TableHead>
                                            <TableHead>École</TableHead>
                                            <TableHead className="text-right">Revenus</TableHead>
                                            <TableHead className="text-right">Produits</TableHead>
                                            <TableHead className="text-right">Commandes</TableHead>
                                            <TableHead className="text-right">Élèves</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {campaignPerformance.map((campaign, index) => (
                                            <TableRow key={index} className="hover:bg-gray-50">
                                                <TableCell>
                                                    <div className="font-medium">{campaign.campaignName}</div>
                                                    {campaign.campaignNumber > 0 && (
                                                        <div className="text-xs text-gray-500">#{campaign.campaignNumber}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div>{campaign.schoolName}</div>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-green-600">
                                                    {formatCurrency(campaign.totalRevenue)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatNumber(campaign.totalUnits)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatNumber(campaign.totalOrders)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatNumber(campaign.studentCount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Products */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Produits les Plus Vendus
                        </CardTitle>
                        <CardDescription>
                            Top 10 des produits par revenus
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {productPerformance.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-sm text-gray-500">
                                    Aucune donnée disponible.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Rang</TableHead>
                                            <TableHead>Produit</TableHead>
                                            <TableHead className="text-right">Quantité</TableHead>
                                            <TableHead className="text-right">Revenus</TableHead>
                                            <TableHead className="text-right">Commandes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {productPerformance.slice(0, 10).map((product, index) => (
                                            <TableRow key={index} className="hover:bg-gray-50">
                                                <TableCell>
                                                    <Badge variant={index < 3 ? "default" : "outline"}>
                                                        #{index + 1}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatNumber(product.totalQuantity)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-green-600">
                                                    {formatCurrency(product.totalRevenue)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatNumber(product.orderCount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Customers */}
                {recurringCustomers.topCustomers && recurringCustomers.topCustomers.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Meilleurs Clients
                            </CardTitle>
                            <CardDescription>
                                Clients avec le plus de commandes
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-900">
                                        {formatNumber(recurringCustomers.totalCustomers || 0)}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">Clients totaux</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {formatNumber(recurringCustomers.returningCustomers || 0)}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">Clients récurrents</div>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {(recurringCustomers.returningCustomerRate || 0).toFixed(1)}%
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">Taux de fidélité</div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Client</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="text-right">Commandes</TableHead>
                                            <TableHead className="text-right">Total Dépensé</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recurringCustomers.topCustomers.slice(0, 10).map((customer, index) => (
                                            <TableRow key={index} className="hover:bg-gray-50">
                                                <TableCell className="font-medium">{customer.customerName}</TableCell>
                                                <TableCell className="text-gray-600">{customer.email}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge>{customer.orderCount}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatCurrency(customer.totalSpent)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                        </Card>
                )}

                {/* Enrollment Issues - Only show if there are problems */}
                {analytics?.enrollmentDiagnostics && (
                    (analytics.enrollmentDiagnostics.campaignsWithLowEnrollment?.length > 0 ||
                        analytics.enrollmentDiagnostics.studentsWithOrdersButNotEnrolled?.length > 0) && (
                        <Card className="border-orange-200 bg-orange-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-orange-900">
                                    <AlertTriangle className="h-5 w-5" />
                                    Problèmes Détectés
                                </CardTitle>
                                <CardDescription>
                                    Points d'attention nécessitant votre action
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {analytics.enrollmentDiagnostics.campaignsWithLowEnrollment?.length > 0 && (
                                    <div>
                                        <h4 className="font-medium text-orange-900 mb-2">
                                            Campagnes avec faible inscription ({analytics.enrollmentDiagnostics.campaignsWithLowEnrollment.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {analytics.enrollmentDiagnostics.campaignsWithLowEnrollment.slice(0, 5).map((campaign, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                                                    <span className="text-sm">{campaign.campaignName} - {campaign.schoolName}</span>
                                                    <Badge variant="outline" className="text-orange-700">
                                                        {campaign.enrollmentRate.toFixed(1)}% inscrits
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {analytics.enrollmentDiagnostics.studentsWithOrdersButNotEnrolled?.length > 0 && (
                                    <div>
                                        <h4 className="font-medium text-orange-900 mb-2">
                                            Élèves avec commandes mais non inscrits ({analytics.enrollmentDiagnostics.studentsWithOrdersButNotEnrolled.length})
                                        </h4>
                                        <p className="text-sm text-orange-700">
                                            Ces élèves ont passé des commandes mais ne sont pas inscrits à la campagne.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                )}

                {/* No Issues Message */}
                {analytics?.enrollmentDiagnostics &&
                    (!analytics.enrollmentDiagnostics.campaignsWithLowEnrollment || analytics.enrollmentDiagnostics.campaignsWithLowEnrollment.length === 0) &&
                    (!analytics.enrollmentDiagnostics.studentsWithOrdersButNotEnrolled || analytics.enrollmentDiagnostics.studentsWithOrdersButNotEnrolled.length === 0) && (
                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
                                    <p className="text-lg font-medium text-green-900">Tout fonctionne bien!</p>
                                    <p className="text-sm text-green-700 mt-2">
                                        Aucun problème détecté dans vos campagnes.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AnalyticsPage;
