import { useEffect } from 'react'
import Layout from '../components/Layout'
import MultiStepInscriptionForm from '../components/MultiStepInscriptionForm'
import { trackPageVisit } from '../lib/funnelAnalytics'

export default function Inscription() {
  useEffect(() => {
    // Track student registration page visit
    trackPageVisit('registration_student');
  }, []);

  return (
    <Layout>
      <MultiStepInscriptionForm />
    </Layout>
  )
}