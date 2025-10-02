import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/router'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'

export default function MultiStepInscriptionForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  
  const [formData, setFormData] = useState({
    // Step 1: Email & Basic Info
    email: '',
    prenom: '',
    nom: '',
    motDePasse: '',
    confirmationMotDePasse: '',
    
    // Step 2: School Info
    schoolCode: '',
    objectifPersonnel: '',
    
    // Step 3: Parent Info
    nomParent: '',
    prenomParent: '',
    adresse: '',
    app: '',
    ville: '',
    province: 'QC',
    codePostal: '',
    telephone: ''
  })

  const [school, setSchool] = useState(null)

  const steps = [
    { id: 1, title: 'Informations de base' },
    { id: 2, title: 'École & Objectif' },
    { id: 3, title: 'Informations parent' }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error message when user starts typing
    if (errorMessage) {
      setErrorMessage('')
    }
  }

  // Check if email exists
  const checkEmailExists = async (email) => {
    if (!email || !email.includes('@')) return
    
    setIsCheckingEmail(true)
    try {
      const response = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await response.json()
      setEmailExists(data.exists)
      
      if (data.exists) {
        setErrorMessage('Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter ou utiliser une autre adresse.')
      }
    } catch (error) {
      console.error('Error checking email:', error)
    } finally {
      setIsCheckingEmail(false)
    }
  }

  // Debounced email check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email) {
        checkEmailExists(formData.email)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [formData.email])

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.email || !formData.prenom || !formData.nom || !formData.motDePasse || !formData.confirmationMotDePasse) {
          setErrorMessage('Veuillez remplir tous les champs obligatoires')
          return false
        }
        if (formData.motDePasse !== formData.confirmationMotDePasse) {
          setErrorMessage('Les mots de passe ne correspondent pas')
          return false
        }
        if (emailExists) {
          setErrorMessage('Cette adresse e-mail est déjà utilisée')
          return false
        }
        return true
        
      case 2:
        if (!formData.schoolCode || !formData.objectifPersonnel) {
          setErrorMessage('Veuillez remplir tous les champs obligatoires')
          return false
        }
        if (!school) {
          setErrorMessage('Code d\'école invalide')
          return false
        }
        return true
        
      case 3:
        if (!formData.nomParent || !formData.prenomParent || !formData.adresse || !formData.ville || !formData.province || !formData.codePostal || !formData.telephone) {
          setErrorMessage('Veuillez remplir tous les champs obligatoires')
          return false
        }
        return true
        
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setErrorMessage('')
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setErrorMessage('')
  }

  // Fetch school data
  useEffect(() => {
    const fetchSchool = async () => {
      if (formData.schoolCode) {
        try {
          const response = await fetch(`/api/school-from-code?code=${formData.schoolCode}`)
          if (response.ok) {
            const schoolData = await response.json()
            setSchool(schoolData)
          } else {
            setSchool(null)
          }
        } catch (error) {
          console.error('Error fetching school:', error)
          setSchool(null)
        }
      }
    }

    fetchSchool()
  }, [formData.schoolCode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateStep(3)) return
    
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.prenom} ${formData.nom}`,
          email: formData.email,
          password: formData.motDePasse,
          schoolId: school._id,
          objectifPersonnel: parseInt(formData.objectifPersonnel),
          parentInfo: {
            nomParent: formData.nomParent,
            prenomParent: formData.prenomParent,
            adresse: formData.adresse,
            app: formData.app,
            ville: formData.ville,
            province: formData.province,
            codePostal: formData.codePostal,
            telephone: formData.telephone,
          }
        }),
      })

      if (response.ok) {
        router.push('/email-verification')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur lors de l\'inscription')
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage(error.message || 'Une erreur est survenue lors de l\'inscription')
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Créer votre compte</h2>
              <p className="text-gray-600">Commençons par vos informations de base</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse e-mail du parent(pour réception transfert interact et communication)
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom de l'élève
                  </Label>
                  <Input
                    type="text"
                    id="prenom"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    placeholder="Votre prénom"
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'élève
                  </Label>
                  <Input
                    type="text"
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    placeholder="Votre nom"
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Votre école</h2>
              <p className="text-gray-600">Indiquez votre école et votre objectif personnel</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="schoolCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Code d'identification de l'école
                </Label>
                <Input
                  type="text"
                  id="schoolCode"
                  name="schoolCode"
                  value={formData.schoolCode}
                  onChange={handleChange}
                  placeholder="Entrez le code fourni par votre école"
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {school && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      <strong>École trouvée:</strong> {school.name}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="objectifPersonnel" className="block text-sm font-medium text-gray-700 mb-1">
                  Objectif personnel de vente
                </Label>
                <Select value={formData.objectifPersonnel} onValueChange={(value) => setFormData(prev => ({ ...prev, objectifPersonnel: value }))}>
                  <SelectTrigger className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Sélectionnez votre objectif" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 produits</SelectItem>
                    <SelectItem value="15">15 produits</SelectItem>
                    <SelectItem value="20">20 produits</SelectItem>
                    <SelectItem value="25">25 produits</SelectItem>
                    <SelectItem value="30">30 produits</SelectItem>
                    <SelectItem value="35">35 produits</SelectItem>
                    <SelectItem value="40">40 produits</SelectItem>
                    <SelectItem value="45">45 produits</SelectItem>
                    <SelectItem value="50">50 produits</SelectItem>
                    <SelectItem value="60">60 produits</SelectItem>
                    <SelectItem value="70">70 produits</SelectItem>
                    <SelectItem value="80">80 produits</SelectItem>
                    <SelectItem value="90">90 produits</SelectItem>
                    <SelectItem value="100">100 produits</SelectItem>
                  </SelectContent>
                </Select>
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Informations parent</h2>
              <p className="text-gray-600">Dernière étape ! Informations du parent responsable</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prenomParent" className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom du parent
                  </Label>
                  <Input
                    type="text"
                    id="prenomParent"
                    name="prenomParent"
                    value={formData.prenomParent}
                    onChange={handleChange}
                    placeholder="Prénom du parent"
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nomParent" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du parent
                  </Label>
                  <Input
                    type="text"
                    id="nomParent"
                    name="nomParent"
                    value={formData.nomParent}
                    onChange={handleChange}
                    placeholder="Nom du parent"
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="adresse" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </Label>
                <Input
                  type="text"
                  id="adresse"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  placeholder="Numéro et nom de rue"
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="app" className="block text-sm font-medium text-gray-700 mb-1">
                    Appartement
                  </Label>
                  <Input
                    type="text"
                    id="app"
                    name="app"
                    value={formData.app}
                    onChange={handleChange}
                    placeholder="Apt, suite, etc."
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
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
                    placeholder="Ville"
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                    Province
                  </Label>
                  <Select value={formData.province} onValueChange={(value) => setFormData(prev => ({ ...prev, province: value }))}>
                    <SelectTrigger className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <SelectValue placeholder="Province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QC">Québec</SelectItem>
                      <SelectItem value="ON">Ontario</SelectItem>
                      <SelectItem value="BC">Colombie-Britannique</SelectItem>
                      <SelectItem value="AB">Alberta</SelectItem>
                      <SelectItem value="MB">Manitoba</SelectItem>
                      <SelectItem value="SK">Saskatchewan</SelectItem>
                      <SelectItem value="NS">Nouvelle-Écosse</SelectItem>
                      <SelectItem value="NB">Nouveau-Brunswick</SelectItem>
                      <SelectItem value="NL">Terre-Neuve-et-Labrador</SelectItem>
                      <SelectItem value="PE">Île-du-Prince-Édouard</SelectItem>
                      <SelectItem value="YT">Yukon</SelectItem>
                      <SelectItem value="NT">Territoires du Nord-Ouest</SelectItem>
                      <SelectItem value="NU">Nunavut</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="A1A 1A1"
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
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
                    placeholder="(555) 123-4567"
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
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
        {/* Simple Progress */}
        <div className="mb-8">
          <div className="flex justify-center space-x-2 mb-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentStep >= step.id ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-500">
            Étape {currentStep} sur {steps.length}
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

        {/* Simple Navigation */}
        <div className="mt-8">
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
