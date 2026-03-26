import { env } from '@/core/config/env';
import { formatVNDate } from '../utils/date';

export const EMAIL = {
  ORDER: {
    CONFIRMATION: 'Xác nhận đơn hàng',
    AUTO_CANCELLED: (orderId: string) =>
      `Đơn hàng ${orderId} bị hủy do không hoạt động`,
  },
  SHOP: {
    APPROVAL: 'Phê duyệt cửa hàng',
    BAN: 'Đình chỉ cửa hàng',
  },
  AUTH: {
    WELCOME: `Chào mừng bạn đã đến với ${env.APP_NAME}`,
    FORGOT_PASSWORD: 'Xác nhận đặt lại mật khẩu',
  },
  REPORT: {
    DAILY: `Thống kê doanh số ngày ${formatVNDate(new Date())}`,
  },
};

export const EMAIL_TEMPLATE = {
  ORDER: {
    CONFIRMATION: 'order/order-confirmation',
    AUTO_CANCELLED: 'order/order-auto-cancelled',
  },
  SHOP: {
    APPROVAL: 'shop/shop-approved',
    BAN: 'shop/shop-banned',
  },
  AUTH: {
    WELCOME: 'auth/welcome',
    FORTGOT_PASSWORD: 'auth/forgot-password',
  },
  REPORT: {
    DAILY: '/report/daily',
  },
};
