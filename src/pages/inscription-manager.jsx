import Layout from '../components/Layout'
import InscriptionManagerForm from '../components/InscriptionManagerForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import NousJoindre from '@/components/NousJoindre'

export default function Inscription() {
  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Inscription Administrateur École</CardTitle>
            <CardDescription>Créez votre compte et inscriver votre école pour commencer votre campagne de financement</CardDescription>
          </CardHeader>
          <CardContent>
            <InscriptionManagerForm />
            <NousJoindre />
          </CardContent>

        </Card>
      </div>
    </Layout>
  )
}