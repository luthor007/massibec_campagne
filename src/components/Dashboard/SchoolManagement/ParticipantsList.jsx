import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { getTerminology } from '@/utils/organizationHelpers';

const ParticipantsList = ({ campaign, onRefresh, school }) => {
  // Get terminology based on organization type
  const organizationType = school?.organizationType || campaign?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'totalSales', direction: 'desc' });

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
      console.log('Participants API response:', data);
      console.log('First participant data:', data.participants?.[0]);
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
    participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (participant.parentName && participant.parentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (participant.parentPhone && participant.parentPhone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Sort participants
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortConfig.key) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'totalSales':
        aValue = a.totalSales;
        bValue = b.totalSales;
        break;
      case 'totalUnits':
        aValue = a.totalUnits;
        bValue = b.totalUnits;
        break;
      case 'orderCount':
        aValue = a.orderCount;
        bValue = b.orderCount;
        break;
      case 'progress':
        aValue = a.progress;
        bValue = b.progress;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

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
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Participants - Campagne #{campaign.campaignNumber}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {participants.length} participant{participants.length !== 1 ? 's' : ''} actif{participants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher par nom, email, parent ou téléphone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Participants Table */}
      {filteredParticipants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>
            {searchTerm ? 'Aucun participant trouvé' : 'Aucun participant pour cette campagne'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden overflow-x-auto scrollbar-hide">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Rang</TableHead>
                <TableHead 
                  className="font-semibold cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  {terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="font-semibold">Parent</TableHead>
                <TableHead className="font-semibold">Téléphone</TableHead>
                <TableHead 
                  className="font-semibold text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalSales')}
                >
                  Ventes Total {sortConfig.key === 'totalSales' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="font-semibold text-right text-green-600">Profit {terminology.participant}</TableHead>
                <TableHead className="font-semibold text-right text-orange-600">Dons {terminology.participant}</TableHead>
                <TableHead className="font-semibold text-right text-blue-700">Total {terminology.participant}</TableHead>
                <TableHead className="font-semibold text-right text-blue-600">Profit {terminology.organization}</TableHead>
                <TableHead className="font-semibold text-right text-purple-600">Dons {terminology.organization}</TableHead>
                <TableHead className="font-semibold text-right text-indigo-600">Total {terminology.organization}</TableHead>
                <TableHead 
                  className="font-semibold text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalUnits')}
                >
                  Unités {sortConfig.key === 'totalUnits' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="font-semibold text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('orderCount')}
                >
                  Cmd {sortConfig.key === 'orderCount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="font-semibold text-center cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('progress')}
                >
                  Progression {sortConfig.key === 'progress' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedParticipants.map((participant, index) => (
                <TableRow key={participant._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <Badge variant="outline">#{index + 1}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{participant.name}</TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {participant.parentName || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {participant.parentPhone || 'N/A'}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {formatCurrency(participant.totalSales)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {formatCurrency(participant.studentProfit || 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-orange-600">
                    {formatCurrency(participant.studentDonation || 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-blue-700">
                    {formatCurrency(participant.studentTotal || 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-blue-600">
                    {formatCurrency(participant.schoolProfit || 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-purple-600">
                    {formatCurrency(participant.schoolDonation || 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-indigo-600">
                    {formatCurrency(participant.schoolTotal || 0)}
                  </TableCell>
                  <TableCell className="text-right">{participant.totalUnits}</TableCell>
                  <TableCell className="text-right">{participant.orderCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={Math.min(participant.progress, 100)} 
                        className="h-2 flex-1" 
                      />
                      <span className="text-xs text-gray-600 min-w-[50px]">
                        {participant.progress}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary Stats */}
      {participants.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
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
