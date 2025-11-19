import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CampaignCard from './CampaignCard';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  Edit
} from 'lucide-react';
import { toast } from 'react-toastify';

const SupplierCampaignManager = ({ campaigns, loading, onRefresh, onApprove, onReject, onUnapprove, onEdit, onLock, onUnlock, onViewDetails, selectedCampaignId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'school', 'status', 'progress'
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id: string, name: string }
  const [deleting, setDeleting] = useState(false);

  // Helper function to get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      approved: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Approuvée' },
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
      completed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle, label: 'Terminée' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejetée' },
      locked: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Verrouillée' }
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

  // Filtrage et tri des campagnes
  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns.filter(campaign => {
      const matchesSearch =
        campaign.nomCampagne?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.school?.nomEcole?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || !statusFilter ||
        campaign.status === statusFilter ||
        (statusFilter === 'pending' && campaign.status === 'pending_approval') ||
        (statusFilter === 'pending_approval' && campaign.status === 'pending');
      const matchesSchool = schoolFilter === 'all' || !schoolFilter || campaign.school?._id === schoolFilter;

      return matchesSearch && matchesStatus && matchesSchool;
    });

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          const dateA = a.debutCampagne ? new Date(a.debutCampagne) : new Date(0);
          const dateB = b.debutCampagne ? new Date(b.debutCampagne) : new Date(0);
          return dateB - dateA;
        case 'school':
          return (a.school?.nomEcole || '').localeCompare(b.school?.nomEcole || '');
        case 'status':
          return a.status.localeCompare(b.status);
        case 'progress':
          const progressA = a.objectifFinancier ? (a.totalSales || 0) / a.objectifFinancier : 0;
          const progressB = b.objectifFinancier ? (b.totalSales || 0) / b.objectifFinancier : 0;
          return progressB - progressA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [campaigns, searchTerm, statusFilter, schoolFilter, sortBy]);

  // Statistiques rapides
  const stats = useMemo(() => {
    const total = campaigns.length;
    const pending = campaigns.filter(c => c.status === 'pending_approval' || c.status === 'pending').length;
    const approved = campaigns.filter(c => c.status === 'approved').length;
    const active = campaigns.filter(c => c.status === 'active').length;
    const completed = campaigns.filter(c => c.status === 'completed').length;
    const rejected = campaigns.filter(c => c.status === 'rejected').length;

    const expired = campaigns.filter(c => {
      if (c.status !== 'active' || !c.finCampagne) return false;
      const endDate = new Date(c.finCampagne);
      if (isNaN(endDate.getTime())) return false;
      return new Date() > endDate;
    }).length;

    const expiringSoon = campaigns.filter(c => {
      if (c.status !== 'active' || !c.finCampagne) return false;
      const endDate = new Date(c.finCampagne);
      if (isNaN(endDate.getTime())) return false;
      const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      return daysRemaining <= 7 && daysRemaining > 0;
    }).length;

    return { total, pending, approved, active, completed, rejected, expired, expiringSoon };
  }, [campaigns]);

  const handleDeleteCampaign = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${deleteTarget.id}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`Campagne "${deleteTarget.name}" supprimée définitivement`);
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        onRefresh && onRefresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la suppression de la campagne');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Erreur lors de la suppression de la campagne');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (campaign) => {
    setDeleteTarget({
      id: campaign._id?.toString() || campaign._id,
      name: campaign.nomCampagne || `Campagne #${campaign.campaignNumber}`
    });
    setDeleteDialogOpen(true);
  };

  // Liste unique des écoles
  const schools = useMemo(() => {
    const schoolMap = new Map();
    campaigns.forEach(campaign => {
      if (campaign.school) {
        schoolMap.set(campaign.school._id, campaign.school);
      }
    });
    return Array.from(schoolMap.values());
  }, [campaigns]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Gestion des Campagnes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Chargement des campagnes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Gestion des Campagnes ({filteredAndSortedCampaigns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-gray-500">En attente</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-xs text-gray-500">Actives</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
              <div className="text-xs text-gray-500">Terminées</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-xs text-gray-500">Rejetées</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</div>
              <div className="text-xs text-gray-500">Expirent bientôt</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
              <div className="text-xs text-gray-500">Expirées</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtres et contrôles */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher par nom de campagne ou école..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtres */}
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvée</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Terminée</SelectItem>
                  <SelectItem value="rejected">Rejetée</SelectItem>
                </SelectContent>
              </Select>

              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="École" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les écoles</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school._id} value={school._id}>
                      {school.nomEcole}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="school">École</SelectItem>
                  <SelectItem value="status">Statut</SelectItem>
                  <SelectItem value="progress">Progression</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mode d'affichage et actualiser */}
            <div className="flex gap-2">
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Liste des campagnes */}
      {filteredAndSortedCampaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune campagne trouvée</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter || schoolFilter
                ? 'Aucune campagne ne correspond aux critères de recherche.'
                : 'Aucune campagne n\'a été créée pour le moment.'
              }
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campagne</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">École</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</TableHead>
                    <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ventes</TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Progression</TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedCampaigns.map((campaign) => {
                    const campaignId = campaign._id?.toString() || campaign._id;
                    const isSelected = campaignId === selectedCampaignId?.toString();
                    const progress = campaign.objectifFinancier ? Math.min(((campaign.totalSales || 0) / campaign.objectifFinancier) * 100, 100) : 0;

                    return (
                      <TableRow
                        key={campaign._id}
                        className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                        onClick={() => onViewDetails(campaign)}
                      >
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{campaign.nomCampagne || campaign.name || `Campagne #${campaign.campaignNumber}`}</div>
                          <div className="text-sm text-gray-500">#{campaign.campaignNumber}</div>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{campaign.school?.nomEcole || campaign.school?.name || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(campaign.status)}
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <div>{campaign.debutCampagne ? new Date(campaign.debutCampagne).toLocaleDateString('fr-CA') : 'N/A'}</div>
                          <div>{campaign.finCampagne ? new Date(campaign.finCampagne).toLocaleDateString('fr-CA') : 'N/A'}</div>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          {campaign.totalParticipants || 0}
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-green-600">
                          ${(campaign.totalSales || 0).toLocaleString('fr-CA')}
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${progress >= 100 ? 'bg-green-500' :
                                    progress >= 75 ? 'bg-blue-500' :
                                      progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 min-w-[50px]">{progress.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
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
                            {(campaign.status === 'pending' || campaign.status === 'pending_approval') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onApprove(campaign);
                                  }}
                                  className="p-2 text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReject(campaign);
                                  }}
                                  className="p-2 text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign._id}
              campaign={campaign}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onApprove={onApprove}
              onReject={onReject}
              onUnapprove={onUnapprove}
              onLock={onLock}
              onUnlock={onUnlock}
              onDelete={openDeleteDialog}
              isSelected={campaign._id?.toString() === selectedCampaignId?.toString()}
            />
          ))}
        </div>
      )}

      {/* Alertes importantes */}
      {(stats.expired > 0 || stats.expiringSoon > 0 || stats.pending > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              Actions Requises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.pending > 0 && (
                <div className="flex items-center gap-2 text-orange-700">
                  <Clock className="w-4 h-4" />
                  <span>{stats.pending} campagne(s) en attente d'approbation</span>
                </div>
              )}
              {stats.expiringSoon > 0 && (
                <div className="flex items-center gap-2 text-orange-700">
                  <Clock className="w-4 h-4" />
                  <span>{stats.expiringSoon} campagne(s) expirent dans moins de 7 jours</span>
                </div>
              )}
              {stats.expired > 0 && (
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-4 h-4" />
                  <span>{stats.expired} campagne(s) ont expiré et doivent être fermées</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Suppression définitive
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement la <strong>{deleteTarget?.name}</strong> ?
              <br />
              <br />
              Cette action supprimera également :
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Toutes les commandes associées</li>
                <li>Toutes les références dans les utilisateurs</li>
              </ul>
              <br />
              <strong className="text-red-600">Cette action est irréversible.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCampaign}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierCampaignManager;
