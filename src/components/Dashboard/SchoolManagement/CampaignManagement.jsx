import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Calendar,
  DollarSign,
  Percent,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  Edit,
  Lock,
  Unlock,
  Loader2,
  Play,
  Pause,
  Check,
  X
} from 'lucide-react';

const CampaignManagement = ({ school, onCampaignUpdate }) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAnimation, setSaveAnimation] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (school?.campaigns) {
      setCampaigns(school.campaigns);
      // Select the active campaign by default, or the first one if none selected
      if (school.campaigns.length > 0 && !selectedCampaignId) {
        const activeCampaign = school.campaigns.find(c => c.isActive);
        const defaultCampaign = activeCampaign || school.campaigns[0];
        setSelectedCampaignId(defaultCampaign._id);
      }
    }
  }, [school, selectedCampaignId]);

  const selectedCampaign = campaigns.find(c => c._id === selectedCampaignId);
  
  // Ensure campaign has default profit split values only if they don't exist
  const campaignWithDefaults = selectedCampaign ? {
    ...selectedCampaign,
    profitSplitType: selectedCampaign.profitSplitType || 'percentage',
    profitSplit: {
      studentBenefit: selectedCampaign.profitSplit?.studentBenefit !== undefined ? selectedCampaign.profitSplit.studentBenefit : 85.6,
      organizationBenefit: selectedCampaign.profitSplit?.organizationBenefit !== undefined ? selectedCampaign.profitSplit.organizationBenefit : 9.4,
      raffleBenefit: selectedCampaign.profitSplit?.raffleBenefit !== undefined ? selectedCampaign.profitSplit.raffleBenefit : 5.0,
      ...selectedCampaign.profitSplit
    }
  } : null;

  const isDateInPast = (date) => {
    return new Date(date) < new Date();
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
      return 'N/A';
    }
    return dateObj.toLocaleDateString('fr-CA');
  };

  const formatDateForInput = (date) => {
    if (!date) return '';
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
      return '';
    }
    // Use UTC date to avoid timezone issues
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente d'approbation</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approuvée</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejetée</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Terminée</Badge>;
      case 'pending_school_approval':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">En attente école</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveAnimation(false);

    const formData = new FormData(e.target);
    const financialGoalValue = formData.get('financialGoal');
    
    
    // Validate financial goal
    if (!financialGoalValue || financialGoalValue === '' || isNaN(parseFloat(financialGoalValue))) {
      alert('L\'objectif financier est requis et doit être un nombre valide');
      setIsSaving(false);
      return;
    }
    
    const updateData = {
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      deliveryDate: formData.get('deliveryDate'),
      financialGoal: parseFloat(financialGoalValue),
      profitSplitType: formData.get('profitSplitType'),
      studentBenefit: parseFloat(formData.get('studentBenefit')) || 0,
      organizationBenefit: parseFloat(formData.get('organizationBenefit')) || 0,
      raffleBenefit: parseFloat(formData.get('raffleBenefit')) || 0,
      notes: formData.get('notes')
    };

    try {
      const response = await fetch(`/api/campaigns/${selectedCampaignId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedCampaign = await response.json();
        
        // Update local state
        setCampaigns(prev => prev.map(c => 
          c._id === selectedCampaignId ? { ...c, ...updatedCampaign.campaign } : c
        ));
        
        // Trigger save animation
        setSaveAnimation(true);
        setTimeout(() => setSaveAnimation(false), 2000);
        
        // Notify parent component
        if (onCampaignUpdate) {
          onCampaignUpdate(updatedCampaign.campaign);
        }
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleLock = async (lockType) => {
    setIsTogglingLock(true);
    try {
      const response = await fetch(`/api/campaigns/${selectedCampaignId}/toggle-${lockType}-lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const updatedCampaign = await response.json();
        setCampaigns(prev => prev.map(c => 
          c._id === selectedCampaignId ? { ...c, ...updatedCampaign.campaign } : c
        ));
      } else {
        alert('Erreur lors de la modification du verrouillage');
      }
    } catch (error) {
      console.error('Error toggling lock:', error);
      alert('Une erreur est survenue');
    } finally {
      setIsTogglingLock(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/campaigns/${selectedCampaignId}/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updatedCampaign = await response.json();
        setCampaigns(prev => prev.map(c => 
          c._id === selectedCampaignId ? { ...c, ...updatedCampaign.campaign } : c
        ));
        
        // Notify parent component
        if (onCampaignUpdate) {
          onCampaignUpdate(updatedCampaign.campaign);
        }
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour du statut');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (!school || !school.campaigns || school.campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Gestion des Campagnes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Aucune campagne disponible pour cette école.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Gestion des Campagnes
        </CardTitle>
        <CardDescription>
          Gérez les campagnes de {school.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campaign Selector */}
        <div>
          <Label htmlFor="campaign-selector">
            {campaigns.length > 1 ? 'Sélectionner une campagne' : 'Campagne active'}
          </Label>
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choisir une campagne" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign._id} value={campaign._id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Campagne #{campaign.campaignNumber}</span>
                        {campaign.isActive && (
                          <Badge variant="default" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                      </span>
                    </div>
                    <div className="ml-2">
                      {getStatusBadge(campaign.status)}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {campaignWithDefaults && (
          <div className="space-y-6">
            {/* Campaign Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-gray-600">Statut</Label>
                <div className="mt-1">
                  {getStatusBadge(campaignWithDefaults.status)}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Objectif financier</Label>
                <div className="mt-1 flex items-center">
                  <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                  <span className="font-semibold">{campaignWithDefaults.financialGoal?.toLocaleString() || '0'}$</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Type de répartition</Label>
                <div className="mt-1 flex items-center">
                  <Percent className="h-4 w-4 mr-1 text-blue-600" />
                  <span>{campaignWithDefaults.profitSplitType === 'percentage' ? 'Pourcentage' : 'Valeur absolue'}</span>
                </div>
              </div>
            </div>

            {/* Status Management */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-sm font-medium text-blue-900 mb-3 block">Gestion du statut</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('pending_approval')}
                  disabled={isUpdatingStatus || campaignWithDefaults.status === 'pending_approval'}
                  className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  En attente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('approved')}
                  disabled={isUpdatingStatus || campaignWithDefaults.status === 'approved'}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approuver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('active')}
                  disabled={isUpdatingStatus || campaignWithDefaults.status === 'active'}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Activer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('rejected')}
                  disabled={isUpdatingStatus || campaignWithDefaults.status === 'rejected'}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Rejeter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdatingStatus || campaignWithDefaults.status === 'completed'}
                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Terminer
                </Button>
              </div>
            </div>

            {/* Date Warnings */}
            <div className="space-y-2">
              {isDateInPast(campaignWithDefaults.endDate) && (
                <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-red-700 text-sm">
                    ⚠️ La date de fin de campagne ({formatDate(campaignWithDefaults.endDate)}) est dans le passé
                  </span>
                </div>
              )}
              {isDateInPast(campaignWithDefaults.deliveryDate) && (
                <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-red-700 text-sm">
                    ⚠️ La date de livraison ({formatDate(campaignWithDefaults.deliveryDate)}) est dans le passé
                  </span>
                </div>
              )}
            </div>

            {/* Lock Controls */}
            <div className="flex space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleLock('profit')}
                disabled={isTogglingLock}
                className={`flex items-center transition-colors ${
                  campaignWithDefaults.profitSplitLocked 
                    ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' 
                    : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                }`}
              >
                {campaignWithDefaults.profitSplitLocked ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
                {campaignWithDefaults.profitSplitLocked ? 'Déverrouiller Profits' : 'Verrouiller Profits'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleLock('dates')}
                disabled={isTogglingLock}
                className={`flex items-center transition-colors ${
                  campaignWithDefaults.datesLocked 
                    ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' 
                    : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                }`}
              >
                {campaignWithDefaults.datesLocked ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
                {campaignWithDefaults.datesLocked ? 'Déverrouiller Dates' : 'Verrouiller Dates'}
              </Button>
            </div>

            {/* Campaign Edit Form */}
            <form onSubmit={handleSaveCampaign} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startDate">Date de début</Label>
                  <Input
                    type="date"
                    id="startDate"
                    name="startDate"
                    defaultValue={formatDateForInput(campaignWithDefaults.startDate)}
                    disabled={campaignWithDefaults.datesLocked}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Date de fin</Label>
                  <Input
                    type="date"
                    id="endDate"
                    name="endDate"
                    defaultValue={formatDateForInput(campaignWithDefaults.endDate)}
                    disabled={campaignWithDefaults.datesLocked}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryDate">Date de livraison</Label>
                  <Input
                    type="date"
                    id="deliveryDate"
                    name="deliveryDate"
                    defaultValue={formatDateForInput(campaignWithDefaults.deliveryDate)}
                    disabled={campaignWithDefaults.datesLocked}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="financialGoal">Objectif financier ($)</Label>
                <Input
                  type="number"
                  id="financialGoal"
                  name="financialGoal"
                  defaultValue={campaignWithDefaults.financialGoal || 0}
                  min="0"
                  step="0.01"
                  className="mt-1"
                  placeholder="Ex: 1000.00"
                  required
                />
              </div>

              {/* Profit Split Configuration */}
              <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Percent className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">Configuration des profits</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="profitSplitType">Type de répartition</Label>
                    <Select 
                      defaultValue={campaignWithDefaults.profitSplitType || 'percentage'} 
                      name="profitSplitType"
                      disabled={campaignWithDefaults.profitSplitLocked}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionnez le type de répartition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          <div className="flex items-center space-x-2">
                            <Percent className="h-4 w-4" />
                            <span>Pourcentage par produit</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="absolute">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Valeur absolue par produit</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="studentBenefit">
                        Bénéfice étudiant {campaignWithDefaults.profitSplitType === 'percentage' ? '(%)' : '($)'}
                      </Label>
                      <Input
                        type="number"
                        id="studentBenefit"
                        name="studentBenefit"
                        defaultValue={campaignWithDefaults.profitSplit?.studentBenefit || 0}
                        min="0"
                        step={campaignWithDefaults.profitSplitType === 'percentage' ? "0.1" : "0.01"}
                        max={campaignWithDefaults.profitSplitType === 'percentage' ? "100" : undefined}
                        disabled={campaignWithDefaults.profitSplitLocked}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="organizationBenefit">
                        Bénéfice organisation {campaignWithDefaults.profitSplitType === 'percentage' ? '(%)' : '($)'}
                      </Label>
                      <Input
                        type="number"
                        id="organizationBenefit"
                        name="organizationBenefit"
                        defaultValue={campaignWithDefaults.profitSplit?.organizationBenefit || 0}
                        min="0"
                        step={campaignWithDefaults.profitSplitType === 'percentage' ? "0.1" : "0.01"}
                        max={campaignWithDefaults.profitSplitType === 'percentage' ? "100" : undefined}
                        disabled={campaignWithDefaults.profitSplitLocked}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="raffleBenefit">
                        Bénéfice tirage {campaignWithDefaults.profitSplitType === 'percentage' ? '(%)' : '($)'}
                      </Label>
                      <Input
                        type="number"
                        id="raffleBenefit"
                        name="raffleBenefit"
                        defaultValue={campaignWithDefaults.profitSplit?.raffleBenefit || 0}
                        min="0"
                        step={campaignWithDefaults.profitSplitType === 'percentage' ? "0.1" : "0.01"}
                        max={campaignWithDefaults.profitSplitType === 'percentage' ? "100" : undefined}
                        disabled={campaignWithDefaults.profitSplitLocked}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={campaignWithDefaults.notes}
                  placeholder="Ajoutez des notes sur cette campagne..."
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className={`flex items-center space-x-2 transition-all duration-300 ${
                    saveAnimation 
                      ? 'bg-green-600 hover:bg-green-700 scale-105' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saveAnimation ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>
                    {isSaving ? 'Sauvegarde...' : saveAnimation ? 'Sauvegardé!' : 'Sauvegarder les modifications'}
                  </span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignManagement;