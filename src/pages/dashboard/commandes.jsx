// pages/commandes.jsx

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { products } from '../../lib/product';
import { motion } from 'framer-motion'
import { SendHorizontal} from 'lucide-react'
import { format, addDays, isBefore, isAfter } from 'date-fns'; // Make sure to import date-fns
import { fr } from 'date-fns/locale'; // For French date formatting


export default function Commandes() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [newOrderId, setNewOrderId] = useState(null);
  const [priceToPay, setPriceToPay] = useState();
  const [school, setSchool] = useState();
  const [isHovered, setIsHovered] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  const schoolId = session?.user?.school;
  const name = session?.user?.name;

  // Fetch School Data
  const fetchSchoolData = useCallback(async (schoolId) => {
    try {
      const response = await fetch(`/api/schools/${schoolId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch school data')
      }
      const schoolData = await response.json()
      setSchool(schoolData)
    } catch (error) {
      setError(error.message)
    }
  }, [])

  useEffect(() => {
    if (schoolId) {
      fetchSchoolData(schoolId)
    }
  }, [schoolId])

  useEffect(() => {

    
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/commandes');
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        } else {
          throw new Error('Erreur lors de la récupération des commandes');
        }
      } catch (error) {
        setError(error.message);
      }
    };

    const getNewOrderId = async () => {
      try {
        const response = await fetch('/api/orderStudent'); // Utilisation de l'API OrderStudent pour générer orderId
        if (response.ok) {
          const data = await response.json();
          setNewOrderId(data.orderId); // Supposons que l'API retourne le nouvel orderId
        } else {
          throw new Error('Erreur lors de la création de orderId');
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    // La génération de orderId doit se faire lors de la création de la commande, pas au chargement de la page
    // Donc, nous pouvons supprimer ou commenter cette partie si non nécessaire
    // getNewOrderId();
  }, []);

  // Fonction pour calculer le total des commandes payées
  function calculateTotalOrders(orders) {
    if (!orders || orders.length === 0) {
      return 0;
    }
    const paidOrders = orders.filter(order => order.status === 'Payé');
    return paidOrders.reduce((total, order) => total + order.totalAmount, 0);
  }

  // Fonction pour gérer le changement de statut d'une commande
  const handleStatusChange = async (orderIds, newStatus) => {
    try {
      // Convert single orderId to array if needed
      const orderIdsArray = Array.isArray(orderIds) ? orderIds : [orderIds];
      
      const updatePromises = orderIdsArray.map(async (orderId) => {
        const orderToUpdate = orders.find(order => order.orderId === orderId);
        if (!orderToUpdate) return;

        const response = await fetch(`/api/command/${orderToUpdate._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erreur lors de la mise à jour du statut');
        }

        return orderToUpdate._id;
      });

      const updatedOrderIds = await Promise.all(updatePromises);
      
      setOrders(orders.map(order =>
        updatedOrderIds.includes(order._id) ? { ...order, status: newStatus } : order
      ));
    } catch (error) {
      setError(error.message);
    }
  };

    // Fonction pour gérer l'impression des commandes
    const handlePrint = () => {
      window.print();
    };

  // Fonction pour gérer la suppression d'une commande
  const handleDeleteOrder = async () => {
    if (!selectedOrderId || isDeletingOrder) {
      return;
    }

    setIsDeletingOrder(true);
    try {
      console.log('Attempting to delete order with ID:', selectedOrderId);
      const response = await fetch(`/api/command/${selectedOrderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setOrders(orders.filter(order => order._id !== selectedOrderId));
        setShowPopup(false);
        setSelectedOrderId(null);
        alert('Commande supprimée avec succès.');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la suppression de la commande');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.message);
      alert(`Une erreur est survenue lors de la suppression de la commande: ${error.message}`);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Fonction pour gérer le passage de la commande
  const handlePlaceOrder = async () => {
    if (isSubmitting) return; // Prevent multiple submissions
    setIsSubmitting(true);
    
    try {
      if (!session || !session.user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer l'ID de l'école associée à l'utilisateur
      const school = session.user.school; // Assurez-vous que schoolId est défini dans la session
      if (!school) {
        throw new Error('Aucune école associée à l\'utilisateur.');
      }


            // Check if there are any orders not marked as "Payer"
      const unpaidOrders = orders.filter(order => order.status === 'En attente');
      if (unpaidOrders.length > 0) {
        alert('Vous devez vous assurer que toutes vos commandes sont définies sur "Payé", "Commander" ou "Complété" avant de passer la commande.');
        return;
      }






        // Créer une commande étudiante
        const paidOrders = orders.filter(order => order.status === 'Payé');
        console.log('Paid Orders:', paidOrders);

        if (paidOrders.length > 0) {
          // Agréger les produits de toutes les commandes payées
          const aggregatedStudentProducts = [];

          paidOrders.forEach(order => {
            order.products.forEach(product => {
              const productDetails = product.product; // Utiliser directement product.product
              if (productDetails) {
                aggregatedStudentProducts.push({
                  productName: productDetails.name,
                  quantity: product.quantity,
                  price: productDetails.price,
                  cost: productDetails.cost,
                });
              } else {
                console.warn(`Détails du produit non trouvés pour le produit dans la commande ${order.orderId}`);
              }
            });
          });
          console.log('Aggregated Student Products:', aggregatedStudentProducts);

          // Calculer les totaux
          const studentTotalUnits = aggregatedStudentProducts.reduce((total, product) => total + product.quantity, 0);
          const studentTotalAmount = aggregatedStudentProducts.reduce((total, product) => total + (product.price * product.quantity), 0);
          const studentAmountPaid = studentTotalAmount; // Ajustez si nécessaire

          // Récupérer l'école pour obtenir les splits
          const schoolResponse = await fetch(`/api/schools/${school}`);
          if (!schoolResponse.ok) {
            throw new Error('Erreur lors de la récupération des informations de l\'école.');
          }
          const schoolData = await schoolResponse.json();
          console.log(schoolData)
          const { studentBenefit, organizationBenefit, raffleBenefit } = schoolData.split;

          // Calculer les bénéfices
          let totalStudentBenefit = 0;
          let totalOrganizationBenefit = 0;
          let totalRaffleBenefit = 0;

          const calculatedStudentProducts = aggregatedStudentProducts.map(product => {
            const profit = (product.price - product.cost) * product.quantity;

            const studentB = profit * (studentBenefit / 100);
            const organizationB = profit * (organizationBenefit / 100);
            const raffleB = profit * (raffleBenefit / 100);

            totalStudentBenefit += studentB;
            totalOrganizationBenefit += organizationB;
            totalRaffleBenefit += raffleB;

            return {
              productName: product.productName,
              quantity: product.quantity,
              price: product.price,
              cost: product.cost,
              profit,
              studentBenefit: studentB,
              organizationBenefit: organizationB,
              raffleBenefit: raffleB,
            };
          });

          setPriceToPay(studentTotalAmount - totalStudentBenefit);

          const studentOrderData = {
            timestamp: new Date(),
            email: session.user.email,
            studentName: session.user.name,
            phoneNumber: session.user.parentInfo?.telephone || '000-000-0000',
            schoolId: schoolData._id,
            products: calculatedStudentProducts,
            totalUnits: studentTotalUnits,
            totalAmount: studentTotalAmount - totalStudentBenefit,
            amountPaid: 0,
            studentBenefit: totalStudentBenefit,
            organizationBenefit: totalOrganizationBenefit,
            raffleBenefit: totalRaffleBenefit,
          };

          // Envoyer la commande étudiante à l'API
          const studentResponse = await fetch('/api/orderStudent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentOrderData),
          });

          if (studentResponse.ok) {
            alert('Commande étudiante créée avec succès.');
            const data = await studentResponse.json();
            setNewOrderId(data.orderId); // Supposons que l'API retourne le nouvel orderId

            // Mettre à jour le statut des commandes payées à 'Commander'
            await handleStatusChange(
              paidOrders.map(order => order.orderId),
              'Commander'
            );
          } else {
            const errorData = await studentResponse.json();
            throw new Error(errorData.message || 'Erreur lors de la création de la commande étudiante');
          }


        // Afficher le popup de confirmation
        setShowPopup(true);
      } else {
        throw new Error('Aucune commande payée disponible pour passer la commande.');
      }
    } catch (error) {
      alert('Erreur lors de l\'ajout de la commande.');
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction pour fermer le popup
  const handlePopupClose = () => {
    setShowPopup(false);
  };

  const totalSales = calculateTotalOrders(orders);
  const amountToPay = (totalSales * 0.9).toFixed(2); // Ajustez selon votre logique


    // Function to calculate the total profit for an order
    const calculateProfit = (products) => {
      return products
        .map((product) => (product.productPrice - product.productCost) * product.quantity)
        .reduce((acc, profit) => acc + profit, 0);
    };

  // Fonction pour copier du texte dans le presse-papier
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copié dans le presse-papier!');
  };

  if (status === 'loading') {
    return <p>Chargement des commandes...</p>;
  }

  if (error) {
    return <p>Erreur: {error}</p>;
  }

  if (!session) {
    return <p>Vous devez être connecté pour voir vos commandes.</p>;
  }

  if (!school) {
    return <p>Chargement des commandes...</p>;
  }

  return (
    <Layout>
      <Card className="pt-16">
        <CardHeader>
          <Link href="/dashboard" passHref>
            <div className="flex items-center space-x-2 cursor-pointer">
              <ArrowLeft className="h-5 w-5" />
              <span>Retour au tableau de bord</span>
            </div>
          </Link>
          <CardTitle className="text-2xl">Mes commandes</CardTitle>
          <CardDescription>Gérez les commandes de vos clients</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p>Aucune commande trouvée</p>
          ) : (
            <>
                          {/* Bouton d'impression */}
              <Button className="mt-4 mb-4" onClick={handlePrint}>
                Imprimer les commandes
              </Button>

{/* Instructions sur les statuts des commandes */}
<div className="bg-white p-6 rounded-lg shadow-md mt-6">
  <h2 className="text-2xl font-bold mb-4 text-gray-800">Statut des Commandes</h2>
  <ol className="list-decimal list-inside space-y-4 text-gray-700">
    <li>
      <h3 className="font-semibold">En attente</h3>
      <p>
        Un de vos clients a passé une commande, mais vous n'avez pas encore reçu le paiement par virement Interac. <span className="font-bold">Pour encaisser ce paiement, vous devez vérifier que la réponse à la question de sécurité est l'adresse e-mail de votre client. Si vous avez activé les dépôts automatiques, le paiement devrait être accepté automatiquement. Dans le message de confirmation, cherchez le numéro de commande pour savoir de quel client il s'agit.</span>
      </p>
    </li>
    <li>
      <h3 className="font-semibold">Payé</h3>
      <p>
        Vous avez reçu le paiement du client et changé le statut de la commande à <span className="font-bold">Payé</span>. Cela confirme que l'argent a bien été reçu.
      </p>
    </li>
    <li>
      <h3 className="font-semibold">Commander</h3>
      <p>
        En cliquant sur le bouton <span className="font-bold">Passer la commande</span>, vous envoyez toutes les commandes <span className="font-bold">Payées</span> à l'usine Massibec pour qu'ils préparent vos produits. <span className="font-bold">N'oubliez pas : assurez-vous d'avoir bien payé toutes les commandes, sinon elles ne pourront pas être livrées.</span>
      </p>
    </li>
    <li>
      <h3 className="font-semibold">Complété</h3>
      <p>
        La commande est terminée ! Les produits ont été préparés et envoyés au client. Tout est fini pour cette commande.
      </p>
    </li>
  </ol>
</div>

              {/* Tableau des commandes */}
              <div id="orderTable">
              <Table className="mt-6">
                <TableHeader>
                  <TableRow>
                    <TableHead>Id de commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Produit(s)</TableHead>
                    <TableHead>Total en $</TableHead>
                    <TableHead>Pourboire en $</TableHead>
                    <TableHead>Profit en $</TableHead>
                    <TableHead>Créer le</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell>{order.orderId}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.customerEmail}</TableCell>
                      <TableCell>{order.phoneNumber}</TableCell>
                      <TableCell>
                        {/* Display list of products and quantities */}
                        {order.products.map((prod, index) => (
                          <div key={index}>
                            {prod.productName} x {prod.quantity}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>{(order.totalAmount).toFixed(2)}$</TableCell>
                      <TableCell>{order.tip}$</TableCell>
                      <TableCell>{calculateProfit(order.products).toFixed(2) + order.tip}$</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.orderId, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Statut" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-200">
                            {order.status !== "Commander" && order.status !== "Complété" && (
                              <>
                                <SelectItem value="En attente">En attente</SelectItem>
                                <SelectItem value="Payé">Payé</SelectItem>
                              </>
                            )}
                            {order.status !== "En attente" && order.status !== "Payé" && (
                              <>
                            <SelectItem value="Commander">Commander</SelectItem>
                            <SelectItem value="Complété">Complété</SelectItem>
                            </>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSelectedOrderId(order._id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              <CommandeButton 
                school={school} 
                handlePlaceOrder={handlePlaceOrder}
                isSubmitting={isSubmitting}
              />

              {/* Popup pour les instructions de paiement */}
              <Dialog open={showPopup} onOpenChange={handlePopupClose}>
                <DialogContent className="bg-white p-6 rounded-md shadow-md">
                  <DialogHeader>
                    <DialogTitle>Bravo, commande reçue!</DialogTitle>
                    <DialogDescription>
                      Maintenant, suivez les étapes pour finaliser votre paiement.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-4 space-y-4">
                    <p>1. Choisissez votre banque :</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <a href="https://www.desjardins.com/fr/" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          Desjardins
                        </Button>
                      </a>
                      <a href="https://www.bnc.ca/fr/particuliers.html" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          BNC
                        </Button>
                      </a>
                      <a href="https://www.rbcbanqueroyale.com/" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          RBC
                        </Button>
                      </a>
                      <a href="https://www.td.com/ca/fr/perso/" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          TD
                        </Button>
                      </a>
                      <a href="https://www.scotiabank.com/ca/fr/particuliers.html" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          Scotiabank
                        </Button>
                      </a>
                      <a href="https://www.cibc.com/fr/personal-banking.html" target="_blank" rel="noopener noreferrer">
                        <Button as="a" variant="outline" className="w-full">
                          CIBC
                        </Button>
                      </a>
                    </div>

                    <p>
                      2. Envoyez un virement Interac à <strong>facturation@massibec.com</strong>
                      <Button variant="outline" className="ml-2" onClick={() => copyToClipboard('facturation@massibec.com')}>
                        Copier
                      </Button>
                    </p>

                    <p>
                      3. Montant à payer : <strong>{priceToPay}$</strong>
                      <Button variant="outline" className="ml-2" onClick={() => copyToClipboard(`${priceToPay}`)}>
                        Copier
                      </Button>
                    </p>

                    <p>
                      4. Message de virement : <strong>@#&*-{school.code}-{newOrderId || 'N/A'}-{name}</strong>
                      <Button variant="outline" className="ml-2" onClick={() => copyToClipboard(`@#&*-${school.code}-${newOrderId || ''}-${name}`)}>
                        Copier
                      </Button>
                    </p>

                    <p>
                      <strong>IMPORTANT : Assurez-vous de faire le virement avant de quitter cette page.</strong>
                      Vous allez sous peu recevoir un courriel de confirmation, il se peut qu'il soit dans les indésirables.
                    </p>
                  </div>

                  <Button className="mt-4" onClick={handlePopupClose}>
                    Terminer
                  </Button>
                </DialogContent>
              </Dialog>

              {/* Popup de confirmation de suppression */}
              <Dialog open={selectedOrderId !== null} onOpenChange={() => setSelectedOrderId(null)}>
                <DialogContent className="bg-white p-6 rounded-md shadow-md">
                  <DialogHeader>
                    <DialogTitle>Supprimer la commande</DialogTitle>
                    <DialogDescription>
                      Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.
                    </DialogDescription>
                  </DialogHeader>

                  <DialogFooter className="mt-4 flex justify-end space-x-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedOrderId(null)}
                      disabled={isDeletingOrder}
                    >
                      Annuler
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteOrder}
                      disabled={isDeletingOrder}
                    >
                      {isDeletingOrder ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Suppression...
                        </>
                      ) : (
                        'Supprimer'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
const CommandeButton = ({ school, handlePlaceOrder, isSubmitting }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Check if current date is within the allowed range
  const currentDate = new Date();
  const finCampagne = new Date(school.finCampagne);
  const orderEndDate = addDays(finCampagne, 15);
  
  const isOrderingPeriod = !isBefore(currentDate, finCampagne) && 
                          !isAfter(currentDate, orderEndDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-2" // Added space between button and message
    >
      <Button
        onClick={isOrderingPeriod ? handlePlaceOrder : undefined}
        variant="default"
        size="lg"
        className={`
          relative overflow-hidden transition-all duration-300 ease-out
          transform hover:scale-105 hover:shadow-lg
          ${isOrderingPeriod 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
            : 'bg-gray-400 cursor-not-allowed'}
          text-white font-semibold py-3 px-6 rounded-full
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={!isOrderingPeriod || isSubmitting}
      >
        <motion.span
          className="relative z-10 flex items-center space-x-2"
          animate={{ x: isOrderingPeriod && isHovered ? 5 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Traitement en cours...</span>
            </>
          ) : (
            <>
              <SendHorizontal className="w-5 h-5" />
              <span>Passer la commande à Massibec</span>
            </>
          )}
        </motion.span>
        {isOrderingPeriod && (
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: isHovered ? 1.5 : 0, opacity: isHovered ? 0.15 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ borderRadius: '100%', zIndex: 0 }}
          />
        )}
      </Button>
      
      {!isOrderingPeriod && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-600 italic"
        >
          Vous allez pouvoir passer votre commande entre le{' '}
          <span className="font-medium">
            {format(finCampagne, 'dd MMMM yyyy', { locale: fr })}
          </span>{' '}
          et le{' '}
          <span className="font-medium">
            {format(orderEndDate, 'dd MMMM yyyy', { locale: fr })}
          </span>
        </motion.p>
      )}
    </motion.div>
  );
};
