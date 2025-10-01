// pages/inscription.jsx

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/router'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import BankGuides from '@/components/BankGuides';
import { motion } from 'framer-motion'

import { LogIn } from 'lucide-react'

export default function InscriptionForm() {
  const [isHovered, setIsHovered] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    confirmationMotDePasse: '', // Ajouté ici
    ecole: '',
    objectifPersonnel: '', // Changed to string for user input
    nomParent: '',
    prenomParent: '',
    adresse: '',
    app: '',
    ville: '',
    province: '',
    codePostal: '',
    telephone: '',
    schoolCode: '', // Added here for school code input

  })
  
  const [approvedSchools, setApprovedSchools] = useState([])
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [errorSchools, setErrorSchools] = useState(null)

  const router = useRouter()

  useEffect(() => {
    const fetchApprovedSchools = async () => {
      try {
        const response = await fetch('/api/schools')
        if (response.ok) {
          const data = await response.json()
          setApprovedSchools(data)
        } else {
          throw new Error('Erreur lors de la récupération des écoles approuvées')
        }
      } catch (error) {
        setErrorSchools(error.message)
      } finally {
        setLoadingSchools(false)
      }
    }

    fetchApprovedSchools()
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSchoolChange = (value) => {
    setFormData({ ...formData, ecole: value })
  }

  const verifySchoolCode = async (code) => {
    try {
      const response = await fetch(`/api/school-from-code?code=${code}`);
      if (response.ok) {
        const school = await response.json();
        return school;
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la vérification du code:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.motDePasse !== formData.confirmationMotDePasse) {
      return alert("Les mots de passe ne correspondent pas.");
    }

    if (!formData.schoolCode) {
      return alert("Veuillez entrer le code de l'école.");
    }

    const school = await verifySchoolCode(formData.schoolCode);
    if (!school) {
      return alert("Le code d'identification de l'école n'est pas valide");
    }

    const schoolId = school._id;

    if (formData.objectifPersonnel === "" || !formData.prenom || !formData.nom || !formData.nomParent || !formData.prenomParent || !formData.adresse || !formData.ville || !formData.telephone) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires");
      setIsSubmitting(false);
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/inscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${formData.prenom} ${formData.nom}`,
          email: formData.email,
          password: formData.motDePasse,
          schoolId: schoolId,
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
      });

      if (response.ok) {
        alert('Inscription réussie!');
        router.push('/email-verification');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'inscription');
      }
    } catch (error) {
      console.error('Erreur:', error);
      // Show a more user-friendly error message instead of alert
      const errorMsg = error.message || 'Une erreur est survenue lors de l\'inscription';
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}
      
      {/* Prénom */}
      <Button onClick={() => router.push('/connexion')} className="w-full mt-4 bg-blue-300">
        Déjà inscrit? Connection
      </Button>
      <div className="space-y-2">
        <Label htmlFor="prenom">Prénom</Label>
        <Input
          type="text"
          id="prenom"
          name="prenom"
          value={formData.prenom}
          onChange={handleChange}
          required
        />
      </div>
      
      {/* Nom */}
      <div className="space-y-2">
        <Label htmlFor="nom">Nom</Label>
        <Input
          type="text"
          id="nom"
          name="nom"
          value={formData.nom}
          onChange={handleChange}
          required
        />
      </div>
      
      
      {/* Mot de Passe 
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
      
      {/* Confirmation Mot de Passe 
      <div className="space-y-2">
        <Label htmlFor="confirmationMotDePasse">Confirmez le mot de passe</Label>
        <Input
          type="password"
          id="confirmationMotDePasse"
          name="confirmationMotDePasse"
          value={formData.confirmationMotDePasse}
          onChange={handleChange}
          required
        />
      </div>

      */}
      
      {/* Sélection de l'École Approuvée 
      <div className="space-y-2">
        <Label htmlFor="ecole">École</Label>
        {loadingSchools ? (
          <p>Chargement des écoles...</p>
        ) : errorSchools ? (
          <p className="text-red-500">Erreur: {errorSchools}</p>
        ) : (
          <Select value={formData.ecole} onValueChange={handleSchoolChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez une école" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {//<SelectItem value="">Sélectionnez une école</SelectItem>
}
              {approvedSchools.map((school) => (
                <SelectItem key={school._id} value={school._id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      */}
      
      {/* School Code Input */}
      <div className="space-y-2">
        <Label htmlFor="schoolCode">Code de l&apos;école</Label>
        <Input
          type="text"
          id="schoolCode"
          name="schoolCode"
          value={formData.schoolCode}
          onChange={handleChange}
          required
        />
        {//error && <p className="text-red-500">{error}</p>
        }
      </div>
      {/* Objectif Personnel */}
      <div className="space-y-2">
        <Label htmlFor="objectifPersonnel">Objectif personnel (en $)</Label>
        <select
          id="objectifPersonnel"
          name="objectifPersonnel"
          value={formData.objectifPersonnel}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-300 focus:outline-none"
        >
          <option value="" disabled selected>
            Sélectionner un objectif
          </option>
          {Array.from({ length: 30 }, (_, i) => (
            <option key={i} value={(i + 1) * 36}>
              {(i + 1) * 32}$
            </option>
          ))}
        </select>
      </div>

      {/* Coordonnées du Parent */}
      <h3 className="font-bold">Coordonnées du parent responsable de la campagne</h3>
      
      {/* Prénom du Parent */}
      <div className="space-y-2">
        <Label htmlFor="prenomParent">Prénom du parent</Label>
        <Input
          type="text"
          id="prenomParent"
          name="prenomParent"
          value={formData.prenomParent}
          onChange={handleChange}
          required
        />
      </div>
      
      {/* Nom du Parent */}
      <div className="space-y-2">
        <Label htmlFor="nomParent">Nom du parent</Label>
        <Input
          type="text"
          id="nomParent"
          name="nomParent"
          value={formData.nomParent}
          onChange={handleChange}
          required
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email (pour réception transfert interact et communication)</Label>
        <Input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      
      {/* Adresse */}
      <div className="space-y-2">
        <Label htmlFor="adresse">Adresse</Label>
        <Input
          type="text"
          id="adresse"
          name="adresse"
          value={formData.adresse}
          onChange={handleChange}
          required
        />
      </div>
      
      {/* Appartment (Optionnel) */}
      <div className="space-y-2">
        <Label htmlFor="app">App. (Optionnel)</Label>
        <Input
          type="text"
          id="app"
          name="app"
          value={formData.app}
          onChange={handleChange}
        />
      </div>
      
      {/* Ville */}
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
      
      {/* Province */}
      <div className="space-y-2">
        <Label htmlFor="province">Province</Label>
        <Input
          type="text"
          id="province"
          name="province"
          value={formData.province}
          onChange={handleChange}
          required
        />
      </div>
      
      {/* Code Postal */}
      <div className="space-y-2">
        <Label htmlFor="codePostal">Code Postal</Label>
        <Input
          type="text"
          id="codePostal"
          name="codePostal"
          value={formData.codePostal}
          onChange={handleChange}
          required
        />
      </div>
      
      {/* Téléphone */}
      <div className="space-y-2">
        <Label htmlFor="telephone">Téléphone</Label>
        <Input
          type="text"
          id="telephone"
          name="telephone"
          value={formData.telephone}
          onChange={handleChange}
          required
        />
      </div>


      {/* Mot de Passe */}
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
      
      {/* Confirmation Mot de Passe */}
      <div className="space-y-2">
        <Label htmlFor="confirmationMotDePasse">Confirmez le mot de passe</Label>
        <Input
          type="password"
          id="confirmationMotDePasse"
          name="confirmationMotDePasse"
          value={formData.confirmationMotDePasse}
          onChange={handleChange}
          required
        />
      </div>

      
      {/* Bouton de Soumission */}
      <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
>
      <Button
        variant="default"
        size="lg"
        type="submit"
        disabled={isSubmitting}
        className={`
          relative overflow-hidden transition-all duration-300 ease-out
          transform hover:scale-105 hover:shadow-lg
          bg-gradient-to-r from-blue-500 to-indigo-600
          text-white font-semibold py-3 px-6 rounded-full
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75
          ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
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
          <span>{isSubmitting ? 'Inscription en cours...' : 'S\'inscrire'}</span>
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
      {/* Bouton Déjà inscrit? Connection */}
    </form>
  )
}