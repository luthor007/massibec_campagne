import Layout from '../components/Layout'
import ConnexionForm from '../components/ConnexionForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Connexion() {
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