import Layout from '../../components/Layout'
import PersonnalisationForm from '../../components/PersonnalisationForm'
import CampaignSelector from '../../components/Dashboard/CampaignSelector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useCallback, useMemo } from 'react'
import { getServerSession } from 'next-auth/next'
import { getDashboardSSRData } from '../../lib/dashboardSSR'
import { authOptions } from '../api/auth/[...nextauth]'

export default function Personnalisation({ initialCampaignContext }) {
  const router = useRouter();

  // Memoize handlers to prevent unnecessary re-renders
  const handleCampaignSwitch = useCallback((campaignId) => {
    // Reload the page to reflect campaign changes
    window.location.reload();
  }, []);

  const handleBackNavigation = useCallback((e) => {
    e.preventDefault();
    router.push('/dashboard');
  }, [router]);

  // Memoize campaign selector props
  const campaignSelectorProps = useMemo(() => ({
    onCampaignSwitch: handleCampaignSwitch,
    initialCampaigns: initialCampaignContext?.campaigns || [],
    initialActiveCampaignId: initialCampaignContext?.activeCampaignId || null
  }), [handleCampaignSwitch, initialCampaignContext?.campaigns, initialCampaignContext?.activeCampaignId]);

  // Optimized prefetching for instant return navigation
  useEffect(() => {
    // Aggressive prefetching
    router.prefetch('/dashboard');
    router.prefetch('/dashboard');
    const timeoutId = setTimeout(() => {
      router.prefetch('/dashboard');
    }, 100);

    // Prefetch on hover/touch
    const backLink = document.querySelector('a[href="/dashboard"]');
    if (backLink) {
      const prefetchDashboard = () => router.prefetch('/dashboard');
      backLink.addEventListener('mouseenter', prefetchDashboard, { once: true, passive: true });
      backLink.addEventListener('touchstart', prefetchDashboard, { once: true, passive: true });
    }

    return () => clearTimeout(timeoutId);
  }, [router]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pt-16 md:pt-20 px-2 sm:px-4 pb-8 overflow-x-hidden">
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-4 pb-6">
            {/* Back arrow to go back to the dashboard */}
            <Link
              href="/dashboard"
              passHref
              prefetch={true}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              onClick={handleBackNavigation}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au tableau de bord
            </Link>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900">Personnaliser ma boutique</CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">
                  Adaptez l&apos;apparence de votre boutique à votre image
                </CardDescription>
              </div>
              {initialCampaignContext?.campaigns?.length > 1 && (
                <div className="flex-shrink-0 w-full sm:w-auto">
                  <CampaignSelector {...campaignSelectorProps} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <PersonnalisationForm initialCampaignContext={initialCampaignContext} hideCampaignSelector={true} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
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

    const dashboardData = await getDashboardSSRData(session);
    if (!dashboardData) {
      return {
        redirect: {
          destination: '/connexion',
          permanent: false,
        },
      };
    }

    return {
      props: {
        initialCampaignContext: dashboardData.initialCampaignContext
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps (personnalisation):', error);
    return {
      props: {
        initialCampaignContext: { campaigns: [], activeCampaignId: null, mode: 'none' }
      },
    };
  }
}