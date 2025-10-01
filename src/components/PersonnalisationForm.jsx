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

import { Save, Percent } from 'lucide-react'
export default function PersonnalisationForm() {
  const [isHovered, setIsHovered] = useState(false)
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
            nomBoutique: data.name,
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

  // Fetch Delivery Date
  useEffect(() => {
    const fetchDateDeLivraison = async () => {
      try {
        const response = await fetch(`/api/schools/${session.user.school}`);
        if (response.ok) {
          const data = await response.json();
          setDateDeLivraison(data.dateDeLivraison);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la date de livraison:', error);
      }
    };

    fetchDateDeLivraison();
  }, []); // Empty dependency array to run once on mount

  useEffect(() => {
      const fetchUser = async () => {
        const session = await getSession();
        if (session) {
          setUser(session.user)
          // Only set initial form data if not already set
          setFormData(prevData => ({
            ...prevData,
            nomBoutique: prevData.nomBoutique || `Campagne de ${session.user.name || ''}`,
            description: prevData.description || `🎉 Découvrez les pâtés exclusifs de la campagne de financement Massibec (viande et poulet) ainsi qu'un délicieux choix de tartes parfaites pour les fêtes qui approchent ! Profitez de 5 % de rabais dès 6 produits. Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et, si vous ne le savez pas encore, contactez-moi pour connaître les modalités de récupération de vos produits le ${dateDeLivraison}. 🙏 Merci pour votre soutien et bon appétit !`,
            hoursAvailable: prevData.hoursAvailable || '',
          }))
        }
      }

      fetchUser()
    }, [dateDeLivraison])
  

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
    <>
      <form onSubmit={handleSubmit} className="space-y-10 pb-8">
        <div className="space-y-2">
          <Label htmlFor="nomBoutique"><strong>Nom de la boutique:</strong></Label>
          <Input
            type="text"
            id="nomBoutique"
            name="nomBoutique"
            value={formData.nomBoutique}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description"><strong>Description:</strong></Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
          />
        </div>
        {/* Tip for Automatic Deposits */}
        <div className="mt-4 p-4 border border-blue-300 rounded-md bg-blue-50">
          <p>
            Pensez à configurer vos dépôts automatiques pour faciliter la gestion de vos fonds. 
            Vous pouvez le faire avec les guides ci-dessous.
          </p>
        </div>

      {/* Bank Guides Component */}
      <BankGuides />

      <div className="space-y-4 p-6 border-2 border-gray-300 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 shadow-md">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Label htmlFor="autoDeposit" className="text-base font-semibold text-gray-800">
              Dépôts automatiques
            </Label>
            <p className="text-sm text-gray-600">
             Mon compte bancaire est configuré pour recevoir les dépôts automatiques.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium ${!formData.autoDeposit ? 'text-gray-600' : 'text-gray-400'}`}>
              Non
            </span>
            <Switch
              id="autoDeposit"
              checked={formData.autoDeposit}
              onCheckedChange={(checked) => setFormData({ ...formData, autoDeposit: checked })}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
            />
            <span className={`text-sm font-medium ${formData.autoDeposit ? 'text-green-600' : 'text-gray-400'}`}>
              Oui
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6 border-2 border-blue-300 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 shadow-md">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Label htmlFor="discountEnabled" className="text-base font-semibold text-blue-800 flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Réductions automatiques
            </Label>
            <p className="text-sm text-blue-600">
              {formData.discountEnabled 
                ? "5% de réduction dès 6 produits commandés" 
                : "Les réductions sont désactivées pour cette boutique"}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium ${!formData.discountEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
              Non
            </span>
            <Switch
              id="discountEnabled"
              checked={formData.discountEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, discountEnabled: checked })}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
            />
            <span className={`text-sm font-medium ${formData.discountEnabled ? 'text-green-600' : 'text-gray-400'}`}>
              Oui
            </span>
          </div>
        </div>
      </div>

        <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
>
      <Button
        variant="default"
        size="lg"
        type="submit"
        className={`
          relative overflow-hidden transition-all duration-300 ease-out
          transform hover:scale-105 hover:shadow-lg
          bg-gradient-to-r from-blue-500 to-indigo-600
          text-white font-semibold py-3 px-6 rounded-full
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
          <Save className="w-5 h-5" />
          <span>Enregistrer</span>
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

      <p>Voici un exemple de courriel qui sera envoyé à vos clients lorsqu'ils auront commandé:</p><br/>
      {/* Bouton pour afficher le popup */}
      <Button onClick={() => setShowEmailExample(true)}>Voir un exemple de courriel</Button>

      {/* Popup */}
      {showEmailExample && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
          }}
          onClick={() => setShowEmailExample(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90%',
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton pour fermer le popup */}
            <button
              onClick={() => setShowEmailExample(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
              }}
              aria-label="Fermer"
            >
              &times;
            </button>
            {/* Contenu de l'exemple de courriel */}
            <EmailExample />
          </div>
        </div>
      )}
    </>
  )
}