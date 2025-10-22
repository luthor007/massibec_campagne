import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Mail, Facebook, MessageSquare, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const ParentLetterModal = ({ isOpen, onClose, campaign, school }) => {
  const [copiedSection, setCopiedSection] = useState(null);

  if (!campaign || !school) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('fr-CA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = async (text, section) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      toast.success(`${section} copié dans le presse-papiers !`);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      toast.error('Erreur lors de la copie');
    }
  };

  const parentLetter = `✉️ Lettre aux parents
Entête de l'école   Modifier au minimum les textes surligné en jaune

Objet : Campagne de financement avec les produits Massibec

Chers parents,

Notre école est heureuse de s'associer à Massibec pour une campagne de financement délicieuse et innovante ! Cette initiative vise à financer le projet ${school.name}, tout en vous permettant d'offrir à vos proches des produits de qualité pour le temps des Fêtes. Elle représente aussi une belle occasion pour vos enfants de vivre une expérience entrepreneuriale formatrice et motivante… tout en mettant un peu d'argent dans vos poches.

👉 Pourquoi participer ?
• Exclusifs : les pâtés à la viande et au poulet Massibec, disponibles uniquement via les campagnes de financement.
• Populaires et faciles à vendre : les tartes Massibec, offertes aussi en magasin, reconnues et très appréciées depuis plusieurs années.
• 100 % en ligne : commandes rapides, sécuritaires et pratiques.
• Profits directs : chaque vente rapporte à votre enfant et au projet de l'école, en plus de donner accès aux tirages.

✨ Cette campagne est aussi une occasion pour les jeunes de développer leurs habiletés en communication et en vente, de renforcer leur confiance et leur persévérance — une expérience valorisante pour l'avenir.

🔹 Exemple de profit (pâté à la viande vendu 10 $)
• ${campaign.profitSplits?.[0]?.student || '2,00'} $ pour l'élève (+ possibilité de pourboire : 2 $, 5 $ ou autre, via la boutique en ligne)
• ${campaign.profitSplits?.[0]?.school || '0,75'} $ pour l'école
• ${campaign.profitSplits?.[0]?.raffle || '0,25'} $ pour les tirages

🔹 Fonctionnement du tirage
Chaque lot de 6 produits vendus = 1 coupon de tirage
La cagnotte correspond à ${campaign.profitSplits?.[0]?.raffle || '0,25'} $ par produit vendu, divisée en 4 prix
Exemple : 4000 produits × ${campaign.profitSplits?.[0]?.raffle || '0,25'} $ = 1000 $ → 4 prix de 250 $

💡 Astuce : proposez à vos clients de faire leur provision pour l'hiver et d'acheter des caisses complètes de 6 produits. Ceci maximisera vos ventes et vos chances de gagner un des 4 gros lot.

🔹 Procédure de participation
Inscription : https://www.campagne.massibec.com/ → « Je suis un élève » → code école : ${school.code}. Pour le nom du parent, SVP inscrir le nom de celui qui gérera les transferts interac. Ce sera aussi ce nom qui sera inscrit sur votre bon de commande et vos caisses lors de la distribution. Confirmer votre inscription par la réception du courriel. Vérifier vos courriers indésirables au besoin.

Tableau de bord : votre boutique comporte 5 onglets :
• Personnalisation de la boutique : Pour que votre boutique s'active, vous devez ajuster le nom de votre boutique, votre message d'accueil, vos informations de paiement Interac et choisir si vous activez le rabais de 5 % sur les boîtes de 6 produits ou plus. Vous y verrez aussi les coûts et prix de vente des produits.
• Voir ma boutique : visualisez votre boutique et partagez facilement son lien (Facebook, Instagram, courriel, etc.). Vos clients pourront acheter directement en ligne.
 → Le système enregistrera automatiquement vos ventes, enverra une confirmation à vos clients par courriel en vous mettant en CC, suggère le paiement en ligne par interac et propose même de vous laisser un petit pourboire 😉.
• Outil de vente: Divers outils sont mis à votre disposition pour mousser vos ventes. Amusez-vous à faire du marketing avec votre enfants et à voir les réponses de vos clients.
• Mes commandes : lorsqu'une commande est placée par vos clients, le statut est mis En attente. Dès réception du paiement, nous vous suggérons de changer le statut à Payée.
IMPORTANT: Il vous faudra passer la commande finale : le ${formatDate(campaign.endDate)}, (Entre minuit et 10h AM). Ceci dans le but de faciliter la vérification des commandes et des paiements pour chaque école par Massibec. Chaque école a comme vous une plage de commande à une date et heure prédéterminée. 
Donc pour ce faire vous aurez à cliquez sur Passer ma commande à Massibec.
⚠️ Toutes vos commandes doivent être au statut Payée avant l'envoi.
 → Lors de l'envoi, vous recevrez les instructions pour effectuer le paiement Interac immédiatement ainsi qu'une confirmation par courriel.
 → Le profit et le pourboire restent dans votre compte, tandis que Massibec remettra directement à l'organisation la part prévue pour l'organisation et les tirages.

• Statistiques : la page Statistiques vous permet de :
- comparer vos résultats avec les autres participants
- suivre vos ventes en temps réel,
- rester motivé tout au long de la campagne.

Tirage : les coupons seront remis le ${formatDate(campaign.endDate)} et le tirage se tiendra le ${formatDate(campaign.endDate)}. 🎉 Bonne chance à tous !

🔹 Livraison et distribution
Livraison prévue à l'école le ${formatDate(campaign.deliveryDate)} à ${formatTime(campaign.deliveryDate)}.

Les produits seront identifiés avec votre numéro de commande et le nom du parent.
Merci d'apporter votre confirmation reçue par courriel.
Les caisses seront aussi numérotées (ex. : 1/10, 2/10, 3/10) et chaque étiquette détaillera les produits inclus dans la boîte.
⚠️ Vérifiez le contenu de votre commande avant de quitter l'école.
 → En cas d'erreur, avisez immédiatement le responsable de la campagne afin qu'un suivi soit fait avec Massibec (remboursement, échange ou relivraison).

IMPORTANT – Optimisation de la préparation des commandes
Afin d'éviter les erreurs et de maximiser l'efficacité lors de la préparation des commandes, nous vous demandons de former autant que possible des caisses complètes de 6 unités par produit.
Par exemple :
• 6 tartes aux fraises
• 12 tartes au sucre
• 6 pâtés à la viande
etc.

👉 Il est recommandé de commander quelques produits supplémentaires afin de combler les erreurs, les ajouts ou les commandes de dernière minute. Ainsi, nous vous suggérons de passer vos propres commandes à la fin de la campagne afin de balancer vos caisses avec les produits manquants pour les compléter à 6 par caisse. Nous vous remercions sincèrement de votre précieuse collaboration.

🔹 Message Facebook / courriel prêt à partager
⚠️ Exemple de message à envoyer à vos clients potentiels :
(Nous vous suggérons de préparer une liste de contacts et d'envoyer ce message au maximum de personnes.)

🎉 Bonjour chers amis !
Je participe à la campagne de financement de l'école de mon enfant avec Massibec.
Vous pouvez commander en ligne leurs délicieux pâtés à la viande et au poulet (exclusifs aux campagnes) ainsi que leurs fameuses tartes.

👉 Une partie des profits va au projet ${school.name} de l'école et une autre directement à mon enfant.
👉 Paiements simples, gratuits et sécurisés par Interac.
👉 Profitez d'un rabais de 5 % à l'achat de 6 produits ou plus.

Merci de communiquer avec moi pour prévoir la livraison le ${formatDate(campaign.deliveryDate)}, puis passez votre commande directement sur ma boutique :
[LIEN DE VOTRE BOUTIQUE]

🙏 Merci pour votre soutien et votre participation !

Merci à tous de votre attention et bonne campagne !
L'équipe de ${school.name}`;

  const facebookMessage = `🎉 Bonjour chers amis !
Je participe à la campagne de financement de l'école de mon enfant avec Massibec.
Vous pouvez commander en ligne leurs délicieux pâtés à la viande et au poulet (exclusifs aux campagnes) ainsi que leurs fameuses tartes.

👉 Une partie des profits va au projet ${school.name} de l'école et une autre directement à mon enfant.
👉 Paiements simples, gratuits et sécurisés par Interac.
👉 Profitez d'un rabais de 5 % à l'achat de 6 produits ou plus.

Merci de communiquer avec moi pour prévoir la livraison le ${formatDate(campaign.deliveryDate)}, puis passez votre commande directement sur ma boutique :
[LIEN DE VOTRE BOUTIQUE]

🙏 Merci pour votre soutien et votre participation !`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-2 border-gray-200">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-6 w-6 text-blue-600" />
            <span>Lettre aux parents - Campagne #{campaign.campaignNumber}</span>
          </DialogTitle>
          <DialogDescription>
            Voici votre lettre aux parents personnalisée avec les informations de votre campagne. 
            Vous pouvez la copier et l'envoyer aux parents de vos élèves.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations de la campagne</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">École:</span> {school.name}
                </div>
                <div>
                  <span className="font-medium">Code école:</span> {school.code}
                </div>
                <div>
                  <span className="font-medium">Fin de campagne:</span> {formatDate(campaign.endDate)}
                </div>
                <div>
                  <span className="font-medium">Livraison:</span> {formatDate(campaign.deliveryDate)}
                </div>
                <div>
                  <span className="font-medium">Objectif:</span> ${campaign.financialGoal}
                </div>
                <div>
                  <span className="font-medium">Statut:</span> 
                  <Badge className="ml-2" variant="outline">
                    {campaign.status === 'pending_approval' ? 'En attente' : campaign.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Copy Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => copyToClipboard(parentLetter, 'Lettre complète')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {copiedSection === 'Lettre complète' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>Copier la lettre complète</span>
            </Button>
            
            <Button
              onClick={() => copyToClipboard(facebookMessage, 'Message Facebook')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {copiedSection === 'Message Facebook' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Facebook className="h-4 w-4" />
              )}
              <span>Copier le message Facebook</span>
            </Button>
          </div>

          {/* Letter Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Aperçu de la lettre</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {parentLetter}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-bold">💡</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Instructions importantes :</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Modifiez au minimum les textes surlignés en jaune dans la lettre</li>
                    <li>• Cette lettre sera aussi disponible dans la "Vue d'ensemble" de votre campagne</li>
                    <li>• Partagez le code école ({school.code}) avec les parents pour l'inscription</li>
                    <li>• Encouragez les parents à commander des caisses complètes de 6 produits</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={onClose} className="px-8">
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParentLetterModal;
