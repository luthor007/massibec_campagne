import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  Eye,
  Edit,
  Ban,
  Check,
  Trash2,
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';

// Helper function to parse date strings without timezone conversion
const parseLocalDate = (dateString) => {
  if (!dateString) return null;

  // If it's already a Date object, use it directly
  if (dateString instanceof Date) {
    return dateString;
  }

  // Handle ISO date strings (e.g., "2025-10-27T00:00:00.000Z")
  // Extract just the date part and create a local date
  const dateOnly = dateString.split('T')[0]; // Get "2025-10-27"
  const [year, month, day] = dateOnly.split('-').map(Number);

  // Create date in local timezone
  return new Date(year, month - 1, day);
};

// Helper function to convert Cloudinary public_id to URL
const getLogoUrl = (logo) => {
  if (!logo) return null;

  // If it's already a full URL, return it
  if (logo.startsWith('http://') || logo.startsWith('https://')) {
    return logo;
  }

  // If it's a Cloudinary public_id (starts with 'school-logo/'), convert to URL
  if (logo.startsWith('school-logo/')) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      console.warn('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set');
      return null;
    }
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{format}
    // Match the format used in the API endpoints
    return `https://res.cloudinary.com/${cloudName}/image/upload/${logo}.png`;
  }

  // Legacy: if it looks like a local file path, try it (for backward compatibility)
  return `/uploads/logos/${logo}`;
};

const SchoolsTable = ({ schools, loading, onRefresh, onApprove, onReject, onDeactivate, onReactivate, onViewDetails, onApproveCampaign, onRejectCampaign, onUnapproveCampaign }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [actionLoading, setActionLoading] = useState(new Set());
  const [selectedCampaigns, setSelectedCampaigns] = useState({}); // school._id -> campaign._id
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'school' | 'campaign', id: string, name: string }
  const [deleting, setDeleting] = useState(false);
  const [editDatesDialogOpen, setEditDatesDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [dateFormData, setDateFormData] = useState({ startDate: '', endDate: '', deliveryDate: '' });
  const [savingDates, setSavingDates] = useState(false);
  const [editProfitSplitsDialogOpen, setEditProfitSplitsDialogOpen] = useState(false);
  const [editingProfitSplitsCampaign, setEditingProfitSplitsCampaign] = useState(null);
  const [profitSplitsData, setProfitSplitsData] = useState({});
  const [savingProfitSplits, setSavingProfitSplits] = useState(false);

  // Filtrage et tri des écoles
  const filteredAndSortedSchools = useMemo(() => {
    let filtered = schools.filter(school => {
      const matchesSearch =
        school.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.telephone?.includes(searchTerm);

      const matchesStatus = statusFilter === 'all' || !statusFilter || school.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Tri
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [schools, searchTerm, statusFilter, sortField, sortDirection]);

  const toggleRowExpansion = (schoolId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(schoolId)) {
      newExpanded.delete(schoolId);
    } else {
      newExpanded.add(schoolId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Wrapper functions pour gérer le loading state
  const handleActionWithLoading = async (schoolId, actionFunction) => {
    setActionLoading(prev => new Set(prev).add(schoolId));
    try {
      await actionFunction();
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(schoolId);
        return newSet;
      });
    }
  };

  const handleDeleteSchool = async () => {
    if (!deleteTarget || deleteTarget.type !== 'school') return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/schools/${deleteTarget.id}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`École "${deleteTarget.name}" supprimée définitivement`);
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        onRefresh && onRefresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la suppression de l\'école');
      }
    } catch (error) {
      console.error('Error deleting school:', error);
      toast.error('Erreur lors de la suppression de l\'école');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!deleteTarget || deleteTarget.type !== 'campaign') return;

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

  const openDeleteDialog = (type, id, name, schoolId = null) => {
    setDeleteTarget({ type, id, name, schoolId });
    setDeleteDialogOpen(true);
  };

  const openEditDatesDialog = (campaign) => {
    setEditingCampaign(campaign);
    // Format dates for input (YYYY-MM-DD)
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      const date = parseLocalDate(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setDateFormData({
      startDate: formatDateForInput(campaign.startDate || campaign.debutCampagne),
      endDate: formatDateForInput(campaign.endDate || campaign.finCampagne),
      deliveryDate: formatDateForInput(campaign.deliveryDate || campaign.dateDeLivraison)
    });
    setEditDatesDialogOpen(true);
  };

  const handleSaveDates = async () => {
    if (!editingCampaign) return;

    // Basic validation
    if (!dateFormData.startDate || !dateFormData.endDate || !dateFormData.deliveryDate) {
      toast.error('Toutes les dates sont requises');
      return;
    }

    const start = new Date(dateFormData.startDate + 'T00:00:00');
    const end = new Date(dateFormData.endDate + 'T00:00:00');
    const delivery = new Date(dateFormData.deliveryDate + 'T00:00:00');

    if (end <= start) {
      toast.error('La date de fin doit être après la date de début');
      return;
    }

    setSavingDates(true);
    try {
      const response = await fetch(`/api/massibec/campaigns/${editingCampaign._id}/update-dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: dateFormData.startDate,
          endDate: dateFormData.endDate,
          deliveryDate: dateFormData.deliveryDate
        })
      });

      if (response.ok) {
        toast.success('Dates mises à jour avec succès');
        setEditDatesDialogOpen(false);
        setEditingCampaign(null);
        onRefresh && onRefresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la mise à jour des dates');
      }
    } catch (error) {
      console.error('Error updating dates:', error);
      toast.error('Erreur lors de la mise à jour des dates');
    } finally {
      setSavingDates(false);
    }
  };

  const openEditProfitSplitsDialog = (campaign) => {
    setEditingProfitSplitsCampaign(campaign);

    // Initialize profit splits data from campaign
    const splitsData = {};

    // Get products from customPrices or profitSplits
    const products = campaign.customPrices || campaign.profitSplits || [];

    products.forEach((item) => {
      const productId = item.productId?._id?.toString() || item.productId?.toString();
      const profitSplit = campaign.profitSplits?.find(ps => {
        const psProductId = ps.productId?._id?.toString() || ps.productId?.toString();
        return psProductId === productId;
      });

      if (productId) {
        splitsData[productId] = {
          productName: item.productId?.name || profitSplit?.productId?.name || 'Produit',
          studentCash: profitSplit?.studentCash ?? profitSplit?.student ?? 0,
          studentSchoolAccount: profitSplit?.studentSchoolAccount ?? 0,
          schoolProject: profitSplit?.schoolProject ?? profitSplit?.school ?? 0,
          raffle: profitSplit?.raffle ?? 0
        };
      }
    });

    setProfitSplitsData(splitsData);
    setEditProfitSplitsDialogOpen(true);
  };

  const handleProfitSplitChange = (productId, field, value) => {
    setProfitSplitsData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value === '' ? '' : (isNaN(parseFloat(value)) ? '' : parseFloat(value))
      }
    }));
  };

  const handleSaveProfitSplits = async () => {
    if (!editingProfitSplitsCampaign) return;

    setSavingProfitSplits(true);
    try {
      // Convert profitSplitsData to API format
      const profitSplits = Object.entries(profitSplitsData).map(([productId, data]) => ({
        productId,
        studentCash: data.studentCash === '' ? 0 : Number(data.studentCash) || 0,
        studentSchoolAccount: data.studentSchoolAccount === '' ? 0 : Number(data.studentSchoolAccount) || 0,
        schoolProject: data.schoolProject === '' ? 0 : Number(data.schoolProject) || 0,
        raffle: data.raffle === '' ? 0 : Number(data.raffle) || 0
      }));

      const response = await fetch(`/api/massibec/campaigns/${editingProfitSplitsCampaign._id}/update-profit-splits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profitSplits })
      });

      if (response.ok) {
        toast.success('Répartitions des profits mises à jour avec succès. Toutes les commandes existantes ont été recalculées.');
        setEditProfitSplitsDialogOpen(false);
        setEditingProfitSplitsCampaign(null);
        setProfitSplitsData({});
        onRefresh && onRefresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la mise à jour des répartitions');
      }
    } catch (error) {
      console.error('Error updating profit splits:', error);
      toast.error('Erreur lors de la mise à jour des répartitions');
    } finally {
      setSavingProfitSplits(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approuvée' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejetée' },
      deactivated: { color: 'bg-gray-100 text-gray-800', icon: Ban, label: 'Désactivée' }
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

  const getCampaignStatus = (campaign) => {
    if (!campaign) return null;

    const now = new Date();
    const startDate = new Date(campaign.debutCampagne);
    const endDate = new Date(campaign.finCampagne);

    if (now < startDate) {
      return { status: 'upcoming', label: 'À venir', color: 'text-blue-600' };
    } else if (now > endDate) {
      return { status: 'completed', label: 'Terminée', color: 'text-gray-600' };
    } else {
      return { status: 'active', label: 'Active', color: 'text-green-600' };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Écoles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Chargement des écoles...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Écoles ({filteredAndSortedSchools.length})
        </CardTitle>

        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvées</SelectItem>
              <SelectItem value="rejected">Rejetées</SelectItem>
              <SelectItem value="deactivated">Désactivées</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={onRefresh} variant="outline" className="shrink-0">
            <Filter className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    École
                    {sortField === 'name' && (
                      <ChevronDown className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Campagne active</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Statut
                    {sortField === 'status' && (
                      <ChevronDown className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Inscription
                    {sortField === 'createdAt' && (
                      <ChevronDown className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedSchools.map((school) => {
                const isExpanded = expandedRows.has(school._id);
                const campaignStatus = getCampaignStatus(school.activeCampaign);

                return (
                  <React.Fragment key={school._id}>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleRowExpansion(school._id);
                          }}
                          className="p-1"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          {school.logo && getLogoUrl(school.logo) ? (
                            <img
                              src={getLogoUrl(school.logo)}
                              alt={school.nomEcole || school.name}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => {
                                // Hide broken image
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{school.name}</div>
                            <div className="text-sm text-gray-500">{school.ville}, {school.codePostal}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {school.email}
                          </div>
                          {school.telephone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {school.telephone}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {school.activeCampaign ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {school.activeCampaign.nomCampagne}
                            </div>
                            {campaignStatus && (
                              <div className={`text-xs ${campaignStatus.color}`}>
                                {campaignStatus.label}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Aucune campagne</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(school.status)}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {school.createdAt ? format(parseLocalDate(school.createdAt), 'dd/MM/yyyy', { locale: fr }) : 'N/A'}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('View details clicked for:', school.name);
                              onViewDetails(school);
                            }}
                            className="p-2 hover:bg-gray-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {school.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Approve clicked for:', school.name);
                                  handleActionWithLoading(school._id, () => onApprove(school));
                                }}
                                disabled={actionLoading.has(school._id)}
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 disabled:opacity-50 rounded"
                              >
                                {actionLoading.has(school._id) ? (
                                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onReject(school);
                                }}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {school.status === 'approved' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDeactivate(school);
                              }}
                              className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              title="Désactiver temporairement"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}

                          {(school.status === 'rejected' || school.status === 'deactivated') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onReactivate(school);
                              }}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Réactiver l'école"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Bouton de suppression définitive */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openDeleteDialog('school', school._id, school.name);
                            }}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Ligne expandable avec détails */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-gray-50 p-0">
                          <div className="p-6">
                            {/* En-tête avec informations de l'école */}
                            <div className="mb-6">
                              <div className="flex items-center gap-4 mb-4">
                                {school.logo && getLogoUrl(school.logo) && (
                                  <img
                                    src={getLogoUrl(school.logo)}
                                    alt={school.name}
                                    className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-sm"
                                    onError={(e) => {
                                      // Hide image if it fails to load
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900">{school.name}</h3>
                                  <p className="text-gray-600">{school.adresse}, {school.ville}, {school.codePostal}</p>
                                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-4 h-4" />
                                      {school.email}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-4 h-4" />
                                      {school.telephone}
                                    </span>
                                    {school.cellulaire && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-4 h-4" />
                                        {school.cellulaire}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Sélecteur de campagnes */}
                            {school.campaigns && school.campaigns.length > 0 && (
                              <div className="mb-6">
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">Campagnes</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {school.campaigns.map((campaign) => {
                                    const selectedCampaignId = selectedCampaigns[school._id] || school.activeCampaign?._id;
                                    const isSelected = campaign._id === selectedCampaignId;

                                    return (
                                      <div
                                        key={campaign._id}
                                        onClick={() => {
                                          setSelectedCampaigns(prev => ({
                                            ...prev,
                                            [school._id]: campaign._id
                                          }));
                                        }}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${isSelected
                                          ? 'border-blue-500 bg-blue-50'
                                          : 'border-gray-200 bg-white hover:border-gray-300'
                                          }`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="font-medium text-gray-900">
                                            Campagne #{campaign.campaignNumber}
                                          </div>
                                          <Badge className={
                                            campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                                              campaign.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                                                campaign.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                                  campaign.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                                    campaign.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                      'bg-gray-100 text-gray-800'
                                          }>
                                            {campaign.status === 'active' ? 'Active' :
                                              campaign.status === 'pending_approval' ? 'En attente' :
                                                campaign.status === 'approved' ? 'Approuvée' :
                                                  campaign.status === 'completed' ? 'Terminée' :
                                                    campaign.status === 'rejected' ? 'Rejetée' :
                                                      campaign.status}
                                          </Badge>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          {campaign.startDate && campaign.endDate ? (
                                            <>
                                              {format(parseLocalDate(campaign.startDate), 'dd/MM/yyyy', { locale: fr })} -
                                              {format(parseLocalDate(campaign.endDate), 'dd/MM/yyyy', { locale: fr })}
                                            </>
                                          ) : (
                                            'Dates non définies'
                                          )}
                                        </div>
                                        {campaign.financialGoal && (
                                          <div className="text-sm font-medium text-blue-600 mt-1">
                                            Objectif: {campaign.financialGoal} $
                                          </div>
                                        )}

                                        {/* Boutons d'action pour les campagnes */}
                                        {campaign.status === 'pending_approval' && (
                                          <div className="flex gap-2 mt-3">
                                            <Button
                                              type="button"
                                              size="sm"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onApproveCampaign(campaign._id);
                                              }}
                                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                                            >
                                              <Check className="w-3 h-3 mr-1" />
                                              Approuver
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onRejectCampaign(campaign._id);
                                              }}
                                              className="border-red-300 text-red-600 hover:bg-red-50 text-xs px-3 py-1"
                                            >
                                              <XCircle className="w-3 h-3 mr-1" />
                                              Rejeter
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Détails de la campagne sélectionnée */}
                            {(() => {
                              const selectedCampaignId = selectedCampaigns[school._id] || school.activeCampaign?._id;
                              const selectedCampaign = school.campaigns?.find(c => c._id === selectedCampaignId) || school.activeCampaign;

                              if (!selectedCampaign) return null;

                              return (
                                <div className="bg-white rounded-lg border shadow-sm p-6">
                                  <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-xl font-bold text-gray-900">
                                      Détails - Campagne #{selectedCampaign.campaignNumber}
                                    </h4>
                                    <div className="flex items-center gap-3">
                                      <Badge className={
                                        selectedCampaign.status === 'active' ? 'bg-green-100 text-green-800' :
                                          selectedCampaign.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                                            selectedCampaign.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                              selectedCampaign.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                                selectedCampaign.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                  'bg-gray-100 text-gray-800'
                                      }>
                                        {selectedCampaign.status === 'active' ? 'Active' :
                                          selectedCampaign.status === 'pending_approval' ? 'En attente' :
                                            selectedCampaign.status === 'approved' ? 'Approuvée' :
                                              selectedCampaign.status === 'completed' ? 'Terminée' :
                                                selectedCampaign.status === 'rejected' ? 'Rejetée' :
                                                  selectedCampaign.status}
                                      </Badge>

                                      {/* Boutons d'action pour la campagne active */}
                                      {selectedCampaign.status === 'pending_approval' && (
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              openEditDatesDialog(selectedCampaign);
                                            }}
                                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                          >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Modifier les dates
                                          </Button>
                                          <Button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              onApproveCampaign(selectedCampaign._id);
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                          >
                                            <Check className="w-4 h-4 mr-2" />
                                            Approuver la campagne
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              onRejectCampaign(selectedCampaign._id);
                                            }}
                                            className="border-red-300 text-red-600 hover:bg-red-50"
                                          >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Rejeter la campagne
                                          </Button>
                                        </div>
                                      )}

                                      {selectedCampaign.status === 'approved' && (
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              openEditDatesDialog(selectedCampaign);
                                            }}
                                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                          >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Modifier les dates
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              openEditProfitSplitsDialog(selectedCampaign);
                                            }}
                                            className="border-purple-300 text-purple-600 hover:bg-purple-50"
                                          >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Modifier les répartitions
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              onUnapproveCampaign(selectedCampaign._id);
                                            }}
                                            className="border-orange-300 text-orange-600 hover:bg-orange-50"
                                          >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Désapprouver
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              openDeleteDialog('campaign', selectedCampaign._id, `Campagne #${selectedCampaign.campaignNumber}`, school._id);
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Supprimer définitivement
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Informations générales de la campagne */}
                                    <div>
                                      <h5 className="font-semibold text-gray-900 mb-4">Informations générales</h5>
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                          <Calendar className="w-5 h-5 text-gray-400" />
                                          <div>
                                            <div className="text-sm text-gray-600">Période</div>
                                            <div className="font-medium">
                                              {selectedCampaign.startDate && selectedCampaign.endDate ? (
                                                <>
                                                  {format(parseLocalDate(selectedCampaign.startDate), 'dd/MM/yyyy', { locale: fr })} -
                                                  {format(parseLocalDate(selectedCampaign.endDate), 'dd/MM/yyyy', { locale: fr })}
                                                </>
                                              ) : (
                                                'Dates non définies'
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {selectedCampaign.deliveryDate && (
                                          <div className="flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-gray-400" />
                                            <div>
                                              <div className="text-sm text-gray-600">Date de livraison</div>
                                              <div className="font-medium">
                                                {format(parseLocalDate(selectedCampaign.deliveryDate), 'dd/MM/yyyy', { locale: fr })}
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        <div className="flex items-center gap-3">
                                          <TrendingUp className="w-5 h-5 text-gray-400" />
                                          <div>
                                            <div className="text-sm text-gray-600">Objectif financier</div>
                                            <div className="font-bold text-blue-600 text-lg">
                                              {selectedCampaign.financialGoal || 0} $
                                            </div>
                                          </div>
                                        </div>

                                        {selectedCampaign.notes && (
                                          <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 text-gray-400 mt-1">📝</div>
                                            <div>
                                              <div className="text-sm text-gray-600">Notes</div>
                                              <div className="text-sm">{selectedCampaign.notes}</div>
                                            </div>
                                          </div>
                                        )}

                                        {(selectedCampaign.distributionStartHour || selectedCampaign.distributionEndHour) && (
                                          <div className="flex items-start gap-3">
                                            <Clock className="w-5 h-5 text-gray-400" />
                                            <div>
                                              <div className="text-sm text-gray-600">Heures de distribution</div>
                                              <div className="font-medium">
                                                {selectedCampaign.distributionStartHour || '—'} à {selectedCampaign.distributionEndHour || '—'}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Prix de vente et produits */}
                                    <div>
                                      <h5 className="font-semibold text-gray-900 mb-4">Prix de vente</h5>
                                      {selectedCampaign.customPrices && selectedCampaign.customPrices.length > 0 ? (
                                        <div className="space-y-3">
                                          {selectedCampaign.customPrices.map((customPrice, index) => {
                                            // Find matching profit split for this product
                                            const profitSplit = selectedCampaign.profitSplits?.find(ps => {
                                              const psProductId = ps.productId?._id?.toString() || ps.productId?.toString();
                                              const cpProductId = customPrice.productId?._id?.toString() || customPrice.productId?.toString();
                                              return psProductId === cpProductId;
                                            });

                                            const cost = customPrice.productId?.cost || 0;
                                            const profit = customPrice.price - cost;

                                            return (
                                              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex items-center justify-between mb-3">
                                                  <div className="flex items-center gap-3">
                                                    {customPrice.productId?.image && (
                                                      <img
                                                        src={customPrice.productId.image}
                                                        alt={customPrice.productId.name}
                                                        className="w-12 h-12 rounded object-cover"
                                                      />
                                                    )}
                                                    <div>
                                                      <div className="font-medium text-gray-900">
                                                        {customPrice.productId?.name || 'Produit'}
                                                      </div>
                                                      {customPrice.productId?.description && (
                                                        <div className="text-sm text-gray-500">
                                                          {customPrice.productId.description}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="font-bold text-green-600 text-lg">
                                                      {customPrice.price} $
                                                    </div>
                                                    {cost > 0 && (
                                                      <div className="text-sm text-gray-500">
                                                        Coût: {cost} $
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Profit split breakdown */}
                                                {profitSplit && (
                                                  <div className="mt-3 pt-3 border-t border-gray-300">
                                                    <div className="text-xs font-semibold text-gray-700 mb-2">
                                                      Répartition des profits (profit: {profit.toFixed(2)} $)
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2">
                                                      <div className="bg-green-50 p-2 rounded text-center">
                                                        <div className="text-xs text-gray-600">Élève (comptant)</div>
                                                        <div className="font-bold text-green-700">{profitSplit.studentCash?.toFixed(2) || profitSplit.student?.toFixed(2) || '0.00'} $</div>
                                                      </div>
                                                      <div className="bg-green-100 p-2 rounded text-center">
                                                        <div className="text-xs text-gray-600">Élève (compte)</div>
                                                        <div className="font-bold text-green-600">{profitSplit.studentSchoolAccount?.toFixed(2) || '0.00'} $</div>
                                                      </div>
                                                      <div className="bg-blue-50 p-2 rounded text-center">
                                                        <div className="text-xs text-gray-600">Projet École</div>
                                                        <div className="font-bold text-blue-700">{profitSplit.schoolProject?.toFixed(2) || profitSplit.school?.toFixed(2) || '0.00'} $</div>
                                                      </div>
                                                      <div className="bg-purple-50 p-2 rounded text-center">
                                                        <div className="text-xs text-gray-600">Tirage</div>
                                                        <div className="font-bold text-purple-700">{profitSplit.raffle?.toFixed(2) || '0.00'} $</div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : selectedCampaign.profitSplits && selectedCampaign.profitSplits.length > 0 ? (
                                        <div className="space-y-3">
                                          {selectedCampaign.profitSplits.map((profitSplit, index) => {
                                            const product = profitSplit.productId;
                                            if (!product) return null;

                                            const price = product.price || 0;
                                            const cost = product.cost || 0;
                                            const profit = price - cost;

                                            return (
                                              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex items-center justify-between mb-3">
                                                  <div className="flex items-center gap-3">
                                                    {product.image && (
                                                      <img
                                                        src={product.image}
                                                        alt={product.name}
                                                        className="w-12 h-12 rounded object-cover"
                                                      />
                                                    )}
                                                    <div>
                                                      <div className="font-medium text-gray-900">
                                                        {product.name || 'Produit'}
                                                      </div>
                                                      {product.description && (
                                                        <div className="text-sm text-gray-500">
                                                          {product.description}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="font-bold text-green-600 text-lg">
                                                      {price} $
                                                    </div>
                                                    {cost > 0 && (
                                                      <div className="text-sm text-gray-500">
                                                        Coût: {cost} $
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Profit split breakdown */}
                                                <div className="mt-3 pt-3 border-t border-gray-300">
                                                  <div className="text-xs font-semibold text-gray-700 mb-2">
                                                    Répartition des profits (profit: {profit.toFixed(2)} $)
                                                  </div>
                                                  <div className="grid grid-cols-4 gap-2">
                                                    <div className="bg-green-50 p-2 rounded text-center">
                                                      <div className="text-xs text-gray-600">Élève (comptant)</div>
                                                      <div className="font-bold text-green-700">{profitSplit.studentCash?.toFixed(2) || '0.00'} $</div>
                                                    </div>
                                                    <div className="bg-green-100 p-2 rounded text-center">
                                                      <div className="text-xs text-gray-600">Élève (compte)</div>
                                                      <div className="font-bold text-green-600">{profitSplit.studentSchoolAccount?.toFixed(2) || '0.00'} $</div>
                                                    </div>
                                                    <div className="bg-blue-50 p-2 rounded text-center">
                                                      <div className="text-xs text-gray-600">Projet École</div>
                                                      <div className="font-bold text-blue-700">{profitSplit.schoolProject?.toFixed(2) || '0.00'} $</div>
                                                    </div>
                                                    <div className="bg-purple-50 p-2 rounded text-center">
                                                      <div className="text-xs text-gray-600">Tirage</div>
                                                      <div className="font-bold text-purple-700">{profitSplit.raffle?.toFixed(2) || '0.00'} $</div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="text-gray-500 text-center py-4">
                                          Aucun produit défini pour cette campagne
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Statistiques de la campagne */}
                                  <div className="mt-8 pt-6 border-t">
                                    <h5 className="font-semibold text-gray-900 mb-4">Statistiques de performance</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                          {selectedCampaign.totalSales || 0}
                                        </div>
                                        <div className="text-sm text-gray-600">Ventes ($)</div>
                                      </div>
                                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">
                                          {selectedCampaign.totalOrders || 0}
                                        </div>
                                        <div className="text-sm text-gray-600">Commandes</div>
                                      </div>
                                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">
                                          {selectedCampaign.totalParticipants || 0}
                                        </div>
                                        <div className="text-sm text-gray-600">Participants</div>
                                      </div>
                                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                                        <div className="text-2xl font-bold text-orange-600">
                                          {selectedCampaign.financialGoal > 0 ?
                                            Math.round((selectedCampaign.totalSales || 0) / selectedCampaign.financialGoal * 100) : 0}%
                                        </div>
                                        <div className="text-sm text-gray-600">Progression</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredAndSortedSchools.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucune école trouvée
          </div>
        )}
      </CardContent>

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Suppression définitive
            </DialogTitle>
            <DialogDescription>
              {!deleteTarget ? (
                <>
                  Sélectionnez un élément à supprimer.
                </>
              ) : deleteTarget.type === 'school' ? (
                <>
                  Êtes-vous sûr de vouloir supprimer définitivement l'école <strong>{deleteTarget?.name ?? ''}</strong> ?
                  <br />
                  <br />
                  Cette action supprimera également :
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Toutes les campagnes associées</li>
                    <li>Toutes les commandes</li>
                    <li>Tous les magasins</li>
                    <li>Toutes les références dans les utilisateurs</li>
                  </ul>
                  <br />
                  <strong className="text-red-600">Cette action est irréversible.</strong>
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir supprimer définitivement la <strong>{deleteTarget?.name ?? ''}</strong> ?
                  <br />
                  <br />
                  Cette action supprimera également :
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Toutes les commandes associées</li>
                    <li>Toutes les références dans les utilisateurs</li>
                  </ul>
                  <br />
                  <strong className="text-red-600">Cette action est irréversible.</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
              disabled={deleting || !deleteTarget}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={deleteTarget?.type === 'school' ? handleDeleteSchool : handleDeleteCampaign}
              disabled={deleting || !deleteTarget}
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

      {/* Dialog d'édition des dates */}
      <Dialog open={editDatesDialogOpen} onOpenChange={setEditDatesDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier les dates de la campagne</DialogTitle>
            <DialogDescription>
              Modifiez les dates de la campagne #{editingCampaign?.campaignNumber}.
              <br />
              <strong className="text-orange-600">Note:</strong> En tant que Massibec, vous pouvez définir un écart de moins de 3 semaines entre la fin de campagne et la livraison.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-startDate">Date de début *</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={dateFormData.startDate}
                onChange={(e) => setDateFormData({ ...dateFormData, startDate: e.target.value })}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-endDate">Date de fin *</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={dateFormData.endDate}
                onChange={(e) => setDateFormData({ ...dateFormData, endDate: e.target.value })}
                min={dateFormData.startDate}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-deliveryDate">Date de livraison *</Label>
              <Input
                id="edit-deliveryDate"
                type="date"
                value={dateFormData.deliveryDate}
                onChange={(e) => setDateFormData({ ...dateFormData, deliveryDate: e.target.value })}
                min={dateFormData.endDate}
                className="mt-1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Peut être moins de 3 semaines après la fin de la campagne (Massibec uniquement)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDatesDialogOpen(false);
                setEditingCampaign(null);
              }}
              disabled={savingDates}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveDates}
              disabled={savingDates}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingDates ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition des répartitions de profits */}
      <Dialog open={editProfitSplitsDialogOpen} onOpenChange={setEditProfitSplitsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier les répartitions de profits</DialogTitle>
            <DialogDescription>
              Modifiez les répartitions de profits pour la campagne #{editingProfitSplitsCampaign?.campaignNumber}.
              <br />
              <strong className="text-orange-600">Note:</strong> Toutes les commandes existantes seront automatiquement recalculées avec les nouvelles valeurs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {Object.entries(profitSplitsData).map(([productId, data]) => (
              <div key={productId} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-medium text-gray-900 mb-3">{data.productName}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor={`studentCash-${productId}`} className="text-xs text-gray-600">
                      Élève (comptant) $
                    </Label>
                    <Input
                      id={`studentCash-${productId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={data.studentCash}
                      onChange={(e) => handleProfitSplitChange(productId, 'studentCash', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`studentSchoolAccount-${productId}`} className="text-xs text-gray-600">
                      Élève (compte) $
                    </Label>
                    <Input
                      id={`studentSchoolAccount-${productId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={data.studentSchoolAccount}
                      onChange={(e) => handleProfitSplitChange(productId, 'studentSchoolAccount', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`schoolProject-${productId}`} className="text-xs text-gray-600">
                      Projet École $
                    </Label>
                    <Input
                      id={`schoolProject-${productId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={data.schoolProject}
                      onChange={(e) => handleProfitSplitChange(productId, 'schoolProject', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`raffle-${productId}`} className="text-xs text-gray-600">
                      Tirage $
                    </Label>
                    <Input
                      id={`raffle-${productId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={data.raffle}
                      onChange={(e) => handleProfitSplitChange(productId, 'raffle', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(profitSplitsData).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Aucun produit avec répartition de profits trouvé pour cette campagne.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditProfitSplitsDialogOpen(false);
                setEditingProfitSplitsCampaign(null);
                setProfitSplitsData({});
              }}
              disabled={savingProfitSplits}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveProfitSplits}
              disabled={savingProfitSplits || Object.keys(profitSplitsData).length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {savingProfitSplits ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer et recalculer les commandes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SchoolsTable;