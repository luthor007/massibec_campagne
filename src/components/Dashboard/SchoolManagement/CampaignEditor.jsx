import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Edit3, 
  Save, 
  X, 
  Lock, 
  DollarSign,
  Calendar,
  Package,
  Target,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

const CampaignEditor = ({ campaign, onUpdate, loading }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    deliveryDate: '',
    financialGoal: ''
  });
  const [products, setProducts] = useState([]);
  const [customPrices, setCustomPrices] = useState({});
  const [profitSplits, setProfitSplits] = useState({});
  const [saving, setSaving] = useState(false);

  // Load products and initialize form data
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          const productsData = data.products || [];
          setProducts(productsData);

          // Initialize custom prices and profit splits
          const initialPrices = {};
          const initialProfitSplits = {};
          
          productsData.forEach(product => {
            // Use campaign custom prices if available, otherwise default prices
            const campaignPrice = campaign?.customPrices?.find(cp => cp.productId.toString() === product.id)?.price;
            initialPrices[product.id] = campaignPrice || product.price;
            
            // Use campaign profit splits if available, otherwise defaults
            const campaignSplit = campaign?.profitSplits?.find(ps => ps.productId.toString() === product.id);
            initialProfitSplits[product.id] = {
              school: campaignSplit?.school || 0.75,
              student: campaignSplit?.student || 2.00,
              raffle: campaignSplit?.raffle || 0.25
            };
          });
          
          setCustomPrices(initialPrices);
          setProfitSplits(initialProfitSplits);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Erreur lors du chargement des produits');
      }
    };

    fetchProducts();
  }, [campaign]);

  useEffect(() => {
    if (campaign) {
      setFormData({
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
        deliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString().split('T')[0] : '',
        financialGoal: campaign.financialGoal || ''
      });
    }
  }, [campaign]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePriceChange = (productId, price) => {
    setCustomPrices(prev => ({
      ...prev,
      [productId]: parseFloat(price) || 0
    }));
  };

  const handleProfitSplitChange = (productId, type, value) => {
    setProfitSplits(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [type]: value === '' ? '' : parseFloat(value) || 0
      }
    }));
  };

  const validateForm = () => {
    const { startDate, endDate, deliveryDate, financialGoal } = formData;

    if (!startDate || !endDate || !deliveryDate || !financialGoal) {
      toast.error('Tous les champs sont requis');
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const delivery = new Date(deliveryDate);
    const today = new Date();

    if (start <= today) {
      toast.error('La date de début doit être dans le futur');
      return false;
    }

    if (end <= start) {
      toast.error('La date de fin doit être après la date de début');
      return false;
    }

    const threeWeeksInMillis = 21 * 24 * 60 * 60 * 1000;
    if (delivery.getTime() - end.getTime() < threeWeeksInMillis) {
      toast.error('La date de livraison doit être au moins 3 semaines après la fin de la campagne');
      return false;
    }

    if (parseFloat(financialGoal) <= 0) {
      toast.error('L\'objectif financier doit être supérieur à 0');
      return false;
    }

    // Validate profit splits for each product
    for (const productId in profitSplits) {
      const splits = profitSplits[productId];
      const product = products.find(p => p.id === productId);
      if (!product) continue;

      const sellingPrice = customPrices[productId] || product.price;
      const profit = sellingPrice - product.cost;
      const studentValue = splits.student === '' ? 0 : (splits.student || 0);
      const schoolValue = splits.school === '' ? 0 : (splits.school || 0);
      const raffleValue = splits.raffle === '' ? 0 : (splits.raffle || 0);
      const totalDistributed = studentValue + schoolValue + raffleValue;

      if (totalDistributed > profit + 0.01) { // Allow for minor floating point inaccuracies
        toast.error(`La répartition des profits pour ${product.name} dépasse le profit disponible.`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const updateData = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        deliveryDate: formData.deliveryDate,
        financialGoal: parseFloat(formData.financialGoal),
        customPrices: Object.entries(customPrices).map(([productId, price]) => ({
          productId,
          price: parseFloat(price)
        })),
        profitSplits: Object.entries(profitSplits).map(([productId, splits]) => ({
          productId,
          school: splits.school === '' ? 0.75 : (splits.school || 0.75),
          student: splits.student === '' ? 2.00 : (splits.student || 2.00),
          raffle: splits.raffle === '' ? 0.25 : (splits.raffle || 0.25)
        }))
      };

      const response = await fetch(`/api/campaigns/${campaign._id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success('Campagne mise à jour avec succès');
        setIsEditing(false);
        onUpdate && onUpdate();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Erreur lors de la mise à jour de la campagne');
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original values
    if (campaign) {
      setFormData({
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
        deliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString().split('T')[0] : '',
        financialGoal: campaign.financialGoal || ''
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Edit3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucune campagne sélectionnée</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full mb-4">
          <Edit3 className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Modifier la Campagne #{campaign.campaignNumber}
        </h2>
        <p className="text-gray-600 text-lg">
          Gérez les détails de votre campagne de financement
        </p>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dates */}
          <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Calendar className="h-5 w-5" />
                <span>Dates de la Campagne</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">Date de début *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  disabled={campaign.datesLocked}
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">Date de fin *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  disabled={campaign.datesLocked}
                />
              </div>
              <div>
                <Label htmlFor="deliveryDate" className="text-sm font-medium text-gray-700">Date de livraison *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                  className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  disabled={campaign.datesLocked}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Doit être au moins 3 semaines après la fin de la campagne
                </p>
                {campaign.datesLocked && (
                  <div className="flex items-center mt-2 text-amber-600">
                    <Lock className="h-4 w-4 mr-1" />
                    <span className="text-xs">Dates verrouillées par Massibec</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Goal */}
          <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-green-900">
                <DollarSign className="h-5 w-5" />
                <span>Objectif Financier</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="financialGoal" className="text-sm font-medium text-gray-700">Montant cible (CAD) *</Label>
                <Input
                  id="financialGoal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.financialGoal}
                  onChange={(e) => handleInputChange('financialGoal', e.target.value)}
                  placeholder="0.00"
                  className="mt-1 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Le montant total que vous souhaitez récolter
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Pricing */}
        <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-purple-900">
              <Package className="h-5 w-5" />
              <span>Prix des Produits</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Personnalisez les prix de vente pour chaque produit. Ces prix seront utilisés lors de la vente.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => {
                  const sellingPrice = customPrices[product.id] || product.price;
                  const profit = sellingPrice - product.cost;

                  return (
                    <div key={product.id} className="border-0 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                      <div className="flex items-start space-x-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = '/images/placeholder-product.svg';
                              }}
                            />
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={`price-${product.id}`} className="text-sm font-semibold text-gray-900 block mb-2">
                            {product.name}
                          </Label>

                          {/* Financial Info */}
                          <div className="space-y-1 mb-3">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Coût:</span>
                              <span className="font-medium text-gray-700">${product.cost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Prix par défaut:</span>
                              <span className="font-medium text-gray-700">${product.price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Profit par unité:</span>
                              <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${profit.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Price Input */}
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`price-${product.id}`} className="text-xs text-gray-600 whitespace-nowrap">
                              Prix de vente:
                            </Label>
                            <div className="flex-1">
                              <Input
                                id={`price-${product.id}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={sellingPrice}
                                onChange={(e) => handlePriceChange(product.id, e.target.value)}
                                className="text-sm h-9 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                disabled={campaign.profitSplitLocked}
                              />
                            </div>
                          </div>

                          {/* Updated Profit Display */}
                          <div className="mt-2 text-right">
                            <span className="text-xs text-gray-500">Nouveau profit: </span>
                            <span className={`text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${profit.toFixed(2)}
                            </span>
                          </div>

                          {/* Profit Distribution */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Répartition des profits:</h4>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Label htmlFor={`student-${product.id}`} className="text-xs text-gray-600 w-16">
                                  Étudiant:
                                </Label>
                                <Input
                                  id={`student-${product.id}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={profitSplits[product.id]?.student ?? 2.00}
                                  onChange={(e) => handleProfitSplitChange(product.id, 'student', e.target.value)}
                                  className="text-xs h-7 border-2 border-gray-200 rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-200 transition-all duration-200"
                                  disabled={campaign.profitSplitLocked}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Label htmlFor={`school-${product.id}`} className="text-xs text-gray-600 w-16">
                                  École:
                                </Label>
                                <Input
                                  id={`school-${product.id}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={profitSplits[product.id]?.school ?? 0.75}
                                  onChange={(e) => handleProfitSplitChange(product.id, 'school', e.target.value)}
                                  className="text-xs h-7 border-2 border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-200"
                                  disabled={campaign.profitSplitLocked}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Label htmlFor={`raffle-${product.id}`} className="text-xs text-gray-600 w-16">
                                  Tirage:
                                </Label>
                                <Input
                                  id={`raffle-${product.id}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={profitSplits[product.id]?.raffle ?? 0.25}
                                  onChange={(e) => handleProfitSplitChange(product.id, 'raffle', e.target.value)}
                                  className="text-xs h-7 border-2 border-gray-200 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-200 transition-all duration-200"
                                  disabled={campaign.profitSplitLocked}
                                />
                              </div>

                              {/* Profit Distribution Summary */}
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                {(() => {
                                  const splits = profitSplits[product.id] || { student: 2.00, school: 0.75, raffle: 0.25 };
                                  const studentValue = splits.student === '' ? 0 : (splits.student || 0);
                                  const schoolValue = splits.school === '' ? 0 : (splits.school || 0);
                                  const raffleValue = splits.raffle === '' ? 0 : (splits.raffle || 0);
                                  const totalDistributed = studentValue + schoolValue + raffleValue;
                                  const remaining = profit - totalDistributed;

                                  return (
                                    <div className="text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Total distribué:</span>
                                        <span className="font-medium">${totalDistributed.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Reste:</span>
                                        <span className={`font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          ${remaining.toFixed(2)}
                                        </span>
                                      </div>
                                      {remaining < 0 && (
                                        <div className="text-red-500 text-xs mt-1">
                                          ⚠️ Vous distribuez plus que le profit disponible
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center pt-8">
          <div className="flex space-x-4">
            <Button 
              onClick={handleSave}
              disabled={saving}
              className={`
                relative px-8 py-4 text-lg font-semibold rounded-xl
                bg-gradient-to-r from-green-600 to-green-700 
                hover:from-green-700 hover:to-green-800
                text-white shadow-lg hover:shadow-xl
                transform transition-all duration-200 ease-in-out
                hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                disabled:hover:scale-100 disabled:hover:shadow-lg
                min-w-[200px]
                ${saving ? 'animate-pulse' : ''}
              `}
            >
              <div className="flex items-center justify-center space-x-3">
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Sauvegarder</span>
                  </>
                )}
              </div>
              
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-400 to-green-500 opacity-0 hover:opacity-20 transition-opacity duration-200 pointer-events-none"></div>
            </Button>

            <Button 
              onClick={handleCancel}
              variant="outline"
              className="px-8 py-4 text-lg font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 min-w-[200px]"
            >
              <X className="h-5 w-5 mr-2" />
              Annuler
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignEditor;