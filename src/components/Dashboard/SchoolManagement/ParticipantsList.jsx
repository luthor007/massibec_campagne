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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  DollarSign,
  Package,
  TrendingUp,
  RefreshCw,
  Search,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle
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
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'withSales', 'withoutSales'

  const fetchParticipants = async () => {
    if (!campaign?._id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/campaigns/${campaign._id}/participants`, {
        credentials: 'include' // Ensure cookies are sent with the request
      });
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

  // Filter participants by search term and status
  const filteredParticipants = participants.filter(participant => {
    // Search filter
    const matchesSearch =
      participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (participant.parentName && participant.parentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (participant.parentPhone && participant.parentPhone.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Status filter
    const hasSales = participant.totalSales > 0;
    if (filterStatus === 'withSales') return hasSales;
    if (filterStatus === 'withoutSales') return !hasSales;
    return true; // 'all'
  });

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
            Liste des {terminology.participants} - Campagne #{campaign.campaignNumber}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <p className="text-sm sm:text-base text-gray-600">
              {participants.length} {terminology.participant} inscrit{participants.length !== 1 ? 's' : ''}
            </p>
            <Badge variant="outline" className="text-green-600 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {participants.filter(p => p.totalSales > 0).length} avec ventes
            </Badge>
            <Badge variant="outline" className="text-gray-500 border-gray-300">
              <XCircle className="h-3 w-3 mr-1" />
              {participants.filter(p => p.totalSales === 0).length} sans ventes
            </Badge>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom, email, parent ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les {terminology.participants}</SelectItem>
            <SelectItem value="withSales">Avec ventes</SelectItem>
            <SelectItem value="withoutSales">Sans ventes</SelectItem>
          </SelectContent>
        </Select>
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
                <TableHead className="font-semibold w-12">Statut</TableHead>
                <TableHead className="font-semibold w-16">Rang</TableHead>
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
              {sortedParticipants.map((participant, index) => {
                const hasSales = participant.totalSales > 0;
                return (
                  <TableRow
                    key={participant._id}
                    className={`hover:bg-gray-50 ${!hasSales ? 'opacity-75' : ''}`}
                  >
                    <TableCell className="w-12">
                      {hasSales ? (
                        <div className="flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-green-500" title="A commencé à vendre" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-gray-400" title="N'a pas encore vendu" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium w-16">
                      {hasSales ? (
                        <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                          #{index + 1}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 border-gray-300 text-gray-500">
                          -
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {participant.name}
                        {participant.role === 'school_manager' && (
                          <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                            Manager
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {participant.parentName || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {participant.parentPhone || 'N/A'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${hasSales ? 'text-green-600' : 'text-gray-400'}`}>
                      {hasSales ? formatCurrency(participant.totalSales) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${hasSales ? 'text-green-600' : 'text-gray-400'}`}>
                      {hasSales ? formatCurrency(participant.studentProfit || 0) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${hasSales ? 'text-orange-600' : 'text-gray-400'}`}>
                      {hasSales ? formatCurrency(participant.studentDonation || 0) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${hasSales ? 'text-blue-700' : 'text-gray-400'}`}>
                      {hasSales ? formatCurrency(participant.studentTotal || 0) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${hasSales ? 'text-blue-600' : 'text-gray-400'}`}>
                      {hasSales ? formatCurrency(participant.schoolProfit || 0) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${hasSales ? 'text-purple-600' : 'text-gray-400'}`}>
                      {hasSales ? formatCurrency(participant.schoolDonation || 0) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${hasSales ? 'text-indigo-600' : 'text-gray-400'}`}>
                      {hasSales ? formatCurrency(participant.schoolTotal || 0) : '-'}
                    </TableCell>
                    <TableCell className={`text-right ${hasSales ? '' : 'text-gray-400'}`}>
                      {hasSales ? participant.totalUnits : '-'}
                    </TableCell>
                    <TableCell className={`text-right ${hasSales ? '' : 'text-gray-400'}`}>
                      {hasSales ? participant.orderCount : '-'}
                    </TableCell>
                    <TableCell>
                      {hasSales ? (
                        <div className="flex items-center space-x-2">
                          <Progress
                            value={Math.min(participant.progress, 100)}
                            className="h-2 flex-1"
                          />
                          <span className="text-xs text-gray-600 min-w-[50px]">
                            {participant.progress}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
