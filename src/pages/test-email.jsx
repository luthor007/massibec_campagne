import { useState } from 'react';
import Head from 'next/head';

export default function TestEmail() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Erreur de connexion',
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Test Email - Massibec</title>
      </Head>
      
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            color: '#333'
          }}>
            🧪 Test d&apos;envoi d&apos;email
          </h1>
          
          <p style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginBottom: '30px' 
          }}>
            Envoi depuis: <strong>commande@massibec.com</strong><br/>
            Provider: <strong>{process.env.NEXT_PUBLIC_EMAIL_PROVIDER || 'Outlook/Microsoft 365'}</strong>
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500',
                marginBottom: '8px',
                color: '#333'
              }}>
                Adresse email de test:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre-email@example.com"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: loading ? '#ccc' : '#4A90E2',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? '📤 Envoi en cours...' : '📧 Envoyer un email de test'}
            </button>
          </form>

          {result && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              borderRadius: '5px',
              backgroundColor: result.success ? '#d4edda' : '#f8d7da',
              border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
              color: result.success ? '#155724' : '#721c24'
            }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                marginBottom: '10px' 
              }}>
                {result.success ? '✅ Succès!' : '❌ Erreur'}
              </div>
              
              <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                <strong>Message:</strong> {result.message}
              </div>
              
              {result.provider && (
                <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <strong>Provider:</strong> {result.provider}
                </div>
              )}
              
              {result.from && (
                <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <strong>De:</strong> {result.from}
                </div>
              )}
              
              {result.error && (
                <div style={{ 
                  fontSize: '12px', 
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  <strong>Détails:</strong> {result.error}
                </div>
              )}

              {result.success && (
                <div style={{ 
                  fontSize: '13px', 
                  marginTop: '15px',
                  paddingTop: '15px',
                  borderTop: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <strong>📬 Prochaines étapes:</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li>Vérifiez votre boîte de réception</li>
                    <li>Vérifiez vos éléments envoyés dans <strong>commande@massibec.com</strong></li>
                    <li>Vérifiez le dossier spam si besoin</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          <div style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '5px',
            fontSize: '13px',
            color: '#856404'
          }}>
            <strong>💡 Conseil:</strong> Après l&apos;envoi réussi, connectez-vous à 
            <strong> commande@massibec.com</strong> sur Outlook et vérifiez 
            le dossier &quot;Éléments envoyés&quot; pour confirmer que l&apos;email a été envoyé.
          </div>
        </div>
      </div>
    </>
  );
}









