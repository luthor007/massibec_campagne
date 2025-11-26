import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ShoppingBag, Percent, Package, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierManagement() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ markup: '', handlesShipping: false });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/suppliers');
            if (!response.ok) {
                throw new Error('Failed to fetch suppliers');
            }
            const data = await response.json();
            setSuppliers(data.suppliers || []);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            toast.error('Erreur lors du chargement des fournisseurs');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (supplier) => {
        setEditingId(supplier._id);
        setEditForm({
            markup: supplier.markup || 5,
            handlesShipping: supplier.handlesShipping || false
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({ markup: '', handlesShipping: false });
    };

    const handleSave = async (supplierId) => {
        try {
            const markup = parseFloat(editForm.markup);
            if (isNaN(markup) || markup < 0 || markup > 100) {
                toast.error('Le markup doit être un nombre entre 0 et 100');
                return;
            }

            const response = await fetch('/api/admin/suppliers', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    supplierId,
                    markup,
                    handlesShipping: editForm.handlesShipping
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update supplier');
            }

            toast.success('Paramètres du fournisseur mis à jour avec succès');
            setEditingId(null);
            fetchSuppliers();
        } catch (error) {
            console.error('Error updating supplier:', error);
            toast.error(error.message || 'Erreur lors de la mise à jour');
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    <CardTitle>Gestion des Fournisseurs</CardTitle>
                </div>
                <CardDescription>
                    Configurez le markup et les paramètres d'expédition pour chaque fournisseur
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Markup (%)</TableHead>
                                <TableHead>Gère l'expédition</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suppliers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                        Aucun fournisseur trouvé
                                    </TableCell>
                                </TableRow>
                            ) : (
                                suppliers.map((supplier) => (
                                    <TableRow key={supplier._id}>
                                        <TableCell className="font-medium">{supplier.name}</TableCell>
                                        <TableCell>{supplier.email}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={supplier.status === 'active' ? 'default' : 'secondary'}
                                            >
                                                {supplier.status === 'active' ? 'Actif' : 'Inactif'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {editingId === supplier._id ? (
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={editForm.markup}
                                                        onChange={(e) =>
                                                            setEditForm({ ...editForm, markup: e.target.value })
                                                        }
                                                        className="w-20"
                                                    />
                                                    <span className="text-sm text-gray-500">%</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Percent className="h-4 w-4 text-gray-400" />
                                                    <span>{supplier.markup}%</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {editingId === supplier._id ? (
                                                <Switch
                                                    checked={editForm.handlesShipping}
                                                    onCheckedChange={(checked) =>
                                                        setEditForm({ ...editForm, handlesShipping: checked })
                                                    }
                                                />
                                            ) : (
                                                <Badge
                                                    variant={supplier.handlesShipping ? 'default' : 'outline'}
                                                >
                                                    {supplier.handlesShipping ? (
                                                        <div className="flex items-center gap-1">
                                                            <Package className="h-3 w-3" />
                                                            Oui
                                                        </div>
                                                    ) : (
                                                        'Non'
                                                    )}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {editingId === supplier._id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={handleCancel}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSave(supplier._id)}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEdit(supplier)}
                                                >
                                                    Modifier
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">Note importante:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>
                            • <strong>Markup:</strong> Pourcentage de marge appliqué aux prix du fournisseur (par défaut: 5%)
                        </li>
                        <li>
                            • <strong>Gère l'expédition:</strong> Si activé, "Prix pickup" sera remplacé par "Prix livrée" dans l'interface
                        </li>
                        <li>
                            • Les changements s'appliquent immédiatement à tous les produits du fournisseur
                        </li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
