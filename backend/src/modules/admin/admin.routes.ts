import { protect, restrictTo } from '@/shared/middleware/auth.middleware';
import { Router } from 'express';
import { adminController } from './admin.module';
import { validate } from '@/shared/middleware/validate.middleware';
import { adminSchema } from './admin.schema';
import { catchAsync } from '@/shared/utils/catchAsync';
import { rateLimitMiddlware } from '@/shared/middleware/limiter.middlware';
import { managementLimiter } from '@/core/limiter/limiter.config';

const router = Router();

router.use(protect);
router.use(restrictTo('ADMIN'));

router.patch(
  '/shops/:id/approve',
  rateLimitMiddlware(managementLimiter),
  validate(adminSchema.approveShop),
  catchAsync(adminController.approveShop),
);

router.patch(
  '/shops/:id/ban',
  rateLimitMiddlware(managementLimiter),
  validate(adminSchema.banShop),
  catchAsync(adminController.banShop),
);

router.patch(
  '/users/:id/ban',
  rateLimitMiddlware(managementLimiter),
  validate(adminSchema.banUser),
  catchAsync(adminController.banUser),
);

router.get('/dashboard', catchAsync(adminController.getStats));

router.get(
  '/shops/pending',
  validate(adminSchema.getPendingShops),
  catchAsync(adminController.getPendingShops),
);

router.get(
  '/users',
  validate(adminSchema.getUsers),
  catchAsync(adminController.getUsers),
);

router.get(
  '/orders',
  validate(adminSchema.getOrders),
  catchAsync(adminController.getOrders),
);

export default router;
