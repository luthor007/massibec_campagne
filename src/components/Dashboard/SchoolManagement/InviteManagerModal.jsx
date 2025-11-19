import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Shield, User } from 'lucide-react';
import { toast } from 'react-toastify';

const InviteManagerModal = ({ isOpen, onClose, schoolId, onInviteSent }) => {
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
      const response = await fetch(`/api/schools/${schoolId}/managers/invite`, {
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Inviter un gestionnaire
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Adresse email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.com"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Rôle
            </Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Administrateur
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Membre
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Administrateur :</strong> Peut gérer les campagnes, inviter d'autres gestionnaires et voir tous les rapports.
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>Membre :</strong> Peut gérer les participants et voir les rapports de base.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
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

export default InviteManagerModal;



