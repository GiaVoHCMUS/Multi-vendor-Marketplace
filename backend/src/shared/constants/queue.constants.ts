export const QUEUE_NAME = {
  EMAIL: 'mail-queue',
  ORDER: 'order-queue',
  REPORT: 'report-queue',
};

export const JOB_NAME = {
  EMAIL: {
    WELCOME: 'welcome-email',
    FORGOT_PASSWORD: 'forgot-password',
    ORDER_CONFIRMATION: 'send-order-confirmation',
    SHOP_APPROVED: 'send-shop-approved-email',
    SHOP_BANNED: 'send-shop-banned-email',
    DAILY_REPORT: 'daily-report-email',
    ORDER_AUTO_CANCELLED: 'order-auto-cancelled-email',
  },

  ORDER: {
    AUTO_CANCEL: 'auto-cancel-order',
  },

  REPORT: {
    DAILY: 'daily-report',
  },
};

export const JOB_ID = {
  EMAIL: {
    WELCOME: (userId: string) => `email:welcome:${userId}`,
    FORGOT_PASSWORD: (userId: string, token: string) =>
      `email:forgot-password:${userId}:${token}`,
    ORDER_CONFIRMATION: (orderId: string) =>
      `email:order-confirmation:${orderId}`,
    SHOP_APPROVED: (shopId: string) => `email:shop-approved:${shopId}`,
    SHOP_BANNED: (shopId: string) => `email:shop-banned:${shopId}`,
  },

  CRON: {
    ORDER_CLEANUP_EVERY_5M: 'cron:order:cleanup-5m',
    DAILY_REPORT: 'cron:report:daily',
  },
};
