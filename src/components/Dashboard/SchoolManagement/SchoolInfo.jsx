'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const SchoolInfo = ({ school }) => {
  const { toast } = useToast();
  const [currentSchool, setCurrentSchool] = useState(school);
  const [isSaving, setIsSaving] = useState(false);

  // Update currentSchool when school prop changes
  useEffect(() => {
    setCurrentSchool(school);
  }, [school]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formData = new FormData(e.target);
      const updatedData = {
        name: formData.get('name'),
        email: formData.get('email'),
        telephone: formData.get('telephone'),
        address: formData.get('address'),
        accumba: formData.get('accumba'),
        expNum: formData.get('expNum'),
        isBonus: formData.get('isBonus') === 'on'
      };

      const response = await fetch(`/api/schools/${school._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      const updatedSchool = await response.json();
      setCurrentSchool(updatedSchool);

      toast({
        title: "Succès",
        description: "Informations de l'école mises à jour avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour des informations",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentSchool) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Informations de l'école</h3>
        
        {/* Display Mode */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div>
            <h4 className="font-semibold">Informations de base</h4>
            <p><strong>Nom:</strong> {currentSchool.name}</p>
            <p><strong>Courriel:</strong> {currentSchool.email}</p>
            <p><strong>Téléphone:</strong> {currentSchool.telephone}</p>
            <p><strong>Adresse:</strong> {currentSchool.address}</p>
          </div>

          <div>
            <h4 className="font-semibold">Informations EDI</h4>
            <p><strong>Numéro Accumba:</strong> {currentSchool.accumba || 'Non défini'}</p>
            <p><strong>Numéro Exp:</strong> {currentSchool.expNum || 'Non défini'}</p>
            <p><strong>Système de bonus:</strong> {currentSchool.isBonus ? 'Activé' : 'Désactivé'}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Modifier les informations</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom de l'école</Label>
              <Input
                type="text"
                id="name"
                name="name"
                defaultValue={currentSchool.name}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Courriel</Label>
              <Input
                type="email"
                id="email"
                name="email"
                defaultValue={currentSchool.email}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                type="tel"
                id="telephone"
                name="telephone"
                defaultValue={currentSchool.telephone}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={currentSchool.address}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="accumba">Numéro Accumba</Label>
              <Input
                type="text"
                id="accumba"
                name="accumba"
                defaultValue={currentSchool.accumba}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="expNum">Numéro Exp</Label>
              <Input
                type="text"
                id="expNum"
                name="expNum"
                defaultValue={currentSchool.expNum}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isBonus"
              name="isBonus"
              defaultChecked={currentSchool.isBonus}
            />
            <Label htmlFor="isBonus">Système de bonus activé</Label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchoolInfo;