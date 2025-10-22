import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Building, 
  User, 
  CheckCircle, 
  ArrowRight,
  Target,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';

const OnboardingWizard = ({ isOpen, onClose, user, school, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    // School Info - don't pre-fill placeholders
    organisme: (school?.name && !school.name.includes('à compléter')) ? school.name : '',
    adresse: (school?.address && !school.address.includes('à compléter')) ? school.address : '',
    ville: (school?.ville && !school.ville.includes('à compléter')) ? school.ville : '',
    codePostal: (school?.codePostal && !school.codePostal.includes('à compléter')) ? school.codePostal : '',
    
    // Manager Info - don't pre-fill placeholders
    titreOuFonction: (user?.schoolManagerInfo?.titreOuFonction && !user.schoolManagerInfo.titreOuFonction.includes('à compléter')) ? user.schoolManagerInfo.titreOuFonction : '',
    telephone: (user?.schoolManagerInfo?.telephone && !user.schoolManagerInfo.telephone.includes('à compléter')) ? user.schoolManagerInfo.telephone : '',
    cellulaire: (user?.schoolManagerInfo?.cellulaire && !user.schoolManagerInfo.cellulaire.includes('à compléter')) ? user.schoolManagerInfo.cellulaire : '',
    momentPourJoindre: user?.schoolManagerInfo?.momentPourJoindre || ''
  });

  const steps = [
    { id: 1, title: 'Informations de l\'École', icon: Building, fields: ['organisme', 'adresse', 'ville', 'codePostal'] },
    { id: 2, title: 'Vos Coordonnées', icon: User, fields: ['titreOuFonction', 'telephone', 'cellulaire', 'momentPourJoindre'] }
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getCompletionPercentage = () => {
    const totalFields = Object.keys(formData).length;
    const completedFields = Object.values(formData).filter(value => value && value !== '').length;
    return Math.round((completedFields / totalFields) * 100);
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      // Mark profile as partially completed
      await fetch('/api/update-profile-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profileCompleted: false,
          completionPercentage: getCompletionPercentage()
        })
      });
      
      toast.success('Profil sauvegardé. Vous pouvez le compléter plus tard.');
      onComplete();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-2 border-gray-200">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Complétez votre profil
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Quelques informations supplémentaires pour personnaliser votre expérience
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Étape {currentStep} sur {steps.length}
              </span>
              <span className="text-sm text-gray-500">
                {getCompletionPercentage()}% complété
              </span>
            </div>
            <Progress value={(currentStep / steps.length) * 100} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Building className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Informations de l'École
                  </h3>
                  <p className="text-gray-600">
                    Dites-nous en plus sur votre établissement scolaire
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="organisme" className="text-sm font-medium text-gray-700">
                      Nom de l'école *
                    </Label>
                    <Input
                      id="organisme"
                      value={formData.organisme}
                      onChange={(e) => handleChange('organisme', e.target.value)}
                      placeholder="Ex: École primaire Saint-Joseph"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="adresse" className="text-sm font-medium text-gray-700">
                      Adresse *
                    </Label>
                    <Input
                      id="adresse"
                      value={formData.adresse}
                      onChange={(e) => handleChange('adresse', e.target.value)}
                      placeholder="Ex: 123 rue de l'École"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ville" className="text-sm font-medium text-gray-700">
                      Ville *
                    </Label>
                    <Input
                      id="ville"
                      value={formData.ville}
                      onChange={(e) => handleChange('ville', e.target.value)}
                      placeholder="Ex: Montréal"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="codePostal" className="text-sm font-medium text-gray-700">
                      Code postal *
                    </Label>
                    <Input
                      id="codePostal"
                      value={formData.codePostal}
                      onChange={(e) => handleChange('codePostal', e.target.value)}
                      placeholder="Ex: H1A 1A1"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Vos Coordonnées
                  </h3>
                  <p className="text-gray-600">
                    Comment pouvons-nous vous joindre ?
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="titreOuFonction" className="text-sm font-medium text-gray-700">
                      Votre titre/fonction *
                    </Label>
                    <Input
                      id="titreOuFonction"
                      value={formData.titreOuFonction}
                      onChange={(e) => handleChange('titreOuFonction', e.target.value)}
                      placeholder="Ex: Directeur, Enseignant"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telephone" className="text-sm font-medium text-gray-700">
                      Téléphone *
                    </Label>
                    <Input
                      id="telephone"
                      value={formData.telephone}
                      onChange={(e) => handleChange('telephone', e.target.value)}
                      placeholder="Ex: (514) 123-4567"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cellulaire" className="text-sm font-medium text-gray-700">
                      Cellulaire *
                    </Label>
                    <Input
                      id="cellulaire"
                      value={formData.cellulaire}
                      onChange={(e) => handleChange('cellulaire', e.target.value)}
                      placeholder="Ex: (514) 123-4567"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="momentPourJoindre" className="text-sm font-medium text-gray-700">
                      Meilleur moment pour vous joindre *
                    </Label>
                    <Select
                      value={formData.momentPourJoindre}
                      onValueChange={(value) => handleChange('momentPourJoindre', value)}
                    >
                      <SelectTrigger className="mt-1">
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
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <div className="flex space-x-3">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex items-center space-x-2"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  <span>Précédent</span>
                </Button>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isSaving}
                className="text-gray-600"
              >
                {isSaving ? 'Sauvegarde...' : 'Plus tard'}
              </Button>

              {currentStep < steps.length ? (
                <Button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
                >
                  <span>Suivant</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
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