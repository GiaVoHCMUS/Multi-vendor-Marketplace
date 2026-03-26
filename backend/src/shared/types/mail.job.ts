export type OrderConfirmation = {
  to: string;
  customerName: string;
  orderId: string;
  totalAmount: number;
};

export type ShopApproved = {
  to: string;
  ownerName: string;
  shopName: string;
};

export type ShopBanned = {
  to: string;
  ownerName: string;
  shopName: string;
  reason: string;
};

export type WelcomeMail = {
  to: string;
  fullName: string;
  token: string;
};

export type ForgotPasswordMail = {
  to: string;
  fullName: string;
  token: string;
};

export type DailyReportMail = {
  to: string;
  ownerName: string;
  shopName: string;
  totalOrders: number;
  totalRevenue: number;
};

export type OrderCancelledMail = {
  to: string;
  customerName: string;
  orderId: string;
  totalAmount: number;
  shippingAddress: string;
};
