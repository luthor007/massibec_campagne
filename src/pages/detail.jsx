// pages/CampaignDetails.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]';
import { getDetailPageSSR } from '../lib/dashboardSSR';
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
import { GiftIcon, CoinsIcon, TrendingUpIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import '@/styles/campaignDetails.css';

export default function CampaignDetails({
  initialCampaignData,
  initialSchoolData,
  initialProducts,
  initialUser
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [campaignData, setCampaignData] = useState(initialCampaignData || null);
  const [schoolData, setSchoolData] = useState(initialSchoolData || null);
  const [products, setProducts] = useState(initialProducts || []);
  const [loadingCampaign, setLoadingCampaign] = useState(!initialCampaignData);
  const [loadingProducts, setLoadingProducts] = useState(!initialProducts);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(initialUser || null);

  // Prefetch dashboard for instant return navigation - aggressive prefetching
  useEffect(() => {
    // Prefetch dashboard immediately and multiple times
    router.prefetch('/dashboard');
    router.prefetch('/dashboard');
    setTimeout(() => router.prefetch('/dashboard'), 50);
    setTimeout(() => router.prefetch('/dashboard'), 100);

    // Also prefetch on hover/touch for extra assurance
    const backLink = document.querySelector('a[href="/dashboard"]');
    if (backLink) {
      const prefetchDashboard = () => router.prefetch('/dashboard');
      backLink.addEventListener('mouseenter', prefetchDashboard, { once: true, passive: true });
      backLink.addEventListener('touchstart', prefetchDashboard, { once: true, passive: true });
    }
  }, [router]);

  // Ensure userId is only accessed when session is authenticated
  const userId = session?.user?.id || initialUser?._id;

  // Fetch User Data - only if not provided via SSR
  const fetchUser = useCallback(async (userId) => {
    if (!userId || initialUser) return; // Skip if we have SSR data
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
  }, [initialUser]);

  useEffect(() => {
    if (status === 'authenticated' && userId && !initialUser) { // Check if authenticated and no SSR data
      fetchUser(userId);
    }
  }, [userId, fetchUser, status, initialUser]);

  useEffect(() => {
    if (status === 'authenticated' && user && !initialCampaignData && !initialSchoolData) {
      // Only fetch if we don't have SSR data
      const fetchCampaignData = async () => {
        try {
          // For students: Use their selected campaign (activeCampaignId) or first joined campaign
          // For school managers: Use their school's activeCampaignId or query param
          let campaignId = null;

          if (user.role === 'student') {
            // Get user's selected campaign (activeCampaignId)
            if (user.activeCampaignId) {
              campaignId = user.activeCampaignId;
            } else if (user.campaigns && user.campaigns.length > 0) {
              // Fallback to first active campaign or first campaign
              const activeCampaignEntry = user.campaigns.find(c => c.isActive) || user.campaigns[0];
              campaignId = activeCampaignEntry?.campaignId?._id || activeCampaignEntry?.campaignId;
            }
          } else if (user.role === 'school_manager') {
            // For school managers, use their school's activeCampaignId
            const schoolId = user.schoolManagerInfo?.organisme?._id || user.schoolManagerInfo?.organisme;
            if (schoolId) {
              // Try to get campaign from user's campaigns first (if they joined in preview mode)
              if (user.activeCampaignId) {
                campaignId = user.activeCampaignId;
              } else {
                // Otherwise, fetch school and use its activeCampaignId
                const schoolResponse = await fetch(`/api/schools/${schoolId}`);
                if (schoolResponse.ok) {
                  const schoolData = await schoolResponse.json();
                  campaignId = schoolData.activeCampaignId;
                }
              }
            }
          }

          // Fetch campaign data using campaignId if available, otherwise use /api/campaigns/current
          let campaignData = null;
          if (campaignId) {
            const campaignResponse = await fetch(`/api/campaigns/${campaignId}`);
            if (campaignResponse.ok) {
              const campaignResult = await campaignResponse.json();
              campaignData = campaignResult.campaign;

              // Also fetch school data
              if (campaignData?.school) {
                const schoolId = campaignData.school._id || campaignData.school;
                const schoolResponse = await fetch(`/api/schools/${schoolId}`);
                if (schoolResponse.ok) {
                  const schoolData = await schoolResponse.json();
                  setSchoolData(schoolData);
                }
              }
            }
          }

          // Fallback to /api/campaigns/current if campaignId fetch failed
          if (!campaignData) {
            let schoolId = null;
            if (user.role === 'school_manager') {
              schoolId = user.schoolManagerInfo?.organisme?._id || user.schoolManagerInfo?.organisme;
            } else if (user.role === 'student') {
              if (user.campaigns && user.campaigns.length > 0) {
                const activeCampaignEntry = user.campaigns.find(c => c.isActive) || user.campaigns[0];
                schoolId = activeCampaignEntry?.schoolId?._id || activeCampaignEntry?.schoolId;
              } else {
                schoolId = user.school?._id || user.school;
              }
            }

            const apiUrl = schoolId
              ? `/api/campaigns/current?schoolId=${schoolId}`
              : '/api/campaigns/current';

            const response = await fetch(apiUrl);
            if (response.ok) {
              const data = await response.json();
              campaignData = data.campaign;
              setSchoolData(data.school);
            } else {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Erreur lors de la récupération des données de la campagne.');
            }
          }

          setCampaignData(campaignData);

          // Debug: Log donation configuration
          if (campaignData?.donationsForStudents) {
            console.log('[detail.jsx] Donations config:', {
              enabled: campaignData.donationsForStudents.enabled,
              splitConfig: campaignData.donationsForStudents.splitConfig,
              presets: campaignData.donationsForStudents.presets
            });
          }
        } catch (err) {
          setError(err.message);
          console.error('Error fetching campaign data:', err);
        } finally {
          setLoadingCampaign(false);
        }
      };

      fetchCampaignData();
    }
  }, [status, session, user, initialCampaignData, initialSchoolData]);

  // Fetch products after campaign data is loaded - only if not provided via SSR
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setLoadingProducts(false);
      return;
    }

    if (campaignData && schoolData) {
      const fetchProducts = async () => {
        try {
          // Use the schoolId from the campaign's school data
          const schoolId = schoolData._id;

          if (!schoolId) {
            throw new Error('Aucune école associée à cette campagne.');
          }

          const response = await fetch(`/api/products?schoolId=${schoolId}`);
          if (response.ok) {
            const data = await response.json();
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

      fetchProducts();
    }
  }, [campaignData, schoolData, initialProducts]);

  // Fonction pour calculer le total profit par produit
  const calculateProfit = (product) => {
    if (!campaignData || !schoolData) {
      return {
        profit: '0.00',
        studentCashProfit: '0.00',
        studentSchoolAccountProfit: '0.00',
        raffleProfitPerUnit: '0.00',
        orgProfit: '0.00',
      };
    }

    // Get product ID - products from API use 'id' field, not '_id'
    const productId = product._id?.toString() || product.id?.toString();

    // Check if this product has custom pricing in the campaign
    const customPrice = campaignData.customPrices?.find(cp => {
      const cpProductId = cp.productId?._id?.toString() || cp.productId?.toString();
      return cpProductId === productId;
    });

    // Check if this product has custom profit splits in the campaign
    const customProfitSplit = campaignData.profitSplits?.find(ps => {
      const psProductId = ps.productId?._id?.toString() || ps.productId?.toString();
      return psProductId === productId;
    });

    const productPrice = customPrice?.price || product.price;
    const profit = productPrice - product.cost;

    let studentCashProfit, studentSchoolAccountProfit, raffleProfitPerUnit, orgProfit;

    // Check if we should use absolute values from campaign
    if (campaignData.profitSplitType === 'absolute' && customProfitSplit) {
      // Use product-specific absolute values from campaign's profitSplits
      // Preserve 0 values - don't use || which treats 0 as falsy
      studentCashProfit = (customProfitSplit.studentCash !== undefined && customProfitSplit.studentCash !== null ? customProfitSplit.studentCash : 1.00).toFixed(2);
      studentSchoolAccountProfit = (customProfitSplit.studentSchoolAccount !== undefined && customProfitSplit.studentSchoolAccount !== null ? customProfitSplit.studentSchoolAccount : 1.00).toFixed(2);
      raffleProfitPerUnit = (customProfitSplit.raffle !== undefined && customProfitSplit.raffle !== null ? customProfitSplit.raffle : 0.25).toFixed(2);
      orgProfit = (customProfitSplit.schoolProject !== undefined && customProfitSplit.schoolProject !== null ? customProfitSplit.schoolProject : 0.75).toFixed(2);
    } else {
      // Use percentage-based calculation using school's split configuration
      const studentBenefit = schoolData.split?.studentBenefit || 85.6;
      const raffleBenefit = schoolData.split?.raffleBenefit || 5.0;
      const orgBenefit = schoolData.split?.organizationBenefit || 9.4;

      // Split student benefit equally between cash and school account
      const studentBenefitHalf = studentBenefit / 2;
      studentCashProfit = (profit * (studentBenefitHalf / 100)).toFixed(2);
      studentSchoolAccountProfit = (profit * (studentBenefitHalf / 100)).toFixed(2);
      raffleProfitPerUnit = (profit * (raffleBenefit / 100)).toFixed(2);
      orgProfit = (profit * (orgBenefit / 100)).toFixed(2);
    }

    return {
      profit: profit.toFixed(2),
      studentCashProfit,
      studentSchoolAccountProfit,
      raffleProfitPerUnit,
      orgProfit,
    };
  };

  if (status === 'loading' || (loadingCampaign && !initialCampaignData) || (loadingProducts && !initialProducts)) {
    return <p>Chargement des informations...</p>;
  }

  if (error) {
    return <p>Erreur: {error}</p>;
  }

  if (!session) {
    return <p>Vous devez être connecté pour voir les détails de la campagne.</p>;
  }

  if (!campaignData) {
    return (
      <Layout className="pt-24">
        <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background pt-8 overflow-x-hidden">
          <div className="container mx-auto px-4 py-12 overflow-x-hidden">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Aucune campagne active</h1>
              <p className="text-lg text-gray-600 mb-6">
                Il n'y a actuellement aucune campagne active pour votre école.
              </p>
              <p className="text-sm text-gray-500">
                Contactez votre gestionnaire d'école pour plus d'informations.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="pt-24">
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background pt-8 overflow-x-hidden">
        <header className="bg-primary text-primary-foreground py-12">
          <div className="container mx-auto px-4 overflow-x-hidden">
            {/* Back arrow */}
            <Link
              href="/dashboard"
              passHref
              prefetch={true}
              className="inline-flex items-center text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors mb-4"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push('/dashboard');
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au tableau de bord
            </Link>

            <h1 className="text-4xl font-bold mb-4">
              {campaignData ? `Campagne #${campaignData.campaignNumber} - ${schoolData?.name}` : 'Campagne de Financement Massibec'}
            </h1>
            <p className="text-xl">
              {campaignData ?
                `Découvrez les détails de votre campagne et maximisez vos profits!` :
                'Découvrez les détails de notre campagne et maximisez vos profits!'
              }
            </p>
            {campaignData && (
              <div className="mt-4 text-sm opacity-90">
                <p>Période: {new Date(campaignData.startDate).toLocaleDateString('fr-CA')} - {new Date(campaignData.endDate).toLocaleDateString('fr-CA')}</p>
                {campaignData.deliveryDate && (
                  <p>Livraison prévue: {new Date(campaignData.deliveryDate).toLocaleDateString('fr-CA')}</p>
                )}
                <p>Objectif financier: {campaignData.financialGoal?.toLocaleString('fr-CA')}$</p>
              </div>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 space-y-12">
          {/* Section: Nos Produits et Profits */}
          <section>
            <h2 className="text-3xl font-semibold mb-6">Nos Produits et Profits</h2>
            <Card>
              <CardContent className="p-0">
                {(() => {
                  // Calculate profits for all products first
                  const profitsData = products.map(product => calculateProfit(product));

                  // Determine which columns to show based on whether they have non-zero values
                  const hasStudentCashProfit = profitsData.some(p => parseFloat(p.studentCashProfit) > 0);
                  const hasStudentSchoolAccountProfit = profitsData.some(p => parseFloat(p.studentSchoolAccountProfit) > 0);
                  const hasOrgProfit = profitsData.some(p => parseFloat(p.orgProfit) > 0);
                  const hasRaffleProfit = profitsData.some(p => parseFloat(p.raffleProfitPerUnit) > 0);

                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Prix de vente</TableHead>
                          <TableHead>Coût Massibec</TableHead>
                          {hasStudentCashProfit && <TableHead>Profit comptant</TableHead>}
                          {hasStudentSchoolAccountProfit && <TableHead>Profit compte scolaire</TableHead>}
                          {hasOrgProfit && <TableHead>Profit école</TableHead>}
                          {hasRaffleProfit && <TableHead>Tirage</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product, index) => {
                          const profitData = profitsData[index];

                          // Get product ID - products from API use 'id' field, not '_id'
                          const productId = product._id?.toString() || product.id?.toString();

                          // Get campaign-specific price if available
                          const customPrice = campaignData?.customPrices?.find(cp => {
                            const cpProductId = cp.productId?._id?.toString() || cp.productId?.toString();
                            return cpProductId === productId;
                          });
                          const displayPrice = customPrice?.price || product.price;

                          return (
                            <TableRow key={productId}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{displayPrice.toFixed(2)}$</TableCell>
                              <TableCell>{product.cost.toFixed(2)}$</TableCell>
                              {hasStudentCashProfit && <TableCell>{profitData.studentCashProfit}$</TableCell>}
                              {hasStudentSchoolAccountProfit && <TableCell>{profitData.studentSchoolAccountProfit}$</TableCell>}
                              {hasOrgProfit && <TableCell>{profitData.orgProfit}$</TableCell>}
                              {hasRaffleProfit && <TableCell>{profitData.raffleProfitPerUnit}$</TableCell>}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          </section>

          {/* Section: Don */}
          {(campaignData?.donationsForStudents?.enabled || campaignData?.donationsForSchool?.enabled) && (
            <section>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">Dons</h2>
              <Card className="shadow-lg border-0">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="flex items-center text-lg sm:text-xl">
                    <GiftIcon className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                    Comment ça marche ?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
                  {campaignData?.donationsForStudents?.enabled && (
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border-2 border-blue-200 shadow-sm">
                      <div className="flex items-center gap-2 sm:gap-3 mb-4">
                        <div className="text-2xl sm:text-3xl">💵</div>
                        <h3 className="font-bold text-blue-900 text-base sm:text-lg">Dons pour vous</h3>
                      </div>
                      {campaignData.donationsForStudents?.splitConfig && (
                        <div className="space-y-3 sm:space-y-4 mb-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-blue-100">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">💵</span>
                              <span className="text-sm sm:text-base font-medium text-gray-700">Compte comptant</span>
                            </div>
                            <span className="font-bold text-blue-900 text-base sm:text-lg ml-7 sm:ml-0">
                              {campaignData.donationsForStudents.splitConfig.studentCash !== undefined
                                ? campaignData.donationsForStudents.splitConfig.studentCash
                                : 40}% → Vous gardez
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-blue-100">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🎓</span>
                              <span className="text-sm sm:text-base font-medium text-gray-700">Compte étudiant</span>
                            </div>
                            <span className="font-bold text-blue-900 text-base sm:text-lg ml-7 sm:ml-0">
                              {campaignData.donationsForStudents.splitConfig.studentAccount !== undefined
                                ? campaignData.donationsForStudents.splitConfig.studentAccount
                                : 60}% → À transférer à Massibec (qui va transférer à l'école et le mettre dans votre compte scolaire)
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="bg-blue-200/50 rounded-lg p-3 sm:p-4 border border-blue-300">
                        <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">
                          <strong className="font-semibold">Exemple :</strong> Sur 10$ de dons, vous gardez {(10 * ((campaignData.donationsForStudents?.splitConfig?.studentCash !== undefined ? campaignData.donationsForStudents.splitConfig.studentCash : 40) / 100)).toFixed(0)}$ et vous transférez {(10 * ((campaignData.donationsForStudents?.splitConfig?.studentAccount !== undefined ? campaignData.donationsForStudents.splitConfig.studentAccount : 60) / 100)).toFixed(0)}$ à Massibec (qui va transférer à l'école et le mettre dans votre compte scolaire).
                        </p>
                      </div>
                    </div>
                  )}

                  {campaignData?.donationsForSchool?.enabled && (
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl border-2 border-green-200 shadow-sm">
                      <div className="flex items-center gap-2 sm:gap-3 mb-4">
                        <div className="text-2xl sm:text-3xl">🏫</div>
                        <h3 className="font-bold text-green-900 text-base sm:text-lg">Dons pour l'école</h3>
                      </div>
                      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-green-100 mb-4">
                        <p className="text-sm sm:text-base text-green-800 font-medium">
                          100% des dons → À transférer à Massibec (qui va transférer à l'école)
                        </p>
                      </div>
                      <div className="bg-green-200/50 rounded-lg p-3 sm:p-4 border border-green-300">
                        <p className="text-xs sm:text-sm text-green-900 leading-relaxed">
                          <strong className="font-semibold">Exemple :</strong> Si vous recevez 5$ de dons pour l'école, vous transférez 5$ à Massibec (qui va transférer à l'école).
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Section: Bonus pour l'Organisation */}
          {session?.user?.role === "school_manager" && schoolData?.isBonus && schoolData?.bonuses?.length > 0 && (
            <section>
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
            </section>
          )}
        </main>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  try {
    const session = await getServerSession(context.req, context.res, authOptions);
    if (!session || !session.user) {
      return {
        redirect: {
          destination: '/connexion',
          permanent: false,
        },
      };
    }

    const detailData = await getDetailPageSSR(session);

    return {
      props: {
        initialCampaignData: detailData.campaignData,
        initialSchoolData: detailData.schoolData,
        initialProducts: detailData.products,
        initialUser: detailData.user
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps (detail):', error);
    return {
      props: {
        initialCampaignData: null,
        initialSchoolData: null,
        initialProducts: [],
        initialUser: null
      },
    };
  }
}