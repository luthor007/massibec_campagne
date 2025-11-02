// src/utils/gmailMailer.tsx
// This file now acts as a router between Gmail/Nodemailer and Resend
// Set EMAIL_PROVIDER=resend in your .env to use Resend, otherwise it defaults to Gmail

import nodemailer from 'nodemailer';
import ReactDOMServer from 'react-dom/server';
import EmailVerificationTemplate from '../components/EmailVerificationTemplate'; // Import the new template
import EmailTemplate from '../components/EmailTemplate'; // Existing templates
import EmailDeletionTemplate from '../components/EmailDeletionTemplate';
import StudentOrderEmailTemplate from '../components/StudentOrderEmailTemplate';
import PasswordResetEmailTemplate from '../components/PasswordResetEmailTemplate';
import EmailTemplateStudent from '../components/EmailTemplateStudent'; // Import the new email template

// Import Resend implementations
import * as ResendMailer from './resendMailer';

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
  organizationType?: string; // New field for dynamic terminology
}

interface SendVerificationEmailParams {
  to: string;
  cc?: string;
  subject: string;
  firstName: string;
  verificationUrl: string;
}

// Création du transporteur SMTP avec Nodemailer
// Supporte Gmail, Outlook/Microsoft 365, Resend, et SendGrid
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER?.toLowerCase() || 'gmail';

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
      from: `Campagne Massibec <commande@massibec.com>`,
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
      from: `Campagne Massibec <commande@massibec.com>`,
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

    // Options de l'e-mail
    const mailOptions: any = {
      from: from || `Campagne Massibec <commande@massibec.com>`,
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
      from: `Campagne Massibec <commande@massibec.com>`,
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

    // Options de l'e-mail
    const mailOptions = {
      from: `Campagne Massibec <commande@massibec.com>`,
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
      from: `Campagne Massibec <commande@massibec.com>`,
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
  if (EMAIL_PROVIDER === 'resend') {
    console.log('📧 Using Resend for verification email');
    return ResendMailer.sendVerificationEmail(params);
  } else if (EMAIL_PROVIDER === 'sendgrid') {
    console.log('📧 Using SendGrid for verification email');
    return SendGridMailer.sendVerificationEmail(params);
  } else {
    console.log(`📧 Using ${EMAIL_PROVIDER === 'outlook' ? 'Outlook/Microsoft 365' : 'Gmail'} for verification email`);
    return sendVerificationEmailViaGmail(params);
  }
};

/**
 * Routes sendPasswordResetEmail to the appropriate provider
 */
const sendPasswordResetEmail = async (params: SendPasswordResetEmailParams) => {
  if (EMAIL_PROVIDER === 'resend') {
    console.log('📧 Using Resend for password reset email');
    return ResendMailer.sendPasswordResetEmail(params);
  } else if (EMAIL_PROVIDER === 'sendgrid') {
    console.log('📧 Using SendGrid for password reset email');
    return SendGridMailer.sendPasswordResetEmail(params);
  } else {
    console.log(`📧 Using ${EMAIL_PROVIDER === 'outlook' ? 'Outlook/Microsoft 365' : 'Gmail'} for password reset email`);
    return sendPasswordResetEmailViaGmail(params);
  }
};

/**
 * Routes sendEmail to the appropriate provider
 */
const sendEmail = async (params: SendEmailParams) => {
  if (EMAIL_PROVIDER === 'resend') {
    console.log('📧 Using Resend for email');
    return ResendMailer.sendEmail(params);
  } else if (EMAIL_PROVIDER === 'sendgrid') {
    console.log('📧 Using SendGrid for email');
    try {
      return await SendGridMailer.sendEmail(params);
    } catch (err: any) {
      console.warn('SendGrid sendEmail failed, falling back to Gmail:', err?.response?.body || err?.message);
      return sendEmailViaGmail(params);
    }
  } else {
    console.log(`📧 Using ${EMAIL_PROVIDER === 'outlook' ? 'Outlook/Microsoft 365' : 'Gmail'} for email`);
    return sendEmailViaGmail(params);
  }
};

/**
 * Routes sendDeletionEmail to the appropriate provider
 */
const sendDeletionEmail = async (params: SendDeletionEmailParams) => {
  if (EMAIL_PROVIDER === 'resend') {
    console.log('📧 Using Resend for deletion email');
    return ResendMailer.sendDeletionEmail(params);
  } else if (EMAIL_PROVIDER === 'sendgrid') {
    console.log('📧 Using SendGrid for deletion email');
    return SendGridMailer.sendDeletionEmail(params);
  } else {
    console.log(`📧 Using ${EMAIL_PROVIDER === 'outlook' ? 'Outlook/Microsoft 365' : 'Gmail'} for deletion email`);
    return sendDeletionEmailViaGmail(params);
  }
};

/**
 * Routes sendStudentOrderEmail to the appropriate provider
 */
const sendStudentOrderEmail = async (params: SendStudentOrderEmailParams) => {
  if (EMAIL_PROVIDER === 'resend') {
    console.log('📧 Using Resend for student order email');
    return ResendMailer.sendStudentOrderEmail(params);
  } else if (EMAIL_PROVIDER === 'sendgrid') {
    console.log('📧 Using SendGrid for student order email');
    try {
      return await SendGridMailer.sendStudentOrderEmail(params);
    } catch (err: any) {
      console.warn('SendGrid sendStudentOrderEmail failed, falling back to Gmail:', err?.response?.body || err?.message);
      return sendStudentOrderEmailViaGmail(params);
    }
  } else {
    console.log(`📧 Using ${EMAIL_PROVIDER === 'outlook' ? 'Outlook/Microsoft 365' : 'Gmail'} for student order email`);
    return sendStudentOrderEmailViaGmail(params);
  }
};

/**
 * Routes sendSaleNotificationEmail to the appropriate provider
 */
const sendSaleNotificationEmail = async (params: SendSaleNotificationEmailParams) => {
  if (EMAIL_PROVIDER === 'resend') {
    console.log('📧 Using Resend for sale notification email');
    return ResendMailer.sendSaleNotificationEmail(params);
  } else if (EMAIL_PROVIDER === 'sendgrid') {
    console.log('📧 Using SendGrid for sale notification email');
    try {
      return await SendGridMailer.sendSaleNotificationEmail(params);
    } catch (err: any) {
      console.warn('SendGrid sendSaleNotificationEmail failed, falling back to Gmail:', err?.response?.body || err?.message);
      return sendSaleNotificationEmailViaGmail(params);
    }
  } else {
    console.log(`📧 Using ${EMAIL_PROVIDER === 'outlook' ? 'Outlook/Microsoft 365' : 'Gmail'} for sale notification email`);
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
  sendMassibecConfirmationEmail
} from './sendgridMailer';