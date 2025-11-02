import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Save, MapPin, Phone, Mail, Building, AlertCircle, User, CreditCard, Upload, Image, X } from 'lucide-react';
import { toast } from 'react-toastify';
import PersonalSettings from './PersonalSettings';

const SchoolSettings = ({ school, onUpdate }) => {
  const [schoolFormData, setSchoolFormData] = useState({
    name: '',
    address: '',
    ville: '',
    codePostal: '',
    telephone: '',
    email: '',
    preferredPaymentMethod: '',
    deliveryInstructions: '',
    distributionLocation: ''
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);

  useEffect(() => {
    if (school) {
      console.log('School data received:', school);
      console.log('Preferred payment method:', school.preferredPaymentMethod);
      console.log('School logoUrl:', school.logoUrl);
      setSchoolFormData({
        name: school.name || '',
        address: school.address || '',
        ville: school.ville || '',
        codePostal: school.codePostal || '',
        telephone: school.telephone || '',
        email: school.email || '',
        preferredPaymentMethod: school.preferredPaymentMethod || '',
        deliveryInstructions: school.deliveryInstructions || '',
        distributionLocation: school.distributionLocation || ''
      });
      
      // Update logo preview from school data
      // Use school data as source of truth for persisted logos
      console.log('Current logoPreview state:', logoPreview);
      console.log('School logoUrl from API:', school.logoUrl);
      
      if (school.logoUrl) {
        console.log('Setting logo preview from school data:', school.logoUrl);
        setLogoPreview(school.logoUrl);
      } else if (logoPreview && !logoPreview.startsWith('data:') && logoPreview !== '') {
        // If school has no logo and preview is not a file selection or empty, clear it
        console.log('Clearing logo preview - no logo in school data');
        setLogoPreview('');
      }
      // If logoPreview starts with 'data:', it's a file selection, keep it
    }
  }, [school]);

  const handleSchoolInputChange = (field, value) => {
    setSchoolFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 5MB');
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Auto-upload the logo immediately
      handleUploadLogoInternal(file);
    }
  };

  const handleRemoveLogo = async () => {
    if (!school?.id) {
      toast.error('Aucune école sélectionnée');
      return;
    }

    setRemovingLogo(true);
    try {
      const response = await fetch(`/api/schools/${school.id}/remove-logo`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Logo supprimé avec succès');
        setLogoFile(null);
        setLogoPreview('');
        onUpdate && onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setRemovingLogo(false);
    }
  };

  // Internal function to handle logo upload (can be called with a file parameter)
  const handleUploadLogoInternal = async (fileToUpload = null) => {
    const file = fileToUpload || logoFile;
    console.log('handleUploadLogoInternal called, file:', file, 'school.id:', school?.id);
    if (!file || !school?.id) {
      console.log('Missing file or school.id, skipping upload');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('schoolId', school.id);
      
      console.log('Sending logo upload request to /api/schools/upload-logo');

      const response = await fetch('/api/schools/upload-logo', {
        method: 'POST',
        body: formData
      });
      
      console.log('Logo upload response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Logo upload response:', result);
        
        toast.success('Logo uploadé avec succès');
        
        // Clear logo file
        setLogoFile(null);
        
        // Update logo preview with the new logo URL
        if (result.logoUrl) {
          console.log('Setting logo preview to:', result.logoUrl);
          setLogoPreview(result.logoUrl);
        }
        
        // Also update from the school object if provided
        if (result.school?.logoUrl) {
          console.log('Setting logo from school object:', result.school.logoUrl);
          setLogoPreview(result.school.logoUrl);
        }
        
        // Refresh school data from parent after a short delay to ensure DB has updated
        setTimeout(() => {
          onUpdate && onUpdate();
        }, 500);
      } else {
        const error = await response.json();
        console.error('Logo upload failed:', error);
        toast.error(error.message || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Public function for manual upload button (if needed)
  const handleUploadLogo = () => {
    handleUploadLogoInternal();
  };

  const handleSaveSchool = async () => {
    if (!school?.id) {
      toast.error('Aucune école sélectionnée');
      return;
    }

    console.log('Saving school data:', schoolFormData);
    console.log('Preferred payment method being saved:', schoolFormData.preferredPaymentMethod);

    setSaving(true);
    try {
      const response = await fetch(`/api/schools/${school.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(schoolFormData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Save response:', result);
        
        // Update local state with the saved data to reflect the changes
        if (result.school) {
          setSchoolFormData(prev => ({
            ...prev,
            ...result.school
          }));
          
          // Update logo preview if it exists
          if (result.school.logoUrl) {
            setLogoPreview(result.school.logoUrl);
          }
        }
        
        toast.success('Paramètres de l\'école sauvegardés avec succès');
        onUpdate && onUpdate();
      } else {
        const error = await response.json();
        console.error('Save error:', error);
        toast.error(error.message || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving school settings:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const canEditSchool = school?.canEditSchoolSettings !== false;

  if (!school) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Paramètres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Chargement des paramètres...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Paramètres personnels */}
      <PersonalSettings currentUser={school?.currentUser} onUpdate={onUpdate} />

      {/* Paramètres de l'école */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Paramètres de l'école
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!canEditSchool && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Vous n'avez pas les permissions pour modifier les paramètres de l'école.
              </AlertDescription>
            </Alert>
          )}

          {/* Logo Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Image className="h-5 w-5 mr-2" />
              Logo de l'école
            </h3>
            
            <div className="flex items-start space-x-6">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo de l'école"
                      className="w-24 h-24 object-contain border border-gray-200 rounded-lg bg-gray-50"
                    />
                    {canEditSchool && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={handleRemoveLogo}
                        disabled={removingLogo}
                      >
                        {removingLogo ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Image className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              {canEditSchool && (
                <div className="flex-1 space-y-3">
                  <div>
                    <Label htmlFor="logo" className="text-sm font-medium">
                      Sélectionner un logo
                    </Label>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Formats acceptés: JPG, PNG, GIF. Taille max: 5MB
                    </p>
                  </div>
                  
                  {logoFile && (
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleUploadLogo}
                        disabled={uploadingLogo}
                        size="sm"
                        className="flex items-center"
                      >
                        {uploadingLogo ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Upload...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Uploader le logo
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRemoveLogo}
                        size="sm"
                      >
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informations générales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Informations générales
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l'école *</Label>
                <Input
                  id="name"
                  value={schoolFormData.name}
                  onChange={(e) => handleSchoolInputChange('name', e.target.value)}
                  disabled={!canEditSchool}
                  placeholder="Nom de l'école"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse pour la livraison *</Label>
                <Input
                  id="address"
                  value={schoolFormData.address}
                  onChange={(e) => handleSchoolInputChange('address', e.target.value)}
                  disabled={!canEditSchool}
                  placeholder="123 rue de l'école"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville *</Label>
                  <Input
                    id="ville"
                    value={schoolFormData.ville}
                    onChange={(e) => handleSchoolInputChange('ville', e.target.value)}
                    disabled={!canEditSchool}
                    placeholder="Montréal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codePostal">Code postal *</Label>
                  <Input
                    id="codePostal"
                    value={schoolFormData.codePostal}
                    onChange={(e) => handleSchoolInputChange('codePostal', e.target.value)}
                    disabled={!canEditSchool}
                    placeholder="H1A 1A1"
                  />
                </div>
              </div>
            </div>

            {/* Contact et paiement */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Contact et paiement
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone de l'école</Label>
                <Input
                  id="telephone"
                  value={schoolFormData.telephone}
                  onChange={(e) => handleSchoolInputChange('telephone', e.target.value)}
                  disabled={!canEditSchool}
                  placeholder="(514) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email de l'école</Label>
                <Input
                  id="email"
                  type="email"
                  value={schoolFormData.email}
                  onChange={(e) => handleSchoolInputChange('email', e.target.value)}
                  disabled={!canEditSchool}
                  placeholder="ecole@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredPaymentMethod" className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Moyen de paiement préféré
                </Label>
                <Select 
                  value={schoolFormData.preferredPaymentMethod} 
                  onValueChange={(value) => handleSchoolInputChange('preferredPaymentMethod', value)}
                  disabled={!canEditSchool}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un moyen de paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="virement">Virement bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Instructions de livraison */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Instructions de livraison
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="deliveryInstructions">
                Instructions pour le livreur
              </Label>
              <Textarea
                id="deliveryInstructions"
                value={schoolFormData.deliveryInstructions}
                onChange={(e) => handleSchoolInputChange('deliveryInstructions', e.target.value)}
                disabled={!canEditSchool}
                placeholder="Ex: Entrée par le stationnement arrière, sonner à la porte principale, livrer entre 8h et 16h..."
                rows={4}
              />
              <p className="text-sm text-gray-500">
                Ces instructions seront visibles par les livreurs lors de la livraison des commandes.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="distributionLocation">
                Endroit précis pour la distribution
              </Label>
              <Input
                id="distributionLocation"
                value={schoolFormData.distributionLocation}
                onChange={(e) => handleSchoolInputChange('distributionLocation', e.target.value)}
                disabled={!canEditSchool}
                placeholder="Ex: gymnase du secondaire, cafétéria, salle 101..."
              />
              <p className="text-sm text-gray-500">
                Cet endroit sera indiqué dans la lettre aux parents pour la distribution des produits.
              </p>
            </div>
          </div>

          {canEditSchool && (
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveSchool} 
                disabled={saving}
                className="min-w-[120px]"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolSettings;
