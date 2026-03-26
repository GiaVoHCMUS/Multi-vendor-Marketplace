import { orderJob } from '../order/order.job';
import { reportJob } from '../report/report.job';

export const initCronJobs = async () => {
  console.log('Initializing cron jobs...');

  await Promise.all([orderJob.autoCancelOrder(), reportJob.dailyReport()]);

  console.log('Cron jobs initialized');
};
