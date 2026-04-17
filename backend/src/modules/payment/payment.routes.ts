import { Router } from 'express';
import { paymentController } from './payment.controller';
import { protect } from '@/shared/middleware/auth.middleware';
import { catchAsync } from '@/shared/utils/catchAsync';

const router = Router();

router.post('/create', protect, catchAsync(paymentController.createPayment));
router.get('/vnpay-return', catchAsync(paymentController.vnpayReturn));
router.get('/vnpay-ipn', paymentController.vnpayIPN);

export default router;
