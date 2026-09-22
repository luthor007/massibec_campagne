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
import { ArrowLeft, Trash2, History, ChevronDown, ChevronRight, Package } from 'lucide-react';
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
  const [showConfirmOrder, setShowConfirmOrder] = useState(false);
  const [commandesPassees, setCommandesPassees] = useState([]);
  const [loadingPassees, setLoadingPassees] = useState(true);
  const [expandedPassee, setExpandedPassee] = useState({});

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

    const fetchCommandesPassees = async () => {
      try {
        const res = await fetch('/api/student/mes-commandes-passees');
        if (res.ok) {
          const data = await res.json();
          setCommandesPassees(data);
        }
      } catch (e) {
        console.error('Erreur commandes passées:', e);
      } finally {
        setLoadingPassees(false);
      }
    };

    fetchOrders();
    fetchCommandesPassees();
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
                      <TableCell>{(calculateProfit(order.products) + (order.tip || 0)).toFixed(2)}$</TableCell>
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
                            <SelectItem value="En attente">En attente</SelectItem>
                            <SelectItem value="Payé">Payé</SelectItem>
                            <SelectItem value="Commander">Commander</SelectItem>
                            <SelectItem value="Complété">Complété</SelectItem>
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
                handlePlaceOrder={() => setShowConfirmOrder(true)}
                isSubmitting={isSubmitting}
              />

              {/* Dialog de confirmation avant envoi à Massibec */}
              <Dialog open={showConfirmOrder} onOpenChange={setShowConfirmOrder}>
                <DialogContent className="bg-white p-6 rounded-md shadow-md max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Confirmer la commande à Massibec</DialogTitle>
                    <DialogDescription>
                      Veuillez lire attentivement avant de confirmer.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 space-y-3 text-gray-700">
                    <p>Parfait, votre commande a été ajustée à 6 unités par caisse. Merci beaucoup !</p>
                    <p className="font-semibold text-amber-600">La boutique sera maintenant fermée, à l'exception des items que vous avez commandés en surplus.</p>
                    <p className="font-bold">Êtes-vous absolument certain de vouloir passer votre commande à Massibec ?</p>
                  </div>
                  <DialogFooter className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={() => setShowConfirmOrder(false)}>
                      Non, pas encore — j'aimerais ajouter quelques items supplémentaires.
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => { setShowConfirmOrder(false); handlePlaceOrder(); }}
                    >
                      Oui, passer la commande
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

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
                    <p className="text-sm text-gray-600">Voici comment effectuer votre paiement à Massibec :</p>

                    {/* ── Virement Interac ── */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-3">💳 Virement Interac</h3>
                      <div className="space-y-2">
                        <p className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-600">Destinataire :</span>
                          <strong>facturation@massibec.com</strong>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard('facturation@massibec.com')}>
                            Copier
                          </Button>
                        </p>
                        <p className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-600">Montant :</span>
                          <strong>{priceToPay} $</strong>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(`${priceToPay}`)}>
                            Copier
                          </Button>
                        </p>
                        <p className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-600">Message :</span>
                          <strong className="font-mono text-xs">@#&*-{school.code}-{newOrderId || 'N/A'}-{name}</strong>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(`@#&*-${school.code}-${newOrderId || ''}-${name}`)}>
                            Copier
                          </Button>
                        </p>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                      ⚠️ IMPORTANT : Effectuez votre paiement avant de quitter cette page. Vous recevrez sous peu un courriel de confirmation (vérifiez vos indésirables).
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
      {/* ── Section : Mes commandes passées (soumises à Massibec) ─────────── */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl">Mes commandes passées à Massibec</CardTitle>
          </div>
          <CardDescription>
            Historique de toutes vos commandes soumises à l'usine Massibec
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPassees ? (
            <p className="text-gray-500 text-center py-6">Chargement…</p>
          ) : commandesPassees.length === 0 ? (
            <p className="text-gray-400 text-center py-6 italic">
              Aucune commande soumise à Massibec pour l'instant.
            </p>
          ) : (
            <div className="space-y-3">
              {commandesPassees.map((c) => {
                const isOpen = expandedPassee[c._id];
                return (
                  <div key={c._id} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                      onClick={() => setExpandedPassee(prev => ({ ...prev, [c._id]: !prev[c._id] }))}
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold text-sm">Commande #{c.orderId}</span>
                        <span className="text-xs text-gray-500">
                          {c.timestamp ? new Date(c.timestamp).toLocaleDateString('fr-CA') : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-mono">{c.totalUnits} unités</span>
                        <span className="font-bold text-green-700">{Number(c.totalAmount).toFixed(2)} $</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.amountPaid >= c.totalAmount
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {c.amountPaid >= c.totalAmount ? 'Payé ✓' : `Payé: ${Number(c.amountPaid || 0).toFixed(2)} $`}
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-xs">
                          <div className="bg-blue-50 rounded p-2 text-center">
                            <p className="font-bold text-blue-700 text-base">{Number(c.studentBenefit || 0).toFixed(2)} $</p>
                            <p className="text-gray-500">Votre bénéfice</p>
                          </div>
                          <div className="bg-purple-50 rounded p-2 text-center">
                            <p className="font-bold text-purple-700 text-base">{Number(c.raffleBenefit || 0).toFixed(2)} $</p>
                            <p className="text-gray-500">Bénéf. tirage</p>
                          </div>
                          <div className="bg-orange-50 rounded p-2 text-center">
                            <p className="font-bold text-orange-700 text-base">{Number(c.organizationBenefit || 0).toFixed(2)} $</p>
                            <p className="text-gray-500">Bénéf. organisation</p>
                          </div>
                        </div>

                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 border-b text-xs">
                              <th className="pb-1">Produit</th>
                              <th className="pb-1 text-right">Qté</th>
                              <th className="pb-1 text-right">Prix unit.</th>
                              <th className="pb-1 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(c.products || []).map((p, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-1 flex items-center gap-1">
                                  <Package className="h-3 w-3 text-gray-400" /> {p.productName}
                                </td>
                                <td className="py-1 text-right font-mono">{p.quantity}</td>
                                <td className="py-1 text-right font-mono">{Number(p.price || 0).toFixed(2)} $</td>
                                <td className="py-1 text-right font-mono font-medium">
                                  {(Number(p.price || 0) * p.quantity).toFixed(2)} $
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
