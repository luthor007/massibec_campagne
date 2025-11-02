import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

const CampaignSelector = ({ campaigns, selectedCampaign, onSelect, loading }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3" />;
      case 'approved': return <CheckCircle className="h-3 w-3" />;
      case 'pending_approval': return <Clock className="h-3 w-3" />;
      case 'rejected': return <AlertCircle className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
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
    <div className="flex items-center space-x-4">
      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
        <TrendingUp className="h-6 w-6 text-white" />
      </div>
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
                        <Badge className={`${getStatusColor(campaign.status)} border font-medium`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(campaign.status)}
                            <span className="text-xs">
                              {campaign.status === 'active' ? 'Active' :
                               campaign.status === 'approved' ? 'Approuvée' :
                               campaign.status === 'pending_approval' ? 'En attente' :
                               campaign.status === 'rejected' ? 'Rejetée' :
                               campaign.status === 'completed' ? 'Terminée' : campaign.status}
                            </span>
                          </div>
                        </Badge>
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
