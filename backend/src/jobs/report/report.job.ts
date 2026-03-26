import { config } from '@/shared/utils/bullmqOptions';
import { reportQueue } from './report.queue';
import { JOB_ID, JOB_NAME } from '@/shared/constants/queue.constants';

export const reportJob = {
  dailyReport: async () => {
    await reportQueue.add(
      JOB_NAME.REPORT.DAILY,
      {},
      {
        jobId: JOB_ID.CRON.DAILY_REPORT,
        ...config,
        repeat: {
          pattern: '59 23 * * *', // 23:59
        },
      },
    );
  },
};
