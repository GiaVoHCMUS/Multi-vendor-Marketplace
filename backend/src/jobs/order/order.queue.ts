import { Queue } from 'bullmq';
import { bullmqClient } from '@/core/queue/bullmq';
import { QUEUE_NAME } from '@/shared/constants/queue.constants';

export const orderQueue = new Queue(QUEUE_NAME.ORDER, {
  connection: bullmqClient.getQueueConnection(),
});
