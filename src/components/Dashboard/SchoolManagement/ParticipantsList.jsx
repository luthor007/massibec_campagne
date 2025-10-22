import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  DollarSign, 
  Package, 
  TrendingUp,
  RefreshCw,
  Search,
  Mail,
  Phone
} from 'lucide-react';

const ParticipantsList = ({ campaign, onRefresh }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchParticipants = async () => {
    if (!campaign?._id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/campaigns/${campaign._id}/participants`);
      if (!response.ok) {
        throw new Error(`Failed to fetch participants: ${response.status}`);
      }

      const data = await response.json();
      setParticipants(data.participants || []);
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [campaign?._id]);

  const handleRefresh = () => {
    fetchParticipants();
    onRefresh && onRefresh();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredParticipants = participants.filter(participant =>
    participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <Users className="h-12 w-12 mx-auto mb-2" />
          <p>Erreur lors du chargement des participants</p>
          <p className="text-sm">{error}</p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucune campagne sélectionnée</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Participants - Campagne #{campaign.campaignNumber}
          </h2>
          <p className="text-gray-600 mt-1">
            {participants.length} participant{participants.length !== 1 ? 's' : ''} actif{participants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher par nom ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Participants Grid */}
      {filteredParticipants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>
            {searchTerm ? 'Aucun participant trouvé' : 'Aucun participant pour cette campagne'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParticipants.map((participant) => (
            <Card key={participant._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{participant.name}</CardTitle>
                  <Badge variant="outline">
                    #{participant._id.slice(-4)}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{participant.email}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sales Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ventes totales</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(participant.totalSales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unités vendues</span>
                    <span className="font-medium">{participant.totalUnits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Commandes</span>
                    <span className="font-medium">{participant.orderCount}</span>
                  </div>
                </div>

                {/* Goal Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Objectif personnel</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(participant.goal)}
                    </span>
                  </div>
                  <Progress value={Math.min(participant.progress, 100)} className="h-2" />
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{participant.progress}% de l'objectif</span>
                    <span>
                      {participant.progress >= 100 ? '🎉 Atteint!' : 'En cours'}
                    </span>
                  </div>
                </div>

                {/* Last Activity */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Dernière commande</span>
                    <span>{formatDate(participant.lastOrderDate)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {participants.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {participants.length}
                </div>
                <div className="text-sm text-blue-800">Participants</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(participants.reduce((sum, p) => sum + p.totalSales, 0))}
                </div>
                <div className="text-sm text-green-800">Ventes totales</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {participants.reduce((sum, p) => sum + p.totalUnits, 0)}
                </div>
                <div className="text-sm text-purple-800">Unités vendues</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(participants.reduce((sum, p) => sum + p.progress, 0) / participants.length)}%
                </div>
                <div className="text-sm text-orange-800">Progression moyenne</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParticipantsList;
