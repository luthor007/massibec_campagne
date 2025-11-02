import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  School, 
  Calendar, 
  Target,
  Loader2 
} from 'lucide-react';

const JoinCampaignModal = ({ isOpen, onClose, onSuccess }) => {
  const [campaignCode, setCampaignCode] = useState('');
  const [objectifPersonnel, setObjectifPersonnel] = useState('');
  const [campaignPreview, setCampaignPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const validateCampaignCode = async (code) => {
    if (!code) {
      setCampaignPreview(null);
      setValidationError('');
      return;
    }

    // Basic format validation
    const formatPattern = /^\d{6}-C\d+$/;
    if (!formatPattern.test(code)) {
      setValidationError('Format invalide. Utilisez le format: XXXXXX-CX');
      setCampaignPreview(null);
      return;
    }

    setLoading(true);
    setValidationError('');

    try {
      const response = await fetch(`/api/campaigns/lookup?code=${encodeURIComponent(code)}`);
      
      if (response.ok) {
        const data = await response.json();
        setCampaignPreview(data.campaign);
        setError('');
      } else {
        const errorData = await response.json();
        setValidationError(errorData.message || 'Code de campagne non trouvé');
        setCampaignPreview(null);
      }
    } catch (error) {
      console.error('Error validating campaign code:', error);
      setValidationError('Erreur lors de la validation du code');
      setCampaignPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignCodeChange = (e) => {
    const code = e.target.value.toUpperCase();
    setCampaignCode(code);
    validateCampaignCode(code);
  };

  const handleJoinCampaign = async () => {
    if (!campaignCode || !objectifPersonnel || !campaignPreview) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const response = await fetch('/api/campaigns/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignCode,
          objectifPersonnel: parseInt(objectifPersonnel)
        })
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess?.(data.campaign);
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erreur lors de l\'adhésion à la campagne');
      }
    } catch (error) {
      console.error('Error joining campaign:', error);
      setError('Erreur lors de l\'adhésion à la campagne');
    } finally {
      setJoining(false);
    }
  };

  const handleClose = () => {
    setCampaignCode('');
    setObjectifPersonnel('');
    setCampaignPreview(null);
    setError('');
    setValidationError('');
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'active': { color: 'bg-green-100 text-green-800', text: 'Active' },
      'approved': { color: 'bg-blue-100 text-blue-800', text: 'Approuvée' },
      'pending_approval': { color: 'bg-orange-100 text-orange-800', text: 'EN TEST' },
      'pending_school_approval': { color: 'bg-orange-100 text-orange-800', text: 'EN TEST' },
      'rejected': { color: 'bg-red-100 text-red-800', text: 'Rejetée' },
      'completed': { color: 'bg-gray-100 text-gray-800', text: 'Terminée' }
    };
    
    const config = statusConfig[status] || statusConfig['pending_approval'];
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <School className="h-5 w-5" />
            <span>Rejoindre une campagne</span>
          </DialogTitle>
          <DialogDescription>
            Entrez le code de campagne fourni par votre école pour rejoindre une campagne de financement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Code Input */}
          <div className="space-y-2">
            <Label htmlFor="campaignCode">Code de campagne</Label>
            <div className="relative">
              <Input
                id="campaignCode"
                value={campaignCode}
                onChange={handleCampaignCodeChange}
                placeholder="Ex: 123456-C1"
                className={`pr-10 ${validationError ? 'border-red-300' : ''}`}
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              )}
              {!loading && campaignCode && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {validationError ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : campaignPreview ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : null}
                </div>
              )}
            </div>
            {validationError && (
              <p className="text-sm text-red-600">{validationError}</p>
            )}
          </div>

          {/* Campaign Preview */}
          {campaignPreview && (
            <>
              {(campaignPreview.status === 'pending_approval' || campaignPreview.status === 'pending_school_approval') && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-900 mb-1">Mode Test</h4>
                      <p className="text-sm text-orange-800">
                        Cette campagne est en attente d'approbation. Vous pouvez la rejoindre en mode test. 
                        Les commandes et données seront marquées comme "TEST" et ne seront pas définitives jusqu'à l'approbation de la campagne.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {campaignPreview && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                  <School className="h-4 w-4" />
                  <span>{campaignPreview.school?.name}</span>
                </h3>
                {getStatusBadge(campaignPreview.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Campagne:</span>
                  <span className="ml-2 font-medium">#{campaignPreview.campaignNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">Code:</span>
                  <span className="ml-2 font-mono font-medium">{campaignPreview.campaignCode}</span>
                </div>
                <div>
                  <span className="text-gray-600">Début:</span>
                  <span className="ml-2">{formatDate(campaignPreview.startDate)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Fin:</span>
                  <span className="ml-2">{formatDate(campaignPreview.endDate)}</span>
                </div>
              </div>
              
              {campaignPreview.school?.address && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="text-gray-600">Adresse:</span>
                  <span className="ml-2">{campaignPreview.school.address}</span>
                </div>
              )}
            </div>
          )}

          {/* Personal Objective */}
          {campaignPreview && (
            <div className="space-y-2">
              <Label htmlFor="objectifPersonnel" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Objectif personnel de vente</span>
              </Label>
              <Select value={objectifPersonnel} onValueChange={setObjectifPersonnel}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez votre objectif" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 produits</SelectItem>
                  <SelectItem value="15">15 produits</SelectItem>
                  <SelectItem value="20">20 produits</SelectItem>
                  <SelectItem value="25">25 produits</SelectItem>
                  <SelectItem value="30">30 produits</SelectItem>
                  <SelectItem value="35">35 produits</SelectItem>
                  <SelectItem value="40">40 produits</SelectItem>
                  <SelectItem value="45">45 produits</SelectItem>
                  <SelectItem value="50">50 produits</SelectItem>
                  <SelectItem value="60">60 produits</SelectItem>
                  <SelectItem value="70">70 produits</SelectItem>
                  <SelectItem value="80">80 produits</SelectItem>
                  <SelectItem value="90">90 produits</SelectItem>
                  <SelectItem value="100">100 produits</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button 
              onClick={handleJoinCampaign}
              disabled={!campaignPreview || !objectifPersonnel || joining}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {joining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejoindre...
                </>
              ) : (
                'Rejoindre la campagne'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinCampaignModal;
