import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ConnexionForm from '../components/ConnexionForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Connexion() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') return

    // If user is already logged in, redirect to their dashboard
    if (session?.user) {
      const userRole = session.user.role

      if (userRole === 'admin') {
        router.push('/admin-jappuie-dashboard')
      } else if (userRole === 'school_manager') {
        router.push('/dashboard-manager')
      } else if (userRole === 'supplier' || userRole === 'fournisseur') {
        router.push('/dashboard-supplier')
      } else if (userRole === 'distributor') {
        router.push('/dashboard-distributor')
      } else {
        router.push('/dashboard')
      }
    }
  }, [session, status, router])

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <Layout>
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Chargement...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  // If user is logged in, don't show the form (redirect is in progress)
  if (session?.user) {
    return (
      <Layout>
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Redirection...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Connexion</CardTitle>
            <CardDescription>Accédez à votre compte Massibec Fundraising</CardDescription>
          </CardHeader>
          <CardContent>
            <ConnexionForm />
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}