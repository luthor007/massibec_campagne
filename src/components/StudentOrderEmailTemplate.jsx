// components/StudentOrderEmailTemplate.jsx

import React from 'react';

// Helper function to get terminology - must be client-side compatible
const getTerminology = (organizationType) => {
  const orgType = organizationType || 'school';
  if (orgType === 'school') {
    return {
      participant: 'étudiant',
      participants: 'étudiants',
      participantLabel: 'étudiant(e)',
      participantsLabel: 'étudiants',
      organization: 'école',
      organizationLabel: 'École'
    };
  } else {
    return {
      participant: 'membre',
      participants: 'membres',
      participantLabel: 'membre',
      participantsLabel: 'membres',
      organization: 'organisation',
      organizationLabel: 'Organisation'
    };
  }
};

const StudentOrderEmailTemplate = ({
  orderId,
  studentName,
  email,
  phoneNumber,
  schoolName,
  studentPercentage,
  products,
  totalUnits,
  totalAmount,
  amountPaid,
  paymentInstructions,
  studentCashBenefit = 0,
  studentSchoolAccountBenefit = 0,
  schoolProjectBenefit = 0,
  raffleBenefit = 0,
  tipBreakdown = undefined,
  organizationType = 'school',
  // New props for Interac payment instructions
  sellerName = '',
  sellerEmail = '',
  autoDeposit = true,
  amountToPay = 0,
  paymentMethod = 'interac', // 'interac' or 'cash'
}) => {
  const terminology = getTerminology(organizationType);
  const displayAmount = amountToPay > 0 ? amountToPay : totalAmount;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#333' }}>
      <h2>Confirmation de votre commande - Commande #{orderId}</h2>

      <p>Bonjour {studentName},</p>

      <p>
        Merci d'avoir passé votre commande. Voici les détails de votre commande :
      </p>

      <h3>Détails de la commande :</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Produit</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Quantité</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Prix Unitaire</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.productName}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.quantity}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{(product.price - (((product.price - product.cost) * studentPercentage) / 100)).toFixed(3)}$</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {((product.price - (((product.price - product.cost) * studentPercentage) / 100)) * product.quantity).toFixed(3)}$
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        <strong>Total des unités :</strong> {totalUnits}<br />
        <strong>Montant total :</strong> {totalAmount.toFixed(3)}$<br />
      </p>

      {/* Donation Breakdown Section */}
      {tipBreakdown && (tipBreakdown.studentCash > 0 || tipBreakdown.studentSchoolAccount > 0 || tipBreakdown.schoolProject > 0) && (
        <div>
          <h3>Répartition de votre don :</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Destination</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {tipBreakdown.studentCash > 0 && (
                <tr>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} (Comptant)</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    ${tipBreakdown.studentCash.toFixed(2)}
                  </td>
                </tr>
              )}
              {tipBreakdown.studentSchoolAccount > 0 && (
                <tr>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} (Compte {terminology.organizationLabel})</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    ${tipBreakdown.studentSchoolAccount.toFixed(2)}
                  </td>
                </tr>
              )}
              {tipBreakdown.schoolProject > 0 && (
                <tr>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>Projet {terminology.organizationLabel}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    ${tipBreakdown.schoolProject.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Instructions Section */}
      {paymentMethod === 'cash' ? (
        <div>
          <h3 style={{ color: '#059669' }}>💵 Paiement en argent comptant</h3>
          <div style={{ backgroundColor: '#ECFDF5', borderLeft: '4px solid #10B981', padding: '16px', marginBottom: '20px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#065F46' }}>
              <strong>Numéro de commande :</strong> #{orderId}
            </p>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#065F46' }}>
              <strong>Montant à payer :</strong> {displayAmount.toFixed(2)} $
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#065F46' }}>
              Veuillez remettre le montant en argent comptant au vendeur.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <h3 style={{ color: '#2563EB' }}>💳 Instructions pour le virement Interac</h3>

          {/* Bank Links Section */}
          <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>
              1. Accédez à votre banque en ligne :
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
              <a href="https://www.desjardins.com/fr/" style={{ color: '#2563EB', marginRight: '12px' }}>Desjardins</a>
              <a href="https://www.bnc.ca/fr/particuliers.html" style={{ color: '#2563EB', marginRight: '12px' }}>BNC</a>
              <a href="https://www.rbcbanqueroyale.com/" style={{ color: '#2563EB', marginRight: '12px' }}>RBC</a>
              <a href="https://www.td.com/ca/fr/perso/" style={{ color: '#2563EB', marginRight: '12px' }}>TD</a>
              <a href="https://www.scotiabank.com/ca/fr/particuliers.html" style={{ color: '#2563EB', marginRight: '12px' }}>Scotiabank</a>
              <a href="https://www.cibc.com/fr/personal-banking.html" style={{ color: '#2563EB' }}>CIBC</a>
            </p>
          </div>

          {/* Interac Details */}
          <div style={{ backgroundColor: '#EFF6FF', borderLeft: '4px solid #3B82F6', padding: '16px', marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#1E40AF' }}>
              Veuillez utiliser les informations ci-dessous pour effectuer votre virement Interac :
            </p>

            {sellerName && (
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1F2937' }}>
                <strong>2. Destinataire :</strong> {sellerName}
              </p>
            )}

            {sellerEmail && (
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1F2937' }}>
                <strong>3. Adresse courriel :</strong> <a href={`mailto:${sellerEmail}`} style={{ color: '#2563EB' }}>{sellerEmail}</a>
              </p>
            )}

            {!autoDeposit && (
              <>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1F2937' }}>
                  <strong>4. Question de sécurité :</strong> Numéro de commande
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1F2937' }}>
                  <strong>5. Réponse :</strong> Cmd-{orderId}
                </p>
              </>
            )}

            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1F2937' }}>
              <strong>{autoDeposit ? '4' : '6'}. Montant :</strong> {displayAmount.toFixed(2)} $
            </p>

            <p style={{ margin: 0, fontSize: '14px', color: '#1F2937' }}>
              <strong>{autoDeposit ? '5' : '7'}. Message :</strong> #{orderId}
            </p>
          </div>

          {/* Security question note for non-auto deposit */}
          {!autoDeposit && (
            <div style={{ backgroundColor: '#FFFBEB', borderLeft: '4px solid #F59E0B', padding: '12px', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#92400E' }}>
                <strong>Note importante :</strong> Comme le dépôt automatique n'est pas activé, vous devez utiliser <strong>Cmd-{orderId}</strong> comme réponse à la question de sécurité lors du transfert Interac.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Legacy payment instructions (if provided and Interac details not available) */}
      {paymentInstructions && !sellerEmail && paymentMethod === 'interac' && (
        <div style={{ marginBottom: '20px' }}>
          <p dangerouslySetInnerHTML={{ __html: paymentInstructions }} />
        </div>
      )}

      <div style={{ backgroundColor: '#FEF3C7', borderLeft: '4px solid #F59E0B', padding: '12px', marginTop: '20px', marginBottom: '20px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#92400E' }}>
          <strong>IMPORTANT :</strong> {paymentMethod === 'cash'
            ? 'N\'oubliez pas de remettre le montant en argent comptant au vendeur.'
            : 'Assurez-vous de faire le virement Interac dès que possible.'
          }
          {' '}Si vous avez déjà effectué le paiement, ne tenez pas compte de ce rappel.
        </p>
      </div>

      <p>
        Si vous avez des questions, n'hésitez pas à nous contacter à l'adresse suivante : <a href="mailto:campagne@jappuie.ca">campagne@jappuie.ca</a>.
      </p>

      <p>Cordialement,<br />L'équipe Jappuie</p>
    </div>
  );
};

export default StudentOrderEmailTemplate;