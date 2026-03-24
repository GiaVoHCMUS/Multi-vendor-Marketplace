import { mailQueue } from '@/core/queue/mail.queue';
import { JOB_NAME } from '@/shared/constants/queue.constants';

export const mailJob = {
  sendOrderConfirmation: async (data: {
    to: string;
    customerName: string;
    orderId: string;
    totalAmount: number;
  }) => {
    await mailQueue.add(JOB_NAME.EMAIL.ORDER_CONFIRMATION, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  },
};
