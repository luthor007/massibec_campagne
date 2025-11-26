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
  discount?: number; // Discount amount
  originalSubtotal?: number; // Original subtotal before discount
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
  deliveryOption?: string; // Option de livraison choisie
  customDeliveryOption?: string; // Option personnalisée si "Autre" est sélectionné
  customerDeliveryAddress?: string; // Adresse du client pour livraison
}

const EmailTemplate: React.FC<EmailTemplateProps> = ({
  firstName,
  customerEmail,
  hoursAvailable,
  products,
  totalAmount,
  discount = 0,
  originalSubtotal,
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
  deliveryOption,
  customDeliveryOption,
  customerDeliveryAddress,
}) => {
  // Get terminology based on organization type
  const terminology = getTerminology(organizationType);
  // Calculate total donation (new or legacy)
  const totalDonation = studentDonation + schoolDonation + tip;
  // Calculate original subtotal if not provided
  const subtotal = originalSubtotal || products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const hasDiscount = discount > 0;
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.1', color: '#333' }}>

      <p>Merci <strong>{firstName}</strong> pour votre commande.</p>
      <p>La livraison se fera le <strong>{deliveryDate}</strong> et les produits vous seront donc acheminés tel que nous avons personnellement convenu.{deliveryOption && (
        <>
          {' '}Mode de livraison : <strong>{deliveryOption === 'Autre' && customDeliveryOption ? customDeliveryOption : deliveryOption === 'Livraison (si près de chez moi)' && customerDeliveryAddress ? `Livraison à ${customerDeliveryAddress}` : deliveryOption}</strong>
        </>
      )}</p>


      <h3 style={{ color: '#4A90E2', fontWeight: 'bold' }}>Transfert Interac</h3>
      <p>Pour finaliser votre commande, merci d'effectuer le transfert Interac à :</p>
      <p>
        <strong>Destinataire :</strong> {sellerName} <br />
        <strong>Adresse courriel :</strong> <a href={`mailto:${sellerEmail}`}>{sellerEmail}</a> <br />
        {autoDeposit ? null : <><strong>Question de sécurité :</strong> Numéro de commande<br /></>}
        {autoDeposit ? null : <><strong>Réponse :</strong> Cmd-{orderId}<br /></>}
        <strong>Montant :</strong> {((totalAmount || 0) + (totalDonation || 0)).toFixed(2)} $<br />
        {autoDeposit ? <><strong>Message :</strong> #{orderId}</> : null}
      </p>
      {!autoDeposit && (
        <p style={{ fontSize: '0.9em', color: '#666', fontStyle: 'italic', marginTop: '10px' }}>
          <strong>Note importante :</strong> Comme vous n'avez pas activé le dépôt automatique, vous devez utiliser <strong>Cmd-{orderId}</strong> comme réponse à la question de sécurité lors du transfert Interac.
        </p>
      )}


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
          {/* Subtotal row (only show if different from totalAmount due to discount) */}
          {hasDiscount && (
            <tr>
              <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Sous-total produits :</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                ${subtotal.toFixed(2)}
              </td>
            </tr>
          )}
          {/* Discount row */}
          {hasDiscount && (
            <tr>
              <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#10B981' }}>Rabais ({((discount / subtotal) * 100).toFixed(0)}%) :</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', color: '#10B981' }}>
                -${discount.toFixed(2)}
              </td>
            </tr>
          )}
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