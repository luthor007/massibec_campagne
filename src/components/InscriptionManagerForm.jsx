import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from 'next/router';
import { motion } from 'framer-motion'

import { LogIn, Percent, DollarSign, Info, Upload, Image } from 'lucide-react'

export default function InscriptionManagerForm() {
  const [isHovered, setIsHovered] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [formData, setFormData] = useState({
    nomComplet: '',
    email: '',
    motDePasse: '',
    titreOuFonction: '',
    momentPourJoindre: '',
    organisme: '',
    ville: '',
    objectifFinancier: '',
    codePostal: '',
    nombreParticipants: '',
    telephone: '',
    debutCampagne: '',
    finCampagne: '',
    dateDeLivraison: '',
    adresse: '',
    emailEcole: '', // Email for the school
    telephoneEcole: '', // Telephone for the school
    preferredPaymentMethod: '', // Moyen de paiement préféré
    deliveryInstructions: '', // Instructions pour le livreur
    // Profit split configuration
    profitSplitType: 'percentage',
    studentBenefit: '85.6',
    organizationBenefit: '9.4',
    raffleBenefit: '5.0'
  });

  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Calculate 3 weeks in milliseconds
    const threeWeeksInMillis = 21 * 24 * 60 * 60 * 1000;

    // Convert finCampagne and dateDeLivraison to Date objects
    const finCampagneDate = new Date(formData.finCampagne);
    const dateDeLivraisonDate = new Date(formData.dateDeLivraison);

    // Check if dateDeLivraison is at least 3 weeks after finCampagne
    if (dateDeLivraisonDate.getTime() - finCampagneDate.getTime() < threeWeeksInMillis) {
      toast.error("La date de livraison doit être au moins trois semaines après la fin de la campagne.");
      return; // Stop form submission
    }

    try {
      const formDataToSend = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      // Add logo file if selected
      if (logoFile) {
        formDataToSend.append('logo', logoFile);
      }

      const response = await fetch('/api/inscription-manager', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        // Store email in sessionStorage for email verification page
        sessionStorage.setItem('pendingVerificationEmail', formData.email);
        router.push('/email-verification')
      } else {
        throw new Error('Erreur lors de l\'inscription');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue lors de l\'inscription');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Button onClick={() => router.push('/connexion')} className="w-full mt-4 bg-blue-300">
        Déjà inscrit? Connection
      </Button>
      <div className="space-y-2">
        <Label htmlFor="nomComplet">Nom complet</Label>
        <Input
          type="text"
          id="nomComplet"
          name="nomComplet"
          value={formData.nomComplet}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="motDePasse">Mot de passe</Label>
        <Input
          type="password"
          id="motDePasse"
          name="motDePasse"
          value={formData.motDePasse}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="titreOuFonction">Titre ou fonction</Label>
        <Input
          type="text"
          id="titreOuFonction"
          name="titreOuFonction"
          value={formData.titreOuFonction}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="organisme">Nom de l&apos;école</Label>
        <Input
          type="text"
          id="organisme"
          name="organisme"
          value={formData.organisme}
          onChange={handleChange}
          required
        />
      </div>
      
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
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                <Image className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="logo" className="text-sm font-medium">
                Sélectionner un logo (optionnel)
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
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ville">Ville</Label>
        <Input
          type="text"
          id="ville"
          name="ville"
          value={formData.ville}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="objectifFinancier">Objectif financier</Label>
        <Input
          type="number"
          id="objectifFinancier"
          name="objectifFinancier"
          value={formData.objectifFinancier}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="objectifFinancier"># Participants</Label>
        <Input
          type="number"
          id="nombreParticipants"
          name="nombreParticipants"
          value={formData.nombreParticipants}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adresse">Adresse de l&apos;école</Label>
        <Input
          type="text"
          id="adresse"
          name="adresse"
          value={formData.adresse}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="telephoneEcole">Téléphone de l&apos;école</Label>
        <Input
          type="text"
          id="telephoneEcole"
          name="telephoneEcole"
          value={formData.telephoneEcole}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailEcole">Email de l&apos;école</Label>
        <Input
          type="email"
          id="emailEcole"
          name="emailEcole"
          value={formData.emailEcole}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="preferredPaymentMethod">Moyen de paiement préféré</Label>
        <Select 
          value={formData.preferredPaymentMethod} 
          onValueChange={(value) => setFormData({ ...formData, preferredPaymentMethod: value })}
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
      <div className="space-y-2">
        <Label htmlFor="debutCampagne">Début de la campagne</Label>
        <Input
          type="date"
          id="debutCampagne"
          name="debutCampagne"
          value={formData.debutCampagne}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="finCampagne">Fin de la campagne</Label>
        <Input
          type="date"
          id="finCampagne"
          name="finCampagne"
          value={formData.finCampagne}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="finCampagne">Date de livraison des produits à l'école</Label>
        <Input
          type="date"
          id="dateDeLivraison"
          name="dateDeLivraison"
          value={formData.dateDeLivraison}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="deliveryInstructions">Instructions pour le livreur</Label>
        <textarea
          id="deliveryInstructions"
          name="deliveryInstructions"
          value={formData.deliveryInstructions}
          onChange={handleChange}
          placeholder="Ex: Entrée par le stationnement arrière, sonner à la porte principale, livrer entre 8h et 16h..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
        <p className="text-sm text-gray-500">
          Ces instructions seront visibles par les livreurs lors de la livraison des commandes.
        </p>
      </div>

      {/* Configuration de la répartition des profits */}
      <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
        <div className="flex items-center space-x-2 mb-4">
          <Percent className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">Configuration des profits</h3>
          <div className="group relative">
            <Info className="h-4 w-4 text-blue-500 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
              Ces paramètres peuvent être modifiés plus tard dans votre tableau de bord
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="profitSplitType" className="text-sm font-medium text-gray-700">
              Type de répartition
            </Label>
            <Select 
              value={formData.profitSplitType} 
              onValueChange={(value) => setFormData({ ...formData, profitSplitType: value })}
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
              <Label htmlFor="studentBenefit" className="text-sm font-medium text-gray-700">
                Bénéfice étudiant (%)
              </Label>
              <Input
                type="number"
                id="studentBenefit"
                name="studentBenefit"
                value={formData.studentBenefit}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.1"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="organizationBenefit" className="text-sm font-medium text-gray-700">
                Bénéfice organisation (%)
              </Label>
              <Input
                type="number"
                id="organizationBenefit"
                name="organizationBenefit"
                value={formData.organizationBenefit}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.1"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="raffleBenefit" className="text-sm font-medium text-gray-700">
                Bénéfice tirage (%)
              </Label>
              <Input
                type="number"
                id="raffleBenefit"
                name="raffleBenefit"
                value={formData.raffleBenefit}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.1"
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Total:</strong> {(parseFloat(formData.studentBenefit) + parseFloat(formData.organizationBenefit) + parseFloat(formData.raffleBenefit)).toFixed(1)}%
              {Math.abs((parseFloat(formData.studentBenefit) + parseFloat(formData.organizationBenefit) + parseFloat(formData.raffleBenefit)) - 100) > 0.1 && (
                <span className="text-red-600 ml-2">⚠️ Les pourcentages doivent totaliser 100%</span>
              )}
            </p>
          </div>
        </div>
      </div>
      {/* Bouton de Soumission */}
      <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className='pb-4'
>
      <Button
        variant="default"
        size="lg"
        type="submit"
        className={`
          relative overflow-hidden transition-all duration-300 ease-out
          transform hover:scale-105 hover:shadow-lg
          bg-gradient-to-r from-blue-500 to-indigo-600
          text-white font-semibold py-3 px-12 rounded-full
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.span
          className="relative z-10 flex items-center space-x-2"
          animate={{ x: isHovered ? 5 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <LogIn className="w-5 h-5" />
          <span>S'inscrire</span>
        </motion.span>
        <motion.div
          className="absolute inset-0 bg-white"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: isHovered ? 1.5 : 0, opacity: isHovered ? 0.15 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ borderRadius: '100%', zIndex: 0 }}
        />
      </Button>
    </motion.div>
    </form>
  );
}