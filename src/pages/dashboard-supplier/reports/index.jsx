import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportBuilder from '../../../components/Dashboard/Supplier/Reports/ReportBuilder';
import TemplateImporter from '../../../components/Dashboard/Supplier/Reports/TemplateImporter';
import ReportTemplates from '../../../components/Dashboard/Supplier/Reports/ReportTemplates';
import { FileText, Upload, Download, Star, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [activeTab, setActiveTab] = useState('templates');

    // Redirect if not authenticated
    React.useEffect(() => {
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

    const handleGenerateReport = async (options) => {
        try {
            const { format, selectedFields, filters, columnMapping, customColumns } = options;

            // Build query params
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.status) params.append('status', filters.status);
            if (filters.schoolIds) params.append('schoolIds', filters.schoolIds);
            if (filters.campaignIds) params.append('campaignIds', filters.campaignIds);

            const queryString = params.toString();

            // Make POST request to generate endpoint
            const response = await fetch(`/api/supplier/reports/generate${queryString ? '?' + queryString : ''}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    format,
                    selectedFields,
                    columnMapping,
                    customColumns,
                    filters
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erreur lors de la génération');
            }

            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `rapport-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Download file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('Rapport généré avec succès');
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error(error.message || 'Erreur lors de la génération du rapport');
        }
    };

    const handleTemplateMappingComplete = async (options) => {
        try {
            await handleGenerateReport({
                format: 'excel', // Template-based exports are always Excel
                selectedFields: [],
                filters: {},
                columnMapping: options.columnMapping,
                customColumns: options.customColumns
            });
        } catch (error) {
            console.error('Error generating report from template:', error);
            toast.error('Erreur lors de la génération du rapport depuis le template');
        }
    };

    if (status === 'loading' || !session) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Chargement...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Rapports</h1>
                    <p className="text-gray-600 mt-2">
                        Générez des rapports personnalisés en CSV ou Excel avec tous vos données, ou importez un template pour recréer votre format exact.
                    </p>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="templates" className="flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            Templates
                        </TabsTrigger>
                        <TabsTrigger value="builder" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Créer un rapport
                        </TabsTrigger>
                        <TabsTrigger value="template" className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Importer un template
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="templates" className="mt-6">
                        <ReportTemplates onUseTemplate={handleTemplateMappingComplete} />
                    </TabsContent>

                    <TabsContent value="builder" className="mt-6">
                        <ReportBuilder onGenerate={handleGenerateReport} />
                    </TabsContent>

                    <TabsContent value="template" className="mt-6">
                        <TemplateImporter onMappingComplete={handleTemplateMappingComplete} />
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}

