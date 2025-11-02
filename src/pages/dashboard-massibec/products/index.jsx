import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ImageUpload from '../../../components/ImageUpload';
import ProductCard from '../../../components/ProductCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  RefreshCw,
  DollarSign,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Upload,
  Pencil
} from 'lucide-react';

const ProductsPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    image: '',
    productId: '',
    isDefault: false
  });
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [imageDialogOpen, setImageDialogOpen] = useState({});

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/connexion');
      return;
    }
    
    // Vérifier si l'utilisateur a le rôle fournisseur
    if (session.user.role !== 'fournisseur') {
      router.push('/dashboard');
      return;
    }
    
    fetchProducts();
  }, [session, status, router]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products?limit=100', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // The API returns { products: [...], total, page, pages }
        // Products are already sorted by order from the API
        const fetchedProducts = Array.isArray(data.products) ? data.products : [];
        
        // Ensure products have order field and sort by it
        const sortedProducts = fetchedProducts
          .map(p => ({ ...p, order: p.order || 0 }))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setProducts(sortedProducts);
      } else {
        console.error('Erreur lors de la récupération des produits');
        setProducts([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id || editingProduct._id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      
      // Let API handle productId generation if empty
      let submitData = { ...formData };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...submitData,
          price: parseFloat(submitData.price),
          cost: parseFloat(submitData.cost)
        }),
      });

      if (response.ok) {
        showNotification(
          editingProduct ? 'Produit modifié avec succès!' : 'Produit créé avec succès!', 
          'success'
        );
        setShowForm(false);
        setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        cost: '',
        image: '',
        productId: '',
        isDefault: false
      });
        fetchProducts();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('Erreur lors de la sauvegarde du produit', 'error');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        cost: product.cost || '',
        image: product.image || '',
        productId: product.productId || '',
        isDefault: product.isDefault === true
      });
    setShowForm(true);
  };

  const handleDelete = async (productId) => {
    toast('Êtes-vous sûr de vouloir supprimer ce produit?', {
      description: 'Cette action est irréversible.',
      action: {
        label: 'Supprimer',
        onClick: () => {
          performDelete(productId);
        },
      },
      cancel: {
        label: 'Annuler',
        onClick: () => {},
      },
    });
    return;
  };

  const performDelete = async (productId) => {
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showNotification('Produit supprimé avec succès!', 'success');
        fetchProducts();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showNotification('Erreur lors de la suppression du produit', 'error');
    }
  };

  const startInlineEdit = (product) => {
    const productId = product.id || product._id;
    setEditingRowId(productId);
    setEditingData({
      name: product.name,
      price: product.price,
      cost: product.cost,
      productId: product.productId,
      isDefault: product.isDefault,
      description: product.description,
      image: product.image
    });
    setImageDialogOpen({ [productId]: false });
  };

  const cancelInlineEdit = () => {
    setEditingRowId(null);
    setEditingData({});
    setImageDialogOpen({});
  };

  const handleInlineChange = (field, value) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveInlineEdit = async () => {
    if (!editingRowId) return;

    try {
      const response = await fetch(`/api/products/${editingRowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingData.name,
          description: editingData.description,
          price: parseFloat(editingData.price),
          cost: parseFloat(editingData.cost),
          image: editingData.image,
          productId: editingData.productId,
          isDefault: editingData.isDefault
        }),
      });

      if (response.ok) {
        showNotification('Produit modifié avec succès!', 'success');
        setEditingRowId(null);
        setEditingData({});
        fetchProducts();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      showNotification('Erreur lors de la modification du produit', 'error');
    }
  };

  const moveProduct = async (productId, direction) => {
    const currentIndex = products.findIndex(p => p.id === productId || p._id === productId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= products.length) return;

    // Swap products
    const newProducts = [...products];
    [newProducts[currentIndex], newProducts[newIndex]] = [newProducts[newIndex], newProducts[currentIndex]];

    // Save to server
    try {
      const response = await fetch('/api/products/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: newProducts.map((product, index) => ({
            id: product.id || product._id,
            order: index
          }))
        }),
      });

      if (response.ok) {
        setProducts(newProducts);
        showNotification('Ordre des produits mis à jour!', 'success');
      } else {
        showNotification('Erreur lors de la mise à jour de l\'ordre', 'error');
      }
    } catch (error) {
      console.error('Error saving order:', error);
      showNotification('Erreur lors de la mise à jour de l\'ordre', 'error');
    }
  };


  // Filter and maintain order
  const filteredProducts = Array.isArray(products) ? products
    .filter(product =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.productId?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map((product, index) => ({
      ...product,
      displayOrder: index + 1
    })) : [];

  const stats = {
    total: Array.isArray(products) ? products.length : 0,
    default: Array.isArray(products) ? products.filter(p => p.isDefault === true).length : 0,
    custom: Array.isArray(products) ? products.filter(p => p.isDefault !== true).length : 0,
    totalValue: Array.isArray(products) ? products.reduce((sum, product) => sum + (product.price || 0), 0) : 0
  };

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="ml-2 text-gray-600">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Don't render if not authenticated or wrong role
  if (!session || session.user.role !== 'fournisseur') {
    return null;
  }

  return (
    <DashboardLayout>
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {notification.message}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Produits</h1>
            <p className="text-gray-600 mt-1">Gérez le catalogue de produits pour les campagnes</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Produit
            </Button>
            <Button variant="outline" onClick={fetchProducts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Par défaut</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.default}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personnalisés</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.custom}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valeur Totale</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalValue.toLocaleString('fr-CA')} $
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulaire de création/édition */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingProduct ? 'Modifier le Produit' : 'Nouveau Produit'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nom du produit *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="productId">ID Produit (optionnel)</Label>
                    <Input
                      id="productId"
                      value={formData.productId}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                      placeholder="Ex: 03650 (auto-généré si vide)"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="price">Prix de vente ($) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cost">Coût ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="image">Image du produit</Label>
                    <ImageUpload
                      value={formData.image}
                      onChange={(url) => setFormData({ ...formData, image: url })}
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    required
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isDefault">Produit par défaut</Label>
                </div>

                {/* Product Preview */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Aperçu du produit</h3>
                  </div>
                  <div className="max-w-sm">
                    <ProductCard product={formData} />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button type="submit">
                    {editingProduct ? 'Modifier' : 'Créer'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        cost: '',
        image: '',
        productId: '',
        isDefault: false
      });
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Recherche */}
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher par nom, description ou catégorie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Table des produits */}
        <Card>
          <CardHeader>
            <CardTitle>Produits ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Chargement des produits...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
                <p className="text-gray-500">
                  {searchTerm 
                    ? 'Aucun produit ne correspond aux critères de recherche.'
                    : 'Aucun produit n\'a été créé pour le moment.'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50">
                      <TableHead className="w-[80px] font-semibold text-gray-700">Ordre</TableHead>
                      <TableHead className="font-semibold text-gray-700">Image</TableHead>
                      <TableHead className="font-semibold text-gray-700">Nom</TableHead>
                      <TableHead className="font-semibold text-gray-700">ID Produit</TableHead>
                      <TableHead className="font-semibold text-gray-700">Prix</TableHead>
                      <TableHead className="font-semibold text-gray-700">Coût</TableHead>
                      <TableHead className="font-semibold text-gray-700">Statut</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product, index) => (
                      <TableRow 
                        key={product.id || product._id || product.productId || `product-${index}`}
                        className="hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100"
                      >
                      <TableCell className="w-[80px]">
                        <div className="flex flex-col items-center gap-1 min-h-[80px] justify-center">
                          <button
                            onClick={() => moveProduct(product.id || product._id, 'up')}
                            disabled={index === 0}
                            className="p-1.5 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-md transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed group"
                            title="Déplacer vers le haut"
                          >
                            <ChevronUp className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                          </button>
                          <span className="font-mono text-sm font-bold px-3 py-1 bg-gradient-to-br from-blue-50 to-purple-50 text-gray-700 rounded-md shadow-sm min-w-[30px] text-center">{index + 1}</span>
                          <button
                            onClick={() => moveProduct(product.id || product._id, 'down')}
                            disabled={index === filteredProducts.length - 1}
                            className="p-1.5 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-md transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed group"
                            title="Déplacer vers le bas"
                          >
                            <ChevronDown className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="w-[80px]">
                        {editingRowId === (product.id || product._id) ? (
                          <Dialog 
                            open={imageDialogOpen[product.id || product._id] || false} 
                            onOpenChange={(open) => {
                              const productId = product.id || product._id;
                              setImageDialogOpen(prev => ({ ...prev, [productId]: open }));
                            }}
                          >
                            <DialogTrigger asChild>
                              <div className="relative group cursor-pointer w-12 h-12">
                                {editingData.image ? (
                                  <>
                                    <img 
                                      src={editingData.image} 
                                      alt="Preview"
                                      className="w-12 h-12 object-cover rounded border border-gray-200"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded transition-all duration-200 flex items-center justify-center">
                                      <Pencil className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-200 border-2 border-dashed border-gray-300 group-hover:border-gray-400">
                                    <div className="flex flex-col items-center">
                                      <ImageIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                      <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-0.5" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                              <DialogHeader>
                                <DialogTitle>Modifier l'image du produit</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {editingData.image && (
                                  <div className="flex items-center justify-center">
                                    <img 
                                      src={editingData.image} 
                                      alt="Preview actuelle"
                                      className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                                    />
                                  </div>
                                )}
                                <ImageUpload
                                  value={editingData.image || ''}
                                  onChange={(url) => {
                                    handleInlineChange('image', url);
                                    const productId = product.id || product._id;
                                    setImageDialogOpen(prev => ({ ...prev, [productId]: false }));
                                  }}
                                  showPreview={true}
                                />
                                {editingData.image && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => {
                                      handleInlineChange('image', '');
                                      const productId = product.id || product._id;
                                      setImageDialogOpen(prev => ({ ...prev, [productId]: false }));
                                    }}
                                    className="w-full"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Supprimer l'image
                                  </Button>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          )
                        )}
                      </TableCell>
                        <TableCell className="min-w-[200px]">
                          {editingRowId === (product.id || product._id) ? (
                            <div className="space-y-2">
                              <Input
                                value={editingData.name}
                                onChange={(e) => handleInlineChange('name', e.target.value)}
                                placeholder="Nom du produit"
                                className="w-full"
                              />
                              <Textarea
                                value={editingData.description || ''}
                                onChange={(e) => handleInlineChange('description', e.target.value)}
                                placeholder="Description"
                                rows={2}
                                className="w-full text-sm resize-none"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="w-[120px]">
                          {editingRowId === (product.id || product._id) ? (
                            <Input
                              value={editingData.productId}
                              onChange={(e) => handleInlineChange('productId', e.target.value)}
                              className="w-full font-mono text-sm"
                              placeholder="ID produit"
                            />
                          ) : (
                            <Badge variant="outline" className="font-mono text-xs">
                              {product.productId || 'N/A'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="w-[110px]">
                          {editingRowId === (product.id || product._id) ? (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <Input
                                type="number"
                                step="0.01"
                                value={editingData.price}
                                onChange={(e) => handleInlineChange('price', e.target.value)}
                                className="w-full text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-sm">
                                {(product.price || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="w-[110px]">
                          {editingRowId === (product.id || product._id) ? (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <Input
                                type="number"
                                step="0.01"
                                value={editingData.cost}
                                onChange={(e) => handleInlineChange('cost', e.target.value)}
                                className="w-full text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm">
                                {(product.cost || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="w-[130px]">
                          {editingRowId === (product.id || product._id) ? (
                            <Select
                              value={editingData.isDefault ? 'true' : 'false'}
                              onValueChange={(value) => handleInlineChange('isDefault', value === 'true')}
                            >
                              <SelectTrigger className="w-full text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Par défaut</SelectItem>
                                <SelectItem value="false">Personnalisé</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge 
                              className={product.isDefault === true 
                                ? 'bg-green-100 text-green-800 text-xs' 
                                : 'bg-blue-100 text-blue-800 text-xs'
                              }
                            >
                              {product.isDefault === true ? 'Par défaut' : 'Personnalisé'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right w-[140px]">
                          <div className="flex items-center justify-end gap-1">
                            {editingRowId === (product.id || product._id) ? (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={saveInlineEdit}
                                  className="h-8 px-2 text-xs"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Sauver
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelInlineEdit}
                                  className="h-8 px-2 text-xs"
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Annuler
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startInlineEdit(product)}
                                  className="h-8 w-8 p-0"
                                  title="Modifier"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(product.id || product._id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProductsPage;