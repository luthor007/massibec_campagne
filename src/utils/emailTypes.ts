// Shared email-related types to avoid duplication and type mismatches

export interface ProductItemEmail {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  amount: string;
  // Optional fields used in some calculations (e.g., SendGrid legacy calc)
  cost?: number;
}

export interface SendEmailParams {
  to: string;
  cc?: string;
  from?: string;
  subject: string;
  firstName: string;
  customerEmail: string;
  storeName: string;
  hoursAvailable: string;
  products: ProductItemEmail[];
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
  // Campaign-specific profit data (per product)
  campaignId?: string;
  campaignNumber?: number;
  profitSplits?: Array<{
    productId: string;
    // New fields
    studentCash?: number;
    studentSchoolAccount?: number;
    schoolProject?: number;
    raffle: number;
    // Legacy fields for backward compatibility
    school?: number;
    student?: number;
  }>;
  customPrices?: Array<{
    productId: string;
    price: number;
  }>;
  // Legacy fields for backward compatibility (will be calculated from campaign data)
  studentPercentage?: number;
  studentBenefit?: number;
  organizationBenefit?: number;
  raffleBenefit?: number;
  totalUnits?: number;
  totalStudentBenefit?: number;
  totalOrganizationBenefit?: number;
  totalRaffleBenefit?: number;
  email: string;
  organizationType?: string; // New field for dynamic terminology
  deliveryOption?: string; // Option de livraison choisie
  customDeliveryOption?: string; // Option personnalisée si "Autre" est sélectionné
  customerDeliveryAddress?: string; // Adresse du client pour livraison
}


