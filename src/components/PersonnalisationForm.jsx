import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion'
import BankGuides from '../components/BankGuides'

import { Save, Percent, Store, FileText, CreditCard, Settings, Sparkles } from 'lucide-react'
export default function PersonnalisationForm() {
  const [isHovered, setIsHovered] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState();
  const [formData, setFormData] = useState({
    autoDeposit: true, // Default to true
    discountEnabled: true, // Default to true
  });
  const router = useRouter();

  const [dateDeLivraison, setDateDeLivraison] = useState('');
  const [showEmailExample, setShowEmailExample] = useState(false);

  // Fetch Store Data
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        const response = await fetch('/api/personnalisation');
        if (response.ok) {
          const data = await response.json();
          setFormData(prevData => ({
            ...prevData,
            nomBoutique: data.name || prevData.nomBoutique,
            description: data.description || prevData.description,
            hoursAvailable: data.hoursAvailable || '',
            autoDeposit: data.autoDeposit !== false, // Default to true if not set
            discountEnabled: data.discountEnabled !== false, // Default to true if not set
          }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données de la boutique:', error);
      }
    };

    fetchStoreData();
  }, []); // Empty dependency array to run once on mount

  // Fetch user and delivery date
  useEffect(() => {
    const fetchUserAndDate = async () => {
      const session = await getSession();
      if (session) {
        setUser(session.user)
        
        // Fetch Delivery Date
        try {
          const response = await fetch(`/api/schools/${session.user.school}`);
          if (response.ok) {
            const data = await response.json();
            setDateDeLivraison(data.dateDeLivraison);
          }
        } catch (error) {
          console.error('Erreur lors du chargement de la date de livraison:', error);
        }
        
        // Set initial form data
        setFormData(prevData => ({
          ...prevData,
          nomBoutique: prevData.nomBoutique || `Campagne de ${session.user.name || ''}`,
          hoursAvailable: prevData.hoursAvailable || '',
        }))
      }
    }

    fetchUserAndDate()
  }, [])

  // Update description when delivery date is available
  useEffect(() => {
    if (dateDeLivraison && !formData.description) {
      const formatDate = (dateString) => {
        if (!dateString) return 'la date de livraison'
        const date = new Date(dateString)
        return date.toLocaleDateString('fr-CA', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      }
      
      const newDescription = `🎉 Découvrez les pâtés exclusifs de la campagne de financement Massibec (viande et poulet) ainsi qu'un délicieux choix de tartes parfaites pour les fêtes qui approchent ! Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et, si vous ne le savez pas encore, contactez-moi pour connaître les modalités de récupération de vos produits le ${formatDate(dateDeLivraison)}. 🙏 Merci pour votre soutien et bon appétit !`
      
      setFormData(prevData => ({
        ...prevData,
        description: newDescription
      }))
    }
  }, [dateDeLivraison, formData.description])
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const session = await getSession();
      console.log("session")
      console.log(session)
  
      const response = await fetch('/api/personnalisation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          name: formData.nomBoutique,
          description: formData.description,
          //colorPalette: formData.couleurPrincipale,
          hoursAvailable: formData.hoursAvailable,
          autoDeposit: formData.autoDeposit, // Pass autoDeposit to the api
          discountEnabled: formData.discountEnabled, // Pass discountEnabled to the api
        }),
      });
  
      if (response.ok) {

        const data = await response.json();
        console.log(data)
        alert('Personnalisation enregistrée avec succès!');

        // Rediriger vers la page de la boutique après la personnalisation réussie
        router.push(data.storeUrl);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la personnalisation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue lors de l\'enregistrement de la personnalisation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Définition du composant EmailExample
// components/EmailTemplate.tsx



const EmailExample = () => {
  const firstName = "Jean";
  const customerEmail = "jean@example.com";
  const storeName = "Boutique de Pâtés";
  const hoursAvailable = "14h00 - 16h00";
  
  const products = [
    {
      productId: "1",
      productName: "Pâté à la viande",
      quantity: 2,
      price: 10.00,
      amount: "20,00 $",
    },
    {
      productId: "2",
      productName: "Pâté au poulet",
      quantity: 3,
      price: 10.00,
      amount: "30,00 $",
    },
  ];
  const totalAmount = 50.00;
  const tip = 5.00;
  const orderId = "12345";
  const orderDate = "01/01/2024";
  const orderDeadline = "29/10/2024";
  const deliveryDate = "08/12/2024";
  const deliveryLocation = "123 rue xyz";
  const deliveryCity = "LaVille";
  const sellerName = "Votre Nom";
  const sellerPhone = "514-123-4567";
  const sellerEmail = "votre.email@example.com";

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333' }}>
      <h2 style={{ color: '#4A90E2', fontWeight: 'bold' }}>Confirmation de votre commande - Commande #{orderId}</h2>
      
      <p>Merci <strong>{firstName}</strong> pour votre commande.</p>
      <p>La livraison se fera à l'école le <strong>{deliveryDate}</strong> et les produits vous seront donc acheminés tel que nous avons personnellement convenu.</p>

      <h3 style={{ color: '#4A90E2', fontWeight: 'bold' }}>Transfert Interac</h3>
      <p>Pour finaliser votre commande, merci d'effectuer le transfert Interac à :</p>
      <p>
        <strong>Destinataire :</strong> {sellerName} (inscription)<br />
        <strong>Adresse courriel :</strong> <a href={`mailto:${sellerEmail}`}>{sellerEmail}</a> (pour réception transfert Interac et communication)<br />
        {formData.autoDeposit ? null : <><strong>Question de sécurité :</strong> {firstName}<br /></>}
        {formData.autoDeposit ? null : <><strong>Réponse :</strong> <a href={`mailto:${customerEmail}`}>{customerEmail}</a><br /></>}
        <strong>Montant :</strong> {totalAmount.toFixed(2)} $<br />
        {formData.autoDeposit ? <><strong>Message :</strong> #{orderId}</> : null}
      </p>

      <h3 style={{ color: '#4A90E2', fontWeight: 'bold' }}>Détails de la commande :</h3>
      <p><strong>Nom du vendeur :</strong> {sellerName}</p>
      <p><strong>Numéro de téléphone du vendeur :</strong> {sellerPhone}</p>
      <p><strong>Email du vendeur :</strong> <a href={`mailto:${sellerEmail}`}>{sellerEmail}</a></p>
      <p><strong>Numéro de commande :</strong> #{orderId}</p>
      <p><strong>Date de la commande :</strong> {orderDate}</p>
 
      <h3>Produits commandés :</h3>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Produit</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Quantité</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Prix Unitaire</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {products.map((item, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.productName}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${item.price.toFixed(2)}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${item.amount}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Total des unités :</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
              {products.reduce((acc, item) => acc + item.quantity, 0)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Nombre de caisses :</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
              {(products.reduce((acc, item) => acc + item.quantity * 0.17, 0)).toFixed(2)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Pourboire :</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
              {tip.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Total à payer :</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
              ${totalAmount.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
      
      <p>
        Merci de votre soutien, et si vous souhaitez ajouter des produits, vous avez jusqu'au <strong>{orderDeadline}</strong> pour envoyer votre commande et paiement.
      </p>
      
      <p>
        Merci encore.
      </p>
    </div>
  );
};


  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 rounded-full p-3 mr-4">
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Paramètres de la boutique</h1>
              <p className="text-gray-600">Personnalisez votre boutique de financement</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Store Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Store className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Informations de la boutique</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="nomBoutique" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la boutique
                </Label>
                <Input
                  type="text"
                  id="nomBoutique"
                  name="nomBoutique"
                  value={formData.nomBoutique}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Paramètres de paiement</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 rounded-full p-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <Label htmlFor="autoDeposit" className="text-base font-semibold text-gray-800">
                      Dépôts automatiques
                    </Label>
                    <p className="text-sm text-gray-600">
                      Mon compte bancaire est configuré pour recevoir les dépôts automatiques
                    </p>
                  </div>
                </div>
                <Switch
                  id="autoDeposit"
                  checked={formData.autoDeposit}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoDeposit: checked })}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                />
              </div>

              {formData.autoDeposit && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Conseil</p>
                      <p className="text-sm text-blue-700">
                        Configurez vos dépôts automatiques pour faciliter la gestion de vos fonds. 
                        Consultez les guides ci-dessous pour votre banque.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Discount Settings */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Percent className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Réductions</h2>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-full p-2">
                  <Percent className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <Label htmlFor="discountEnabled" className="text-base font-semibold text-gray-800">
                    Réductions automatiques
                  </Label>
                  <p className="text-sm text-gray-600">
                    {formData.discountEnabled 
                      ? "5% de réduction dès 6 produits commandés" 
                      : "Les réductions sont désactivées pour cette boutique"}
                  </p>
                </div>
              </div>
              <Switch
                id="discountEnabled"
                checked={formData.discountEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, discountEnabled: checked })}
                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
              />
            </div>
          </div>

          {/* Bank Guides */}
          {formData.autoDeposit && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-5 w-5 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900">Guides bancaires</h2>
              </div>
              <BankGuides />
            </div>
          )}

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pt-6"
          >
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {isSubmitting ? 'Enregistrement en cours...' : 'Enregistrer les paramètres'}
            </Button>
          </motion.div>
        </form>

        {/* Email Preview Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Aperçu de l'email</h2>
          </div>
          <p className="text-gray-600 mb-4">Voici un exemple de courriel qui sera envoyé à vos clients lorsqu'ils auront commandé :</p>
          <Button 
            onClick={() => setShowEmailExample(true)}
            variant="outline"
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            Voir un exemple de courriel
          </Button>
        </div>

        {/* Email Preview Modal */}
        {showEmailExample && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => setShowEmailExample(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold z-10"
                aria-label="Fermer"
              >
                ×
              </button>
              <div className="p-6">
                <EmailExample />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}