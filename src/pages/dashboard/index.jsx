import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart, Settings, ShoppingBag, Store, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { data: session } = useSession();
  const [storeId, setStoreId] = useState(null);

  useEffect(() => {
    if (session) {
      // Fetch the store information using the user's session
      const fetchStore = async () => {
        try {
          const response = await fetch('/api/get-store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: session.user.id }),
          });
          const data = await response.json();
          setStoreId(data.storeId);  // Assuming the API response returns a storeId
        } catch (error) {
          console.error('Error fetching store ID:', error);
        }
      };
      fetchStore();
    }
  }, [session]);

  return (
    <Layout className="pt-8">
      <h1 className="text-3xl font-bold mb-6 pt-24">Tableau de bord</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2 text-primary" />
              Personnaliser ma boutique
            </CardTitle>
            <CardDescription>Modifiez l&apos;apparence et les détails de votre boutique en ligne.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/personnalisation" passHref>
              <Button className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Personnaliser
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingBag className="h-5 w-5 mr-2 text-primary" />
              Mes commandes
            </CardTitle>
            <CardDescription>Consultez et gérez les commandes de vos clients.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/commandes" passHref>
              <Button className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                Voir les commandes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="h-5 w-5 mr-2 text-primary" />
              Statistiques
            </CardTitle>
            <CardDescription>Suivez les performances de votre campagne.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/statistiques" passHref>
              <Button className="w-full bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
                Voir les statistiques
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* New Card to View the Store */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Store className="h-5 w-5 mr-2 text-primary" />
              Voir ma boutique
            </CardTitle>
            <CardDescription>Accédez à votre boutique en ligne pour la voir comme vos clients.</CardDescription>
          </CardHeader>
          <CardContent>
            {storeId ? (
              <Link href={`/boutique/${storeId}`} passHref>
                <Button className="w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                  Voir la boutique
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button className="w-full bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded" disabled>
                Chargement de la boutique...
              </Button>
            )}
          </CardContent>
        </Card>

        {/* New Card for Sales Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary" />
              Outils de Vente
            </CardTitle>
            <CardDescription>Boostez vos ventes avec nos outils marketing prêts à utiliser.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/vendre" passHref>
              <Button className="w-full bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                Voir les outils
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
