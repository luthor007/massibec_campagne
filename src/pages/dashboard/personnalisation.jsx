import Layout from '../../components/Layout'
import PersonnalisationForm from '../../components/PersonnalisationForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function Personnalisation() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            {/* Back arrow to go back to the dashboard */}
            <Link href="/dashboard" passHref>

                <ArrowLeft className="mr-2 h-5 w-5" />
                Retour au tableau de bord

            </Link>
            <CardTitle className="text-2xl">Personnaliser ma boutique</CardTitle>
            <CardDescription>Adaptez l&apos;apparence de votre boutique à votre image</CardDescription>
          </CardHeader>
          <CardContent>
            <PersonnalisationForm />
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}