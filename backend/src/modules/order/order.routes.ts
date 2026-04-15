import { Router } from 'express';
import { orderController } from './order.controller';
import { protect, restrictTo } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { orderSchema } from './order.schema';
import { transactionLimiter } from '@/core/limiter/limiter.config';
import { rateLimitMiddlware } from '@/shared/middleware/limiter.middlware';

const router = Router();

router.use(protect);
router.get('/', validate(orderSchema.getMyOrder), orderController.getMyOrders);
router.post(
  '/',
  rateLimitMiddlware(transactionLimiter),
  validate(orderSchema.checkout),
  orderController.checkout,
);
router.get(
  '/:id',
  validate(orderSchema.getOrderDetail),
  orderController.getOrderDetail,
);

router.use(restrictTo('SELLER'));
router.patch(
  '/:id',
  validate(orderSchema.updateStatus),
  orderController.updateOrderStatus,
);

export default router;
