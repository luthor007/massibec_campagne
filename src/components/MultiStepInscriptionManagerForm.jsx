import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, CheckCircle, AlertCircle, Building, User, Phone, Mail } from 'lucide-react'

export default function MultiStepInscriptionManagerForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [formData, setFormData] = useState({
    // Step 1: Responsable de Campagne Info
    nomComplet: '',
    email: '',
    motDePasse: '',
    confirmationMotDePasse: '',
    telephone: '',
    cellulaire: '',

    // Step 2: School Info
    organisme: '',
    titreOuFonction: '',
    ville: '',
    codePostal: '',
    adresse: '',
    momentPourJoindre: '',
    logo: null // Add logo state
  })

  const [logoPreview, setLogoPreview] = useState(null)

  const steps = [
    { id: 1, title: 'Informations du Responsable de Campagne', icon: User },
    { id: 2, title: 'Informations de l\'École', icon: Building }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Veuillez sélectionner un fichier image valide')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Le fichier doit faire moins de 5MB')
        return
      }

      setFormData(prev => ({ ...prev, logo: file }))
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target.result)
      }
      reader.readAsDataURL(file)
      setErrorMessage('')
    }
  }

  // Email validation
  useEffect(() => {
    const checkEmail = async () => {
      if (formData.email && formData.email.includes('@')) {
        setIsCheckingEmail(true)
        try {
          const response = await fetch('/api/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email })
          })
          const data = await response.json()
          setEmailExists(data.exists)
        } catch (error) {
          console.error('Error checking email:', error)
        } finally {
          setIsCheckingEmail(false)
        }
      } else {
        setEmailExists(false)
      }
    }

    const timeoutId = setTimeout(checkEmail, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.email])

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    // Validation
    if (formData.motDePasse !== formData.confirmationMotDePasse) {
      setErrorMessage('Les mots de passe ne correspondent pas')
      setIsSubmitting(false)
      return
    }

    if (emailExists) {
      setErrorMessage('Cette adresse e-mail est déjà utilisée')
      setIsSubmitting(false)
      return
    }

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData()
      
      // Add all form fields except logo
      Object.keys(formData).forEach(key => {
        if (key !== 'logo' && formData[key] !== null) {
          formDataToSend.append(key, formData[key])
        }
      })
      
      // Add logo file if present
      if (formData.logo) {
        formDataToSend.append('logo', formData.logo)
      }

      const response = await fetch('/api/inscription-manager', {
        method: 'POST',
        body: formDataToSend, // Use FormData instead of JSON
      })

      if (response.ok) {
        const data = await response.json()
        // Store email in sessionStorage for email verification page
        sessionStorage.setItem('pendingVerificationEmail', formData.email);
        router.push('/email-verification')
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.message || 'Erreur lors de l\'inscription')
      }
    } catch (error) {
      console.error('Error:', error)
      setErrorMessage('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Informations du Responsable de Campagne</h2>
              <p className="text-gray-600">Vos informations personnelles</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="nomComplet" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </Label>
                <Input
                  type="text"
                  id="nomComplet"
                  name="nomComplet"
                  value={formData.nomComplet}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Votre nom complet"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse e-mail
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full py-3 px-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      emailExists ? 'border-red-300 bg-red-50' :
                      formData.email && !emailExists ? 'border-green-300 bg-green-50' :
                      'border-gray-300'
                    }`}
                    placeholder="votre@email.com"
                    required
                  />
                  {isCheckingEmail && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  {!isCheckingEmail && formData.email && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {emailExists ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  )}
                </div>
                {emailExists && (
                  <p className="text-sm text-red-500 mt-1">
                    Cette adresse e-mail est déjà utilisée
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone (pour le responsable de campagne)
                </Label>
                <Input
                  type="tel"
                  id="telephone"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(819) 123-4567"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cellulaire" className="block text-sm font-medium text-gray-700 mb-1">
                  Cellulaire (en cas d'urgence)
                </Label>
                <Input
                  type="tel"
                  id="cellulaire"
                  name="cellulaire"
                  value={formData.cellulaire}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(819) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="motDePasse" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </Label>
                <Input
                  type="password"
                  id="motDePasse"
                  name="motDePasse"
                  value={formData.motDePasse}
                  onChange={handleChange}
                  placeholder="Minimum 6 caractères"
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmationMotDePasse" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </Label>
                <Input
                  type="password"
                  id="confirmationMotDePasse"
                  name="confirmationMotDePasse"
                  value={formData.confirmationMotDePasse}
                  onChange={handleChange}
                  placeholder="Répétez votre mot de passe"
                  className={`w-full py-3 px-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formData.confirmationMotDePasse && formData.motDePasse !== formData.confirmationMotDePasse
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  required
                />
                {formData.confirmationMotDePasse && formData.motDePasse !== formData.confirmationMotDePasse && (
                  <p className="text-sm text-red-500 mt-1">
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>

              {/* Message de réassurance */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">
                      Pas de stress !
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Vous pourrez inviter d'autres membres de votre organisation plus tard. 
                      Pour l'instant, concentrez-vous sur vos informations personnelles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Informations de l'École</h2>
              <p className="text-gray-600">Détails sur votre établissement scolaire</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="organisme" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'école
                </Label>
                <Input
                  type="text"
                  id="organisme"
                  name="organisme"
                  value={formData.organisme}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nom de votre école"
                  required
                />
              </div>

              <div>
                <Label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-1">
                  Logo de l'école (optionnel)
                </Label>
                <div className="space-y-3">
                  <Input
                    type="file"
                    id="logo"
                    name="logo"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {logoPreview && (
                    <div className="flex items-center space-x-3">
                      <img 
                        src={logoPreview} 
                        alt="Aperçu du logo" 
                        className="w-16 h-16 object-contain border border-gray-300 rounded-lg"
                      />
                      <span className="text-sm text-gray-600">Aperçu du logo</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Formats acceptés: JPG, PNG, GIF. Taille maximale: 5MB
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="titreOuFonction" className="block text-sm font-medium text-gray-700 mb-1">
                  Votre titre/fonction
                </Label>
                <Input
                  type="text"
                  id="titreOuFonction"
                  name="titreOuFonction"
                  value={formData.titreOuFonction}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Directeur, Enseignant, etc."
                  required
                />
              </div>

              <div>
                <Label htmlFor="adresse" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse de l'école
                </Label>
                <Input
                  type="text"
                  id="adresse"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123 rue de l'école"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ville" className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </Label>
                  <Input
                    type="text"
                    id="ville"
                    name="ville"
                    value={formData.ville}
                    onChange={handleChange}
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ville"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="codePostal" className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal
                  </Label>
                  <Input
                    type="text"
                    id="codePostal"
                    name="codePostal"
                    value={formData.codePostal}
                    onChange={handleChange}
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="G8Z 1A1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="momentPourJoindre" className="block text-sm font-medium text-gray-700 mb-1">
                  Meilleur moment pour vous joindre
                </Label>
                <Select
                  value={formData.momentPourJoindre}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, momentPourJoindre: value }))}
                >
                  <SelectTrigger className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Sélectionnez un moment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matin">Matin (8h-12h)</SelectItem>
                    <SelectItem value="apres-midi">Après-midi (12h-17h)</SelectItem>
                    <SelectItem value="soir">Soir (17h-20h)</SelectItem>
                    <SelectItem value="weekend">Weekend</SelectItem>
                    <SelectItem value="nimporte">N'importe quand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-white">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inscription Gestionnaire</h1>
          <p className="text-gray-600">Créez votre compte pour gérer les campagnes de financement</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 text-gray-400'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <div className="ml-3 text-left">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={(e) => e.preventDefault()} className="bg-white rounded-lg shadow-lg p-8">
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2"
            >
              Précédent
            </Button>

            {currentStep < 2 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? 'Inscription...' : 'Terminer l\'inscription'}
              </Button>
            )}
          </div>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Déjà un compte ?{' '}
            <Link href="/connexion" className="text-blue-600 hover:text-blue-700 font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
