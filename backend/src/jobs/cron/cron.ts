import { orderJob } from '../order/order.job';

export const initCronJobs = async () => {
  console.log('Initializing cron jobs...');

  await Promise.all([orderJob.autoCancelOrder()]);

  console.log('Cron jobs initialized');
};
