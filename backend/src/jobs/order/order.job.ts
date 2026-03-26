import { JOB_ID, JOB_NAME } from '@/shared/constants/queue.constants';
import { orderQueue } from './order.queue';
import { config } from '@/shared/utils/bullmqOptions';

export const orderJob = {
  autoCancelOrder: async () => {
    await orderQueue.add(
      JOB_NAME.ORDER.AUTO_CANCEL,
      {},
      {
        jobId: JOB_ID.CRON.ORDER_CLEANUP_EVERY_5M,
        ...config,
        repeat: {
          pattern: '*/2 * * * *', // mỗi 10 phút
        },
      },
    );
  },
};
