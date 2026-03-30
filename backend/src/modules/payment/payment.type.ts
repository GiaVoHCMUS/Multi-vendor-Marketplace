import { PaymentMethod } from "@prisma/client";

export interface CreatePaymentInput {
  orderGroupId: string;
  ipAddr: string;
  provider: PaymentMethod;
}

export interface PaymentUrlResponse {
  paymentUrl: string;
}

export interface VNPayReturnQuery {
  vnp_TxnRef: string;
  vnp_ResponseCode: string;
  vnp_Amount: string;
  vnp_SecureHash: string;
  [key: string]: string;
}
