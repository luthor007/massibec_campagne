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
  organizationType = 'school', // New prop for organization type
}) => {
  const terminology = getTerminology(organizationType);
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#333' }}>
      <h2>Confirmation de votre commande - Commande #{orderId}</h2>

      <p>Bonjour {studentName},</p>

      <p>
        Merci d'avoir passé votre commande avec <strong>Massibec</strong>. Voici les détails de votre commande :
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
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{(product.price - (((product.price - product.cost) * studentPercentage)/100)).toFixed(3) }$</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {((product.price - (((product.price - product.cost) * studentPercentage)/100)) * product.quantity).toFixed(3)}$
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        <strong>Total des unités :</strong> {totalUnits}<br />
        <strong>Montant total :</strong> {totalAmount.toFixed(3)}$<br />
        {/*<strong>Montant payé :</strong> {amountPaid.toFixed(2)}$*/}
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

      <h3>Instructions de paiement :</h3>
      <p dangerouslySetInnerHTML={{ __html: paymentInstructions }} />

      <p>
        Si vous avez des questions, n'hésitez pas à nous contacter à l'adresse suivante : <a href="mailto:facturation@massibec.com">facturation@massibec.com</a>.
      </p>


      <p>Cordialement,<br />L'équipe Massibec</p>
    </div>
  );
};

export default StudentOrderEmailTemplate;