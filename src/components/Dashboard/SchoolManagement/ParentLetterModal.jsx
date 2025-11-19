import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Mail, Facebook, MessageSquare, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { getTerminology } from '@/utils/organizationHelpers';
import { getDateStringInTimezone } from '@/utils/dateHelpers';

const ParentLetterModal = ({ isOpen, onClose, campaign, school }) => {
  const [copiedSection, setCopiedSection] = useState(null);

  if (!campaign || !school) return null;

  // Get terminology based on organization type
  const organizationType = school?.organizationType || campaign?.organizationType || 'school';
  const terminology = getTerminology(organizationType);

  const QUEBEC_TIMEZONE = 'America/Montreal';

  const formatDateWithTimezone = (date) => {
    if (!date) return '';

    try {
      const dateObj = new Date(date);
      if (Number.isNaN(dateObj.getTime())) return '';

      // Use UTC methods to extract date components directly
      // This avoids timezone conversion issues when dates are stored as UTC midnight
      const year = dateObj.getUTCFullYear();
      const month = dateObj.getUTCMonth(); // 0-11
      const day = dateObj.getUTCDate();

      const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

      return `${day} ${months[month]} ${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const formatDate = (date) => formatDateWithTimezone(date);

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

  const getTodayDate = () => {
    return new Date().toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get profit splits and price for meat pie product (or first product if not found)
  const getMeatPieProductInfo = () => {
    let productInfo = {
      price: 12.00, // Default meat pie price
      studentCash: 2.00,
      studentSchoolAccount: 2.00,
      schoolProject: 0.75,
      raffle: 0.25
    };

    // Try to find meat pie product by name in profitSplits
    if (campaign.profitSplits && campaign.profitSplits.length > 0) {
      // First, try to find meat pie by checking product name
      let meatPieSplit = null;

      // Check all profitSplits to find meat pie (we need to match by product name)
      // Since we have populated productId, check if we can find it
      for (const split of campaign.profitSplits) {
        const productId = split.productId?._id?.toString() || split.productId?.toString();
        const productName = split.productId?.name || '';

        // Check if this is the meat pie (pâté à la viande)
        if (productName.toLowerCase().includes('pâté') && productName.toLowerCase().includes('viande')) {
          meatPieSplit = split;

          // Get custom price if available
          const customPrice = campaign.customPrices?.find(cp => {
            const cpProductId = cp.productId?._id?.toString() || cp.productId?.toString();
            return cpProductId === productId;
          });

          productInfo.price = customPrice?.price || split.productId?.price || 12.00;
          productInfo.studentCash = split.studentCash !== undefined && split.studentCash !== null ? split.studentCash : 2.00;
          productInfo.studentSchoolAccount = split.studentSchoolAccount !== undefined && split.studentSchoolAccount !== null ? split.studentSchoolAccount : 0;
          productInfo.schoolProject = split.schoolProject !== undefined && split.schoolProject !== null ? split.schoolProject : 0.75;
          productInfo.raffle = split.raffle !== undefined && split.raffle !== null ? split.raffle : 0.25;
          break;
        }
      }

      // If meat pie not found, use first product
      if (!meatPieSplit && campaign.profitSplits[0]) {
        const firstSplit = campaign.profitSplits[0];
        const productId = firstSplit.productId?._id?.toString() || firstSplit.productId?.toString();

        // Get custom price if available
        const customPrice = campaign.customPrices?.find(cp => {
          const cpProductId = cp.productId?._id?.toString() || cp.productId?.toString();
          return cpProductId === productId;
        });

        productInfo.price = customPrice?.price || firstSplit.productId?.price || 12.00;
        productInfo.studentCash = firstSplit.studentCash !== undefined && firstSplit.studentCash !== null ? firstSplit.studentCash : 2.00;
        productInfo.studentSchoolAccount = firstSplit.studentSchoolAccount !== undefined && firstSplit.studentSchoolAccount !== null ? firstSplit.studentSchoolAccount : 0;
        productInfo.schoolProject = firstSplit.schoolProject !== undefined && firstSplit.schoolProject !== null ? firstSplit.schoolProject : 0.75;
        productInfo.raffle = firstSplit.raffle !== undefined && firstSplit.raffle !== null ? firstSplit.raffle : 0.25;
      }
    }

    return productInfo;
  };

  const productInfo = getMeatPieProductInfo();
  const profit = {
    studentCash: productInfo.studentCash,
    studentSchoolAccount: productInfo.studentSchoolAccount,
    schoolProject: productInfo.schoolProject,
    raffle: productInfo.raffle
  };
  const examplePrice = productInfo.price;
  const totalProfit = profit.studentCash + profit.studentSchoolAccount + profit.schoolProject + profit.raffle;

  // Student donation split percentages
  const studentCashPercentage = campaign.donationsForStudents?.splitConfig?.studentCash || 40;
  const studentAccountPercentage = campaign.donationsForStudents?.splitConfig?.studentAccount || 60;

  // Get donation presets (only if enabled)
  const studentDonationPresets = campaign.donationsForStudents?.enabled
    ? (campaign.donationsForStudents?.presets || [2, 5, 10, 20, 30])
    : [];
  const schoolDonationPresets = campaign.donationsForSchool?.enabled
    ? (campaign.donationsForSchool?.presets || [2, 5, 10, 20, 30])
    : [];

  // Check if any donations are enabled
  const studentDonationsEnabled = campaign.donationsForStudents?.enabled ?? false;
  const schoolDonationsEnabled = campaign.donationsForSchool?.enabled ?? false;
  const anyDonationsEnabled = studentDonationsEnabled || schoolDonationsEnabled;

  // Format order dates and times
  const formatDateLong = (date) => formatDateWithTimezone(date);

  // Format order time range
  const orderTimeRange = "minuit et midi";

  // Build profit example with conditional donation mentions
  const buildProfitExample = () => {
    let example = `Exemple de répartition du profit
(sur un pâté à la viande vendu ${examplePrice.toFixed(2)} $)
${profit.studentCash.toFixed(2)} $ comptant pour le/la ${terminology.participant}`;

    // Add student donation mention only if enabled
    if (studentDonationsEnabled && studentDonationPresets.length > 0) {
      const filteredPresets = studentDonationPresets.filter(p => p > 0);
      if (filteredPresets.length > 0) {
        example += ` (+ don proposé au moment du paiement : ${filteredPresets.join(' $, ')} $ ou autre)`;
      }
    }

    example += `.
${profit.studentSchoolAccount.toFixed(2)} $ crédité dans le compte ${terminology.organization} du/de la ${terminology.participant}.
${profit.schoolProject.toFixed(2)} $ pour les projets de ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization}`;

    // Add school donation mention only if enabled
    if (schoolDonationsEnabled && schoolDonationPresets.length > 0) {
      const filteredPresets = schoolDonationPresets.filter(p => p > 0);
      if (filteredPresets.length > 0) {
        example += ` (+ possibilité de don : ${filteredPresets.join(' $, ')} $ ou autre)`;
      }
    }

    example += `.
${profit.raffle.toFixed(2)} $ pour les tirages.

Total des profits répartis : ${totalProfit.toFixed(2)} $`;

    // Add donation tip only if any donations are enabled
    if (anyDonationsEnabled) {
      example += `
💡 Astuce : la plateforme permet de recueillir facilement des dons pour soutenir à la fois votre enfant et ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization}.
En partageant votre boutique à vos proches, vous maximisez vos ventes, vos dons et vos profits!`;
    } else {
      example += `
En partageant votre boutique à vos proches, vous maximisez vos ventes et vos profits!`;
    }

    return example;
  };

  // Build donation section only if any donations are enabled
  const buildDonationSection = () => {
    if (!anyDonationsEnabled) {
      return '';
    }

    let section = `\n\nExplication des dons\n`;

    if (studentDonationsEnabled && schoolDonationsEnabled) {
      // Both enabled
      section += `Les dons recueillis lors des ventes seront versés en partie à Massibec, qui se chargera ensuite de remettre les montants destinés à ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization}.
Ainsi, vous conserverez dans votre compte une portion des dons ${terminology.participants} — soit ${studentCashPercentage} %, tandis que ${studentAccountPercentage} % sera transférée à Massibec, puis reversée à ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization} afin d'être ajoutée au compte de votre enfant.
Quant aux dons que vous récolterez pour ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization}, vous devrez les transférer à 100 % à Massibec, qui les reversera ensuite à ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization}.`;
    } else if (studentDonationsEnabled) {
      // Only student donations enabled
      section += `Les dons recueillis lors des ventes seront versés en partie à Massibec, qui se chargera ensuite de remettre les montants destinés à ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization}.
Ainsi, vous conserverez dans votre compte une portion des dons ${terminology.participants} — soit ${studentCashPercentage} %, tandis que ${studentAccountPercentage} % sera transférée à Massibec, puis reversée à ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization} afin d'être ajoutée au compte de votre enfant.`;
    } else if (schoolDonationsEnabled) {
      // Only school donations enabled
      section += `Les dons recueillis lors des ventes pour ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization} devront être transférés à 100 % à Massibec, qui les reversera ensuite à ${terminology.organization === 'école' ? "l'" : "l'"}${terminology.organization}.`;
    }

    section += `
Le détail complet de ces répartitions, incluant les dons et les montants à remettre, sera clairement indiqué au moment où vous passerez votre commande à Massibec, et pourra être suivi en tout temps dans l'onglet Statistiques de votre tableau de bord.`;

    return section;
  };

  const parentLetter = `


${getTodayDate()}

Chers parents,
Notre ${terminology.organization === 'école' ? "école" : "organisation"} est heureuse de s'associer à Massibec pour une campagne de financement à la fois délicieuse et innovante, qui se déroulera du ${formatDateLong(campaign.startDate)} au ${formatDateLong(campaign.endDate)}, avec une distribution des produits prévue le ${formatDateLong(campaign.deliveryDate)} entre ${campaign.distributionStartHour || 'heure_distribution_début'} et ${campaign.distributionEndHour || 'heure_distribution_fin'}${school.distributionLocation ? ` à ${school.distributionLocation}` : ` à ${terminology.organization === 'école' ? "l'école" : "l'organisation"}`}.
Cette initiative vise à financer les projets de ${terminology.organization === 'école' ? "l'école" : "l'organisation"} et des ${terminology.participants}, tout en offrant à vos proches des produits de qualité pour le temps des Fêtes.
Elle représente aussi une belle occasion pour vos enfants de vivre une expérience entrepreneuriale enrichissante et motivante, tout en générant un petit revenu supplémentaire. 💪

Pourquoi y participer ?
Exclusifs : les pâtés à la viande et au poulet Massibec — disponibles uniquement via les campagnes de financement.
Populaires et faciles à vendre : les tartes Massibec, offertes aussi en magasin, reconnues et appréciées depuis plusieurs années.
100 % en ligne : commandes rapides, sécuritaires et pratiques.
Profits directs : chaque vente rapporte à votre enfant et au projet de ${terminology.organization === 'école' ? "l'école" : "l'organisation"}, tout en donnant accès aux tirages.
Cette campagne est aussi une belle occasion pour les jeunes de développer leurs habiletés en communication et en vente, de renforcer leur confiance et leur persévérance — une expérience valorisante pour leur avenir.

${buildProfitExample()}${buildDonationSection()}

Fonctionnement du tirage
Chaque lot de 6 produits vendus = 1 coupon de tirage.
La cagnotte correspond à ${profit.raffle.toFixed(2)} $ par produit vendu, divisée en 4 prix.
Exemple : 4000 produits × ${profit.raffle.toFixed(2)} $ = ${(4000 * profit.raffle).toFixed(2)} $ → 4 prix de ${(4000 * profit.raffle / 4).toFixed(2)} $.
Astuce : proposez à vos clients d'acheter des caisses complètes de 6 produits — cela maximise vos ventes et vos chances de gagner un des 4 grands prix! 🎁

Procédure de participation
1. Inscription
https://campagne.massibec.com/
Cliquez sur « Je suis ${terminology.participant === 'étudiant' ? 'un élève' : 'un membre'} ».
Pour le nom du parent, inscrivez celui de la personne qui gérera les transferts Interac.
Ce nom apparaîtra également sur vos bons de commande et sur vos caisses lors de la distribution.
Confirmez votre inscription en vérifiant le courriel reçu (jetez un coup d'œil à vos courriers indésirables au besoin).
Les deux parents peuvent s'inscrire s'ils souhaitent gérer les ventes séparément :
Par exemple, un parent peut vendre pour un des enfants et l'autre pour le second — ou tous deux pour le même, selon votre préférence. Mais nous vous suggérons tout de même de gérer qu'une seule plateforme autant que possible. Ce sera plus facile de combler des caisses complètes à la fin de la campagne.
Une fois inscrit, entrez dans votre plateforme et ajoutez la campagne en entrant le code suivant :
 → Code de campagne : ${campaign.campaignCode || `${school.code}-C${campaign.campaignNumber || 1}`}

2. Tableau de bord
Votre boutique comporte 6 onglets principaux :
Personnalisation : Pour que votre boutique s'active, vous devez ajuster le nom de votre boutique, votre message d'accueil, vos informations de paiement Interac et choisir si vous activez le rabais de 5 % sur les boîtes de 6 produits ou plus. Puis enregistrez vos modifications. Le rabais fera diminuer quelque peu votre profit par produit mais augmentera beaucoup vos ventes donc vos profits global.

Voir ma boutique : visualisez votre boutique et partagez facilement votre lien (Facebook, Instagram, courriel, etc.).
Le système enregistre automatiquement vos ventes, envoie une confirmation par courriel (en vous mettant en copie), suggère le paiement Interac et propose même un petit don. 😉

Outils de vente : explorez les outils pour mousser vos ventes et amusez-vous à faire du marketing avec votre enfant. Vos clients entrer dans la plateforme vous seront utiles lors de vos prochaines campagnes.

Mes commandes : suivez le statut de vos commandes clients.
Assurez-vous que toutes vos commandes soient marquées comme « Payé » avant de soumettre votre commande finale à Massibec.

Commande finale
Date de commande : ${formatDateLong(campaign.endDate)} entre ${orderTimeRange}.
Cette étape est essentielle pour la vérification des commandes et des paiements par Massibec.
Cliquez sur « Passer ma commande à Massibec » une fois toutes vos ventes confirmées comme payées.
Astuce : mettez-vous un rappel sur votre cellulaire pour ne pas oublier cette étape.
Vous recevrez ensuite les instructions pour le paiement Interac et une confirmation par courriel.
Comme mentionné plus haut, vous conserverez une partie des profits${anyDonationsEnabled ? ' et des dons' : ''}.
Les montants dus à Massibec couvriront le coût des produits, ainsi que la part des profits${anyDonationsEnabled ? ' et des dons' : ''} qui seront déposés dans le compte ${terminology.participant}${schoolDonationsEnabled ? `, en plus des dons destinés à ${terminology.organization === 'école' ? "l'école" : "l'organisation"}` : ''}.

Statistiques
L'onglet Statistiques vous permet de :
suivre vos ventes, profits${anyDonationsEnabled ? ' et dons' : ''} en temps réel ;
comparer vos résultats avec d'autres participants ;
rester motivé tout au long de la campagne.

Détails de la campagne
Consultez les dates importantes, les produits à vendre, leurs coûts, les prix de vente (à prix régulier) et la répartition des profits.

Livraison et distribution
Livraison prévue à ${terminology.organization === 'école' ? "l'école" : "l'organisation"} le ${formatDateLong(campaign.deliveryDate)}
Distribution entre ${campaign.distributionStartHour || 'heure_début'} et ${campaign.distributionEndHour || 'heure_fin'}
Les produits seront identifiés avec votre numéro de commande et le nom du parent.
Merci d'apporter votre confirmation reçue par courriel lors de la distribution.
Les caisses seront numérotées (ex. : 1/10, 2/10, 3/10) et chaque étiquette détaillera les produits inclus.
Vérifiez le contenu de votre commande avant de quitter ${terminology.organization === 'école' ? "l'école" : "l'organisation"}.
En cas d'erreur, avisez immédiatement le responsable de la campagne afin qu'un suivi soit effectué (remboursement, échange ou relivraison).

Optimisation de la préparation des commandes
Afin de faciliter la préparation et d'éviter les erreurs, merci de former autant que possible des caisses complètes de 6 unités par produit.
Exemples :
6 tartes aux fraises
12 tartes au sucre
6 pâtés à la viande
Astuce : il est recommandé de commander quelques produits supplémentaires afin de combler les erreurs, les ajouts ou les commandes de dernière minute.
Nous vous suggérons de passer vos propres commandes à la fin de la campagne dans votre boutique pour compléter vos caisses à 6 unités.
Merci sincèrement de votre précieuse collaboration.

En conclusion
Inscrivez-vous dès maintenant sur la plateforme et découvrez à quel point il est simple et agréable d'amasser des fonds tout en régalant vos proches! 😋
Merci à tous pour votre participation et bonne campagne de financement! 🎉
L'équipe Massibec et ${terminology.organization === 'école' ? "l'école" : "l'organisation"} ${school.name}`;

  const facebookMessage = `🎉 Bonjour chers amis !
Je participe à la campagne de financement de ${terminology.organization === 'école' ? "l'école" : "l'organisation"} de mon enfant avec Massibec.
Vous pouvez commander en ligne leurs délicieux pâtés à la viande et au poulet (exclusifs aux campagnes) ainsi que leurs fameuses tartes.

👉 Une partie des profits va au projet ${school.name} de ${terminology.organization === 'école' ? "l'école" : "l'organisation"} et une autre directement à mon enfant.
👉 Paiements simples, gratuits et sécurisés par Interac.
👉 Profitez d'un rabais de 5 % à l'achat de 6 produits ou plus.

Merci de communiquer avec moi pour prévoir la livraison le ${formatDate(campaign.deliveryDate)}, puis passez votre commande directement sur ma boutique :
[LIEN DE VOTRE BOUTIQUE]

🙏 Merci pour votre soutien et votre participation !`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-2 border-gray-200 p-3 sm:p-6">
        <DialogHeader className="px-0 sm:px-2">
          <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <span className="break-words">Lettre aux parents - Campagne #{campaign.campaignNumber}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm px-0 sm:px-2">
            Voici votre lettre aux parents personnalisée avec les informations de votre campagne.
            Vous pouvez la copier et l'envoyer aux parents de vos {terminology.participants}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
          {/* Campaign Info */}
          <Card className="overflow-x-hidden">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Informations de la campagne</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="font-medium">{terminology.organizationLabel}:</span> <span className="break-words">{school.name}</span>
                </div>
                <div>
                  <span className="font-medium">Code {terminology.organization}:</span> {school.code}
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
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
            <Button
              onClick={() => copyToClipboard(parentLetter, 'Lettre complète')}
              variant="outline"
              className={`flex items-center justify-center space-x-2 w-full sm:w-auto text-sm sm:text-base transition-all duration-200 ${copiedSection === 'Lettre complète'
                ? 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100'
                : ''
                }`}
            >
              {copiedSection === 'Lettre complète' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="truncate">Copier la lettre complète</span>
            </Button>

            <Button
              onClick={() => copyToClipboard(facebookMessage, 'Message Facebook')}
              variant="outline"
              className={`flex items-center justify-center space-x-2 w-full sm:w-auto text-sm sm:text-base transition-all duration-200 ${copiedSection === 'Message Facebook'
                ? 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100'
                : ''
                }`}
            >
              {copiedSection === 'Message Facebook' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Facebook className="h-4 w-4" />
              )}
              <span className="truncate">Copier le message Facebook</span>
            </Button>
          </div>

          {/* Letter Preview */}
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Aperçu de la lettre</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs sm:text-sm font-mono break-words">
                  {parentLetter}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={onClose} className="px-4 sm:px-8 w-full sm:w-auto">
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParentLetterModal;
