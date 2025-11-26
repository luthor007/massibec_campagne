import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users,
    School,
    ShoppingBag,
    TrendingUp,
    DollarSign,
    Percent,
    Package,
    BarChart3
} from 'lucide-react';

export default function AnalyticsDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/analytics');
            if (response.ok) {
                const analytics = await response.json();
                setData(analytics);
            } else {
                console.error('Error fetching analytics');
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Chargement des analytics...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Erreur lors du chargement des données</p>
            </div>
        );
    }

    const { conversionRates, ltvMetrics, funnelAnalytics, platformMetrics } = data;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Analytics & Métriques</h2>

            {/* Platform Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Utilisateurs</p>
                                <p className="text-2xl font-bold">{platformMetrics.totalUsers}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Écoles</p>
                                <p className="text-2xl font-bold">{platformMetrics.totalSchools}</p>
                            </div>
                            <School className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Fournisseurs</p>
                                <p className="text-2xl font-bold">{platformMetrics.totalSuppliers}</p>
                            </div>
                            <Package className="h-8 w-8 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Revenu Total</p>
                                <p className="text-2xl font-bold">
                                    ${platformMetrics.totalRevenue.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Conversion Rates */}
            <Card>
                <CardHeader>
                    <CardTitle>Taux de Conversion</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Students */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                Élèves
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Total Utilisateurs:</span>
                                    <span className="font-semibold">{conversionRates.students.totalUsers}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Visites Landing:</span>
                                    <span className="font-semibold">{conversionRates.students.landingVisits || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Landing → Inscription:</span>
                                    <span className="font-semibold">{conversionRates.students.landingToRegistration.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Page Inscription → Début:</span>
                                    <span className="font-semibold">{conversionRates.students.registrationPageToStarted.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Début → Complété:</span>
                                    <span className="font-semibold">{conversionRates.students.startedToCompleted.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Inscription → Vérifié:</span>
                                    <span className="font-semibold">{conversionRates.students.registrationToVerified.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Vérifié → Campagne:</span>
                                    <span className="font-semibold">{conversionRates.students.verifiedToCampaign.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Campagne → Onboarding:</span>
                                    <span className="font-semibold">{conversionRates.students.campaignToOnboarding.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Onboarding → Checkout:</span>
                                    <span className="font-semibold">{conversionRates.students.onboardingToCheckout.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Checkout → Paiement:</span>
                                    <span className="font-semibold">{conversionRates.students.checkoutToPayment.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span className="text-sm font-semibold">Conversion Globale:</span>
                                    <span className="font-bold text-blue-600">{conversionRates.students.overallConversion.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Schools */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <School className="h-5 w-5 text-green-600" />
                                Écoles
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Total Utilisateurs:</span>
                                    <span className="font-semibold">{conversionRates.schools.totalUsers}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Visites Landing:</span>
                                    <span className="font-semibold">{conversionRates.schools.landingVisits || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Landing → Inscription:</span>
                                    <span className="font-semibold">{conversionRates.schools.landingToRegistration.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Page Inscription → Début:</span>
                                    <span className="font-semibold">{conversionRates.schools.registrationPageToStarted.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Début → Complété:</span>
                                    <span className="font-semibold">{conversionRates.schools.startedToCompleted.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Inscription → Vérifié:</span>
                                    <span className="font-semibold">{conversionRates.schools.registrationToVerified.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Vérifié → Campagne:</span>
                                    <span className="font-semibold">{conversionRates.schools.verifiedToCampaign.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Campagne → Onboarding:</span>
                                    <span className="font-semibold">{conversionRates.schools.campaignToOnboarding.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span className="text-sm font-semibold">Conversion Globale:</span>
                                    <span className="font-bold text-green-600">{conversionRates.schools.overallConversion.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Suppliers */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-purple-600" />
                                Fournisseurs
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Total Utilisateurs:</span>
                                    <span className="font-semibold">{conversionRates.suppliers.totalUsers}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Visites Landing:</span>
                                    <span className="font-semibold">{conversionRates.suppliers.landingVisits || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Landing → Inscription:</span>
                                    <span className="font-semibold">{conversionRates.suppliers.landingToRegistration.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Page Inscription → Début:</span>
                                    <span className="font-semibold">{conversionRates.suppliers.registrationPageToStarted.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Début → Complété:</span>
                                    <span className="font-semibold">{conversionRates.suppliers.startedToCompleted.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Inscription → Vérifié:</span>
                                    <span className="font-semibold">{conversionRates.suppliers.registrationToVerified.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span className="text-sm font-semibold">Conversion Globale:</span>
                                    <span className="font-bold text-purple-600">{conversionRates.suppliers.overallConversion.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lifetime Value & Gross Profit */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Students LTV */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            LTV Élèves
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600">LTV Moyen</p>
                            <p className="text-2xl font-bold text-blue-600">
                                ${ltvMetrics.students.averageLTV.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Profit Brut Moyen</p>
                            <p className="text-2xl font-bold text-green-600">
                                ${ltvMetrics.students.averageGrossProfit.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="pt-4 border-t">
                            <p className="text-sm text-gray-600">Total Élèves: {ltvMetrics.students.totalUsers}</p>
                            <p className="text-sm text-gray-600">Revenu Total: ${ltvMetrics.students.totalRevenue.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Schools LTV */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <School className="h-5 w-5 text-green-600" />
                            LTV Écoles
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600">LTV Moyen</p>
                            <p className="text-2xl font-bold text-blue-600">
                                ${ltvMetrics.schools.averageLTV.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Profit Brut Moyen</p>
                            <p className="text-2xl font-bold text-green-600">
                                ${ltvMetrics.schools.averageGrossProfit.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="pt-4 border-t">
                            <p className="text-sm text-gray-600">Total Écoles: {ltvMetrics.schools.totalSchools}</p>
                            <p className="text-sm text-gray-600">Revenu Total: ${ltvMetrics.schools.totalRevenue.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Suppliers LTV */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-purple-600" />
                            LTV Fournisseurs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600">LTV Moyen</p>
                            <p className="text-2xl font-bold text-blue-600">
                                ${ltvMetrics.suppliers.averageLTV.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Profit Brut Moyen</p>
                            <p className="text-2xl font-bold text-green-600">
                                ${ltvMetrics.suppliers.averageGrossProfit.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="pt-4 border-t">
                            <p className="text-sm text-gray-600">Total Fournisseurs: {ltvMetrics.suppliers.totalSuppliers}</p>
                            <p className="text-sm text-gray-600">Revenu Total: ${ltvMetrics.suppliers.totalRevenue.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Funnel Analytics */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Analytics du Funnel
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Sessions Uniques:</span>
                            <span className="font-semibold">{funnelAnalytics.totalUniqueSessions}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Événements:</span>
                            <span className="font-semibold">{funnelAnalytics.totalEvents}</span>
                        </div>
                        <div className="pt-4 border-t">
                            <h4 className="font-semibold mb-2">Étapes du Funnel:</h4>
                            <div className="space-y-2">
                                {Object.entries(funnelAnalytics.steps).map(([step, data]) => (
                                    <div key={step} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 capitalize">{step.replace(/_/g, ' ')}:</span>
                                        <div className="flex gap-4">
                                            <span>Total: {data.total}</span>
                                            <span>Sessions: {data.uniqueSessions}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

