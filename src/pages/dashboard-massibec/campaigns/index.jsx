import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  Users,
  Building,
  LogOut,
  Eye,
  Check,
  X,
  Percent,
  Edit
} from 'lucide-react';

export default function MassibecCampaigns() {
  const router = useRouter();
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  // Fetch pending campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/massibec/campaigns');
        if (response.ok) {
          const data = await response.json();
          setCampaigns(data);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchCampaigns();
    }
  }, [session]);

  // Handle Logout
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  // Handle Update Campaign
  const handleUpdateCampaign = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const updateData = {
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      deliveryDate: formData.get('deliveryDate'),
      financialGoal: formData.get('financialGoal'),
      profitSplitType: formData.get('profitSplitType'),
      studentBenefit: formData.get('studentBenefit'),
      organizationBenefit: formData.get('organizationBenefit'),
      raffleBenefit: formData.get('raffleBenefit'),
      reason: formData.get('reason')
    };

    try {
      const response = await fetch(`/api/massibec/campaigns/${editingCampaign._id}/modify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert('Modifications proposées avec succès!');
        setShowEditModal(false);
        // Refresh campaigns
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert('Erreur lors de la proposition de modifications');
    }
  };

  // Handle Campaign Approval
  const handleApproveCampaign = async (campaignId) => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/massibec/campaigns/${campaignId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Refresh campaigns list
        const updatedResponse = await fetch('/api/massibec/campaigns');
        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          setCampaigns(data);
        }
        setSelectedCampaign(null);
      } else {
        alert('Erreur lors de l\'approbation de la campagne');
      }
    } catch (error) {
      console.error('Error approving campaign:', error);
      alert('Une erreur est survenue');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Campaign Rejection
  const handleRejectCampaign = async (campaignId) => {
    if (!rejectionReason.trim()) {
      alert('Veuillez fournir une raison pour le rejet');
      return;
    }

    setIsRejecting(true);
    try {
      const response = await fetch(`/api/massibec/campaigns/${campaignId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (response.ok) {
        // Refresh campaigns list
        const updatedResponse = await fetch('/api/massibec/campaigns');
        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          setCampaigns(data);
        }
        setSelectedCampaign(null);
        setRejectionReason('');
      } else {
        alert('Erreur lors du rejet de la campagne');
      }
    } catch (error) {
      console.error('Error rejecting campaign:', error);
      alert('Une erreur est survenue');
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_approval':
        return <Badge className="bg-yellow-500">En attente</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approuvée</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejetée</Badge>;
      case 'active':
        return <Badge className="bg-blue-500">Active</Badge>;
      case 'completed':
        return <Badge className="bg-gray-500">Terminée</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-700">Chargement des campagnes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Avatar className="h-12 w-12 mr-4">
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Massibec - Gestion des Campagnes
                </h1>
                <p className="text-sm text-gray-500">
                  Tableau de bord d'approbation
                </p>
              </div>
            </div>
            <Button variant="outline" className="flex items-center" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En attente</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'pending_approval').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approuvées</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'approved' || c.status === 'active').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejetées</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'rejected').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle>Campagnes en attente d'approbation</CardTitle>
              <CardDescription>
                Gérez les demandes de campagnes des écoles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune campagne</h3>
                  <p className="text-gray-500">
                    Aucune campagne n'est en attente d'approbation.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>École</TableHead>
                        <TableHead>Campagne</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Objectif</TableHead>
                        <TableHead>Répartition</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign._id}>
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-3">
                                <AvatarFallback className="text-xs">
                                  {campaign.school.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{campaign.school.name}</p>
                                <p className="text-sm text-gray-500">{campaign.school.address}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">#{campaign.campaignNumber}</p>
                              <p className="text-sm text-gray-500">
                                {campaign.profitSplitType === 'percentage' ? 'Pourcentage' : 'Valeur absolue'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>Début: {new Date(campaign.startDate).toLocaleDateString('fr-CA')}</p>
                              <p>Fin: {new Date(campaign.endDate).toLocaleDateString('fr-CA')}</p>
                              <p>Livraison: {new Date(campaign.deliveryDate).toLocaleDateString('fr-CA')}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                              {campaign.financialGoal.toLocaleString()}$
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>Étudiant: {campaign.profitSplit.studentBenefit}%</p>
                              <p>Organisation: {campaign.profitSplit.organizationBenefit}%</p>
                              <p>Tirage: {campaign.profitSplit.raffleBenefit}%</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(campaign.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setEditingCampaign(campaign);
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedCampaign(campaign)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Détails de la Campagne</DialogTitle>
                                    <DialogDescription>
                                      Campagne #{selectedCampaign?.campaignNumber} - {selectedCampaign?.school.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedCampaign && (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>École</Label>
                                          <p className="font-medium">{selectedCampaign.school.name}</p>
                                          <p className="text-sm text-gray-500">{selectedCampaign.school.address}</p>
                                        </div>
                                        <div>
                                          <Label>Objectif financier</Label>
                                          <p className="font-medium">{selectedCampaign.financialGoal.toLocaleString()}$</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-4">
                                        <div>
                                          <Label>Date de début</Label>
                                          <p>{new Date(selectedCampaign.startDate).toLocaleDateString('fr-CA')}</p>
                                        </div>
                                        <div>
                                          <Label>Date de fin</Label>
                                          <p>{new Date(selectedCampaign.endDate).toLocaleDateString('fr-CA')}</p>
                                        </div>
                                        <div>
                                          <Label>Date de livraison</Label>
                                          <p>{new Date(selectedCampaign.deliveryDate).toLocaleDateString('fr-CA')}</p>
                                        </div>
                                      </div>
                                      <div>
                                        <Label>Répartition des profits</Label>
                                        <div className="grid grid-cols-3 gap-4 mt-2">
                                          <div className="p-3 bg-blue-50 rounded-lg">
                                            <p className="text-sm text-blue-600">Étudiant</p>
                                            <p className="font-semibold">{selectedCampaign.profitSplit.studentBenefit}%</p>
                                          </div>
                                          <div className="p-3 bg-green-50 rounded-lg">
                                            <p className="text-sm text-green-600">Organisation</p>
                                            <p className="font-semibold">{selectedCampaign.profitSplit.organizationBenefit}%</p>
                                          </div>
                                          <div className="p-3 bg-purple-50 rounded-lg">
                                            <p className="text-sm text-purple-600">Tirage</p>
                                            <p className="font-semibold">{selectedCampaign.profitSplit.raffleBenefit}%</p>
                                          </div>
                                        </div>
                                      </div>
                                      {selectedCampaign.rejectionReason && (
                                        <div>
                                          <Label>Raison du rejet</Label>
                                          <p className="text-red-600">{selectedCampaign.rejectionReason}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <DialogFooter>
                                    {selectedCampaign?.status === 'pending_approval' && (
                                      <>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setRejectionReason('');
                                            setSelectedCampaign(null);
                                          }}
                                        >
                                          Fermer
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          onClick={() => handleRejectCampaign(selectedCampaign._id)}
                                          disabled={isRejecting}
                                        >
                                          {isRejecting ? 'Rejet...' : 'Rejeter'}
                                        </Button>
                                        <Button
                                          onClick={() => handleApproveCampaign(selectedCampaign._id)}
                                          disabled={isApproving}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          {isApproving ? 'Appro...' : 'Approuver'}
                                        </Button>
                                      </>
                                    )}
                                    {selectedCampaign?.status !== 'pending_approval' && (
                                      <Button
                                        variant="outline"
                                        onClick={() => setSelectedCampaign(null)}
                                      >
                                        Fermer
                                      </Button>
                                    )}
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
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
        </div>
      </main>

      {/* Edit Campaign Modal */}
      {showEditModal && editingCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Modifier la Campagne #{editingCampaign.campaignNumber}</h3>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateCampaign(e);
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="editStartDate">Date de début</Label>
                  <Input
                    type="date"
                    id="editStartDate"
                    name="startDate"
                    defaultValue={editingCampaign.startDate}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="editEndDate">Date de fin</Label>
                  <Input
                    type="date"
                    id="editEndDate"
                    name="endDate"
                    defaultValue={editingCampaign.endDate}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editDeliveryDate">Date de livraison</Label>
                <Input
                  type="date"
                  id="editDeliveryDate"
                  name="deliveryDate"
                  defaultValue={editingCampaign.deliveryDate}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="editFinancialGoal">Objectif financier ($)</Label>
                <Input
                  type="number"
                  id="editFinancialGoal"
                  name="financialGoal"
                  defaultValue={editingCampaign.financialGoal}
                  required
                  className="mt-1"
                />
              </div>

              <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Percent className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">Configuration des profits</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="editProfitSplitType">Type de répartition</Label>
                    <Select 
                      defaultValue={editingCampaign.profitSplitType} 
                      name="profitSplitType"
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionnez le type de répartition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          <div className="flex items-center space-x-2">
                            <Percent className="h-4 w-4" />
                            <span>Pourcentage par produit</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="absolute">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Valeur absolue par produit</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="editStudentBenefit">Bénéfice étudiant (%)</Label>
                      <Input
                        type="number"
                        id="editStudentBenefit"
                        name="studentBenefit"
                        defaultValue={editingCampaign.profitSplit?.studentBenefit}
                        min="0"
                        max="100"
                        step="0.1"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editOrganizationBenefit">Bénéfice organisation (%)</Label>
                      <Input
                        type="number"
                        id="editOrganizationBenefit"
                        name="organizationBenefit"
                        defaultValue={editingCampaign.profitSplit?.organizationBenefit}
                        min="0"
                        max="100"
                        step="0.1"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editRaffleBenefit">Bénéfice tirage (%)</Label>
                      <Input
                        type="number"
                        id="editRaffleBenefit"
                        name="raffleBenefit"
                        defaultValue={editingCampaign.profitSplit?.raffleBenefit}
                        min="0"
                        max="100"
                        step="0.1"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="modificationReason">Raison des modifications</Label>
                <Textarea
                  id="modificationReason"
                  name="reason"
                  placeholder="Expliquez pourquoi vous modifiez cette campagne..."
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Annuler
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Proposer les modifications
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
