import { initCronJobs } from './cron';

export const setupCron = async () => {
  await initCronJobs();
};
