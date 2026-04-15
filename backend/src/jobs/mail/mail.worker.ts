import { Worker } from 'bullmq';
import { bullmqClient } from '@/core/queue/bullmq';
import { handleSendEmail } from './mail.handler';
import { JOB_NAME, QUEUE_NAME } from '@/shared/constants/queue.constants';

const worker = new Worker(
  QUEUE_NAME.EMAIL,
  async (job) => {
    switch (job.name) {
      case JOB_NAME.EMAIL.ORDER_CONFIRMATION: {
        await handleSendEmail.confirm(job.data);
        break;
      }
      case JOB_NAME.EMAIL.SHOP_APPROVED: {
        await handleSendEmail.approveShop(job.data);
        break;
      }
      case JOB_NAME.EMAIL.SHOP_BANNED: {
        await handleSendEmail.banShop(job.data);
        break;
      }
      case JOB_NAME.EMAIL.WELCOME: {
        await handleSendEmail.welcome(job.data);
        break;
      }
      case JOB_NAME.EMAIL.FORGOT_PASSWORD: {
        await handleSendEmail.forgotPassword(job.data);
        break;
      }
      case JOB_NAME.EMAIL.DAILY_REPORT: {
        await handleSendEmail.dailyReport(job.data);
        break;
      }
      case JOB_NAME.EMAIL.ORDER_AUTO_CANCELLED: {
        await handleSendEmail.orderAutoCancelled(job.data);
        break;
      }
      case JOB_NAME.EMAIL.ORDER_CHECKOUT_SUCCESSFULLY: {
        await handleSendEmail.orderCheckoutSuccessfully(job.data);
        break;
      }
      case JOB_NAME.EMAIL.ORDER_CHECKOUT_FAILED: {
        await handleSendEmail.orderCheckoutFailed(job.data);
        break;
      }
      default: {
        throw new Error('Không tìm thấy tên job');
      }
    }
  },
  {
    connection: bullmqClient.getWorkerConnection(),
    concurrency: 10,
  },
);

// Khi job hoàn thành
worker.on('completed', (job) => {
  console.log('✅ Job completed:', {
    id: job.id,
    name: job.name,
  });
});

// Khi job fail
worker.on('failed', (job, err) => {
  console.error('❌ Job failed:', {
    id: job?.id,
    name: job?.name,
    attemptsMade: job?.attemptsMade,
    data: job?.data,
    error: err.message,
  });
});
