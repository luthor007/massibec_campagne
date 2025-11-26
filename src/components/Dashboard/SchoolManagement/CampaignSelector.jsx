import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Target, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { isTestCampaign } from '../../../utils/campaignHelpers';

const CampaignSelector = ({ campaigns, selectedCampaign, onSelect, loading }) => {
  const getModeColor = (mode) => {
    if (mode === 'production') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-orange-100 text-orange-800 border-orange-200'; // Test mode
  };

  const getModeIcon = (mode) => {
    if (mode === 'production') {
      return <CheckCircle className="h-3 w-3" />;
    }
    return <AlertCircle className="h-3 w-3" />; // Test mode icon
  };

  const getModeLabel = (mode) => {
    if (mode === 'production') {
      return 'Production';
    }
    return 'Test';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg animate-pulse"></div>
        <div className="animate-pulse bg-gray-200 h-10 w-64 rounded-lg"></div>
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg flex items-center justify-center">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-gray-600 font-medium">Aucune campagne disponible</span>
          <p className="text-sm text-gray-500">Créez votre première campagne pour commencer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className="flex-1">
        <Select value={selectedCampaign?._id?.toString() || ''} onValueChange={onSelect}>
          <SelectTrigger className="w-full h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white shadow-sm hover:shadow-md">
            <SelectValue placeholder="Sélectionner une campagne" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-2 border-gray-200 shadow-lg">
            {campaigns.map((campaign) => (
              <SelectItem key={campaign._id?.toString() || campaign._id} value={campaign._id?.toString() || campaign._id} className="rounded-lg hover:bg-blue-50 focus:bg-blue-50">
                <div className="flex items-center justify-between w-full py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <span className="text-blue-700 font-bold text-sm">#{campaign.campaignNumber}</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          Campagne #{campaign.campaignNumber}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Badge className={`${getModeColor(campaign?.mode)} border font-medium ${campaign?.mode === 'test' || !campaign?.mode ? 'cursor-help' : ''}`}>
                                  <div className="flex items-center space-x-1">
                                    {getModeIcon(campaign?.mode)}
                                    <span className="text-xs">
                                      {getModeLabel(campaign?.mode)}
                                    </span>
                                  </div>
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            {(campaign?.mode === 'test' || !campaign?.mode) && (
                              <TooltipContent className="max-w-xs bg-gray-900 text-white text-xs">
                                <p className="font-semibold mb-1">⚠️ Mode test</p>
                                <p>
                                  Cette campagne est en mode test. Vous pouvez modifier tous les paramètres. Les données, commandes, statistiques et rapports sont marqués comme test et ne sont pas définitifs. Passez en mode production pour démarrer la campagne réelle.
                                </p>
                              </TooltipContent>
                            )}
                            {campaign?.mode === 'production' && (
                              <TooltipContent className="max-w-xs bg-gray-900 text-white text-xs">
                                <p className="font-semibold mb-1">✓ Mode production</p>
                                <p>
                                  Cette campagne est en mode production. Les paramètres sont verrouillés et ne peuvent plus être modifiés. Toutes les données sont réelles et définitives.
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(campaign.startDate)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Target className="h-3 w-3" />
                          <span>${campaign.financialGoal?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CampaignSelector;
