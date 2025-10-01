import Layout from '../components/Layout'
import MultiStepInscriptionForm from '../components/MultiStepInscriptionForm'

export default function Inscription() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Inscription élève
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Créez votre compte en quelques étapes simples pour commencer votre campagne de financement
            </p>
          </div>
          
          <MultiStepInscriptionForm />
        </div>
      </div>
    </Layout>
  )
}