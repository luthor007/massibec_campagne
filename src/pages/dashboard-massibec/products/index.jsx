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
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  Pencil,
  Info
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
    isDefault: false,
    ingredientsImage: '',
    nutritionImage: '',
    attributes: {
      freezable: false,
      glutenFree: false,
      vegetarian: false,
      vegan: false,
      nutFree: false,
      halal: false,
      kosher: false,
      organic: false,
      quebecProduct: false,
      allergens: ''
    }
  });
  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const [editingAttributesProduct, setEditingAttributesProduct] = useState(null);
  const [attributesFormData, setAttributesFormData] = useState({
    freezable: false,
    glutenFree: false,
    vegetarian: false,
    vegan: false,
    nutFree: false,
    halal: false,
    kosher: false,
    organic: false,
    quebecProduct: false,
    allergens: ''
  });
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [imageDialogOpen, setImageDialogOpen] = useState({});
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoDialogProduct, setInfoDialogProduct] = useState(null);
  const [savingProductInfo, setSavingProductInfo] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);

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
    fetchCampaigns();
  }, [session, status, router]);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const response = await fetch('/api/massibec/campaigns', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(Array.isArray(data) ? data : []);
      } else {
        console.error('Erreur lors de la récupération des campagnes');
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des campagnes:', error);
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };

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
          cost: parseFloat(submitData.cost),
          campaigns: selectedCampaigns
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
          isDefault: false,
          ingredientsImage: '',
          nutritionImage: '',
          attributes: {
            freezable: false,
            glutenFree: false,
            vegetarian: false,
            vegan: false,
            nutFree: false,
            halal: false,
            kosher: false,
            organic: false,
            quebecProduct: false,
            allergens: ''
          }
        });
        setSelectedCampaigns([]);
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
      isDefault: product.isDefault === true,
      ingredientsImage: product.ingredientsImage || '',
      nutritionImage: product.nutritionImage || '',
      attributes: product.attributes || {
        freezable: product.freezable !== undefined ? product.freezable : false,
        glutenFree: false,
        vegetarian: false,
        vegan: false,
        nutFree: false,
        halal: false,
        kosher: false,
        organic: false,
        quebecProduct: false,
        allergens: ''
      }
    });
    // Set selected campaigns from product
    setSelectedCampaigns(product.campaigns || []);
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
        onClick: () => { },
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
      image: product.image,
      ingredientsImage: product.ingredientsImage || '',
      nutritionImage: product.nutritionImage || '',
      campaigns: product.campaigns || []
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
          ingredientsImage: editingData.ingredientsImage || '',
          nutritionImage: editingData.nutritionImage || '',
          isDefault: editingData.isDefault,
          campaigns: editingData.campaigns || []
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

  const openInfoDialog = (product) => {
    const normalizedId = product.id || product._id;
    setInfoDialogProduct({
      id: normalizedId,
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      cost: product.cost || 0,
      image: product.image || '',
      productId: product.productId || '',
      isDefault: product.isDefault === true,
      ingredientsImage: product.ingredientsImage || '',
      nutritionImage: product.nutritionImage || ''
    });
    setInfoDialogOpen(true);
  };

  const handleInfoChange = (field, value) => {
    setInfoDialogProduct((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveProductInfo = async () => {
    if (!infoDialogProduct) return;
    setSavingProductInfo(true);

    try {
      const response = await fetch(`/api/products/${infoDialogProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: infoDialogProduct.name,
          description: infoDialogProduct.description,
          price: parseFloat(infoDialogProduct.price),
          cost: parseFloat(infoDialogProduct.cost),
          image: infoDialogProduct.image,
          productId: infoDialogProduct.productId,
          isDefault: infoDialogProduct.isDefault,
          ingredientsImage: infoDialogProduct.ingredientsImage || '',
          nutritionImage: infoDialogProduct.nutritionImage || '',
        }),
      });

      if (response.ok) {
        showNotification('Informations nutritionnelles mises à jour!', 'success');
        setInfoDialogOpen(false);
        setInfoDialogProduct(null);
        fetchProducts();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error updating product info:', error);
      showNotification('Erreur lors de la mise à jour des informations', 'error');
    } finally {
      setSavingProductInfo(false);
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
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${notification.type === 'success'
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

                  <div className="md:col-span-2">
                    <Label htmlFor="campaigns">Campagnes associées (optionnel)</Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Sélectionnez les campagnes pour lesquelles ce produit sera disponible. Si aucune campagne n&apos;est sélectionnée, le produit sera disponible pour toutes les campagnes.
                    </p>
                    {loadingCampaigns ? (
                      <div className="text-sm text-gray-500">Chargement des campagnes...</div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {campaigns.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucune campagne disponible</p>
                        ) : (
                          campaigns.map((campaign) => {
                            const campaignId = campaign._id?.toString() || campaign._id;
                            const isSelected = selectedCampaigns.includes(campaignId);
                            return (
                              <label
                                key={campaignId}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCampaigns([...selectedCampaigns, campaignId]);
                                    } else {
                                      setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaignId));
                                    }
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">
                                  {campaign.nomCampagne || campaign.name || `Campagne #${campaign.campaignNumber}`}
                                  {campaign.school && (
                                    <span className="text-gray-500 ml-2">
                                      - {campaign.school.nomEcole || campaign.school.name}
                                    </span>
                                  )}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
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

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Liste d&apos;ingrédients</Label>
                    <ImageUpload
                      value={formData.ingredientsImage}
                      onChange={(url) => setFormData({ ...formData, ingredientsImage: url })}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Optionnel. Ajoutez une photo lisible de l&apos;étiquette des ingrédients.
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Tableau de valeur nutritive</Label>
                    <ImageUpload
                      value={formData.nutritionImage}
                      onChange={(url) => setFormData({ ...formData, nutritionImage: url })}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Optionnel. Téléversez le tableau nutritionnel officiel pour ce produit.
                    </p>
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

                <div className="space-y-3">
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

                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingAttributesProduct(editingProduct || { id: 'new', name: formData.name || 'Nouveau produit' });
                        setShowAttributesModal(true);
                      }}
                      className="w-full"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Gérer les attributs du produit
                    </Button>
                  </div>
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
                        isDefault: false,
                        ingredientsImage: '',
                        nutritionImage: ''
                      });
                      setSelectedCampaigns([]);
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
                      <TableHead className="font-semibold text-gray-700">Infos clients</TableHead>
                      <TableHead className="font-semibold text-gray-700">Statut</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product, index) => {
                      const hasIngredients = editingRowId === (product.id || product._id)
                        ? editingData.ingredientsImage
                        : (product.ingredientsImage && product.ingredientsImage.trim().length > 0)
                      const hasNutrition = editingRowId === (product.id || product._id)
                        ? editingData.nutritionImage
                        : (product.nutritionImage && product.nutritionImage.trim().length > 0)
                      const hasCompleteInfo = hasIngredients && hasNutrition
                      const hasPartialInfo = hasIngredients || hasNutrition

                      return (
                        <TableRow
                          key={product.id || product._id || product.productId || `product-${index}`}
                          className={`hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100 ${hasCompleteInfo ? 'bg-green-50/30 border-l-4 border-l-green-400' :
                            hasPartialInfo ? 'bg-yellow-50/30 border-l-4 border-l-yellow-400' :
                              'bg-gray-50/20 border-l-4 border-l-gray-300'
                            }`}
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
                          <TableCell className="w-[180px]">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap gap-1">
                                <Badge
                                  variant={hasIngredients ? 'default' : 'outline'}
                                  className={`text-xs ${hasIngredients
                                    ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                                    : 'bg-gray-50 text-gray-500 border-gray-300'
                                    }`}
                                >
                                  Ingrédients
                                  {hasIngredients && <CheckCircle className="w-3 h-3 ml-1" />}
                                </Badge>
                                <Badge
                                  variant={hasNutrition ? 'default' : 'outline'}
                                  className={`text-xs ${hasNutrition
                                    ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                                    : 'bg-gray-50 text-gray-500 border-gray-300'
                                    }`}
                                >
                                  Valeur nutritive
                                  {hasNutrition && <CheckCircle className="w-3 h-3 ml-1" />}
                                </Badge>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() =>
                                    openInfoDialog(
                                      editingRowId === (product.id || product._id)
                                        ? { ...product, ...editingData, id: product.id || product._id }
                                        : product
                                    )
                                  }
                                >
                                  <Info className="w-3 h-3 mr-1" />
                                  Infos
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => {
                                    const productToEdit = editingRowId === (product.id || product._id)
                                      ? { ...product, ...editingData, id: product.id || product._id }
                                      : product;
                                    setEditingAttributesProduct(productToEdit);
                                    // Load attributes from product into separate state
                                    // Ensure we use the product's attributes if they exist
                                    const productAttributes = productToEdit.attributes || {};
                                    const attributesToLoad = {
                                      freezable: productAttributes.freezable !== undefined ? productAttributes.freezable : (productToEdit.freezable !== undefined ? productToEdit.freezable : false),
                                      glutenFree: productAttributes.glutenFree !== undefined ? productAttributes.glutenFree : false,
                                      vegetarian: productAttributes.vegetarian !== undefined ? productAttributes.vegetarian : false,
                                      vegan: productAttributes.vegan !== undefined ? productAttributes.vegan : false,
                                      nutFree: productAttributes.nutFree !== undefined ? productAttributes.nutFree : false,
                                      halal: productAttributes.halal !== undefined ? productAttributes.halal : false,
                                      kosher: productAttributes.kosher !== undefined ? productAttributes.kosher : false,
                                      organic: productAttributes.organic !== undefined ? productAttributes.organic : false,
                                      quebecProduct: productAttributes.quebecProduct !== undefined ? productAttributes.quebecProduct : false,
                                      allergens: productAttributes.allergens !== undefined ? productAttributes.allergens : ''
                                    };
                                    console.log('[Attributes Modal] Loading attributes:', {
                                      productId: productToEdit.id || productToEdit._id,
                                      productAttributes,
                                      attributesToLoad
                                    });
                                    setAttributesFormData(attributesToLoad);
                                    setShowAttributesModal(true);
                                  }}
                                >
                                  <Package className="w-3 h-3 mr-1" />
                                  Attributs
                                </Button>
                              </div>
                            </div>
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
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <Dialog
          open={infoDialogOpen}
          onOpenChange={(open) => {
            setInfoDialogOpen(open);
            if (!open) {
              setInfoDialogProduct(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[620px]">
            <DialogHeader>
              <DialogTitle>Informations pour les clients</DialogTitle>
              <DialogDescription>
                Ajoutez ou mettez à jour les images de la liste d&apos;ingrédients et du tableau de valeur nutritive pour ce produit.
              </DialogDescription>
            </DialogHeader>
            {infoDialogProduct && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{infoDialogProduct.name}</h3>
                  <p className="text-sm text-gray-500">
                    Ces éléments apparaîtront dans la boutique lorsque le client consulte le produit.
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Liste d&apos;ingrédients</Label>
                    <ImageUpload
                      value={infoDialogProduct.ingredientsImage || ''}
                      onChange={(url) => handleInfoChange('ingredientsImage', url)}
                      className="mt-2"
                      previewClassName="max-h-72 overflow-hidden"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Téléversez une photo nette de l&apos;étiquette des ingrédients. Laisser vide pour cacher cette section.
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Tableau de valeur nutritive</Label>
                    <ImageUpload
                      value={infoDialogProduct.nutritionImage || ''}
                      onChange={(url) => handleInfoChange('nutritionImage', url)}
                      className="mt-2"
                      previewClassName="max-h-72 overflow-hidden"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Ajoutez le tableau nutritionnel officiel si disponible. Laisser vide pour aucun affichage.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setInfoDialogOpen(false);
                  setInfoDialogProduct(null);
                }}
                disabled={savingProductInfo}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={saveProductInfo}
                disabled={savingProductInfo || !infoDialogProduct}
              >
                {savingProductInfo ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de gestion des attributs */}
        <Dialog open={showAttributesModal} onOpenChange={(open) => {
          setShowAttributesModal(open);
          if (!open) {
            setEditingAttributesProduct(null);
            // Reset attributes form data when closing
            setAttributesFormData({
              freezable: false,
              glutenFree: false,
              vegetarian: false,
              vegan: false,
              nutFree: false,
              halal: false,
              kosher: false,
              organic: false,
              quebecProduct: false,
              allergens: ''
            });
          }
        }}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAttributesProduct ? `Attributs - ${editingAttributesProduct.name}` : 'Gérer les attributs du produit'}
              </DialogTitle>
              <DialogDescription>
                Définissez les caractéristiques et attributs de ce produit pour aider les clients à faire leur choix.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Conservation */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Conservation</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributesFormData.freezable}
                      onChange={(e) => setAttributesFormData({
                        ...attributesFormData,
                        freezable: e.target.checked
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">❄️ Congelable</span>
                  </label>
                </div>
              </div>

              {/* Régimes alimentaires */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Régimes alimentaires</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributesFormData.glutenFree}
                      onChange={(e) => setAttributesFormData({
                        ...attributesFormData,
                        glutenFree: e.target.checked
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">🌾 Sans gluten</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributesFormData.vegetarian}
                      onChange={(e) => setAttributesFormData({
                        ...attributesFormData,
                        vegetarian: e.target.checked
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">🥬 Végétarien</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributesFormData.vegan}
                      onChange={(e) => setAttributesFormData({
                        ...attributesFormData,
                        vegan: e.target.checked
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">🌱 Végétalien/Vegan</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributesFormData.nutFree}
                      onChange={(e) => setAttributesFormData({
                        ...attributesFormData,
                        nutFree: e.target.checked
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">🥜 Sans noix</span>
                  </label>
                </div>
              </div>

              {/* Certifications */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Certifications</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributesFormData.halal}
                      onChange={(e) => setAttributesFormData({
                        ...attributesFormData,
                        halal: e.target.checked
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">🕌 Halal</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributesFormData.kosher}
                      onChange={(e) => setAttributesFormData({
                        ...attributesFormData,
                        kosher: e.target.checked
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">✡️ Kasher</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributesFormData.organic}
                      onChange={(e) => setAttributesFormData({
                        ...attributesFormData,
                        organic: e.target.checked
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">🌿 Bio/Organique</span>
                  </label>
                </div>
              </div>

              {/* Origine */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Origine</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributesFormData.quebecProduct}
                      onChange={(e) => setAttributesFormData({
                        ...attributesFormData,
                        quebecProduct: e.target.checked
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">🍁 Produit du Québec</span>
                  </label>
                </div>
              </div>

              {/* Allergènes */}
              <div>
                <Label htmlFor="allergens" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Allergènes (optionnel)
                </Label>
                <Textarea
                  id="allergens"
                  value={attributesFormData.allergens || ''}
                  onChange={(e) => setAttributesFormData({
                    ...attributesFormData,
                    allergens: e.target.value
                  })}
                  placeholder="Ex: Contient du blé, des œufs, du lait"
                  rows={3}
                  className="mt-1"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Liste les allergènes présents dans ce produit (séparés par des virgules)
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAttributesModal(false);
                  setEditingAttributesProduct(null);
                  // Reset attributes form data when canceling
                  setAttributesFormData({
                    freezable: false,
                    glutenFree: false,
                    vegetarian: false,
                    vegan: false,
                    nutFree: false,
                    halal: false,
                    kosher: false,
                    organic: false,
                    quebecProduct: false,
                    allergens: ''
                  });
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={async () => {
                  if (!editingAttributesProduct) return;

                  try {
                    const productId = editingAttributesProduct.id || editingAttributesProduct._id;
                    const response = await fetch(`/api/products/${productId}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        attributes: attributesFormData
                      }),
                    });

                    if (response.ok) {
                      showNotification('Attributs mis à jour avec succès!', 'success');
                      setShowAttributesModal(false);
                      setEditingAttributesProduct(null);
                      fetchProducts();
                    } else {
                      const error = await response.json();
                      showNotification(`Erreur: ${error.message}`, 'error');
                    }
                  } catch (error) {
                    console.error('Error updating attributes:', error);
                    showNotification('Erreur lors de la mise à jour des attributs', 'error');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ProductsPage;
