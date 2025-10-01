import Layout from '../components/Layout'
import MultiStepInscriptionForm from '../components/MultiStepInscriptionForm'

export default function Inscription() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <MultiStepInscriptionForm />
      </div>
    </Layout>
  )
}