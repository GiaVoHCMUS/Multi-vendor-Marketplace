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
