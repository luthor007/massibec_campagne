import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, TrendingUp, ShoppingCart, School, DollarSign, Package, Star } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const TEMPLATES = [
    {
        id: 'orders-detailed',
        name: 'Commandes détaillées',
        description: 'Liste complète de toutes les commandes avec détails produits, clients et bénéfices',
        icon: ShoppingCart,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        fields: [
            { sourceField: 'orderId', targetField: 'Numéro Commande', order: 0 },
            { sourceField: 'orderDate', targetField: 'Date Commande', order: 1 },
            { sourceField: 'orderStatus', targetField: 'Statut', order: 2 },
            { sourceField: 'orderType', targetField: 'Type', order: 3 },
            { sourceField: 'schoolName', targetField: 'École', order: 4 },
            { sourceField: 'schoolCode', targetField: 'Code École', order: 5 },
            { sourceField: 'campaignName', targetField: 'Campagne', order: 6 },
            { sourceField: 'campaignNumber', targetField: 'Numéro Campagne', order: 7 },
            { sourceField: 'customerName', targetField: 'Nom Client', order: 8 },
            { sourceField: 'customerEmail', targetField: 'Email Client', order: 9 },
            { sourceField: 'customerPhone', targetField: 'Téléphone', order: 10 },
            { sourceField: 'productName', targetField: 'Produit', order: 11 },
            { sourceField: 'productQuantity', targetField: 'Quantité', order: 12 },
            { sourceField: 'productPrice', targetField: 'Prix Unitaire', order: 13 },
            { sourceField: 'productCost', targetField: 'Coût Unitaire', order: 14 },
            { sourceField: 'productProfit', targetField: 'Profit Unitaire', order: 15 },
            { sourceField: 'totalAmount', targetField: 'Montant Total', order: 16 },
            { sourceField: 'amountPaid', targetField: 'Montant Payé', order: 17 },
            { sourceField: 'studentCashBenefit', targetField: 'Bénéfice Étudiant Comptant', order: 18 },
            { sourceField: 'studentSchoolAccountBenefit', targetField: 'Bénéfice Compte Scolaire', order: 19 },
            { sourceField: 'schoolProjectBenefit', targetField: 'Bénéfice Projet École', order: 20 },
            { sourceField: 'raffleBenefit', targetField: 'Bénéfice Tirage', order: 21 }
        ]
    },
    {
        id: 'sales-by-product',
        name: 'Ventes par produit',
        description: 'Résumé des ventes groupées par produit avec quantités et revenus totaux',
        icon: Package,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        fields: [
            { sourceField: 'productName', targetField: 'Produit', order: 0 },
            { sourceField: 'productQuantity', targetField: 'Quantité Totale', order: 1 },
            { sourceField: 'productPrice', targetField: 'Prix Unitaire Moyen', order: 2 },
            { sourceField: 'productCost', targetField: 'Coût Unitaire', order: 3 },
            { sourceField: 'productProfit', targetField: 'Profit Unitaire', order: 4 },
            { sourceField: 'totalAmount', targetField: 'Revenus Totaux', order: 5 },
            { sourceField: 'campaignName', targetField: 'Campagne', order: 6 },
            { sourceField: 'schoolName', targetField: 'École', order: 7 }
        ]
    },
    {
        id: 'sales-by-school',
        name: 'Ventes par école',
        description: 'Résumé des ventes groupées par école avec totaux et bénéfices',
        icon: School,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        fields: [
            { sourceField: 'schoolName', targetField: 'École', order: 0 },
            { sourceField: 'schoolCode', targetField: 'Code École', order: 1 },
            { sourceField: 'schoolAddress', targetField: 'Adresse', order: 2 },
            { sourceField: 'schoolPhone', targetField: 'Téléphone', order: 3 },
            { sourceField: 'schoolEmail', targetField: 'Email', order: 4 },
            { sourceField: 'campaignName', targetField: 'Campagne', order: 5 },
            { sourceField: 'campaignNumber', targetField: 'Numéro Campagne', order: 6 },
            { sourceField: 'totalAmount', targetField: 'Revenus Totaux', order: 7 },
            { sourceField: 'totalUnits', targetField: 'Unités Totales', order: 8 },
            { sourceField: 'studentCashBenefit', targetField: 'Bénéfice Étudiant Comptant', order: 9 },
            { sourceField: 'studentSchoolAccountBenefit', targetField: 'Bénéfice Compte Scolaire', order: 10 },
            { sourceField: 'schoolProjectBenefit', targetField: 'Bénéfice Projet École', order: 11 },
            { sourceField: 'raffleBenefit', targetField: 'Bénéfice Tirage', order: 12 }
        ]
    },
    {
        id: 'financial-summary',
        name: 'Résumé financier',
        description: 'Vue d\'ensemble financière avec revenus, coûts, profits et répartitions',
        icon: DollarSign,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        fields: [
            { sourceField: 'orderDate', targetField: 'Date', order: 0 },
            { sourceField: 'orderId', targetField: 'Numéro Commande', order: 1 },
            { sourceField: 'schoolName', targetField: 'École', order: 2 },
            { sourceField: 'campaignName', targetField: 'Campagne', order: 3 },
            { sourceField: 'totalAmount', targetField: 'Revenus', order: 4 },
            { sourceField: 'productCost', targetField: 'Coûts', order: 5 },
            { sourceField: 'productProfit', targetField: 'Profit', order: 6 },
            { sourceField: 'studentCashBenefit', targetField: 'Bénéfice Étudiant Comptant', order: 7 },
            { sourceField: 'studentSchoolAccountBenefit', targetField: 'Bénéfice Compte Scolaire', order: 8 },
            { sourceField: 'schoolProjectBenefit', targetField: 'Bénéfice Projet École', order: 9 },
            { sourceField: 'raffleBenefit', targetField: 'Bénéfice Tirage', order: 10 },
            { sourceField: 'tip', targetField: 'Donations', order: 11 },
            { sourceField: 'amountPaid', targetField: 'Montant Payé', order: 12 },
            { sourceField: 'transferAmount', targetField: 'Montant Transféré', order: 13 }
        ]
    },
    {
        id: 'delivery-schedule',
        name: 'Planification de livraison',
        description: 'Informations de livraison par campagne avec dates et adresses',
        icon: TrendingUp,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        fields: [
            { sourceField: 'campaignName', targetField: 'Campagne', order: 0 },
            { sourceField: 'campaignNumber', targetField: 'Numéro Campagne', order: 1 },
            { sourceField: 'campaignCode', targetField: 'Code Campagne', order: 2 },
            { sourceField: 'schoolName', targetField: 'École', order: 3 },
            { sourceField: 'schoolCode', targetField: 'Code École', order: 4 },
            { sourceField: 'schoolAddress', targetField: 'Adresse École', order: 5 },
            { sourceField: 'schoolPhone', targetField: 'Téléphone École', order: 6 },
            { sourceField: 'schoolEmail', targetField: 'Email École', order: 7 },
            { sourceField: 'campaignStartDate', targetField: 'Date Début', order: 8 },
            { sourceField: 'campaignEndDate', targetField: 'Date Fin', order: 9 },
            { sourceField: 'campaignDeliveryDate', targetField: 'Date Livraison', order: 10 },
            { sourceField: 'totalUnits', targetField: 'Unités Totales', order: 11 },
            { sourceField: 'productName', targetField: 'Produit', order: 12 },
            { sourceField: 'productQuantity', targetField: 'Quantité', order: 13 }
        ]
    }
];

export default function ReportTemplates({ onUseTemplate }) {
    const handleDownloadTemplate = (template) => {
        try {
            // Create empty template with headers
            const headers = template.fields.map(f => f.targetField);
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet([headers]);

            // Set column widths
            const colWidths = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));
            worksheet['!cols'] = colWidths;

            // Style header row (bold)
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                if (!worksheet[cellAddress]) continue;
                worksheet[cellAddress].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: 'E0E0E0' } }
                };
            }

            XLSX.utils.book_append_sheet(workbook, worksheet, template.name);
            const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

            // Download
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `template-${template.id}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Template "${template.name}" téléchargé`);
        } catch (error) {
            console.error('Error downloading template:', error);
            toast.error('Erreur lors du téléchargement du template');
        }
    };

    const handleUseTemplate = async (template) => {
        if (onUseTemplate) {
            await onUseTemplate({
                columnMapping: template.fields,
                customColumns: [],
                templateStructure: {
                    columns: template.fields.map(f => ({ name: f.targetField, order: f.order })),
                    sampleData: [],
                    sheetName: template.name
                }
            });
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold mb-2">Templates prêts à l'emploi</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Téléchargez un template vide ou utilisez-le directement pour générer un rapport avec ce format.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    return (
                        <Card key={template.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${template.bgColor}`}>
                                            <Icon className={`w-5 h-5 ${template.color}`} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{template.name}</CardTitle>
                                            <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadTemplate(template)}
                                        className="flex-1"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Télécharger
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleUseTemplate(template)}
                                        className="flex-1"
                                    >
                                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                                        Utiliser
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

