import { protect, restrictTo } from '@/shared/middleware/auth.middleware';
import { Router } from 'express';
import { adminController } from './admin.controller';
import { validate } from '@/shared/middleware/validate.middleware';
import { adminSchema } from './admin.schema';
import { catchAsync } from '@/shared/utils/catchAsync';

const router = Router();

router.use(protect);
router.use(restrictTo('ADMIN'));
router.patch(
  '/shops/:id/approve',
  validate(adminSchema.approveShop),
  catchAsync(adminController.approveShop),
);

router.patch(
  '/shops/:id/ban',
  validate(adminSchema.banShop),
  catchAsync(adminController.banShop),
);

router.patch(
  '/users/:id/ban',
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
