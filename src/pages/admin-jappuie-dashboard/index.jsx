import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BarChart3,
    FileText,
    Users,
    School,
    ShoppingBag,
    TrendingUp,
    DollarSign,
    Percent,
    Package,
    UserCog
} from 'lucide-react';
import BlogManagement from '@/components/Admin/BlogManagement';
import AnalyticsDashboard from '@/components/Admin/AnalyticsDashboard';
import AdminManagersManagement from '@/components/Admin/AdminManagersManagement';
import SupplierManagement from '@/components/Admin/SupplierManagement';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('analytics');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/connexion?redirect=/admin-jappuie-dashboard');
            return;
        }

        // Check admin access via API
        const checkAccess = async () => {
            try {
                const response = await fetch('/api/admin/check-access');
                if (!response.ok) {
                    router.push('/');
                    return;
                }
                setLoading(false);
            } catch (error) {
                console.error('Error checking admin access:', error);
                router.push('/');
            }
        };

        checkAccess();
    }, [session, status, router]);

    if (loading || status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Tableau de bord Admin - Jappuie</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Admin</h1>
                                <p className="text-sm text-gray-500">Gestion de la plateforme Jappuie</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-600">{session?.user?.name}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="analytics" className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Analytics & Métriques
                            </TabsTrigger>
                            <TabsTrigger value="blog" className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Gestion du Blog
                            </TabsTrigger>
                            <TabsTrigger value="suppliers" className="flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4" />
                                Fournisseurs
                            </TabsTrigger>
                            <TabsTrigger value="managers" className="flex items-center gap-2">
                                <UserCog className="h-4 w-4" />
                                Gestionnaires
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="analytics" className="space-y-6">
                            <AnalyticsDashboard />
                        </TabsContent>

                        <TabsContent value="blog" className="space-y-6">
                            <BlogManagement />
                        </TabsContent>

                        <TabsContent value="suppliers" className="space-y-6">
                            <SupplierManagement />
                        </TabsContent>

                        <TabsContent value="managers" className="space-y-6">
                            <AdminManagersManagement />
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </>
    );
}

