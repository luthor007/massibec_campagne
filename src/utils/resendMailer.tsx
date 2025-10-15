// src/utils/resendMailer.tsx

import { Resend } from 'resend';
import ReactDOMServer from 'react-dom/server';
import EmailVerificationTemplate from '../components/EmailVerificationTemplate';
import EmailTemplate from '../components/EmailTemplate';
import EmailDeletionTemplate from '../components/EmailDeletionTemplate';
import StudentOrderEmailTemplate from '../components/StudentOrderEmailTemplate';
import PasswordResetEmailTemplate from '../components/PasswordResetEmailTemplate';
import EmailTemplateStudent from '../components/EmailTemplateStudent';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Get from email address
const getFromEmail = () => {
  return process.env.RESEND_FROM_EMAIL || process.env.GMAIL_USER || 'onboarding@resend.dev';
};

const getFromName = () => {
  return process.env.GMAIL_FROM_NAME || 'Massibec Financement';
};

// Interfaces (matching gmailMailer interfaces)
interface ProductItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  amount: string;
}

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
  studentName: string;
  firstName: string;
  customerEmail: string;
  customerPhone: string;
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

interface SendEmailParams {
  to: string;
  subject: string;
  firstName: string;
  customerEmail: string;
  storeName: string;
  hoursAvailable: string;
  products: ProductItem[];
  totalAmount: number;
  tip: number;
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
}

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
  products: ProductItem[];
  totalUnits: number;
  totalAmount: number;
  amountPaid: number;
  paymentInstructions: string;
}

interface SendVerificationEmailParams {
  to: string;
  subject: string;
  firstName: string;
  verificationUrl: string;
}

/**
 * Envoie un e-mail de vérification via Resend avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail de vérification.
 */
const sendVerificationEmail = async (params: SendVerificationEmailParams) => {
  const { to, subject, firstName, verificationUrl } = params;

  try {
    // Générer le contenu HTML en utilisant le composant EmailVerificationTemplate
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <EmailVerificationTemplate
        firstName={firstName}
        verificationUrl={verificationUrl}
      />
    );

    // Envoyer l'e-mail via Resend
    const { data, error } = await resend.emails.send({
      from: `${getFromName()} <${getFromEmail()}>`,
      to,
      subject,
      html: htmlContent,
    });

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

  try {
    // Générer le contenu HTML en utilisant le composant PasswordResetEmailTemplate
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <PasswordResetEmailTemplate
        resetLink={resetLink}
      />
    );

    // Envoyer l'e-mail via Resend
    const { data, error } = await resend.emails.send({
      from: `${getFromName()} <${getFromEmail()}>`,
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
  const {
    to,
    subject,
    firstName,
    customerEmail,
    storeName,
    hoursAvailable,
    products,
    totalAmount,
    tip,
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
        tip={tip}
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
      />
    );

    // Envoyer l'e-mail via Resend
    const { data, error } = await resend.emails.send({
      from: `${getFromName()} <${getFromEmail()}>`,
      to,
      subject,
      html: htmlContent,
    });

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
      from: `${getFromName()} <${getFromEmail()}>`,
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
      />
    );

    // Envoyer l'e-mail via Resend
    const { data, error } = await resend.emails.send({
      from: `${getFromName()} <${getFromEmail()}>`,
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
  const {
    to,
    studentName,
    firstName,
    customerEmail,
    customerPhone,
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
        products={products}
        totalAmount={totalAmount}
        tip={tip}
        autoDeposit={autoDeposit}
        orderId={orderId}
        orderDate={orderDate}
      />
    );

    // Envoyer l'e-mail via Resend
    const { data, error } = await resend.emails.send({
      from: `${getFromName()} <${getFromEmail()}>`,
      to: to,
      subject: `Nouvelle Vente Reçue - Commande #${orderId}`,
      html: htmlContent,
    });

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

