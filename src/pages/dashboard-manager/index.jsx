// src/pages/dashboard-manager.jsx

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Calendar,
  Download,
  LogOut,
  Mail,
  Search,
  Settings,
  Users
} from 'lucide-react';
import { toast } from 'react-toastify'; // Optional: for success feedback




import { useSession } from 'next-auth/react';
import { products } from '../../lib/product';
import { useRouter } from 'next/router';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function DashboardManager() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [school, setSchool] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true); // New loading state


const handleCopy = (code) => {
  if (!navigator.clipboard) {
    console.error('Clipboard API not supported');
    return;
  }

  navigator.clipboard.writeText(code)
    .then(() => {
      toast.success('Code copié dans le presse-papiers'); // Show success message (optional)
    })
    .catch((error) => {
      console.error('Error copying text: ', error);
      toast.error('Erreur lors de la copie'); // Show error message (optional)
    });
};

  // Fetch School Info
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        console.log('Fetching school info...');
        const response = await fetch('/api/school-info');
        console.log('School info response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('School info received:', data);
          setSchool(data);
          console.log('School info state updated');
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch school info:', errorData.message);
        }
      } catch (error) {
        console.error('Error fetching school info:', error);
      }
    };

    if (session) {
      fetchSchoolInfo();
    }
  }, [session]); // Removed 'school' from dependencies

  // Fetch Participants with Orders
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!school) return; // Ensure school info is available

      try {
        console.log('Fetching participants with orders...');
        const response = await fetch('/api/participants');
        console.log('Participants response status:', response.status);
        if (response.ok) {
          const participantsData = await response.json();
          console.log('Participants data received:', participantsData);

          let totalRaisedSum = 0;
          const aggregatedSales = {}; // To aggregate sales data by product

          const processedParticipants = participantsData.map((participant) => {
            const participantTotalSales = participant.orders.reduce((acc, order) => acc + order.totalAmount, 0);
            const participantTotalUnits = participant.orders.reduce((acc, order) => {
              order.products.forEach((item) => {
                acc += item.quantity;
              });
              return acc;
            }, 0);

            totalRaisedSum += participantTotalSales;

            // Aggregate sales data
            participantsData.forEach((participant) => {
            participant.orders.forEach((order) => {
              order.products.forEach((item) => {
                const productName = item.productName || 'Unknown Product';
                const productPrice = item.productPrice || 0;

                if (!aggregatedSales[productName]) {
                  aggregatedSales[productName] = { name: productName, price: productPrice, quantity: 0, total: 0 };
                }
                aggregatedSales[productName].quantity += item.quantity;
                aggregatedSales[productName].total += item.quantity * productPrice;
              });
            });
          });

            return {
              id: participant._id,
              name: participant.name,
              raised: participantTotalSales,
              goal: participant.objectifPersonnel || 1000,
              sales: participantTotalUnits,
            };
          });

          // Convert aggregatedSales object to array
          const salesDataArray = Object.values(aggregatedSales);

          console.log('Processed participants:', processedParticipants);
          console.log('Total raised:', totalRaisedSum);
          console.log('Aggregated sales data:', salesDataArray);

          setParticipants(processedParticipants);
          setTotalRaised(totalRaisedSum);
          setSalesData(salesDataArray);
          setSchool(prevState => ({
            ...prevState,
            totalRaised: totalRaisedSum
          }));
          setLoading(false); // Data fetching complete
          console.log('Participants and school info state updated');
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch participants:', errorData.message);
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
      }
    };

    if (session && school) {
      fetchParticipants();
    }
  }, [session]); // Added 'school' to dependencies

  // Handle Logout
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  if (!school || !participants) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="ml-4 text-lg text-gray-700">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Avatar className="h-12 w-12 mr-4">
                <AvatarFallback>{school.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {school.name}
                </h1>
                <p className="text-sm text-gray-500">
                  Tableau de bord du gestionnaire
                </p>
              </div>
            </div>
            <Button variant="outline" className="flex items-center" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-gray-200 p-1">
            <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="sales">Ventes</TabsTrigger>
            {/* Uncomment if Communications tab is needed */}
            {/* <TabsTrigger value="communications">Communications</TabsTrigger> */}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Global Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Globale</CardTitle>
                <CardDescription>
                  Progression de la campagne de financement
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Montant amassé
                    </p>
                    <h2 className="text-3xl font-bold">
                      {school.totalRaised.toLocaleString()}$
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">
                      Objectif
                    </p>
                    <p className="text-2xl font-semibold">
                      {school.objectifFinancier.toLocaleString()}$
                    </p>
                  </div>
                </div>
                <Progress
                  value={(school.totalRaised / school.objectifFinancier) * 100}
                  className="h-2"
                />
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  {((school.totalRaised / school.objectifFinancier) * 100).toFixed(1)}
                  % de l&apos;objectif atteint
                </p>
              </CardFooter>
            </Card>

            {/* Campaign Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Informations de Campagne
                </CardTitle>
                <CardDescription>
                  Dates importantes de votre campagne de financement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-600 mb-1">Début de Campagne</p>
                    <p className="text-lg font-bold text-blue-900">
                      {school.debutCampagne ? new Date(school.debutCampagne).toLocaleDateString('fr-CA') : 'Non défini'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium text-orange-600 mb-1">Fin de Campagne</p>
                    <p className="text-lg font-bold text-orange-900">
                      {school.finCampagne ? new Date(school.finCampagne).toLocaleDateString('fr-CA') : 'Non défini'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-600 mb-1">Date de Livraison</p>
                    <p className="text-lg font-bold text-green-900">
                      {school.dateDeLivraison ? new Date(school.dateDeLivraison).toLocaleDateString('fr-CA') : 'Non défini'}
                    </p>
                  </div>
                </div>
                {school.currentCampaignNumber && (
                  <div className="mt-4 text-center">
                    <Badge variant="outline" className="text-sm">
                      Campagne #{school.currentCampaignNumber}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Meilleurs Performeurs</CardTitle>
                <CardDescription>
                  Top 3 des élèves ayant amassé le plus de fonds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {participants
                    .sort((a, b) => b.raised - a.raised)
                    .slice(0, 3)
                    .map((participant, index) => (
                      <div key={participant.id} className="flex items-center">
                        <Avatar className="h-10 w-10 mr-4">
                          <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {participant.raised.toLocaleString()}$ amassés
                          </p>
                        </div>
                        <Badge
                          variant={
                            index === 0
                              ? 'default'
                              : index === 1
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total des Ventes
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {salesData.reduce((acc, sale) => acc + sale.quantity, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">unités vendues</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Produit le Plus Vendu
                  </CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {
                      salesData.sort((a, b) => b.quantity - a.quantity)[0]
                        ?.name
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {salesData.sort((a, b) => b.quantity - a.quantity)[0]?.quantity}{' '}
                    unités
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Moyenne par Élève
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(school.totalRaised / participants.length).toFixed(2)}$
                  </div>
                  <p className="text-xs text-muted-foreground">
                    montant moyen amassé
                  </p>
                </CardContent>
              </Card>
              <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Code de l'école</CardTitle>
      <Users className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{school.code.toLocaleString()}</div>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={() => handleCopy(school.code.toLocaleString())} // Handle click to copy the code
      >
        Copier
      </Button>
      <p className="text-xs text-muted-foreground">
        Partager ce code à vos élèves pour qu'ils puissent s'inscrire à la campagne de financement
      </p>
    </CardContent>
  </Card>
            </div>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>Liste des Participants</CardTitle>
                <CardDescription>
                  Gérez et suivez les performances des élèves
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <Input
                      placeholder="Rechercher un élève..."
                      className="w-full sm:w-64"
                      // Implement search functionality as needed
                    />
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" className="flex items-center w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Exporter
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Montant amassé</TableHead>
                        <TableHead>Objectif</TableHead>
                        <TableHead>Ventes</TableHead>
                        <TableHead>Progression</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant) => (
                        <TableRow key={participant.id}>
                          <TableCell className="font-medium">
                            {participant.name}
                          </TableCell>
                          <TableCell>
                            {participant.raised.toLocaleString()}$
                          </TableCell>
                          <TableCell>
                            {participant.goal.toLocaleString()}$
                          </TableCell>
                          <TableCell>{participant.sales}</TableCell>
                          <TableCell>
                            <Progress
                              value={(participant.raised / participant.goal) * 100}
                              className="w-full sm:w-32"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Détails des Ventes</CardTitle>
                <CardDescription>
                  Aperçu des produits vendus et des revenus générés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition des Ventes</CardTitle>
                <CardDescription>
                  Distribution des ventes par produit
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={salesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="quantity"
                    >
                      {salesData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
              <CardFooter>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Prix unitaire</TableHead>
                        <TableHead>Quantité vendue</TableHead>
                        <TableHead>Montant total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.map((product) => (
                        <TableRow key={product.name}>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>{product.price.toLocaleString()}$</TableCell>
                          <TableCell>{product.quantity}</TableCell>
                          <TableCell>{product.total.toLocaleString()}$</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Notifications et Communication</CardTitle>
                <CardDescription>
                  Gérez les communications avec les participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="notifications" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                  </TabsList>
                  <TabsContent value="notifications">
                    <div className="space-y-4">
                      <div className="flex items-center p-4 bg-muted rounded-lg">
                        <Bell className="h-5 w-5 mr-2 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Rappel: Fin de la campagne</p>
                          <p className="text-sm text-muted-foreground">
                            La campagne se termine dans 3 jours.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-muted rounded-lg">
                        <Bell className="h-5 w-5 mr-2 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Objectif atteint!</p>
                          <p className="text-sm text-muted-foreground">
                            L&apos;école a atteint 75% de son objectif.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="messages">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        <Input
                          placeholder="Tapez votre message..."
                          className="flex-grow"
                        />
                        <Button className="w-full sm:w-auto">
                          <Mail className="mr-2 h-4 w-4" /> Envoyer
                        </Button>
                      </div>
                      <Select>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionnez les destinataires" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les participants</SelectItem>
                          <SelectItem value="top">Meilleurs vendeurs</SelectItem>
                          <SelectItem value="below">
                            En dessous de l&apos;objectif
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}