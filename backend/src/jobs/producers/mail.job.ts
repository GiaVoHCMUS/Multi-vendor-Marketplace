import { mailQueue } from '@/core/queue/mail.queue';
import { JOB_NAME } from '@/shared/constants/queue.constants';
import { OrderConfirmation, ShopApproved, ShopBanned } from '@/shared/types/mail.job';

const config = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3000,
  },
  removeOnComplete: true,
  removeOnFail: 1000,
};

export const mailJob = {
  sendOrderConfirmation: async (data: OrderConfirmation) => {
    await mailQueue.add(JOB_NAME.EMAIL.ORDER_CONFIRMATION, data, config);
  },

  sendShopApproval: async (data: ShopApproved) => {
    await mailQueue.add(JOB_NAME.EMAIL.SHOP_APPROVED, data, config);
  },
  sendBannedApproval: async (data: ShopBanned) => {
    await mailQueue.add(JOB_NAME.EMAIL.SHOP_BANNED, data, config);
  },
};
