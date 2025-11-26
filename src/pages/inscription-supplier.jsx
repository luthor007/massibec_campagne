import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import SupplierInscriptionForm from '../components/SupplierInscriptionForm'
import { trackSupplierRegistrationPageVisit } from '@/lib/funnelAnalytics'

export default function InscriptionSupplier() {
    const router = useRouter();
    const skipVerification = router.query.skipVerification === 'true';

    useEffect(() => {
        trackSupplierRegistrationPageVisit();
    }, []);

    return (
        <Layout>
            <SupplierInscriptionForm skipVerification={skipVerification} />
        </Layout>
    )
}



