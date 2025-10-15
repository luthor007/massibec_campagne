// pages/dashboard/vendre.jsx
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Share2,
  Mail,
  Users,
  BarChart3,
  QrCode,
  FileText,
  Image,
  MessageSquare,
  Target,
  TrendingUp,
  Gift,
  Calendar,
  Smartphone,
  Facebook,
  Instagram,
  Music,
  Eye,
  Copy,
  Send,
  Plus,
  Edit,
  Trash2,
  CheckCircle
} from 'lucide-react';

export default function VendrePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [storeInfo, setStoreInfo] = useState(null);
  const [clients, setClients] = useState([]);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', notes: '' });
  const [emailTemplate, setEmailTemplate] = useState('');
  const [selectedClients, setSelectedClients] = useState([]);
  const [salesStats, setSalesStats] = useState({ total: 0, thisMonth: 0, growth: 0 });

  useEffect(() => {
    if (session) {
      fetchStoreInfo();
      fetchClients();
      fetchSalesStats();
    }
  }, [session]);

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
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`/api/clients?storeId=${storeInfo?.storeId}`);
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
      const response = await fetch(`/api/sales-stats?storeId=${storeInfo?.storeId}`);
      if (response.ok) {
        const data = await response.json();
        setSalesStats(data);
      }
    } catch (error) {
      console.error('Error fetching sales stats:', error);
    }
  };

  const generateQRCode = () => {
    const storeUrl = `${window.location.origin}/boutique/${storeInfo?.storeId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(storeUrl)}`;
  };

  const downloadMarketingPDF = () => {
    // Générer un PDF avec les produits et QR code
    const pdfContent = {
      storeName: storeInfo?.name || 'Ma Boutique',
      storeUrl: `${window.location.origin}/boutique/${storeInfo?.storeId}`,
      qrCode: generateQRCode(),
      products: [
        { name: 'Tarte aux pommes', price: '12.99$', description: 'Délicieuse tarte aux pommes maison' },
        { name: 'Tarte aux bleuets', price: '13.99$', description: 'Tarte aux bleuets sauvages' },
        { name: 'Tarte aux fraises', price: '14.99$', description: 'Tarte aux fraises fraîches' },
        { name: 'Tarte aux framboises', price: '15.99$', description: 'Tarte aux framboises sucrées' }
      ]
    };
    
    // Ici on pourrait utiliser une librairie comme jsPDF pour générer le PDF
    console.log('Génération du PDF avec:', pdfContent);
    alert('PDF généré ! (Fonctionnalité à implémenter avec jsPDF)');
  };

  const addClient = async () => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClient,
          storeId: storeInfo?.storeId
        }),
      });
      
      if (response.ok) {
        setNewClient({ name: '', email: '', phone: '', notes: '' });
        fetchClients();
      }
    } catch (error) {
      console.error('Error adding client:', error);
    }
  };

  const sendEmailToClients = async () => {
    try {
      const response = await fetch('/api/send-email-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: selectedClients,
          template: emailTemplate,
          storeId: storeInfo?.storeId
        }),
      });
      
      if (response.ok) {
        alert('Emails envoyés avec succès !');
        setSelectedClients([]);
        setEmailTemplate('');
      }
    } catch (error) {
      console.error('Error sending emails:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copié dans le presse-papiers !');
  };

  const socialTemplates = {
    facebook: [
      "🍰 Nouvelle campagne de financement ! Commandez vos délicieuses tartes Massibec et soutenez notre école. Livraison gratuite ! #Massibec #Financement #École",
      "🎯 Objectif: 1000 tartes vendues ! Aidez-nous à atteindre notre but en commandant vos tartes préférées. Chaque commande compte ! #Objectif #Tartes #École"
    ],
    instagram: [
      "✨ Nouvelle collection de tartes Massibec disponible ! Swipe pour voir nos délicieux produits 👆 Commandez maintenant et soutenez notre école 🏫 #Massibec #Tartes #École",
      "📸 Behind the scenes de notre campagne de financement ! Regardez comment nous préparons vos commandes avec amour ❤️ Commandez maintenant ! #BehindTheScenes #Massibec"
    ],
    tiktok: [
      "POV: Tu découvres les meilleures tartes de ta vie 🥧✨ Commandez maintenant et soutenez notre école ! #Massibec #Tartes #École #Financement",
      "Cette école vend des tartes et c'est génial ! 🎓🍰 Commandez maintenant ! #École #Tartes #Massibec #Financement"
    ]
  };

  if (!session) {
    return <div>Chargement...</div>;
  }

  return (
    <Layout className="pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Outils de Vente</h1>
          <p className="text-gray-600">Boostez vos ventes avec nos outils marketing prêts à utiliser</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventes Total</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesStats.total}</div>
              <p className="text-xs text-muted-foreground">commandes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ce Mois</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesStats.thisMonth}</div>
              <p className="text-xs text-muted-foreground">commandes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Croissance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+{salesStats.growth}%</div>
              <p className="text-xs text-muted-foreground">vs mois dernier</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
              <p className="text-xs text-muted-foreground">clients</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="marketing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="social">Réseaux Sociaux</TabsTrigger>
            <TabsTrigger value="tools">Outils</TabsTrigger>
            <TabsTrigger value="analytics">Analytiques</TabsTrigger>
          </TabsList>

          {/* Marketing Tab */}
          <TabsContent value="marketing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PDF Generator */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Affiche Marketing PDF
                  </CardTitle>
                  <CardDescription>
                    Générez une affiche attractive avec vos produits et QR code
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Contenu de l'affiche :</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Logo et nom de votre boutique</li>
                      <li>• Photos attractives des produits</li>
                      <li>• Prix et descriptions</li>
                      <li>• QR code vers votre boutique</li>
                      <li>• Informations de contact</li>
                    </ul>
                  </div>
                  <Button onClick={downloadMarketingPDF} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Générer et Télécharger PDF
                  </Button>
                </CardContent>
              </Card>

              {/* QR Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <QrCode className="h-5 w-5 mr-2" />
                    QR Code Boutique
                  </CardTitle>
                  <CardDescription>
                    Code QR pour diriger vers votre boutique
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <img 
                      src={generateQRCode()} 
                      alt="QR Code" 
                      className="w-32 h-32 border rounded"
                    />
                  </div>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => copyToClipboard(`${window.location.origin}/boutique/${storeInfo?.storeId}`)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copier le lien
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger QR Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Marketing Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Conseils Marketing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">📱 Partagez sur les réseaux</h4>
                    <p className="text-sm text-blue-700">Utilisez nos templates prêts pour Facebook, Instagram et TikTok</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">📧 Email marketing</h4>
                    <p className="text-sm text-green-700">Envoyez des emails personnalisés à vos clients</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2">🎁 Offres spéciales</h4>
                    <p className="text-sm text-purple-700">Créez des promotions pour booster les ventes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Client */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="h-5 w-5 mr-2" />
                    Ajouter un Client
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="clientName">Nom</Label>
                    <Input
                      id="clientName"
                      value={newClient.name}
                      onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                      placeholder="Nom du client"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Téléphone</Label>
                    <Input
                      id="clientPhone"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientNotes">Notes</Label>
                    <Textarea
                      id="clientNotes"
                      value={newClient.notes}
                      onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                      placeholder="Notes sur le client..."
                    />
                  </div>
                  <Button onClick={addClient} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter Client
                  </Button>
                </CardContent>
              </Card>

              {/* Email Campaign */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Campagne Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="emailTemplate">Template Email</Label>
                    <Textarea
                      id="emailTemplate"
                      value={emailTemplate}
                      onChange={(e) => setEmailTemplate(e.target.value)}
                      placeholder="Bonjour {nom}, découvrez nos nouvelles tartes..."
                      rows={6}
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Variables disponibles :</p>
                    <ul className="list-disc list-inside ml-4">
                      <li>{'{nom}'} - Nom du client</li>
                      <li>{'{boutique}'} - Nom de votre boutique</li>
                      <li>{'{lien}'} - Lien vers votre boutique</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={sendEmailToClients} 
                    disabled={selectedClients.length === 0}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer à {selectedClients.length} client(s)
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Clients List */}
            <Card>
              <CardHeader>
                <CardTitle>Liste des Clients</CardTitle>
                <CardDescription>
                  Gérez votre base de clients pour le marketing ciblé
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clients.map((client) => (
                    <div key={client._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClients([...selectedClients, client._id]);
                            } else {
                              setSelectedClients(selectedClients.filter(id => id !== client._id));
                            }
                          }}
                        />
                        <div>
                          <h4 className="font-semibold">{client.name}</h4>
                          <p className="text-sm text-gray-600">{client.email}</p>
                          {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Facebook */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-600">
                    <Facebook className="h-5 w-5 mr-2" />
                    Facebook
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {socialTemplates.facebook.map((template, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm mb-2">{template}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(template)}
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
                <CardHeader>
                  <CardTitle className="flex items-center text-pink-600">
                    <Instagram className="h-5 w-5 mr-2" />
                    Instagram
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {socialTemplates.instagram.map((template, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm mb-2">{template}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(template)}
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
                <CardHeader>
                  <CardTitle className="flex items-center text-black">
                    <Music className="h-5 w-5 mr-2" />
                    TikTok
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {socialTemplates.tiktok.map((template, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm mb-2">{template}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(template)}
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

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Sales Tracker */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Suivi des Ventes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Suivez vos ventes en temps réel et identifiez vos meilleurs produits
                  </p>
                  <Button variant="outline" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    Voir les Statistiques
                  </Button>
                </CardContent>
              </Card>

              {/* Goal Tracker */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Objectifs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Définissez et suivez vos objectifs de vente
                  </p>
                  <Button variant="outline" className="w-full">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Gérer les Objectifs
                  </Button>
                </CardContent>
              </Card>

              {/* Promotions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gift className="h-5 w-5 mr-2" />
                    Promotions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Créez des offres spéciales pour booster les ventes
                  </p>
                  <Button variant="outline" className="w-full">
                    <Gift className="h-4 w-4 mr-2" />
                    Créer Promotion
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Analytiques de Vente
                </CardTitle>
                <CardDescription>
                  Analysez vos performances et optimisez vos stratégies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <h3 className="text-2xl font-bold text-blue-600">85%</h3>
                    <p className="text-sm text-blue-700">Taux de conversion</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <h3 className="text-2xl font-bold text-green-600">2.3x</h3>
                    <p className="text-sm text-green-700">Multiplicateur social</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <h3 className="text-2xl font-bold text-purple-600">45%</h3>
                    <p className="text-sm text-purple-700">Clients récurrents</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <h3 className="text-2xl font-bold text-orange-600">12.5$</h3>
                    <p className="text-sm text-orange-700">Panier moyen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
