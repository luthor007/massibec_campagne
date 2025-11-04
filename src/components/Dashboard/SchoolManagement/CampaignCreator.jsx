import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Calendar,
  DollarSign,
  Percent,
  Target,
  Package,
  X,
  Settings,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import ParentLetterModal from './ParentLetterModal';
import { getTerminology } from '@/utils/organizationHelpers';

const CampaignCreator = ({ onCampaignCreated, school }) => {
  // Get terminology based on organization type
  const organizationType = school?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    deliveryDate: '',
    financialGoal: '',
    distributionStartHour: '',
    distributionEndHour: ''
  });
  const [creating, setCreating] = useState(false);
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
  
  const [showParentLetterModal, setShowParentLetterModal] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState(null);
  
  // Global profit settings - load from localStorage or defaults
  const [globalProfitSettings, setGlobalProfitSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('globalProfitSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            profitPerProduct: parsed.profitPerProduct || 3.00,
            studentCash: parsed.studentCash !== undefined ? parsed.studentCash : 1.00,
            studentSchoolAccount: parsed.studentSchoolAccount !== undefined ? parsed.studentSchoolAccount : 1.00,
            schoolProject: parsed.schoolProject !== undefined ? parsed.schoolProject : 0.75,
            raffle: parsed.raffle !== undefined ? parsed.raffle : 0.25
          };
        } catch (e) {
          console.error('Error parsing saved globalProfitSettings:', e);
        }
      }
    }
    return {
      profitPerProduct: 3.00,
      studentCash: 1.00,
      studentSchoolAccount: 1.00,
      schoolProject: 0.75,
      raffle: 0.25
    };
  });

  // State for visual feedback when applying settings
  const [settingsApplied, setSettingsApplied] = useState(false);

  // Load products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          // Extract products array from the response
          const productsData = data.products || [];
          setProducts(productsData);
          
          // Initialize custom prices with default prices
          const initialPrices = {};
          const initialProfitSplits = {};
          productsData.forEach(product => {
            initialPrices[product.id] = product.price;
            // Initialize profit splits with 0 - user will set values manually or use global controls
            initialProfitSplits[product.id] = {
              studentCash: 0,
              studentSchoolAccount: 0,
              schoolProject: 0,
              raffle: 0
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
  }, []);

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

  // Handle global profit settings changes
  const handleGlobalProfitSettingsChange = (field, value) => {
    setGlobalProfitSettings(prev => {
      const updated = {
        ...prev,
        [field]: parseFloat(value) || 0
      };
      // Save to localStorage whenever it changes
      if (typeof window !== 'undefined') {
        localStorage.setItem('globalProfitSettings', JSON.stringify(updated));
      }
      return updated;
    });
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
    
    // Save global profit settings to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('globalProfitSettings', JSON.stringify(globalProfitSettings));
    }
    
    // Show visual feedback
    setSettingsApplied(true);
    toast.success('Répartition des profits appliquée à tous les produits');
    
    // Reset visual feedback after animation
    setTimeout(() => {
      setSettingsApplied(false);
    }, 2000);
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

  // Import date helpers
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate minimum delivery date (3 weeks after end date)
  const getMinDeliveryDate = () => {
    if (!formData.endDate) {
      return '';
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
    console.log('Validating form:', formData);
    
    if (!startDate || !endDate || !deliveryDate || !financialGoal) {
      console.log('Missing required fields:', { startDate, endDate, deliveryDate, financialGoal });
      toast.error('Tous les champs sont requis');
      return false;
    }

    // Parse dates as local dates (YYYY-MM-DD format) to avoid timezone issues
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const delivery = new Date(deliveryDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    // Also normalize start date for comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    delivery.setHours(0, 0, 0, 0);

    console.log('Date validation:', { start, end, delivery });

    if (end <= start) {
      console.log('End date validation failed: end <= start', { end, start });
      toast.error('La date de fin doit être après la date de début');
      return false;
    }

    const threeWeeksInMillis = 21 * 24 * 60 * 60 * 1000;
    const timeDiff = delivery.getTime() - end.getTime();
    console.log('Delivery date validation:', { timeDiff, threeWeeksInMillis, required: timeDiff >= threeWeeksInMillis });
    if (timeDiff < threeWeeksInMillis) {
      console.log('Delivery date validation failed');
      toast.error('La date de livraison doit être au moins 3 semaines après la fin de la campagne');
      return false;
    }

    const financialGoalValue = parseFloat(financialGoal);
    console.log('Financial goal validation:', { financialGoalValue });
    if (financialGoalValue <= 0 || isNaN(financialGoalValue)) {
      console.log('Financial goal validation failed');
      toast.error('L\'objectif financier doit être supérieur à 0');
      return false;
    }

    // Validate distribution hours if provided
    if (formData.distributionStartHour && formData.distributionEndHour) {
      const startMatch = formData.distributionStartHour.match(/(\d{2})h(\d{2})/);
      const endMatch = formData.distributionEndHour.match(/(\d{2})h(\d{2})/);
      
      console.log('Distribution hours validation:', { 
        distributionStartHour: formData.distributionStartHour, 
        distributionEndHour: formData.distributionEndHour,
        startMatch, 
        endMatch 
      });
      
      if (startMatch && endMatch) {
        const startMinutes = parseInt(startMatch[1]) * 60 + parseInt(startMatch[2]);
        const endMinutes = parseInt(endMatch[1]) * 60 + parseInt(endMatch[2]);
        
        console.log('Distribution hours comparison:', { startMinutes, endMinutes, valid: endMinutes > startMinutes });
        
        if (endMinutes <= startMinutes) {
          console.log('Distribution hours validation failed');
          toast.error('L\'heure de fin doit être après l\'heure de début');
          return false;
        }
      }
    }

    console.log('All validations passed!');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted!', formData);
    
    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }
    
    console.log('Validation passed, creating campaign...');
    setCreating(true);
    try {
      const campaignData = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        deliveryDate: formData.deliveryDate,
        distributionStartHour: formData.distributionStartHour,
        distributionEndHour: formData.distributionEndHour,
        financialGoal: parseFloat(formData.financialGoal),
        customPrices: Object.entries(customPrices).map(([productId, price]) => ({
          productId,
          price: parseFloat(price)
        })),
        profitSplits: Object.entries(profitSplits).map(([productId, splits]) => {
          // Preserve 0 values - don't use || which treats 0 as falsy
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
            studentSchoolAccount: parseValue(splits.studentSchoolAccount, 1.00),
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
        },
        schoolId: school?.id || school?._id // Pass school ID to ensure correct school association
      };

      const response = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Campagne créée avec succès! En attente d\'approbation de Massibec.');
        
        // Store the created campaign and show parent letter modal
        setCreatedCampaign(result.campaign);
        setShowParentLetterModal(true);
        
        // Reset form
        setFormData({
          startDate: '',
          endDate: '',
          deliveryDate: '',
          financialGoal: '',
          distributionStartHour: '',
          distributionEndHour: ''
        });
        setCustomPrices({});
        setProfitSplits({});

        // Notify parent component
        onCampaignCreated && onCampaignCreated(result.campaign);
      } else {
        let errorMessage = 'Erreur lors de la création de la campagne';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Campaign creation error:', errorData);
        } catch (e) {
          console.error('Error parsing error response:', e);
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(`Erreur lors de la création de la campagne: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 lg:p-6 bg-white rounded-lg shadow-md overflow-x-hidden">
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-3 sm:mb-4">
          <Target className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 px-2 break-words">
          Créer une Nouvelle Campagne
        </h2>
        <p className="text-gray-600 text-sm sm:text-base lg:text-lg px-2">
          Configurez les paramètres de votre nouvelle campagne de financement
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
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
          required
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="deliveryDate" className="text-sm font-medium text-gray-700">Date de livraison *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                  min={getMinDeliveryDate()}
                  className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  required
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
                  <Label htmlFor="distributionStartHour" className="text-sm font-medium text-gray-700">Heure de début de distribution</Label>
                  <Select
                    value={formData.distributionStartHour || ''}
                    onValueChange={(value) => handleInputChange('distributionStartHour', value)}
                  >
                    <SelectTrigger className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
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
                  <Label htmlFor="distributionEndHour" className="text-sm font-medium text-gray-700">Heure de fin de distribution</Label>
                  <Select
                    value={formData.distributionEndHour || ''}
                    onValueChange={(value) => handleInputChange('distributionEndHour', value)}
                  >
                    <SelectTrigger className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
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
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Le montant total que vous souhaitez récolter
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Product Prices */}
          <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
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
                
                {/* Profit Split Templates and Global Controls */}
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
                            {terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} compte {terminology.organization} ($)
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
                            Projet {terminology.organizationLabel} ($)
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
                      className={`w-full text-white transition-all duration-300 ${
                        settingsApplied 
                          ? 'bg-green-600 hover:bg-green-700 scale-105 shadow-lg ring-4 ring-green-300 ring-opacity-50' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        {settingsApplied ? (
                          <>
                            <Check className="h-5 w-5 animate-pulse" />
                            <span className="font-semibold">Appliqué avec succès!</span>
                          </>
                        ) : (
                          <span>Appliquer cette répartition à tous les produits</span>
                        )}
                      </div>
                    </Button>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {products.map((product) => {
                   const sellingPrice = customPrices[product.id] || product.price;
                   const profit = sellingPrice - product.cost;
                   
                   return (
                     <div 
                       key={product.id} 
                       className={`border-0 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] ${
                         settingsApplied 
                           ? 'ring-2 ring-green-400 ring-opacity-75 bg-gradient-to-br from-green-50 to-gray-50' 
                           : ''
                       }`}
                     >
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
                                 step="0.25"
                                 min="0"
                                 value={sellingPrice}
                                 onChange={(e) => handlePriceChange(product.id, e.target.value)}
                                 className="text-sm h-9 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
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
                               <div className="flex items-center gap-2">
                                 <Label htmlFor={`studentCash-${product.id}`} className="text-xs text-gray-600 w-20">
                                   {terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} comptant:
                                 </Label>
                                 <Input
                                   id={`studentCash-${product.id}`}
                                   type="number"
                                   step="0.25"
                                   min="0"
                                   value={profitSplits[product.id]?.studentCash ?? 1.00}
                                   onChange={(e) => handleProfitSplitChange(product.id, 'studentCash', e.target.value)}
                                   className="text-xs h-7 border-2 border-gray-200 rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-200 transition-all duration-200 flex-1"
                                 />
                               </div>
                               <div className="flex items-center gap-2">
                                 <Label htmlFor={`studentSchoolAccount-${product.id}`} className="text-xs text-gray-600 w-20">
                                   {terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} compte {terminology.organization}:
                                 </Label>
                                 <Input
                                   id={`studentSchoolAccount-${product.id}`}
                                   type="number"
                                   step="0.25"
                                   min="0"
                                   value={profitSplits[product.id]?.studentSchoolAccount ?? 1.00}
                                   onChange={(e) => handleProfitSplitChange(product.id, 'studentSchoolAccount', e.target.value)}
                                   className="text-xs h-7 border-2 border-gray-200 rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-200 transition-all duration-200 flex-1"
                                 />
                               </div>
                               <div className="flex items-center gap-2">
                                 <Label htmlFor={`school-${product.id}`} className="text-xs text-gray-600 w-16">
                                   {terminology.organizationLabel}:
                                 </Label>
                                 <Input
                                   id={`school-${product.id}`}
                                   type="number"
                                   step="0.25"
                                   min="0"
                                   value={profitSplits[product.id]?.schoolProject ?? 0.75}
                                   onChange={(e) => handleProfitSplitChange(product.id, 'schoolProject', e.target.value)}
                                   className="text-xs h-7 border-2 border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-200 flex-1"
                                 />
                               </div>
                               <div className="flex items-center gap-2">
                                 <Label htmlFor={`raffle-${product.id}`} className="text-xs text-gray-600 w-16">
                                   Tirage:
                                 </Label>
                                 <Input
                                   id={`raffle-${product.id}`}
                                   type="number"
                                   step="0.25"
                                   min="0"
                                   value={profitSplits[product.id]?.raffle ?? 0.25}
                                   onChange={(e) => handleProfitSplitChange(product.id, 'raffle', e.target.value)}
                                   className="text-xs h-7 border-2 border-gray-200 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-200 transition-all duration-200 flex-1"
                                 />
                               </div>
                               
                               {/* Profit Distribution Summary */}
                               <div className="mt-2 pt-2 border-t border-gray-100">
                                 {(() => {
                                   const splits = profitSplits[product.id] || { studentCash: 1.00, studentSchoolAccount: 1.00, schoolProject: 0.75, raffle: 0.25 };
                                   const studentCashValue = splits.studentCash === '' ? 0 : (splits.studentCash || 0);
                                   const studentSchoolAccountValue = splits.studentSchoolAccount === '' ? 0 : (splits.studentSchoolAccount || 0);
                                   const schoolValue = splits.schoolProject === '' ? 0 : (splits.schoolProject || 0);
                                   const raffleValue = splits.raffle === '' ? 0 : (splits.raffle || 0);
                                   const totalDistributed = studentCashValue + studentSchoolAccountValue + schoolValue + raffleValue;
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

          {/* Student Donations Configuration */}
          <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-blue-900">
                  <DollarSign className="h-5 w-5" />
                  <span>Dons pour les {terminology.participantsLabel.charAt(0).toUpperCase() + terminology.participantsLabel.slice(1)}</span>
                </CardTitle>
                <Toggle
                  pressed={studentDonationsEnabled}
                  onPressedChange={setStudentDonationsEnabled}
                  aria-label={`Activer les dons pour les ${terminology.participants}`}
                  size="sm"
                  variant="outline"
                  className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=off]:bg-gray-200 data-[state=off]:text-gray-700 min-w-16"
                >
                  {studentDonationsEnabled ? 'Activé' : 'Désactivé'}
                </Toggle>
              </div>
            </CardHeader>
            <CardContent>
              {!studentDonationsEnabled && (
                <p className="text-sm text-gray-500">Cette section est désactivée. Les dons pour les {terminology.participants} ne seront pas affichés au checkout.</p>
              )}
              {studentDonationsEnabled && (
                <div className="space-y-6">
                  <p className="text-sm text-gray-600">
                    Les clients pourront ajouter un don pour soutenir les {terminology.participants} de {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization}.
                  </p>

                  {/* Student Donation Presets */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">
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
                            className="w-20 text-sm"
                          />
                          <span className="text-sm text-gray-500">$</span>
                          {studentDonationPresets.length > 2 && (
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
                      {studentDonationPresets.length < 6 && (
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
                    <h4 className="text-sm font-semibold text-gray-700">
                      Répartition des dons {terminology.participants} (en pourcentage):
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="student-donation-account" className="text-sm text-gray-600">
                          {terminology.accountLabel}:
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
                            className="text-sm"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="student-donation-cash" className="text-sm text-gray-600">
                          {terminology.cashLabel}:
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
                            className="text-sm"
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
                          <div className="text-gray-600">{terminology.accountLabel}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-600 font-semibold">
                            ${((10 * studentDonationSplit.studentCash) / 100).toFixed(2)}
                          </div>
                          <div className="text-gray-600">{terminology.cashLabelShort}</div>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <span className="text-xs text-gray-500">
                          Total: {studentDonationSplit.studentAccount + studentDonationSplit.studentCash}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* School Donations Configuration */}
          <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-green-900">
                  <Target className="h-5 w-5" />
                  <span>Dons pour {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organizationLabel}</span>
                </CardTitle>
                <Toggle
                  pressed={schoolDonationsEnabled}
                  onPressedChange={setSchoolDonationsEnabled}
                  aria-label={`Activer les dons pour ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization}`}
                  size="sm"
                  variant="outline"
                  className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=off]:bg-gray-200 data-[state=off]:text-gray-700 min-w-16"
                >
                  {schoolDonationsEnabled ? 'Activé' : 'Désactivé'}
                </Toggle>
              </div>
            </CardHeader>
            <CardContent>
              {!schoolDonationsEnabled && (
                <p className="text-sm text-gray-500">Cette section est désactivée. Les dons pour {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization} ne seront pas affichés au checkout.</p>
              )}
              {schoolDonationsEnabled && (
                <div className="space-y-6">
                  <p className="text-sm text-gray-600">
                    Les clients pourront ajouter un don pour soutenir {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization} et ses projets.
                  </p>

                  {/* School Donation Presets */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">
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
                            className="w-20 text-sm"
                          />
                          <span className="text-sm text-gray-500">$</span>
                          {schoolDonationPresets.length > 2 && (
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
                      {schoolDonationPresets.length < 6 && (
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
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        <div className="flex justify-center pt-6 sm:pt-8">
          <Button 
            type="submit" 
            disabled={creating}
            onClick={(e) => {
              console.log('Button clicked!', e);
            }}
            className={`
              relative px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl
              bg-gradient-to-r from-blue-600 to-blue-700 
              hover:from-blue-700 hover:to-blue-800
              text-white shadow-lg hover:shadow-xl
              transform transition-all duration-200 ease-in-out
              hover:scale-105 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              disabled:hover:scale-100 disabled:hover:shadow-lg
              w-full sm:w-auto sm:min-w-[180px] lg:min-w-[200px]
              ${creating ? 'animate-pulse' : ''}
            `}
          >
            <div className="flex items-center justify-center space-x-2 sm:space-x-3">
              {creating ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm sm:text-base">Création en cours...</span>
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Créer la Campagne</span>
                </>
              )}
            </div>
            
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 hover:opacity-20 transition-opacity duration-200 pointer-events-none"></div>
          </Button>
        </div>
      </form>
      
      {/* Parent Letter Modal */}
      <ParentLetterModal
        isOpen={showParentLetterModal}
        onClose={() => setShowParentLetterModal(false)}
        campaign={createdCampaign}
        school={school}
      />
    </div>
  );
};

export default CampaignCreator;
