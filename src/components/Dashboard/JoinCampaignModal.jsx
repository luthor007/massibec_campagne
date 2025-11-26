import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  School,
  Calendar,
  Loader2,
  Search,
  ArrowLeft,
  CheckCircle,
  Users
} from 'lucide-react';

/**
 * Modal simplifié pour rejoindre une campagne
 * Flow: Liste des campagnes → (Si groupes) Sélection du groupe → Confirmation
 */
const JoinCampaignModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState('list'); // 'list' | 'group' | 'joining'
  const [searchTerm, setSearchTerm] = useState('');
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [userCampaignIds, setUserCampaignIds] = useState([]); // Pour vérifier les doublons

  // Fetch user's current campaigns to check for duplicates
  const fetchUserCampaigns = async () => {
    try {
      const response = await fetch('/api/users/campaigns');
      if (response.ok) {
        const data = await response.json();
        const ids = (data.campaigns || []).map(c => c._id?.toString() || c.campaignId?.toString());
        setUserCampaignIds(ids);
      }
    } catch (error) {
      console.error('Error fetching user campaigns:', error);
    }
  };

  // Fetch available campaigns
  const fetchAvailableCampaigns = async (search = '') => {
    setLoadingCampaigns(true);
    try {
      const url = search
        ? `/api/campaigns/available?search=${encodeURIComponent(search)}`
        : '/api/campaigns/available';

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAvailableCampaigns(data.campaigns || []);
      } else {
        setAvailableCampaigns([]);
      }
    } catch (error) {
      console.error('Error fetching available campaigns:', error);
      setAvailableCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Load campaigns when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableCampaigns();
      fetchUserCampaigns();
      setStep('list');
      setSelectedCampaign(null);
      setSelectedGroup(null);
      setError('');
    }
  }, [isOpen]);

  // Check if user already has this campaign
  const isAlreadyJoined = (campaignId) => {
    return userCampaignIds.includes(campaignId?.toString());
  };

  // Debounced search
  useEffect(() => {
    if (isOpen && step === 'list') {
      const timeoutId = setTimeout(() => {
        fetchAvailableCampaigns(searchTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, isOpen, step]);

  // Handle campaign selection
  const handleSelectCampaign = (campaign) => {
    // Vérifier si déjà rejoint
    if (isAlreadyJoined(campaign._id)) {
      setError('Vous avez déjà rejoint cette campagne !');
      return;
    }

    setSelectedCampaign(campaign);
    setError('');

    // Si la campagne a des groupes, afficher l'écran de sélection
    if (campaign.groups?.enabled && campaign.groups?.list?.length > 0) {
      setStep('group');
    } else {
      // Sinon, rejoindre directement
      joinCampaign(campaign, null);
    }
  };

  // Handle group selection and join
  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    joinCampaign(selectedCampaign, group.name);
  };

  // Join campaign
  const joinCampaign = async (campaign, groupId) => {
    setJoining(true);
    setStep('joining');
    setError('');

    try {
      const response = await fetch('/api/campaigns/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignCode: campaign.campaignCode,
          groupId: groupId
        })
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess?.(data.campaign);
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erreur lors de l\'adhésion');
        setStep('list');
      }
    } catch (error) {
      console.error('Error joining campaign:', error);
      setError('Erreur lors de l\'adhésion à la campagne');
      setStep('list');
    } finally {
      setJoining(false);
    }
  };

  const handleClose = () => {
    setStep('list');
    setSearchTerm('');
    setSelectedCampaign(null);
    setSelectedGroup(null);
    setError('');
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Écran de chargement pendant la jonction
  if (step === 'joining') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">Connexion à la campagne...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Écran de sélection du groupe
  if (step === 'group' && selectedCampaign) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <button
              onClick={() => setStep('list')}
              className="absolute left-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>
            <DialogTitle className="text-center pt-2">
              Choisissez votre groupe
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {/* Info campagne */}
            <div className="text-center mb-4 pb-4 border-b">
              <p className="font-semibold text-gray-900">{selectedCampaign.school?.name}</p>
              <p className="text-sm text-gray-500">Campagne #{selectedCampaign.campaignNumber}</p>
            </div>

            {/* Liste des groupes - scrollable */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {selectedCampaign.groups.list.map((group) => (
                <button
                  key={group.name || group}
                  onClick={() => handleSelectGroup(group)}
                  className="w-full p-3 text-left bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-xl transition-all duration-200 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors flex-shrink-0">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-800">{group.name || group}</span>
                  </div>
                  <CheckCircle className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Écran principal - liste des campagnes
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Rejoindre une campagne
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom d'école..."
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Liste des campagnes */}
          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-xl">
            {loadingCampaigns ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Chargement...</p>
              </div>
            ) : availableCampaigns.length === 0 ? (
              <div className="p-8 text-center">
                <School className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">
                  {searchTerm ? 'Aucune campagne trouvée' : 'Aucune campagne disponible'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {availableCampaigns.map((campaign) => {
                  const alreadyJoined = isAlreadyJoined(campaign._id);
                  return (
                    <button
                      key={campaign._id}
                      onClick={() => handleSelectCampaign(campaign)}
                      disabled={alreadyJoined}
                      className={`w-full p-4 text-left transition-colors duration-150 flex items-center justify-between ${alreadyJoined
                          ? 'bg-gray-50 cursor-not-allowed opacity-60'
                          : 'hover:bg-blue-50'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {campaign.school?.name || 'École'}
                          </h4>
                          {alreadyJoined && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              Déjà rejoint
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                          </span>
                        </div>
                        {campaign.groups?.enabled && campaign.groups?.list?.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                            <Users className="h-3 w-3" />
                            <span>{campaign.groups.list.length} groupes</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        {alreadyJoined ? (
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bouton annuler */}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={handleClose}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinCampaignModal;
