import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DollarSign,
  Users,
  Package,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  Copy,
  Check
} from 'lucide-react';
import ParentLetterModal from './ParentLetterModal';
import { getTerminology } from '@/utils/organizationHelpers';
import { isTestCampaign } from '@/utils/campaignHelpers';
import { toast } from 'react-toastify';

const CampaignOverview = ({ campaign, stats, loading, school }) => {
  const [showParentLetterModal, setShowParentLetterModal] = useState(false);
  const [copied, setCopied] = useState(false);
  // Get terminology based on organization type
  const organizationType = school?.organizationType || campaign?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  const isTest = isTestCampaign(campaign);
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
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending_approval': return <Clock className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'N/A';

    // Use UTC methods to avoid timezone issues
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();
    const day = dateObj.getUTCDate();

    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    return `${day} ${months[month]} ${year}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!campaign || !stats) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucune campagne sélectionnée</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Combined Campaign Info Card - Compact */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-3 sm:p-4 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: Title and Status */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {campaign.name || `Campagne #${campaign.campaignNumber}`}
                </h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Badge className={`${getStatusColor(campaign.status)} border font-medium px-2 py-0.5 text-xs ${isTest ? 'cursor-help' : ''}`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(campaign.status)}
                            <span className="whitespace-nowrap">
                              {campaign.status === 'active' ? 'Active' :
                                campaign.status === 'approved' ? 'Approuvée' :
                                  campaign.status === 'pending_approval' ? 'En attente' :
                                    campaign.status === 'rejected' ? 'Rejetée' :
                                      campaign.status === 'completed' ? 'Terminée' : campaign.status}
                            </span>
                            {isTest && (
                              <AlertCircle className="h-2.5 w-2.5 text-orange-600" />
                            )}
                          </div>
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    {isTest && (
                      <TooltipContent className="max-w-xs bg-gray-900 text-white text-xs">
                        <p className="font-semibold mb-1">⚠️ Mode test</p>
                        <p>
                          Cette campagne est en attente d'approbation. Toutes les données, commandes, statistiques et rapports sont en mode test et ne sont pas définitives jusqu'à l'approbation de la campagne par Massibec.
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
              {campaign?.campaignCode && (
                <div className="flex items-center gap-2">
                  <div className="bg-gray-50 rounded border border-gray-200 px-2 py-1">
                    <span className="text-sm font-bold text-blue-600 font-mono">
                      {campaign.campaignCode}
                    </span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(campaign.campaignCode);
                              setCopied(true);
                              toast.success('Code copié!');
                              setTimeout(() => setCopied(false), 2000);
                            } catch (err) {
                              console.error('Erreur lors de la copie:', err);
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className={`h-7 w-7 p-0 transition-all duration-200 ${copied
                              ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copier le code</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </div>

          {/* Right: Action Button */}
          <Button
            onClick={() => setShowParentLetterModal(true)}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 whitespace-nowrap shrink-0"
          >
            <Mail className="h-4 w-4 mr-2" />
            <span className="text-sm">Lettre aux parents</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md bg-gradient-to-br from-white to-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Montant Collecté</CardTitle>
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalRaised)}</div>
            <p className="text-xs text-green-600 mt-1">
              sur {formatCurrency(stats.financialGoal)} objectif
            </p>
            <div className="mt-3">
              <Progress value={stats.goalProgress} className="h-3 bg-green-100" />
              <p className="text-xs text-green-600 mt-2 font-medium">
                {stats.goalProgress}% de l'objectif atteint
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md bg-gradient-to-br from-white to-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Participants</CardTitle>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.participantCount}</div>
            <p className="text-xs text-blue-600 mt-1">
              {terminology.participants} actifs
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md bg-gradient-to-br from-white to-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Produits Vendus</CardTitle>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.productsSold}</div>
            <p className="text-xs text-purple-600 mt-1">
              unités vendues
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md bg-gradient-to-br from-white to-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Performance</CardTitle>
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {stats.participantCount > 0 ? formatCurrency(stats.totalRaised / stats.participantCount) : '$0'}
            </div>
            <p className="text-xs text-orange-600 mt-1">
              par participant
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Dates de la Campagne</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Début:</span>
              <span className="font-medium">{formatDate(campaign.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Fin:</span>
              <span className="font-medium">{formatDate(campaign.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Livraison:</span>
              <span className="font-medium">{formatDate(campaign.deliveryDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Top Vendeurs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topSellers && stats.topSellers.length > 0 ? (
              <div className="space-y-2">
                {stats.topSellers.slice(0, 3).map((seller, index) => (
                  <div key={seller.userId} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">{seller.userName || 'Utilisateur inconnu'}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(seller.totalSales)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aucune vente encore</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Parent Letter Modal */}
      <ParentLetterModal
        isOpen={showParentLetterModal}
        onClose={() => setShowParentLetterModal(false)}
        campaign={campaign}
        school={school}
      />
    </div>
  );
};

export default CampaignOverview;
