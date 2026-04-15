import { EMAIL, EMAIL_TEMPLATE } from '@/shared/constants/mail.constants';
import { mailService } from '@/shared/services/mail.service';
import {
  DailyReportMail,
  ForgotPasswordMail,
  OrderCancelledMail,
  orderCheckoutFailedMail,
  OrderCheckoutSuccessfullyMail,
  OrderConfirmation,
  ShopApproved,
  ShopBanned,
  WelcomeMail,
} from '@/shared/types/mail.job';

export const handleSendEmail = {
  confirm: async (data: OrderConfirmation) => {
    const { to, customerName, orderId, totalAmount } = data;
    await mailService.sendWithTemplate(
      to,
      EMAIL.ORDER.CONFIRMATION,
      EMAIL_TEMPLATE.ORDER.CONFIRMATION,
      {
        customerName,
        orderId,
        totalAmount,
      },
    );
  },

  approveShop: async (data: ShopApproved) => {
    const { to, ownerName, shopName } = data;
    await mailService.sendWithTemplate(
      to,
      EMAIL.SHOP.APPROVAL,
      EMAIL_TEMPLATE.SHOP.APPROVAL,
      {
        ownerName,
        shopName,
      },
    );
  },

  banShop: async (data: ShopBanned) => {
    const { to, ownerName, shopName, reason } = data;
    await mailService.sendWithTemplate(
      to,
      EMAIL.SHOP.BAN,
      EMAIL_TEMPLATE.SHOP.BAN,
      {
        ownerName,
        shopName,
        reason,
      },
    );
  },

  welcome: async (data: WelcomeMail) => {
    const { to, fullName, token } = data;
    await mailService.sendWithTemplate(
      to,
      EMAIL.AUTH.WELCOME,
      EMAIL_TEMPLATE.AUTH.WELCOME,
      { to, fullName, token },
    );
  },

  forgotPassword: async (data: ForgotPasswordMail) => {
    const { to, fullName, token } = data;
    await mailService.sendWithTemplate(
      to,
      EMAIL.AUTH.FORGOT_PASSWORD,
      EMAIL_TEMPLATE.AUTH.FORTGOT_PASSWORD,
      { to, fullName, token },
    );
  },

  dailyReport: async (data: DailyReportMail) => {
    const { to, ownerName, shopName, totalOrders, totalRevenue } = data;
    await mailService.sendWithTemplate(
      to,
      EMAIL.REPORT.DAILY,
      EMAIL_TEMPLATE.REPORT.DAILY,
      {
        ownerName,
        shopName,
        totalOrders,
        totalRevenue,
      },
    );
  },

  orderAutoCancelled: async (data: OrderCancelledMail) => {
    const { to, customerName, orderId, totalAmount, shippingAddress } = data;
    console.log('Gửi email');
    await mailService.sendWithTemplate(
      to,
      EMAIL.ORDER.AUTO_CANCELLED(orderId),
      EMAIL_TEMPLATE.ORDER.AUTO_CANCELLED,
      {
        customerName,
        orderId,
        totalAmount,
        shippingAddress,
      },
    );
  },

  orderCheckoutSuccessfully: async (data: OrderCheckoutSuccessfullyMail) => {
    const { to, customerName, orderId, totalAmount } = data;
    await mailService.sendWithTemplate(
      to,
      EMAIL.ORDER.CHECKOUT_SUCCESSFULLY,
      EMAIL_TEMPLATE.ORDER.CHECKOUT_SUCCESSFULLY,
      {
        customerName,
        orderId,
        totalAmount,
      },
    );
  },

  orderCheckoutFailed: async (data: orderCheckoutFailedMail) => {
    const { to, customerName, orderId, totalAmount } = data;
    await mailService.sendWithTemplate(
      to,
      EMAIL.ORDER.CHECKOUT_FAILED,
      EMAIL_TEMPLATE.ORDER.CHECKOUT_FAILED,
      {
        customerName,
        orderId,
        totalAmount,
      },
    );
  },
};
