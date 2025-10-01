import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/router'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Mail, User, Home, CheckCircle, AlertCircle } from 'lucide-react'

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
    province: '',
    codePostal: '',
    telephone: ''
  })

  const [school, setSchool] = useState(null)

  const steps = [
    { id: 1, title: 'Informations de base', icon: User },
    { id: 2, title: 'École & Objectif', icon: Home },
    { id: 3, title: 'Informations parent', icon: User }
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
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Créer votre compte</h2>
              <p className="text-gray-600">Commençons par vos informations de base</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Adresse e-mail *
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`pr-10 ${emailExists ? 'border-red-500' : formData.email && !emailExists ? 'border-green-500' : ''}`}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    type="text"
                    id="prenom"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    placeholder="Votre prénom"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    type="text"
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    placeholder="Votre nom"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motDePasse">Mot de passe *</Label>
                <Input
                  type="password"
                  id="motDePasse"
                  name="motDePasse"
                  value={formData.motDePasse}
                  onChange={handleChange}
                  placeholder="Minimum 6 caractères"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmationMotDePasse">Confirmer le mot de passe *</Label>
                <Input
                  type="password"
                  id="confirmationMotDePasse"
                  name="confirmationMotDePasse"
                  value={formData.confirmationMotDePasse}
                  onChange={handleChange}
                  placeholder="Répétez votre mot de passe"
                  required
                />
                {formData.confirmationMotDePasse && formData.motDePasse !== formData.confirmationMotDePasse && (
                  <p className="text-sm text-red-500">Les mots de passe ne correspondent pas</p>
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
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Votre école</h2>
              <p className="text-gray-600">Indiquez votre école et votre objectif personnel</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolCode">Code d'identification de l'école *</Label>
                <Input
                  type="text"
                  id="schoolCode"
                  name="schoolCode"
                  value={formData.schoolCode}
                  onChange={handleChange}
                  placeholder="Entrez le code fourni par votre école"
                  required
                />
                {school && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      <strong>École trouvée:</strong> {school.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectifPersonnel">Objectif personnel de vente *</Label>
                <Select value={formData.objectifPersonnel} onValueChange={(value) => setFormData(prev => ({ ...prev, objectifPersonnel: value }))}>
                  <SelectTrigger>
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
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Informations parent</h2>
              <p className="text-gray-600">Dernière étape ! Informations du parent responsable</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenomParent">Prénom du parent *</Label>
                  <Input
                    type="text"
                    id="prenomParent"
                    name="prenomParent"
                    value={formData.prenomParent}
                    onChange={handleChange}
                    placeholder="Prénom du parent"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomParent">Nom du parent *</Label>
                  <Input
                    type="text"
                    id="nomParent"
                    name="nomParent"
                    value={formData.nomParent}
                    onChange={handleChange}
                    placeholder="Nom du parent"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse *</Label>
                <Input
                  type="text"
                  id="adresse"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  placeholder="Numéro et nom de rue"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="app">Appartement</Label>
                  <Input
                    type="text"
                    id="app"
                    name="app"
                    value={formData.app}
                    onChange={handleChange}
                    placeholder="Apt, suite, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville *</Label>
                  <Input
                    type="text"
                    id="ville"
                    name="ville"
                    value={formData.ville}
                    onChange={handleChange}
                    placeholder="Ville"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province *</Label>
                  <Select value={formData.province} onValueChange={(value) => setFormData(prev => ({ ...prev, province: value }))}>
                    <SelectTrigger>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codePostal">Code postal *</Label>
                  <Input
                    type="text"
                    id="codePostal"
                    name="codePostal"
                    value={formData.codePostal}
                    onChange={handleChange}
                    placeholder="A1A 1A1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone *</Label>
                  <Input
                    type="tel"
                    id="telephone"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
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
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                  ${isActive ? 'bg-blue-500 text-white' : 
                    isCompleted ? 'bg-green-500 text-white' : 
                    'bg-gray-200 text-gray-500'}
                `}>
                  {isCompleted ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-blue-500' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6"
        >
          <p className="text-sm">{errorMessage}</p>
        </motion.div>
      )}

      {/* Form Content */}
      <form onSubmit={currentStep === 3 ? handleSubmit : (e) => e.preventDefault()}>
        <AnimatePresence mode="wait">
          {renderStepContent()}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>

          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Inscription en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Finaliser l'inscription
                </>
              )}
            </Button>
          )}
        </div>
      </form>

      {/* Login Link */}
      <div className="text-center mt-6">
        <p className="text-gray-600">
          Déjà inscrit ?{' '}
          <button
            onClick={() => router.push('/connexion')}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  )
}
