import Layout from '../components/Layout'
import InscriptionForm from '../components/InscriptionForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Inscription() {
  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Inscription élève</CardTitle>
            <CardDescription>Créez votre compte pour commencer votre campagne de financement</CardDescription>
          </CardHeader>
          <CardContent>
            <InscriptionForm />
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}