// pages/dashboard-massibec/schools/index.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import SchoolSelector from '../../../components/Dashboard/SchoolManagement/SchoolSelector';
import SchoolInfo from '../../../components/Dashboard/SchoolManagement/SchoolInfo';
import SchoolOrders from '../../../components/Dashboard/SchoolManagement/SchoolOrders';
import SchoolSalesData from '../../../components/Dashboard/SchoolManagement/SchoolSalesData';
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
  AlertCircle
} from 'lucide-react';

const SchoolsPage = () => {
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [errorSchool, setErrorSchool] = useState(null);
  const [allSchools, setAllSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchAllSchools();
  }, []);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchSchoolData(selectedSchoolId);
    }
  }, [selectedSchoolId]);

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

  const fetchSchoolData = async (schoolId) => {
    setLoadingSchool(true);
    setErrorSchool(null);
    try {
      const response = await fetch(`/api/schools/${schoolId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch school data.');
      }
      const data = await response.json();
      setSchoolData(data);
    } catch (error) {
      setErrorSchool(error.message);
    } finally {
      setLoadingSchool(false);
    }
  };

  const getStatusBadge = (school) => {
    if (school.approved) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Approuvée</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>;
    }
  };

  const getStatusIcon = (school) => {
    if (school.approved) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else {
      return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const filteredSchools = allSchools.filter(school => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'approved') return school.approved;
    if (filterStatus === 'pending') return !school.approved;
    return true;
  });

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
        alert('École approuvée avec succès!');
        fetchAllSchools();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error('Error approving school:', error);
      alert('Erreur lors de l\'approbation de l\'école');
    }
  };

  const handleManageCampaigns = (schoolId) => {
    // Navigate to campaigns management page
    window.location.href = `/dashboard-massibec/campaigns?schoolId=${schoolId}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Gestion des Écoles</h2>
            <p className="text-gray-600 mt-1">Gérez toutes les écoles et leurs campagnes</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toutes les écoles</option>
              <option value="approved">Approuvées</option>
              <option value="pending">En attente</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                {allSchools.filter(s => !s.approved).length}
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
                      <TableRow key={school._id}>
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
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSchoolId(school._id)}
                            >
                              Voir détails
                            </Button>
                            {!school.approved && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => handleApproveSchool(school._id)}
                              >
                                Approuver
                              </Button>
                            )}
                            {school.campaigns?.some(c => c.status === 'pending_approval') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                onClick={() => handleManageCampaigns(school._id)}
                              >
                                Gérer campagnes
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* School Details */}
        {selectedSchoolId && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Détails de l'École</h3>
              <Button
                variant="outline"
                onClick={() => setSelectedSchoolId(null)}
              >
                Fermer
              </Button>
            </div>

            {loadingSchool && <p>Chargement des détails...</p>}
            {errorSchool && <p className="text-red-500">Erreur: {errorSchool}</p>}

            {schoolData && (
              <div className="space-y-8">
                <SchoolInfo school={schoolData} />
                <SchoolOrders schoolId={selectedSchoolId} school={schoolData} />
                <SchoolSalesData schoolId={selectedSchoolId} />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SchoolsPage;
