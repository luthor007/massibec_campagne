import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FieldSelector from './FieldSelector';
import { Download, FileText, FileSpreadsheet, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_FIELDS = {
    orderId: { label: 'Numéro de commande', category: 'Commande', description: 'Identifiant unique de la commande' },
    orderNumber: { label: 'Numéro de commande', category: 'Commande', description: 'Numéro de commande' },
    orderDate: { label: 'Date de commande', category: 'Commande', description: 'Date de création de la commande' },
    orderStatus: { label: 'Statut de commande', category: 'Commande', description: 'Statut: En attente, Payé, Commandé, Complété' },
    orderType: { label: 'Type de commande', category: 'Commande', description: 'Type: Étudiant ou Boutique' },
    schoolName: { label: 'Nom de l\'école', category: 'École', description: 'Nom complet de l\'école' },
    schoolCode: { label: 'Code de l\'école', category: 'École', description: 'Code unique de l\'école' },
    schoolAddress: { label: 'Adresse de l\'école', category: 'École', description: 'Adresse complète de l\'école' },
    schoolPhone: { label: 'Téléphone de l\'école', category: 'École', description: 'Numéro de téléphone' },
    schoolEmail: { label: 'Email de l\'école', category: 'École', description: 'Adresse email' },
    campaignName: { label: 'Nom de la campagne', category: 'Campagne', description: 'Nom de la campagne de financement' },
    campaignNumber: { label: 'Numéro de campagne', category: 'Campagne', description: 'Numéro séquentiel de la campagne' },
    campaignCode: { label: 'Code de campagne', category: 'Campagne', description: 'Code unique de la campagne' },
    campaignStartDate: { label: 'Date de début', category: 'Campagne', description: 'Date de début de la campagne' },
    campaignEndDate: { label: 'Date de fin', category: 'Campagne', description: 'Date de fin de la campagne' },
    campaignDeliveryDate: { label: 'Date de livraison', category: 'Campagne', description: 'Date prévue de livraison' },
    campaignStatus: { label: 'Statut de campagne', category: 'Campagne', description: 'Statut de la campagne' },
    campaignMode: { label: 'Mode de campagne', category: 'Campagne', description: 'Mode: test ou production' },
    campaignFinancialGoal: { label: 'Objectif financier', category: 'Campagne', description: 'Objectif financier de la campagne' },
    customerName: { label: 'Nom du client', category: 'Client', description: 'Nom complet du client/étudiant' },
    customerEmail: { label: 'Email du client', category: 'Client', description: 'Adresse email du client' },
    customerPhone: { label: 'Téléphone du client', category: 'Client', description: 'Numéro de téléphone' },
    productName: { label: 'Nom du produit', category: 'Produit', description: 'Nom du produit commandé' },
    productQuantity: { label: 'Quantité', category: 'Produit', description: 'Quantité commandée' },
    productPrice: { label: 'Prix unitaire', category: 'Produit', description: 'Prix unitaire du produit' },
    productCost: { label: 'Coût unitaire', category: 'Produit', description: 'Coût unitaire pour le fournisseur' },
    productProfit: { label: 'Profit unitaire', category: 'Produit', description: 'Profit par unité' },
    totalAmount: { label: 'Montant total', category: 'Financier', description: 'Montant total de la commande' },
    amountPaid: { label: 'Montant payé', category: 'Financier', description: 'Montant effectivement payé' },
    transferAmount: { label: 'Montant transféré', category: 'Financier', description: 'Montant transféré via Interac' },
    studentCashBenefit: { label: 'Bénéfice étudiant comptant', category: 'Financier', description: 'Bénéfice pour l\'étudiant en comptant' },
    studentSchoolAccountBenefit: { label: 'Bénéfice compte scolaire', category: 'Financier', description: 'Bénéfice pour le compte scolaire' },
    schoolProjectBenefit: { label: 'Bénéfice projet école', category: 'Financier', description: 'Bénéfice pour le projet de l\'école' },
    raffleBenefit: { label: 'Bénéfice tirage', category: 'Financier', description: 'Bénéfice pour le tirage' },
    tip: { label: 'Donation totale', category: 'Financier', description: 'Montant total des donations' },
    tipStudentCash: { label: 'Donation étudiant comptant', category: 'Financier', description: 'Part de donation pour étudiant comptant' },
    tipStudentAccount: { label: 'Donation compte scolaire', category: 'Financier', description: 'Part de donation pour compte scolaire' },
    tipSchoolProject: { label: 'Donation projet école', category: 'Financier', description: 'Part de donation pour projet école' },
    totalUnits: { label: 'Total unités', category: 'Produit', description: 'Nombre total d\'unités' }
};

export default function ReportBuilder({ onGenerate }) {
    const [selectedFields, setSelectedFields] = useState([]);
    const [format, setFormat] = useState('csv');
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: ''
    });
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (selectedFields.length === 0) {
            toast.error('Veuillez sélectionner au moins un champ');
            return;
        }

        setLoading(true);
        try {
            await onGenerate({
                format,
                selectedFields,
                filters
            });
        } catch (error) {
            toast.error('Erreur lors de la génération du rapport');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Filtres
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="startDate">Date de début</Label>
                            <input
                                id="startDate"
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <Label htmlFor="endDate">Date de fin</Label>
                            <input
                                id="endDate"
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <Label htmlFor="status">Statut</Label>
                            <Select value={filters.status || "all"} onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Tous les statuts" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    <SelectItem value="En attente">En attente</SelectItem>
                                    <SelectItem value="Payé">Payé</SelectItem>
                                    <SelectItem value="Commandé">Commandé</SelectItem>
                                    <SelectItem value="Complété">Complété</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Field Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Sélection des champs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <FieldSelector
                        availableFields={AVAILABLE_FIELDS}
                        selectedFields={selectedFields}
                        onFieldsChange={setSelectedFields}
                    />
                </CardContent>
            </Card>

            {/* Format Selection and Generate */}
            <Card>
                <CardHeader>
                    <CardTitle>Options d'export</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <Label>Format de fichier</Label>
                            <div className="flex gap-4 mt-2">
                                <Button
                                    variant={format === 'csv' ? 'default' : 'outline'}
                                    onClick={() => setFormat('csv')}
                                    className="flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4" />
                                    CSV
                                </Button>
                                <Button
                                    variant={format === 'excel' ? 'default' : 'outline'}
                                    onClick={() => setFormat('excel')}
                                    className="flex items-center gap-2"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Excel
                                </Button>
                            </div>
                        </div>
                        <Button
                            onClick={handleGenerate}
                            disabled={loading || selectedFields.length === 0}
                            className="w-full"
                            size="lg"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {loading ? 'Génération en cours...' : 'Générer le rapport'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

