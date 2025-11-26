import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Shield, User } from 'lucide-react';
import { toast } from 'react-toastify';

const InviteSupplierManagerModal = ({ isOpen, onClose, onInviteSent }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !role) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error('Format d\'email invalide');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/supplier/managers/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, role })
            });

            if (response.ok) {
                toast.success('Invitation envoyée avec succès');
                setEmail('');
                setRole('member');
                onClose();
                onInviteSent();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors de l\'envoi de l\'invitation');
            }
        } catch (error) {
            console.error('Error sending invitation:', error);
            toast.error('Erreur lors de l\'envoi de l\'invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setEmail('');
            setRole('member');
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        Inviter un gestionnaire
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="email">Email *</Label>
                        <div className="relative mt-1">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@exemple.com"
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="role">Rôle *</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">
                                    <div className="flex items-center">
                                        <Shield className="w-4 h-4 mr-2" />
                                        Administrateur
                                    </div>
                                </SelectItem>
                                <SelectItem value="member">
                                    <div className="flex items-center">
                                        <User className="w-4 h-4 mr-2" />
                                        Membre
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                            {role === 'admin'
                                ? 'Les administrateurs peuvent gérer les produits, campagnes et inviter d\'autres membres.'
                                : 'Les membres peuvent voir et gérer les campagnes mais ne peuvent pas inviter d\'autres personnes.'}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default InviteSupplierManagerModal;



