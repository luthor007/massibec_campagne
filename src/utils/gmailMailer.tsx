// src/utils/gmailMailer.ts

import nodemailer from 'nodemailer';
import ReactDOMServer from 'react-dom/server';
import EmailVerificationTemplate from '../components/EmailVerificationTemplate'; // Import the new template
import EmailTemplate from '../components/EmailTemplate'; // Existing templates
import EmailDeletionTemplate from '../components/EmailDeletionTemplate';
import StudentOrderEmailTemplate from '../components/StudentOrderEmailTemplate';
import PasswordResetEmailTemplate from '../components/PasswordResetEmailTemplate';
import EmailTemplateStudent from '../components/EmailTemplateStudent'; // Import the new email template

// Interfaces (existing)
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
  firstName: string; // Customer's first name
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

// Création du transporteur SMTP avec Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // Votre adresse e-mail Gmail
    pass: process.env.GMAIL_PASS, // Votre mot de passe d'application Gmail
  },
});

/**
 * Envoie un e-mail de vérification via Gmail SMTP avec un contenu HTML généré par un composant React.
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

    // Options de l'e-mail
    const mailOptions = {
      from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    };

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
const sendPasswordResetEmail = async (params: SendPasswordResetEmailParams) => {
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
      from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
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

    // Options de l'e-mail
    const mailOptions = {
      from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    };

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
        reason='non paiement' // Vous pouvez rendre ceci dynamique si nécessaire
        sellerName={sellerName}
        sellerPhone={sellerPhone}
        sellerEmail={sellerEmail}
      />
    );

    // Options de l'e-mail
    const mailOptions = {
      from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
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

    // Options de l'e-mail
    const mailOptions = {
      from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
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

    // Options de l'e-mail
    const mailOptions = {
      from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
      to: to, // Send to the student's email
      subject: `Nouvelle Vente Reçue - Commande #${orderId}`,
      html: htmlContent,
    };

    // Envoyer l'e-mail
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-mail de notification de vente envoyé à ${studentName} avec le statut: ${info.response}`);
    return info;
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'e-mail de notification de vente:', error);
    throw error;
  }
};

// Exportation des fonctions
export { sendEmail, sendDeletionEmail, sendStudentOrderEmail, sendPasswordResetEmail, sendVerificationEmail, sendSaleNotificationEmail };