import { Queue } from 'bullmq';
import { bullmqClient } from '@/core/queue/bullmq';
import { QUEUE_NAME } from '@/shared/constants/queue.constants';

export const reportQueue = new Queue(QUEUE_NAME.REPORT, {
  connection: bullmqClient.getQueueConnection(),
});
