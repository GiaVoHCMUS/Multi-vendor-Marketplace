import { Worker } from 'bullmq';
import { bullmqClient } from '@/core/queue/bullmq';
import { mailService } from '@/shared/services/mail.service';
import { JOB_NAME, QUEUE_NAME } from '@/shared/constants/queue.constants';
import { EMAIL, EMAIL_TEMPLATE } from '@/shared/constants/mail.constants';

const handleSendEmailConfirmation = async (data: {
  to: string;
  customerName: string;
  orderId: string;
  totalAmount: number;
}) => {
  const { to, customerName, orderId, totalAmount } = data;
  await mailService.sendWithTemplate(
    to,
    EMAIL.ORDER.CONFIRMATION,
    EMAIL_TEMPLATE.ORDER.CONFIRMATION,
    {
      customerName,
      orderId,
      totalAmount,
    },
  );
};

new Worker(
  QUEUE_NAME.EMAIL,
  async (job) => {
    switch (job.name) {
      case JOB_NAME.EMAIL.ORDER_CONFIRMATION: {
        await handleSendEmailConfirmation(job.data);
        break;
      }
      default: {
        throw new Error('Không tìm thấy tên job');
      }
    }
  },
  {
    connection: bullmqClient.getWorkerConnection(),
  },
);

// // Khi job hoàn thành
// worker.on('completed', (job) => {
//   console.log('✅ Job completed:', {
//     id: job.id,
//     name: job.name,
//   });
// });

// // Khi job fail
// worker.on('failed', (job, err) => {
//   console.error('❌ Job failed:', {
//     id: job?.id,
//     name: job?.name,
//     attemptsMade: job?.attemptsMade,
//     data: job?.data,
//     error: err.message,
//   });
// });
