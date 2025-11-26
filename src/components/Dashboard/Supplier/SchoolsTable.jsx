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
  Trash2
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

const SchoolsTable = ({ schools, loading, onRefresh, onDeactivate, onReactivate, onViewDetails, onApproveCampaign, onRejectCampaign, onUnapproveCampaign }) => {
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejetée' },
      deactivated: { color: 'bg-gray-100 text-gray-800', icon: Ban, label: 'Désactivée' }
    };

    const config = statusConfig[status] || statusConfig.approved;
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

    // Show mode (test/production) instead of just "Active"
    const mode = campaign.mode || 'test';
    const isProduction = mode === 'production';

    const now = new Date();
    const startDate = campaign.startDate ? new Date(campaign.startDate) : campaign.debutCampagne ? new Date(campaign.debutCampagne) : null;
    const endDate = campaign.endDate ? new Date(campaign.endDate) : campaign.finCampagne ? new Date(campaign.finCampagne) : null;

    if (startDate && now < startDate) {
      return { status: 'upcoming', label: 'À venir', color: 'text-blue-600', mode: isProduction ? 'Production' : 'Test' };
    } else if (endDate && now > endDate) {
      return { status: 'completed', label: 'Terminée', color: 'text-gray-600', mode: isProduction ? 'Production' : 'Test' };
    } else {
      return { status: 'active', label: isProduction ? 'Production' : 'Test', color: isProduction ? 'text-green-600' : 'text-orange-600', mode: isProduction ? 'Production' : 'Test' };
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
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 mt-3 sm:mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <Input
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 sm:pl-10 text-sm"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 md:w-48 text-sm">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="approved">Actives</SelectItem>
              <SelectItem value="rejected">Rejetées</SelectItem>
              <SelectItem value="deactivated">Désactivées</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={onRefresh} variant="outline" className="shrink-0 text-sm px-3 sm:px-4">
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Actualiser</span>
            <span className="sm:hidden">Rafr.</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 min-w-[200px]"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    École
                    {sortField === 'name' && (
                      <ChevronDown className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="min-w-[180px]">Contact</TableHead>
                <TableHead className="min-w-[150px]">Campagne active</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 min-w-[120px]"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Inscription
                    {sortField === 'createdAt' && (
                      <ChevronDown className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right min-w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedSchools.map((school) => {
                const isExpanded = expandedRows.has(school._id);
                const campaignStatus = getCampaignStatus(school.activeCampaign);

                return (
                  <React.Fragment key={school._id}>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="w-10">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleRowExpansion(school._id);
                          }}
                          className="p-1 h-8 w-8"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          )}
                        </Button>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex items-center gap-2 lg:gap-3">
                          {school.logo && getLogoUrl(school.logo) ? (
                            <img
                              src={getLogoUrl(school.logo)}
                              alt={school.nomEcole || school.name}
                              className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover flex-shrink-0"
                              onError={(e) => {
                                // Hide broken image
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm lg:text-base truncate">{school.name}</div>
                            <div className="text-xs lg:text-sm text-gray-500 truncate">
                              {(school.adresse || school.address) && `${school.adresse || school.address}, `}
                              {school.ville && school.codePostal ? `${school.ville}, ${school.codePostal}` : school.ville || school.codePostal || ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="space-y-1">
                          {(school.email || school.telephone || school.cellulaire) ? (
                            <>
                              {school.email && (
                                <div className="flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm">
                                  <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  <span className="truncate max-w-[150px] lg:max-w-[200px]" title={school.email}>{school.email}</span>
                                </div>
                              )}
                              {school.telephone && (
                                <div className="flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm">
                                  <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{school.telephone}</span>
                                </div>
                              )}
                              {school.cellulaire && (
                                <div className="flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm">
                                  <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{school.cellulaire}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs lg:text-sm">N/A</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        {school.activeCampaign ? (
                          <div className="space-y-1">
                            <div className="text-xs lg:text-sm font-medium truncate">
                              {school.activeCampaign.nomCampagne || school.activeCampaign.name || `Campagne #${school.activeCampaign.campaignNumber}`}
                            </div>
                            {campaignStatus && (
                              <Badge className={campaignStatus.mode === 'Production' ? 'bg-green-100 text-green-800 text-xs' : 'bg-orange-100 text-orange-800 text-xs'}>
                                {campaignStatus.mode}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs lg:text-sm">Aucune campagne</span>
                        )}
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="text-xs lg:text-sm whitespace-nowrap">
                          {school.firstCampaignDate ? format(parseLocalDate(school.firstCampaignDate), 'dd/MM/yyyy', { locale: fr }) : 'N/A'}
                        </div>
                      </TableCell>

                      <TableCell className="text-right py-3">
                        <div className="flex items-center justify-end gap-1 lg:gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('View details clicked for:', school.name);
                              onViewDetails(school);
                            }}
                            className="p-1.5 lg:p-2 hover:bg-gray-100 rounded transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          </button>

                          {/* School approval removed - all schools are auto-approved */}

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
                              className="p-1.5 lg:p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 transition-colors"
                              title="Désactiver temporairement"
                            >
                              <Ban className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
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
                              className="p-1.5 lg:p-2 text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                              title="Réactiver l'école"
                            >
                              <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
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
                            className="p-1.5 lg:p-2 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Ligne expandable avec détails */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-gray-50 p-0">
                          <div className="p-4 lg:p-6">
                            {/* En-tête avec informations de l'école */}
                            <div className="mb-6">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
                                {school.logo && getLogoUrl(school.logo) && (
                                  <img
                                    src={getLogoUrl(school.logo)}
                                    alt={school.name}
                                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover border-2 border-white shadow-sm flex-shrink-0"
                                    onError={(e) => {
                                      // Hide image if it fails to load
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{school.name}</h3>
                                  <p className="text-sm sm:text-base text-gray-600 break-words">{(school.adresse || school.address) ? `${school.adresse || school.address}, ` : ''}{school.ville}, {school.codePostal}</p>
                                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                      <span className="truncate">{school.email}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                      {school.telephone}
                                    </span>
                                    {school.cellulaire && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
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
                                <h4 className="text-base lg:text-lg font-semibold text-gray-900 mb-3">Campagnes</h4>
                                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
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
                                            campaign.mode === 'production' ? 'bg-green-100 text-green-800' :
                                              campaign.mode === 'test' || !campaign.mode ? 'bg-orange-100 text-orange-800' :
                                                campaign.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                                  campaign.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                          }>
                                            {campaign.mode === 'production' ? 'Production' :
                                              campaign.mode === 'test' || !campaign.mode ? 'Test' :
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
                                            Objectif: {campaign.financialGoal?.toLocaleString('fr-CA')} $
                                          </div>
                                        )}
                                        {/* Sales display */}
                                        {campaign.totalSales !== undefined && (
                                          <div className="text-sm font-semibold text-green-600 mt-1">
                                            Ventes: {campaign.totalSales?.toLocaleString('fr-CA')} $
                                          </div>
                                        )}

                                        {/* Mode indicator */}
                                        {campaign.mode && (
                                          <div className="mt-2">
                                            <Badge variant={campaign.mode === 'production' ? 'default' : 'secondary'} className="text-xs">
                                              {campaign.mode === 'production' ? 'Production' : 'Test'}
                                            </Badge>
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
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                                    <h4 className="text-lg lg:text-xl font-bold text-gray-900">
                                      Détails - Campagne #{selectedCampaign.campaignNumber}
                                    </h4>
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="flex items-center gap-2">
                                        <Badge className={
                                          selectedCampaign.mode === 'production' ? 'bg-green-100 text-green-800' :
                                            selectedCampaign.mode === 'test' || !selectedCampaign.mode ? 'bg-orange-100 text-orange-800' :
                                              selectedCampaign.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                                selectedCampaign.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                  'bg-gray-100 text-gray-800'
                                        }>
                                          {selectedCampaign.mode === 'production' ? 'Production' :
                                            selectedCampaign.mode === 'test' || !selectedCampaign.mode ? 'Test' :
                                              selectedCampaign.status === 'completed' ? 'Terminée' :
                                                selectedCampaign.status === 'rejected' ? 'Rejetée' :
                                                  selectedCampaign.status}
                                        </Badge>
                                      </div>

                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
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
                                            // Handle both ObjectId and populated object formats
                                            const cpProductId = customPrice.productId?._id?.toString() || customPrice.productId?.toString() || String(customPrice.productId);
                                            const profitSplit = selectedCampaign.profitSplits?.find(ps => {
                                              const psProductId = ps.productId?._id?.toString() || ps.productId?.toString() || String(ps.productId);
                                              return psProductId === cpProductId;
                                            });

                                            const cost = customPrice.productId?.cost || 0;
                                            const profit = customPrice.price - cost;

                                            return (
                                              <div key={index} className="p-3 lg:p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                                                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                                    {customPrice.productId?.image ? (
                                                      <img
                                                        src={customPrice.productId.image}
                                                        alt={customPrice.productId.name || 'Produit'}
                                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
                                                        onError={(e) => {
                                                          e.target.style.display = 'none';
                                                        }}
                                                      />
                                                    ) : (
                                                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                                                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                                                      </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                      <div className="font-medium text-sm sm:text-base text-gray-900 break-words">
                                                        {customPrice.productId?.name || customPrice.productId?._id?.toString() || 'Produit'}
                                                      </div>
                                                      {customPrice.productId?.description && (
                                                        <div className="text-xs sm:text-sm text-gray-500 break-words">
                                                          {customPrice.productId.description}
                                                        </div>
                                                      )}
                                                      {customPrice.productId?.isBundle && (
                                                        <Badge variant="secondary" className="mt-1 text-xs">
                                                          Bundle
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="text-right sm:text-left sm:ml-auto">
                                                    <div className="font-bold text-green-600 text-base sm:text-lg">
                                                      {customPrice.price} $
                                                    </div>
                                                    {cost > 0 && (
                                                      <div className="text-xs sm:text-sm text-gray-500">
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
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                              <div key={index} className="p-3 lg:p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                                                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                                    {product.image && (
                                                      <img
                                                        src={product.image}
                                                        alt={product.name}
                                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
                                                      />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                      <div className="font-medium text-sm sm:text-base text-gray-900 break-words">
                                                        {product.name || 'Produit'}
                                                      </div>
                                                      {product.description && (
                                                        <div className="text-xs sm:text-sm text-gray-500 break-words">
                                                          {product.description}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="text-right sm:text-left sm:ml-auto">
                                                    <div className="font-bold text-green-600 text-base sm:text-lg">
                                                      {price} $
                                                    </div>
                                                    {cost > 0 && (
                                                      <div className="text-xs sm:text-sm text-gray-500">
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
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                                      <div className="text-center p-3 lg:p-4 bg-green-50 rounded-lg border-2 border-green-200">
                                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-700 break-words">
                                          ${(selectedCampaign.totalSales || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-xs sm:text-sm font-semibold text-green-800 mt-1">Ventes totales</div>
                                        {selectedCampaign.financialGoal && (
                                          <div className="text-xs text-gray-600 mt-1 break-words">
                                            Objectif: ${selectedCampaign.financialGoal.toLocaleString('fr-CA')}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-center p-3 lg:p-4 bg-blue-50 rounded-lg">
                                        <div className="text-xl sm:text-2xl font-bold text-blue-600">
                                          {selectedCampaign.totalOrders || 0}
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600">Commandes</div>
                                      </div>
                                      <div className="text-center p-3 lg:p-4 bg-purple-50 rounded-lg">
                                        <div className="text-xl sm:text-2xl font-bold text-purple-600">
                                          {selectedCampaign.totalParticipants || 0}
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600">Participants</div>
                                      </div>
                                      <div className="text-center p-3 lg:p-4 bg-orange-50 rounded-lg">
                                        <div className="text-xl sm:text-2xl font-bold text-orange-600">
                                          {selectedCampaign.financialGoal > 0 ?
                                            Math.round((selectedCampaign.totalSales || 0) / selectedCampaign.financialGoal * 100) : 0}%
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600">Progression</div>
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

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden space-y-3 sm:space-y-4 p-3 sm:p-4">
          {filteredAndSortedSchools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Aucune école trouvée</p>
            </div>
          ) : (
            filteredAndSortedSchools.map((school) => {
              const isExpanded = expandedRows.has(school._id);
              const campaignStatus = getCampaignStatus(school.activeCampaign);
              const isLoading = actionLoading.has(school._id);

              return (
                <div key={school._id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  {/* School Card Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {school.logo && getLogoUrl(school.logo) ? (
                          <img
                            src={getLogoUrl(school.logo)}
                            alt={school.nomEcole || school.name}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-6 h-6 text-blue-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{school.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {(school.adresse || school.address) && `${school.adresse || school.address}, `}
                            {school.ville && school.codePostal ? `${school.ville}, ${school.codePostal}` : school.ville || school.codePostal || ''}
                          </div>
                          {school.email && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{school.email}</span>
                            </div>
                          )}
                          {school.telephone && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                              <Phone className="w-3 h-3" />
                              {school.telephone}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRowExpansion(school._id)}
                        className="p-1 flex-shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Campaign Status */}
                    <div className="mt-3 flex items-center justify-between">
                      {school.activeCampaign ? (
                        <div className="flex items-center gap-2">
                          <Badge className={campaignStatus?.mode === 'Production' ? 'bg-green-100 text-green-800 text-xs' : 'bg-orange-100 text-orange-800 text-xs'}>
                            {campaignStatus?.mode || 'Test'}
                          </Badge>
                          <span className="text-xs text-gray-600 truncate">
                            {school.activeCampaign.nomCampagne || school.activeCampaign.name || `Campagne #${school.activeCampaign.campaignNumber}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Aucune campagne</span>
                      )}
                      {getStatusBadge(school.status)}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onViewDetails(school);
                        }}
                        className="flex-1 text-xs"
                        disabled={isLoading}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Détails
                      </Button>
                      {school.status === 'approved' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeactivate(school);
                          }}
                          className="flex-1 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                          disabled={isLoading}
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          Désactiver
                        </Button>
                      )}
                      {(school.status === 'rejected' || school.status === 'deactivated') && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onReactivate(school);
                          }}
                          className="flex-1 text-xs text-green-600 border-green-300 hover:bg-green-50"
                          disabled={isLoading}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Réactiver
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Campaign Details - Mobile */}
                  {isExpanded && school.activeCampaign && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Détails de la campagne</div>
                      {school.activeCampaign.startDate && school.activeCampaign.endDate && (
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">
                            {format(parseLocalDate(school.activeCampaign.startDate), 'dd/MM/yyyy', { locale: fr })} - {format(parseLocalDate(school.activeCampaign.endDate), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </div>
                      )}
                      {school.activeCampaign.financialGoal && (
                        <div className="flex items-center gap-2 text-xs">
                          <TrendingUp className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">Objectif: {school.activeCampaign.financialGoal} $</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
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
    </Card>
  );
};

export default SchoolsTable;