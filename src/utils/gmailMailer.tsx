// src/utils/gmailMailer.tsx
// This file now acts as a router between Gmail/Nodemailer and SendGrid
// Set EMAIL_PROVIDER=sendgrid in your .env to use SendGrid, otherwise it defaults to Gmail

import nodemailer from 'nodemailer';
import ReactDOMServer from 'react-dom/server';
import EmailVerificationTemplate from '../components/EmailVerificationTemplate'; // Import the new template
import EmailTemplate from '../components/EmailTemplate'; // Existing templates
import EmailDeletionTemplate from '../components/EmailDeletionTemplate';
import StudentOrderEmailTemplate from '../components/StudentOrderEmailTemplate';
import PasswordResetEmailTemplate from '../components/PasswordResetEmailTemplate';
import EmailTemplateStudent from '../components/EmailTemplateStudent'; // Import the new email template

// Import SendGrid implementations
import * as SendGridMailer from './sendgridMailer';
import { SendEmailParams as SharedSendEmailParams, ProductItemEmail } from './emailTypes';

// Interfaces (existing)
type ProductItem = ProductItemEmail;

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
  firstName: string; // Customer's first name
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

type SendEmailParams = SharedSendEmailParams;

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
  organizationType?: string;
  // New Interac payment instruction fields
  sellerName?: string;
  sellerEmail?: string;
  autoDeposit?: boolean;
  amountToPay?: number;
  paymentMethod?: 'interac' | 'cash';
}

interface SendVerificationEmailParams {
  to: string;
  cc?: string;
  subject: string;
  firstName: string;
  verificationUrl: string;
}

// Création du transporteur SMTP avec Nodemailer
// Supporte Gmail, Outlook/Microsoft 365, et SendGrid
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER?.toLowerCase() || 'sendgrid';

let transporterConfig: any;

if (EMAIL_PROVIDER === 'outlook') {
  // Configuration pour Microsoft 365 / Outlook
  transporterConfig = {
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.OUTLOOK_USER,
      pass: process.env.OUTLOOK_PASS,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  };
} else {
  // Configuration par défaut pour Gmail
  transporterConfig = {
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  };
}

const transporter = nodemailer.createTransport(transporterConfig);

/**
 * Envoie un e-mail de vérification via Gmail SMTP avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail de vérification.
 */
const sendVerificationEmailViaGmail = async (params: SendVerificationEmailParams) => {
  const { to, cc, subject, firstName, verificationUrl } = params;

  try {
    // Générer le contenu HTML en utilisant le composant EmailVerificationTemplate
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <EmailVerificationTemplate
        firstName={firstName}
        verificationUrl={verificationUrl}
      />
    );

    // Options de l'e-mail
    const mailOptions: any = {
      from: `Jappuie <commande@jappuie.ca>`,
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      mailOptions.cc = cc;
    }

    // Envoyer l'e-mail
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-mail de vérification envoyé à ${to} avec le statut: ${info.response}`);
    return info;
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'e-mail de vérification:', error);
    throw error;
  }
};

/**
 * Envoie un e-mail de réinitialisation de mot de passe via Gmail SMTP avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail de réinitialisation.
 */
const sendPasswordResetEmailViaGmail = async (params: SendPasswordResetEmailParams) => {
  const { to, subject, resetLink } = params;

  try {
    // Générer le contenu HTML en utilisant le composant PasswordResetEmailTemplate
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <PasswordResetEmailTemplate
        resetLink={resetLink}
      />
    );

    // Options de l'e-mail
    const mailOptions = {
      from: `Jappuie <commande@jappuie.ca>`,
      to,
      subject,
      html: htmlContent,
    };

    // Envoyer l'e-mail
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-mail de réinitialisation envoyé à ${to} avec le statut: ${info.response}`);
    return info;
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'e-mail de réinitialisation:', error);
    throw error;
  }
};

/**
 * Envoie un e-mail via Gmail SMTP avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail.
 */
const sendEmailViaGmail = async (params: SendEmailParams) => {
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
    tip,
    studentDonation,
    schoolDonation,
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

    // Options de l'e-mail
    const mailOptions: any = {
      from: from || `Jappuie <campagne@jappuie.ca>`,
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      mailOptions.cc = cc;
    }

    // Envoyer l'e-mail
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-mail envoyé à ${to} avec le statut: ${info.response}`);
    return info;
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
    throw error;
  }
};

/**
 * Envoie un e-mail de suppression de commande via Gmail SMTP avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail de suppression.
 */
const sendDeletionEmailViaGmail = async (params: SendDeletionEmailParams) => {
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
        reason='non paiement' // Vous pouvez rendre ceci dynamique si nécessaire
        sellerName={sellerName}
        sellerPhone={sellerPhone}
        sellerEmail={sellerEmail}
      />
    );

    // Options de l'e-mail
    const mailOptions = {
      from: `Jappuie <commande@jappuie.ca>`,
      to,
      subject,
      html: htmlContent,
    };

    // Envoyer l'e-mail
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-mail de suppression envoyé à ${to} avec le statut: ${info.response}`);
    return info;
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'e-mail de suppression:', error);
    throw error;
  }
};

/**
 * Envoie un e-mail de confirmation de commande à un étudiant via Gmail SMTP avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail de confirmation étudiant.
 */
const sendStudentOrderEmailViaGmail = async (params: SendStudentOrderEmailParams) => {
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
    sellerName,
    sellerEmail,
    autoDeposit,
    amountToPay,
    paymentMethod,
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
        sellerName={sellerName}
        sellerEmail={sellerEmail}
        autoDeposit={autoDeposit ?? true}
        amountToPay={amountToPay}
        paymentMethod={paymentMethod || 'interac'}
      />
    );

    // Options de l'e-mail
    const mailOptions = {
      from: `Jappuie <commande@jappuie.ca>`,
      to: email, // Envoi à l'adresse e-mail de l'étudiant
      subject: `Confirmation de votre commande - Commande #${orderId}`,
      html: htmlContent,
    };

    // Envoyer l'e-mail
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-mail envoyé à l'étudiant ${email} avec le statut: ${info.response}`);
    return info;
  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'e-mail à l'étudiant:", error);
    throw error;
  }
};

/**
 * Envoie un e-mail de notification de vente à l'élève vendeur via Gmail SMTP avec un contenu HTML généré par un composant React.
 * @param params - Paramètres pour personnaliser l'e-mail de notification de vente.
 */
const sendSaleNotificationEmailViaGmail = async (params: SendSaleNotificationEmailParams) => {
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

    // Options de l'e-mail
    const mailOptions: any = {
      from: `Jappuie <commande@jappuie.ca>`,
      to: to,
      subject: subject || `Nouvelle Vente Reçue - Commande #${orderId}`,
      html: htmlContent,
    };

    if (cc) {
      mailOptions.cc = cc;
    }

    // Envoyer l'e-mail
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-mail de notification de vente envoyé à ${studentName} avec le statut: ${info.response}`);
    return info;
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'e-mail de notification de vente:', error);
    throw error;
  }
};

// ============================================================================
// ROUTER FUNCTIONS - Check EMAIL_PROVIDER env variable to route to correct implementation
// ============================================================================

/**
 * Routes sendVerificationEmail to the appropriate provider
 */
const sendVerificationEmail = async (params: SendVerificationEmailParams) => {
  if (EMAIL_PROVIDER === 'sendgrid') {
    return SendGridMailer.sendVerificationEmail(params);
  } else {
    return sendVerificationEmailViaGmail(params);
  }
};

/**
 * Routes sendPasswordResetEmail to the appropriate provider
 */
const sendPasswordResetEmail = async (params: SendPasswordResetEmailParams) => {
  if (EMAIL_PROVIDER === 'sendgrid') {
    return SendGridMailer.sendPasswordResetEmail(params);
  } else {
    return sendPasswordResetEmailViaGmail(params);
  }
};

/**
 * Routes sendEmail to the appropriate provider
 */
const sendEmail = async (params: SendEmailParams) => {
  if (EMAIL_PROVIDER === 'sendgrid') {
    try {
      return await SendGridMailer.sendEmail(params);
    } catch (err: any) {
      // Log SendGrid error details
      console.error('Erreur SendGrid dans sendEmail:', err);
      if (err.response?.body?.errors) {
        console.error('Détails de l\'erreur SendGrid:', JSON.stringify(err.response.body.errors, null, 2));
      }
      // Only fallback to Gmail if Gmail credentials are configured
      if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
        console.log('Tentative de fallback vers Gmail...');
        try {
          return await sendEmailViaGmail(params);
        } catch (gmailError: any) {
          console.error('Erreur Gmail (fallback):', gmailError);
          // Re-throw the original SendGrid error if Gmail also fails
          throw err;
        }
      } else {
        // If Gmail credentials are not configured, just throw the SendGrid error
        throw err;
      }
    }
  } else {
    return sendEmailViaGmail(params);
  }
};

/**
 * Routes sendDeletionEmail to the appropriate provider
 */
const sendDeletionEmail = async (params: SendDeletionEmailParams) => {
  if (EMAIL_PROVIDER === 'sendgrid') {
    return SendGridMailer.sendDeletionEmail(params);
  } else {
    return sendDeletionEmailViaGmail(params);
  }
};

/**
 * Routes sendStudentOrderEmail to the appropriate provider
 */
const sendStudentOrderEmail = async (params: SendStudentOrderEmailParams) => {
  if (EMAIL_PROVIDER === 'sendgrid') {
    try {
      return await SendGridMailer.sendStudentOrderEmail(params);
    } catch (err: any) {
      // Fallback to Gmail if SendGrid fails
      return sendStudentOrderEmailViaGmail(params);
    }
  } else {
    return sendStudentOrderEmailViaGmail(params);
  }
};

/**
 * Routes sendSaleNotificationEmail to the appropriate provider
 */
const sendSaleNotificationEmail = async (params: SendSaleNotificationEmailParams) => {
  if (EMAIL_PROVIDER === 'sendgrid') {
    try {
      return await SendGridMailer.sendSaleNotificationEmail(params);
    } catch (err: any) {
      // Fallback to Gmail if SendGrid fails
      return sendSaleNotificationEmailViaGmail(params);
    }
  } else {
    return sendSaleNotificationEmailViaGmail(params);
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

// Exportation des nouvelles fonctions SendGrid spécifiques
export {
  sendSchoolConfirmationEmail,
  sendStudentConfirmationEmail,
  sendOrderConfirmationEmail,
  sendJappuieConfirmationEmail
} from './sendgridMailer';