import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-toastify';

export default function AdminManagersManagement() {
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('admin');

    useEffect(() => {
        fetchManagers();
    }, []);

    const fetchManagers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/managers');
            if (response.ok) {
                const data = await response.json();
                setManagers(data.adminManagers);
            } else {
                toast.error('Erreur lors du chargement des gestionnaires');
            }
        } catch (error) {
            console.error('Error fetching managers:', error);
            toast.error('Erreur lors du chargement des gestionnaires');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail || !inviteRole) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        try {
            const response = await fetch('/api/admin/managers/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inviteEmail,
                    role: inviteRole
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Invitation envoyée avec succès');
                setShowInviteDialog(false);
                setInviteEmail('');
                setInviteRole('admin');
                fetchManagers();
            } else {
                toast.error(data.message || 'Erreur lors de l\'envoi de l\'invitation');
            }
        } catch (error) {
            console.error('Error inviting manager:', error);
            toast.error('Erreur lors de l\'envoi de l\'invitation');
        }
    };

    const handleRemove = async (userId) => {
        if (!confirm('Êtes-vous sûr de vouloir retirer ce gestionnaire ?')) return;

        try {
            const response = await fetch(`/api/admin/managers/${userId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Gestionnaire retiré avec succès');
                fetchManagers();
            } else {
                toast.error(data.message || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Error removing manager:', error);
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const response = await fetch(`/api/admin/managers/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Rôle mis à jour avec succès');
                fetchManagers();
            } else {
                toast.error(data.message || 'Erreur lors de la mise à jour');
            }
        } catch (error) {
            console.error('Error updating role:', error);
            toast.error('Erreur lors de la mise à jour');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Gestionnaires Admin</h2>
                <Button onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Inviter un gestionnaire
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Chargement...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {managers.map((manager) => (
                        <Card key={manager._id}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-semibold">
                                                {manager.user?.name || 'Utilisateur inconnu'}
                                            </h3>
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                {manager.role === 'owner' ? 'Propriétaire' :
                                                    manager.role === 'admin' ? 'Administrateur' : 'Membre'}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm mb-2">
                                            {manager.user?.email || 'Email non disponible'}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span>
                                                Invité par: {manager.invitedBy?.name || 'Inconnu'}
                                            </span>
                                            <span>
                                                Rejoint: {new Date(manager.joinedAt).toLocaleDateString('fr-CA')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <Select
                                            value={manager.role}
                                            onValueChange={(value) => handleRoleChange(manager.user._id, value)}
                                        >
                                            <SelectTrigger className="w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">Administrateur</SelectItem>
                                                <SelectItem value="member">Membre</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemove(manager.user._id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Invite Dialog */}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Inviter un gestionnaire admin</DialogTitle>
                        <DialogDescription>
                            Envoyez une invitation à un utilisateur pour qu'il devienne gestionnaire admin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Email *</label>
                            <Input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="email@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Rôle *</label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Administrateur</SelectItem>
                                    <SelectItem value="member">Membre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleInvite}>
                            Envoyer l'invitation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

