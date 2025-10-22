import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Mail
} from 'lucide-react';
import ParentLetterModal from './ParentLetterModal';

const CampaignOverview = ({ campaign, stats, loading, school }) => {
  const [showParentLetterModal, setShowParentLetterModal] = useState(false);
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
    return new Date(date).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Campagne #{campaign.campaignNumber}
              </h2>
              <p className="text-gray-600 mt-1 font-medium">
                Vue d'ensemble des performances
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowParentLetterModal(true)}
              variant="outline"
              className="flex items-center space-x-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200"
            >
              <Mail className="h-4 w-4" />
              <span>Lettre aux parents</span>
            </Button>
            <Badge className={`${getStatusColor(campaign.status)} border font-medium px-3 py-1`}>
              <div className="flex items-center space-x-2">
                {getStatusIcon(campaign.status)}
                <span>
                  {campaign.status === 'active' ? 'Active' :
                   campaign.status === 'approved' ? 'Approuvée' :
                   campaign.status === 'pending_approval' ? 'En attente d\'approbation' :
                   campaign.status === 'rejected' ? 'Rejetée' :
                   campaign.status === 'completed' ? 'Terminée' : campaign.status}
                </span>
              </div>
            </Badge>
          </div>
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
              étudiants actifs
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
                      <span className="text-sm">Participant #{seller.userId.slice(-4)}</span>
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
