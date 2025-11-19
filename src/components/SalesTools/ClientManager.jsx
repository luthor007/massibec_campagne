// components/SalesTools/ClientManager.jsx
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Mail, Phone, User, Download, Upload, FileText, Smartphone, Mail as MailIcon } from 'lucide-react';

export default function ClientManager({ clients, storeId, campaignId, onRefresh, selectedClients = [], onSelectionChange }) {
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', notes: '' });
  const [editingClient, setEditingClient] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [deleteClientId, setDeleteClientId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importedContacts, setImportedContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  const addClient = async () => {
    if (!newClient.name || !newClient.email) {
      toast.error('Le nom et l\'email sont requis');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClient,
          storeId
        }),
      });

      if (response.ok) {
        setNewClient({ name: '', email: '', phone: '', notes: '' });
        setShowAddDialog(false);
        onRefresh();
        toast.success('Client ajouté avec succès');
      } else {
        const error = await response.json();
        toast.error(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Erreur lors de l\'ajout du client');
    } finally {
      setIsLoading(false);
    }
  };

  const updateClient = async () => {
    if (!editingClient.name || !editingClient.email) {
      toast.error('Le nom et l\'email sont requis');
      return;
    }

    setIsLoading(true);
    try {
      const { _id, ...updateData } = editingClient;
      const response = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: _id,
          ...updateData
        }),
      });

      if (response.ok) {
        setEditingClient(null);
        setShowEditDialog(false);
        onRefresh();
        toast.success('Client mis à jour avec succès');
      } else {
        const error = await response.json();
        toast.error(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erreur lors de la mise à jour du client');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteClient = async (clientId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/clients?id=${clientId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteClientId(null);
        onRefresh();
      } else {
        const error = await response.json();
        toast.error(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erreur lors de la suppression du client');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleClientSelection = (clientId) => {
    const newSelection = selectedClients.includes(clientId)
      ? selectedClients.filter(id => id !== clientId)
      : [...selectedClients, clientId];

    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  const selectAllClients = () => {
    const newSelection = selectedClients.length === clients.length
      ? []
      : clients.map(c => c._id);

    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Nom', 'Email', 'Téléphone', 'Notes'],
      ...clients.map(client => [
        client.name,
        client.email,
        client.phone || '',
        client.notes || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Contact import functions
  const parseVCard = (vcardContent) => {
    const contacts = [];
    const vcardBlocks = vcardContent.split('BEGIN:VCARD');

    vcardBlocks.forEach(block => {
      if (block.trim()) {
        const lines = block.split('\n');
        let contact = { name: '', email: '', phone: '' };

        lines.forEach(line => {
          if (line.startsWith('FN:')) {
            contact.name = line.replace('FN:', '').trim();
          } else if (line.startsWith('EMAIL:')) {
            contact.email = line.replace('EMAIL:', '').trim();
          } else if (line.startsWith('TEL:')) {
            contact.phone = line.replace('TEL:', '').trim();
          }
        });

        if (contact.name && contact.email) {
          contacts.push(contact);
        }
      }
    });

    return contacts;
  };

  const parseCSV = (csvContent) => {
    const lines = csvContent.split('\n');
    const contacts = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV with quotes
      const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());

      if (cleanValues.length >= 2) {
        contacts.push({
          name: cleanValues[0] || '',
          email: cleanValues[1] || '',
          phone: cleanValues[2] || '',
          notes: cleanValues[3] || ''
        });
      }
    }

    return contacts;
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      let contacts = [];

      if (file.name.endsWith('.vcf') || file.name.endsWith('.vcard')) {
        contacts = parseVCard(content);
      } else if (file.name.endsWith('.csv')) {
        contacts = parseCSV(content);
      } else {
        toast.error('Format de fichier non supporté. Utilisez .vcf, .vcard ou .csv');
        return;
      }

      if (contacts.length > 0) {
        setImportedContacts(contacts);
        setSelectedContacts(contacts.map((_, index) => index));
        setShowImportDialog(true);
      } else {
        toast.error('Aucun contact valide trouvé dans le fichier');
      }
    };

    reader.readAsText(file);
  };

  const importSelectedContacts = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Veuillez sélectionner au moins un contact');
      return;
    }

    setIsImporting(true);
    try {
      const contactsToImport = selectedContacts.map(index => importedContacts[index]);

      for (const contact of contactsToImport) {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...contact,
            storeId
          }),
        });

        if (!response.ok) {
          console.error(`Failed to import contact: ${contact.name}`);
        }
      }

      setShowImportDialog(false);
      setImportedContacts([]);
      setSelectedContacts([]);
      onRefresh();
      toast.success(`${selectedContacts.length} contact(s) importé(s) avec succès!`);
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast.error('Erreur lors de l\'importation des contacts');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleContactSelection = (index) => {
    setSelectedContacts(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectAllContacts = () => {
    if (selectedContacts.length === importedContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(importedContacts.map((_, index) => index));
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Liste des Clients</CardTitle>
              <CardDescription>
                {clients.length} client{clients.length > 1 ? 's' : ''} • {selectedClients.length} sélectionné{selectedClients.length > 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!storeId) {
                    toast.error('StoreId manquant. Impossible de synchroniser.');
                    console.error('[ClientManager] storeId is missing:', storeId);
                    return;
                  }

                  setIsLoading(true);
                  try {
                    console.log('[ClientManager] Syncing clients for storeId:', storeId, 'campaignId:', campaignId);
                    const response = await fetch('/api/clients/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ storeId, campaignId })
                    });
                    if (response.ok) {
                      const data = await response.json();
                      toast.success(data.message || `${data.synced || 0} client(s) synchronisé(s)`);
                      onRefresh();
                    } else {
                      const error = await response.json();
                      console.error('[ClientManager] Sync error:', error);
                      toast.error(`Erreur: ${error.message || 'Erreur lors de la synchronisation'}`);
                    }
                  } catch (error) {
                    console.error('[ClientManager] Error syncing clients:', error);
                    toast.error('Erreur lors de la synchronisation');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading || !storeId}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isLoading ? 'Synchronisation...' : 'Synchroniser depuis commandes'}
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} className="w-full sm:w-auto">
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </Button>
              <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter Client
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun client</h3>
              <p className="text-gray-500 mb-4">
                Synchronisez vos clients depuis vos commandes ou ajoutez-les manuellement
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!storeId) {
                      toast.error('StoreId manquant. Impossible de synchroniser.');
                      return;
                    }
                    setIsLoading(true);
                    try {
                      const response = await fetch('/api/clients/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ storeId, campaignId })
                      });
                      if (response.ok) {
                        const data = await response.json();
                        toast.success(data.message || `${data.synced || 0} client(s) synchronisé(s)`);
                        onRefresh();
                      } else {
                        const error = await response.json();
                        toast.error(`Erreur: ${error.message || 'Aucune commande trouvée'}`);
                      }
                    } catch (error) {
                      console.error('Error syncing clients:', error);
                      toast.error('Erreur lors de la synchronisation');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading || !storeId}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isLoading ? 'Synchronisation...' : 'Synchroniser depuis commandes'}
                </Button>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un client
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedClients.length === clients.length}
                  onChange={selectAllClients}
                  className="mr-3"
                />
                <span className="text-sm font-medium">
                  Sélectionner tout
                </span>
              </div>

              {clients.map((client) => (
                <div key={client._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors space-y-2 sm:space-y-0">
                  <div className="flex items-start space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client._id)}
                      onChange={() => toggleClientSelection(client._id)}
                      className="cursor-pointer mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                        <h4 className="font-semibold text-gray-900 truncate">{client.name}</h4>
                        {client.totalSpent > 0 && (
                          <Badge variant="secondary" className="text-xs">{client.totalSpent}$ dépensé</Badge>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 mt-1">
                        <p className="text-sm text-gray-600 flex items-center truncate">
                          <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </p>
                        {client.phone && (
                          <p className="text-sm text-gray-600 flex items-center truncate">
                            <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{client.phone}</span>
                          </p>
                        )}
                      </div>
                      {client.notes && (
                        <p className="text-sm text-gray-500 mt-1 truncate">{client.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingClient(client);
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteClientId(client._id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un Client</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau client à votre base de données
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="clientName">Nom *</Label>
              <Input
                id="clientName"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                placeholder="Nom complet"
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">Email *</Label>
              <Input
                id="clientEmail"
                type="email"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Téléphone</Label>
              <Input
                id="clientPhone"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="clientNotes">Notes</Label>
              <Textarea
                id="clientNotes"
                value={newClient.notes}
                onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                placeholder="Notes sur le client..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button onClick={addClient} disabled={isLoading}>
              {isLoading ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Client</DialogTitle>
            <DialogDescription>
              Modifiez les informations du client
            </DialogDescription>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editClientName">Nom *</Label>
                <Input
                  id="editClientName"
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editClientEmail">Email *</Label>
                <Input
                  id="editClientEmail"
                  type="email"
                  value={editingClient.email}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editClientPhone">Téléphone</Label>
                <Input
                  id="editClientPhone"
                  value={editingClient.phone || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editClientNotes">Notes</Label>
                <Textarea
                  id="editClientNotes"
                  value={editingClient.notes || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={updateClient} disabled={isLoading}>
              {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteClientId} onOpenChange={() => setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le client?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le client sera définitivement supprimé de votre base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClient(deleteClientId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Contacts Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importer des Contacts</DialogTitle>
            <DialogDescription>
              Importez vos contacts depuis votre iPhone, Outlook, Gmail ou un fichier CSV
            </DialogDescription>
          </DialogHeader>

          {importedContacts.length === 0 ? (
            <div className="space-y-6">
              {/* Import Methods */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* iPhone Contacts */}
                <div className="border rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                  <Smartphone className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold mb-2">iPhone Contacts</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Exportez vos contacts iPhone en format .vcf
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>1. Ouvrez l'app Contacts</p>
                    <p>2. Sélectionnez tous vos contacts</p>
                    <p>3. Partagez → Fichier .vcf</p>
                  </div>
                </div>

                {/* Outlook */}
                <div className="border rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                  <MailIcon className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <h3 className="font-semibold mb-2">Outlook</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Exportez vos contacts Outlook en CSV
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>1. Outlook → Fichier</p>
                    <p>2. Ouvrir et exporter</p>
                    <p>3. Exporter vers un fichier</p>
                  </div>
                </div>

                {/* Gmail */}
                <div className="border rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                  <MailIcon className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <h3 className="font-semibold mb-2">Gmail</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Exportez vos contacts Gmail
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>1. Google Contacts</p>
                    <p>2. Exporter → Google CSV</p>
                    <p>3. Télécharger le fichier</p>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Importer un fichier</h3>
                <p className="text-gray-600 mb-4">
                  Formats supportés: .vcf, .vcard, .csv
                </p>
                <input
                  type="file"
                  accept=".vcf,.vcard,.csv"
                  onChange={handleFileImport}
                  className="hidden"
                  id="file-import"
                />
                <label htmlFor="file-import">
                  <Button variant="outline" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Choisir un fichier
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {importedContacts.length} contact(s) trouvé(s)
                </h3>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={selectAllContacts}>
                    {selectedContacts.length === importedContacts.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setImportedContacts([]);
                    setSelectedContacts([]);
                  }}>
                    Nouveau fichier
                  </Button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                {importedContacts.map((contact, index) => (
                  <div key={index} className="flex items-center p-3 border-b hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(index)}
                      onChange={() => toggleContactSelection(index)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-gray-600">{contact.email}</p>
                          {contact.phone && (
                            <p className="text-sm text-gray-500">{contact.phone}</p>
                          )}
                        </div>
                        {contact.notes && (
                          <p className="text-sm text-gray-500 max-w-xs truncate">{contact.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-sm text-gray-600">
                  {selectedContacts.length} contact(s) sélectionné(s) sur {importedContacts.length}
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => {
                    setShowImportDialog(false);
                    setImportedContacts([]);
                    setSelectedContacts([]);
                  }}>
                    Annuler
                  </Button>
                  <Button
                    onClick={importSelectedContacts}
                    disabled={selectedContacts.length === 0 || isImporting}
                  >
                    {isImporting ? 'Importation...' : `Importer ${selectedContacts.length} contact(s)`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}



