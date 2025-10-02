import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/router'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, CheckCircle, AlertCircle, Calendar, Building, User, Phone, Mail } from 'lucide-react'

export default function MultiStepInscriptionManagerForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    nomComplet: '',
    email: '',
    motDePasse: '',
    confirmationMotDePasse: '',
    telephone: '',

    // Step 2: School Info
    organisme: '',
    titreOuFonction: '',
    ville: '',
    codePostal: '',
    emailEcole: '',
    telephoneEcole: '',
    adresse: '',

    // Step 3: Campaign Info
    objectifFinancier: '',
    nombreParticipants: '',
    debutCampagne: '',
    finCampagne: '',
    dateDeLivraison: '',
    momentPourJoindre: ''
  })

  const steps = [
    { id: 1, title: 'Informations personnelles', icon: User },
    { id: 2, title: 'Informations école', icon: Building },
    { id: 3, title: 'Configuration campagne', icon: Calendar }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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
    if (currentStep < 3) {
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
      setErrorMessage('Un compte existe déjà avec cette adresse e-mail')
      setIsSubmitting(false)
      return
    }

    // Calculate 3 weeks in milliseconds
    const threeWeeksInMillis = 21 * 24 * 60 * 60 * 1000;
    const finCampagneDate = new Date(formData.finCampagne);
    const dateDeLivraisonDate = new Date(formData.dateDeLivraison);

    if (dateDeLivraisonDate.getTime() - finCampagneDate.getTime() < threeWeeksInMillis) {
      setErrorMessage("La date de livraison doit être au moins trois semaines après la fin de la campagne.")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/inscription-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/email-verification')
      } else {
        setErrorMessage(data.message || 'Erreur lors de l\'inscription')
      }
    } catch (error) {
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Informations personnelles</h2>
              <p className="text-gray-600">Commençons par vos informations de base</p>
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
              </div>

              <div>
                <Label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Informations de l'école</h2>
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
                <Label htmlFor="emailEcole" className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail de l'école
                </Label>
                <Input
                  type="email"
                  id="emailEcole"
                  name="emailEcole"
                  value={formData.emailEcole}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ecole@exemple.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="telephoneEcole" className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone de l'école
                </Label>
                <Input
                  type="tel"
                  id="telephoneEcole"
                  name="telephoneEcole"
                  value={formData.telephoneEcole}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(819) 123-4567"
                  required
                />
              </div>
            </div>
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Configuration de la campagne</h2>
              <p className="text-gray-600">Dernière étape ! Paramètres de votre campagne</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="objectifFinancier" className="block text-sm font-medium text-gray-700 mb-1">
                  Objectif financier
                </Label>
                <Input
                  type="number"
                  id="objectifFinancier"
                  name="objectifFinancier"
                  value={formData.objectifFinancier}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="50000"
                  required
                />
              </div>

              <div>
                <Label htmlFor="nombreParticipants" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de participants estimé
                </Label>
                <Input
                  type="number"
                  id="nombreParticipants"
                  name="nombreParticipants"
                  value={formData.nombreParticipants}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="200"
                  required
                />
              </div>

              <div>
                <Label htmlFor="debutCampagne" className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début de campagne
                </Label>
                <Input
                  type="date"
                  id="debutCampagne"
                  name="debutCampagne"
                  value={formData.debutCampagne}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="finCampagne" className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin de campagne
                </Label>
                <Input
                  type="date"
                  id="finCampagne"
                  name="finCampagne"
                  value={formData.finCampagne}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="dateDeLivraison" className="block text-sm font-medium text-gray-700 mb-1">
                  Date de livraison
                </Label>
                <Input
                  type="date"
                  id="dateDeLivraison"
                  name="dateDeLivraison"
                  value={formData.dateDeLivraison}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Doit être au moins 3 semaines après la fin de campagne
                </p>
              </div>

              <div>
                <Label htmlFor="momentPourJoindre" className="block text-sm font-medium text-gray-700 mb-1">
                  Meilleur moment pour vous joindre
                </Label>
                <Select value={formData.momentPourJoindre} onValueChange={(value) => setFormData(prev => ({ ...prev, momentPourJoindre: value }))}>
                  <SelectTrigger className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Sélectionnez un moment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matin">Matin (8h-12h)</SelectItem>
                    <SelectItem value="apres-midi">Après-midi (12h-17h)</SelectItem>
                    <SelectItem value="soir">Soir (17h-20h)</SelectItem>
                    <SelectItem value="weekend">Weekend</SelectItem>
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
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-center space-x-2 mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={step.id}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                    currentStep >= step.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              )
            })}
          </div>
          <p className="text-center text-sm text-gray-500">
            Étape {currentStep} sur {steps.length}: {steps[currentStep - 1].title}
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={currentStep === 3 ? handleSubmit : (e) => e.preventDefault()}>
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>
        </form>

        {/* Navigation */}
        <div className="mt-8 space-y-3">
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={nextStep}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium"
            >
              Continuer
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Inscription en cours...' : 'Finaliser l\'inscription'}
            </Button>
          )}

          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="w-full"
            >
              Retour
            </Button>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            Déjà inscrit ?{' '}
            <button
              onClick={() => router.push('/connexion')}
              className="text-blue-500 hover:text-blue-600"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}





