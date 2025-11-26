import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import SupplierStats from '../../components/Dashboard/Supplier/SupplierStats';
import SchoolsTable from '../../components/Dashboard/Supplier/SchoolsTable';
import ReviewsSection from '../../components/Dashboard/Supplier/ReviewsSection';
import { useSupplierSchools } from '../../hooks/useSupplierSchools';
import { useSupplierStats } from '../../hooks/useSupplierStats';
import { getSupplierSchoolsSSR, getSupplierStatsSSR, getSupplierIdSSR } from '../../lib/supplierDashboardSSR';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Building2,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    ShoppingCart,
    ArrowRight,
    RefreshCw,
    BarChart3,
    ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

const DashboardSupplier = ({ initialSchools, initialStats, initialSupplierId }) => {
    const router = useRouter();
    const [periode, setPeriode] = useState('mois');
    const { schools: clientSchools, loading: schoolsLoading, refreshSchools } = useSupplierSchools();
    const { stats: clientStats, loading: statsLoading, refreshStats } = useSupplierStats(periode);

    // Use SSR data initially, switch to client-side data when refreshing
    const [useSSRData, setUseSSRData] = useState(true);
    const schools = useSSRData && initialSchools ? initialSchools : clientSchools;
    const stats = useSSRData && initialStats ? initialStats : clientStats;
    const supplierId = initialSupplierId || null;

    const [isRefreshing, setIsRefreshing] = useState(false);

    // Switch to client-side data when user refreshes
    useEffect(() => {
        if (isRefreshing) {
            setUseSSRData(false);
        }
    }, [isRefreshing]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([refreshSchools(), refreshStats()]);
            toast.success('Données actualisées');
        } catch (error) {
            toast.error('Erreur lors de l\'actualisation');
        } finally {
            setIsRefreshing(false);
        }
    };

    // School approval/rejection removed - all schools are now auto-approved

    const handleDeactivateSchool = async (school) => {
        try {
            const response = await fetch(`/api/schools/${school._id}/deactivate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Désactivation temporaire' })
            });

            if (response.ok) {
                toast.success(`École "${school.name}" désactivée`);
                await Promise.all([refreshSchools(), refreshStats()]);
            }
        } catch (error) {
            toast.error('Erreur lors de la désactivation');
        }
    };

    const handleReactivateSchool = async (school) => {
        try {
            const response = await fetch(`/api/schools/${school._id}/reactivate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                toast.success(`École "${school.name}" réactivée`);
                await Promise.all([refreshSchools(), refreshStats()]);
            }
        } catch (error) {
            toast.error('Erreur lors de la réactivation');
        }
    };

    const handleViewDetails = (school) => {
        router.push(`/dashboard-supplier/schools/${school._id}`);
    };

    const handleApproveCampaign = async (campaignId) => {
        try {
            const response = await fetch(`/api/campaigns/${campaignId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                toast.success('Campagne passée en mode production');
                await Promise.all([refreshSchools(), refreshStats()]);
            }
        } catch (error) {
            toast.error('Erreur lors de l\'approbation');
        }
    };

    const handleRejectCampaign = async (campaignId, reason = 'Rejetée par le fournisseur') => {
        try {
            const response = await fetch(`/api/campaigns/${campaignId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                toast.success('Campagne rejetée');
                await Promise.all([refreshSchools(), refreshStats()]);
            }
        } catch (error) {
            toast.error('Erreur lors du rejet');
        }
    };

    const handleUnapproveCampaign = async (campaignId) => {
        try {
            const response = await fetch(`/api/supplier/campaigns/${campaignId}/unapprove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                toast.success('Campagne repassée en mode test');
                await Promise.all([refreshSchools(), refreshStats()]);
            }
        } catch (error) {
            toast.error('Erreur lors de la désapprobation');
        }
    };

    // Schools are now auto-approved, no pending schools
    const activeCampaigns = schools.filter(s => s.activeCampaign && s.activeCampaign.status === 'active').length;

    // Calculate growth percentages (mock data - replace with real calculations)
    const salesGrowth = '+12.5%';
    const ordersGrowth = '+8.2%';
    const schoolsGrowth = '+3.1%';
    const revenueGrowth = '+15.3%';

    return (
        <DashboardLayout>
            <div className="space-y-4 sm:space-y-6">
                {/* Hero Section with Key Metrics */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-4 sm:p-5 md:p-6 lg:p-8 text-white shadow-2xl"
                >
                    <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
                    <div className="relative z-10">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 md:gap-6">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold mb-1 sm:mb-2">Tableau de bord Jappuie</h1>
                                <p className="text-blue-100 text-xs sm:text-sm md:text-base xl:text-lg">
                                    Bienvenue sur votre espace de gestion des campagnes de financement
                                </p>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 w-full xl:w-auto">
                                <Button
                                    variant="secondary"
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    size="sm"
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    <span className="hidden sm:inline">Actualiser</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => router.push('/dashboard-supplier/analytics')}
                                    size="sm"
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3"
                                >
                                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Analytics</span>
                                </Button>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-6 md:mt-8">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white/10 backdrop-blur-sm rounded-md sm:rounded-lg md:rounded-xl p-2.5 sm:p-3 md:p-4 border border-white/20"
                            >
                                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-200" />
                                    <Badge className="bg-green-500/20 text-green-100 border-green-400/30 text-[10px] sm:text-xs px-1 sm:px-1.5">
                                        <ArrowUpRight className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 mr-0.5" />
                                        <span className="hidden sm:inline">{salesGrowth}</span>
                                    </Badge>
                                </div>
                                <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold truncate">{stats.totalVentes?.toLocaleString('fr-CA') || 0} $</div>
                                <div className="text-[10px] sm:text-xs lg:text-sm text-blue-200 mt-0.5 sm:mt-1">Ventes totales</div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white/10 backdrop-blur-sm rounded-md sm:rounded-lg md:rounded-xl p-2.5 sm:p-3 md:p-4 border border-white/20"
                            >
                                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                    <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-200" />
                                    <Badge className="bg-green-500/20 text-green-100 border-green-400/30 text-[10px] sm:text-xs px-1 sm:px-1.5">
                                        <ArrowUpRight className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 mr-0.5" />
                                        <span className="hidden sm:inline">{ordersGrowth}</span>
                                    </Badge>
                                </div>
                                <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold">{stats.nombreCommandes?.toLocaleString('fr-CA') || 0}</div>
                                <div className="text-[10px] sm:text-xs lg:text-sm text-blue-200 mt-0.5 sm:mt-1">Commandes</div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white/10 backdrop-blur-sm rounded-md sm:rounded-lg md:rounded-xl p-2.5 sm:p-3 md:p-4 border border-white/20"
                            >
                                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                    <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-200" />
                                    <Badge className="bg-green-500/20 text-green-100 border-green-400/30 text-[10px] sm:text-xs px-1 sm:px-1.5">
                                        <ArrowUpRight className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 mr-0.5" />
                                        <span className="hidden sm:inline">{schoolsGrowth}</span>
                                    </Badge>
                                </div>
                                <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold">{stats.ecolesActives || 0}</div>
                                <div className="text-[10px] sm:text-xs lg:text-sm text-blue-200 mt-0.5 sm:mt-1">Écoles actives</div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white/10 backdrop-blur-sm rounded-md sm:rounded-lg md:rounded-xl p-2.5 sm:p-3 md:p-4 border border-white/20"
                            >
                                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-200" />
                                    <Badge className="bg-green-500/20 text-green-100 border-green-400/30 text-[10px] sm:text-xs px-1 sm:px-1.5">
                                        <ArrowUpRight className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 mr-0.5" />
                                        <span className="hidden sm:inline">{revenueGrowth}</span>
                                    </Badge>
                                </div>
                                <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold truncate">{stats.revenus?.toLocaleString('fr-CA') || 0} $</div>
                                <div className="text-[10px] sm:text-xs lg:text-sm text-blue-200 mt-0.5 sm:mt-1">Revenus</div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>


                {/* Performance Overview */}
                <SupplierStats
                    stats={stats}
                    loading={statsLoading}
                    periode={periode}
                    onPeriodeChange={setPeriode}
                    onRefresh={refreshStats}
                />

                {/* Schools Table - Full Width */}
                <div id="schools-table">
                    <SchoolsTable
                        schools={schools}
                        loading={schoolsLoading}
                        onRefresh={refreshSchools}
                        onDeactivate={handleDeactivateSchool}
                        onReactivate={handleReactivateSchool}
                        onViewDetails={handleViewDetails}
                        onApproveCampaign={handleApproveCampaign}
                        onRejectCampaign={handleRejectCampaign}
                        onUnapproveCampaign={handleUnapproveCampaign}
                    />
                </div>
            </div>

            {/* Reviews Section */}
            {supplierId && (
                <div className="mt-8" id="reviews">
                    <ReviewsSection supplierId={supplierId} />
                </div>
            )}
        </DashboardLayout>
    );
};

export default DashboardSupplier;

// Server-Side Rendering
export async function getServerSideProps(context) {
    const session = await getServerSession(context.req, context.res, authOptions);

    // Redirect if not authenticated
    if (!session) {
        return {
            redirect: {
                destination: '/connexion',
                permanent: false
            }
        };
    }

    // Redirect if not supplier
    if (session.user.role !== 'supplier') {
        return {
            redirect: {
                destination: '/dashboard',
                permanent: false
            }
        };
    }

    try {
        // Fetch data server-side
        const [schoolsData, statsData, supplierIdData] = await Promise.all([
            getSupplierSchoolsSSR(context.req),
            getSupplierStatsSSR(context.req, 'mois'),
            getSupplierIdSSR(context.req)
        ]);

        return {
            props: {
                initialSchools: schoolsData.schools || [],
                initialStats: statsData.stats || null,
                initialSupplierId: supplierIdData.supplierId || null
            }
        };
    } catch (error) {
        console.error('Error in getServerSideProps (supplier dashboard):', error);
        return {
            props: {
                initialSchools: [],
                initialStats: null,
                initialSupplierId: null
            }
        };
    }
}
