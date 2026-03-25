import { EMAIL, EMAIL_TEMPLATE } from '@/shared/constants/mail.constants';
import { mailService } from '@/shared/services/mail.service';
import {
  ForgotPasswordMail,
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
};
