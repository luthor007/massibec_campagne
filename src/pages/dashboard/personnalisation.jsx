import Layout from '../../components/Layout'
import PersonnalisationForm from '../../components/PersonnalisationForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function Personnalisation() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto pt-8 px-4 pb-8">
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-4 pb-6">
            {/* Back arrow to go back to the dashboard */}
            <Link 
              href="/dashboard" 
              passHref
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au tableau de bord
            </Link>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-gray-900">Personnaliser ma boutique</CardTitle>
              <CardDescription className="text-base text-gray-600">
                Adaptez l&apos;apparence de votre boutique à votre image
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <PersonnalisationForm />
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}