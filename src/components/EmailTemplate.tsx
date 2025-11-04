// components/EmailTemplate.tsx

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

interface EmailTemplateProps {
  firstName: string;
  customerEmail: string;
  storeName: string;
  hoursAvailable: string;
  products: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    amount: string;
  }[];
  totalAmount: number;
  tip?: number; // Legacy field
  studentDonation?: number;
  schoolDonation?: number;
  studentDonationSplit?: {
    studentAccount: number;
    studentCash: number;
  };
  autoDeposit: boolean;
  orderId: string;
  orderDate: string;
  orderDeadline: string;
  deliveryDate: string;
  deliveryLocation: string;
  deliveryCity: string;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string;
  organizationType?: string; // New prop for organization type
}

const EmailTemplate: React.FC<EmailTemplateProps> = ({
  firstName,
  customerEmail,
  hoursAvailable,
  products,
  totalAmount,
  tip = 0,
  studentDonation = 0,
  schoolDonation = 0,
  studentDonationSplit,
  autoDeposit,
  orderId,
  orderDate,
  orderDeadline,
  deliveryDate,
  deliveryLocation,
  deliveryCity,
  sellerName,
  sellerPhone,
  sellerEmail,
  organizationType = 'school', // Default to school for backward compatibility
}) => {
  // Get terminology based on organization type
  const terminology = getTerminology(organizationType);
  // Calculate total donation (new or legacy)
  const totalDonation = studentDonation + schoolDonation + tip;
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.1', color: '#333' }}>

      <p>Merci <strong>{firstName}</strong> pour votre commande.</p>
      <p>La livraison se fera le <strong>{deliveryDate}</strong> et les produits vous seront donc acheminés tel que nous avons personnellement convenu.</p>


      <h3 style={{ color: '#4A90E2', fontWeight: 'bold' }}>Transfert Interac</h3>
      <p>Pour finaliser votre commande, merci d'effectuer le transfert Interac à :</p>
      <p>
        <strong>Destinataire :</strong> {sellerName} <br />
        <strong>Adresse courriel :</strong> <a href={`mailto:${sellerEmail}`}>{sellerEmail}</a> <br />
        {autoDeposit ? null : <><strong>Question de sécurité :</strong> {firstName}<br /></>}
        {autoDeposit ? null : <strong>Réponse :</strong>} {autoDeposit ? null : <a href={`mailto:${customerEmail}`}>{customerEmail}</a>}<br />
        <strong>Montant :</strong> {((totalAmount || 0) + (studentDonation || 0)).toFixed(2)} $<br/>
        {autoDeposit ? <><strong>Message :</strong> #{orderId}</> : null}
      </p>


      <h3 style={{ color: '#4A90E2', fontWeight: 'bold' }}>Détails de la commande :</h3>
      <p><strong>Nom du vendeur :</strong> {sellerName}</p>
      <p><strong>Numéro de téléphone du vendeur :</strong> {sellerPhone}</p>
      <p><strong>Email du vendeur :</strong> <a href={`mailto:${sellerEmail}`}>{sellerEmail}</a></p>
      <p><strong>Numéro de commande :</strong> #{orderId}</p>
      <p><strong>Date de la commande :</strong> {orderDate}</p>
 
      <h3>Produits commandés :</h3>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Produit</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Quantité</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Prix Unitaire</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {products.map((item, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.productName}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${(item.price || 0).toFixed(2)}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${item.amount}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Total des unités :</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
              {products.reduce((acc, item) => acc + item.quantity, 0)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Nombre de caisses :</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
              {(products.reduce((acc, item) => acc + item.quantity * 0.17, 0)).toFixed(2)}
            </td>
          </tr>
          {/* Donation row(s) */}
          {totalDonation > 0 && (
            <>
              {studentDonation > 0 && (
                <tr>
                  <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Don {terminology.participant} :</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', color: '#3B82F6' }}>
                    ${studentDonation.toFixed(2)}
                  </td>
                </tr>
              )}
              {schoolDonation > 0 && (
                <tr>
                  <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Don {terminology.organization} :</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', color: '#10B981' }}>
                    ${schoolDonation.toFixed(2)}
                  </td>
                </tr>
              )}
              {/* Legacy tip display for backward compatibility */}
              {tip > 0 && studentDonation === 0 && schoolDonation === 0 && (
                <tr>
                  <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Pourboire :</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    ${tip.toFixed(2)}
                  </td>
                </tr>
              )}
            </>
          )}
          <tr>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Total à payer :</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
              ${((totalAmount || 0) + (totalDonation || 0)).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
      
      <p>
        Merci de votre soutien, et si vous souhaitez ajouter des produits, vous avez jusqu'au <strong>{orderDeadline}</strong> pour envoyer votre commande et paiement.
      </p>
      
      <p>
        Merci encore.
      </p>
    </div>
  );
};

export default EmailTemplate;