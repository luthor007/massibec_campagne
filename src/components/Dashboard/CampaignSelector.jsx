import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Plus, CheckCircle, School, Calendar } from 'lucide-react';

const CampaignSelector = ({ onCampaignSwitch, onJoinCampaign, initialCampaigns = null, initialActiveCampaignId = null }) => {
  const [campaigns, setCampaigns] = useState(initialCampaigns || []);
  const [activeCampaignId, setActiveCampaignId] = useState(initialActiveCampaignId || null);
  const [loading, setLoading] = useState(!initialCampaigns);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    // Only fetch if we don't have initial data
    if (!initialCampaigns) {
      fetchCampaigns();
    }

    // Listen for campaign changes from other components (like PersonnalisationForm)
    const handleCampaignSwitched = (event) => {
      const { campaignId } = event.detail;
      if (campaignId) {
        setActiveCampaignId(campaignId.toString());
        onCampaignSwitch?.(campaignId);
      }
    };

    window.addEventListener('campaignSwitched', handleCampaignSwitched);

    // Also refresh campaigns when window gains focus (in case it was changed elsewhere)
    const handleFocus = () => {
      if (!initialCampaigns) {
        fetchCampaigns();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('campaignSwitched', handleCampaignSwitched);
      window.removeEventListener('focus', handleFocus);
    };
  }, [onCampaignSwitch, initialCampaigns]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/users/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
        setActiveCampaignId(data.activeCampaignId);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignSwitch = async (campaignId) => {
    if (campaignId === activeCampaignId) return;

    setSwitching(true);
    try {
      const response = await fetch('/api/campaigns/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId })
      });

      if (response.ok) {
        setActiveCampaignId(campaignId);
        onCampaignSwitch?.(campaignId);

        // Dispatch custom event to notify other components (like PersonnalisationForm)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('campaignSwitched', {
            detail: { campaignId }
          }));
        }
      } else {
        console.error('Failed to switch campaign');
      }
    } catch (error) {
      console.error('Error switching campaign:', error);
    } finally {
      setSwitching(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'active': { color: 'bg-green-100 text-green-800', text: 'Active' },
      'approved': { color: 'bg-blue-100 text-blue-800', text: 'Approuvée' },
      'pending_approval': { color: 'bg-yellow-100 text-yellow-800', text: 'En attente' },
      'rejected': { color: 'bg-red-100 text-red-800', text: 'Rejetée' },
      'completed': { color: 'bg-gray-100 text-gray-800', text: 'Terminée' },
      'legacy': { color: 'bg-purple-100 text-purple-800', text: 'Legacy' }
    };

    const config = statusConfig[status] || statusConfig['pending_approval'];
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-CA', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="text-sm text-gray-600">Chargement...</span>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <Button
          onClick={onJoinCampaign}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          <span className="text-white">Rejoindre une campagne</span>
        </Button>
      </div>
    );
  }

  const activeCampaign = campaigns.find(c =>
    c._id === activeCampaignId || c.isActiveCampaign
  ) || campaigns[0];

  return (
    <div className="flex items-center space-x-2 w-full sm:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center space-x-2 sm:space-x-3 w-full sm:min-w-[240px] sm:max-w-[320px] justify-between bg-white hover:bg-gray-50 border-gray-300 shadow-sm h-auto py-2 sm:py-2.5 px-3 text-sm sm:text-base"
            disabled={switching}
          >
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              {activeCampaign?.school?.logo ? (
                <img
                  src={activeCampaign.school.logo}
                  alt={activeCampaign.school.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                  <School className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              )}
              <div className="text-left flex-1 min-w-0">
                <div className="text-sm sm:text-base font-bold text-gray-900 truncate leading-tight">
                  {activeCampaign?.school?.name || 'Aucune campagne'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Campagne #{activeCampaign?.campaignNumber || 'N/A'}
                </div>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 bg-white border border-gray-200 shadow-xl rounded-xl z-[80]">
          <div className="p-3 border-b border-gray-200 bg-white">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Mes Campagnes</h3>
            <p className="text-xs sm:text-sm text-gray-500">{campaigns.length} campagne(s)</p>
          </div>

          <div className="max-h-64 overflow-y-auto bg-white">
            {campaigns.map((campaign) => (
              <DropdownMenuItem
                key={campaign._id}
                onClick={() => handleCampaignSwitch(campaign._id)}
                className={`p-2 sm:p-3 cursor-pointer bg-white hover:bg-gray-50 ${campaign._id === activeCampaignId ? 'bg-blue-50' : ''}`}
                disabled={switching}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    {campaign?.school?.logo ? (
                      <img
                        src={campaign.school.logo}
                        alt={campaign.school.name}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                        <School className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-sm sm:text-base text-gray-900 truncate">
                          {campaign.school?.name}
                        </div>
                        {campaign._id === activeCampaignId && (
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        Campagne #{campaign.campaignNumber} • {campaign.campaignCode}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-500">
                          {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                        </span>
                      </div>
                      <div className="mt-1">
                        {getStatusBadge(campaign.status)}
                      </div>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>

          <DropdownMenuSeparator className="bg-gray-200" />
          <DropdownMenuItem
            onClick={onJoinCampaign}
            className="text-center text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold py-2.5 sm:py-3 text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 mr-2" />
            Rejoindre une nouvelle campagne
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CampaignSelector;
