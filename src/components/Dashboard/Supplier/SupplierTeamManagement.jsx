import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, UserPlus, MoreVertical, Trash2, Shield, Crown, User } from 'lucide-react';
import { toast } from 'react-toastify';
import InviteSupplierManagerModal from './InviteSupplierManagerModal';

const SupplierTeamManagement = () => {
    const [managers, setManagers] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);

    useEffect(() => {
        fetchManagers();
    }, []);

    const fetchManagers = async () => {
        try {
            const response = await fetch('/api/supplier/managers');
            if (response.ok) {
                const data = await response.json();
                setManagers(data.managers || []);
                setCurrentUserRole(data.currentUserRole);
            } else {
                const error = await response.json();
                console.error('Error fetching managers:', error);
                toast.error('Erreur lors du chargement des gestionnaires');
            }
        } catch (error) {
            console.error('Error fetching managers:', error);
            toast.error('Erreur lors du chargement des gestionnaires');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveManager = async (managerId, managerName) => {
        try {
            const response = await fetch(`/api/supplier/managers/${managerId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success(`${managerName} a été supprimé de l'équipe`);
                fetchManagers();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Error removing manager:', error);
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleChangeRole = async (managerId, newRole, managerName) => {
        try {
            const response = await fetch(`/api/supplier/managers/${managerId}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                toast.success(`Rôle de ${managerName} modifié avec succès`);
                fetchManagers();
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Erreur lors de la modification du rôle' }));
                toast.error(errorData.message || 'Erreur lors de la modification du rôle');
            }
        } catch (error) {
            console.error('Error changing role:', error);
            toast.error('Erreur lors de la modification du rôle');
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'owner':
                return <Crown className="h-4 w-4" />;
            case 'admin':
                return <Shield className="h-4 w-4" />;
            case 'member':
                return <User className="h-4 w-4" />;
            default:
                return <User className="h-4 w-4" />;
        }
    };

    const getRoleBadgeVariant = (role) => {
        switch (role) {
            case 'owner':
                return 'default';
            case 'admin':
                return 'secondary';
            case 'member':
                return 'outline';
            default:
                return 'outline';
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'owner':
                return 'Propriétaire';
            case 'admin':
                return 'Administrateur';
            case 'member':
                return 'Membre';
            default:
                return role;
        }
    };

    const canInvite = currentUserRole && ['owner', 'admin'].includes(currentUserRole);
    const canRemove = currentUserRole === 'owner';
    const canChangeRoles = currentUserRole === 'owner';

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Gestion de l'équipe
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Chargement...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center">
                            <Users className="h-5 w-5 mr-2" />
                            Gestion de l'équipe
                        </CardTitle>
                        {canInvite && (
                            <Button onClick={() => setShowInviteModal(true)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Inviter un gestionnaire
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {managers.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Aucun gestionnaire trouvé
                            </h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                Vous êtes actuellement le seul gestionnaire de cette organisation.
                                Invitez d'autres personnes pour vous aider à gérer les campagnes.
                            </p>
                            {canInvite && (
                                <Button onClick={() => setShowInviteModal(true)} size="lg">
                                    <UserPlus className="h-5 w-5 mr-2" />
                                    Inviter votre premier gestionnaire
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead>Rejoint le</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {managers.map((manager) => (
                                    <TableRow key={manager.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center">
                                                {manager.name}
                                                {manager.isCurrentUser && (
                                                    <Badge variant="outline" className="ml-2 text-xs">
                                                        Vous
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{manager.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={getRoleBadgeVariant(manager.role)} className="flex items-center w-fit">
                                                {getRoleIcon(manager.role)}
                                                <span className="ml-1">{getRoleLabel(manager.role)}</span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(manager.joinedAt).toLocaleDateString('fr-FR')}
                                        </TableCell>
                                        <TableCell>
                                            {(canChangeRoles || (canRemove && !manager.isCurrentUser)) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-white">
                                                        {canChangeRoles && (
                                                            <>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleChangeRole(manager.userId, 'admin', manager.name)}
                                                                    disabled={manager.role === 'admin'}
                                                                >
                                                                    <Shield className="h-4 w-4 mr-2" />
                                                                    Promouvoir Administrateur
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleChangeRole(manager.userId, 'member', manager.name)}
                                                                    disabled={manager.role === 'member'}
                                                                >
                                                                    <User className="h-4 w-4 mr-2" />
                                                                    Rétrograder Membre
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleChangeRole(manager.userId, 'owner', manager.name)}
                                                                    disabled={manager.role === 'owner'}
                                                                >
                                                                    <Crown className="h-4 w-4 mr-2" />
                                                                    Promouvoir Propriétaire
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        {canRemove && !manager.isCurrentUser && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                                        Supprimer
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Supprimer le gestionnaire</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Êtes-vous sûr de vouloir supprimer {manager.name} de l'équipe ?
                                                                            Cette action est irréversible.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleRemoveManager(manager.userId, manager.name)}
                                                                            className="bg-red-600 hover:bg-red-700"
                                                                        >
                                                                            Supprimer
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <InviteSupplierManagerModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onInviteSent={() => {
                    fetchManagers();
                    // Trigger settings completion check if needed
                    if (typeof window !== 'undefined' && window.checkSettingsCompletion) {
                        window.checkSettingsCompletion();
                    }
                }}
            />
        </>
    );
};

export default SupplierTeamManagement;


