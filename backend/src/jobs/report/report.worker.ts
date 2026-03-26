import { Worker } from 'bullmq';
import { bullmqClient } from '@/core/queue/bullmq';
import { QUEUE_NAME, JOB_NAME } from '@/shared/constants/queue.constants';
import { reportHandler } from './report.handler';

new Worker(
  QUEUE_NAME.REPORT,
  async (job) => {
    switch (job.name) {
      case JOB_NAME.REPORT.DAILY: {
        await reportHandler.dailyReport();
        break;
      }
      default: {
        throw new Error('Không tìm thấy tên job');
      }
    }
  },
  {
    connection: bullmqClient.getWorkerConnection(),
    concurrency: 2,
  },
);
