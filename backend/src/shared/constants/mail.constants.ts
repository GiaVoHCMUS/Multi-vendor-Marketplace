import { env } from '@/core/config/env';

export const EMAIL = {
  ORDER: {
    CONFIRMATION: 'Xác nhận đơn hàng',
  },
  SHOP: {
    APPROVAL: 'Phê duyệt cửa hàng',
    BAN: 'Đình chỉ cửa hàng',
  },
  AUTH: {
    WELCOME: `Chào mừng bạn đã đến với ${env.APP_NAME}`,
    FORGOT_PASSWORD: 'Xác nhận đặt lại mật khẩu',
  },
};

export const EMAIL_TEMPLATE = {
  ORDER: {
    CONFIRMATION: 'order/order-confirmation',
  },
  SHOP: {
    APPROVAL: 'shop/shop-approved',
    BAN: 'shop/shop-banned',
  },
  AUTH: {
    WELCOME: 'auth/welcome',
    FORTGOT_PASSWORD: 'auth/forgot-password',
  },
};
