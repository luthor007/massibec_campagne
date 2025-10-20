// pages/dashboard-massibec/schools/index.jsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import SchoolSelector from '../../../components/Dashboard/SchoolManagement/SchoolSelector';
import SchoolInfo from '../../../components/Dashboard/SchoolManagement/SchoolInfo';
import SchoolOrders from '../../../components/Dashboard/SchoolManagement/SchoolOrders';
import SchoolSalesData from '../../../components/Dashboard/SchoolManagement/SchoolSalesData';
import CampaignManagement from '../../../components/Dashboard/SchoolManagement/CampaignManagement';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const SchoolsPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [allSchools, setAllSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedSchoolForAction, setSelectedSchoolForAction] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [expandedSchoolData, setExpandedSchoolData] = useState({});

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/connexion');
      return;
    }
    
    // Vérifier si l'utilisateur a le rôle fournisseur
    if (session.user.role !== 'fournisseur') {
      router.push('/dashboard');
      return;
    }
    
    fetchAllSchools();
  }, [session, status, router]);


  const fetchAllSchools = async () => {
    setLoadingSchools(true);
    try {
      const response = await fetch('/api/schools');
      if (!response.ok) {
        throw new Error('Failed to fetch schools.');
      }
      const data = await response.json();
      setAllSchools(data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoadingSchools(false);
    }
  };


  const getStatusBadge = (school) => {
    const status = school.status || (school.approved ? 'approved' : 'pending');
    
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approuvée</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejetée</Badge>;
      case 'deactivated':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Désactivée</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>;
    }
  };

  const getStatusIcon = (school) => {
    const status = school.status || (school.approved ? 'approved' : 'pending');
    
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'deactivated':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const filteredSchools = allSchools.filter(school => {
    const status = school.status || (school.approved ? 'approved' : 'pending');
    
    if (filterStatus === 'all') return true;
    if (filterStatus === 'approved') return status === 'approved';
    if (filterStatus === 'pending') return status === 'pending';
    if (filterStatus === 'rejected') return status === 'rejected';
    if (filterStatus === 'deactivated') return status === 'deactivated';
    return true;
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleApproveSchool = async (schoolId) => {
    try {
      const response = await fetch(`/api/approve-school`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schoolId }),
      });

      if (response.ok) {
        showNotification('École approuvée avec succès!', 'success');
        fetchAllSchools();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error approving school:', error);
      showNotification('Erreur lors de l\'approbation de l\'école', 'error');
    }
  };

  const handleManageCampaigns = (schoolId) => {
    // Navigate to campaigns management page using Next.js router
    router.push(`/dashboard-massibec/campaigns?schoolId=${schoolId}`);
  };

  const handleRejectSchool = async () => {
    if (!selectedSchoolForAction) return;
    
    try {
      const response = await fetch(`/api/reject-school`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          schoolId: selectedSchoolForAction._id,
          reason: actionReason 
        }),
      });

      if (response.ok) {
        showNotification('École rejetée avec succès!', 'success');
        fetchAllSchools();
        setShowRejectModal(false);
        setSelectedSchoolForAction(null);
        setActionReason('');
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error rejecting school:', error);
      showNotification('Erreur lors du rejet de l\'école', 'error');
    }
  };

  const handleDeactivateSchool = async () => {
    if (!selectedSchoolForAction) return;
    
    try {
      const response = await fetch(`/api/deactivate-school`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          schoolId: selectedSchoolForAction._id,
          reason: actionReason 
        }),
      });

      if (response.ok) {
        showNotification('École désactivée avec succès!', 'success');
        fetchAllSchools();
        setShowDeactivateModal(false);
        setSelectedSchoolForAction(null);
        setActionReason('');
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error deactivating school:', error);
      showNotification('Erreur lors de la désactivation de l\'école', 'error');
    }
  };

  const handleReactivateSchool = async (schoolId) => {
    try {
      const response = await fetch(`/api/reactivate-school`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schoolId }),
      });

      if (response.ok) {
        showNotification('École réactivée avec succès!', 'success');
        fetchAllSchools();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error reactivating school:', error);
      showNotification('Erreur lors de la réactivation de l\'école', 'error');
    }
  };

  const handleFixSchoolStatus = async () => {
    try {
      const response = await fetch(`/api/fix-school-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(result.message, 'success');
        console.log('Fix results:', result.results);
        fetchAllSchools();
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error fixing school status:', error);
      showNotification('Erreur lors de la correction', 'error');
    }
  };

  const handleCheckTestMassibec = async () => {
    try {
      const response = await fetch(`/api/check-school-status?schoolName=Test Massibec`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(`Test Massibec - Code: ${result.code}, Statut: ${result.status}, Peut inscrire: ${result.canRegisterStudents}`, 'success');
        console.log('Test Massibec status:', result);
      } else {
        const error = await response.json();
        showNotification(`Erreur: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error checking Test Massibec:', error);
      showNotification('Erreur lors de la vérification', 'error');
    }
  };

  const toggleRowExpansion = async (schoolId) => {
    const newExpandedRows = new Set(expandedRows);
    
    if (newExpandedRows.has(schoolId)) {
      // Collapse row
      newExpandedRows.delete(schoolId);
      setExpandedSchoolData(prev => {
        const newData = { ...prev };
        delete newData[schoolId];
        return newData;
      });
    } else {
      // Expand row and fetch data if not already loaded
      newExpandedRows.add(schoolId);
      if (!expandedSchoolData[schoolId]) {
        try {
          const response = await fetch(`/api/schools/${schoolId}`);
          if (response.ok) {
            const data = await response.json();
            setExpandedSchoolData(prev => ({
              ...prev,
              [schoolId]: data
            }));
          }
        } catch (error) {
          console.error('Error fetching school data:', error);
        }
      }
    }
    
    setExpandedRows(newExpandedRows);
  };

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="ml-2 text-gray-600">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Don't render if not authenticated or wrong role
  if (!session || session.user.role !== 'fournisseur') {
    return null;
  }

  return (
    <DashboardLayout>
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {notification.message}
        </div>
      )}
      
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Gestion des Écoles</h2>
            <p className="text-gray-600 mt-1">Gérez toutes les écoles et leurs campagnes</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={fetchAllSchools}
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button
              variant="outline"
              onClick={handleFixSchoolStatus}
              className="flex items-center bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Corriger statuts
            </Button>
            <Button
              variant="outline"
              onClick={handleCheckTestMassibec}
              className="flex items-center bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Vérifier Test Massibec
            </Button>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toutes les écoles</option>
              <option value="approved">Approuvées</option>
              <option value="pending">En attente</option>
              <option value="rejected">Rejetées</option>
              <option value="deactivated">Désactivées</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Écoles</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allSchools.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approuvées</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {allSchools.filter(s => s.approved).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {allSchools.filter(s => (s.status || (s.approved ? 'approved' : 'pending')) === 'pending').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejetées</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {allSchools.filter(s => s.status === 'rejected').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Désactivées</CardTitle>
              <AlertCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {allSchools.filter(s => s.status === 'deactivated').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Campagnes Actives</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {allSchools.filter(s => s.campaigns?.some(c => c.isActive)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schools Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Écoles</CardTitle>
            <CardDescription>
              Toutes les écoles inscrites dans le système
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSchools ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Chargement des écoles...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>École</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Campagne</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.map((school) => (
                      <React.Fragment key={school._id}>
                        <TableRow>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-semibold">{school.name}</div>
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin className="h-3 w-3 mr-1" />
                                {school.address}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm">
                                <Mail className="h-3 w-3 mr-1" />
                                {school.email}
                              </div>
                              <div className="flex items-center text-sm">
                                <Phone className="h-3 w-3 mr-1" />
                                {school.telephone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-medium">Campagne #{school.currentCampaignNumber || 1}</span>
                              </div>
                              {school.campaigns && school.campaigns.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  {school.campaigns.filter(c => c.status === 'pending_approval').length} en attente
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(school)}
                              {getStatusBadge(school)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                onClick={() => toggleRowExpansion(school._id)}
                              >
                                {expandedRows.has(school._id) ? 'Masquer détails' : 'Voir détails'}
                              </Button>
                              
                              {/* Actions basées sur le statut */}
                              {(() => {
                                const status = school.status || (school.approved ? 'approved' : 'pending');
                                
                                switch (status) {
                                  case 'pending':
                                    return (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400 transition-colors"
                                          onClick={() => handleApproveSchool(school._id)}
                                        >
                                          Approuver
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-colors"
                                          onClick={() => {
                                            setSelectedSchoolForAction(school);
                                            setShowRejectModal(true);
                                          }}
                                        >
                                          Rejeter
                                        </Button>
                                      </>
                                    );
                                  
                                  case 'approved':
                                    return (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                          onClick={() => {
                                            setSelectedSchoolForAction(school);
                                            setShowDeactivateModal(true);
                                          }}
                                        >
                                          Désactiver
                                        </Button>
                                        {school.campaigns?.some(c => c.status === 'pending_approval') && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                                            onClick={() => handleManageCampaigns(school._id)}
                                          >
                                            Gérer campagnes
                                          </Button>
                                        )}
                                      </>
                                    );
                                  
                                  case 'rejected':
                                    return (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400 transition-colors"
                                        onClick={() => handleReactivateSchool(school._id)}
                                      >
                                        Réactiver
                                      </Button>
                                    );
                                  
                                  default:
                                    return null;
                                }
                              })()}
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Details Row */}
                        {expandedRows.has(school._id) && (
                          <TableRow>
                            <TableCell colSpan={5} className="p-0">
                              <div className="bg-gray-50 p-6 border-t">
                                {expandedSchoolData[school._id] ? (
                                  <div className="space-y-6">
                                    <SchoolInfo school={expandedSchoolData[school._id]} />
                                    <CampaignManagement 
                                      school={expandedSchoolData[school._id]} 
                                      onCampaignUpdate={(updatedCampaign) => {
                                        // Update the expanded school data with the updated campaign
                                        setExpandedSchoolData(prev => ({
                                          ...prev,
                                          [school._id]: {
                                            ...prev[school._id],
                                            campaigns: prev[school._id].campaigns.map(c => 
                                              c._id === updatedCampaign._id ? updatedCampaign : c
                                            )
                                          }
                                        }));
                                        
                                        // Also update the main school data to keep everything in sync
                                        setAllSchools(prev => prev.map(s => {
                                          if (s._id === school._id) {
                                            return {
                                              ...s,
                                              campaigns: s.campaigns.map(c => 
                                                c._id === updatedCampaign._id ? updatedCampaign : c
                                              )
                                            };
                                          }
                                          return s;
                                        }));
                                      }}
                                    />
                                    <SchoolOrders schoolId={school._id} school={expandedSchoolData[school._id]} />
                                    <SchoolSalesData schoolId={school._id} />
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                                    <p className="mt-2 text-gray-600">Chargement des détails...</p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Reject School Modal */}
        {showRejectModal && selectedSchoolForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Rejeter l'école</h3>
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir rejeter l'école <strong>{selectedSchoolForAction.name}</strong> ?
              </p>
              <div className="mb-4">
                <Label htmlFor="rejectReason">Raison du rejet (optionnel)</Label>
                <Textarea
                  id="rejectReason"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Expliquez pourquoi cette école est rejetée..."
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedSchoolForAction(null);
                    setActionReason('');
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectSchool}
                >
                  Rejeter
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Deactivate School Modal */}
        {showDeactivateModal && selectedSchoolForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Désactiver l'école</h3>
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir désactiver l'école <strong>{selectedSchoolForAction.name}</strong> ?
              </p>
              <div className="mb-4">
                <Label htmlFor="deactivateReason">Raison de la désactivation (optionnel)</Label>
                <Textarea
                  id="deactivateReason"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Expliquez pourquoi cette école est désactivée..."
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeactivateModal(false);
                    setSelectedSchoolForAction(null);
                    setActionReason('');
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeactivateSchool}
                >
                  Désactiver
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SchoolsPage;
