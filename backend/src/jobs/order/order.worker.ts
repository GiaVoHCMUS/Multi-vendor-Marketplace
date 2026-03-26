import { JOB_NAME, QUEUE_NAME } from '@/shared/constants/queue.constants';
import { orderHandler } from './order.handler';
import { bullmqClient } from '@/core/queue/bullmq';
import { Worker } from 'bullmq';

new Worker(
  QUEUE_NAME.ORDER,
  async (job) => {
    switch (job.name) {
      case JOB_NAME.ORDER.AUTO_CANCEL: {
        await orderHandler.autoCancel();
        break;
      }
      default: {
        throw new Error('Không tìm thấy tên job');
      }
    }
  },
  {
    connection: bullmqClient.getWorkerConnection(),
    concurrency: 5,
  },
);
