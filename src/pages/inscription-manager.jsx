import { useEffect } from 'react'
import Layout from '../components/Layout'
import SimpleInscriptionForm from '../components/SimpleInscriptionForm'
import { trackSchoolRegistrationPageVisit } from '../lib/funnelAnalytics'

export default function InscriptionManager() {
  useEffect(() => {
    // Track school registration page visit
    trackSchoolRegistrationPageVisit();
  }, []);

  return (
    <Layout>
      <SimpleInscriptionForm />
    </Layout>
  )
}