// src/utils/resendMailer.tsx

import { Resend } from 'resend';
import ReactDOMServer from 'react-dom/server';
import EmailVerificationTemplate from '../components/EmailVerificationTemplate';
import EmailTemplate from '../components/EmailTemplate';
import EmailDeletionTemplate from '../components/EmailDeletionTemplate';
import StudentOrderEmailTemplate from '../components/StudentOrderEmailTemplate';
import PasswordResetEmailTemplate from '../components/PasswordResetEmailTemplate';
import EmailTemplateStudent from '../components/EmailTemplateStudent';
import { SendEmailParams as EmailTypesParams, ProductItemEmail } from './emailTypes';

// Initialize Resend only if API key is available and valid
let resend: any = null;
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== '') {
  try {
    resend = new Resend(process.env.RESEND_API_KEY);
  } catch (error) {
    // Resend initialization failed, will be null
    resend = null;
  }
}

// Get from email address
const getFromEmail = () => {
  return process.env.RESEND_FROM_EMAIL || process.env.GMAIL_USER || 'onboarding@resend.dev';
};

const getFromName = () => {
  return process.env.GMAIL_FROM_NAME || 'Jappuie';
};

// Local interfaces
interface SendDeletionEmailParams {
  to: string;
  subject: string;
  firstName: string;
  storeName: string;
  orderId: string;
  deletionDate: string;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string;
}

interface SendSaleNotificationEmailParams {
  to: string;
  cc?: string;
  subject?: string;
  studentName: string;
  firstName: string;
  customerEmail: string;
  customerPhone: string;
  schoolName?: string;
  schoolAddress?: string;
  deliveryDate?: string;
  products: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    amount: string;
  }[];
  totalAmount: number;
  tip: number;
  autoDeposit: boolean;
  orderId: string;
  orderDate: string;
}

// Use shared SendEmailParams interface
type SendEmailParams = EmailTypesParams;

interface SendPasswordResetEmailParams {
  to: string;
  subject: string;
  resetLink: string;
}

interface SendStudentOrderEmailParams {
  studentPercentage: number;
  orderId: string;
  studentName: string;
  email: string;
  phoneNumber: string;
  schoolName: string;
  products: ProductItemEmail[];
  totalUnits: number;
  totalAmount: number;
  amountPaid: number;
  paymentInstructions: string;
  organizationType?: string; // New field for dynamic terminology
}

interface SendVerificationEmailParams {
  to: string;
  cc?: string;
  subject: string;
  firstName: string;
  verificationUrl: string;
}

/**
 * Envoie un e-mail de vérification via Resend avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail de vérification.
 */
const sendVerificationEmail = async (params: SendVerificationEmailParams) => {
  const { to, cc, subject, firstName, verificationUrl } = params;

  if (!resend) {
    throw new Error('Resend API key not configured');
  }

  try {
    // Générer le contenu HTML en utilisant le composant EmailVerificationTemplate
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <EmailVerificationTemplate
        firstName={firstName}
        verificationUrl={verificationUrl}
      />
    );

    // Envoyer l'e-mail via Resend
    const emailOptions: any = {
      from: `Jappuie <campagne@jappuie.ca>`,
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      emailOptions.cc = cc;
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Erreur Resend lors de l\'envoi de l\'e-mail de vérification:', error);
      throw error;
    }

    console.log(`E-mail de vérification envoyé à ${to} via Resend avec ID: ${data?.id}`);
    return { response: `Resend ID: ${data?.id}` };
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'e-mail de vérification:', error);
    throw error;
  }
};

/**
 * Envoie un e-mail de réinitialisation de mot de passe via Resend avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail de réinitialisation.
 */
const sendPasswordResetEmail = async (params: SendPasswordResetEmailParams) => {
  const { to, subject, resetLink } = params;

  if (!resend) {
    throw new Error('Resend API key not configured');
  }

  try {
    // Générer le contenu HTML en utilisant le composant PasswordResetEmailTemplate
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <PasswordResetEmailTemplate
        resetLink={resetLink}
      />
    );

    // Envoyer l'e-mail via Resend
    const { data, error } = await resend.emails.send({
      from: `Jappuie.ca <commande@jappuie.ca>`,
      to,
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Erreur Resend lors de l\'envoi de l\'e-mail de réinitialisation:', error);
      throw error;
    }

    console.log(`E-mail de réinitialisation envoyé à ${to} via Resend avec ID: ${data?.id}`);
    return { response: `Resend ID: ${data?.id}` };
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'e-mail de réinitialisation:', error);
    throw error;
  }
};

/**
 * Envoie un e-mail via Resend avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail.
 */
const sendEmail = async (params: SendEmailParams) => {
  if (!resend) {
    throw new Error('Resend API key not configured');
  }

  const {
    to,
    cc,
    from,
    subject,
    firstName,
    customerEmail,
    storeName,
    hoursAvailable,
    products,
    totalAmount,
    discount,
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
    organizationType,
    deliveryOption,
    customDeliveryOption,
    customerDeliveryAddress,
  } = params;

  try {
    // Générer le contenu HTML en utilisant le composant EmailTemplate
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <EmailTemplate
        firstName={firstName}
        customerEmail={customerEmail}
        storeName={storeName}
        hoursAvailable={hoursAvailable}
        products={products}
        totalAmount={totalAmount}
        discount={discount}
        originalSubtotal={originalSubtotal}
        tip={tip}
        studentDonation={studentDonation}
        schoolDonation={schoolDonation}
        studentDonationSplit={studentDonationSplit}
        autoDeposit={autoDeposit}
        orderId={orderId}
        orderDate={orderDate}
        orderDeadline={orderDeadline}
        deliveryDate={deliveryDate}
        deliveryLocation={deliveryLocation}
        deliveryCity={deliveryCity}
        sellerName={sellerName}
        sellerPhone={sellerPhone}
        sellerEmail={sellerEmail}
        organizationType={organizationType}
        deliveryOption={deliveryOption}
        customDeliveryOption={customDeliveryOption}
        customerDeliveryAddress={customerDeliveryAddress}
      />
    );

    // Envoyer l'e-mail via Resend
    const emailOptions: any = {
      from: from || `Jappuie <campagne@jappuie.ca>`,
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      emailOptions.cc = cc;
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Erreur Resend lors de l\'envoi de l\'e-mail:', error);
      throw error;
    }

    console.log(`E-mail envoyé à ${to} via Resend avec ID: ${data?.id}`);
    return { response: `Resend ID: ${data?.id}` };
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
    throw error;
  }
};

/**
 * Envoie un e-mail de suppression de commande via Resend avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail de suppression.
 */
const sendDeletionEmail = async (params: SendDeletionEmailParams) => {
  if (!resend) {
    throw new Error('Resend API key not configured');
  }

  const {
    to,
    subject,
    firstName,
    storeName,
    orderId,
    deletionDate,
    sellerName,
    sellerPhone,
    sellerEmail,
  } = params;

  try {
    // Générer le contenu HTML en utilisant le composant EmailDeletionTemplate
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <EmailDeletionTemplate
        firstName={firstName}
        storeName={storeName}
        orderId={orderId}
        deletionDate={deletionDate}
        reason='non paiement'
        sellerName={sellerName}
        sellerPhone={sellerPhone}
        sellerEmail={sellerEmail}
      />
    );

    // Envoyer l'e-mail via Resend
    const { data, error } = await resend.emails.send({
      from: `Jappuie.ca <commande@jappuie.ca>`,
      to,
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Erreur Resend lors de l\'envoi de l\'e-mail de suppression:', error);
      throw error;
    }

    console.log(`E-mail de suppression envoyé à ${to} via Resend avec ID: ${data?.id}`);
    return { response: `Resend ID: ${data?.id}` };
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'e-mail de suppression:', error);
    throw error;
  }
};

/**
 * Envoie un e-mail de confirmation de commande à un étudiant via Resend avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail de confirmation étudiant.
 */
const sendStudentOrderEmail = async (params: SendStudentOrderEmailParams) => {
  if (!resend) {
    throw new Error('Resend API key not configured');
  }

  const {
    studentPercentage,
    orderId,
    studentName,
    email,
    phoneNumber,
    schoolName,
    products,
    totalUnits,
    totalAmount,
    amountPaid,
    paymentInstructions,
  } = params;

  try {
    // Générer le contenu HTML en utilisant le composant StudentOrderEmailTemplate
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <StudentOrderEmailTemplate
        studentPercentage={studentPercentage}
        orderId={orderId}
        studentName={studentName}
        email={email}
        phoneNumber={phoneNumber}
        schoolName={schoolName}
        products={products}
        totalUnits={totalUnits}
        totalAmount={totalAmount}
        amountPaid={amountPaid}
        paymentInstructions={paymentInstructions}
        organizationType={params.organizationType || 'school'}
      />
    );

    // Envoyer l'e-mail via Resend
    const { data, error } = await resend.emails.send({
      from: `Jappuie <campagne@jappuie.ca>`,
      to: email,
      subject: `Confirmation de votre commande - Commande #${orderId}`,
      html: htmlContent,
    });

    if (error) {
      console.error('Erreur Resend lors de l\'envoi de l\'e-mail à l\'étudiant:', error);
      throw error;
    }

    console.log(`E-mail envoyé à l'étudiant ${email} via Resend avec ID: ${data?.id}`);
    return { response: `Resend ID: ${data?.id}` };
  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'e-mail à l'étudiant:", error);
    throw error;
  }
};

/**
 * Envoie un e-mail de notification de vente à l'élève vendeur via Resend avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail de notification de vente.
 */
const sendSaleNotificationEmail = async (params: SendSaleNotificationEmailParams) => {
  if (!resend) {
    throw new Error('Resend API key not configured');
  }

  const {
    to,
    cc,
    subject,
    studentName,
    firstName,
    customerEmail,
    customerPhone,
    schoolName,
    schoolAddress,
    deliveryDate,
    products,
    totalAmount,
    tip,
    autoDeposit,
    orderId,
    orderDate,
  } = params;

  try {
    // Générer le contenu HTML en utilisant le composant EmailTemplateStudent
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <EmailTemplateStudent
        firstName={firstName}
        customerEmail={customerEmail}
        customerPhone={customerPhone}
        studentName={studentName}
        schoolName={schoolName}
        schoolAddress={schoolAddress}
        deliveryDate={deliveryDate}
        products={products}
        totalAmount={totalAmount}
        tip={tip}
        autoDeposit={autoDeposit}
        orderId={orderId}
        orderDate={orderDate}
      />
    );

    // Envoyer l'e-mail via Resend
    const emailOptions: any = {
      from: `Jappuie.ca <commande@jappuie.ca>`,
      to: to,
      subject: subject || `Nouvelle Vente Reçue - Commande #${orderId}`,
      html: htmlContent,
    };

    if (cc) {
      emailOptions.cc = cc;
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Erreur Resend lors de l\'envoi de l\'e-mail de notification de vente:', error);
      throw error;
    }

    console.log(`E-mail de notification de vente envoyé à ${studentName} via Resend avec ID: ${data?.id}`);
    return { response: `Resend ID: ${data?.id}` };
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'e-mail de notification de vente:', error);
    throw error;
  }
};

// Exportation des fonctions
export {
  sendEmail,
  sendDeletionEmail,
  sendStudentOrderEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendSaleNotificationEmail
};

