import { Router } from 'express';
import { paymentController } from './payment.controller';
import { protect } from '@/shared/middleware/auth.middleware';

const router = Router();

router.post('/create', protect, paymentController.createPayment);
router.get('/vnpay-return', paymentController.vnpayReturn);
router.get('/vnpay-ipn', paymentController.vnpayIPN);

export default router;
