import { useEffect } from 'react'
import Layout from '../components/Layout'
// Using simplified form for better UX - can switch back to MultiStepInscriptionForm if needed
import SimplifiedInscriptionForm from '../components/SimplifiedInscriptionForm'
import { trackPageVisit } from '../lib/funnelAnalytics'

export default function Inscription() {
  useEffect(() => {
    // Track student registration page visit
    trackPageVisit('registration_student');
  }, []);

  return (
    <Layout>
      <SimplifiedInscriptionForm />
    </Layout>
  )
}