import { Worker } from 'bullmq';
import { bullmqClient } from '@/core/queue/bullmq';
import { mailService } from '@/shared/services/mail.service';
import { JOB_NAME, QUEUE_NAME } from '@/shared/constants/queue.constants';
import { EMAIL, EMAIL_TEMPLATE } from '@/shared/constants/mail.constants';
import {
  ForgotPasswordMail,
  OrderConfirmation,
  ShopApproved,
  ShopBanned,
  WelcomeMail,
} from '@/shared/types/mail.job';

const handleSendEmailConfirmation = async (data: OrderConfirmation) => {
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

const handleSendEmailApprovedShop = async (data: ShopApproved) => {
  const { to, ownerName, shopName } = data;
  await mailService.sendWithTemplate(
    to,
    EMAIL.SHOP.APPROVAL,
    EMAIL_TEMPLATE.SHOP.APPROVAL,
    {
      ownerName,
      shopName,
    },
  );
};

const handleSendEmailBannedShop = async (data: ShopBanned) => {
  const { to, ownerName, shopName, reason } = data;
  await mailService.sendWithTemplate(
    to,
    EMAIL.SHOP.BAN,
    EMAIL_TEMPLATE.SHOP.BAN,
    {
      ownerName,
      shopName,
      reason,
    },
  );
};

const handleSendEmailWelcome = async (data: WelcomeMail) => {
  const { to, fullName, token } = data;
  await mailService.sendWithTemplate(
    to,
    EMAIL.AUTH.WELCOME,
    EMAIL_TEMPLATE.AUTH.WELCOME,
    { to, fullName, token },
  );
};

const handleSendEmailForgotPassword = async (data: ForgotPasswordMail) => {
  const { to, fullName, token } = data;
  await mailService.sendWithTemplate(
    to,
    EMAIL.AUTH.FORGOT_PASSWORD,
    EMAIL_TEMPLATE.AUTH.FORTGOT_PASSWORD,
    { to, fullName, token },
  );
};

const worker = new Worker(
  QUEUE_NAME.EMAIL,
  async (job) => {
    switch (job.name) {
      case JOB_NAME.EMAIL.ORDER_CONFIRMATION: {
        await handleSendEmailConfirmation(job.data);
        break;
      }
      case JOB_NAME.EMAIL.SHOP_APPROVED: {
        await handleSendEmailApprovedShop(job.data);
        break;
      }
      case JOB_NAME.EMAIL.SHOP_BANNED: {
        await handleSendEmailBannedShop(job.data);
        break;
      }
      case JOB_NAME.EMAIL.WELCOME: {
        await handleSendEmailWelcome(job.data);
        break;
      }
      case JOB_NAME.EMAIL.FORGOT_PASSWORD: {
        await handleSendEmailForgotPassword(job.data);
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
