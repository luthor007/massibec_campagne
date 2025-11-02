import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { 
  Edit3, 
  Save, 
  X, 
  Lock, 
  DollarSign,
  Calendar,
  Package,
  Target,
  AlertCircle,
  Building2,
  Settings,
  Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getTerminology } from '@/utils/organizationHelpers';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';

const CampaignEditor = ({ campaign, onUpdate, loading, school }) => {
  // Get terminology based on organization type
  const organizationType = school?.organizationType || campaign?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    deliveryDate: '',
    financialGoal: '',
    distributionStartHour: '',
    distributionEndHour: ''
  });
  const [products, setProducts] = useState([]);
  const [customPrices, setCustomPrices] = useState({});
  const [profitSplits, setProfitSplits] = useState({});
  
  // Student donations configuration
  const [studentDonationsEnabled, setStudentDonationsEnabled] = useState(true);
  const [studentDonationPresets, setStudentDonationPresets] = useState([0, 5, 10, 20]);
  const [studentDonationSplit, setStudentDonationSplit] = useState({
    studentAccount: 60.0,
    studentCash: 40.0
  });
  
  // School donations configuration
  const [schoolDonationsEnabled, setSchoolDonationsEnabled] = useState(true);
  const [schoolDonationPresets, setSchoolDonationPresets] = useState([0, 5, 10, 20]);
  
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Global profit settings
  const [globalProfitSettings, setGlobalProfitSettings] = useState({
    profitPerProduct: 3.00, // Default profit per product
    studentCash: 1.00, // Absolute value for student cash ($)
    studentSchoolAccount: 1.00, // Absolute value for student school account ($)
    schoolProject: 0.75, // Absolute value for school project ($)
    raffle: 0.25 // Absolute value for raffle ($)
  });

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
            const campaignPrice = campaign?.customPrices?.find(cp => {
              const cpProductId = cp.productId?._id?.toString() || cp.productId?.toString();
              return cpProductId === product.id;
            })?.price;
            initialPrices[product.id] = campaignPrice || product.price;
            
            // Use campaign profit splits if available, otherwise defaults
            const campaignSplit = campaign?.profitSplits?.find(ps => {
              const psProductId = ps.productId?._id?.toString() || ps.productId?.toString();
              return psProductId === product.id;
            });
            // Preserve 0 values - don't use || which treats 0 as falsy
            initialProfitSplits[product.id] = {
              studentCash: campaignSplit?.studentCash !== undefined && campaignSplit?.studentCash !== null ? campaignSplit.studentCash : 1.00,
              studentSchoolAccount: campaignSplit?.studentSchoolAccount !== undefined && campaignSplit?.studentSchoolAccount !== null ? campaignSplit.studentSchoolAccount : 0,
              schoolProject: campaignSplit?.schoolProject !== undefined && campaignSplit?.schoolProject !== null ? campaignSplit.schoolProject : 0.75,
              raffle: campaignSplit?.raffle !== undefined && campaignSplit?.raffle !== null ? campaignSplit.raffle : 0.25
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
  }, [campaign?._id]); // Only re-run when campaign._id changes

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
        deliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString().split('T')[0] : '',
        financialGoal: campaign.financialGoal || '',
        distributionStartHour: campaign.distributionStartHour || '',
        distributionEndHour: campaign.distributionEndHour || ''
      });
      
      // Initialize student donation configuration
      setStudentDonationsEnabled(campaign.donationsForStudents?.enabled ?? true);
      setStudentDonationPresets(campaign.donationsForStudents?.presets || [0, 5, 10, 20]);
      setStudentDonationSplit(campaign.donationsForStudents?.splitConfig || {
        studentAccount: 60.0,
        studentCash: 40.0
      });
      
      // Initialize school donation configuration
      setSchoolDonationsEnabled(campaign.donationsForSchool?.enabled ?? true);
      setSchoolDonationPresets(campaign.donationsForSchool?.presets || [0, 5, 10, 20]);
    }
  }, [campaign]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePriceChange = (productId, price) => {
    const parsedPrice = parseFloat(price);
    console.log(`[CampaignEditor] handlePriceChange - productId: ${productId}, input: "${price}", parsed: ${parsedPrice}`);
    setCustomPrices(prev => {
      const updated = {
        ...prev,
        [productId]: isNaN(parsedPrice) ? 0 : parsedPrice
      };
      console.log(`[CampaignEditor] Updated customPrices for ${productId}:`, updated[productId]);
      return updated;
    });
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

  // Handle global profit settings changes
  const handleGlobalProfitSettingsChange = (field, value) => {
    setGlobalProfitSettings(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  // Apply global profit settings to all products
  const applyGlobalProfitSettings = () => {
    const newCustomPrices = { ...customPrices };
    const newProfitSplits = { ...profitSplits };

    products.forEach(product => {
      const desiredProfit = globalProfitSettings.profitPerProduct;
      const sellingPrice = (product.cost || 0) + desiredProfit;

      // Update custom price
      newCustomPrices[product.id] = parseFloat(sellingPrice.toFixed(2));

      // Use absolute values from global settings
      newProfitSplits[product.id] = {
        studentCash: globalProfitSettings.studentCash,
        studentSchoolAccount: globalProfitSettings.studentSchoolAccount,
        schoolProject: globalProfitSettings.schoolProject,
        raffle: globalProfitSettings.raffle
      };
    });

    setCustomPrices(newCustomPrices);
    setProfitSplits(newProfitSplits);
    toast.success('Répartition des profits appliquée à tous les produits');
  };

  // Student donation handlers
  const handleStudentDonationPresetChange = (index, value) => {
    const newPresets = [...studentDonationPresets];
    newPresets[index] = parseFloat(value) || 0;
    setStudentDonationPresets(newPresets);
  };

  const addStudentDonationPreset = () => {
    if (studentDonationPresets.length < 6) {
      setStudentDonationPresets([...studentDonationPresets, 0]);
    }
  };

  const removeStudentDonationPreset = (index) => {
    if (studentDonationPresets.length > 2) {
      const newPresets = studentDonationPresets.filter((_, i) => i !== index);
      setStudentDonationPresets(newPresets);
    }
  };

  const handleStudentDonationSplitChange = (type, value) => {
    setStudentDonationSplit(prev => ({
      ...prev,
      [type]: parseFloat(value) || 0
    }));
  };

  // School donation handlers
  const handleSchoolDonationPresetChange = (index, value) => {
    const newPresets = [...schoolDonationPresets];
    newPresets[index] = parseFloat(value) || 0;
    setSchoolDonationPresets(newPresets);
  };

  const addSchoolDonationPreset = () => {
    if (schoolDonationPresets.length < 6) {
      setSchoolDonationPresets([...schoolDonationPresets, 0]);
    }
  };

  const removeSchoolDonationPreset = (index) => {
    if (schoolDonationPresets.length > 2) {
      const newPresets = schoolDonationPresets.filter((_, i) => i !== index);
      setSchoolDonationPresets(newPresets);
    }
  };

  // Helper functions for date min attributes
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMinDeliveryDate = () => {
    if (!formData.endDate) {
      return getTodayDateString();
    }
    const endDate = new Date(formData.endDate + 'T00:00:00');
    const threeWeeksInMillis = 21 * 24 * 60 * 60 * 1000;
    const minDeliveryDate = new Date(endDate.getTime() + threeWeeksInMillis);
    const year = minDeliveryDate.getFullYear();
    const month = String(minDeliveryDate.getMonth() + 1).padStart(2, '0');
    const day = String(minDeliveryDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const validateForm = () => {
    const { startDate, endDate, deliveryDate, financialGoal } = formData;

    if (!startDate || !endDate || !deliveryDate || !financialGoal) {
      toast.error('Tous les champs sont requis');
      return false;
    }

    // Parse dates as local dates (YYYY-MM-DD format) to avoid timezone issues
    const parseLocalDate = (dateString) => {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    };

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    const delivery = parseLocalDate(deliveryDate);

    // Normalize times for comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    delivery.setHours(0, 0, 0, 0);

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

    // Validate distribution hours if provided
    if (formData.distributionStartHour && formData.distributionEndHour) {
      const startMatch = formData.distributionStartHour.match(/(\d{2})h(\d{2})/);
      const endMatch = formData.distributionEndHour.match(/(\d{2})h(\d{2})/);
      
      if (startMatch && endMatch) {
        const startMinutes = parseInt(startMatch[1]) * 60 + parseInt(startMatch[2]);
        const endMinutes = parseInt(endMatch[1]) * 60 + parseInt(endMatch[2]);
        
        if (endMinutes <= startMinutes) {
          toast.error('L\'heure de fin doit être après l\'heure de début');
          return false;
        }
      }
    }

    // Note: Profit split validation removed - using absolute values now, no need to validate against profit

    console.log('All validations passed!');
    return true;
  };

  const handleSave = async () => {
    console.log('handleSave called');
    console.log('Form data:', formData);
    console.log('Campaign ID:', campaign?._id);
    
    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }

    console.log('Validation passed, starting save...');
    setSaving(true);
    
    try {
      const updateData = {
        name: formData.name || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        deliveryDate: formData.deliveryDate,
        distributionStartHour: formData.distributionStartHour,
        distributionEndHour: formData.distributionEndHour,
        financialGoal: parseFloat(formData.financialGoal),
        customPrices: Object.entries(customPrices).map(([productId, price]) => {
          const parsedPrice = parseFloat(price);
          console.log(`[CampaignEditor] Sending custom price for product ${productId}: ${parsedPrice}`);
          return {
            productId,
            price: parsedPrice
          };
        }),
        profitSplits: Object.entries(profitSplits).map(([productId, splits]) => {
          // Parse values, preserving 0 as a valid value (don't use || which treats 0 as falsy)
          const parseValue = (value, defaultValue) => {
            if (value === '' || value === null || value === undefined) {
              return defaultValue;
            }
            const parsed = parseFloat(value);
            return isNaN(parsed) ? defaultValue : parsed;
          };
          
          return {
            productId,
            studentCash: parseValue(splits.studentCash, 1.00),
            studentSchoolAccount: parseValue(splits.studentSchoolAccount, 0),
            schoolProject: parseValue(splits.schoolProject, 0.75),
            raffle: parseValue(splits.raffle, 0.25)
          };
        }),
        donationsForStudents: {
          enabled: studentDonationsEnabled,
          presets: studentDonationPresets,
          splitConfig: studentDonationSplit
        },
        donationsForSchool: {
          enabled: schoolDonationsEnabled,
          presets: schoolDonationPresets
        }
      };

      console.log('Updating campaign:', campaign._id);
      console.log('[CampaignEditor] Current customPrices state:', customPrices);
      console.log('[CampaignEditor] Update data:', JSON.stringify(updateData, null, 2));

      const response = await fetch(`/api/campaigns/${campaign._id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Campaign update successful:', result);
        
        // Update local state with the updated campaign data
        if (result.campaign) {
          // Update form data with saved values
          setFormData({
            name: result.campaign.name || formData.name,
            startDate: result.campaign.startDate ? new Date(result.campaign.startDate).toISOString().split('T')[0] : formData.startDate,
            endDate: result.campaign.endDate ? new Date(result.campaign.endDate).toISOString().split('T')[0] : formData.endDate,
            deliveryDate: result.campaign.deliveryDate ? new Date(result.campaign.deliveryDate).toISOString().split('T')[0] : formData.deliveryDate,
            financialGoal: result.campaign.financialGoal || formData.financialGoal,
            distributionStartHour: result.campaign.distributionStartHour || formData.distributionStartHour,
            distributionEndHour: result.campaign.distributionEndHour || formData.distributionEndHour
          });
          
          // Update custom prices and profit splits from saved campaign
          if (result.campaign.customPrices) {
            const updatedPrices = {};
            result.campaign.customPrices.forEach(cp => {
              const productId = cp.productId?._id?.toString() || cp.productId?.toString();
              if (productId) {
                updatedPrices[productId] = cp.price;
              }
            });
            setCustomPrices(prev => ({ ...prev, ...updatedPrices }));
          }
          
          if (result.campaign.profitSplits) {
            const updatedSplits = {};
            result.campaign.profitSplits.forEach(ps => {
              const productId = ps.productId?._id?.toString() || ps.productId?.toString();
              if (productId) {
                // Preserve 0 values - don't use || which treats 0 as falsy
                updatedSplits[productId] = {
                  studentCash: ps.studentCash !== undefined && ps.studentCash !== null ? ps.studentCash : 1.00,
                  studentSchoolAccount: ps.studentSchoolAccount !== undefined && ps.studentSchoolAccount !== null ? ps.studentSchoolAccount : 0,
                  schoolProject: ps.schoolProject !== undefined && ps.schoolProject !== null ? ps.schoolProject : 0.75,
                  raffle: ps.raffle !== undefined && ps.raffle !== null ? ps.raffle : 0.25
                };
              }
            });
            setProfitSplits(prev => ({ ...prev, ...updatedSplits }));
          }
          
          // Update donation settings
          if (result.campaign.donationsForStudents) {
            setStudentDonationsEnabled(result.campaign.donationsForStudents.enabled ?? true);
            setStudentDonationPresets(result.campaign.donationsForStudents.presets || [0, 5, 10, 20]);
            setStudentDonationSplit(result.campaign.donationsForStudents.splitConfig || {
              studentAccount: 60.0,
              studentCash: 40.0
            });
          }
          
          if (result.campaign.donationsForSchool) {
            setSchoolDonationsEnabled(result.campaign.donationsForSchool.enabled ?? true);
            setSchoolDonationPresets(result.campaign.donationsForSchool.presets || [0, 5, 10, 20]);
          }
        }
        
          toast.success('Campagne mise à jour avec succès');
          setIsEditing(false);
          onUpdate && onUpdate(result.campaign);
        } else {
          let errorMessage = 'Erreur lors de la mise à jour de la campagne';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
            console.error('Campaign update failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
              errorMessage: errorData.message,
              fullError: JSON.stringify(errorData, null, 2)
            });
          } catch (e) {
            console.error('Error parsing error response:', e);
            errorMessage = `Erreur ${response.status}: ${response.statusText}`;
          }
          toast.error(errorMessage);
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
        name: campaign.name || '',
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
        deliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString().split('T')[0] : '',
        financialGoal: campaign.financialGoal || '',
        distributionStartHour: campaign.distributionStartHour || '',
        distributionEndHour: campaign.distributionEndHour || ''
      });
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Campagne supprimée avec succès');
        if (onUpdate) {
          onUpdate(); // Refresh campaigns list
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Erreur lors de la suppression de la campagne');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Erreur de connexion lors de la suppression');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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

  const isApproved = campaign.status === 'approved';

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
          isApproved ? 'bg-gray-400' : 'bg-gradient-to-r from-orange-500 to-orange-600'
        }`}>
          <Edit3 className="h-8 w-8 text-white" />
        </div>
        <h2 className={`text-3xl font-bold mb-2 ${isApproved ? 'text-gray-600' : 'text-gray-900'}`}>
          Modifier la Campagne #{campaign.campaignNumber}
        </h2>
        <p className={`text-lg ${isApproved ? 'text-gray-500' : 'text-gray-600'}`}>
          Gérez les détails de votre campagne de financement
        </p>
        
        {/* Message d'approbation */}
        {isApproved && (
          <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">Approuvée et verrouillée par le fournisseur</span>
            </div>
          </div>
        )}

        {/* Bouton de suppression (uniquement si non approuvée) */}
        {!isApproved && campaign.status !== 'active' && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center space-x-2"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              <span>Supprimer la campagne</span>
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Nom de la campagne */}
        <Card className={`transition-shadow duration-200 border-0 shadow-md ${isApproved ? '' : 'hover:shadow-lg'}`}>
          <CardHeader className={`rounded-t-lg ${isApproved ? 'bg-gray-100' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}`}>
            <CardTitle className={`flex items-center space-x-2 ${isApproved ? 'text-gray-600' : 'text-blue-900'}`}>
              <Edit3 className="h-5 w-5" />
              <span>Nom de la campagne</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="campaignName" className={`text-sm font-medium ${isApproved ? 'text-gray-500' : 'text-gray-700'}`}>
                Nom de la campagne
              </Label>
              <Input
                id="campaignName"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={`Ex: ${school?.name || 'Organisation'} - Janvier 2025`}
                maxLength={200}
                className={`mt-1 border-2 rounded-lg transition-all duration-200 ${
                  isApproved 
                    ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                    : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                }`}
                disabled={isApproved}
              />
              <p className="text-xs text-gray-500 mt-1">
                Le nom sera utilisé pour identifier cette campagne dans les rapports et les vues
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dates */}
          <Card className={`transition-shadow duration-200 border-0 shadow-md ${isApproved ? '' : 'hover:shadow-lg'}`}>
            <CardHeader className={`rounded-t-lg ${isApproved ? 'bg-gray-100' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}`}>
              <CardTitle className={`flex items-center space-x-2 ${isApproved ? 'text-gray-600' : 'text-blue-900'}`}>
                <Calendar className="h-5 w-5" />
                <span>Dates de la Campagne</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="startDate" className={`text-sm font-medium ${isApproved ? 'text-gray-500' : 'text-gray-700'}`}>Date de début *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`mt-1 border-2 rounded-lg transition-all duration-200 ${
                    isApproved 
                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                  }`}
                  disabled={isApproved || campaign.datesLocked}
                />
              </div>
              <div>
                <Label htmlFor="endDate" className={`text-sm font-medium ${isApproved ? 'text-gray-500' : 'text-gray-700'}`}>Date de fin *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={`mt-1 border-2 rounded-lg transition-all duration-200 ${
                    isApproved 
                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                  }`}
                  disabled={isApproved || campaign.datesLocked}
                />
              </div>
              <div>
                <Label htmlFor="deliveryDate" className={`text-sm font-medium ${isApproved ? 'text-gray-500' : 'text-gray-700'}`}>Date de livraison *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                  min={getMinDeliveryDate()}
                  className={`mt-1 border-2 rounded-lg transition-all duration-200 ${
                    isApproved 
                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                  }`}
                  disabled={isApproved || campaign.datesLocked}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Doit être au moins 3 semaines après la fin de la campagne
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Indiquez les heures pendant lesquelles les {terminology.participants} pourront venir chercher leurs commandes.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="distributionStartHour" className={`text-sm font-medium ${isApproved ? 'text-gray-500' : 'text-gray-700'}`}>Heure de début de distribution</Label>
                  <Select
                    value={formData.distributionStartHour || ''}
                    onValueChange={(value) => handleInputChange('distributionStartHour', value)}
                    disabled={isApproved || campaign.datesLocked}
                  >
                    <SelectTrigger className={`mt-1 border-2 rounded-lg transition-all duration-200 ${
                      isApproved 
                        ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}>
                      <SelectValue placeholder="Sélectionnez une heure" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => {
                        const totalMinutes = (i * 15) + (7 * 60); // From 7h00 to 21h45 (15-minute intervals)
                        const hour = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        const hourStr = hour < 10 ? `0${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}` : `${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}`;
                        return (
                          <SelectItem key={hourStr} value={hourStr}>
                            {hourStr}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="distributionEndHour" className={`text-sm font-medium ${isApproved ? 'text-gray-500' : 'text-gray-700'}`}>Heure de fin de distribution</Label>
                  <Select
                    value={formData.distributionEndHour || ''}
                    onValueChange={(value) => handleInputChange('distributionEndHour', value)}
                    disabled={isApproved || campaign.datesLocked}
                  >
                    <SelectTrigger className={`mt-1 border-2 rounded-lg transition-all duration-200 ${
                      isApproved 
                        ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}>
                      <SelectValue placeholder="Sélectionnez une heure" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => {
                        const totalMinutes = (i * 15) + (7 * 60); // From 7h00 to 21h45 (15-minute intervals)
                        const hour = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        const hourStr = hour < 10 ? `0${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}` : `${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}`;
                        
                        // Only show times after the start hour (at least 15 minutes later)
                        if (formData.distributionStartHour) {
                          const startMatch = formData.distributionStartHour.match(/(\d{2})h(\d{2})/);
                          if (startMatch) {
                            const startHour = parseInt(startMatch[1]);
                            const startMinutes = parseInt(startMatch[2]);
                            const startTotalMinutes = startHour * 60 + startMinutes;
                            
                            // Only show if at least 15 minutes after start
                            if (totalMinutes <= startTotalMinutes) {
                              return null;
                            }
                          }
                        }
                        
                        return (
                          <SelectItem key={hourStr} value={hourStr}>
                            {hourStr}
                          </SelectItem>
                        );
                      }).filter(Boolean)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Goal */}
          <Card className={`transition-shadow duration-200 border-0 shadow-md ${isApproved ? '' : 'hover:shadow-lg'}`}>
            <CardHeader className={`rounded-t-lg ${isApproved ? 'bg-gray-100' : 'bg-gradient-to-r from-green-50 to-emerald-50'}`}>
              <CardTitle className={`flex items-center space-x-2 ${isApproved ? 'text-gray-600' : 'text-green-900'}`}>
                <DollarSign className="h-5 w-5" />
                <span>Objectif Financier</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="financialGoal" className={`text-sm font-medium ${isApproved ? 'text-gray-500' : 'text-gray-700'}`}>Montant cible (CAD) *</Label>
                <Input
                  id="financialGoal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.financialGoal}
                  onChange={(e) => handleInputChange('financialGoal', e.target.value)}
                  placeholder="0.00"
                  className={`mt-1 border-2 rounded-lg transition-all duration-200 ${
                    isApproved 
                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                      : 'border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                  }`}
                  disabled={isApproved}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Le montant total que vous souhaitez récolter
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Pricing */}
        <Card className={`transition-shadow duration-200 border-0 shadow-md ${isApproved ? '' : 'hover:shadow-lg'}`}>
          <CardHeader className={`rounded-t-lg ${isApproved ? 'bg-gray-100' : 'bg-gradient-to-r from-purple-50 to-pink-50'}`}>
            <CardTitle className={`flex items-center space-x-2 ${isApproved ? 'text-gray-600' : 'text-purple-900'}`}>
              <Package className="h-5 w-5" />
              <span>Prix des Produits</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className={`text-sm ${isApproved ? 'text-gray-500' : 'text-gray-600'}`}>
                Personnalisez les prix de vente pour chaque produit. Ces prix seront utilisés lors de la vente.
              </p>

              {/* Global Profit Settings Card */}
              {!isApproved && (
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-blue-900 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Répartition des profits - Contrôles globaux
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Définissez un profit total par produit et sa répartition, puis appliquez-le à tous les produits.
                    </p>

                    {/* Global Profit per Product */}
                    <div>
                      <Label htmlFor="globalProfitPerProduct" className="text-sm font-medium text-gray-700">
                        Profit total par produit ($)
                      </Label>
                      <Input
                        id="globalProfitPerProduct"
                        type="number"
                        step="0.25"
                        min="0"
                        value={globalProfitSettings.profitPerProduct}
                        onChange={(e) => handleGlobalProfitSettingsChange('profitPerProduct', e.target.value)}
                        className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    {/* Global Profit Distribution Ratios */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">Répartition du profit ($):</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="globalStudentCash" className="text-xs text-gray-600">
                            {terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} comptant ($)
                          </Label>
                          <Input
                            id="globalStudentCash"
                            type="number"
                            step="0.25"
                            min="0"
                            value={globalProfitSettings.studentCash}
                            onChange={(e) => handleGlobalProfitSettingsChange('studentCash', e.target.value)}
                            className="mt-1 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                        <div>
                          <Label htmlFor="globalStudentSchoolAccount" className="text-xs text-gray-600">
                            Étudiant compte scolaire ($)
                          </Label>
                          <Input
                            id="globalStudentSchoolAccount"
                            type="number"
                            step="0.25"
                            min="0"
                            value={globalProfitSettings.studentSchoolAccount}
                            onChange={(e) => handleGlobalProfitSettingsChange('studentSchoolAccount', e.target.value)}
                            className="mt-1 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                        <div>
                          <Label htmlFor="globalSchoolProject" className="text-xs text-gray-600">
                            Projet École ($)
                          </Label>
                          <Input
                            id="globalSchoolProject"
                            type="number"
                            step="0.25"
                            min="0"
                            value={globalProfitSettings.schoolProject}
                            onChange={(e) => handleGlobalProfitSettingsChange('schoolProject', e.target.value)}
                            className="mt-1 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                        <div>
                          <Label htmlFor="globalRaffle" className="text-xs text-gray-600">
                            Tirage ($)
                          </Label>
                          <Input
                            id="globalRaffle"
                            type="number"
                            step="0.25"
                            min="0"
                            value={globalProfitSettings.raffle}
                            onChange={(e) => handleGlobalProfitSettingsChange('raffle', e.target.value)}
                            className="mt-1 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 pt-2 border-t border-blue-200">
                        Total distribué: ${(globalProfitSettings.studentCash + globalProfitSettings.studentSchoolAccount + globalProfitSettings.schoolProject + globalProfitSettings.raffle).toFixed(2)}
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={applyGlobalProfitSettings}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Appliquer cette répartition à tous les produits
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => {
                  const sellingPrice = customPrices[product.id] || product.price;
                  const profit = sellingPrice - product.cost;

                  return (
                    <div key={product.id} className={`border-0 rounded-xl p-5 shadow-md transition-all duration-200 ${
                      isApproved 
                        ? 'bg-gray-100 opacity-75' 
                        : 'bg-gradient-to-br from-white to-gray-50 hover:shadow-lg hover:scale-[1.02]'
                    }`}>
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
                          <Label htmlFor={`price-${product.id}`} className={`text-sm font-semibold block mb-2 ${isApproved ? 'text-gray-600' : 'text-gray-900'}`}>
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
                            <Label htmlFor={`price-${product.id}`} className={`text-xs whitespace-nowrap ${isApproved ? 'text-gray-500' : 'text-gray-600'}`}>
                              Prix de vente:
                            </Label>
                            <div className="flex-1">
                              <Input
                                id={`price-${product.id}`}
                                type="number"
                                step="0.25"
                                min="0"
                                value={sellingPrice}
                                onChange={(e) => handlePriceChange(product.id, e.target.value)}
                                className={`text-sm h-9 border-2 rounded-lg transition-all duration-200 ${
                                  isApproved 
                                    ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                                    : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                }`}
                                disabled={isApproved || campaign.profitSplitLocked}
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
                            <h4 className={`text-xs font-semibold mb-2 ${isApproved ? 'text-gray-500' : 'text-gray-700'}`}>Répartition des profits:</h4>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Label htmlFor={`studentCash-${product.id}`} className={`text-xs w-20 ${isApproved ? 'text-gray-500' : 'text-gray-600'}`}>
                                  Étudiant comptant:
                                </Label>
                                <Input
                                  id={`studentCash-${product.id}`}
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  value={profitSplits[product.id]?.studentCash ?? 1.00}
                                  onChange={(e) => handleProfitSplitChange(product.id, 'studentCash', e.target.value)}
                                  className={`text-xs h-7 border-2 rounded-md transition-all duration-200 ${
                                    isApproved 
                                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                                      : 'border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-200'
                                  }`}
                                  disabled={isApproved || campaign.profitSplitLocked}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Label htmlFor={`studentSchoolAccount-${product.id}`} className={`text-xs w-20 ${isApproved ? 'text-gray-500' : 'text-gray-600'}`}>
                                  Étudiant compte scolaire:
                                </Label>
                                <Input
                                  id={`studentSchoolAccount-${product.id}`}
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  value={profitSplits[product.id]?.studentSchoolAccount ?? 1.00}
                                  onChange={(e) => handleProfitSplitChange(product.id, 'studentSchoolAccount', e.target.value)}
                                  className={`text-xs h-7 border-2 rounded-md transition-all duration-200 ${
                                    isApproved 
                                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                                      : 'border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-200'
                                  }`}
                                  disabled={isApproved || campaign.profitSplitLocked}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Label htmlFor={`schoolProject-${product.id}`} className={`text-xs w-20 ${isApproved ? 'text-gray-500' : 'text-gray-600'}`}>
                                  Projet École:
                                </Label>
                                <Input
                                  id={`schoolProject-${product.id}`}
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  value={profitSplits[product.id]?.schoolProject ?? 0.75}
                                  onChange={(e) => handleProfitSplitChange(product.id, 'schoolProject', e.target.value)}
                                  className={`text-xs h-7 border-2 rounded-md transition-all duration-200 ${
                                    isApproved 
                                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                                      : 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                                  }`}
                                  disabled={isApproved || campaign.profitSplitLocked}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Label htmlFor={`raffle-${product.id}`} className={`text-xs w-16 ${isApproved ? 'text-gray-500' : 'text-gray-600'}`}>
                                  Tirage:
                                </Label>
                                <Input
                                  id={`raffle-${product.id}`}
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  value={profitSplits[product.id]?.raffle ?? 0.25}
                                  onChange={(e) => handleProfitSplitChange(product.id, 'raffle', e.target.value)}
                                  className={`text-xs h-7 border-2 rounded-md transition-all duration-200 ${
                                    isApproved 
                                      ? 'border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed' 
                                      : 'border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-200'
                                  }`}
                                  disabled={isApproved || campaign.profitSplitLocked}
                                />
                              </div>

                              {/* Profit Distribution Summary */}
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                {(() => {
                                  const splits = profitSplits[product.id] || { 
                                    studentCash: 1.00, 
                                    studentSchoolAccount: 1.00, 
                                    schoolProject: 0.75, 
                                    raffle: 0.25 
                                  };
                                  const studentCashValue = splits.studentCash === '' ? 0 : (splits.studentCash || 0);
                                  const studentSchoolAccountValue = splits.studentSchoolAccount === '' ? 0 : (splits.studentSchoolAccount || 0);
                                  const schoolProjectValue = splits.schoolProject === '' ? 0 : (splits.schoolProject || 0);
                                  const raffleValue = splits.raffle === '' ? 0 : (splits.raffle || 0);
                                  const totalDistributed = studentCashValue + studentSchoolAccountValue + schoolProjectValue + raffleValue;
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

            {/* Donation Configuration - Split into Two Sections */}
            
            {/* Student Donations Configuration */}
            <div className={`space-y-4 ${isApproved ? 'opacity-75' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className={`h-5 w-5 ${isApproved ? 'text-gray-500' : 'text-blue-600'}`} />
                  <h3 className={`text-lg font-semibold ${isApproved ? 'text-gray-500' : 'text-gray-800'}`}>
                    Dons pour les {terminology.participantsLabel.charAt(0).toUpperCase() + terminology.participantsLabel.slice(1)}
                  </h3>
                </div>
                <Toggle
                  pressed={studentDonationsEnabled}
                  onPressedChange={setStudentDonationsEnabled}
                  disabled={isApproved}
                  aria-label={`Activer les dons pour les ${terminology.participants}`}
                  size="sm"
                  variant="outline"
                  className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=off]:bg-gray-200 data-[state=off]:text-gray-700 min-w-16 disabled:opacity-50"
                >
                  {studentDonationsEnabled ? 'Activé' : 'Désactivé'}
                </Toggle>
              </div>
              {!studentDonationsEnabled && (
                <p className="text-sm text-gray-500 mt-2">Cette section est désactivée. Les dons pour les {terminology.participants} ne seront pas affichés au checkout.</p>
              )}
              
              {isApproved && (
                <Badge variant="outline" className="text-xs inline-flex items-center">
                  <Lock className="h-3 w-3 mr-1" />
                  Approuvée et verrouillée
                </Badge>
              )}
              
              {studentDonationsEnabled && (
                <>
                  <p className={`text-sm ${isApproved ? 'text-gray-500' : 'text-gray-600'}`}>
                    Les clients pourront ajouter un don pour soutenir les {terminology.participants} de {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization}.
                  </p>

                  {/* Student Donation Presets */}
                  <div className="space-y-3">
                    <h4 className={`text-sm font-semibold ${isApproved ? 'text-gray-500' : 'text-gray-700'}`}>
                      Montants de dons disponibles:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {studentDonationPresets.map((preset, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={preset}
                            onChange={(e) => handleStudentDonationPresetChange(index, e.target.value)}
                            className={`w-20 text-sm ${isApproved ? 'bg-gray-100' : ''}`}
                            disabled={isApproved}
                          />
                          <span className="text-sm text-gray-500">$</span>
                          {studentDonationPresets.length > 2 && !isApproved && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeStudentDonationPreset(index)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {studentDonationPresets.length < 6 && !isApproved && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addStudentDonationPreset}
                          className="h-8 px-3"
                        >
                          + Ajouter
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Les clients pourront choisir parmi ces montants ou entrer un montant personnalisé.
                    </p>
                  </div>

                  {/* Student Donation Split */}
                  <div className="space-y-3">
                    <h4 className={`text-sm font-semibold ${isApproved ? 'text-gray-500' : 'text-gray-700'}`}>
                      Répartition des dons {terminology.participants} (en pourcentage):
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="student-donation-account" className={`text-sm ${isApproved ? 'text-gray-500' : 'text-gray-600'}`}>
                          Compte Scolaire:
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="student-donation-account"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={studentDonationSplit.studentAccount}
                            onChange={(e) => handleStudentDonationSplitChange('studentAccount', e.target.value)}
                            className={`text-sm ${isApproved ? 'bg-gray-100' : ''}`}
                            disabled={isApproved}
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="student-donation-cash" className={`text-sm ${isApproved ? 'text-gray-500' : 'text-gray-600'}`}>
                          Comptant (étudiant):
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="student-donation-cash"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={studentDonationSplit.studentCash}
                            onChange={(e) => handleStudentDonationSplitChange('studentCash', e.target.value)}
                            className={`text-sm ${isApproved ? 'bg-gray-100' : ''}`}
                            disabled={isApproved}
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Student Donation Split Preview */}
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <h5 className="text-sm font-semibold text-blue-800 mb-2">Aperçu - Don de 10$:</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-center">
                          <div className="text-blue-600 font-semibold">
                            ${((10 * studentDonationSplit.studentAccount) / 100).toFixed(2)}
                          </div>
                          <div className="text-gray-600">Compte Scolaire</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-600 font-semibold">
                            ${((10 * studentDonationSplit.studentCash) / 100).toFixed(2)}
                          </div>
                          <div className="text-gray-600">Comptant</div>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <span className="text-xs text-gray-500">
                          Total: {studentDonationSplit.studentAccount + studentDonationSplit.studentCash}%
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* School Donations Configuration */}
            <div className={`space-y-4 ${isApproved ? 'opacity-75' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className={`h-5 w-5 ${isApproved ? 'text-gray-500' : 'text-green-600'}`} />
                  <h3 className={`text-lg font-semibold ${isApproved ? 'text-gray-500' : 'text-gray-800'}`}>
                    Dons pour {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organizationLabel}
                  </h3>
                </div>
                <Toggle
                  pressed={schoolDonationsEnabled}
                  onPressedChange={setSchoolDonationsEnabled}
                  disabled={isApproved}
                  aria-label={`Activer les dons pour ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization}`}
                  size="sm"
                  variant="outline"
                  className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=off]:bg-gray-200 data-[state=off]:text-gray-700 min-w-16 disabled:opacity-50"
                >
                  {schoolDonationsEnabled ? 'Activé' : 'Désactivé'}
                </Toggle>
              </div>
              {!schoolDonationsEnabled && (
                <p className="text-sm text-gray-500 mt-2">Cette section est désactivée. Les dons pour {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization} ne seront pas affichés au checkout.</p>
              )}
              
              {schoolDonationsEnabled && (
                <>
                  <p className={`text-sm ${isApproved ? 'text-gray-500' : 'text-gray-600'}`}>
                    Les clients pourront ajouter un don pour soutenir {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization} et ses projets.
                  </p>

                  {/* School Donation Presets */}
                  <div className="space-y-3">
                    <h4 className={`text-sm font-semibold ${isApproved ? 'text-gray-500' : 'text-gray-700'}`}>
                      Montants de dons disponibles:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {schoolDonationPresets.map((preset, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={preset}
                            onChange={(e) => handleSchoolDonationPresetChange(index, e.target.value)}
                            className={`w-20 text-sm ${isApproved ? 'bg-gray-100' : ''}`}
                            disabled={isApproved}
                          />
                          <span className="text-sm text-gray-500">$</span>
                          {schoolDonationPresets.length > 2 && !isApproved && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeSchoolDonationPreset(index)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {schoolDonationPresets.length < 6 && !isApproved && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addSchoolDonationPreset}
                          className="h-8 px-3"
                        >
                          + Ajouter
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Les clients pourront choisir parmi ces montants ou entrer un montant personnalisé.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center pt-8">
          <div className="flex space-x-4">
            <Button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Save button clicked');
                handleSave();
              }}
              disabled={saving || isApproved}
              className={`
                relative px-8 py-4 text-lg font-semibold rounded-xl
                ${isApproved 
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl'
                }
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
              {!isApproved && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-400 to-green-500 opacity-0 hover:opacity-20 transition-opacity duration-200 pointer-events-none"></div>
              )}
            </Button>

            <Button 
              onClick={handleCancel}
              variant="outline"
              disabled={isApproved}
              className={`px-8 py-4 text-lg font-semibold rounded-xl border-2 transition-all duration-200 min-w-[200px] ${
                isApproved 
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <X className="h-5 w-5 mr-2" />
              Annuler
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la campagne</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette campagne ? Cette action est irréversible.
              {campaign?.name && (
                <span className="block mt-2 font-semibold text-gray-900">
                  Campagne: {campaign.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignEditor;