'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { FileText, Loader2, Search, Pencil, X, Trash2, Plus, Minus } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

// Import API functions
import { fetchKPIs, fetchDeliveries, generateDeliveryReport } from '@/utils/api'

export default function Overview() {
  const [periode, setPeriode] = useState('mois')
  const [kpis, setKpis] = useState([])
  const [livraisons, setLivraisons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  const [searchFilters, setSearchFilters] = useState({
    ecole: '',
    statut: 'tous',
    dateDebut: '',
    dateFin: ''
  });

  const [selectedLivraison, setSelectedLivraison] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [editingProducts, setEditingProducts] = useState(false);
  const [modifiedProducts, setModifiedProducts] = useState([]);
  const [selectedReportSchoolId, setSelectedReportSchoolId] = useState('');

  const schoolOptions = useMemo(() => {
    const map = new Map();
    livraisons.forEach((livraison) => {
      if (livraison.schoolId && !map.has(livraison.schoolId)) {
        map.set(livraison.schoolId, livraison.school || 'École');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [livraisons]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const deliveriesData = await fetchDeliveries()
        setLivraisons(deliveriesData)
      } catch (err) {
        console.error(err)
        setError('Erreur lors de la récupération des données.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [periode])

  useEffect(() => {
    if (!schoolOptions.length) {
      setSelectedReportSchoolId('');
      return;
    }

    if (!schoolOptions.some((option) => option.id === selectedReportSchoolId)) {
      setSelectedReportSchoolId(schoolOptions[0].id);
    }
  }, [schoolOptions, selectedReportSchoolId])

  const filteredLivraisons = useMemo(() => {
    return livraisons.filter(livraison => {
      const matchEcole = !searchFilters.ecole ||
        (livraison?.school || '').toLowerCase().includes(searchFilters.ecole.toLowerCase());

      const matchStatut = searchFilters.statut === 'tous' ||
        livraison?.status === searchFilters.statut;

      const dateMatch = (!searchFilters.dateDebut ||
        new Date(livraison?.createdAt || '') >= new Date(searchFilters.dateDebut)) &&
        (!searchFilters.dateFin ||
          new Date(livraison?.createdAt || '') <= new Date(searchFilters.dateFin));

      return matchEcole && matchStatut && dateMatch;
    });
  }, [livraisons, searchFilters]);

  const handleGenererRapport = async () => {
    if (!selectedReportSchoolId) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner une école avant de générer le rapport.",
        duration: 3000,
        variant: "destructive",
      })
      return
    }

    try {
      await generateDeliveryReport(selectedReportSchoolId)
      const schoolName = schoolOptions.find((option) => option.id === selectedReportSchoolId)?.name
      toast({
        title: "Rapport généré",
        description: schoolName
          ? `Le rapport de livraisons pour ${schoolName} a été téléchargé.`
          : "Le rapport des livraisons a été généré avec succès.",
        duration: 3000,
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Erreur",
        description: err.message || "Impossible de générer le rapport.",
        duration: 3000,
        variant: "destructive",
      })
    }
  }

  const handleUpdateOrder = async (orderId, updatedProducts) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: updatedProducts })
      });

      if (!response.ok) throw new Error('Failed to update order');

      // Mettre à jour l'état local
      setLivraisons(livraisons.map(order =>
        order._id === orderId ? { ...order, products: updatedProducts } : order
      ));

      toast({
        title: "Commande mise à jour",
        description: "Les produits ont été mis à jour avec succès.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la commande.",
        variant: "destructive",
        duration: 3000,
      });
    }
    setEditingOrder(null);
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete order');

      setLivraisons(livraisons.filter(order => order._id !== orderId));

      toast({
        title: "Commande supprimée",
        description: "La commande a été supprimée avec succès.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la commande.",
        variant: "destructive",
        duration: 3000,
      });
    }
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleDetailsClick = async (livraison) => {
    try {
      if (!livraison.user) {
        throw new Error('No user ID associated with this order');
      }

      const userResponse = await fetch(`/api/users/${livraison.user}`);
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userInfo = await userResponse.json();
      setSelectedLivraison({
        ...livraison,
        userInfo
      });
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Error fetching user info:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les informations de l'utilisateur.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleProductEdit = (products) => {
    setModifiedProducts(products);
    setEditingProducts(true);
  };

  const handleUpdateProducts = async (orderId, products) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products })
      });

      if (!response.ok) throw new Error('Failed to update products');

      setSelectedLivraison(prev => ({
        ...prev,
        products
      }));

      toast({
        title: "Produits mis à jour",
        description: "Les produits ont été mis à jour avec succès.",
        duration: 3000,
      });

      setEditingProducts(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les produits.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
        <span className="ml-2">Chargement...</span>
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <Select value={periode} onValueChange={setPeriode}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sélectionner la période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jour">Aujourd'hui</SelectItem>
            <SelectItem value="semaine">Cette semaine</SelectItem>
            <SelectItem value="mois">Ce mois</SelectItem>
            <SelectItem value="annee">Cette année</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aperçu des Commandes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>École</Label>
              <Input
                placeholder="Rechercher une école..."
                value={searchFilters.ecole}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, ecole: e.target.value }))}
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={searchFilters.statut}
                onValueChange={(value) => setSearchFilters(prev => ({ ...prev, statut: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous</SelectItem>
                  <SelectItem value="En attente">En attente</SelectItem>
                  <SelectItem value="Payé">Payé</SelectItem>
                  <SelectItem value="Commandé">Commandé</SelectItem>
                  <SelectItem value="Complété">Complété</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={searchFilters.dateDebut}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, dateDebut: e.target.value }))}
                />
                <Input
                  type="date"
                  value={searchFilters.dateFin}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, dateFin: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>École</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLivraisons.map((livraison, index) => (
                  <TableRow key={index}>
                    <TableCell>{livraison?.school || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          livraison?.status === 'En attente' ? 'default' :
                            livraison?.status === 'Payé' ? 'secondary' :
                              livraison?.status === 'Commandé' ? 'primary' :
                                'outline'
                        }
                      >
                        {livraison?.status || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {livraison?.createdAt ?
                        new Date(livraison.createdAt).toLocaleDateString() :
                        'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDetailsClick(livraison)}
                        >
                          Détails
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingOrder(editingOrder === livraison._id ? null : livraison._id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setOrderToDelete(livraison._id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-4xl bg-white">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? 'Modifier la Commande' : 'Détails de la Commande'}
                </DialogTitle>
              </DialogHeader>

              {selectedLivraison && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Information de la Commande</h3>
                      <div className="space-y-2">
                        <p><strong>ID:</strong> {selectedLivraison.orderId}</p>
                        <p><strong>École:</strong> {selectedLivraison.school}</p>
                        <p><strong>Montant Total:</strong> {selectedLivraison.totalAmount}$</p>
                        <p><strong>Date:</strong> {new Date(selectedLivraison.createdAt).toLocaleDateString()}</p>
                        {isEditing ? (
                          <Select
                            value={editedOrder?.status || selectedLivraison.status}
                            onValueChange={(value) => setEditedOrder(prev => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Statut" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="En attente">En attente</SelectItem>
                              <SelectItem value="Payé">Payé</SelectItem>
                              <SelectItem value="Commandé">Commandé</SelectItem>
                              <SelectItem value="Complété">Complété</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge>{selectedLivraison.status}</Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Information du Vendeur</h3>
                      <div className="space-y-2">
                        <p><strong>Nom:</strong> {selectedLivraison.userInfo?.name}</p>
                        <p><strong>Email:</strong> {selectedLivraison.userInfo?.email}</p>
                        {selectedLivraison.userInfo?.role === 'student' ? (
                          <>
                            <p><strong>Type:</strong> Étudiant</p>
                            <p><strong>Objectif:</strong> {selectedLivraison.userInfo?.objectifPersonnel}$</p>
                            <p><strong>Parent:</strong> {selectedLivraison.userInfo?.parentInfo?.nomParent} {selectedLivraison.userInfo?.parentInfo?.prenomParent}</p>
                            <p><strong>Téléphone:</strong> {selectedLivraison.userInfo?.parentInfo?.telephone}</p>
                          </>
                        ) : (
                          <>
                            <p><strong>Type:</strong> Gestionnaire</p>
                            <p><strong>Fonction:</strong> {selectedLivraison.userInfo?.schoolManagerInfo?.titreOuFonction}</p>
                            <p><strong>Téléphone:</strong> {selectedLivraison.userInfo?.schoolManagerInfo?.telephone}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold">Produits</h3>
                      {!editingProducts ? (
                        <Button onClick={() => handleProductEdit(selectedLivraison.products)}>
                          Modifier les produits
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => {
                            setEditingProducts(false);
                            setModifiedProducts([]);
                          }}>
                            Annuler
                          </Button>
                          <Button onClick={() => handleUpdateProducts(selectedLivraison._id, modifiedProducts)}>
                            Sauvegarder
                          </Button>
                        </div>
                      )}
                    </div>

                    {editingProducts ? (
                      <div className="space-y-4">
                        {modifiedProducts.map((product, index) => (
                          <div key={index} className="flex items-center gap-4 p-2 border rounded">
                            <Input
                              value={product.productName}
                              onChange={(e) => {
                                const updated = [...modifiedProducts];
                                updated[index] = { ...product, productName: e.target.value };
                                setModifiedProducts(updated);
                              }}
                              className="flex-grow"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const updated = [...modifiedProducts];
                                  updated[index] = { ...product, quantity: Math.max(1, product.quantity - 1) };
                                  setModifiedProducts(updated);
                                }}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                value={product.quantity}
                                onChange={(e) => {
                                  const updated = [...modifiedProducts];
                                  updated[index] = { ...product, quantity: parseInt(e.target.value) || 1 };
                                  setModifiedProducts(updated);
                                }}
                                className="w-20 text-center"
                                min="1"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const updated = [...modifiedProducts];
                                  updated[index] = { ...product, quantity: product.quantity + 1 };
                                  setModifiedProducts(updated);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setModifiedProducts(modifiedProducts.filter((_, i) => i !== index));
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          onClick={() => {
                            setModifiedProducts([
                              ...modifiedProducts,
                              { productName: '', quantity: 1, productPrice: 0 }
                            ]);
                          }}
                          className="w-full"
                        >
                          Ajouter un produit
                        </Button>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead>Quantité</TableHead>
                            <TableHead>Prix unitaire</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLivraison.products.map((product, index) => (
                            <TableRow key={index}>
                              <TableCell>{product.productName}</TableCell>
                              <TableCell>{product.quantity}</TableCell>
                              <TableCell>{product.productPrice}$</TableCell>
                              <TableCell>{product.quantity * product.productPrice}$</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter>
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Annuler
                    </Button>
                    <Button onClick={() => handleUpdateOrder(selectedLivraison._id, editedOrder)}>
                      Sauvegarder
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                      Fermer
                    </Button>
                    <Button onClick={() => setIsEditing(true)}>
                      <Pencil className="mr-2 h-4 w-4" /> Modifier
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="sm:w-1/2">
              <Label htmlFor="reportSchool">École pour le rapport</Label>
              <Select
                value={selectedReportSchoolId}
                onValueChange={(value) => setSelectedReportSchoolId(value)}
              >
                <SelectTrigger id="reportSchool">
                  <SelectValue placeholder="Sélectionnez une école" />
                </SelectTrigger>
                <SelectContent>
                  {schoolOptions.length === 0 ? (
                    <SelectItem value="" disabled>
                      Aucune école disponible
                    </SelectItem>
                  ) : (
                    schoolOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenererRapport}
              className="sm:self-end"
              disabled={!selectedReportSchoolId}
            >
              <FileText className="mr-2 h-4 w-4" /> Générer le Rapport des Livraisons
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cela supprimera définitivement la commande.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => orderToDelete && handleDeleteOrder(orderToDelete)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
