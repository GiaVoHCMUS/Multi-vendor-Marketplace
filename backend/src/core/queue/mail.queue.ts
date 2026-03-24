import { Queue } from 'bullmq';
import { bullmqClient } from './bullmq';
import { QUEUE_NAME } from '@/shared/constants/queue.constants';

export const mailQueue = new Queue(QUEUE_NAME.EMAIL, {
  connection: bullmqClient.getQueueConnection(),
});
