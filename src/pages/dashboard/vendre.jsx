// pages/dashboard/vendre.jsx - Version Production Ready
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import PDFGenerator from '../../components/SalesTools/PDFGenerator';
import QRCodeGenerator from '../../components/SalesTools/QRCodeGenerator';
import ClientManager from '../../components/SalesTools/ClientManager';
import EmailCampaign from '../../components/SalesTools/EmailCampaign';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Users,
  Facebook,
  Instagram,
  Music,
  Copy,
  Target,
  Gift,
  Eye,
  CheckCircle,
  Lightbulb
} from 'lucide-react';

export default function VendrePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [storeInfo, setStoreInfo] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [salesStats, setSalesStats] = useState({ total: 0, thisMonth: 0, growth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchStoreInfo();
    }
  }, [session]);

  useEffect(() => {
    if (storeInfo?.storeId) {
      fetchClients();
      fetchSalesStats();
    }
  }, [storeInfo]);

  const fetchStoreInfo = async () => {
    try {
      const response = await fetch('/api/get-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      });
      const data = await response.json();
      setStoreInfo(data);
    } catch (error) {
      console.error('Error fetching store info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`/api/clients?storeId=${storeInfo.storeId}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchSalesStats = async () => {
    try {
      const response = await fetch(`/api/sales-stats?storeId=${storeInfo.storeId}`);
      if (response.ok) {
        const data = await response.json();
        setSalesStats(data);
      }
    } catch (error) {
      console.error('Error fetching sales stats:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copié dans le presse-papiers !');
  };

  const socialTemplates = {
    facebook: [
      {
        text: "🍰 Nouvelle campagne de financement ! Commandez vos délicieuses tartes Massibec et soutenez notre école. Livraison gratuite ! #Massibec #Financement #École",
        tip: "Partagez sur votre mur et dans les groupes locaux"
      },
      {
        text: "🎯 Objectif: 1000 tartes vendues ! Aidez-nous à atteindre notre but en commandant vos tartes préférées. Chaque commande compte ! #Objectif #Tartes #École",
        tip: "Créez un événement Facebook pour votre campagne"
      },
      {
        text: "❤️ Merci à tous ceux qui ont déjà commandé ! Il nous reste encore quelques jours pour atteindre notre objectif. Commandez maintenant et soutenez notre école ! #Merci #Soutien",
        tip: "Taguez les personnes qui ont commandé pour les remercier"
      }
    ],
    instagram: [
      {
        text: "✨ Nouvelle collection de tartes Massibec disponible ! Swipe pour voir nos délicieux produits 👆 Commandez maintenant et soutenez notre école 🏫 #Massibec #Tartes #École",
        tip: "Créez un carrousel avec photos des produits"
      },
      {
        text: "📸 Behind the scenes de notre campagne de financement ! Regardez comment nous préparons vos commandes avec amour ❤️ Commandez maintenant ! #BehindTheScenes #Massibec",
        tip: "Partagez en Story avec un sticker de lien"
      },
      {
        text: "🎉 CONCOURS ! Partagez cette publication en story et taguez 3 amis pour gagner une tarte gratuite ! Tirage dans 48h 🍰 #Concours #Massibec #Giveaway",
        tip: "Organisez un concours pour augmenter la visibilité"
      }
    ],
    tiktok: [
      {
        text: "POV: Tu découvres les meilleures tartes de ta vie 🥧✨ Commandez maintenant et soutenez notre école ! Lien en bio #Massibec #Tartes #École #Financement",
        tip: "Filmez une vidéo de dégustation authentique"
      },
      {
        text: "Cette école vend des tartes et c'est génial ! 🎓🍰 Voici pourquoi vous devriez commander 👇 #École #Tartes #Massibec #Financement",
        tip: "Créez une vidéo avec musique tendance"
      },
      {
        text: "Jour 1 de ma campagne de financement vs Jour 30 😱 Regardez notre progression ! #Transformation #Financement #École",
        tip: "Montrez votre évolution et vos résultats"
      }
    ]
  };

  if (loading) {
    return (
      <Layout className="pt-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    router.push('/connexion');
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 mt-2 sm:mb-8 sm:mt-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Outils de Vente
          </h1>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Boostez vos ventes avec nos outils marketing prêts à utiliser</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Ventes Total</CardTitle>
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{salesStats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">commandes</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Ce Mois</CardTitle>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{salesStats.thisMonth}</div>
              <p className="text-xs text-muted-foreground mt-1">commandes</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Croissance</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${salesStats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {salesStats.growth >= 0 ? '+' : ''}{salesStats.growth}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">vs mois dernier</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Clients</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">{clients.length}</div>
              <p className="text-xs text-muted-foreground mt-1">dans votre base</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="marketing" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="marketing" className="text-xs sm:text-sm">🎨 Marketing</TabsTrigger>
            <TabsTrigger value="clients" className="text-xs sm:text-sm">👥 Clients</TabsTrigger>
            <TabsTrigger value="social" className="text-xs sm:text-sm">📱 Réseaux</TabsTrigger>
            <TabsTrigger value="tips" className="text-xs sm:text-sm">💡 Conseils</TabsTrigger>
          </TabsList>

          {/* Marketing Tab */}
          <TabsContent value="marketing" className="space-y-4 sm:space-y-6">
            {/* PDF Generator prend toute la largeur car il a sa propre grille 2 colonnes */}
            <PDFGenerator storeInfo={storeInfo} products={null} />
            
            {/* QR Code Generator en dessous */}
            <QRCodeGenerator storeInfo={storeInfo} />

            {/* Marketing Tips */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-purple-600" />
                  Stratégies Marketing Gagnantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-bold">1</span>
                      </div>
                      <h4 className="font-semibold">Réseaux Sociaux</h4>
                    </div>
                    <p className="text-sm text-gray-600">Publiez quotidiennement sur Facebook, Instagram et TikTok avec nos templates</p>
                  </div>
                  
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-green-600 font-bold">2</span>
                      </div>
                      <h4 className="font-semibold">Email Marketing</h4>
                    </div>
                    <p className="text-sm text-gray-600">Envoyez des emails personnalisés à vos anciens clients chaque semaine</p>
                  </div>
                  
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-purple-600 font-bold">3</span>
                      </div>
                      <h4 className="font-semibold">Affichage Local</h4>
                    </div>
                    <p className="text-sm text-gray-600">Imprimez et affichez vos PDF dans des lieux stratégiques de votre quartier</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <EmailCampaign 
                selectedClients={selectedClients}
                storeId={storeInfo?.storeId}
                onSuccess={() => {
                  setSelectedClients([]);
                  fetchClients();
                }}
              />
              
              <Card>
                <CardHeader>
                  <CardTitle>Clients Sélectionnés</CardTitle>
                  <CardDescription>
                    {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''} sélectionné{selectedClients.length > 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedClients.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">Sélectionnez des clients ci-dessous pour envoyer des emails</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clients.filter(c => selectedClients.includes(c._id)).map(client => (
                        <div key={client._id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-gray-600">{client.email}</p>
                          </div>
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <ClientManager 
              clients={clients}
              storeId={storeInfo?.storeId}
              onRefresh={fetchClients}
            />
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Facebook */}
              <Card>
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardTitle className="flex items-center">
                    <Facebook className="h-5 w-5 mr-2" />
                    Facebook
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    Posts pour votre mur et groupes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {socialTemplates.facebook.map((template, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm mb-2">{template.text}</p>
                      <div className="flex items-start space-x-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-600">{template.tip}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(template.text)}
                        className="w-full"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Instagram */}
              <Card>
                <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                  <CardTitle className="flex items-center">
                    <Instagram className="h-5 w-5 mr-2" />
                    Instagram
                  </CardTitle>
                  <CardDescription className="text-pink-100">
                    Stories et posts attractifs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {socialTemplates.instagram.map((template, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm mb-2">{template.text}</p>
                      <div className="flex items-start space-x-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-600">{template.tip}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(template.text)}
                        className="w-full"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* TikTok */}
              <Card>
                <CardHeader className="bg-gradient-to-r from-gray-800 to-black text-white">
                  <CardTitle className="flex items-center">
                    <Music className="h-5 w-5 mr-2" />
                    TikTok
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Contenu viral pour jeunes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {socialTemplates.tiktok.map((template, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm mb-2">{template.text}</p>
                      <div className="flex items-start space-x-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-600">{template.tip}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(template.text)}
                        className="w-full"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-600">
                    <Target className="h-5 w-5 mr-2" />
                    Maximiser Vos Ventes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Publiez sur les réseaux sociaux tous les jours</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Envoyez des emails de relance chaque semaine</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Affichez vos PDF dans des lieux publics</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Partagez votre QR code partout</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Organisez des concours sur les réseaux sociaux</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader>
                  <CardTitle className="flex items-center text-purple-600">
                    <Gift className="h-5 w-5 mr-2" />
                    Idées Créatives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Créez un défi TikTok avec vos produits</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Offrez une tarte gratuite pour 5 commandes</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Filmez des témoignages de clients satisfaits</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Créez un compte à rebours pour la fin de campagne</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Partagez votre progression vers l'objectif</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Plan d'Action Hebdomadaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { day: 'Lundi', action: 'Envoyez des emails à vos clients' },
                    { day: 'Mardi', action: 'Publiez sur Facebook et Instagram' },
                    { day: 'Mercredi', action: 'Créez une vidéo TikTok' },
                    { day: 'Jeudi', action: 'Partagez votre QR code en story' },
                    { day: 'Vendredi', action: 'Relancez les clients qui n\'ont pas commandé' },
                    { day: 'Samedi', action: 'Organisez un concours sur les réseaux' },
                    { day: 'Dimanche', action: 'Planifiez la semaine suivante' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                      <div className="w-24 font-semibold text-orange-600">{item.day}</div>
                      <div className="flex-1 text-sm">{item.action}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
