import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  Lock,
  Unlock,
  TrendingUp,
  XCircle as UnapproveIcon,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CampaignCard = ({ campaign, onViewDetails, onEdit, onApprove, onReject, onUnapprove, onLock, onUnlock, onDelete, isSelected }) => {
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      approved: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Approuvée' },
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
      completed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle, label: 'Terminée' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejetée' },
      locked: { color: 'bg-gray-100 text-gray-800', icon: Lock, label: 'Verrouillée' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getProgressPercentage = () => {
    if (!campaign.objectifFinancier || campaign.objectifFinancier === 0) return 0;
    const currentSales = campaign.totalSales || 0;
    return Math.min((currentSales / campaign.objectifFinancier) * 100, 100);
  };

  const getDaysRemaining = () => {
    if (!campaign.finCampagne) return 0;
    const now = new Date();
    const endDate = new Date(campaign.finCampagne);
    if (isNaN(endDate.getTime())) return 0;
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isExpired = () => {
    if (!campaign.finCampagne) return false;
    const endDate = new Date(campaign.finCampagne);
    if (isNaN(endDate.getTime())) return false;
    return new Date() > endDate;
  };

  const isUpcoming = () => {
    if (!campaign.debutCampagne) return false;
    const startDate = new Date(campaign.debutCampagne);
    if (isNaN(startDate.getTime())) return false;
    return new Date() < startDate;
  };

  const progressPercentage = getProgressPercentage();
  const daysRemaining = getDaysRemaining();
  const expired = isExpired();
  const upcoming = isUpcoming();

  return (
    <Card 
      className={`hover:shadow-lg transition-shadow duration-200 cursor-pointer ${isSelected ? 'border-2 border-blue-500 shadow-lg' : ''}`}
      onClick={() => onViewDetails(campaign)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              {campaign.nomCampagne}
            </CardTitle>
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(campaign.status)}
              {campaign.locked && (
                <Badge variant="outline" className="text-gray-600">
                  <Lock className="w-3 h-3 mr-1" />
                  Verrouillée
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(campaign);
              }}
              className="p-2"
            >
              <Eye className="w-4 h-4" />
            </Button>
            
            {!campaign.locked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(campaign);
                }}
                className="p-2"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            
            {campaign.locked ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlock(campaign);
                }}
                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Unlock className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onLock(campaign);
                }}
                className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
              >
                <Lock className="w-4 h-4" />
              </Button>
            )}
            
            {/* Bouton de suppression pour toutes les campagnes */}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(campaign);
                }}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Supprimer définitivement"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* École */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span className="font-medium">{campaign.school?.nomEcole || 'École non définie'}</span>
        </div>

        {/* Dates */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Début:</span>
            <span className="font-medium">
              {campaign.debutCampagne ? format(new Date(campaign.debutCampagne), 'dd/MM/yyyy', { locale: fr }) : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Fin:</span>
            <span className="font-medium">
              {campaign.finCampagne ? format(new Date(campaign.finCampagne), 'dd/MM/yyyy', { locale: fr }) : 'N/A'}
            </span>
            {expired && (
              <Badge variant="destructive" className="text-xs">
                Expirée
              </Badge>
            )}
            {upcoming && (
              <Badge variant="secondary" className="text-xs">
                À venir
              </Badge>
            )}
          </div>
          {!expired && !upcoming && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Jours restants:</span>
              <span className={`font-medium ${daysRemaining <= 7 ? 'text-red-600' : daysRemaining <= 14 ? 'text-yellow-600' : 'text-green-600'}`}>
                {daysRemaining}
              </span>
            </div>
          )}
        </div>

        {/* Objectif financier et progression */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Objectif:</span>
            </div>
            <span className="font-medium">{campaign.objectifFinancier?.toLocaleString('fr-CA')} $</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progression:</span>
              <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  progressPercentage >= 100 ? 'bg-green-500' : 
                  progressPercentage >= 75 ? 'bg-blue-500' : 
                  progressPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {campaign.totalOrders || 0}
            </div>
            <div className="text-xs text-gray-500">Commandes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {campaign.totalParticipants || 0}
            </div>
            <div className="text-xs text-gray-500">Participants</div>
          </div>
        </div>

        {/* Actions selon le statut */}
        {(campaign.status === 'pending' || campaign.status === 'pending_approval') && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onApprove(campaign);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approuver
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onReject(campaign);
              }}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Rejeter
            </Button>
          </div>
        )}

        {campaign.status === 'approved' && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onUnapprove(campaign);
              }}
              className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <UnapproveIcon className="w-4 h-4 mr-1" />
              Désapprouver
            </Button>
          </div>
        )}

        {/* Alertes */}
        {expired && campaign.status === 'active' && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span>Cette campagne a expiré et devrait être fermée</span>
          </div>
        )}
        
        {daysRemaining <= 7 && daysRemaining > 0 && campaign.status === 'active' && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
            <Clock className="w-4 h-4" />
            <span>Cette campagne se termine bientôt</span>
          </div>
        )}
        
        {progressPercentage >= 100 && campaign.status === 'active' && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            <TrendingUp className="w-4 h-4" />
            <span>Objectif financier atteint!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignCard;
