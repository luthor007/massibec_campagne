import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Building, 
  User, 
  CheckCircle, 
  ArrowRight,
  Target,
  X,
  Upload,
  Image as ImageIcon,
  Info
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getTerminology } from '@/utils/organizationHelpers';

const OnboardingWizard = ({ isOpen, onClose, user, school, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [formData, setFormData] = useState({
    // Organization Type (required)
    organizationType: school?.organizationType || 'school',
    
    // School Info - don't pre-fill placeholders
    organisme: (school?.name && !school.name.includes('à compléter') && !school.name.includes('À compléter')) ? school.name : '',
    adresse: (school?.address && !school.address.includes('à compléter') && !school.address.includes('À compléter')) ? school.address : '',
    ville: (school?.ville && !school.ville.includes('à compléter') && !school.ville.includes('À compléter')) ? school.ville : '',
    codePostal: (school?.codePostal && !school.codePostal.includes('à compléter') && !school.codePostal.includes('À compléter')) ? school.codePostal : '',
    emailEcole: (school?.email && !school.email.includes('à compléter') && !school.email.includes('À compléter')) ? school.email : '',
    telephoneEcole: (school?.telephone && !school.telephone.includes('à compléter') && !school.telephone.includes('À compléter')) ? school.telephone : '',
    numberOfStudents: school?.numberOfStudents || '',
    deliveryInstructions: (school?.deliveryInstructions && !school.deliveryInstructions.includes('à compléter') && !school.deliveryInstructions.includes('À compléter')) ? school.deliveryInstructions : '',
    distributionLocation: (school?.distributionLocation && !school.distributionLocation.includes('à compléter') && !school.distributionLocation.includes('À compléter')) ? school.distributionLocation : '',
    
    // Manager Info - don't pre-fill placeholders
    titreOuFonction: (user?.schoolManagerInfo?.titreOuFonction && !user.schoolManagerInfo.titreOuFonction.includes('à compléter') && !user.schoolManagerInfo.titreOuFonction.includes('À compléter')) ? user.schoolManagerInfo.titreOuFonction : '',
    telephone: (user?.schoolManagerInfo?.telephone && !user.schoolManagerInfo.telephone.includes('à compléter') && !user.schoolManagerInfo.telephone.includes('À compléter')) ? user.schoolManagerInfo.telephone : '',
    cellulaire: (user?.schoolManagerInfo?.cellulaire && !user.schoolManagerInfo.cellulaire.includes('à compléter') && !user.schoolManagerInfo.cellulaire.includes('À compléter')) ? user.schoolManagerInfo.cellulaire : '',
    momentPourJoindre: user?.schoolManagerInfo?.momentPourJoindre || ''
  });

  const steps = [
    { id: 1, title: 'Informations de l\'École', icon: Building, fields: ['organisme', 'adresse', 'ville', 'codePostal', 'emailEcole', 'telephoneEcole'] },
    { id: 2, title: 'Vos Coordonnées', icon: User, fields: ['titreOuFonction', 'telephone', 'cellulaire', 'momentPourJoindre'] }
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getCompletionPercentage = () => {
    // Calculate percentage based on steps completed, not individual fields
    // Each step is worth 50% (1/2 steps)
    let percentage = 0;
    
    // Step 1 is 50% if completed
    if (isStepComplete(1)) {
      percentage += 50;
    } else {
      // If step 1 is not complete, calculate progress within step 1
      const step1RequiredFields = ['organizationType', 'organisme', 'adresse', 'ville', 'codePostal'];
      const step1Completed = step1RequiredFields.filter(field => formData[field] && formData[field] !== '').length;
      percentage += Math.round((step1Completed / step1RequiredFields.length) * 50);
    }
    
    // Step 2 is 50% if completed
    if (isStepComplete(2)) {
      percentage += 50;
    } else if (currentStep === 2) {
      // If on step 2 but not complete, calculate progress within step 2
      const step2RequiredFields = ['titreOuFonction', 'telephone', 'momentPourJoindre'];
      const step2Completed = step2RequiredFields.filter(field => formData[field] && formData[field] !== '').length;
      percentage += Math.round((step2Completed / step2RequiredFields.length) * 50);
    }
    
    return percentage;
  };

  const isStepComplete = (stepNumber) => {
    if (stepNumber === 1) {
      // Étape 1: Organization type and basic info (required)
      return formData.organizationType && formData.organisme && formData.adresse && formData.ville && formData.codePostal;
    } else if (stepNumber === 2) {
      // Étape 2: Coordonnées (titre, téléphone et moment requis, cellulaire optionnel)
      return formData.titreOuFonction && formData.telephone && formData.momentPourJoindre;
    }
    return false;
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
    }
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const canCloseModal = () => {
    // Permettre la fermeture seulement si au moins une étape est complète
    return isStepComplete(1) || isStepComplete(2);
  };

  const handleNext = () => {
    if (currentStep < steps.length && isStepComplete(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else if (!isStepComplete(currentStep)) {
      toast.warning('Veuillez compléter tous les champs requis avant de continuer.');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      // Prepare form data with logo if provided
      const submitData = { ...formData };
      
      // Convert logo file to base64 if provided
      if (logoFile) {
        const reader = new FileReader();
        const base64Logo = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
        submitData.logoFile = base64Logo;
      }
      
      const response = await fetch('/api/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        toast.success('Profil complété avec succès !');
        onComplete();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Get terminology based on organization type
  const terminology = getTerminology(formData.organizationType);

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      // Empêcher toute fermeture du modal
      if (!canCloseModal()) {
        toast.warning('Veuillez compléter au moins une étape avant de fermer le profil.');
        return;
      }
      onClose();
    }}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 shadow-2xl border-0 p-0">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-t-lg">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-bold text-white mb-2">
                Complétez votre profil
              </DialogTitle>
              <DialogDescription className="text-blue-100 text-lg">
                Quelques informations supplémentaires pour personnaliser votre expérience
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">
                Étape {currentStep} sur {steps.length}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-blue-600">
                  {getCompletionPercentage()}% complété
                </span>
                {isStepComplete(currentStep) && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Étape complète</span>
                  </div>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ease-out ${
                  isStepComplete(currentStep) 
                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Building className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Informations de {terminology.organization === 'école' ? "l'École" : "l'Organisation"}
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Dites-nous en plus sur votre {terminology.organization}
                  </p>
                </div>

                {/* Organization Type Selector (Required) */}
                <div className="mb-6">
                  <Label htmlFor="organizationType" className={`text-sm font-semibold mb-2 block flex items-center ${formData.organizationType ? 'text-green-700' : 'text-gray-700'}`}>
                    Type d'organisation *
                    {formData.organizationType && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                  </Label>
                  <Select
                    value={formData.organizationType}
                    onValueChange={(value) => handleChange('organizationType', value)}
                  >
                    <SelectTrigger className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                      formData.organizationType 
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                    }`}>
                      <SelectValue placeholder="Sélectionnez un type d'organisation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school">École</SelectItem>
                      <SelectItem value="sport_team">Équipe sportive</SelectItem>
                      <SelectItem value="community_org">Organisation communautaire</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Required Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="organisme" className={`text-sm font-semibold mb-2 block flex items-center ${formData.organisme ? 'text-green-700' : 'text-gray-700'}`}>
                      Nom de {terminology.organization === 'école' ? "l'école" : "l'organisation"} *
                      {formData.organisme && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                    </Label>
                    <Input
                      id="organisme"
                      value={formData.organisme}
                      onChange={(e) => handleChange('organisme', e.target.value)}
                      placeholder={`Ex: ${formData.organizationType === 'school' ? 'École primaire Saint-Joseph' : 'Équipe de soccer les Étoiles'}`}
                      className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                        formData.organisme 
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="adresse" className={`text-sm font-semibold mb-2 block flex items-center ${formData.adresse ? 'text-green-700' : 'text-gray-700'}`}>
                      Adresse de livraison et distribution *
                      {formData.adresse && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                    </Label>
                    <Input
                      id="adresse"
                      value={formData.adresse}
                      onChange={(e) => handleChange('adresse', e.target.value)}
                      placeholder="Ex: 123 rue de l'École"
                      className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                        formData.adresse 
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ville" className={`text-sm font-semibold mb-2 block flex items-center ${formData.ville ? 'text-green-700' : 'text-gray-700'}`}>
                      Ville *
                      {formData.ville && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                    </Label>
                    <Input
                      id="ville"
                      value={formData.ville}
                      onChange={(e) => handleChange('ville', e.target.value)}
                      placeholder="Ex: Montréal"
                      className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                        formData.ville 
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="codePostal" className={`text-sm font-semibold mb-2 block flex items-center ${formData.codePostal ? 'text-green-700' : 'text-gray-700'}`}>
                      Code postal *
                      {formData.codePostal && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                    </Label>
                    <Input
                      id="codePostal"
                      value={formData.codePostal}
                      onChange={(e) => handleChange('codePostal', e.target.value)}
                      placeholder="Ex: H1A 1A1"
                      className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                        formData.codePostal 
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Optional Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="emailEcole" className={`text-sm font-semibold mb-2 block flex items-center ${formData.emailEcole ? 'text-green-700' : 'text-gray-700'}`}>
                      Email de {terminology.organization === 'école' ? "l'école" : "l'organisation"} (optionnel)
                      {formData.emailEcole && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                    </Label>
                    <Input
                      id="emailEcole"
                      type="email"
                      value={formData.emailEcole}
                      onChange={(e) => handleChange('emailEcole', e.target.value)}
                      placeholder="Ex: contact@ecole.com"
                      className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                        formData.emailEcole 
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="telephoneEcole" className={`text-sm font-semibold mb-2 block flex items-center ${formData.telephoneEcole ? 'text-green-700' : 'text-gray-700'}`}>
                      Téléphone de {terminology.organization === 'école' ? "l'école" : "l'organisation"} (optionnel)
                      {formData.telephoneEcole && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                    </Label>
                    <Input
                      id="telephoneEcole"
                      value={formData.telephoneEcole}
                      onChange={(e) => handleChange('telephoneEcole', e.target.value)}
                      placeholder="Ex: (514) 123-4567"
                      className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                        formData.telephoneEcole 
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Optional Organization Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="numberOfStudents" className={`text-sm font-semibold mb-2 block flex items-center ${formData.numberOfStudents ? 'text-green-700' : 'text-gray-700'}`}>
                      Nombre de {terminology.participants} (optionnel)
                      {formData.numberOfStudents && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                    </Label>
                    <Input
                      id="numberOfStudents"
                      type="number"
                      min="0"
                      value={formData.numberOfStudents}
                      onChange={(e) => handleChange('numberOfStudents', e.target.value)}
                      placeholder={`Ex: 250 ${terminology.participants}`}
                      className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                        formData.numberOfStudents 
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="logo" className="text-sm font-semibold mb-2 block text-gray-700">
                      Logo (optionnel)
                    </Label>
                    <div className="space-y-2">
                      {logoPreview ? (
                        <div className="relative">
                          <img src={logoPreview} alt="Logo preview" className="h-24 w-24 object-contain border-2 border-gray-200 rounded-lg" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleLogoRemove}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label htmlFor="logo" className="cursor-pointer">
                          <div className="h-24 w-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 transition-colors">
                            <Upload className="h-6 w-6 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">Cliquez pour téléverser un logo</span>
                            <span className="text-xs text-gray-400 mt-1">JPG, PNG ou WebP (max 5MB)</span>
                          </div>
                          <input
                            id="logo"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                        </label>
                      )}
                      <p className="text-xs text-gray-500">Vous pouvez ajouter un logo plus tard dans les paramètres</p>
                    </div>
                  </div>
                </div>

                {/* Optional Delivery Information */}
                <div className="space-y-4 border-t pt-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      Les champs marqués comme optionnels peuvent être complétés plus tard dans les paramètres de votre {terminology.organization}.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="deliveryInstructions" className="text-sm font-semibold mb-2 block text-gray-700">
                      Instructions de livraison (optionnel)
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Ces instructions seront visibles par les livreurs lors de la livraison des commandes. Vous pouvez compléter ces informations plus tard.
                    </p>
                    <Textarea
                      id="deliveryInstructions"
                      value={formData.deliveryInstructions}
                      onChange={(e) => handleChange('deliveryInstructions', e.target.value)}
                      placeholder="Ex: Livrer à l'entrée principale, sonner à la porte"
                      rows={3}
                      className="border-2 border-gray-200 rounded-xl focus:ring-2 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="distributionLocation" className="text-sm font-semibold mb-2 block text-gray-700">
                      Endroit précis pour la distribution (optionnel)
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Cet endroit sera indiqué dans la lettre aux parents pour la distribution des produits. Ex: entrepôt. Vous pouvez compléter cette information plus tard.
                    </p>
                    <Input
                      id="distributionLocation"
                      value={formData.distributionLocation}
                      onChange={(e) => handleChange('distributionLocation', e.target.value)}
                      placeholder="Ex: Entrepôt, gymnase, salle principale"
                      className="h-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <User className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Vos Coordonnées
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Comment pouvons-nous vous joindre ?
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="titreOuFonction" className={`text-sm font-semibold mb-2 block flex items-center ${formData.titreOuFonction ? 'text-green-700' : 'text-gray-700'}`}>
                      Votre titre/fonction *
                      {formData.titreOuFonction && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                    </Label>
                    <Input
                      id="titreOuFonction"
                      value={formData.titreOuFonction}
                      onChange={(e) => handleChange('titreOuFonction', e.target.value)}
                      placeholder="Ex: Directeur, Enseignant"
                      className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                        formData.titreOuFonction 
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                          : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
                      }`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="telephone" className={`text-sm font-semibold mb-2 block flex items-center ${formData.telephone ? 'text-green-700' : 'text-gray-700'}`}>
                      Téléphone *
                      {formData.telephone && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                    </Label>
                    <Input
                      id="telephone"
                      value={formData.telephone}
                      onChange={(e) => handleChange('telephone', e.target.value)}
                      placeholder="Ex: (514) 123-4567"
                      className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                        formData.telephone 
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                          : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
                      }`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cellulaire" className={`text-sm font-semibold mb-2 block flex items-center ${formData.cellulaire ? 'text-green-700' : 'text-gray-700'}`}>
                      Cellulaire (optionnel)
                      {formData.cellulaire && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                    </Label>
                    <Input
                      id="cellulaire"
                      value={formData.cellulaire}
                      onChange={(e) => handleChange('cellulaire', e.target.value)}
                      placeholder="Ex: (514) 123-4567"
                      className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                        formData.cellulaire 
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                          : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
                      }`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="momentPourJoindre" className={`text-sm font-semibold mb-2 block flex items-center ${formData.momentPourJoindre ? 'text-green-700' : 'text-gray-700'}`}>
                      Meilleur moment pour vous joindre *
                      {formData.momentPourJoindre && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                    </Label>
                    <Select
                      value={formData.momentPourJoindre}
                      onValueChange={(value) => handleChange('momentPourJoindre', value)}
                    >
                      <SelectTrigger className={`h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${
                        formData.momentPourJoindre 
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200' 
                          : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
                      }`}>
                        <SelectValue placeholder="Sélectionnez un moment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="matin">Matin (9h-12h)</SelectItem>
                        <SelectItem value="apres-midi">Après-midi (13h-17h)</SelectItem>
                        <SelectItem value="soir">Soir (17h-20h)</SelectItem>
                        <SelectItem value="tout-moment">Tout moment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8">
            <div className="flex space-x-3">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex items-center space-x-2 h-12 px-6 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  <span className="font-semibold">Précédent</span>
                </Button>
              )}
            </div>

            <div className="flex space-x-3">
              {currentStep < steps.length ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepComplete(currentStep)}
                  className={`h-12 px-8 text-white rounded-xl shadow-lg transition-all duration-200 font-semibold flex items-center space-x-2 ${
                    isStepComplete(currentStep)
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>Suivant</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={isSaving || !isStepComplete(currentStep)}
                  className={`h-12 px-8 text-white rounded-xl shadow-lg transition-all duration-200 font-semibold flex items-center space-x-2 ${
                    isStepComplete(currentStep) && !isSaving
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:shadow-xl'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSaving ? 'Finalisation...' : 'Terminer'}
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;