// pages/CampaignDetails.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../components/Layout';
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GiftIcon, CoinsIcon, TrendingUpIcon } from 'lucide-react';
import '@/styles/campaignDetails.css'; // Assurez-vous que ce fichier existe et est correctement référencé

export default function CampaignDetails() {
  const { data: session, status } = useSession();
  const [schoolData, setSchoolData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState();



  // Ensure userId is only accessed when session is authenticated
  const userId = session?.user?.id;

  // Fetch User Data
  const fetchUser = useCallback(async (userId) => {
    if (!userId) return; // Exit if userId is undefined
    try {
      const userResponse = await fetch(`/api/users/${userId}`);
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }
      const ownerData = await userResponse.json();
      setUser(ownerData);
    } catch (error) {
      setError(error.message);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && userId) { // Check if authenticated
      fetchUser(userId);
    }
  }, [userId, fetchUser, status]);

  useEffect(() => {
    if (status === 'authenticated' && user) {


      const fetchSchoolData = async () => {
        try {
          let schoolId = '';
          if (session.user.role === 'school_manager') {
            schoolId = user.schoolManagerInfo.organisme;
          } else {
            schoolId = session.user.school;
          }
          if (!schoolId) {
            console.log(schoolId)
            throw new Error('Aucune école associée à cet utilisateur.');
          }

          const response = await fetch(`/api/schools/${schoolId}`);
          if (response.ok) {
            const data = await response.json();
            console.log("Here is school data")
            console.log(data)
            setSchoolData(data);
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la récupération des données de l\'école.');
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setLoadingSchool(false);
        }
      };

      const fetchProducts = async () => {
        try {
          let schoolId = '';
          if (session.user.role === 'school_manager') {
            schoolId = user.schoolManagerInfo.organisme;
          } else {
            schoolId = session.user.school;
          }
          if (!schoolId) {
            throw new Error('Aucune école associée à cet utilisateur.');
          }

          const response = await fetch(`/api/products?schoolId=${schoolId}`);
          if (response.ok) {
            const data = await response.json();
            console.log(data)
            setProducts(data.products);
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la récupération des produits.');
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setLoadingProducts(false);
        }
      };

      fetchSchoolData();
      fetchProducts();
      fetchUser(session.user?._id)
    }
  }, [status, session, user]);

  // Fonction pour calculer le total profit par produit
  const calculateProfit = (product) => {
    const profit = product.price - product.cost;
    const studentProfit = (profit * (schoolData.split.studentBenefit / 100)).toFixed(2);
    const raffleProfitPerUnit = (profit * (schoolData.split.raffleBenefit / 100)).toFixed(2); // Assurez-vous que `quantity` existe ou ajustez
    const orgProfit = (profit - studentProfit - raffleProfitPerUnit).toFixed(2);

    return {
      profit: profit.toFixed(2),
      studentProfit,
      raffleProfitPerUnit,
      orgProfit,
    };
  };

  if (status === 'loading' || loadingSchool || loadingProducts) {
    return <p>Chargement des informations...</p>;
  }

  if (error) {
    return <p>Erreur: {error}</p>;
  }

  if (!session) {
    return <p>Vous devez être connecté pour voir les détails de la campagne.</p>;
  }

  return (
    <Layout className="pt-24">
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background pt-8">
        <header className="bg-primary text-primary-foreground py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4">Campagne de Financement Massibec</h1>
            <p className="text-xl">Découvrez les détails de notre campagne et maximisez vos profits!</p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 space-y-12">
          {/* Section: Nos Produits et Profits */}

          <section>
            <h2 className="text-3xl font-semibold mb-6">Nos Produits et Profits</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Prix coûtant</TableHead>
                      <TableHead>Prix de vente</TableHead>
                      <TableHead>Profit</TableHead>
                      {session.user.role === "school_manager" ? <TableHead>Profit élève</TableHead> : <></>}
                      {session.user.role === "school_manager" ? <TableHead>Profit tirage</TableHead> : <></>}
                      {session.user.role === "school_manager" ? <TableHead>Profit organisation</TableHead> : <></>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const profitData = calculateProfit(product);

                      return (
                        <TableRow key={product._id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{session.user.role === "school_manager" ? product.cost.toFixed(2) : (product.price - profitData.studentProfit).toFixed(2)}$</TableCell>
                          <TableCell>{product.price.toFixed(2)}$</TableCell>
                          <TableCell>{session.user.role === "school_manager" ? profitData.profit : profitData.studentProfit}$</TableCell>
                          {session.user.role === "school_manager" ? <TableCell>{profitData.studentProfit}$</TableCell> : <></>}
                          {session.user.role === "school_manager" ? <TableCell>{profitData.raffleProfitPerUnit}$</TableCell> : <></>}
                          {session.user.role === "school_manager" ? <TableCell>{profitData.orgProfit}$</TableCell> : <></>}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          {/* Section: Répartition des Profits */}
          {session.user.role === "school_manager" ? 
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CoinsIcon className="mr-2" />
                  Répartition des Profits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Profit élève</span>
                      <span>{schoolData.split.studentBenefit}%</span>
                    </div>
                    <Progress value={schoolData.split.studentBenefit} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Profit tirage</span>
                      <span>{schoolData.split.raffleBenefit}%</span>
                    </div>
                    <Progress value={schoolData.split.raffleBenefit} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Profit organisation</span>
                      <span>{schoolData.split.organizationBenefit}%</span>
                    </div>
                    <Progress value={schoolData.split.organizationBenefit} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
            

            {/* Section: Bonus pour l'Organisation */}
            {schoolData.isBonus && schoolData.bonuses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <GiftIcon className="mr-2" />
                    Bonus pour l&apos;Organisation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tartes vendues</TableHead>
                        <TableHead>Bonus par tarte</TableHead>
                        <TableHead>Bonus total possible</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schoolData.bonuses.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.salesRange}</TableCell>
                          <TableCell>{row.bonusPerTart.toFixed(2)}$</TableCell>
                          <TableCell>
                            {row.totalBonusRange}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </section>
          : <></>}
        </main>
      </div>
    </Layout>
  );
}