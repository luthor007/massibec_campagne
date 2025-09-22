// types/orderStudent.ts

export interface IOrderStudent {
    timestamp: Date;
    email: string;
    studentName: string;
    phoneNumber: string;
    products: {
      productName: string;
      quantity: number;
      price: number;
    }[];
    totalUnits: number;
    totalAmount: number;
    amountPaid: number;
    orderId: string;
    transferAmount?: number;
    studentBenefit: number;
    raffleAmount?: number;
    organizationBenefit: number;
    bonusOrganization?: number;
    createdAt: Date;
  }