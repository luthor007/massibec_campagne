// components/CheckoutForm.jsx

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle, CreditCard, Mail, Phone, User, DollarSign } from 'lucide-react'

export default function CheckoutForm({ total, onClose, items, removeAllItem }) {
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    phoneNumber: '',
  })
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerSchool, setOwnerSchool] = useState('')
  const [ownerId, setOwnerId] = useState(null)
  const [owner, setOwner] = useState(null)
  const [isLoadingOwner, setIsLoadingOwner] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [tipAmount, setTipAmount] = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [storeId, setStoreId] = useState()
  const [autoDeposit, setAutoDeposit] = useState()

  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return

    const storeIdParam = router.query
    if (storeIdParam && storeIdParam.id) {
      setStoreId(storeIdParam.id)
      fetchOwnerInfo(storeIdParam.id)
    }
  }, [router.isReady, router.query])


  const fetchOwnerInfo = async (storeId) => {
    try {
      setIsLoadingOwner(true)
      const response = await fetch(`/api/stores/${storeId}`)
      if (response.ok) {
        const data = await response.json()
        setOwnerEmail(data.ownerEmail)
        setOwnerSchool(data.ownerSchool)
        setOwnerId(data.ownerId)
        setOwner(data.owner)
        setAutoDeposit(data.autoDeposit)
      } else {
        console.error('Erreur lors de la récupération des données de la boutique')
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsLoadingOwner(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleTipChange = (value) => {
    if (value === 'custom') {
      setTipAmount(parseFloat(customTip) || 0)
    } else {
      setTipAmount(parseFloat(value))
      setCustomTip('')
    }
  }

  const handleCustomTipChange = (e) => {
    setCustomTip(e.target.value)
    setTipAmount(parseFloat(e.target.value) || 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!owner || !owner._id) {
      alert('Informations du propriétaire non disponibles. Veuillez réessayer plus tard.')
      return
    }

    console.log("----------OWNER FROM CHECKOUT----------")
    console.log(owner)

    setIsSubmitting(true)

    try {
      removeAllItem()
      const postData = {
        products: items.map(item => ({
          product: item.id,
          quantity: item.quantity,
          price: item.price,
          cost: item.cost,
          name: item.name,
        })),
        totalAmount: total,
        customerEmail: formData.email,
        customerName: formData.nom,
        phoneNumber: formData.phoneNumber,
        storeId: storeId,
        school: ownerSchool,
        owner: owner,
        tip: tipAmount,
        autoDeposit: autoDeposit,
      }

      const response = await fetch('/api/commandes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      })

      if (response.ok) {
        localStorage.removeItem('cartItems')
        setIsSuccess(true)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur lors de la création de la commande')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert(`Une erreur est survenue lors de la création de la commande: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuccessClose = () => {
    setIsSuccess(false)
    onClose()
    setFormData({ email: '', nom: '', phoneNumber: '' })
    window.location.reload()
  }

  return (
    <>
      <Dialog open={!isSuccess} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-auto max-h-screen">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
            <DialogTitle className="text-2xl font-bold">Finaliser votre commande</DialogTitle>
            <DialogDescription className="text-blue-100 mt-2">
              Nous sommes presque là ! Remplissez vos informations pour compléter votre achat.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white">
            <div className="space-y-4">
              {/* Full Name Field */}
              <div className="space-y-2">
                <Label htmlFor="nom" className="text-sm font-medium text-gray-700">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    className="pl-10 py-3 text-base"
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Adresse e-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="pl-10 py-3 text-base"
                    placeholder="jean.dupont@example.com"
                  />
                </div>
              </div>

              {/* Phone Number Field */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">Numéro de téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                    className="pl-10 py-3 text-base"
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Tip Section */}
            <Card className="border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-blue-800">Ajouter un pourboire</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup onValueChange={handleTipChange} className="flex flex-wrap gap-4">
                  {[0, 2, 5].map((amount) => (
                    <div key={amount} className="flex items-center">
                      <RadioGroupItem value={amount.toString()} id={`tip-${amount}`} className="peer sr-only" />
                      <Label
                        htmlFor={`tip-${amount}`}
                        className={`flex items-center justify-center px-4 py-2 text-sm font-medium border rounded-full cursor-pointer ${tipAmount === amount ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-100'}`}
                      >
                        {amount === 0 ? 'Pas de pourboire' : `${amount}$`}
                      </Label>
                    </div>
                  ))}
                  {/* Custom Tip Option */}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="tip-custom" className="peer sr-only" />
                    <Label
                      htmlFor="tip-custom"
                      className={`flex items-center justify-center px-4 py-2 text-sm font-medium border rounded-full cursor-pointer ${tipAmount === 'custom' ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-100'}`}
                    >
                      Personnalisé
                    </Label>
                    <Input
                      type="number"
                      placeholder="Montant"
                      value={customTip}
                      onChange={handleCustomTipChange}
                      className="w-24 text-sm px-2 py-1 border rounded"
                    />
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Total Amount */}
            <div className="flex justify-between items-center font-semibold text-lg bg-gray-100 p-4 rounded-lg">
              <span>Total à payer:</span>
              <span className="text-blue-700">{(total + tipAmount).toFixed(2)}$</span>
            </div>

            {/* Form Actions */}
            <DialogFooter className="flex flex-col sm:flex-row gap-4">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto py-3 text-base">
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !owner || isLoadingOwner}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center py-3 text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Confirmer et payer
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <AnimatePresence>
        {isSuccess && (
          <Dialog open={isSuccess} onOpenChange={handleSuccessClose}>
            <DialogContent className="sm:max-w-[425px] bg-white p-0 overflow-auto max-h-screen">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center p-6"
              >
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <DialogTitle className="text-2xl font-bold text-green-600 mb-2">Commande réussie</DialogTitle>
                <DialogDescription className="text-center text-gray-700 mb-6">
                  Votre commande a été envoyée avec succès ! Vous recevrez bientôt un e-mail de confirmation avec les instructions de paiement.
                  N'oubliez pas de regarder dans les indésirables.
                </DialogDescription>
                <Button
                  onClick={handleSuccessClose}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-base rounded-lg"
                >
                  Fermer
                </Button>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  )
}